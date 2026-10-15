import type { DB } from './types';
import { addDays, DEFAULT_TZ, todayIn, uid } from './util';

export function sampleData(): DB {
  const t = todayIn(DEFAULT_TZ);
  const o = (n: number) => addDays(t, n);
  const j = { className: '', subject: 'Informatika', topic: '', worked: '', improve: '', pinned: false } as const;
  return {
    version: 2,
    profile: { name: 'Guru', tz: DEFAULT_TZ },
    classes: ['VII A', 'VII B', 'IX B'],
    subjects: ['Informatika'],
    journals: [
      { ...j, id: uid(), date: o(-1), type: 'detailed', title: 'Praktik Flowchart yang Seru', content: 'Hari ini siswa sangat antusias saat membuat flowchart dari aktivitas keseharian. Beberapa siswa masih kesulitan memahami simbol keputusan.', className: 'VII A', mood: 'great', worked: 'Contoh kehidupan sehari-hari sangat membantu.', improve: 'Tambahkan permainan simbol di pertemuan berikutnya.', topic: 'Algoritma dan Flowchart' },
      { ...j, id: uid(), date: o(-3), type: 'quick', title: 'Ide untuk Kuis Excel', content: 'Minggu depan coba kuis tim tentang rumus SUM, AVERAGE dan IF supaya lebih interaktif.', className: 'IX B', mood: 'good' },
      { ...j, id: uid(), date: o(-6), type: 'detailed', title: 'Tantangan Diskusi Kelompok', content: 'Diskusi sudah lebih terarah, tetapi beberapa siswa masih pasif.', className: 'VII B', mood: 'challenging', worked: 'Kelompok kecil lebih aktif.', improve: 'Coba peran kelompok bergilir.', topic: 'Berpikir Komputasional' },
    ],
    plans: [
      { id: uid(), title: 'Algoritma dalam Kehidupan Sehari-hari', date: o(1), time: '07:30', className: 'VII A', subject: 'Informatika', objective: 'Siswa memahami konsep algoritma', activities: 'Diskusi, studi kasus dan latihan kelompok' },
      { id: uid(), title: 'Praktik Rumus Excel', date: o(2), time: '10:00', className: 'IX B', subject: 'Informatika', objective: 'Menerapkan rumus dasar Excel', activities: 'Latihan langsung di komputer' },
    ],
    resources: [
      { id: uid(), title: 'Ice Breaking: Tebak Algoritma', type: 'Aktivitas', description: 'Permainan kelompok untuk mengenalkan urutan instruksi dan logika.', url: '' },
      { id: uid(), title: 'Materi Fungsi Excel Dasar', type: 'Materi', description: 'Ringkasan rumus SUM, AVERAGE dan IF untuk kelas IX.', url: '' },
      { id: uid(), title: 'Referensi Desain Media Interaktif', type: 'Link', description: 'Koleksi inspirasi visual untuk materi Informatika.', url: 'https://www.canva.com' },
    ],
    tasks: [
      { id: uid(), title: 'Siapkan slide materi algoritma', date: o(1), priority: 'high', done: false },
      { id: uid(), title: 'Buat soal kuis Excel', date: o(2), priority: 'medium', done: false },
      { id: uid(), title: 'Evaluasi hasil praktik flowchart', date: o(-1), priority: 'low', done: true },
    ],
  };
}
