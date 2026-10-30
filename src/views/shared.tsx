import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Markdown } from '../Markdown';
import { toggleTask } from '../mdparse';
import { BookOpen, ChevronRight, Dices, ExternalLink, Lightbulb, Link2, Pencil, Trash2, type LucideIcon } from 'lucide-preact';
import { actions } from '../store';
import type { Journal, Plan, Resource, Schedule } from '../types';
import { DAY_NAMES, KIND_LABEL } from '../agenda';
import { openJournal, openPlan, openResource, openSchedule } from '../forms';
import { Icon } from '../icons';
import { closeModal, openModal, removeWithUndo, useLeaving } from '../ui';
import { countdown, dateShort, dateText, isHttpUrl, tap } from '../util';

export function PageHead({ kicker, title, sub, action }: { kicker: string; title: string; sub: string; action?: ComponentChildren }) {
  return (
    <div class="welcome">
      <div>
        <span class="kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {action}
    </div>
  );
}

/** Ticking a checkbox in the note saves straight away. */
function NoteBody({ j }: { j: Journal }) {
  const [text, setText] = useState(j.content);
  return (
    <Markdown text={text} onToggleTask={(line) => {
      const next = toggleTask(text, line);
      setText(next);
      actions.patch('journals', j.id, { content: next });
    }} />
  );
}

function JournalDetail({ j }: { j: Journal }) {
  return (
    <div>
      <dl class="detail-list">
        <dt>Tanggal</dt><dd>{dateText(j.date)}</dd>
        {j.className && <><dt>Kelas</dt><dd>{j.className}</dd></>}
      </dl>
      <div style="margin-bottom:16px"><NoteBody j={j} /></div>
      <div class="compact-actions dialog-actions">
        <button class="btn" onClick={() => openJournal(j)}><Icon as={Pencil} size={16} /> Ubah</button>
        <button class="btn danger" onClick={() => { closeModal(); removeWithUndo('journals', j, 'Jurnal dihapus'); }}><Icon as={Trash2} size={16} /> Hapus</button>
      </div>
    </div>
  );
}

/** One compact entry per journal; tapping it opens the full note in a dialog. */
export function JournalCard({ j }: { j: Journal }) {
  const leaving = useLeaving(j.id);
  return (
    <div class={'task-row' + (leaving ? ' leaving' : '')}>
      <button class="task-main" aria-label={`Buka jurnal: ${j.title}`} onClick={() => openModal(j.title, <JournalDetail j={j} />)}>
        <span class="task-title">{j.title}</span>
        <span class="task-meta">
          <span>{dateShort(j.date)}</span>
          {j.className && <span class="tag">{j.className}</span>}
        </span>
      </button>
      <Icon as={ChevronRight} size={16} class="task-chev" />
    </div>
  );
}

/** Deadline pill for assignments and tests; ordinary lessons and finished assignments have none. */
const planCountdown = (p: Plan, today: string) => (p.kind === 'pelajaran' || p.kind === 'lainnya' || p.done ? null : countdown(p.date, today));

function PlanDetail({ p, today }: { p: Plan; today: string }) {
  const cd = planCountdown(p, today);
  return (
    <div>
      <dl class="detail-list">
        <dt>Jenis</dt><dd>{KIND_LABEL[p.kind]}</dd>
        <dt>Waktu</dt><dd>{dateText(p.date)}{p.time && ` · ${p.time}`}{cd && <> <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span></>}</dd>
        {p.className && <><dt>Kelas</dt><dd>{p.className}</dd></>}
        {p.kind === 'tugas' && <><dt>Status</dt><dd>{p.done ? 'Selesai' : 'Belum selesai'}</dd></>}
      </dl>
      {p.notes ? <p class="task-desc" style="margin-bottom:20px">{p.notes}</p> : <p class="muted small" style="margin-bottom:20px">Belum ada catatan.</p>}
      <div class="compact-actions dialog-actions">
        <button class="btn" onClick={() => openPlan(p)}><Icon as={Pencil} size={16} /> Ubah</button>
        {p.kind === 'tugas' && <button class="btn secondary" onClick={() => { tap(); actions.patch('plans', p.id, { done: !p.done }); closeModal(); }}>{p.done ? 'Batalkan selesai' : 'Tandai selesai'}</button>}
        <button class="btn danger" onClick={() => { closeModal(); removeWithUndo('plans', p, 'Rencana dihapus'); }}><Icon as={Trash2} size={16} /> Hapus</button>
      </div>
    </div>
  );
}

