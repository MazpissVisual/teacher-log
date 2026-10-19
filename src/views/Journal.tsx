import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openJournal } from '../forms';
import { Empty } from '../ui';
import { moodLabel } from '../util';
import { Icon } from '../icons';
import { Plus } from 'lucide-preact';
import { JournalCard, PageHead, SectionTabs } from './shared';

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
      <SectionTabs page="journal" />
      <PageHead kicker="Seksi · Jurnal" title="Jurnal Kuliahku" sub="Catat isi kuliah, refleksi, dan hal yang perlu dipelajari lagi." action={<button class="btn" onClick={() => openJournal()}><Icon as={Plus} size={16} /> Jurnal baru</button>} />
      <div class="panel">
        <div class="filters">
          <input class="field" placeholder="Cari jurnal..." aria-label="Cari jurnal" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
          <select class="field" aria-label="Filter semester" value={cls} onChange={(e) => setCls(e.currentTarget.value)}>
            <option value="">Semua Semester</option>
            {db.classes.map((c) => <option value={c}>{c}</option>)}
          </select>
          <select class="field" aria-label="Filter mood" value={mood} onChange={(e) => setMood(e.currentTarget.value)}>
            <option value="">Semua Mood</option>
            {(['great', 'good', 'neutral', 'challenging'] as const).map((m) => <option value={m}>{moodLabel(m)}</option>)}
          </select>
        </div>
        {list.length ? list.map((j) => <JournalCard j={j} />) : <Empty title="Belum ada jurnal yang sesuai" action={db.journals.length === 0 ? { label: 'Tulis jurnal pertamamu', run: () => openJournal() } : undefined} />}
      </div>
    </>
  );
}
