import { useRef, useState } from 'preact/hooks';
import { actions, exportJSON, useDB } from '../store';
import { closeModal, download, go, openModal, toast } from '../ui';
import { cloudEnabled } from '../supabase';
import { deleteAccount, signOut, useAuth } from '../auth';
import { syncNow, useSyncStatus } from '../sync';
import { todayIn } from '../util';
import { useInstall } from '../pwa';
import { PageHead } from './shared';
import { Download, LogOut, RefreshCw, RotateCcw, Trash2, Upload, UserX } from 'lucide-preact';
import { Icon } from '../icons';

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

/** Typing the word makes wiping data a deliberate act, not a mis-tap on a confirm() box. */
function WipeConfirm({ cloud }: { cloud: boolean }) {
  const [v, setV] = useState('');
  const ok = v.trim().toUpperCase() === 'HAPUS';
  const submit = (e: Event) => {
    e.preventDefault();
    if (!ok) return;
    actions.clearAll();
    closeModal();
    toast('Semua data dihapus');
  };
  return (
    <form onSubmit={submit}>
      <p>
        {cloud
          ? 'Semua jurnal, rencana, sumber, dan tugas di akunmu akan terhapus permanen, di semua perangkat.'
          : 'Semua jurnal, rencana, sumber, dan tugas di perangkat ini akan terhapus permanen.'}{' '}
        Tindakan ini tidak bisa dibatalkan.
      </p>
      <p class="muted small">Sebaiknya ekspor dulu sebagai cadangan.</p>
      <div class="form-group">
        <label for="wipe">Ketik <b>HAPUS</b> untuk melanjutkan</label>
        <input id="wipe" class="field" autocomplete="off" autocapitalize="characters" spellcheck={false} value={v} onInput={(e) => setV(e.currentTarget.value)} />
      </div>
      <div class="compact-actions">
        <button class="btn danger" type="submit" disabled={!ok}>Hapus semua data</button>
        <button class="btn secondary" type="button" onClick={() => { download('ngampusnotes-cadangan.json', exportJSON()); toast('Cadangan diunduh'); }}>Ekspor dulu</button>
        <button class="btn ghost" type="button" onClick={closeModal}>Batal</button>
      </div>
    </form>
  );
}

