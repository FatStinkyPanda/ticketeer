/**
 * RFC 1918 private IPv4 address ranges and related validation utilities.
 * These ranges are used to enforce PII rules around IP address handling.
 */

export interface Ipv4Range {
  network: number;
  mask: number;
  description: string;
}

/**
 * RFC 1918 private address ranges.
 */
export const RFC_1918_RANGES: readonly Ipv4Range[] = [
  { network: 0x0a000000, mask: 0xff000000, description: '10.0.0.0/8' },
  { network: 0xac100000, mask: 0xfff00000, description: '172.16.0.0/12' },
  { network: 0xc0a80000, mask: 0xffff0000, description: '192.168.0.0/16' },
] as const;

/**
 * Special-use ranges that are neither private nor public (excluded from validation).
 */
export const EXCLUDED_RANGES: readonly Ipv4Range[] = [
  { network: 0x7f000000, mask: 0xff000000, description: '127.0.0.0/8 (loopback)' },
  { network: 0xa9fe0000, mask: 0xffff0000, description: '169.254.0.0/16 (link-local)' },
  { network: 0x00000000, mask: 0xffffffff, description: '0.0.0.0 (invalid)' },
  { network: 0xe0000000, mask: 0xf0000000, description: '224.0.0.0/4 (multicast)' },
  { network: 0xf0000000, mask: 0xf0000000, description: '240.0.0.0/4 (reserved)' },
  { network: 0xffffffff, mask: 0xffffffff, description: '255.255.255.255 (broadcast)' },
] as const;

/**
 * IPv4 regex — matches dotted-decimal notation only.
 */
export const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * IPv6 detection regex — used to reject IPv6 addresses with a helpful message.
 */
export const IPV6_REGEX = /:/;

/**
 * Convert a dotted-decimal IPv4 string to a 32-bit integer.
 * Returns null if the string is not a valid IPv4 address.
 */
export function ipv4ToInt(ip: string): number | null {
  const match = IPV4_REGEX.exec(ip);
  if (!match) return null;

  const octets = [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    parseInt(match[4], 10),
  ];

  if (octets.some((o) => o > 255)) return null;

  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

/**
 * Check if an integer IP falls within a given range.
 */
function inRange(ipInt: number, range: Ipv4Range): boolean {
  return (ipInt & range.mask) >>> 0 === range.network >>> 0;
}

/**
 * Check if an IPv4 address string is within RFC 1918 private ranges.
 * Returns false for invalid IPs.
 */
export function isPrivateIp(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;
  return RFC_1918_RANGES.some((range) => inRange(ipInt, range));
}

/**
 * Check if an IPv4 address string is a special-use/excluded address
 * (loopback, link-local, etc.).
 */
export function isExcludedIp(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;
  return EXCLUDED_RANGES.some((range) => inRange(ipInt, range));
}

/**
 * Check if an IPv4 address string is a valid, routable public IP address.
 * Returns false for private IPs, excluded IPs, and invalid IPs.
 */
export function isPublicIp(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;
  return !isPrivateIp(ip) && !isExcludedIp(ip);
}

export type IpValidationResult =
  | { valid: true; isPublic: boolean }
  | { valid: false; error: string };

/**
 * Validate an IP address string and classify it.
 */
export function validateIpAddress(ip: string): IpValidationResult {
  if (!ip || ip.trim() === '') {
    return { valid: false, error: 'IP address is required.' };
  }

  if (IPV6_REGEX.test(ip)) {
    return { valid: false, error: 'IPv6 addresses are not currently supported.' };
  }

  const ipInt = ipv4ToInt(ip.trim());
  if (ipInt === null) {
    return { valid: false, error: 'Invalid IP address format. Use dotted-decimal notation (e.g., 192.168.1.1).' };
  }

  if (isExcludedIp(ip.trim())) {
    return { valid: false, error: 'This IP address is not valid for use (loopback, link-local, or reserved).' };
  }

  return { valid: true, isPublic: isPublicIp(ip.trim()) };
}
