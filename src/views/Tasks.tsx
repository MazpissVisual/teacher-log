import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openTask } from '../forms';
import { Empty } from '../ui';
import { todayIn } from '../util';
import { PageHead, TaskRow } from './shared';
import { Plus } from 'lucide-preact';
import { Icon } from '../icons';

const FILTERS = [['all', 'Semua'], ['todo', 'Belum Selesai'], ['done', 'Selesai']] as const;

export function Tasks() {
  const db = useDB();
  const [f, setF] = useState<'all' | 'todo' | 'done'>('all');
  const today = todayIn(db.profile.tz);
  const list = db.tasks
    .filter((t) => f === 'all' || (f === 'done' ? t.done : !t.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.date || '9').localeCompare(b.date || '9'));

  return (
    <>
      <PageHead kicker="Seksi · Tugas" title="Tugasku" sub="Hal kecil yang ingin kamu selesaikan hari ini." action={<button class="btn" onClick={() => openTask()}><Icon as={Plus} size={16} /> Tugas baru</button>} />
      <div class="panel">
        <div class="tabs" role="tablist">
          {FILTERS.map(([k, label]) => (
            <button role="tab" aria-selected={f === k} class={`tab ${f === k ? 'active' : ''}`} onClick={() => setF(k)}>{label}</button>
          ))}
        </div>
        {list.length ? list.map((t) => <TaskRow t={t} today={today} />) : <Empty title="Tidak ada tugas di kategori ini" />}
      </div>
    </>
  );
}
