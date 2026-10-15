import { useState } from 'preact/hooks';
import { useDB } from '../store';
import { openPlan } from '../forms';
import { Empty } from '../ui';
import { excerpt, todayIn } from '../util';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-preact';
import { Icon } from '../icons';
import { PageHead, PlanCard } from './shared';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function Planner() {
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
      <PageHead kicker="Seksi · Perencana" title="Perencana Mengajar" sub="Rencanakan minggumu, satu langkah pada satu waktu." action={<button class="btn" onClick={() => openPlan()}><Icon as={Plus} size={16} /> Rencana baru</button>} />
      <div class="grid-main">
        <div class="panel">
          <div class="panel-head">
            <h2>{title}</h2>
            <div class="compact-actions">
              <button class="btn sm secondary" disabled={y === ty && m === tm - 1} onClick={() => setCursor({ y: ty, m: tm - 1 })}>Hari ini</button>
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
              const dayPlans = db.plans.filter((p) => p.date === key);
              return (
                <button class={`day cell ${key === today ? 'today' : ''}`} aria-label={`${d} ${title}${dayPlans.length ? `, ${dayPlans.length} rencana` : ''}. Tambah rencana`} onClick={() => openPlan(undefined, key)}>
                  <strong>{d}</strong>
                  {dayPlans.slice(0, 2).map((x) => <span class="dot" title={x.title}>{excerpt(x.title, 9)}</span>)}
                  {dayPlans.length > 2 && <span class="dot more">+{dayPlans.length - 2}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h2>Rencana pembelajaran</h2><button class="link" onClick={() => openPlan()}>Tambah +</button></div>
          {plans.length ? plans.map((p) => <PlanCard p={p} />) : <Empty title="Belum ada rencana pembelajaran" action={db.plans.length === 0 ? { label: 'Buat rencana pertama', run: () => openPlan() } : undefined} />}
        </div>
      </div>
    </>
  );
}
