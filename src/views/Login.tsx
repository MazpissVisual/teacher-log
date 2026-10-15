import { useEffect, useRef, useState } from 'preact/hooks';
import { Eye, EyeOff, MailCheck } from 'lucide-preact';
import { supabase } from '../supabase';
import { toast } from '../ui';
import { Wordmark } from '../Logo';
import { Icon } from '../icons';
import { endRecovery } from '../auth';

type Mode = 'signin' | 'signup' | 'reset' | 'newpass';
type Sent = { kind: 'signup' | 'reset'; email: string };

/** Never show raw (English) server text to teachers: map the known cases, fall back to a neutral message. */
export function friendly(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login')) return 'Email atau kata sandi salah.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Email ini sudah terdaftar. Silakan masuk, atau atur ulang kata sandi.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to')) return 'Tidak bisa terhubung. Periksa koneksi internetmu.';
  if (m.includes('at least') && m.includes('character')) return 'Kata sandi minimal 8 karakter.';
  if (m.includes('weak') || m.includes('pwned') || m.includes('easy to guess')) return 'Kata sandi terlalu mudah ditebak. Pakai kombinasi yang lebih panjang.';
  if (m.includes('different from the old')) return 'Kata sandi baru harus berbeda dari yang lama.';
  if (m.includes('valid email') || m.includes('invalid format') || (m.includes('email address') && m.includes('invalid'))) return 'Format email tidak valid.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Pendaftaran akun baru sedang ditutup.';
  if (m.includes('expired') || m.includes('session missing') || m.includes('invalid or has expired')) return 'Tautan sudah kedaluwarsa. Minta tautan baru.';
  console.error('[auth] unmapped error:', raw);
  return 'Terjadi kendala. Coba lagi sebentar lagi.';
}

const TITLES: Record<Mode, string> = { signin: 'Masuk ke GuruLog', signup: 'Buat akun GuruLog', reset: 'Atur ulang kata sandi', newpass: 'Atur kata sandi baru' };

