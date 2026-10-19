import type { DB } from './types';
import { addDays, DEFAULT_TZ, todayIn, uid } from './util';

export function sampleData(): DB {
  const t = todayIn(DEFAULT_TZ);
  const o = (n: number) => addDays(t, n);
  const j = { className: '', subject: 'Basis Data', topic: '', worked: '', improve: '', pinned: false } as const;
  return {
    version: 2,
    profile: { name: 'Mahasiswa', tz: DEFAULT_TZ },
    classes: ['Semester 1', 'Semester 2', 'Semester 3'],
    subjects: ['Basis Data', 'Statistika', 'Metodologi Penelitian'],
    journals: [
      { ...j, id: uid(), date: o(-1), type: 'detailed', title: 'Normalisasi Itu Ternyata Seru', content: 'Hari ini dosen membahas normalisasi sampai 3NF dengan contoh data toko online. Mulai kebayang kenapa tabel perlu dipecah.', className: 'Semester 3', mood: 'great', worked: 'Contoh kasus nyata bikin cepat nyambung.', improve: 'Masih bingung bedanya 3NF dan BCNF.', topic: 'Normalisasi Basis Data' },
      { ...j, id: uid(), date: o(-3), type: 'quick', title: 'Ide Topik Proposal', content: 'Coba bahas pengaruh jam belajar terhadap nilai, datanya bisa dari survei teman satu angkatan.', subject: 'Metodologi Penelitian', className: 'Semester 3', mood: 'good' },
      { ...j, id: uid(), date: o(-6), type: 'detailed', title: 'Uji Hipotesis Bikin Pusing', content: 'Konsep p-value masih abstrak, tapi contoh di akhir kelas cukup membantu.', subject: 'Statistika', className: 'Semester 3', mood: 'challenging', worked: 'Latihan soal bareng teman.', improve: 'Ulangi materi distribusi normal sebelum kuis.', topic: 'Uji Hipotesis' },
    ],
    plans: [
      { id: uid(), title: 'Kuliah Basis Data: Query Lanjutan', date: o(1), time: '08:00', className: 'Semester 3', subject: 'Basis Data', objective: 'Paham JOIN dan subquery', activities: 'Baca slide, latihan query di praktikum', kind: 'kuliah' },
      { id: uid(), title: 'Kuis Uji Hipotesis', date: o(2), time: '10:00', className: 'Semester 3', subject: 'Statistika', objective: 'Lulus kuis uji hipotesis', activities: 'Belajar kelompok dan kerjakan soal latihan', kind: 'kuis' },
      { id: uid(), title: 'UTS Basis Data', date: o(9), time: '09:00', className: 'Semester 3', subject: 'Basis Data', objective: 'Normalisasi, ERD, dan SQL dasar', activities: 'Ulangi slide dan kerjakan soal tahun lalu', kind: 'uts' },
    ],
    resources: [
      { id: uid(), title: 'Slide Normalisasi', type: 'Materi', subject: 'Basis Data', description: 'Ringkasan 1NF sampai 3NF dengan contoh tabel.', url: '' },
      { id: uid(), title: 'Ringkasan Uji Hipotesis', type: 'Materi', subject: 'Statistika', description: 'Langkah uji-t dan cara membaca p-value.', url: '' },
      { id: uid(), title: 'Google Scholar', type: 'Link', subject: 'Metodologi Penelitian', description: 'Cari jurnal untuk proposal dan tinjauan pustaka.', url: 'https://scholar.google.com' },
    ],
    tasks: [
      { id: uid(), title: 'Kerjakan tugas ERD toko online', subject: 'Basis Data', date: o(1), priority: 'high', done: false },
      { id: uid(), title: 'Cari 5 jurnal untuk tinjauan pustaka', subject: 'Metodologi Penelitian', date: o(2), priority: 'medium', done: false },
      { id: uid(), title: 'Kumpulkan laporan praktikum', subject: 'Basis Data', date: o(-1), priority: 'low', done: true },
    ],
    schedules: [
      { id: uid(), subject: 'Basis Data', className: 'Semester 3', day: 1, start: '08:00', end: '09:40', room: 'Lab 2', until: '' },
      { id: uid(), subject: 'Statistika', className: 'Semester 3', day: 3, start: '10:00', end: '11:40', room: 'R. 301', until: '' },
      { id: uid(), subject: 'Metodologi Penelitian', className: 'Semester 3', day: 4, start: '13:00', end: '14:40', room: 'R. 204', until: '' },
    ],
    stages: [
      { id: uid(), title: 'Pengajuan judul', status: 'done', date: '', note: '' },
      { id: uid(), title: 'Proposal', status: 'doing', date: o(14), note: 'Bab 1 sampai 3' },
      { id: uid(), title: 'Seminar proposal', status: 'todo', date: '', note: '' },
    ],
    guidance: [
      { id: uid(), date: o(-4), lecturer: 'Dr. Andi', notes: 'Rumusan masalah perlu dipertajam, tambahkan referensi 5 tahun terakhir.', followup: 'Revisi bab 1 dan kirim ulang', followupDone: false },
    ],
  };
}
