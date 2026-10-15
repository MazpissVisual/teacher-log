import { describe, expect, it } from 'vitest';
import { addDays, dateText, excerpt, firstChar, hourIn, isHttpUrl, todayIn, UUID_RE, uid } from './util';

describe('dates', () => {
  it('addDays crosses month, year and leap boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-05-10', -7 * 3)).toBe('2026-04-19');
  });

  it('todayIn follows the requested timezone, not the machine', () => {
    const t = new Date('2026-06-14T18:30:00Z'); // 01:30 next day in WIB, 02:30 in WITA, 03:30 in WIT
    expect(todayIn('Asia/Jakarta', t)).toBe('2026-06-15');
    expect(todayIn('Asia/Jayapura', t)).toBe('2026-06-15');
    expect(todayIn('UTC', t)).toBe('2026-06-14');
  });

  it('hourIn uses 24h clock in the timezone', () => {
    const t = new Date('2026-06-14T18:30:00Z');
    expect(hourIn('Asia/Jakarta', t)).toBe(1);
    expect(hourIn('UTC', t)).toBe(18);
  });

  it('dateText handles empty and formats Indonesian', () => {
    expect(dateText('')).toBe('Tanpa tanggal');
    expect(dateText('2026-08-17')).toMatch(/17.*2026/);
  });
});

describe('strings', () => {
  it('excerpt only adds an ellipsis when truncating', () => {
    expect(excerpt('pendek', 10)).toBe('pendek');
    expect(excerpt('abcdefghij', 5)).toBe('abcde…');
  });
  it('firstChar keeps whole emoji', () => {
    expect(firstChar('  budi')).toBe('B');
    expect(firstChar('😀 Guru')).toBe('😀');
    expect(firstChar('')).toBe('G');
  });
  it('isHttpUrl rejects dangerous schemes', () => {
    expect(isHttpUrl('https://a.id')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,x')).toBe(false);
  });
  it('uid yields valid v4 UUIDs even without crypto.randomUUID', () => {
    expect(UUID_RE.test(uid())).toBe(true);
    const orig = crypto.randomUUID;
    // @ts-expect-error simulate a non-secure origin
    crypto.randomUUID = undefined;
    try {
      const id = uid();
      expect(UUID_RE.test(id)).toBe(true);
      expect(id[14]).toBe('4');
    } finally {
      crypto.randomUUID = orig;
    }
  });
});
