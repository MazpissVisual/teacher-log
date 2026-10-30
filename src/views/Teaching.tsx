import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openPlan, openSchedule } from '../forms';
import { agendaFor, KIND_LABEL, sortSchedules } from '../agenda';
import { Empty, openModal } from '../ui';
import { excerpt, todayIn } from '../util';
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from 'lucide-preact';
import { Icon } from '../icons';
import { PageHead, PlanCard, ScheduleRow } from './shared';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** Everything on one day: weekly lessons and one-off plans. Opens when a calendar cell is tapped. */
function DayDialog({ date }: { date: string }) {
  const db = useDB();
  const today = todayIn(db.profile.tz);
  const items = agendaFor(db, date);
  return (
    <div>
      {items.length ? items.map((a) => {
        if (a.plan) return <PlanCard p={a.plan} today={today} />;
        const sc = a.schedule!;
        return (
          <div class="schedule-item">
            <span class="time">{a.time || '--:--'}</span>
            <div class="details"><strong>{a.title}</strong><p>{[a.end && `${a.time}–${a.end}`, a.room].filter(Boolean).join(' · ') || 'Jadwal mingguan'}</p></div>
            <button class="link" onClick={() => openSchedule(sc)}>Ubah</button>
          </div>
        );
      }) : <p class="muted" style="margin-bottom:16px">Tidak ada kegiatan di hari ini.</p>}
      <button class="btn" style="width:100%;justify-content:center;margin-top:12px" onClick={() => openPlan(undefined, date)}><Icon as={Plus} size={16} /> Tambah rencana</button>
    </div>
  );
}
const openDay = (date: string) => openModal(new Date(date + 'T12:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), <DayDialog date={date} />);

export function Teaching() {
  const db = useDB();
  const today = todayIn(db.profile.tz);
  const [ty, tm] = today.split('-').map(Number);
  const [cursor, setCursor] = useState({ y: ty, m: tm - 1 });

  const move = (d: number) => setCursor(({ y, m }) => {
    const n = m + d;
    return n < 0 ? { y: y - 1, m: 11 } : n > 11 ? { y: y + 1, m: 0 } : { y, m: n };
  });

  const { y, m } = cursor;
  const days = new Date(y, m + 1, 0).getDate();
  const start = new Date(y, m, 1).getDay();
  const title = new Date(y, m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const plans = [...db.plans].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHead kicker="Seksi · Mengajar" title="Mengajar" sub="Jadwal mingguan, ulangan, dan tugas dalam satu kalender." action={<div class="compact-actions"><button class="btn secondary" onClick={() => openSchedule()}><Icon as={Plus} size={16} /> Jadwal mingguan</button><button class="btn" onClick={() => openPlan()}><Icon as={Plus} size={16} /> Rencana baru</button></div>} />
      <div class="grid-main">
        <div class="panel">
          <div class="panel-head cal-head">
            <h2>{title}</h2>
            <div class="compact-actions">
              <button class="btn sm secondary" disabled={y === ty && m === tm - 1} aria-label="Ke bulan ini" onClick={() => setCursor({ y: ty, m: tm - 1 })}><Icon as={CalendarCheck} size={16} /><span class="hide-sm">Hari ini</span></button>
              <button class="btn sm secondary" aria-label="Bulan sebelumnya" onClick={() => move(-1)}><Icon as={ChevronLeft} size={16} /></button>
              <button class="btn sm secondary" aria-label="Bulan berikutnya" onClick={() => move(1)}><Icon as={ChevronRight} size={16} /></button>
            </div>
          </div>
          <div class="calendar">
            {DAYS.map((n) => <div class="day head">{n}</div>)}
            {Array.from({ length: start }, () => <div class="day pad" aria-hidden="true" />)}
            {Array.from({ length: days }, (_, i) => {
              const d = i + 1;
              const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dayPlans = agendaFor(db, key);
              return (
                <button class={`day cell ${key === today ? 'today' : ''}`} onClick={() => openDay(key)}>
                  <strong>{d}</strong>
                  <span class="chips" aria-hidden="true">
                    {dayPlans.slice(0, 2).map((x) => <span class="dot">{x.kind !== 'pelajaran' ? KIND_LABEL[x.kind] + ' ' : ''}{excerpt(x.title, 9)}</span>)}
                    {dayPlans.length > 2 && <span class="dot more">+{dayPlans.length - 2}</span>}
                  </span>
                  <span class="pips" aria-hidden="true">
                    {dayPlans.slice(0, 3).map((x) => <i class={'pip' + (x.kind === 'ulangan' || x.kind === 'tugas' ? ' exam' : '')} />)}
                    {dayPlans.length > 3 && <span class="pip-more">+{dayPlans.length - 3}</span>}
                  </span>
                  <span class="sr-only">{dayPlans.length ? dayPlans.map((x) => (x.kind !== 'pelajaran' ? KIND_LABEL[x.kind] + ' ' : '') + x.title).join(', ') + '. ' : 'Tidak ada kegiatan. '}Buka hari ini</span>
                </button>
              );
            })}
          </div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="panel-head"><h2>Jadwal mingguan</h2><button class="link" onClick={() => openSchedule()}>Tambah +</button></div>
            {db.schedules.length ? sortSchedules(db.schedules).map((s) => <ScheduleRow s={s} />) : <Empty title="Belum ada jadwal mingguan" action={{ label: 'Tambah jadwal mengajar', run: () => openSchedule() }} />}
          </div>
          <div class="panel">
            <div class="panel-head"><h2>Rencana</h2><button class="link" onClick={() => openPlan()}>Tambah +</button></div>
            {plans.length ? plans.map((p) => <PlanCard p={p} today={today} />) : <Empty title="Belum ada rencana" action={{ label: 'Buat rencana pertama', run: () => openPlan() }} />}
          </div>
        </div>
      </div>
    </>
  );
}