export function Login({ recovery }: { recovery: boolean }) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [cool, setCool] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const notice = useRef<HTMLDivElement>(null);

  // The recovery flag can arrive after first render; it always wins over the tab the user was on.
  const m: Mode = recovery ? 'newpass' : mode;
  const failed = !!msg && !msg.ok;

  useEffect(() => { document.title = (sent ? 'Cek email' : TITLES[m]) + ' — GuruLog'; }, [m, sent]);
  useEffect(() => { if (failed) notice.current?.focus(); }, [msg]);
  useEffect(() => {
    if (cool <= 0) return;
    const t = window.setTimeout(() => setCool(cool - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const switchMode = (next: Mode) => { setMode(next); setMsg(null); setShow(false); };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!supabase || busy) return;
    if (!navigator.onLine) return setMsg({ ok: false, text: 'Kamu sedang offline. Sambungkan internet untuk masuk atau mendaftar.' });
    const em = email.trim().toLowerCase();
    setBusy(true);
    setMsg(null);
    let keepBusy = false; // after a successful sign-in the app swaps in a moment later; don't re-enable the button meanwhile
    try {
      if (m === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: em, password });
        if (error) {
          if (error.message.toLowerCase().includes('not confirmed')) { setSent({ kind: 'signup', email: em }); return; }
          throw error;
        }
        keepBusy = true;
      } else if (m === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: em, password,
          options: { emailRedirectTo: location.origin, data: { name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) keepBusy = true; // email confirmation off → signed in right away
        // With confirmation on, Supabase answers "success" for an existing address too, but with no identities.
        else if (data.user && (data.user.identities?.length ?? 0) === 0) setMsg({ ok: false, text: friendly('already registered') });
        else setSent({ kind: 'signup', email: em });
      } else if (m === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(em, { redirectTo: location.origin });
        if (error) throw error;
        setSent({ kind: 'reset', email: em });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        location.hash = '/dashboard';
        endRecovery();
        toast('Kata sandi diperbarui');
      }
    } catch (err) {
      setMsg({ ok: false, text: friendly((err as Error).message ?? '') });
    } finally {
      if (keepBusy) window.setTimeout(() => setBusy(false), 8000); // safety net if the session never arrives
      else setBusy(false);
    }
  };

  const resend = async () => {
    if (!supabase || !sent || cool > 0) return;
    setCool(60);
    const { error } = sent.kind === 'signup'
      ? await supabase.auth.resend({ type: 'signup', email: sent.email, options: { emailRedirectTo: location.origin } })
      : await supabase.auth.resetPasswordForEmail(sent.email, { redirectTo: location.origin });
    if (error) { setCool(0); toast(friendly(error.message)); } else toast('Email dikirim ulang');
  };

  const brand = <div class="nameplate" style="margin-bottom:20px"><span class="nameplate-title"><Wordmark /></span></div>;

  // ---------- "check your email" ----------
  if (sent) {
    return (
      <main class="auth-wrap">
        <section class="panel auth-card" aria-labelledby="auth-title">
          {brand}
          <div class="auth-icon"><Icon as={MailCheck} size={28} /></div>
          <h1 id="auth-title" class="auth-title">Cek email kamu</h1>
          <p>
            Kami mengirim {sent.kind === 'signup' ? 'tautan konfirmasi' : 'tautan untuk mengatur ulang kata sandi'} ke <b class="break">{sent.email}</b>.
            Buka emailnya, lalu klik tautan di dalamnya.
          </p>
          <p class="muted small">Belum masuk? Cek juga folder spam atau promosi. Email bisa tiba dalam 1–2 menit.</p>
          <button class="btn secondary" type="button" style="width:100%" disabled={cool > 0} onClick={resend}>
            {cool > 0 ? `Kirim ulang dalam ${cool} dtk` : 'Kirim ulang email'}
          </button>
          <div class="auth-links">
            <button type="button" class="link" onClick={() => { setSent(null); switchMode(sent.kind === 'signup' ? 'signup' : 'reset'); }}>Pakai email lain</button>
            <button type="button" class="link" onClick={() => { setSent(null); switchMode('signin'); }}>Sudah konfirmasi? Masuk</button>
          </div>
        </section>
      </main>
    );
  }

  // ---------- main form ----------
  const isNew = m === 'signup' || m === 'newpass';
  return (
    <main class="auth-wrap">
      <form class="panel auth-card" onSubmit={submit} aria-labelledby="auth-title">
        {brand}

        {(m === 'signin' || m === 'signup') && (
          <div class="tabs auth-tabs" role="tablist" aria-label="Masuk atau daftar">
            <button type="button" role="tab" aria-selected={m === 'signin'} class={'tab ' + (m === 'signin' ? 'active' : '')} onClick={() => switchMode('signin')}>Masuk</button>
            <button type="button" role="tab" aria-selected={m === 'signup'} class={'tab ' + (m === 'signup' ? 'active' : '')} onClick={() => switchMode('signup')}>Daftar</button>
          </div>
        )}

        <h1 id="auth-title" class="auth-title">{TITLES[m]}</h1>
        <p class="muted" style="margin-bottom:20px">
          {m === 'reset' ? 'Masukkan email akunmu. Kami kirim tautan untuk membuat kata sandi baru.'
            : m === 'newpass' ? 'Pilih kata sandi baru untuk akunmu.'
            : 'Catatan mengajarmu tersimpan privat di akunmu, dan bisa dibuka dari perangkat mana pun.'}
        </p>

        {m === 'signup' && (
          <div class="form-group">
            <label for="a-name">Nama panggilan <span class="opt">(opsional)</span></label>
            <input id="a-name" name="name" class="field" autocomplete="nickname" maxLength={40} placeholder="Misalnya: Bu Sari" value={name} onInput={(e) => setName(e.currentTarget.value)} />
          </div>
        )}

        {m !== 'newpass' && (
          <div class="form-group">
            <label for="a-email">Email</label>
            <input id="a-email" name="email" class="field" type="email" inputMode="email" autocomplete={m === 'signin' ? 'username' : 'email'}
              autocapitalize="none" autocorrect="off" spellcheck={false} required aria-invalid={failed || undefined}
              value={email} onInput={(e) => setEmail(e.currentTarget.value)} />
          </div>
        )}

        {m !== 'reset' && (
          <div class="form-group">
            <label for="a-pass">{m === 'newpass' ? 'Kata sandi baru' : 'Kata sandi'}</label>
            <div class="pw-wrap">
              <input id="a-pass" name="password" class="field" type={(show ? 'text' : 'password') as 'text'} required minLength={8}
                autocomplete={m === 'signin' ? 'current-password' : 'new-password'}
                aria-describedby={isNew ? 'a-hint' : undefined} aria-invalid={failed || undefined}
                value={password} onInput={(e) => setPassword(e.currentTarget.value)} />
              <button type="button" class="pw-toggle" aria-pressed={show} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShow(!show)}>
                <Icon as={show ? EyeOff : Eye} size={18} />
              </button>
            </div>
            {isNew && <span class="legend" id="a-hint">Minimal 8 karakter. Kalimat panjang yang mudah kamu ingat lebih aman daripada kata acak.</span>}
            {m === 'signin' && <button type="button" class="link auth-forgot" onClick={() => switchMode('reset')}>Lupa kata sandi?</button>}
          </div>
        )}

        {msg && <div ref={notice} tabIndex={-1} class={'notice ' + (msg.ok ? '' : 'error')} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}

        <button class="btn" type="submit" disabled={busy} aria-busy={busy} style="width:100%">
          {busy ? 'Memproses…' : { signin: 'Masuk', signup: 'Buat akun', reset: 'Kirim tautan', newpass: 'Simpan kata sandi' }[m]}
        </button>

        {m === 'signup' && <p class="legend auth-note">Dengan mendaftar, catatanmu disimpan di akunmu. Jangan memasukkan data pribadi siswa seperti alamat atau nomor telepon.</p>}

        {m === 'reset' && (
          <div class="auth-links"><button type="button" class="link" onClick={() => switchMode('signin')}>← Kembali ke masuk</button></div>
        )}
      </form>
    </main>
  );
}
