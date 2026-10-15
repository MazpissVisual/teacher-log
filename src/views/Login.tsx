import { useState } from 'preact/hooks';
import { supabase } from '../supabase';
import { toast } from '../ui';

type Mode = 'signin' | 'signup' | 'reset' | 'newpass';

const friendly = (m: string) => {
  if (/invalid login/i.test(m)) return 'Email atau kata sandi salah.';
  if (/already registered|already been registered/i.test(m)) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (/email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Cek kotak masuk kamu.';
  if (/rate limit|too many/i.test(m)) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (/fetch|network/i.test(m)) return 'Tidak bisa terhubung. Periksa koneksi internetmu.';
  return m;
};

export function Login({ recovery }: { recovery: boolean }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'newpass' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin } });
        if (error) throw error;
        // With "Confirm email" enabled there is no session yet.
        if (!data.session) setMsg({ ok: true, text: 'Akun dibuat. Cek email kamu dan klik tautan konfirmasi, lalu masuk.' });
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
        if (error) throw error;
        setMsg({ ok: true, text: 'Jika email terdaftar, tautan reset kata sandi sudah dikirim.' });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast('Kata sandi diperbarui');
        location.hash = '';
        location.reload();
      }
    } catch (err) {
      setMsg({ ok: false, text: friendly((err as Error).message ?? 'Terjadi kesalahan') });
    } finally {
      setBusy(false);
    }
  };

  const title = { signin: 'Masuk ke GuruLog', signup: 'Buat akun GuruLog', reset: 'Reset kata sandi', newpass: 'Atur kata sandi baru' }[mode];

  return (
    <main class="auth-wrap">
      <form class="panel auth-card" onSubmit={submit}>
        <div class="nameplate" style="margin-bottom:20px"><span class="nameplate-title">GuruLog<i>.</i></span></div>
        <h1 style="font-size:22px">{title}</h1>
        <p class="muted" style="margin-bottom:20px">Catatan mengajarmu tersimpan privat di akunmu dan bisa dibuka dari perangkat mana pun.</p>

        {mode !== 'newpass' && (
          <div class="form-group"><label for="a-email">Email</label><input id="a-email" class="field" type="email" autocomplete="email" required value={email} onInput={(e) => setEmail(e.currentTarget.value)} /></div>
        )}
        {mode !== 'reset' && (
          <div class="form-group">
            <label for="a-pass">{mode === 'newpass' ? 'Kata sandi baru' : 'Kata sandi'}</label>
            <input id="a-pass" class="field" type="password" required minLength={8} autocomplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onInput={(e) => setPassword(e.currentTarget.value)} />
            {mode !== 'signin' && <span class="legend">Minimal 8 karakter.</span>}
          </div>
        )}

        {msg && <div class={`notice ${msg.ok ? '' : 'error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</div>}

        <button class="btn" type="submit" disabled={busy} style="width:100%">{busy ? 'Memproses…' : { signin: 'Masuk', signup: 'Daftar', reset: 'Kirim tautan reset', newpass: 'Simpan kata sandi' }[mode]}</button>

        {mode !== 'newpass' && (
          <div class="auth-links">
            {mode === 'signin' ? (
              <>
                <button type="button" class="link" onClick={() => { setMode('signup'); setMsg(null); }}>Belum punya akun? Daftar</button>
                <button type="button" class="link" onClick={() => { setMode('reset'); setMsg(null); }}>Lupa kata sandi?</button>
              </>
            ) : (
              <button type="button" class="link" onClick={() => { setMode('signin'); setMsg(null); }}>← Kembali ke masuk</button>
            )}
          </div>
        )}
      </form>
    </main>
  );
}
