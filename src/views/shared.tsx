import type { ComponentChildren } from 'preact';
import { BookOpen, Dices, ExternalLink, Lightbulb, Link2, Pencil, Pin, PinOff, Trash2, type LucideIcon } from 'lucide-preact';
import { actions } from '../store';
import type { Journal, Plan, Resource, Task } from '../types';
import { openJournal, openPlan, openResource, openTask, prioLabel } from '../forms';
import { Icon, MoodIcon } from '../icons';
import { removeWithUndo, useLeaving } from '../ui';
import { dateText, isHttpUrl, moodLabel } from '../util';

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
  const overdue = !t.done && t.date && t.date < today;
  const leaving = useLeaving(t.id);
  return (
    <div class={`task-row ${t.done ? 'done' : ''} ${leaving ? 'leaving' : ''}`}>
      <input type="checkbox" checked={t.done} aria-label={`Selesaikan: ${t.title}`} onChange={() => actions.patch('tasks', t.id, { done: !t.done })} />
      <div style="flex:1;min-width:0">
        <div class="task-title">{t.title}</div>
        <div class="task-meta">
          <span>{dateText(t.date)}</span>
          <span>· Prioritas {prioLabel(t.priority)}</span>
          {overdue && <span class="pill peach">Terlambat</span>}
        </div>
      </div>
      <button class="link" onClick={() => openTask(t)}>Ubah</button>
      <button class="icon-btn" style="width:36px;height:36px" aria-label={`Hapus tugas: ${t.title}`} onClick={() => removeWithUndo('tasks', t, 'Tugas dihapus')}><Icon as={Trash2} size={16} /></button>
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
      <h3>{j.title}</h3>
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

export function PlanCard({ p }: { p: Plan }) {
  const leaving = useLeaving(p.id);
  return (
    <article class={'journal-card' + (leaving ? ' leaving' : '')}>
      <div class="journal-meta"><span>{dateText(p.date)}{p.time && ` · ${p.time}`}</span><span class="tag">{p.className || 'Pribadi'}</span></div>
      <h3>{p.title}</h3>
      <p>{p.objective || 'Belum ada tujuan khusus'}</p>
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
      <span class="tag" style="width:max-content">{r.type}</span>
      <h3>{r.title}</h3>
      <p>{r.description}</p>
      <div class="card-actions">
        {r.url && isHttpUrl(r.url) && <a class="btn sm secondary" href={r.url} target="_blank" rel="noopener noreferrer">Buka <Icon as={ExternalLink} size={14} /></a>}
        <button class="btn sm secondary" onClick={() => openResource(r)}><Icon as={Pencil} size={14} /> Ubah</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('resources', r, 'Sumber dihapus')}><Icon as={Trash2} size={14} /> Hapus</button>
      </div>
    </article>
  );
}
