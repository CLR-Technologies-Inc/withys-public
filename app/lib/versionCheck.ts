/**
 * Version checking utilities for PWA update detection and client version reporting.
 *
 * APP_VERSION is read from app.json at build time via Metro's JSON import.
 * checkForUpdate() fetches the static /api/version.json endpoint to compare.
 */
import { Platform } from 'react-native';
import appJson from '../app.json';

/** Current app version, resolved at build time from app.json */
export const APP_VERSION: string = appJson.expo.version;

/**
 * Fetches the latest version info from the server.
 * Returns null if the fetch fails (e.g. offline).
 */
export async function fetchServerVersion(): Promise<{ version: string; minSupported: string } | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const res = await fetch('/api/version.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

/**
 * Compares two semver strings (major.minor.patch).
 * Returns: -1 if a < b, 0 if equal, 1 if a > b.
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Returns the minor-version gap between two semver strings.
 * E.g. "0.12.0" vs "0.14.0" → 2
 */
export function minorVersionGap(local: string, server: string): number {
  const lParts = local.split('.').map(Number);
  const sParts = server.split('.').map(Number);
  if ((sParts[0] || 0) !== (lParts[0] || 0)) return 99; // major mismatch = always force
  return Math.abs((sParts[1] || 0) - (lParts[1] || 0));
}

export type UpdateStatus =
  | { status: 'current' }
  | { status: 'update-available'; serverVersion: string; gap: number }
  | { status: 'unsupported'; serverVersion: string; minSupported: string }
  | { status: 'unknown' };

/**
 * Checks whether the client is running the latest version.
 * Safe to call on any platform; returns 'unknown' on non-web.
 */
export async function checkForUpdate(): Promise<UpdateStatus> {
  const info = await fetchServerVersion();
  if (!info) return { status: 'unknown' };

  // Check if below minimum supported version
  if (compareSemver(APP_VERSION, info.minSupported) < 0) {
    return { status: 'unsupported', serverVersion: info.version, minSupported: info.minSupported };
  }

  // Check if update is available
  if (compareSemver(APP_VERSION, info.version) < 0) {
    const gap = minorVersionGap(APP_VERSION, info.version);
    return { status: 'update-available', serverVersion: info.version, gap };
  }

  return { status: 'current' };
}


