import { describe, expect, it } from 'vitest';
import { addDays, dateText, dayDiff, excerpt, firstChar, hourIn, isHttpUrl, mapTz, relativeDay, todayIn, tzLabel, UUID_RE, uid } from './util';

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

describe('time zones', () => {
  it('maps device zones to the three Indonesian zones, falling back to WIB', () => {
    expect(mapTz('Asia/Pontianak')).toBe('Asia/Jakarta');
    expect(mapTz('Asia/Makassar')).toBe('Asia/Makassar');
    expect(mapTz('Asia/Ujung_Pandang')).toBe('Asia/Makassar');
    expect(mapTz('Asia/Jayapura')).toBe('Asia/Jayapura');
    expect(mapTz('Europe/London')).toBe('Asia/Jakarta');
    expect(mapTz(undefined)).toBe('Asia/Jakarta');
  });
  it('labels zones as WIB / WITA / WIT', () => {
    expect(tzLabel('Asia/Jakarta')).toBe('WIB');
    expect(tzLabel('Asia/Makassar')).toBe('WITA');
    expect(tzLabel('Asia/Jayapura')).toBe('WIT');
  });
});

describe('relativeDay', () => {
  const today = '2026-10-15';
  it('names nearby days', () => {
    expect(relativeDay('2026-10-15', today)).toBe('Hari ini');
    expect(relativeDay('2026-10-16', today)).toBe('Besok');
    expect(relativeDay('2026-10-14', today)).toBe('Kemarin');
    expect(relativeDay('2026-10-18', today)).toBe('3 hari lagi');
    expect(relativeDay('2026-10-10', today)).toBe('5 hari lalu');
  });
  it('returns null when far away or empty', () => {
    expect(relativeDay('2026-12-01', today)).toBeNull();
    expect(relativeDay('2026-09-01', today)).toBeNull();
    expect(relativeDay('', today)).toBeNull();
  });
  it('dayDiff is DST/zone independent and handles month ends', () => {
    expect(dayDiff('2026-03-01', '2026-02-28')).toBe(1);
    expect(dayDiff('2027-01-01', '2026-12-31')).toBe(1);
  });
});
