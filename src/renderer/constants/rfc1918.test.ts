import { describe, it, expect } from 'vitest';
import { validateIpAddress, isPrivateIp, isExcludedIp, isPublicIp } from './rfc1918';

describe('validateIpAddress — edge cases', () => {
  it('returns error for empty string', () => {
    expect(validateIpAddress('')).toEqual({ valid: false, error: 'IP address is required.' });
  });

  it('returns error for whitespace-only string', () => {
    expect(validateIpAddress('   ')).toEqual({ valid: false, error: 'IP address is required.' });
  });
});

describe('isPrivateIp / isExcludedIp / isPublicIp — null guard branches', () => {
  it('isPrivateIp returns false for an invalid IP string', () => {
    expect(isPrivateIp('not-an-ip')).toBe(false);
  });

  it('isExcludedIp returns false for an invalid IP string', () => {
    expect(isExcludedIp('not-an-ip')).toBe(false);
  });

  it('isPublicIp returns false for an invalid IP string', () => {
    expect(isPublicIp('not-an-ip')).toBe(false);
  });
});
