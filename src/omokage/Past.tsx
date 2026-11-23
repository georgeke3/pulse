import { Drg } from './Sym';
import { useEffect, useMemo, useState } from 'react';
import { Fly, Pencil } from './Art';
import { useItems } from './items';
import { useNavState } from './nav';
import { ALLQ, THEMES, TOPICS, qid, randomQ, useAnchorStatus, useAnswers, useTonight, type Answer, type Q } from './qa';
import { TIER_LABEL, useRhythm, type Status } from './rhythm';
import { findQuestions, pickWithGemini } from './qfind';
import { useCurated } from './curated';
import { useApp } from '../store';
import type { Tier } from './anchors';
import { INK, INK2, SEPIA, ago, fromDstr, todayStr } from './skins';
import { Typing } from './Typing';
import icEase from './assets/ic-ease.png';
import icBrush from './assets/ic-creative-flow.png';
import icFeather from './assets/ic-loss.png';

const Decor = () => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 393 740" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <Pencil d="M-30 590 C 90 540, 170 600, 270 530 S 400 420, 440 400" />
    <Fly x={350} y={64} s={.55} c={SEPIA} o={.5} st="outline" d={1} /><Fly x={372} y={30} s={.4} c={SEPIA} o={.4} st="outline" d={2} />
  </svg>
);
/** The mark that leads a row: a painted icon centred in its own round badge, full strength (filled gold once answered). */
const Mark = ({ s = 34, on, src = icEase }: { s?: number; on?: boolean; src?: string }) => (
  <span style={{ width: s, height: s, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: on ? 'rgba(200,161,90,.28)' : 'rgba(255,255,255,.8)', boxShadow: `inset 0 0 0 1.2px ${on ? 'rgba(200,161,90,.7)' : 'rgba(43,50,71,.2)'}` }}>
    <img src={src} alt="" draggable={false} style={{ width: s * .78, height: s * .78, objectFit: 'contain', display: 'block', pointerEvents: 'none' }} />
  </span>
);
const clip = (n: number): React.CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden' });
const dayLabel = (d: string) => (d === todayStr() ? 'tonight' : fromDstr(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }));

const shortDay = (d: string) => fromDstr(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: d.slice(0, 4) === todayStr().slice(0, 4) ? undefined : 'numeric' });
/** "twice a year · next Jan 12" / "· due" : the schedule of an anchor question, in words */
const cadence = (s: Status) => `${TIER_LABEL[s.tier]} · ${s.phase === 'later' ? `next ${shortDay(s.due)}` : s.phase === 'late' ? 'overdue' : 'due'}`;
const TIERS: [Tier, string][] = [['Q', '3 months'], ['H', '6 months'], ['Y', 'Yearly']];
const CadencePick = ({ s, onPick }: { s: Status; onPick: (t: Tier) => void }) => (
  <div style={{ display: 'flex', gap: 6, padding: '2px 0 8px 42px' }}>
    {TIERS.map(([t, l]) => <button key={t} className={`chip ${s.tier === t ? 'on' : ''}`} style={{ height: 30, fontSize: 12.5 }} onClick={() => onPick(t)}>{l}</button>)}
  </div>
);

/** What you're writing: a question, and (when editing) the answer that already exists for it. */
interface Writing { q: string; existing?: Answer }

