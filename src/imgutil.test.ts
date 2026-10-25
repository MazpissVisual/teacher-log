import { describe, expect, it } from 'vitest';
import { countImages, fitWithin, imageIds, imageMarkdown, imagePath, MAX_SIDE } from './imgutil';

const A = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const B = '9a8b7c6d-1111-4222-8333-444455556666';

describe('imageIds / countImages', () => {
  it('finds ids in order without duplicates, ignoring other links', () => {
    expect(imageIds(`x ![a](img:${A}) y ![b](img:${B}) ![again](img:${A}) [t](https://x.id)`)).toEqual([A, B]);
    expect(imageIds('tanpa gambar')).toEqual([]);
  });
  it('counts distinct images across a journal\'s fields', () => {
    expect(countImages([`![a](img:${A})`, `![b](img:${B})`, `![a2](img:${A.toUpperCase()})`])).toBe(2);
  });
});

describe('fitWithin', () => {
  it('shrinks the longer side to the limit and keeps the ratio', () => {
    expect(fitWithin(4000, 3000)).toEqual({ w: MAX_SIDE, h: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ w: 1200, h: MAX_SIDE });
  });
  it('never scales up and never returns zero', () => {
    expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 });
    expect(fitWithin(5000, 1, 1600)).toEqual({ w: 1600, h: 1 });
  });
});

describe('references and paths', () => {
  it('builds a reference that parses back, and strips brackets from alt text', () => {
    expect(imageIds(imageMarkdown(A, 'a [b] c'))).toEqual([A]);
    expect(imageMarkdown(A, 'a [b]')).toBe(`![a b](img:${A})`);
  });
  it('puts every file in its owner\'s folder', () => {
    expect(imagePath('user-1', A)).toBe(`user-1/${A}`);
  });
});
