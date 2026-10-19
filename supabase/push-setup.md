# Menyiapkan notifikasi push (saat aplikasi tertutup)

Tanpa langkah ini aplikasi tetap bisa menampilkan notifikasi lokal saat terbuka. Push butuh akun (Supabase), jadi tidak berlaku untuk mode lokal tanpa login.

## 1. Buat kunci VAPID
```bash
npx web-push generate-vapid-keys
```
Simpan **public key** dan **private key**. Private key jangan pernah masuk ke repo atau `.env` aplikasi.

## 2. Jalankan migrasi
SQL Editor → jalankan [`0005_push.sql`](migrations/0005_push.sql) (setelah 0001-0004).

## 3. Deploy Edge Function
Pakai [Supabase CLI](https://supabase.com/docs/guides/cli) yang sudah `supabase login` dan `supabase link`.

```bash
npm run functions:build          # menyusun logika pengingat untuk function (hasilnya sudah di-commit)
supabase secrets set \
  VAPID_PUBLIC_KEY=<public key> \
  VAPID_PRIVATE_KEY=<private key> \
  VAPID_SUBJECT=mailto:emailmu@contoh.id \
  CRON_SECRET=<string acak panjang>
supabase functions deploy send-reminders --no-verify-jwt
```
`--no-verify-jwt` diperlukan karena yang memanggil adalah `pg_cron`, bukan pengguna. Function menolak panggilan tanpa header `x-cron-secret` yang cocok.

## 4. Jadwalkan tiap menit
Di SQL Editor (ganti `<PROJECT_REF>` dan `<CRON_SECRET>`; `CRON_SECRET` sama dengan langkah 3). Aktifkan dulu ekstensi `pg_cron` dan `pg_net` di **Database → Extensions**.

```sql
select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```
Menghentikan: `select cron.unschedule('send-reminders');`

## 5. Beri tahu aplikasi kunci publiknya
Tambahkan ke `.env` dan ke Environment Variables di Vercel (Production dan Preview), lalu deploy ulang:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
```
Tombol **Aktifkan notifikasi** di Pengaturan otomatis mendaftarkan perangkat untuk push begitu variabel ini ada.

## Catatan
- **iPhone/iPad** hanya menerima push kalau aplikasi sudah dipasang ke Layar Utama (iOS 16.4 ke atas).
- Pengingat dikirim sekali per perangkat per hari. Jadwal kuliah dikirim saat masuk jendela "sekian menit sebelum mulai".
- Perangkat yang sudah tidak aktif (endpoint 404/410) dihapus otomatis.
- Kalau logika di `src/reminders-core.ts` berubah, jalankan `npm run functions:build` dan deploy ulang function.
- Uji manual tanpa menunggu cron: `curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders -H "x-cron-secret: <CRON_SECRET>"`
