/**
 * A small, safe Markdown subset for notes: headings (# to ###), **bold**, *italic*, ~~strike~~, `code`,
 * [links](https://…), bullet / numbered / checkbox lists, > quotes, ``` code blocks and ---.
 * Parsing produces a plain tree that the renderer turns into elements, so note text is never injected as HTML.
 * Everything here is pure so it can be tested without a browser.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'img'; id: string; alt: string }
  | { t: 'b' | 'i' | 's'; c: Inline[] }
  | { t: 'a'; href: string; c: Inline[] };
export interface Item { c: Inline[]; checked: boolean | null; line: number }
export type Block =
  | { t: 'h'; level: 1 | 2 | 3; c: Inline[] }
  | { t: 'p'; lines: Inline[][] }
  | { t: 'ul' | 'ol'; items: Item[] }
  | { t: 'quote'; lines: Inline[][] }
  | { t: 'code'; v: string }
  | { t: 'hr' };

const SAFE_URL = /^(https?:\/\/|mailto:)/i;
const INLINE = /!\[([^\]]*)\]\(img:([0-9a-fA-F-]{36})\)|`([^`]+)`|\*\*(.+?)\*\*(?!\*)|~~(.+?)~~|\*(?!\s)(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/;
const LIST = /^\s*([-*]|\d+\.)\s+(.*)$/;
const TASK = /^\[( |x|X)\]\s+(.*)$/;
const HR = /^(-{3,}|\*{3,})\s*$/;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let rest = s;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) { out.push({ t: 'text', v: rest }); break; }
    if (m.index > 0) out.push({ t: 'text', v: rest.slice(0, m.index) });
    if (m[2] !== undefined) out.push({ t: 'img', id: m[2].toLowerCase(), alt: m[1] });
    else if (m[3] !== undefined) out.push({ t: 'code', v: m[3] });
    else if (m[4] !== undefined) out.push({ t: 'b', c: parseInline(m[4]) });
    else if (m[5] !== undefined) out.push({ t: 's', c: parseInline(m[5]) });
    else if (m[6] !== undefined) out.push({ t: 'i', c: parseInline(m[6]) });
    else if (SAFE_URL.test(m[8])) out.push({ t: 'a', href: m[8], c: parseInline(m[7]) }); // javascript: and friends stay plain text
    else out.push({ t: 'text', v: m[0] });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const startsBlock = (l: string) => /^(```|#{1,3}\s|>\s?)/.test(l) || LIST.test(l) || HR.test(l);

export function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++; // closing fence (or end of text)
      blocks.push({ t: 'code', v: buf.join('\n') });
      continue;
    }
    if (HR.test(line)) { blocks.push({ t: 'hr' }); i++; continue; }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { blocks.push({ t: 'h', level: h[1].length as 1 | 2 | 3, c: parseInline(h[2]) }); i++; continue; }

    if (/^>\s?/.test(line)) {
      const buf: Inline[][] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(parseInline(lines[i++].replace(/^>\s?/, '')));
      blocks.push({ t: 'quote', lines: buf });
      continue;
    }

    const first = LIST.exec(line);
    if (first) {
      const ordered = /\d/.test(first[1]);
      const items: Item[] = [];
      while (i < lines.length) {
        const m = LIST.exec(lines[i]);
        if (!m || /\d/.test(m[1]) !== ordered) break;
        const task = TASK.exec(m[2]);
        items.push({ c: parseInline(task ? task[2] : m[2]), checked: task ? task[1] !== ' ' : null, line: i });
        i++;
      }
      blocks.push({ t: ordered ? 'ol' : 'ul', items });
      continue;
    }

    const buf: Inline[][] = [parseInline(line)]; // single newlines stay line breaks, like the plain-text notes before
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) buf.push(parseInline(lines[i++]));
    blocks.push({ t: 'p', lines: buf });
  }
  return blocks;
}

/** Flips the checkbox on one source line ("- [ ]" ⇄ "- [x]"). */
export function toggleTask(text: string, line: number): string {
  const lines = text.split('\n');
  if (line < 0 || line >= lines.length) return text;
  lines[line] = lines[line].replace(/^(\s*[-*]\s+\[)([ xX])(\])/, (_, a: string, c: string, b: string) => a + (c === ' ' ? 'x' : ' ') + b);
  return lines.join('\n');
}

