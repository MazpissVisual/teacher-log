import { useState } from 'preact/hooks';
import { BookOpen, CalendarDays, CheckSquare, NotebookPen, Pause, Play, Plus } from 'lucide-preact';
import { useDB } from '../store';
import { openJournal } from '../forms';
import { Icon, MoodIcon } from '../icons';
import { CountUp, Empty, go } from '../ui';
import { dateText, excerpt, hourIn, todayIn } from '../util';
import { TaskRow } from './shared';
import { Onboarding } from './Onboarding';

export function Dashboard() {
  const db = useDB();
  const [paused, setPaused] = useState(false);
  const tz = db.profile.tz;
  const today = todayIn(tz);
  const h = hourIn(tz);
  const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';

  const upcoming = db.plans.filter((p) => p.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const todayPlans = upcoming.filter((p) => p.date === today);
  const recent = [...db.journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const openTasks = db.tasks.filter((t) => !t.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
  const overdue = openTasks.filter((t) => t.date && t.date < today);

  // Headlines for the ticker: what actually needs attention, then totals.
  const ticks = [
    ...overdue.map((t) => `Terlambat: ${t.title}`),
    ...upcoming.slice(0, 3).map((p) => `${dateText(p.date)}${p.time ? ' ' + p.time : ''} — ${p.title}`),
    `${db.journals.length} catatan kuliah`,
    `${openTasks.length} tugas aktif`,
    `${db.resources.length} bahan kuliah`,
  ];

  const stats: [typeof NotebookPen, string, number, string][] = [
    [NotebookPen, 'Catatan kuliah', db.journals.length, 'Cerita perjalananmu'],
    [CalendarDays, 'Rencana kuliah', db.plans.length, 'Jadwal terorganisir'],
    [BookOpen, 'Bahan kuliah', db.resources.length, 'Referensi di perpustakaanmu'],
    [CheckSquare, 'Tugas aktif', openTasks.length, 'Hal yang perlu diingat'],
  ];

  return (
    <>
      <section class="lead" aria-labelledby="lead-title">
        <div class="lead-main">
          <span class="kicker">Laporan utama</span>
          <h1 id="lead-title">{greet}, {db.profile.name}.</h1>
          <p class="lead-deck">
            Catat kuliah, rencana, dan bahan belajarmu.
            {todayPlans.length ? ` Hari ini kamu punya ${todayPlans.length} jadwal kuliah.` : ''}
            {overdue.length ? ` Ada ${overdue.length} tugas yang sudah lewat tenggat.` : ''}
          </p>
          <div class="compact-actions hero-actions" style="margin-top:20px">
            <button class="btn" onClick={() => openJournal()}><Icon as={Plus} size={16} /> Catatan cepat</button>
            <button class="btn secondary" onClick={() => go('planner')}>Buka perencana</button>
          </div>
        </div>
        <aside class={"lead-side" + (todayPlans.length ? "" : " is-empty")} aria-labelledby="today-title">
          <h2 id="today-title">Agenda hari ini</h2>
          {todayPlans.length ? todayPlans.map((p) => (
            <div class="schedule-item"><span class="time">{p.time || '--:--'}</span><div class="details"><strong>{p.title}</strong><p>{p.className || p.subject || 'Rencana pribadi'}</p></div></div>
          )) : <p class="muted" style="font-style:italic">Tidak ada jadwal hari ini.</p>}
        </aside>
      </section>

      <Onboarding />

      <div class={'ticker' + (paused ? ' paused' : '')} role="marquee" aria-label="Ringkasan berita terkini">
        <span class="ticker-badge">Terkini</span>
        <div class="ticker-viewport">
          <div class="ticker-track" aria-hidden="false">
            {[0, 1].map((k) => ticks.map((t) => <span class="ticker-item" aria-hidden={k === 1 ? 'true' : undefined}>{t}</span>))}
          </div>
        </div>
        <button class="ticker-toggle" aria-pressed={paused} aria-label={paused ? 'Lanjutkan teks berjalan' : 'Jeda teks berjalan'} onClick={() => setPaused(!paused)}>
          <Icon as={paused ? Play : Pause} size={14} />
        </button>
      </div>

      <div class="cards4">
        {stats.map(([Ico, l, n, sub]) => (
          <div class="stat"><div class="stat-top"><span>{l}</span><span class="stat-icon"><Icon as={Ico} size={16} /></span></div><strong><CountUp value={n} /></strong><p>{sub}</p></div>
        ))}
      </div>

      <div class="grid-main">
        <div class="stack">
          <section class="panel">
            <div class="panel-head"><h2>Rencana mendatang</h2><button class="link" onClick={() => go('planner')}>Lihat semua →</button></div>
            {upcoming.slice(0, 3).length ? upcoming.slice(0, 3).map((p) => (
              <div class="schedule-item"><span class="time">{p.time || '--:--'}</span><div class="details"><strong>{p.title}</strong><p>{dateText(p.date)} · {p.className || p.subject || 'Rencana pribadi'}</p></div><span class="pill lilac">Terencana</span></div>
            )) : <Empty title="Belum ada rencana mendatang" />}
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Jurnal terbaru</h2><button class="link" onClick={() => go('journal')}>Lihat semua →</button></div>
            {recent.length ? recent.map((j) => (
              <div class="schedule-item"><span class="time"><MoodIcon m={j.mood} /></span><div class="details"><strong>{j.title}</strong><p>{excerpt(j.content, 104)}</p></div><span class="label">{dateText(j.date)}</span></div>
            )) : <Empty title="Mulai dengan satu catatan kecil" />}
          </section>
        </div>
        <section class="panel">
          <div class="panel-head"><h2>Daftar tugas</h2><button class="link" onClick={() => go('tasks')}>Lihat semua →</button></div>
          {openTasks.slice(0, 5).length ? openTasks.slice(0, 5).map((t) => <TaskRow t={t} today={today} />) : <Empty title="Semua tugas selesai" />}
        </section>
      </div>
    </>
  );
}
