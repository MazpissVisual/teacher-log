import { useRef, useState } from 'preact/hooks';
import { Bold, Code, Heading2, Italic, Link2, List, ListChecks, ListOrdered, Quote, type LucideIcon } from 'lucide-preact';
import { Icon } from './icons';
import { Markdown } from './Markdown';
import { applyFormat, continueList, type Edit, type Format } from './mdparse';

const TOOLS: [Format, LucideIcon, string][] = [
  ['bold', Bold, 'Tebal (Ctrl+B)'], ['italic', Italic, 'Miring (Ctrl+I)'], ['h2', Heading2, 'Judul'],
  ['ul', List, 'Daftar poin'], ['ol', ListOrdered, 'Daftar angka'], ['task', ListChecks, 'Daftar centang'],
  ['quote', Quote, 'Kutipan'], ['code', Code, 'Kode'], ['link', Link2, 'Tautan'],
];

/**
 * A textarea with a formatting toolbar and a preview tab. The textarea stays mounted (just hidden) while
 * previewing, so it still submits with the surrounding <form> under `name`.
 */
export function MarkdownEditor({ id, name, value, placeholder, rows = 6 }: { id: string; name: string; value: string; placeholder?: string; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [text, setText] = useState(value);

  const put = (e: Edit) => {
    const ta = ref.current;
    if (!ta) return;
    ta.value = e.value;
    ta.focus();
    ta.setSelectionRange(e.start, e.end);
  };
  const format = (f: Format) => { const ta = ref.current; if (ta) put(applyFormat(ta.value, ta.selectionStart, ta.selectionEnd, f)); };
  const onKeyDown = (e: KeyboardEvent) => {
    const ta = ref.current;
    if (!ta) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'b' || e.key === 'i')) {
      e.preventDefault();
      return format(e.key === 'b' ? 'bold' : 'italic');
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && ta.selectionStart === ta.selectionEnd) {
      const edit = continueList(ta.value, ta.selectionStart);
      if (edit) { e.preventDefault(); put(edit); }
    }
  };
  const show = (p: boolean) => { if (p) setText(ref.current?.value ?? ''); setPreview(p); };

  return (
    <div class="md-editor">
      <div class="md-bar">
        <div class="md-tools" role="toolbar" aria-label="Format teks">
          {TOOLS.map(([f, ico, label]) => (
            <button type="button" class="md-btn" aria-label={label} title={label} disabled={preview} onMouseDown={(e) => e.preventDefault()} onClick={() => format(f)}>
              <Icon as={ico} size={16} />
            </button>
          ))}
        </div>
        <div class="md-mode" role="tablist">
          <button type="button" role="tab" aria-selected={!preview} class={'md-tab' + (!preview ? ' active' : '')} onClick={() => show(false)}>Tulis</button>
          <button type="button" role="tab" aria-selected={preview} class={'md-tab' + (preview ? ' active' : '')} onClick={() => show(true)}>Pratinjau</button>
        </div>
      </div>
      <textarea id={id} ref={ref} class="field md-input" name={name} rows={rows} placeholder={placeholder} hidden={preview} onKeyDown={onKeyDown}>{value}</textarea>
      {preview && (text.trim() ? <div class="md-preview"><Markdown text={text} /></div> : <p class="md-preview muted small">Belum ada isi untuk dipratinjau.</p>)}
    </div>
  );
}