/** One compact line per plan; tapping it opens the details in a dialog. Assignments get a checkbox. */
export function PlanCard({ p, today }: { p: Plan; today: string }) {
  const leaving = useLeaving(p.id);
  const cd = planCountdown(p, today);
  return (
    <div class={`task-row ${p.done ? 'done' : ''} ${leaving ? 'leaving' : ''}`}>
      {p.kind === 'tugas' && <input type="checkbox" checked={p.done} aria-label={`Selesaikan: ${p.title}`} onChange={() => { tap(); actions.patch('plans', p.id, { done: !p.done }); }} />}
      <button class="task-main" aria-label={`Lihat detail: ${p.title}`} onClick={() => openModal(p.title, <PlanDetail p={p} today={today} />)}>
        <span class="task-title">{p.title}</span>
        <span class="task-meta">
          <span>{dateShort(p.date)}{p.time && ` · ${p.time}`}</span>
          <span class="tag">{KIND_LABEL[p.kind]}</span>
          {p.className && <span class="tag">{p.className}</span>}
          {cd && <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span>}
        </span>
      </button>
      <Icon as={ChevronRight} size={16} class="task-chev" />
    </div>
  );
}

const RICON: Record<string, LucideIcon> = { Materi: BookOpen, Ide: Lightbulb, Link: Link2, Aktivitas: Dices };
export function ResourceCard({ r }: { r: Resource }) {
  const leaving = useLeaving(r.id);
  return (
    <article class={'resource-card' + (leaving ? ' leaving' : '')}>
      <span class="resource-icon"><Icon as={RICON[r.type] ?? BookOpen} size={20} /></span>
      <span class="tag" style="width:max-content">{r.type}{r.className ? ' · ' + r.className : ''}</span>
      <h2 class="card-title">{r.title}</h2>
      {r.description && <p>{r.description}</p>}
      <div class="card-actions">
        {r.url && isHttpUrl(r.url) && <a class="btn sm secondary" href={r.url} target="_blank" rel="noopener noreferrer">Buka <Icon as={ExternalLink} size={14} /></a>}
        <button class="btn sm secondary" onClick={() => openResource(r)}><Icon as={Pencil} size={14} /> Ubah</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('resources', r, 'Bahan dihapus')}><Icon as={Trash2} size={14} /> Hapus</button>
      </div>
    </article>
  );
}

export function ScheduleRow({ s }: { s: Schedule }) {
  const leaving = useLeaving(s.id);
  return (
    <div class={'schedule-item' + (leaving ? ' leaving' : '')}>
      <span class="time">{s.start || '--:--'}</span>
      <div class="details">
        <strong>{s.className || 'Mengajar'}</strong>
        <p>{DAY_NAMES[s.day]}{s.end ? ` · ${s.start}–${s.end}` : ''}{s.room ? ` · ${s.room}` : ''}{s.until ? ` · sampai ${dateText(s.until)}` : ''}</p>
      </div>
      <button class="link" onClick={() => openSchedule(s)}>Ubah</button>
      <button class="icon-btn compact" aria-label={`Hapus jadwal: ${s.className}`} onClick={() => removeWithUndo('schedules', s, 'Jadwal dihapus')}><Icon as={Trash2} size={16} /></button>
    </div>
  );
}
