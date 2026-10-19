# NgampusNotes

Jurnal kuliah, perencana, bahan kuliah, dan daftar tugas untuk mahasiswa. PWA yang bisa dipasang di HP, bekerja offline, dan menyinkronkan data ke akun pengguna.

**Stack:** Vite · Preact · TypeScript · Supabase (Auth + Postgres + RLS) · `vite-plugin-pwa`. Desain: "Newsprint" (lihat `desingpromt.md`).

## Menjalankan di komputer

```bash
npm install
cp .env.example .env      # lalu isi dua nilai Supabase (lihat bawah)
npm run dev               # http://localhost:5173
```

Tanpa `.env`, aplikasi berjalan **lokal tanpa login** (data di browser, berisi data contoh). Berguna untuk mencoba tampilan.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server pengembangan |
| `npm run build` | cek tipe (`tsc`) + build produksi ke `dist/` |
| `npm run preview` | menyajikan `dist/` lengkap dengan header keamanan produksi |
| `npm test` | tes unit (Vitest) |
| `npm run logo` | membuat ulang logo, ikon PWA, dan gambar preview dari `scripts/make-logo.mjs` |

## Menyiapkan Supabase

1. Buat proyek di [supabase.com](https://supabase.com).
2. **SQL Editor** → jalankan berurutan:
   - [`0001_init.sql`](supabase/migrations/0001_init.sql): tabel dan kebijakan RLS (setiap pengguna hanya bisa mengakses datanya sendiri).
   - [`0002_delete_account.sql`](supabase/migrations/0002_delete_account.sql): fungsi yang dipakai tombol **Hapus akun** di Pengaturan.
3. **Settings → API Keys**: salin **Project URL** dan **Publishable key** ke `.env`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Hanya dua nilai ini yang wajib. (Opsional: `NEXT_PUBLIC_CONTACT_EMAIL` untuk alamat kontak di halaman Privasi dan Syarat.)
   Hanya dua nilai ini yang dipakai untuk koneksi. **Jangan** memasukkan `secret` / `service_role` key: kunci itu mem-bypass RLS.
4. **Authentication → URL Configuration**: isi **Site URL** dan **Redirect URLs** dengan alamat aplikasi (`http://localhost:5173` untuk pengembangan, domain produksi setelah deploy).
5. Opsional: **Authentication → Providers → Google** untuk tombol "Lanjutkan dengan Google" (tombol muncul sendiri begitu Google aktif).

### Sebelum dipakai pengguna sungguhan
- Pasang **SMTP kustom** (Authentication → SMTP). Layanan email bawaan hanya mengirim beberapa email per jam.
- Nyalakan kembali **Confirm email** bila sebelumnya dimatikan untuk uji coba.
- Pasang **CAPTCHA** (Authentication → Attack Protection).
- Proyek gratis **dijeda setelah 7 hari tanpa aktivitas** dan tidak punya backup otomatis; ingatkan pengguna memakai **Ekspor JSON**.

## Deploy ke Vercel

1. Dorong repo ke GitHub, lalu **Add New → Project** di Vercel dan pilih repo (preset **Vite** terdeteksi otomatis).
2. **Environment Variables**: tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (untuk Production dan Preview).
3. Deploy. [`vercel.json`](vercel.json) sudah memuat rewrite SPA (agar refresh di `/journal` tidak 404), header keamanan (CSP, dll.), dan cache aset.
4. Salin domain produksi ke **Site URL / Redirect URLs** di Supabase (langkah 4 di atas).
5. Gambar preview tautan (WhatsApp, dll.) memakai `og.png` dengan URL absolut. Vercel mengisinya otomatis dari domain produksi; di host lain set variabel `SITE_URL`.

Host lain (Netlify dan sejenisnya): `public/_redirects` sudah menyediakan fallback SPA. Header keamanan perlu disalin dari `vercel.json`. Aplikasi harus berada di akar domain (bukan subfolder).

## Struktur

```
src/
  store.ts      state lokal + normalisasi data + diff perubahan
  sync.ts       antrean (outbox) dan sinkronisasi ke Supabase
  auth.ts       sesi, bootstrap akun baru, keluar
  ui.tsx        router (History API), toast, modal, animasi hapus
  views/        halaman: Dashboard, Journal, Planner, Library, Tasks, Journey, Settings, Login
  styles.css    token desain + komponen (Newsprint)
supabase/migrations/   skema SQL + RLS
scripts/make-logo.mjs  pembuat logo/ikon
```

Data bersifat **local-first**: UI selalu membaca/menulis penyimpanan lokal, perubahan masuk antrean dan dikirim saat online. Server menang saat penarikan, tetapi hanya setelah antrean kosong sehingga suntingan yang belum terkirim tidak tertimpa.

## Catatan keamanan
- Seluruh akses data dilindungi RLS; kunci publishable aman berada di browser.
- CSP melarang skrip inline dan hanya mengizinkan koneksi ke `*.supabase.co`. Jika menambah layanan pihak ketiga (analitik, dll.), perbarui `connect-src` di `vercel.json`.
- `.env` tidak boleh di-commit (sudah ada di `.gitignore`).
