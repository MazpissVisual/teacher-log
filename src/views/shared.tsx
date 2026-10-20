import type { ComponentChildren } from 'preact';
import { BookOpen, ChevronRight, Dices, ExternalLink, Lightbulb, Link2, Pencil, Pin, PinOff, Trash2, type LucideIcon } from 'lucide-preact';
import { actions, useDB } from '../store';
import { useThesisMenu } from '../features';
import type { Journal, Plan, Resource, Schedule, Task } from '../types';
import { DAY_NAMES, KIND_LABEL } from '../agenda';
import { openJournal, openPlan, openResource, openSchedule, openTask, prioLabel } from '../forms';
import { Icon, MoodIcon } from '../icons';
import { closeModal, go, openModal, removeWithUndo, useLeaving } from '../ui';
import type { Page } from '../types';
import { countdown, dateShort, dateText, isHttpUrl, moodLabel, tap } from '../util';

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

function TaskDetail({ t, today }: { t: Task; today: string }) {
  const cd = t.done ? null : countdown(t.date, today);
  return (
    <div>
      <dl class="detail-list">
        <dt>Tenggat</dt><dd>{dateText(t.date)}{cd && <> <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span></>}</dd>
        {t.subject && <><dt>Mata kuliah</dt><dd>{t.subject}</dd></>}
        <dt>Prioritas</dt><dd>{prioLabel(t.priority)}</dd>
        <dt>Status</dt><dd>{t.done ? 'Selesai' : 'Belum selesai'}</dd>
      </dl>
      {t.description ? <p class="task-desc" style="margin-bottom:20px">{t.description}</p> : <p class="muted small" style="margin-bottom:20px">Tidak ada deskripsi.</p>}
      <div class="compact-actions">
        <button class="btn" onClick={() => openTask(t)}><Icon as={Pencil} size={16} /> Ubah</button>
        <button class="btn secondary" onClick={() => { tap(); actions.patch('tasks', t.id, { done: !t.done }); closeModal(); }}>{t.done ? 'Batalkan selesai' : 'Tandai selesai'}</button>
        <button class="btn danger" onClick={() => { closeModal(); removeWithUndo('tasks', t, 'Tugas dihapus'); }}><Icon as={Trash2} size={16} /> Hapus</button>
      </div>
    </div>
  );
}

/** One compact line per task; tapping it opens the full details (description, edit, delete) in a dialog. */
export function TaskRow({ t, today }: { t: Task; today: string }) {
  const cd = t.done ? null : countdown(t.date, today);
  const leaving = useLeaving(t.id);
  return (
    <div class={`task-row ${t.done ? 'done' : ''} ${leaving ? 'leaving' : ''}`}>
      <input type="checkbox" checked={t.done} aria-label={`Selesaikan: ${t.title}`} onChange={() => { tap(); actions.patch('tasks', t.id, { done: !t.done }); }} />
      <button class="task-main" aria-label={`Lihat detail: ${t.title}`} onClick={() => openModal(t.title, <TaskDetail t={t} today={today} />)}>
        <span class="task-title">{t.title}</span>
        <span class="task-meta">
          <span>{dateShort(t.date)}</span>
          {t.subject && <span class="tag">{t.subject}</span>}
          {t.priority === 'high' && !t.done && <span class="tag">Penting</span>}
          {cd && <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span>}
        </span>
      </button>
      <Icon as={ChevronRight} size={16} class="task-chev" />
    </div>
  );
}

function JournalDetail({ j }: { j: Journal }) {
  return (
    <div>
      <dl class="detail-list">
        <dt>Tanggal</dt><dd>{dateText(j.date)}</dd>
        <dt>Jenis</dt><dd>{j.type === 'quick' ? 'Catatan cepat' : 'Jurnal lengkap'}</dd>
        <dt>Pemahaman</dt><dd><span style="display:inline-flex;align-items:center;gap:6px"><MoodIcon m={j.mood} size={16} /> {moodLabel(j.mood)}</span></dd>
        {j.subject && <><dt>Mata kuliah</dt><dd>{j.subject}</dd></>}
        {j.className && <><dt>Semester</dt><dd>{j.className}</dd></>}
        {j.topic && <><dt>Topik</dt><dd>{j.topic}</dd></>}
      </dl>
      <p class="task-desc" style="margin-bottom:16px">{j.content}</p>
      {j.worked && <><span class="label">Yang sudah paham</span><p class="task-desc" style="margin:4px 0 16px">{j.worked}</p></>}
      {j.improve && <><span class="label">Yang masih bingung</span><p class="task-desc" style="margin:4px 0 16px">{j.improve}</p></>}
      <div class="compact-actions">
        <button class="btn" onClick={() => openJournal(j)}><Icon as={Pencil} size={16} /> Ubah</button>
        <button class="btn secondary" onClick={() => { actions.patch('journals', j.id, { pinned: !j.pinned }); closeModal(); }}><Icon as={j.pinned ? PinOff : Pin} size={16} /> {j.pinned ? 'Lepas sematan' : 'Sematkan'}</button>
        <button class="btn danger" onClick={() => { closeModal(); removeWithUndo('journals', j, 'Jurnal dihapus'); }}><Icon as={Trash2} size={16} /> Hapus</button>
      </div>
    </div>
  );
}