/** Every question in the bank, by theme. Today's answers are marked; tap one to answer it (or edit what you wrote). */
const Questions = ({ answeredToday, seen, onPick }: { answeredToday: Set<string>; seen: Set<string>; onPick: (q: Q) => void }) => {
  const [theme, setTheme] = useNavState<string>('past.theme', 'All', 'replace');
  const { all: anchors, due, byId } = useAnchorStatus(), rh = useRhythm();
  const [editing, setEditing] = useState<string | null>(null);
  const { state } = useApp();
  const [qr, setQr] = useState('');
  const [gem, setGem] = useState<{ for: string; list: Q[] } | null>(null);
  const [busy, setBusy] = useState(false), [gerr, setGerr] = useState('');
  const asQ = (s: Status): Q => ({ id: s.a.id, theme: s.a.theme, text: s.a.text });
  const themes = ['All', ...(due.length ? ['Due'] : []), 'Anchors', ...THEMES];
  const found = qr.trim() ? findQuestions(qr).slice(0, 15) : null;
  const ask = async () => { const f = qr.trim(); if (!f || busy) return; setBusy(true); setGerr(''); try { setGem({ for: f, list: await pickWithGemini(f, state.geminiKey) }); } catch (e) { setGerr(e instanceof Error ? e.message : 'Could not reach Gemini.'); } finally { setBusy(false); } };
  const list = found ?? (theme === 'All' ? ALLQ : theme === 'Due' ? due.map(asQ) : theme === 'Anchors' ? [...anchors].sort((a, b) => a.due.localeCompare(b.due)).map(asQ) : ALLQ.filter(q => q.theme === theme));
  const row = (q: Q) => {
    const st = byId.get(q.id);
    return (
      <div key={q.id}>
        <button className="irow press" onClick={() => onPick(q)}>
          <Mark s={30} on={answeredToday.has(q.id)} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="it" style={{ display: 'block', fontSize: 16, lineHeight: 1.35 }}>{q.text}</span>
            {st && <span role="button" tabIndex={0} className="caps" style={{ fontSize: 8.5, display: 'inline-block', marginTop: 3, textDecoration: 'underline', textUnderlineOffset: 2, color: st.phase === 'later' ? INK2 : INK }}
              onClick={e => { e.stopPropagation(); setEditing(editing === q.id ? null : q.id); }}>{cadence(st)}{st.last ? ` · answered ${shortDay(st.last)}` : ''}</span>}
          </span>
          {answeredToday.has(q.id) && <span className="caps" style={{ fontSize: 8.5 }}>edit</span>}
        </button>
        {st && editing === q.id && <CadencePick s={st} onPick={t => { rh.setTier(q.id, t); setEditing(null); }} />}
      </div>
    );
  };
  const dice = () => { const q = randomQ(list.filter(x => !answeredToday.has(x.id)), seen); if (q) onPick(q); };
  return (
    <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
      <Decor />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8 }}>
        <span className="it" style={{ fontSize: 20 }}>More questions</span>
        <span className="caps">{list.length}</span>
      </div>
      <button className="chip on press" onClick={dice} style={{ position: 'relative', flex: 'none', height: 46, margin: '2px 0 10px', fontSize: 15 }}>Pick a random question</button>
      <input className="cm-input" value={qr} onChange={e => { setQr(e.target.value); setGerr(''); }} placeholder="Search, or how you feel (numb, off, wired…)" aria-label="Search questions" autoCapitalize="none" autoCorrect="off" style={{ position: 'relative', flex: 'none', margin: '0 0 10px' }} />
      {!found && <div className="scroll" style={{ position: 'relative', display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -24px', padding: '2px 24px 10px', flex: 'none' }}>
        {themes.map(t => <button key={t} className={`chip ${theme === t ? 'on' : ''}`} style={{ flex: 'none' }} onClick={() => setTheme(t)}>{t}</button>)}
      </div>}
      <div className="scroll grow" style={{ position: 'relative', margin: '0 -24px', padding: '0 24px 12px' }}>
        {found && (
          <div style={{ padding: '2px 0 8px' }}>
            <button className="chip press" onClick={ask} disabled={busy} style={{ height: 34, fontSize: 13 }}>{busy ? 'Asking Gemini…' : gem && gem.for === qr.trim() ? 'Ask Gemini again' : 'Not quite? Ask Gemini to find ones that fit'}</button>
            {gerr && <p className="cm-err" style={{ marginTop: 6 }}>{gerr}</p>}
            {!list.length && !gem && <p className="cm-note">Nothing matches yet. Try a feeling word, or ask Gemini.</p>}
          </div>
        )}
        {found && gem && gem.for === qr.trim() && gem.list.length > 0 && (
          <div style={{ paddingBottom: 6 }}>
            <div className="caps" style={{ padding: '4px 0' }}>picked for “{gem.for}”</div>
            {gem.list.map(row)}
          </div>
        )}
        {list.map(row)}
      </div>
    </div>
  );
};

