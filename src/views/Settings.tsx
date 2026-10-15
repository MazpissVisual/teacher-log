import { useRef, useState } from 'preact/hooks';
import { actions, exportJSON, useDB } from '../store';
import { download, toast } from '../ui';
import { cloudEnabled } from '../supabase';
import { signOut, useAuth } from '../auth';
import { syncNow, useSyncStatus } from '../sync';
import { todayIn } from '../util';
import { useInstall } from '../pwa';
import { PageHead } from './shared';

function ListEditor({ kind, label, items }: { kind: 'classes' | 'subjects'; label: string; items: string[] }) {
  const [v, setV] = useState('');
  const add = (e: Event) => {
    e.preventDefault();
    if (!v.trim()) return;
    actions.setList(kind, [...items, v]);
    setV('');
  };
  return (
    <div class="form-group">
      <label for={`add-${kind}`}>{label}</label>
      <div class="chips">
        {items.map((c) => (
          <span class="tag chip">{c}<button type="button" aria-label={`Hapus ${c}`} onClick={() => actions.setList(kind, items.filter((x) => x !== c))}>×</button></span>
        ))}
        {!items.length && <span class="muted small">Belum ada.</span>}
      </div>
      <form class="inline-form" onSubmit={add}>
        <input id={`add-${kind}`} class="field" value={v} onInput={(e) => setV(e.currentTarget.value)} placeholder="Tambah baru..." />
        <button class="btn secondary" type="submit">Tambah</button>
      </form>
    </div>
  );
}

export function Settings() {
  const db = useDB();
  const [name, setName] = useState(db.profile.name);
  const [tz, setTz] = useState(db.profile.tz);
  const file = useRef<HTMLInputElement>(null);
  const auth = useAuth();
  const sync = useSyncStatus();
  const { state: installState, install } = useInstall();

  const onImport = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (!confirm('Impor akan menggantikan semua data saat ini. Lanjutkan?')) return;
    try {
      actions.importJSON(await f.text());
      toast('Data berhasil diimpor');
    } catch {
      toast('File tidak valid. Gunakan file hasil ekspor GuruLog.');
    }
  };

  return (
    <>
      <PageHead title="Pengaturan ⚙️" sub="Atur ruang kerja sesuai caramu mengajar." />
      <div class="grid-main">
        <div class="stack">
          {cloudEnabled && (
            <div class="panel">
              <h2>Akun</h2>
              <p class="muted" style="margin-bottom:6px">Masuk sebagai</p>
              <p><b>{auth.session?.user.email}</b></p>
              <p class="legend" style="margin:8px 0 16px">
                {sync.state === 'syncing' ? 'Sedang menyinkronkan…' : sync.state === 'offline' ? 'Offline — perubahan akan dikirim saat tersambung.' : sync.state === 'error' ? `Gagal sinkron: ${sync.error}` : sync.pending ? `${sync.pending} perubahan menunggu dikirim.` : sync.lastSync ? `Terakhir sinkron ${new Date(sync.lastSync).toLocaleTimeString('id-ID')}.` : 'Siap.'}
              </p>
              <div class="compact-actions">
                <button class="btn secondary" onClick={() => { void syncNow(); }}>⟳ Sinkronkan</button>
                <button class="btn danger" onClick={() => { void signOut(); }}>Keluar</button>
              </div>
            </div>
          )}
          {installState !== 'installed' && (
            <div class="panel">
              <h2>Pasang di perangkat</h2>
              {installState === 'available' && (
                <>
                  <p class="muted" style="line-height:1.7;margin-bottom:14px">Pasang GuruLog seperti aplikasi biasa: ikon di layar utama, tampil layar penuh, dan tetap bisa dibuka offline.</p>
                  <button class="btn" onClick={() => { void install(); }}>⬇ Pasang aplikasi</button>
                </>
              )}
              {installState === 'ios' && (
                <p class="muted" style="line-height:1.8">Di iPhone/iPad: buka lewat <b>Safari</b>, ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas), lalu pilih <b>Tambah ke Layar Utama</b>.</p>
              )}
              {installState === 'unavailable' && (
                <p class="muted" style="line-height:1.8">Opsi pasang belum tersedia di browser ini. Di Chrome/Edge, gunakan menu browser → <b>Instal GuruLog</b> atau <b>Tambahkan ke layar utama</b>.</p>
              )}
            </div>
          )}
          <form class="panel" onSubmit={(e) => { e.preventDefault(); actions.setProfile({ name: name.trim() || 'Guru', tz }); toast('Profil diperbarui'); }}>
            <h2>Profil</h2>
            <div class="form-group"><label for="s-name">Nama panggilan</label><input id="s-name" class="field" value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="Nama atau panggilanmu" /></div>
            <div class="form-group"><label for="s-tz">Zona waktu</label>
              <select id="s-tz" class="field" value={tz} onChange={(e) => setTz(e.currentTarget.value)}>
                <option value="Asia/Jakarta">WIB — Asia/Jakarta</option>
                <option value="Asia/Makassar">WITA — Asia/Makassar</option>
                <option value="Asia/Jayapura">WIT — Asia/Jayapura</option>
              </select>
            </div>
            <button class="btn" type="submit">Simpan Profil</button>
          </form>
          <div class="panel">
            <h2>Kelas &amp; Mata Pelajaran</h2>
            <p class="muted small" style="margin-bottom:16px">Dipakai pada dropdown dan filter di jurnal dan perencana.</p>
            <ListEditor kind="classes" label="Kelas" items={db.classes} />
            <ListEditor kind="subjects" label="Mata pelajaran" items={db.subjects} />
          </div>
        </div>
        <div class="panel" style="align-self:start">
          <h2>Data &amp; Privasi</h2>
          <p class="muted" style="line-height:1.8">{cloudEnabled ? 'Datamu tersimpan di akunmu (terlindungi per pengguna) dan di-cache di perangkat ini agar bisa dipakai offline. Ekspor secara berkala sebagai cadangan tambahan.' : 'Data disimpan di browser perangkat ini (localStorage) tanpa akun. Ekspor secara berkala sebagai cadangan.'}</p>
          <div class="compact-actions">
            <button class="btn secondary" onClick={() => { download(`gurulog-data-${todayIn(db.profile.tz)}.json`, exportJSON()); toast('Data berhasil diekspor'); }}>↓ Ekspor JSON</button>
            <button class="btn secondary" onClick={() => file.current?.click()}>↑ Impor JSON</button>
            <input ref={file} type="file" accept="application/json,.json" class="hidden" onChange={onImport} />
          </div>
          <div class="compact-actions" style="margin-top:12px">
            <button class="btn danger" onClick={() => { if (confirm('Kembalikan data contoh? Semua perubahan akan hilang.')) { actions.reset(); setName('Guru'); toast('Data contoh dikembalikan'); } }}>↻ Reset ke Data Contoh</button>
            <button class="btn danger" onClick={() => { if (confirm('Hapus SEMUA data? Tindakan ini tidak bisa dibatalkan.')) { actions.clearAll(); toast('Semua data dihapus'); } }}>🗑 Hapus Semua</button>
          </div>
        </div>
      </div>
    </>
  );
}
