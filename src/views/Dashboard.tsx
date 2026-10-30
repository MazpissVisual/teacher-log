import { Plus } from 'lucide-preact';
import { useDB } from '../store';
import { openJournal } from '../forms';
import { Icon } from '../icons';
import { Empty, go } from '../ui';
import { hourIn, todayIn } from '../util';
import { agendaFor, KIND_LABEL } from '../agenda';
import { JournalCard, PlanCard } from './shared';

export function Dashboard() {
  const db = useDB();
  const tz = db.profile.tz;
  const today = todayIn(tz);
  const h = hourIn(tz);
  const greet = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';

  const agenda = agendaFor(db, today);
  // Upcoming tests and assignments matter more here than ordinary lessons, which the agenda already lists.
  const upcoming = db.plans.filter((p) => p.date >= today && p.kind !== 'pelajaran' && !p.done).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 4);
  const recent = [...db.journals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const overdue = db.plans.filter((p) => p.kind === 'tugas' && !p.done && p.date && p.date < today).length;

  return (
    <>
      <section class="lead" aria-labelledby="lead-title">
        <div class="lead-main">
          <span class="kicker">Laporan utama</span>
          <h1 id="lead-title">{greet}, {db.profile.name}.</h1>
          <p class="lead-deck">
            Catat jalannya kelas, rencana, dan tindak lanjutmu.
            {agenda.length ? ` Hari ini ada ${agenda.length} agenda.` : ''}
            {overdue ? ` ${overdue} tugas sudah lewat tenggat.` : ''}
          </p>
          <div class="compact-actions hero-actions" style="margin-top:20px">
            <button class="btn" onClick={() => openJournal()}><Icon as={Plus} size={16} /> Tulis jurnal</button>
            <button class="btn secondary" onClick={() => go('mengajar')}>Buka jadwal</button>
          </div>
        </div>
        <aside class={'lead-side' + (agenda.length ? '' : ' is-empty')} aria-labelledby="today-title">
          <h2 id="today-title">Agenda hari ini</h2>
          {agenda.length ? agenda.map((a) => (
            <div class="schedule-item"><span class="time">{a.time || '--:--'}</span><div class="details"><strong>{a.title}</strong><p>{[a.kind !== 'pelajaran' ? KIND_LABEL[a.kind] : '', a.room, a.plan ? a.className : ''].filter(Boolean).join(' · ') || 'Jadwal mengajar'}</p></div></div>
          )) : <p class="muted" style="font-style:italic">Tidak ada agenda hari ini.</p>}
        </aside>
      </section>

      <div class="grid-main">
        <section class="panel">
          <div class="panel-head"><h2>Ulangan &amp; tugas</h2><button class="link" onClick={() => go('mengajar')}>Lihat semua →</button></div>
          {upcoming.length ? upcoming.map((p) => <PlanCard p={p} today={today} />) : <Empty title="Belum ada ulangan atau tugas" />}
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Jurnal terbaru</h2><button class="link" onClick={() => go('journal')}>Lihat semua →</button></div>
          {recent.length ? recent.map((j) => <JournalCard j={j} />) : <Empty title="Mulai dengan satu catatan kecil" action={{ label: 'Tulis jurnal pertama', run: () => openJournal() }} />}
        </section>
      </div>
    </>
  );
}
