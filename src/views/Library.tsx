import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openResource } from '../forms';
import { Empty } from '../ui';
import { PageHead, ResourceCard } from './shared';
import { Plus } from 'lucide-preact';
import { Icon } from '../icons';

export function Library() {
  const db = useDB();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const needle = q.trim().toLowerCase();
  const list = db.resources.filter((r) => (!type || r.type === type) && (!needle || `${r.title} ${r.description}`.toLowerCase().includes(needle)));

  return (
    <>
      <PageHead kicker="Seksi · Perpustakaan" title="Bahan Kuliah" sub="Semua materi, referensi, dan ide dalam satu tempat." action={<button class="btn" onClick={() => openResource()}><Icon as={Plus} size={16} /> Tambah bahan</button>} />
      <div class="panel">
        <div class="filters">
          <input class="field" placeholder="Cari referensi..." aria-label="Cari referensi" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
          <select class="field" aria-label="Filter jenis" value={type} onChange={(e) => setType(e.currentTarget.value)}>
            <option value="">Semua Jenis</option>
            {['Materi', 'Ide', 'Link', 'Aktivitas'].map((t) => <option value={t}>{t}</option>)}
          </select>
        </div>
        <div class="list-grid">
          {list.length ? list.map((r) => <ResourceCard r={r} />) : <Empty title="Belum ada sumber yang sesuai" action={db.resources.length === 0 ? { label: 'Simpan sumber pertama', run: () => openResource() } : undefined} />}
        </div>
      </div>
    </>
  );
}
