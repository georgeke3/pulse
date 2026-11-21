// Omokage capture endpoint for the iOS Share Sheet Shortcut: saves text / links / photos straight into the Future tab.
// Auth: a personal capture token (sent as the `token` form field or `x-capture-token` header); only its SHA-256 hash is stored.
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const BUCKET = "omokage-images";
// Plain-text replies so the Shortcut's "Show Notification" reads nicely ("Saved to Inbox"), errors included.
const json = (o: { ok?: boolean; message?: string; error?: string }, status = 200) =>
  new Response(o.ok ? o.message : `Couldn't save: ${o.error}`, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Type + pixel size (EXIF rotation applied) of a JPEG / PNG / GIF, or null for anything else. */
function sniff(b: Uint8Array): { type: string; w: number; h: number } | null {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (b[0] === 0x89 && b[1] === 0x50) return { type: "image/png", w: dv.getUint32(16), h: dv.getUint32(20) };
    if (b[0] === 0x47 && b[1] === 0x49) return { type: "image/gif", w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2, orient = 1, w = 0, h = 0;
      while (i + 4 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
        const len = dv.getUint16(i + 2);
        if (m === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78) {
          const t = i + 10, le = b[t] === 0x49;
          const g16 = (o: number) => dv.getUint16(t + o, le), g32 = (o: number) => dv.getUint32(t + o, le);
          const ifd = g32(4), n = g16(ifd);
          for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (g16(e) === 0x0112) { orient = g16(e + 8); break; } }
        }
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { h = dv.getUint16(i + 5); w = dv.getUint16(i + 7); break; }
        i += 2 + len;
      }
      if (!w || !h) return null;
      if (orient >= 5 && orient <= 8) [w, h] = [h, w];
      return { type: "image/jpeg", w, h };
    }
  } catch { /* fall through */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  let token = req.headers.get("x-capture-token") ?? "", text = "", board = "", files: File[] = [];
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = await req.json(); token ||= String(j.token ?? ""); text = String(j.text ?? ""); board = String(j.board ?? "");
    } else {
      const f = await req.formData(); token ||= String(f.get("token") ?? ""); text = String(f.get("text") ?? ""); board = String(f.get("board") ?? "");
      files = [...f.getAll("image"), ...f.getAll("images"), ...f.getAll("file")].filter((x): x is File => typeof x !== "string");
    }
  } catch { return json({ error: "couldn't read the request" }, 400); }

  if (!token) return json({ error: "missing token" }, 401);
  const { data: tk } = await sb.from("omokage_capture_tokens").select("user_id").eq("token_hash", await sha256(token.trim())).maybeSingle();
  if (!tk) return json({ error: "bad token" }, 401);
  const uid = tk.user_id as string;

  text = text.trim(); board = board.trim() || "Inbox";
  if (!text && !files.length) return json({ error: "nothing to save" }, 400);

  const images: { id: string; w: number; h: number }[] = [];
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const info = sniff(bytes);
    // Shortcuts also attaches web pages / empty files when sharing a link: those are skipped, the link text still saves
    if (!info) { if (bytes.length && !text && files.length === 1) return json({ error: "photos must be JPEG, PNG or GIF - add 'Convert Image to JPEG' before this step" }, 415); continue; }
    const id = crypto.randomUUID();
    const up = await sb.storage.from(BUCKET).upload(`${uid}/${id}.jpg`, bytes, { contentType: info.type, upsert: true });
    if (up.error) return json({ error: "upload failed: " + up.error.message }, 500);
    images.push({ id, w: info.w, h: info.h });
  }

  if (!text && !images.length) return json({ error: "nothing to save" }, 400);
  const id = crypto.randomUUID();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
  const { error } = await sb.from("omokage_items").insert({ user_id: uid, id, kind: "future", day, at: new Date().toISOString(), board, body: text, meta: images.length ? { images } : {} });
  if (error) return json({ error: error.message }, 500);
  const what = images.length ? (images.length === 1 ? "Photo" : `${images.length} photos`) : /^https?:\/\/\S+$/.test(text) ? "Link" : "Note";
  return json({ ok: true, message: `✓ ${what} saved to ${board}` });
});