// ---------------- editing helpers (used by the toolbar) ----------------
export type Format = 'bold' | 'italic' | 'code' | 'h2' | 'ul' | 'ol' | 'task' | 'quote' | 'link';
export interface Edit { value: string; start: number; end: number }

const WRAP = { bold: '**', italic: '*', code: '`' } as const;
const PREFIX = { h2: '## ', ul: '- ', ol: '1. ', task: '- [ ] ', quote: '> ' } as const;
const HAS: Record<keyof typeof PREFIX, RegExp> = {
  h2: /^##\s+/, ul: /^[-*]\s+(?!\[[ xX]\]\s)/, ol: /^\d+\.\s+/, task: /^[-*]\s+\[[ xX]\]\s+/, quote: /^>\s?/,
};
const ANY_PREFIX = /^(#{1,3}\s+|[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+\.\s+|>\s?)/;

export function applyFormat(value: string, start: number, end: number, fmt: Format): Edit {
  const before = value.slice(0, start), sel = value.slice(start, end), after = value.slice(end);

  if (fmt === 'bold' || fmt === 'italic' || fmt === 'code') {
    const m = WRAP[fmt];
    const insideBold = fmt === 'italic' && before.endsWith('**') && after.startsWith('**');
    if (before.endsWith(m) && after.startsWith(m) && !insideBold) { // markers right around the selection: take them off
      return { value: before.slice(0, -m.length) + sel + after.slice(m.length), start: start - m.length, end: end - m.length };
    }
    if (sel.length >= m.length * 2 && sel.startsWith(m) && sel.endsWith(m) && !(fmt === 'italic' && sel.startsWith('**'))) { // markers inside the selection
      return { value: before + sel.slice(m.length, -m.length) + after, start, end: end - m.length * 2 };
    }
    return { value: before + m + sel + m + after, start: start + m.length, end: end + m.length };
  }

  if (fmt === 'link') {
    const text = sel || 'teks';
    const s = start + 1 + text.length + 2; // select the placeholder address so it can be typed over
    return { value: `${before}[${text}](https://)${after}`, start: s, end: s + 'https://'.length };
  }

  // line prefixes: apply to every line the selection touches
  const ls = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  const endPos = end > start && value[end - 1] === '\n' ? end - 1 : end;
  let le = value.indexOf('\n', endPos);
  if (le === -1) le = value.length;
  const lines = value.slice(ls, le).split('\n');
  const filled = lines.filter((l) => l.trim());
  const remove = filled.length > 0 && filled.every((l) => HAS[fmt].test(l));
  let n = 0;
  const next = lines.map((l) => {
    if (!l.trim() && lines.length > 1) return l;
    const bare = l.replace(remove ? HAS[fmt] : ANY_PREFIX, '');
    if (remove) return bare;
    n++;
    return (fmt === 'ol' ? `${n}. ` : PREFIX[fmt]) + bare;
  }).join('\n');
  const stop = ls + next.length;
  return { value: value.slice(0, ls) + next + value.slice(le), start: start === end ? stop : ls, end: stop };
}

/** Enter at the end of a list item starts the next item; Enter on an empty item leaves the list. Null = let the browser handle it. */
export function continueList(value: string, pos: number): Edit | null {
  const ls = pos === 0 ? 0 : value.lastIndexOf('\n', pos - 1) + 1;
  let le = value.indexOf('\n', pos);
  if (le === -1) le = value.length;
  if (pos !== le) return null;
  const m = /^(\s*)(?:([-*])\s+(\[[ xX]\]\s+)?|(\d+)\.\s+)(.*)$/.exec(value.slice(ls, le));
  if (!m) return null;
  const [, indent, bullet, task, num, body] = m;
  if (!body.trim()) return { value: value.slice(0, ls) + value.slice(le), start: ls, end: ls };
  const ins = '\n' + indent + (num ? `${Number(num) + 1}. ` : `${bullet} ${task ? '[ ] ' : ''}`);
  return { value: value.slice(0, pos) + ins + value.slice(pos), start: pos + ins.length, end: pos + ins.length };
}
