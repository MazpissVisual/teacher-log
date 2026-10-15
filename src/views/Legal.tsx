import { ArrowLeft } from 'lucide-preact';
import { Icon } from '../icons';
import { Wordmark } from '../Logo';
import { go } from '../ui';

const UPDATED = '16 Oktober 2026';
// Optional: set NEXT_PUBLIC_CONTACT_EMAIL in the environment to show a contact address.
const CONTACT = (import.meta.env.NEXT_PUBLIC_CONTACT_EMAIL as string | undefined)?.trim();

const Contact = () => CONTACT
  ? <>Hubungi kami di <a href={'mailto:' + CONTACT}>{CONTACT}</a>.</>
  : <>Hubungi pengelola aplikasi yang membagikan tautan GuruLog kepadamu.</>;

function Shell({ title, kicker, children }: { title: string; kicker: string; children: preact.ComponentChildren }) {
  const back = () => { if (history.length > 1 && document.referrer.startsWith(location.origin)) history.back(); else go('dashboard'); };
  return (
    <div class="layout">
      <header class="legal-head">
        <a class="legal-brand" href="/" onClick={(e) => { e.preventDefault(); go('dashboard'); }}><Wordmark /></a>
      </header>
      <main class="container legal" id="main" tabIndex={-1}>
        <button class="link legal-back" onClick={back}><Icon as={ArrowLeft} size={14} /> Kembali</button>
        <span class="kicker">{kicker}</span>
        <h1>{title}</h1>
        <p class="legal-updated label">Diperbarui {UPDATED}</p>
        {children}
        <nav class="legal-links" aria-label="Dokumen hukum">
          <a href="/privacy" onClick={(e) => { e.preventDefault(); go('privacy'); }}>Kebijakan Privasi</a>
          <a href="/terms" onClick={(e) => { e.preventDefault(); go('terms'); }}>Syarat Penggunaan</a>
        </nav>
      </main>
    </div>
  );
}

export function Privacy() {
  return (
    <Shell kicker="Dokumen" title="Kebijakan Privasi">
      <p class="legal-lead">GuruLog adalah buku catatan pribadi untuk guru. Kami menyimpan sedikit data, hanya untuk menjalankan aplikasi, dan tidak menjualnya.</p>

      <h2>1. Data yang kami simpan</h2>
      <ul>
        <li><b>Akun:</b> alamat email, kata sandi (disimpan dalam bentuk terenkripsi/hash oleh penyedia autentikasi, bukan teks asli), dan nama panggilan jika kamu mengisinya.</li>
        <li><b>Masuk dengan Google:</b> nama dan alamat email dari akun Google-mu. Kami tidak mendapat kata sandi Google-mu.</li>
        <li><b>Isi yang kamu tulis:</b> jurnal mengajar, rencana pembelajaran, sumber belajar, tugas, serta pengaturan seperti zona waktu, daftar kelas, dan mata pelajaran.</li>
      </ul>
      <p>Kami <b>tidak</b> mengumpulkan lokasi, kontak, foto, mikrofon, atau kamera, dan tidak memasang iklan atau pelacak pihak ketiga. Font dimuat dari server kami sendiri.</p>

      <h2>2. Untuk apa data dipakai</h2>
      <p>Hanya untuk menyimpan dan menyinkronkan catatanmu antar perangkat, serta mengelola akunmu (masuk, atur ulang kata sandi). Data tidak dijual dan tidak dibagikan untuk iklan.</p>

      <h2>3. Di mana data disimpan</h2>
      <ul>
        <li>Di basis data penyedia layanan kami (Supabase). Setiap pengguna hanya dapat membaca dan mengubah datanya sendiri; aturan ini dijaga di tingkat basis data.</li>
        <li>Data dikirim lewat koneksi terenkripsi (HTTPS).</li>
        <li>Salinan juga disimpan di browser/perangkatmu agar aplikasi dapat dipakai tanpa internet. Salinan ini dihapus saat kamu keluar dari akun.</li>
        <li>Pengelola teknis aplikasi secara teknis dapat mengakses basis data untuk pemeliharaan. Kami tidak membaca isi catatanmu kecuali untuk memperbaiki masalah yang kamu laporkan.</li>
      </ul>

      <h2>4. Jangan menyimpan data pribadi siswa</h2>
      <p>GuruLog tidak dirancang untuk data sensitif. Hindari menulis nama lengkap siswa, alamat, nomor telepon, nomor induk, atau nilai yang dapat mengidentifikasi seseorang. Gunakan inisial atau catatan umum.</p>

      <h2>5. Hakmu</h2>
      <ul>
        <li><b>Mengunduh datamu:</b> Pengaturan → Ekspor JSON.</li>
        <li><b>Mengubah atau menghapus catatan:</b> langsung di aplikasi.</li>
        <li><b>Menghapus akun:</b> Pengaturan → Hapus akun. Seluruh data akunmu dihapus dari basis data dan tidak dapat dikembalikan.</li>
      </ul>
      <p>Cadangan sistem milik penyedia layanan, jika ada, dapat bertahan sementara sesuai kebijakan penyedia tersebut.</p>

      <h2>6. Penyimpanan di browser</h2>
      <p>GuruLog memakai penyimpanan lokal browser untuk menyimpan sesi masuk dan salinan datamu. Kami tidak memakai cookie pelacak.</p>

      <h2>7. Pengguna anak-anak</h2>
      <p>GuruLog ditujukan untuk guru dan tenaga pendidik dewasa, bukan untuk anak-anak.</p>

      <h2>8. Perubahan dan kontak</h2>
      <p>Jika kebijakan ini berubah secara berarti, kami akan memperbarui tanggal di atas dan memberi tahu di aplikasi. <Contact /></p>
    </Shell>
  );
}

