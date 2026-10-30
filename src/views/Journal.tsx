import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openJournal } from '../forms';
import { Empty } from '../ui';
import { Icon } from '../icons';
import { Plus } from 'lucide-preact';
import { JournalCard, PageHead } from './shared';

export function Journal() {
  const db = useDB();
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const needle = q.trim().toLowerCase();

  const list = db.journals
    .filter((j) => (!needle || `${j.title} ${j.content}`.toLowerCase().includes(needle)) && (!cls || j.className === cls))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHead kicker="Seksi · Jurnal" title="Jurnal Mengajar" sub="Catat apa yang berjalan baik, apa yang perlu diperbaiki, dan tindak lanjutnya." action={<button class="btn" onClick={() => openJournal()}><Icon as={Plus} size={16} /> Jurnal baru</button>} />
      <div class="panel">
        <div class="filters">
          <input class="field" placeholder="Cari jurnal..." aria-label="Cari jurnal" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
          <select class="field" aria-label="Filter kelas" value={cls} onChange={(e) => setCls(e.currentTarget.value)}>
            <option value="">Semua Kelas</option>
            {db.classes.map((c) => <option value={c}>{c}</option>)}
          </select>
        </div>
        {list.length ? list.map((j) => <JournalCard j={j} />) : <Empty title="Belum ada jurnal yang sesuai" action={db.journals.length === 0 ? { label: 'Tulis jurnal pertamamu', run: () => openJournal() } : undefined} />}
      </div>
    </>
  );
}
