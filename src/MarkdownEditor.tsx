import { useRef, useState } from 'preact/hooks';
import { Bold, Code, Heading2, ImagePlus, Italic, Link2, List, ListChecks, ListOrdered, Quote, type LucideIcon } from 'lucide-preact';
import { Icon } from './icons';
import { Markdown } from './Markdown';
import { applyFormat, continueList, type Edit, type Format } from './mdparse';
import { countImages, imageMarkdown, MAX_IMAGES } from './imgutil';
import { uploadImage } from './images';
import { useAuth } from './auth';
import { cloudEnabled } from './supabase';
import { toast } from './ui';

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
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const auth = useAuth();
  const canImage = cloudEnabled && !!auth.session; // images need an account (they live in private cloud storage)

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
  const addImages = async (files: File[]) => {
    const ta = ref.current;
    if (!ta) return;
    for (const file of files) {
      // the limit is per note, and a journal spreads its text over several editors in the same form
      const used = countImages([...(ta.form?.querySelectorAll('textarea') ?? [ta])].map((t) => t.value));
      if (used >= MAX_IMAGES) { toast(`Maksimal ${MAX_IMAGES} gambar per catatan.`); break; }
      setBusy((n) => n + 1);
      try {
        const id = await uploadImage(file);
        const alt = file.name.replace(/\.[^.]+$/, '');
        const pos = ta.selectionStart;
        const lead = pos > 0 && ta.value[pos - 1] !== '\n' ? '\n' : '';
        const ins = `${lead}${imageMarkdown(id, /^(image|gambar)\d*$/i.test(alt) ? 'Gambar' : alt)}\n`;
        put({ value: ta.value.slice(0, pos) + ins + ta.value.slice(ta.selectionEnd), start: pos + ins.length, end: pos + ins.length });
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Gagal menyisipkan gambar.');
      } finally { setBusy((n) => n - 1); }
    }
  };
  const imagesIn = (list?: FileList | null) => [...(list ?? [])].filter((f) => f.type.startsWith('image/'));
  const onPaste = (e: ClipboardEvent) => {
    const files = imagesIn(e.clipboardData?.files);
    if (!files.length) return;
    e.preventDefault();
    if (canImage) void addImages(files); else toast('Gambar hanya bisa disisipkan setelah masuk ke akun.');
  };
  const onDrop = (e: DragEvent) => {
    const files = imagesIn(e.dataTransfer?.files);
    if (!files.length) return;
    e.preventDefault();
    if (canImage) void addImages(files); else toast('Gambar hanya bisa disisipkan setelah masuk ke akun.');
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
          {canImage && (
            <>
              <button type="button" class="md-btn" aria-label="Sisipkan gambar" title="Sisipkan gambar" disabled={preview || busy > 0} onMouseDown={(e) => e.preventDefault()} onClick={() => fileInput.current?.click()}>
                <Icon as={ImagePlus} size={16} />
              </button>
              <input ref={fileInput} type="file" accept="image/*" multiple class="hidden" onChange={(e) => { const f = imagesIn(e.currentTarget.files); e.currentTarget.value = ''; if (f.length) void addImages(f); }} />
            </>
          )}
          {busy > 0 && <span class="md-busy" role="status">Mengunggah…</span>}
        </div>
        <div class="md-mode" role="tablist">
          <button type="button" role="tab" aria-selected={!preview} class={'md-tab' + (!preview ? ' active' : '')} onClick={() => show(false)}>Tulis</button>
          <button type="button" role="tab" aria-selected={preview} class={'md-tab' + (preview ? ' active' : '')} onClick={() => show(true)}>Pratinjau</button>
        </div>
      </div>
      <textarea id={id} ref={ref} class="field md-input" name={name} rows={rows} placeholder={placeholder} hidden={preview} onKeyDown={onKeyDown} onPaste={onPaste} onDrop={onDrop} onDragOver={(e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); }}>{value}</textarea>
      {preview && (text.trim() ? <div class="md-preview"><Markdown text={text} /></div> : <p class="md-preview muted small">Belum ada isi untuk dipratinjau.</p>)}
    </div>
  );
}
