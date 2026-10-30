import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openResource, RESOURCE_TYPES } from '../forms';
import { Empty } from '../ui';
import { PageHead, ResourceCard } from './shared';
import { Plus } from 'lucide-preact';
import { Icon } from '../icons';

export function Library() {
  const db = useDB();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [cls, setCls] = useState('');
  const needle = q.trim().toLowerCase();
  const list = db.resources.filter((r) =>
    (!type || r.type === type) && (!cls || r.className === cls) && (!needle || `${r.title} ${r.description}`.toLowerCase().includes(needle)));

  return (
    <>
      <PageHead kicker="Seksi · Bahan" title="Bahan Mengajar" sub="Materi, ide, tautan, dan aktivitas kelas dalam satu tempat." action={<button class="btn" onClick={() => openResource()}><Icon as={Plus} size={16} /> Tambah bahan</button>} />
      <div class="panel">
        <div class="filters">
          <input class="field" placeholder="Cari bahan..." aria-label="Cari bahan" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
          <select class="field" aria-label="Filter jenis" value={type} onChange={(e) => setType(e.currentTarget.value)}>
            <option value="">Semua Jenis</option>
            {RESOURCE_TYPES.map((t) => <option value={t}>{t}</option>)}
          </select>
          <select class="field" aria-label="Filter kelas" value={cls} onChange={(e) => setCls(e.currentTarget.value)}>
            <option value="">Semua Kelas</option>
            {db.classes.map((c) => <option value={c}>{c}</option>)}
          </select>
        </div>
        <div class="list-grid">
          {list.length ? list.map((r) => <ResourceCard r={r} />) : <Empty title="Belum ada bahan yang sesuai" action={db.resources.length === 0 ? { label: 'Simpan bahan pertama', run: () => openResource() } : undefined} />}
        </div>
      </div>
    </>
  );
}