export function Terms() {
  return (
    <Shell kicker="Dokumen" title="Syarat Penggunaan">
      <p class="legal-lead">Dengan memakai GuruLog, kamu menyetujui syarat sederhana berikut.</p>

      <h2>1. Layanan</h2>
      <p>GuruLog membantu guru mencatat jurnal, merencanakan pembelajaran, dan menyimpan sumber belajar. Layanan diberikan <b>apa adanya</b>; kami berusaha menjaganya tetap berjalan tetapi tidak menjamin tersedia tanpa gangguan.</p>

      <h2>2. Akunmu</h2>
      <ul>
        <li>Gunakan email yang kamu miliki dan jaga kerahasiaan kata sandimu.</li>
        <li>Kamu bertanggung jawab atas aktivitas di akunmu.</li>
        <li>Satu akun untuk satu guru.</li>
      </ul>

      <h2>3. Isi yang kamu simpan</h2>
      <ul>
        <li>Isi catatan adalah milikmu dan tanggung jawabmu.</li>
        <li>Jangan menyimpan data pribadi siswa atau materi yang melanggar hukum atau hak orang lain.</li>
        <li>Jangan menyalahgunakan layanan (misalnya mencoba mengakses data pengguna lain atau membebani sistem).</li>
      </ul>

      <h2>4. Cadangan</h2>
      <p>Ekspor datamu secara berkala lewat Pengaturan → Ekspor JSON. Kami tidak menjamin data tidak pernah hilang, terutama pada layanan gratis.</p>

      <h2>5. Batas tanggung jawab</h2>
      <p>Sejauh diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung akibat penggunaan atau ketidaktersediaan layanan, termasuk hilangnya data.</p>

      <h2>6. Penghentian</h2>
      <p>Kamu dapat berhenti kapan saja dengan menghapus akun. Kami dapat menangguhkan akun yang melanggar syarat ini.</p>

      <h2>7. Perubahan dan hukum</h2>
      <p>Syarat dapat diperbarui; tanggal terbaru tertera di atas. Syarat ini tunduk pada hukum yang berlaku di Indonesia. <Contact /></p>
    </Shell>
  );
}
