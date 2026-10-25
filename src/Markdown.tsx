import type { ComponentChildren } from 'preact';
import { parseBlocks, type Block, type Inline } from './mdparse';
import { useImageUrl } from './images';
import { openModal } from './ui';

/** A picture stored in the private bucket; tapping it opens a larger view. */
function NoteImage({ id, alt }: { id: string; alt: string }) {
  const { url, failed } = useImageUrl(id);
  if (failed) return <span class="note-img-missing">Gambar tidak tersedia</span>;
  if (!url) return <span class="note-img-ph" aria-label="Memuat gambar" />;
  return (
    <button type="button" class="note-img-btn" aria-label={`Perbesar gambar${alt ? ': ' + alt : ''}`} onClick={() => openModal(alt || 'Gambar', <img class="note-img-large" src={url} alt={alt} />)}>
      <img class="note-img" src={url} alt={alt} loading="lazy" />
    </button>
  );
}

function inline(nodes: Inline[]): ComponentChildren {
  return nodes.map((n) => {
    switch (n.t) {
      case 'text': return n.v;
      case 'code': return <code>{n.v}</code>;
      case 'img': return <NoteImage id={n.id} alt={n.alt} />;
      case 'b': return <strong>{inline(n.c)}</strong>;
      case 'i': return <em>{inline(n.c)}</em>;
      case 's': return <s>{inline(n.c)}</s>;
      case 'a': return <a href={n.href} target="_blank" rel="noopener noreferrer">{inline(n.c)}</a>;
    }
  });
}

const lines = (ls: Inline[][]) => ls.map((l, i) => <>{i > 0 && <br />}{inline(l)}</>);

function block(b: Block, onToggleTask?: (line: number) => void): ComponentChildren {
  switch (b.t) {
    case 'h': return b.level === 1 ? <h3>{inline(b.c)}</h3> : b.level === 2 ? <h4>{inline(b.c)}</h4> : <h5>{inline(b.c)}</h5>;
    case 'p': return <p>{lines(b.lines)}</p>;
    case 'quote': return <blockquote>{lines(b.lines)}</blockquote>;
    case 'code': return <pre><code>{b.v}</code></pre>;
    case 'hr': return <hr />;
    case 'ul':
    case 'ol': {
      const List = b.t;
      return (
        <List>
          {b.items.map((it) => (
            <li class={it.checked === null ? undefined : 'md-task' + (it.checked ? ' done' : '')}>
              {it.checked !== null && (
                <input type="checkbox" checked={it.checked} disabled={!onToggleTask} aria-label="Selesai" onChange={() => onToggleTask?.(it.line)} />
              )}
              <span>{inline(it.c)}</span>
            </li>
          ))}
        </List>
      );
    }
  }
}

/** Renders note text. Checkboxes are interactive only when `onToggleTask` is given. */
export function Markdown({ text, onToggleTask }: { text: string; onToggleTask?: (line: number) => void }) {
  return <div class="md">{parseBlocks(text).map((b) => block(b, onToggleTask))}</div>;
}
