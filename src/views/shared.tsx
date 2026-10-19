import type { ComponentChildren } from 'preact';
import { BookOpen, Dices, ExternalLink, Lightbulb, Link2, Pencil, Pin, PinOff, Trash2, type LucideIcon } from 'lucide-preact';
import { actions, useDB } from '../store';
import { useThesisMenu } from '../features';
import type { Journal, Plan, Resource, Schedule, Task } from '../types';
import { DAY_NAMES, KIND_LABEL } from '../agenda';
import { openJournal, openPlan, openResource, openSchedule, openTask, prioLabel } from '../forms';
import { Icon, MoodIcon } from '../icons';
import { go, removeWithUndo, useLeaving } from '../ui';
import type { Page } from '../types';
import { countdown, dateText, isHttpUrl, moodLabel, tap } from '../util';

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

export function TaskRow({ t, today }: { t: Task; today: string }) {
  const cd = t.done ? null : countdown(t.date, today);
  const leaving = useLeaving(t.id);
  return (
    <div class={`task-row ${t.done ? 'done' : ''} ${leaving ? 'leaving' : ''}`}>
      <input type="checkbox" checked={t.done} aria-label={`Selesaikan: ${t.title}`} onChange={() => { tap(); actions.patch('tasks', t.id, { done: !t.done }); }} />
      <div style="flex:1;min-width:0">
        <div class="task-title">{t.title}</div>
        {t.description && <div class="task-desc">{t.description}</div>}
        <div class="task-meta">
          <span>{dateText(t.date)}</span>
          {t.subject && <span class="tag">{t.subject}</span>}
          <span>Prioritas {prioLabel(t.priority)}</span>
          {cd && <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span>}
        </div>
      </div>
      <button class="link" onClick={() => openTask(t)}>Ubah</button>
      <button class="icon-btn compact" aria-label={`Hapus tugas: ${t.title}`} onClick={() => removeWithUndo('tasks', t, 'Tugas dihapus')}><Icon as={Trash2} size={16} /></button>
    </div>
  );
}

export function JournalCard({ j }: { j: Journal }) {
  const leaving = useLeaving(j.id);
  return (
    <article class={'journal-card' + (leaving ? ' leaving' : '')}>
      <div class="journal-meta">
        <span>{dateText(j.date)}</span>
        <span style="display:inline-flex;align-items:center;gap:6px" title={moodLabel(j.mood)}><MoodIcon m={j.mood} size={16} /> {j.type === 'quick' ? 'Catatan Cepat' : 'Jurnal Lengkap'}</span>
        {j.className && <span class="tag">{j.className}</span>}
        {j.pinned && <span class="tag"><Icon as={Pin} size={12} /> Disematkan</span>}
      </div>
      <h2 class="card-title">{j.title}</h2>
      <p>{j.content}</p>
      {j.worked && <p style="font-size:13px"><strong>Yang berhasil:</strong> {j.worked}</p>}
      <div class="card-actions">
        <button class="btn sm secondary" onClick={() => openJournal(j)}><Icon as={Pencil} size={14} /> Ubah</button>
        <button class="btn sm ghost" onClick={() => actions.patch('journals', j.id, { pinned: !j.pinned })}><Icon as={j.pinned ? PinOff : Pin} size={14} /> {j.pinned ? 'Lepas' : 'Sematkan'}</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('journals', j, 'Jurnal dihapus')}><Icon as={Trash2} size={14} /> Hapus</button>
      </div>
    </article>
  );
}

export function PlanCard({ p, today }: { p: Plan; today: string }) {
  const leaving = useLeaving(p.id);
  const cd = countdown(p.date, today);
  return (
    <article class={'journal-card' + (leaving ? ' leaving' : '')}>
      <div class="journal-meta">
        <span>{dateText(p.date)}{p.time && ` · ${p.time}`}</span>
        <span class="tag">{KIND_LABEL[p.kind]}</span>
        {(p.subject || p.className) && <span class="tag">{p.subject || p.className}</span>}
        {p.kind !== 'kuliah' && cd && <span class={'pill ' + (cd.urgent ? 'peach' : 'lilac')}>{cd.text}</span>}
      </div>
      <h2 class="card-title">{p.title}</h2>
      <p>{p.objective || 'Belum ada target khusus'}</p>
      <div class="card-actions">
        <button class="btn sm secondary" onClick={() => openPlan(p)}><Icon as={Pencil} size={14} /> Ubah</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('plans', p, 'Rencana dihapus')}><Icon as={Trash2} size={14} /> Hapus</button>
      </div>
    </article>
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