function DeleteAccountConfirm({ email }: { email: string }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = v.trim().toLowerCase() === email.toLowerCase();
  const submit = async (e: Event) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    setErr('');
    try {
      await deleteAccount();
      closeModal();
      toast('Akunmu sudah dihapus');
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <p>Akun <b class="break">{email}</b> dan <b>seluruh datanya</b> (jurnal, rencana, sumber, tugas) akan dihapus permanen dari server dan semua perangkat. Tindakan ini <b>tidak bisa dibatalkan</b>.</p>
      <p class="muted small">Ekspor dulu kalau kamu masih membutuhkan catatanmu.</p>
      <div class="form-group">
        <label for="del-email">Ketik emailmu untuk melanjutkan</label>
        <input id="del-email" class="field" type="email" autocomplete="off" autocapitalize="none" spellcheck={false} placeholder={email} value={v} onInput={(e) => setV(e.currentTarget.value)} />
      </div>
      {err && <div class="notice error" role="alert">{err}</div>}
      <div class="compact-actions">
        <button class="btn danger" type="submit" disabled={!ok || busy} aria-busy={busy}>{busy ? 'Menghapus…' : 'Hapus akun permanen'}</button>
        <button class="btn secondary" type="button" onClick={() => { download('ngampusnotes-cadangan.json', exportJSON()); toast('Cadangan diunduh'); }}>Ekspor dulu</button>
        <button class="btn ghost" type="button" onClick={closeModal}>Batal</button>
      </div>
    </form>
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
      toast('File tidak valid. Gunakan file hasil ekspor NgampusNotes.');
    }
  };

  return (
    <>
      <PageHead kicker="Redaksi" title="Pengaturan" sub="Atur ruang kerja sesuai caramu belajar." />
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
                <button class="btn secondary" onClick={() => { void syncNow(); }}><Icon as={RefreshCw} size={14} /> Sinkronkan</button>
                <button class="btn danger" onClick={() => { void signOut(); }}><Icon as={LogOut} size={14} /> Keluar</button>
              </div>
            </div>
          )}
          {installState !== 'installed' && (
            <div class="panel">
              <h2>Pasang di perangkat</h2>
              {installState === 'available' && (
                <>
                  <p class="muted" style="line-height:1.7;margin-bottom:14px">Pasang NgampusNotes seperti aplikasi biasa: ikon di layar utama, tampil layar penuh, dan tetap bisa dibuka offline.</p>
                  <button class="btn" onClick={() => { void install(); }}><Icon as={Download} size={16} /> Pasang aplikasi</button>
                </>
              )}
              {installState === 'ios' && (
                <p class="muted" style="line-height:1.8">Di iPhone/iPad: buka lewat <b>Safari</b>, ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas), lalu pilih <b>Tambah ke Layar Utama</b>.</p>
              )}
              {installState === 'unavailable' && (
                <p class="muted" style="line-height:1.8">Opsi pasang belum tersedia di browser ini. Di Chrome/Edge, gunakan menu browser → <b>Instal NgampusNotes</b> atau <b>Tambahkan ke layar utama</b>.</p>
              )}
            </div>
          )}
          <form class="panel" onSubmit={(e) => { e.preventDefault(); actions.setProfile({ name: name.trim() || 'Mahasiswa', tz }); toast('Profil diperbarui'); }}>
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
            <h2>Semester &amp; Mata Kuliah</h2>
            <p class="muted small" style="margin-bottom:16px">Dipakai pada dropdown dan filter di jurnal dan perencana.</p>
            <ListEditor kind="classes" label="Semester" items={db.classes} />
            <ListEditor kind="subjects" label="Mata kuliah" items={db.subjects} />
          </div>
        </div>
        <div class="panel" style="align-self:start">
          <h2>Data &amp; Privasi</h2>
          <p class="small legal-inline"><a href="/privacy" onClick={(e) => { e.preventDefault(); go('privacy'); }}>Kebijakan Privasi</a> · <a href="/terms" onClick={(e) => { e.preventDefault(); go('terms'); }}>Syarat Penggunaan</a></p>
          <p class="muted" style="line-height:1.8">{cloudEnabled ? 'Datamu tersimpan di akunmu (terlindungi per pengguna) dan di-cache di perangkat ini agar bisa dipakai offline. Ekspor secara berkala sebagai cadangan tambahan.' : 'Data disimpan di browser perangkat ini (localStorage) tanpa akun. Ekspor secara berkala sebagai cadangan.'}</p>
          <div class="compact-actions">
            <button class="btn secondary" onClick={() => { download(`ngampusnotes-data-${todayIn(db.profile.tz)}.json`, exportJSON()); toast('Data berhasil diekspor'); }}><Icon as={Download} size={16} /> Ekspor JSON</button>
            <button class="btn secondary" onClick={() => file.current?.click()}><Icon as={Upload} size={16} /> Impor JSON</button>
            <input ref={file} type="file" accept="application/json,.json" class="hidden" onChange={onImport} />
          </div>
          <div class="compact-actions" style="margin-top:12px">
            {!cloudEnabled && <button class="btn danger" onClick={() => { if (confirm('Kembalikan data contoh? Semua perubahan akan hilang.')) { actions.reset(); setName('Mahasiswa'); toast('Data contoh dikembalikan'); } }}><Icon as={RotateCcw} size={16} /> Reset ke data contoh</button>}
            <button class="btn danger" onClick={() => openModal('Hapus semua data?', <WipeConfirm cloud={cloudEnabled} />)}><Icon as={Trash2} size={16} /> Hapus semua</button>
            {cloudEnabled && auth.session?.user.email && (
              <button class="btn danger" onClick={() => openModal('Hapus akun?', <DeleteAccountConfirm email={auth.session!.user.email!} />)}><Icon as={UserX} size={16} /> Hapus akun</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
