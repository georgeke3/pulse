import { Drg } from './Sym';
import { useMemo, useState } from 'react';
import { Fly, Pencil } from './Art';
import { useItems } from './items';
import { ActionBar } from './Actions';
import { BANK, THEMES, TOPICS, questionFor, qid, useAnswers, type Answer, type Q } from './qa';
import { INK, INK2, SEPIA, ago, fromDstr, todayStr } from './skins';
import { Typing } from './Typing';

const Decor = () => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 393 740" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <Pencil d="M-30 590 C 90 540, 170 600, 270 530 S 400 420, 440 400" />
    <Fly x={350} y={64} s={.55} c={SEPIA} o={.5} st="outline" d={1} /><Fly x={372} y={30} s={.4} c={SEPIA} o={.4} st="outline" d={2} />
  </svg>
);
const clip = (n: number): React.CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden' });
const dayLabel = (d: string) => (d === todayStr() ? 'tonight' : fromDstr(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }));

/** What you're writing: a question, and (when editing) the answer that already exists for it. */
interface Writing { q: string; existing?: Answer }

/** Every question in the bank, by theme. Today's answers are marked; tap one to answer it (or edit what you wrote). */
const Questions = ({ answeredToday, onPick, onClose }: { answeredToday: Set<string>; onPick: (q: Q) => void; onClose: () => void }) => {
  const [theme, setTheme] = useState<string>('All');
  const list = theme === 'All' ? BANK : BANK.filter(q => q.theme === theme);
  return (
    <div className="screen" style={{ paddingBottom: 12 }}>
      <Decor />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
        <Drg n="swirl" w={30} />
        <span className="it" style={{ fontSize: 21 }}>More questions</span>
        <span className="caps" style={{ marginLeft: 'auto' }}>{BANK.length}</span>
      </div>
      <div className="scroll" style={{ position: 'relative', display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -24px', padding: '2px 24px 10px', flex: 'none' }}>
        {['All', ...THEMES].map(t => <button key={t} className={`chip ${theme === t ? 'on' : ''}`} style={{ flex: 'none' }} onClick={() => setTheme(t)}>{t}</button>)}
      </div>
      <div className="scroll grow" style={{ position: 'relative', margin: '0 -24px', padding: '0 24px 12px' }}>
        {list.map(q => (
          <button key={q.id} className="irow press" onClick={() => onPick(q)}>
            <Drg n="swirl" w={18} o={answeredToday.has(q.id) ? 1 : .35} />
            <span className="it" style={{ flex: 1, fontSize: 16, lineHeight: 1.35 }}>{q.text}</span>
            {answeredToday.has(q.id) && <span className="caps" style={{ fontSize: 8.5 }}>edit</span>}
          </button>
        ))}
      </div>
      <ActionBar cancel="Close" h={48} onCancel={onClose} />
    </div>
  );
};

/** Everything you've answered, newest first, filtered by question (and topic). */
const History = ({ answers, onOpen, onClose }: { answers: Answer[]; onOpen: (a: Answer) => void; onClose: () => void }) => {
  const [q, setQ] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const byQ = useMemo(() => {
    const m = new Map<string, { text: string; n: number }>();
    for (const a of answers) { const e = m.get(a.qid); if (e) e.n++; else m.set(a.qid, { text: a.question || 'Free writing', n: 1 }); }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [answers]);
  const usedTopics = useMemo(() => Array.from(new Set(answers.flatMap(a => a.tags))), [answers]);
  const list = answers.filter(a => (!q || a.qid === q) && (!topic || a.tags.includes(topic)));
  return (
    <div className="screen" style={{ paddingBottom: 12 }}>
      <Decor />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 8 }}>
        <Drg n="swirl" w={30} />
        <span className="it" style={{ fontSize: 21 }}>Past answers</span>
        <span className="caps" style={{ marginLeft: 'auto' }}>{list.length} of {answers.length}</span>
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
              <Drg n="swirl" w={16} o={(q ?? '') === k ? 1 : .3} />
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
      <ActionBar cancel="Close" h={48} onCancel={onClose} />
    </div>
  );
};

export const Past = ({ typing, setTyping }: { typing: boolean; setTyping: (b: boolean) => void }) => {
  const { add, update, remove } = useItems();
  const answers = useAnswers();
  const today = todayStr();
  const tonight = questionFor(today);
  const todays = answers.filter(a => a.day === today);
  const answeredToday = new Set<string>(todays.map(a => a.qid));
  const mainAns = todays.find(a => a.qid === tonight.id);
  const others = todays.filter(a => a.qid !== tonight.id);
  const [w, setW] = useState<Writing | null>(null);
  const [screen, setScreen] = useState<'main' | 'questions' | 'history'>('main');
  const recent = answers.find(a => a.day < today);

  const write = (q: string, existing?: Answer) => { setW({ q, existing }); setTyping(true); };
  const writeQ = (q: Q) => write(q.text, todays.find(a => a.qid === q.id));
  const close = () => { setW(null); setTyping(false); };
  const sheet = typing && w && (
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

  if (screen === 'questions') return <><Questions answeredToday={answeredToday} onClose={() => setScreen('main')} onPick={q => { setScreen('main'); writeQ(q); }} />{sheet}</>;
  if (screen === 'history') return <><History answers={answers} onClose={() => setScreen('main')} onOpen={a => write(a.question || 'Free writing', a)} />{sheet}</>;

  return (
    <div className="screen">
      <Decor />
      <div style={{ position: 'relative', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="caps">tonight’s question</span>
          <span className="caps" style={{ marginLeft: 'auto', opacity: .7 }}>{tonight.theme}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 10 }}>
          <div className="it" style={{ flex: 1, fontSize: 27, lineHeight: 1.28 }}>{tonight.text}</div>
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
            <Drg n="swirl" w={22} o={.55} />
            <span className="it" style={{ fontSize: 16, color: INK2, flex: 1 }}>Write a few lines…</span>
          </button>
        )}
      </div>

      {others.length > 0 && (
        <div style={{ position: 'relative', marginTop: 20 }}>
          <div className="caps">also answered tonight</div>
          {others.map(a => (
            <button key={a.id} className="irow press" onClick={() => write(a.question, a)}>
              <Drg n="swirl" w={18} />
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
          <Drg n="swirl" w={24} />
          <span className="it" style={{ fontSize: 16, flex: 1, textAlign: 'left' }}>Answer another question</span>
          <span style={{ color: INK2 }}>›</span>
        </button>
        <button className="chip press" onClick={() => setScreen('history')} style={{ height: 52, gap: 10, background: '#fff', justifyContent: 'flex-start', padding: '0 16px', boxShadow: '0 0 0 1px rgba(43,50,71,.12),0 6px 16px rgba(43,50,71,.06)' }}>
          <Drg n="swirl" w={24} o={.6} />
          <span className="it" style={{ fontSize: 16, flex: 1, textAlign: 'left' }}>Past answers</span>
          <span className="caps">{answers.length}</span>
        </button>
      </div>
      {sheet}
    </div>
  );
};
