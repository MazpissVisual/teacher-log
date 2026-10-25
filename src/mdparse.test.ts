import { describe, expect, it } from 'vitest';
import { applyFormat, continueList, parseBlocks, parseInline, toggleTask } from './mdparse';

describe('parseInline', () => {
  it('handles bold, italic, strike, code and nesting', () => {
    expect(parseInline('a **b *c*** ~~d~~ `e`')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'b', c: [{ t: 'text', v: 'b ' }, { t: 'i', c: [{ t: 'text', v: 'c' }] }] },
      { t: 'text', v: ' ' }, { t: 's', c: [{ t: 'text', v: 'd' }] }, { t: 'text', v: ' ' }, { t: 'code', v: 'e' },
    ]);
  });
  it('only links http(s) and mailto, anything else stays as text', () => {
    expect(parseInline('[x](https://a.id)')).toEqual([{ t: 'a', href: 'https://a.id', c: [{ t: 'text', v: 'x' }] }]);
    for (const bad of ['[x](javascript:alert(1))', '[x](data:text/html,hi)', '[x](vbscript:x)']) {
      const nodes = parseInline(bad);
      expect(nodes.every((n) => n.t === 'text')).toBe(true); // no link node is ever produced
      expect(nodes.map((n) => (n as { v: string }).v).join('')).toBe(bad);
    }
  });
  it('does not treat spaced asterisks (maths) as italics', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([{ t: 'text', v: '2 * 3 * 4' }]);
  });
  it('keeps HTML as plain text (it is never injected)', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ t: 'text', v: '<img src=x onerror=alert(1)>' }]);
  });
});

describe('parseBlocks', () => {
  it('splits headings, lists, checklists, quotes, code and rules', () => {
    const b = parseBlocks('# Judul\npara satu\nbaris dua\n\n- a\n- [ ] b\n- [x] c\n\n1. x\n2. y\n\n> kutip\n\n```\ncode **no**\n```\n---');
    expect(b.map((x) => x.t)).toEqual(['h', 'p', 'ul', 'ol', 'quote', 'code', 'hr']);
    expect(b[1]).toMatchObject({ t: 'p', lines: [[{ t: 'text', v: 'para satu' }], [{ t: 'text', v: 'baris dua' }]] });
    expect(b[2]).toMatchObject({ t: 'ul', items: [{ checked: null, line: 4 }, { checked: false, line: 5 }, { checked: true, line: 6 }] });
    expect(b[5]).toEqual({ t: 'code', v: 'code **no**' });
  });
  it('plain notes written before the editor existed still read as paragraphs with line breaks', () => {
    const b = parseBlocks('baris 1\nbaris 2\r\nbaris 3');
    expect(b).toHaveLength(1);
    expect((b[0] as { lines: unknown[] }).lines).toHaveLength(3);
  });
  it('never loops forever on odd input', () => {
    for (const t of ['', '\n\n', '```', '> ', '- ', '#', '# ', '- [ ]', '1.', '***', '```\nx']) expect(() => parseBlocks(t)).not.toThrow();
  });
});

describe('toggleTask', () => {
  it('flips only the requested line', () => {
    expect(toggleTask('- [ ] a\n- [x] b', 0)).toBe('- [x] a\n- [x] b');
    expect(toggleTask('- [ ] a\n- [x] b', 1)).toBe('- [ ] a\n- [ ] b');
    expect(toggleTask('plain', 0)).toBe('plain');
    expect(toggleTask('x', 9)).toBe('x');
  });
});

describe('applyFormat', () => {
  it('wraps a selection and unwraps it again', () => {
    const a = applyFormat('halo dunia', 5, 10, 'bold');
    expect(a).toEqual({ value: 'halo **dunia**', start: 7, end: 12 });
    expect(applyFormat(a.value, a.start, a.end, 'bold').value).toBe('halo dunia');
  });
  it('with no selection places the caret between the markers', () => {
    expect(applyFormat('ab', 1, 1, 'italic')).toEqual({ value: 'a**b', start: 2, end: 2 });
  });
  it('does not turn bold into italic when italic is pressed inside bold', () => {
    const r = applyFormat('**x**', 2, 3, 'italic');
    expect(r.value).toBe('***x***');
  });
  it('adds, switches and removes line prefixes across several lines', () => {
    const v = 'satu\ndua\ntiga';
    const a = applyFormat(v, 0, v.length, 'ul');
    expect(a.value).toBe('- satu\n- dua\n- tiga');
    expect(applyFormat(a.value, a.start, a.end, 'ul').value).toBe(v);
    expect(applyFormat(a.value, a.start, a.end, 'ol').value).toBe('1. satu\n2. dua\n3. tiga');
    expect(applyFormat(a.value, a.start, a.end, 'task').value).toBe('- [ ] satu\n- [ ] dua\n- [ ] tiga');
  });
  it('turns a heading into another prefix and only touches the lines selected', () => {
    expect(applyFormat('# a\nb', 0, 0, 'h2').value).toBe('## a\nb');
    expect(applyFormat('x\ny\nz', 2, 2, 'quote').value).toBe('x\n> y\nz');
  });
  it('inserts a link with the address selected', () => {
    const r = applyFormat('lihat ini', 6, 9, 'link');
    expect(r.value).toBe('lihat [ini](https://)');
    expect(r.value.slice(r.start, r.end)).toBe('https://');
  });
});

describe('continueList', () => {
  it('starts the next item, increments numbers and keeps checkboxes unchecked', () => {
    expect(continueList('- a', 3)?.value).toBe('- a\n- ');
    expect(continueList('2. a', 4)?.value).toBe('2. a\n3. ');
    expect(continueList('- [x] a', 7)?.value).toBe('- [x] a\n- [ ] ');
  });
  it('leaves the list on an empty item, and ignores other lines or mid-line carets', () => {
    expect(continueList('- a\n- ', 6)?.value).toBe('- a\n');
    expect(continueList('teks biasa', 10)).toBeNull();
    expect(continueList('- ab', 3)).toBeNull();
    expect(continueList('**tebal**', 9)).toBeNull();
  });
});
