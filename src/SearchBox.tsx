import { useState } from 'preact/hooks';
import { Search as SearchIcon } from 'lucide-preact';
import { useDB } from './store';
import { go, searchAtom } from './ui';
import { openJournal, openPlan, openResource, openTask } from './forms';
import { Icon } from './icons';

const MIN = 3;
const MAX = 5;
type Hit = { kind: string; title: string; open: () => void };

// Autosuggest: after MIN characters, shows up to MAX matches in a dropdown (↑ ↓ Enter / Esc).
export function SearchBox() {
  const db = useDB();
  const query = searchAtom.use();
  const [focus, setFocus] = useState(false);
  const [idx, setIdx] = useState(-1);
  const q = query.trim().toLowerCase();
  const m = (...f: string[]) => f.join(' ').toLowerCase().includes(q);

  const hits: Hit[] = q.length < MIN ? [] : [
    ...db.journals.filter((j) => m(j.title, j.content, j.topic, j.worked, j.improve)).map((j): Hit => ({ kind: 'Jurnal', title: j.title || j.topic || 'Tanpa judul', open: () => openJournal(j) })),
    ...db.plans.filter((p) => m(p.title, p.objective, p.activities)).map((p): Hit => ({ kind: 'Rencana', title: p.title, open: () => openPlan(p) })),
    ...db.resources.filter((r) => m(r.title, r.description)).map((r): Hit => ({ kind: 'Sumber', title: r.title, open: () => openResource(r) })),
    ...db.tasks.filter((t) => m(t.title, t.description ?? '')).map((t): Hit => ({ kind: 'Tugas', title: t.title, open: () => openTask(t) })),
  ].slice(0, MAX);
  const show = focus && q.length >= MIN;

  const pick = (h: Hit) => { setFocus(false); setIdx(-1); h.open(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setFocus(false); return; }
    if (!show || !hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((idx + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((idx - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(hits[idx]); }
  };
  const submit = (e: Event) => { e.preventDefault(); if (q) { setFocus(false); go('search'); } };

  return (
    <form class="searchbar" role="search" onSubmit={submit}>
      <Icon as={SearchIcon} size={16} />
      <input
        type="search" placeholder="Cari jurnal, rencana, sumber…" aria-label="Cari di aplikasi" autocomplete="off"
        {...({ role: "combobox" } as object)} aria-expanded={show} aria-controls="suggest-list" aria-autocomplete="list"
        value={query}
        onInput={(e) => { searchAtom.set(e.currentTarget.value); setIdx(-1); }}
        onFocus={() => setFocus(true)} onKeyDown={onKey}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
      />
      {show && (
        <ul class="suggest" id="suggest-list" role="listbox">
          {hits.length ? hits.map((h, i) => (
            <li role="option" aria-selected={i === idx} class={i === idx ? 'active' : ''} onMouseDown={(e) => { e.preventDefault(); pick(h); }}>
              <span class="suggest-kind">{h.kind}</span><span class="suggest-title">{h.title}</span>
            </li>
          )) : <li class="suggest-empty">Tidak ada hasil</li>}
        </ul>
      )}
    </form>
  );
}