/** One compact entry per journal; tapping it opens the full note in a dialog (same pattern as tasks and plans). */
export function JournalCard({ j }: { j: Journal }) {
  const leaving = useLeaving(j.id);
  return (
    <div class={'task-row' + (leaving ? ' leaving' : '')}>
      <button class="task-main" aria-label={`Buka jurnal: ${j.title}`} onClick={() => openModal(j.title, <JournalDetail j={j} />)}>
        <span class="task-title">{j.pinned && <Icon as={Pin} size={13} class="pin-mark" />}{j.title}</span>
        <span class="task-meta">
          <span>{dateShort(j.date)}</span>
          <span style="display:inline-flex;align-items:center;gap:4px"><MoodIcon m={j.mood} size={14} /> {moodLabel(j.mood)}</span>
          {(j.subject || j.className) && <span class="tag">{j.subject || j.className}</span>}
        </span>
        <span class="task-excerpt">{j.content}</span>
      </button>
      <Icon as={ChevronRight} size={16} class="task-chev" />
    </div>
  );
}

function PlanDetail({ p, today }: { p: Plan; today: string }) {
  const cd = p.kind === 'kuliah' ? null : countdown(p.date, today);
  return (
    <div>
      <dl class="detail-list">
        <dt>Jenis</dt><dd>{KIND_LABEL[p.kind]}</dd>
        <dt>Waktu</dt><dd>{dateText(p.date)}{p.time && ` · ${p.time}`}{cd && <> <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span></>}</dd>
        {p.subject && <><dt>Mata kuliah</dt><dd>{p.subject}</dd></>}
        {p.className && <><dt>Semester</dt><dd>{p.className}</dd></>}
      </dl>
      {p.objective && <><span class="label">Target belajar</span><p class="task-desc" style="margin:4px 0 16px">{p.objective}</p></>}
      {p.activities && <><span class="label">Rencana kegiatan</span><p class="task-desc" style="margin:4px 0 16px">{p.activities}</p></>}
      {!p.objective && !p.activities && <p class="muted small" style="margin-bottom:20px">Belum ada target atau rencana kegiatan.</p>}
      <div class="compact-actions">
        <button class="btn" onClick={() => openPlan(p)}><Icon as={Pencil} size={16} /> Ubah</button>
        <button class="btn danger" onClick={() => { closeModal(); removeWithUndo('plans', p, 'Rencana dihapus'); }}><Icon as={Trash2} size={16} /> Hapus</button>
      </div>
    </div>
  );
}

/** One compact line per plan; tapping it opens the full details in a dialog (same pattern as tasks). */
export function PlanCard({ p, today }: { p: Plan; today: string }) {
  const leaving = useLeaving(p.id);
  const cd = p.kind === 'kuliah' ? null : countdown(p.date, today);
  return (
    <div class={'task-row' + (leaving ? ' leaving' : '')}>
      <button class="task-main" aria-label={`Lihat detail: ${p.title}`} onClick={() => openModal(p.title, <PlanDetail p={p} today={today} />)}>
        <span class="task-title">{p.title}</span>
        <span class="task-meta">
          <span>{dateShort(p.date)}{p.time && ` · ${p.time}`}</span>
          <span class="tag">{KIND_LABEL[p.kind]}</span>
          {(p.subject || p.className) && <span class="tag">{p.subject || p.className}</span>}
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
      <span class="tag" style="width:max-content">{r.type}{r.subject ? ' · ' + r.subject : ''}</span>
      <h2 class="card-title">{r.title}</h2>
      <p>{r.description}</p>
      <div class="card-actions">
        {r.url && isHttpUrl(r.url) && <a class="btn sm secondary" href={r.url} target="_blank" rel="noopener noreferrer">Buka <Icon as={ExternalLink} size={14} /></a>}
        <button class="btn sm secondary" onClick={() => openResource(r)}><Icon as={Pencil} size={14} /> Ubah</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('resources', r, 'Sumber dihapus')}><Icon as={Trash2} size={14} /> Hapus</button>
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
        <strong>{s.subject || 'Kuliah'}</strong>
        <p>{DAY_NAMES[s.day]}{s.end ? ` · ${s.start}–${s.end}` : ''}{s.room ? ` · ${s.room}` : ''}{s.until ? ` · sampai ${dateText(s.until)}` : ''}</p>
      </div>
      <button class="link" onClick={() => openSchedule(s)}>Ubah</button>
      <button class="icon-btn compact" aria-label={`Hapus jadwal: ${s.subject}`} onClick={() => removeWithUndo('schedules', s, 'Jadwal dihapus')}><Icon as={Trash2} size={16} /></button>
    </div>
  );
}

/** Pages that share one menu entry; each is still its own URL so links and the back button keep working. */
export const GROUPS: Page[][] = [['journal', 'journey'], ['planner', 'tasks'], ['courses', 'thesis']];
const TAB_LABEL: Partial<Record<Page, string>> = { journal: 'Catatan', journey: 'Perjalanan', planner: 'Kalender', tasks: 'Tugas', courses: 'Mata kuliah', thesis: 'Tesis' };
export function SectionTabs({ page }: { page: Page }) {
  const db = useDB();
  const thesis = useThesisMenu(db);
  const group = GROUPS.find((g) => g.includes(page))?.filter((p) => p !== 'thesis' || thesis.shown || page === 'thesis');
  if (!group || group.length < 2) return null; // a lone tab is just noise
  return (
    <div class="tabs section-tabs" role="tablist" aria-label="Bagian">
      {group.map((p) => <button role="tab" aria-selected={p === page} class={`tab ${p === page ? 'active' : ''}`} onClick={() => go(p)}>{TAB_LABEL[p]}</button>)}
    </div>
  );
}
