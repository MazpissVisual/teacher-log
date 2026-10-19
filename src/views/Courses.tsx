import { useDB } from '../store';
import { atom, Empty, go } from '../ui';
import { openSchedule } from '../forms';
import { agendaFor, sortSchedules } from '../agenda';
import { addDays, countdown, dateText, excerpt, todayIn } from '../util';
import { ArrowLeft, Plus } from 'lucide-preact';
import { Icon, MoodIcon } from '../icons';
import { PageHead, PlanCard, ResourceCard, ScheduleRow, TaskRow, SectionTabs } from './shared';

/** The subject currently open on the Mata Kuliah page ('' = the overview). */
const courseAtom = atom('');

export function Courses() {
  const db = useDB();
  const sel = courseAtom.use();
  const today = todayIn(db.profile.tz);

  // Subjects from Settings plus any still referenced by old items, so nothing becomes unreachable.
  const names = [...new Set([
    ...db.subjects,
    ...[...db.journals, ...db.plans, ...db.tasks, ...db.resources, ...db.schedules].map((x) => x.subject).filter(Boolean),
  ])];

  if (sel && names.includes(sel)) return <CourseDetail subject={sel} today={today} />;

  return (
    <>
      <SectionTabs page="courses" />
      <PageHead kicker="Seksi · Mata Kuliah" title="Mata Kuliahku" sub="Satu halaman per mata kuliah: catatan, tugas, jadwal, dan yang masih bingung." action={<button class="btn" onClick={() => openSchedule()}><Icon as={Plus} size={16} /> Jadwal mingguan</button>} />
      {names.length ? (
        <div class="list-grid">
          {names.map((n) => {
            const open = db.tasks.filter((t) => t.subject === n && !t.done).length;
            const notes = db.journals.filter((j) => j.subject === n).length;
            const slots = db.schedules.filter((s) => s.subject === n).length;
            const next = db.plans.filter((p) => p.subject === n && p.kind !== 'kuliah' && p.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
            const cd = next && countdown(next.date, today);
            return (
              <article class="resource-card">
                <h2 class="card-title">{n}</h2>
                <p>{notes} catatan · {open} tugas aktif · {slots} jadwal/minggu</p>
                {next && <p><span class="tag">{next.kind.toUpperCase()}</span> {next.title}{cd ? <> <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span></> : null}</p>}
                <div class="card-actions"><button class="btn sm secondary" onClick={() => { courseAtom.set(n); window.scrollTo({ top: 0 }); }}>Buka ringkasan</button></div>
              </article>
            );
          })}
        </div>
      ) : (
        <div class="panel"><Empty title="Belum ada mata kuliah" action={{ label: 'Isi di pengaturan', run: () => go('settings') }} /></div>
      )}
    </>
  );
}

function CourseDetail({ subject, today }: { subject: string; today: string }) {
  const db = useDB();
  const schedules = sortSchedules(db.schedules.filter((s) => s.subject === subject));
  const events = db.plans.filter((p) => p.subject === subject && p.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const tasks = db.tasks.filter((t) => t.subject === subject).sort((a, b) => Number(a.done) - Number(b.done) || (a.date || '9').localeCompare(b.date || '9'));
  const journals = db.journals.filter((j) => j.subject === subject).sort((a, b) => b.date.localeCompare(a.date));
  const confused = journals.filter((j) => j.improve || j.mood === 'challenging').slice(0, 6);
  const resources = db.resources.filter((r) => r.subject === subject);
  const nextClass = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(today, n)).map((d) => agendaFor(db, d).find((a) => a.subject === subject && a.schedule)).find(Boolean);

  return (
    <>
      <PageHead
        kicker="Mata Kuliah" title={subject}
        sub={nextClass ? `Kuliah berikutnya: ${dateText(nextClass.date)}${nextClass.time ? ' ' + nextClass.time : ''}${nextClass.room ? ' · ' + nextClass.room : ''}` : 'Belum ada jadwal mingguan.'}
        action={<button class="btn secondary" onClick={() => courseAtom.set('')}><Icon as={ArrowLeft} size={16} /> Semua mata kuliah</button>}
      />
      <div class="grid-main">
        <div class="stack">
          <section class="panel">
            <div class="panel-head"><h2>Jadwal mingguan</h2><button class="link" onClick={() => openSchedule(undefined, subject)}>Tambah +</button></div>
            {schedules.length ? schedules.map((s) => <ScheduleRow s={s} />) : <Empty title="Belum ada jadwal mingguan" action={{ label: 'Tambah jadwal', run: () => openSchedule(undefined, subject) }} />}
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Yang masih bingung</h2></div>
            {confused.length ? confused.map((j) => (
              <div class="schedule-item"><span class="time"><MoodIcon m={j.mood} /></span><div class="details"><strong>{j.improve ? excerpt(j.improve, 120) : j.title}</strong><p>{j.topic || j.title}</p></div><span class="label">{dateText(j.date)}</span></div>
            )) : <Empty title="Belum ada catatan yang bingung" />}
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Catatan terbaru</h2><span class="label">{journals.length} total</span></div>
            {journals.slice(0, 5).length ? journals.slice(0, 5).map((j) => (
              <div class="schedule-item"><span class="time"><MoodIcon m={j.mood} /></span><div class="details"><strong>{j.title}</strong><p>{excerpt(j.content, 110)}</p></div><span class="label">{dateText(j.date)}</span></div>
            )) : <Empty title="Belum ada catatan untuk mata kuliah ini" />}
          </section>
        </div>
        <div class="stack">
          <section class="panel">
            <div class="panel-head"><h2>Ujian &amp; deadline</h2></div>
            {events.length ? events.map((p) => <PlanCard p={p} today={today} />) : <Empty title="Tidak ada rencana mendatang" />}
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Tugas</h2><button class="link" onClick={() => go('tasks')}>Semua tugas →</button></div>
            {tasks.length ? tasks.map((t) => <TaskRow t={t} today={today} />) : <Empty title="Belum ada tugas" />}
          </section>
          <section class="panel">
            <div class="panel-head"><h2>Bahan kuliah</h2><button class="link" onClick={() => go('library')}>Perpustakaan →</button></div>
            {resources.length ? <div class="list-grid">{resources.map((r) => <ResourceCard r={r} />)}</div> : <Empty title="Belum ada bahan" />}
          </section>
        </div>
      </div>
    </>
  );
}
