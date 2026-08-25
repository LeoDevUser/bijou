import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatMoney, type PublicSettings } from '../types';

/**
 * Live storefront settings (shipping fees, MSI availability) as configured in
 * the admin panel. Shared across pages through a module-level promise so the
 * endpoint is hit once per page load no matter how many components ask.
 */
let cached: Promise<PublicSettings> | null = null;

function load(): Promise<PublicSettings> {
  if (!cached) {
    cached = api.settings.get().catch(err => {
      cached = null; // let the next mount retry
      throw err;
    });
  }
  return cached;
}

/** Drop the cache after an admin edit so the storefront re-reads the new values. */
export function invalidatePublicSettings(): void {
  cached = null;
}

/** Whole pesos read cleanly; cents only appear when the admin actually set some. */
export function formatSettingsAmount(value: number): string {
  return formatMoney(value, Number.isInteger(value) ? 0 : 2);
}

export function usePublicSettings(): PublicSettings | null {
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    let alive = true;
    load().then(s => { if (alive) setSettings(s); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return settings;
}
