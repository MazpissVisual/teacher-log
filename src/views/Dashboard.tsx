import { useDB } from '../store';
import { openJournal } from '../forms';
import { Empty, go } from '../ui';
import { dateText, excerpt, hourIn, moodIcon, todayIn } from '../util';
import { PageHead, TaskRow } from './shared';

export function Dashboard() {
  const db = useDB();
  const tz = db.profile.tz;
  const today = todayIn(tz);
  const h = hourIn(tz);
  const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';

  const upcoming = db.plans.filter((p) => p.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);
  const recent = [...db.journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const openTasks = db.tasks.filter((t) => !t.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9')).slice(0, 4);

  const stats: [string, string, number, string][] = [
    ['📝', 'Catatan Jurnal', db.journals.length, 'Cerita perjalananmu'],
    ['📅', 'Rencana Mengajar', db.plans.length, 'Pelajaran terorganisir'],
    ['📚', 'Sumber Belajar', db.resources.length, 'Ide di perpustakaanmu'],
    ['✅', 'Tugas Aktif', db.tasks.filter((t) => !t.done).length, 'Hal yang perlu diingat'],
  ];

  return (
    <>
      <PageHead title={`${greet}, ${db.profile.name}! ${h < 18 ? '☀️' : '🌙'}`} sub="Catatan kecil, perjalanan mengajar yang berarti." action={<button class="btn" onClick={() => openJournal()}>＋ Catatan Cepat</button>} />
      <div class="intro-banner">
        <div><h2>✨ Ruang mengajarmu, dengan ritmemu sendiri.</h2><p>Satu tempat untuk menyimpan pengalaman mengajar, rencana pembelajaran, materi, dan ide-ide terbaikmu.</p></div>
        <button class="btn" onClick={() => go('planner')}>Buka Perencana →</button>
      </div>
      <div class="cards4">
        {stats.map(([ic, l, n, sub]) => (
          <div class="stat"><div class="stat-top"><span>{l}</span><span class="stat-icon" aria-hidden="true">{ic}</span></div><strong>{n}</strong><p>{sub}</p></div>
        ))}
      </div>
      <div class="grid-main">
        <div class="stack">
          <div class="panel">
            <div class="panel-head"><h2>📅 Rencana Mengajar Mendatang</h2><button class="link" onClick={() => go('planner')}>Lihat perencana →</button></div>
            {upcoming.length ? upcoming.map((p) => (
              <div class="schedule-item"><span class="time">{p.time || '--:--'}</span><div class="details"><strong>{p.title}</strong><p>{dateText(p.date)} · {p.className || 'Rencana pribadi'}</p></div><span class="pill lilac">Terencana</span></div>
            )) : <Empty title="Belum ada rencana mendatang" />}
          </div>
          <div class="panel">
            <div class="panel-head"><h2>📝 Jurnal Terbaru</h2><button class="link" onClick={() => go('journal')}>Lihat semua →</button></div>
            {recent.length ? recent.map((j) => (
              <div class="schedule-item"><span class="time">{moodIcon(j.mood)}</span><div class="details"><strong>{j.title}</strong><p>{excerpt(j.content, 104)}</p></div><span class="muted tiny">{dateText(j.date)}</span></div>
            )) : <Empty title="Mulai dengan satu catatan kecil" />}
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="panel-head"><h2>✅ Daftar Tugas</h2><button class="link" onClick={() => go('tasks')}>Lihat semua →</button></div>
            {openTasks.length ? openTasks.map((t) => <TaskRow t={t} today={today} />) : <Empty title="Semua tugas selesai 🎉" />}
          </div>
          <div class="panel quote">
            <div class="panel-head"><h2>💜 Pengingat Kecil</h2></div>
            <p>“Menjadi guru hebat bukan tentang selalu sempurna, tetapi tentang terus belajar dari setiap pertemuan.”</p>
            <span class="small" style="color:#6c67a3">— Teman mengajarmu</span>
          </div>
        </div>
      </div>
    </>
  );
}