/** Everything you've answered, newest first, filtered by question (and topic). */
const History = ({ answers, onOpen }: { answers: Answer[]; onOpen: (a: Answer) => void }) => {
  const [q, setQ] = useNavState<string | null>('past.q', null, 'replace');
  const [topic, setTopic] = useNavState<string | null>('past.topic', null, 'replace');
  const [picking, setPicking] = useState(false);
  const byQ = useMemo(() => {
    const m = new Map<string, { text: string; n: number }>();
    for (const a of answers) { const e = m.get(a.qid); if (e) e.n++; else m.set(a.qid, { text: a.question || 'Free writing', n: 1 }); }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [answers]);
  const usedTopics = useMemo(() => Array.from(new Set(answers.flatMap(a => a.tags))), [answers]);
  const list = answers.filter(a => (!q || a.qid === q) && (!topic || a.tags.includes(topic)));
  return (
    <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
      <Decor />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8 }}>
        <span className="it" style={{ fontSize: 20 }}>Past answers</span>
        <span className="caps">{list.length} of {answers.length}</span>
      </div>
      <button className="press" onClick={() => setPicking(v => !v)} style={{ position: 'relative', flex: 'none', display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 14, background: '#FFFDF8', boxShadow: 'inset 0 0 0 1px rgba(43,50,71,.14)' }}>
        <span className="caps" style={{ flex: 'none' }}>question</span>
        <span className="it" style={{ flex: 1, fontSize: 14.5, ...clip(1) }}>{q ? byQ.find(([k]) => k === q)?.[1].text : 'Any question'}</span>
        <span style={{ color: INK2 }}>{picking ? '▴' : '▾'}</span>
      </button>
      {picking && (
        <div className="scroll" style={{ position: 'relative', flex: 'none', maxHeight: 260, overflowY: 'auto', marginTop: 6, padding: '4px 14px', borderRadius: 14, background: '#FFFDF8', boxShadow: '0 10px 24px rgba(43,50,71,.12)' }}>
          {[['', { text: 'Any question', n: answers.length }] as const, ...byQ].map(([k, v]) => (
            <button key={k || 'any'} className="irow press" onClick={() => { setQ(k || null); setPicking(false); }}>
              <Mark s={26} on={(q ?? '') === k} />
              <span className="it" style={{ flex: 1, fontSize: 14.5, lineHeight: 1.3 }}>{v.text}</span>
              <span className="caps" style={{ fontSize: 9 }}>{v.n}</span>
            </button>
          ))}
        </div>
      )}
      {usedTopics.length > 0 && (
        <div className="scroll" style={{ position: 'relative', display: 'flex', gap: 6, overflowX: 'auto', margin: '8px -24px 0', padding: '2px 24px 4px', flex: 'none' }}>
          {usedTopics.map(t => <button key={t} className={`chip ${topic === t ? 'on' : ''}`} style={{ flex: 'none', height: 30 }} onClick={() => setTopic(topic === t ? null : t)}>{t}</button>)}
        </div>
      )}
      <div className="scroll grow" style={{ position: 'relative', margin: '8px -24px 0', padding: '10px 24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {list.length === 0 && <div style={{ textAlign: 'center', marginTop: 50 }}><Drg n="swirl" w={60} o={.6} style={{ margin: '0 auto 12px' }} /><span className="it mute" style={{ fontSize: 15 }}>Nothing here yet.</span></div>}
        {list.map((a, i) => (
          <button key={a.id} className="torn press" onClick={() => onOpen(a)} style={{ flex: 'none', textAlign: 'left', transform: `rotate(${(i % 3 - 1) * .5}deg)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span className="it" style={{ fontSize: 12.5, color: INK2 }}>{fromDstr(a.day).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short', year: a.day.slice(0, 4) === todayStr().slice(0, 4) ? undefined : 'numeric' })}</span>
              <span style={{ display: 'flex', gap: 6 }}>{a.tags.slice(0, 3).map(t => <span key={t} className="caps" style={{ fontSize: 8.5 }}>{t}</span>)}</span>
            </div>
            {!q && a.question && <div className="it" style={{ fontSize: 13.5, color: SEPIA, marginTop: 6, ...clip(2) }}>{a.question}</div>}
            <p className="serif" style={{ fontSize: 15, lineHeight: 1.55, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#3A4156' }}>{a.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export const Past = () => {
  const { add, update, remove } = useItems();
  const answers = useAnswers();
  const today = todayStr();
  const todays = answers.filter(a => a.day === today);
  const answeredToday = new Set<string>(todays.map(a => a.qid));
  const seen = new Set<string>(answers.map(a => a.qid));
  const { q: bankTonight, skip } = useTonight(today, seen);
  // tonight's anchor: the most overdue anchor question, fixed for the day once chosen (so answering it doesn't swap in the next)
  const { due, byId } = useAnchorStatus(), rh = useRhythm();
  const AK = `omk_anchor_${today}`;
  const anchorId = useMemo(() => {
    let st: string | null = null; try { st = localStorage.getItem(AK); } catch { /* private mode */ }
    const s = st ? byId.get(st) : undefined;
    if (s && (s.phase !== 'later' || s.last === today)) return s.a.id;
    return due[0]?.a.id ?? null;
  }, [AK, byId, due, today]);
  useEffect(() => { try { if (anchorId) localStorage.setItem(AK, anchorId); else localStorage.removeItem(AK); } catch { /* private mode */ } }, [AK, anchorId]);
  const anchorSt = anchorId ? byId.get(anchorId) : undefined;
  const tonight: Q = (anchorSt && ALLQ.find(x => x.id === anchorSt.a.id)) || bankTonight;
  const cur = useCurated(today, [tonight.text, ...answers.slice(0, 30).map(a => a.question).filter(Boolean)]);
  const [offer, setOffer] = useState<{ id: string; text: string } | null>(null);
  const [cad, setCad] = useState(false);
  const mainAns = todays.find(a => a.qid === tonight.id);
  const others = todays.filter(a => a.qid !== tonight.id);
  const [w, setW] = useNavState<Writing | null>('past.w', null);
  const [screen, setScreen] = useNavState<'main' | 'questions' | 'history'>('past.screen', 'main');
  const recent = answers.find(a => a.day < today);

  const write = (q: string, existing?: Answer) => setW({ q, existing });
  const writeQ = (q: Q) => write(q.text, todays.find(a => a.qid === q.id));
  const close = () => setW(null);
  const sheet = w && (
    <Typing mode="past" label={w.existing ? `past · ${dayLabel(w.existing.day)}` : 'past · writing'} prompt={w.q} topics={TOPICS}
      initialText={w.existing?.body} initialTags={w.existing?.tags} placeholder="Whatever comes…"
      onDelete={w.existing ? () => { remove(w.existing!.id); close(); } : undefined}
      onCancel={close}
      onSave={(t, tg) => {
        if (w.existing) update(w.existing.id, { body: t, meta: { tags: tg, question: w.q, qid: w.existing.qid } });
        else add({ kind: 'past', body: t, board: null, meta: { tags: tg, question: w.q, qid: qid(w.q) } });
        close();
      }} />
  );

  if (screen === 'questions') return <><Questions answeredToday={answeredToday} seen={seen} onPick={q => writeQ(q)} />{sheet}</>;
  if (screen === 'history') return <><History answers={answers} onOpen={a => write(a.question || 'Free writing', a)} />{sheet}</>;

  return (
    <div className="screen">
      <Decor />
      <div style={{ position: 'relative', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="caps">tonight’s question</span>
          <span className="caps" style={{ marginLeft: 'auto', opacity: .7 }}>{tonight.theme}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 10 }}>
          <div className="it" style={{ flex: 1, fontSize: tonight.text.length > 85 ? 21 : tonight.text.length > 55 ? 24 : 27, lineHeight: 1.28 }}>{tonight.text}</div>
          <Drg n="swirl" w={62} style={{ marginTop: -4 }} />
        </div>
        {mainAns ? (
          <button className="slip press" onClick={() => writeQ(tonight)} style={{ display: 'block', width: '100%', textAlign: 'left', marginTop: 16, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="caps">your answer</span><span className="caps" style={{ color: INK }}>edit ›</span>
            </div>
            <div className="serif" style={{ fontSize: 15, lineHeight: 1.5, marginTop: 6, whiteSpace: 'pre-wrap', color: '#3A4156', ...clip(5) }}>{mainAns.body}</div>
            {mainAns.tags.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>{mainAns.tags.map(t => <span key={t} className="caps" style={{ fontSize: 8.5 }}>{t}</span>)}</div>}
          </button>
        ) : (
          <button className="press" onClick={() => writeQ(tonight)} style={{ width: '100%', marginTop: 16, height: 52, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1.2px dashed rgba(43,50,71,.3)', textAlign: 'left' }}>
            <Mark s={34} src={icBrush} />
            <span className="it" style={{ fontSize: 16, color: INK2, flex: 1 }}>Write a few lines…</span>
          </button>
        )}
        {anchorSt && (
          <div style={{ marginTop: 10 }}>
            <button className="caps press" onClick={() => setCad(v => !v)} style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{cadence(anchorSt)}{anchorSt.last ? ` · last ${ago(anchorSt.last)}` : ' · first time'}</button>
            {cad && <div style={{ marginTop: 8 }}><CadencePick s={anchorSt} onPick={t => { rh.setTier(anchorSt.a.id, t); setCad(false); }} /></div>}
          </div>
        )}
        {!mainAns && !anchorSt && <button className="press" onClick={skip} style={{ display: 'block', marginLeft: 'auto', marginTop: 8, padding: '6px 2px', fontSize: 13, color: INK2 }}>Not applicable · another question ↻</button>}
        {!mainAns && anchorSt && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 8 }}>
            <button className="press" style={{ padding: '6px 2px', fontSize: 13, color: INK2 }} onClick={() => { const a = anchorSt; rh.tooSoon(a.a.id); if (a.soon >= 1 && a.tier !== 'Y') setOffer({ id: a.a.id, text: a.a.text }); }}>Too soon</button>
            <button className="press" style={{ padding: '6px 2px', fontSize: 13, color: INK2 }} onClick={() => rh.notRelevant(anchorSt.a.id)}>Not relevant</button>
          </div>
        )}
        {offer && (
          <div className="slip" style={{ marginTop: 14, padding: '12px 14px' }}>
            <div className="it" style={{ fontSize: 14.5, lineHeight: 1.4 }}>That’s “too soon” twice for “{offer.text}”. Ask it less often?</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="chip on press" style={{ height: 32 }} onClick={() => { rh.lessOften(offer.id); setOffer(null); }}>Yes, less often</button>
              <button className="chip press" style={{ height: 32 }} onClick={() => setOffer(null)}>Keep it</button>
            </div>
          </div>
        )}
      </div>

      {(cur.busy && !cur.text || cur.err) && (
        <div className="caps" style={{ position: 'relative', marginTop: 20, opacity: .7 }}>
          {cur.busy ? 'writing a question from your week…' : <>{cur.err} <button className="caps" style={{ textDecoration: 'underline' }} onClick={cur.retry}>try again</button></>}
        </div>
      )}
      {cur.text && !answeredToday.has(qid(cur.text)) && (
        <div style={{ position: 'relative', marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="caps">for tonight · from your week</span>
            <button className="press" aria-label="A different one" onClick={cur.retry} disabled={cur.busy} style={{ fontSize: 15, color: INK2, padding: '0 2px', opacity: cur.busy ? .4 : 1 }}>↻</button>
          </div>
          <button className="irow press" onClick={() => write(cur.text!)}>
            <Mark s={32} src={icFeather} />
            <span className="it" style={{ flex: 1, fontSize: 16, lineHeight: 1.35 }}>{cur.text}</span>
            <span style={{ color: INK2 }}>›</span>
          </button>
        </div>
      )}

      {others.length > 0 && (
        <div style={{ position: 'relative', marginTop: 20 }}>
          <div className="caps">also answered tonight</div>
          {others.map(a => (
            <button key={a.id} className="irow press" onClick={() => write(a.question, a)}>
              <Mark s={32} on />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="it" style={{ display: 'block', fontSize: 14.5, ...clip(1) }}>{a.question}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: INK2, ...clip(1) }}>{a.body}</span>
              </span>
              <span style={{ color: INK2 }}>›</span>
            </button>
          ))}
        </div>
      )}

      <div className="grow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 20 }}>
        {!others.length && recent && (
          <button className="press" onClick={() => write(recent.question || 'Free writing', recent)} style={{ textAlign: 'left', width: '100%', opacity: .9 }}>
            <div className="caps">last time · {ago(recent.day)}</div>
            <div className="it" style={{ fontSize: 13.5, color: SEPIA, marginTop: 6, ...clip(1) }}>{recent.question}</div>
            <div className="serif" style={{ fontSize: 14.5, lineHeight: 1.5, marginTop: 4, color: '#3A4156', ...clip(2) }}>{recent.body}</div>
          </button>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="chip press" onClick={() => setScreen('questions')} style={{ height: 52, gap: 10, background: '#fff', justifyContent: 'flex-start', padding: '0 16px', boxShadow: '0 0 0 1px rgba(43,50,71,.12),0 6px 16px rgba(43,50,71,.06)' }}>
          <Mark />
          <span className="it" style={{ fontSize: 16, flex: 1, textAlign: 'left' }}>Answer another question</span>
          <span style={{ color: INK2 }}>›</span>
        </button>
        <button className="chip press" onClick={() => setScreen('history')} style={{ height: 52, gap: 10, background: '#fff', justifyContent: 'flex-start', padding: '0 16px', boxShadow: '0 0 0 1px rgba(43,50,71,.12),0 6px 16px rgba(43,50,71,.06)' }}>
          <Mark src={icFeather} />
          <span className="it" style={{ fontSize: 16, flex: 1, textAlign: 'left' }}>Past answers</span>
          <span className="caps">{answers.length}</span>
        </button>
      </div>
      {sheet}
    </div>
  );
};
