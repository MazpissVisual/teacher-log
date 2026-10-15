import { actions } from '../store';
import type { Journal, Plan, Resource, Task } from '../types';
import { openJournal, openPlan, openResource, openTask, prioLabel } from '../forms';
import { removeWithUndo } from '../ui';
import { dateText, isHttpUrl, moodIcon, moodLabel } from '../util';

export function PageHead({ title, sub, action }: { title: string; sub: string; action?: preact.ComponentChildren }) {
  return (
    <div class="welcome">
      <div><h1>{title}</h1><p>{sub}</p></div>
      {action}
    </div>
  );
}

export function TaskRow({ t, today }: { t: Task; today: string }) {
  const overdue = !t.done && t.date && t.date < today;
  return (
    <div class={`task-row ${t.done ? 'done' : ''}`}>
      <input type="checkbox" checked={t.done} aria-label={`Selesaikan: ${t.title}`} onChange={() => actions.patch('tasks', t.id, { done: !t.done })} />
      <div style="flex:1">
        <div class="task-title">{t.title}</div>
        <div class="task-meta">
          📅 {dateText(t.date)} · Prioritas {prioLabel(t.priority).toLowerCase()}
          {overdue && <span class="pill peach" style="margin-left:8px">Terlambat</span>}
        </div>
      </div>
      <button class="link" onClick={() => openTask(t)}>Ubah</button>
      <button class="link" style="color:#b23a4f" aria-label={`Hapus tugas: ${t.title}`} onClick={() => removeWithUndo('tasks', t, 'Tugas dihapus')}>×</button>
    </div>
  );
}

export function JournalCard({ j }: { j: Journal }) {
  return (
    <div class="journal-card">
      <div class="journal-meta">
        <span>{dateText(j.date)}</span><span aria-hidden="true">•</span>
        <span>{moodIcon(j.mood)} {j.type === 'quick' ? 'Catatan Cepat' : 'Jurnal Lengkap'}</span>
        {j.className && <span class="tag">{j.className}</span>}
        {j.pinned && <span class="tag">📌 Disematkan</span>}
      </div>
      <h3>{j.title}</h3>
      <p>{j.content}</p>
      {j.worked && <p style="font-size:12px"><strong>Yang berhasil:</strong> {j.worked}</p>}
      <div class="card-actions">
        <button class="btn sm ghost" onClick={() => openJournal(j)}>✎ Ubah</button>
        <button class="btn sm secondary" onClick={() => actions.patch('journals', j.id, { pinned: !j.pinned })}>{j.pinned ? 'Lepas sematan' : '📌 Sematkan'}</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('journals', j, 'Jurnal dihapus')}>Hapus</button>
      </div>
    </div>
  );
}

export function PlanCard({ p }: { p: Plan }) {
  return (
    <div class="journal-card">
      <div class="journal-meta"><span>📅 {dateText(p.date)}{p.time && ` · ${p.time}`}</span><span class="tag">{p.className || 'Pribadi'}</span></div>
      <h3>{p.title}</h3>
      <p>{p.objective || 'Belum ada tujuan khusus'}</p>
      <div class="card-actions">
        <button class="btn sm ghost" onClick={() => openPlan(p)}>Ubah</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('plans', p, 'Rencana dihapus')}>Hapus</button>
      </div>
    </div>
  );
}

const RICON: Record<string, string> = { Materi: '📚', Ide: '💡', Link: '🔗', Aktivitas: '🎲' };
export function ResourceCard({ r }: { r: Resource }) {
  return (
    <div class="resource-card">
      <span class="resource-icon" aria-hidden="true">{RICON[r.type] ?? '📎'}</span>
      <span class="tag" style="width:max-content">{r.type}</span>
      <h3>{r.title}</h3>
      <p>{r.description}</p>
      <div class="card-actions">
        {r.url && isHttpUrl(r.url) && <a class="btn sm ghost" href={r.url} target="_blank" rel="noopener noreferrer" style="text-decoration:none">Buka tautan ↗</a>}
        <button class="btn sm secondary" onClick={() => openResource(r)}>Ubah</button>
        <button class="btn sm danger" onClick={() => removeWithUndo('resources', r, 'Sumber dihapus')}>Hapus</button>
      </div>
    </div>
  );
}

export { moodLabel };
