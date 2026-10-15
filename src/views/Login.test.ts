import { describe, expect, it, vi } from 'vitest';
import { friendly } from './Login';

describe('friendly auth errors', () => {
  it('translates known Supabase messages', () => {
    expect(friendly('Invalid login credentials')).toBe('Email atau kata sandi salah.');
    expect(friendly('User already registered')).toMatch(/sudah terdaftar/);
    expect(friendly('email rate limit exceeded')).toMatch(/Terlalu banyak/);
    expect(friendly('For security purposes, you can only request this after 49 seconds')).toMatch(/Terlalu banyak/);
    expect(friendly('Password should be at least 8 characters')).toBe('Kata sandi minimal 8 karakter.');
    expect(friendly('Password is known to be weak and easy to guess')).toMatch(/terlalu mudah/);
    expect(friendly('New password should be different from the old password.')).toMatch(/berbeda/);
    expect(friendly('Unable to validate email address: invalid format')).toBe('Format email tidak valid.');
    expect(friendly('Failed to fetch')).toMatch(/koneksi/);
    expect(friendly('Token has expired or is invalid')).toMatch(/kedaluwarsa/);
  });

  it('never leaks unknown English text to the user', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = friendly('Database error saving new user');
    expect(out).toBe('Terjadi kendala. Coba lagi sebentar lagi.');
    expect(out).not.toMatch(/database/i);
    expect(spy).toHaveBeenCalled(); // kept for debugging
    spy.mockRestore();
  });
});
