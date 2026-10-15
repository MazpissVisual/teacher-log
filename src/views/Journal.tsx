import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openJournal } from '../forms';
import { Empty } from '../ui';
import { moodIcon, moodLabel } from '../util';
import { JournalCard, PageHead } from './shared';

export function Journal() {
  const db = useDB();
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const [mood, setMood] = useState('');
  const needle = q.trim().toLowerCase();

  const list = db.journals
    .filter((j) => (!needle || `${j.title} ${j.content} ${j.topic}`.toLowerCase().includes(needle)) && (!cls || j.className === cls) && (!mood || j.mood === mood))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date));

  return (
    <>
      <PageHead title="Jurnal Mengajarku 📝" sub="Catat momen mengajar, refleksi, dan ide untuk besok." action={<button class="btn" onClick={() => openJournal()}>＋ Jurnal Baru</button>} />
      <div class="panel">
        <div class="filters">
          <input class="field" placeholder="🔎 Cari jurnal..." aria-label="Cari jurnal" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
          <select class="field" aria-label="Filter kelas" value={cls} onChange={(e) => setCls(e.currentTarget.value)}>
            <option value="">Semua Kelas</option>
            {db.classes.map((c) => <option value={c}>{c}</option>)}
          </select>
          <select class="field" aria-label="Filter mood" value={mood} onChange={(e) => setMood(e.currentTarget.value)}>
            <option value="">Semua Mood</option>
            {(['great', 'good', 'neutral', 'challenging'] as const).map((m) => <option value={m}>{moodIcon(m)} {moodLabel(m)}</option>)}
          </select>
        </div>
        {list.length ? list.map((j) => <JournalCard j={j} />) : <Empty title="Belum ada jurnal yang sesuai" />}
      </div>
    </>
  );
}
