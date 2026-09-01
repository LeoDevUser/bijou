import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { ThemeConfig, CollectionThemeView } from '../types';

const DEFAULTS: ThemeConfig = {
  navbarBg: '#FAFAF8',
  navbarText: '#1C1C1C',
  navbarTextSelected: '#C9A96E',
  navbarTextInactive: '#6b6b70',
  announcementBg: '#1C1C1C',
  announcementText: '#FFFFFF',
  siteBg: '#FAFAF8',
  siteText: '#1C1C1C',
  cardText: '#1C1C1C',
  cardButtonBg: '#1C1C1C',
  cardButtonText: '#FFFFFF',
  navbarSeparator: '#E8E4DC',
  siteTextMuted: '#6b6b70',
  siteTextAccent: '#C9A96E',
  siteSeparator: '#E8E4DC',
};

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty('--bijou-navbar-bg', theme.navbarBg);
  root.style.setProperty('--bijou-navbar-text', theme.navbarText);
  root.style.setProperty('--bijou-navbar-selected', theme.navbarTextSelected);
  root.style.setProperty('--bijou-navbar-inactive', theme.navbarTextInactive);
  root.style.setProperty('--bijou-announcement-bg', theme.announcementBg);
  root.style.setProperty('--bijou-announcement-text', theme.announcementText);
  root.style.setProperty('--bijou-site-bg', theme.siteBg);
  root.style.setProperty('--bijou-site-text', theme.siteText);
  root.style.setProperty('--bijou-card-text', theme.cardText);
  root.style.setProperty('--bijou-card-button-bg', theme.cardButtonBg);
  root.style.setProperty('--bijou-card-button-text', theme.cardButtonText);
  root.style.setProperty('--bijou-navbar-separator', theme.navbarSeparator);
  root.style.setProperty('--bijou-site-text-muted', theme.siteTextMuted);
  root.style.setProperty('--bijou-site-text-accent', theme.siteTextAccent);
  root.style.setProperty('--bijou-site-separator', theme.siteSeparator);
}

/** Merge a collection's custom theme over a base ThemeConfig. Only non-null fields override. */
export function mergeCollectionTheme(base: ThemeConfig, ct: CollectionThemeView): ThemeConfig {
  return {
    navbarBg:            ct.navbarBg            ?? base.navbarBg,
    navbarText:          ct.navbarText          ?? base.navbarText,
    navbarTextSelected:  ct.navbarTextSelected  ?? base.navbarTextSelected,
    navbarTextInactive:  ct.navbarTextInactive  ?? base.navbarTextInactive,
    announcementBg:      ct.announcementBg      ?? base.announcementBg,
    announcementText:    ct.announcementText    ?? base.announcementText,
    siteBg:              ct.siteBg              ?? base.siteBg,
    siteText:            ct.siteText            ?? base.siteText,
    cardText:            ct.cardText            ?? base.cardText,
    cardButtonBg:        ct.cardButtonBg        ?? base.cardButtonBg,
    cardButtonText:      ct.cardButtonText      ?? base.cardButtonText,
    navbarSeparator:     ct.navbarSeparator     ?? base.navbarSeparator,
    siteTextMuted:       ct.siteTextMuted       ?? base.siteTextMuted,
    siteTextAccent:      ct.siteTextAccent      ?? base.siteTextAccent,
    siteSeparator:       ct.siteSeparator       ?? base.siteSeparator,
  };
}

interface ThemeContextValue {
  /** The colours currently in effect: the site-wide theme, plus any page override over it. */
  theme: ThemeConfig;
  /** Replaces the site-wide theme — the admin panel, once a new one is saved. */
  setBaseTheme: (t: ThemeConfig) => void;
  /**
   * Layers one collection's theme on top of the site-wide one for as long as its page is
   * mounted. Pass null to drop it. Anything else would leak: the CSS variables live on
   * <html>, so a collection's colours would otherwise follow the shopper onto product,
   * shop and cart pages — a collection with a light Site Text over the site's light
   * background left product names and prices painted invisible until a hard refresh.
   */
  setCollectionOverride: (t: CollectionThemeView | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Drops null fields so a partially-filled theme falls back to what it is layered over. */
function withoutNulls(raw: object): Partial<ThemeConfig> {
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => v != null)) as Partial<ThemeConfig>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // The site-wide theme: the global ThemeConfig with the main collection's theme over it.
  const [base, setBase] = useState<ThemeConfig>(DEFAULTS);
  // The collection page currently on screen, if it has a theme of its own.
  const [override, setOverride] = useState<CollectionThemeView | null>(null);

  useEffect(() => {
    // 1. Load global ThemeConfig from DB
    api.theme.get()
      .then(raw => {
        const globalTheme: ThemeConfig = { ...DEFAULTS, ...withoutNulls(raw) };
        setBase(globalTheme);

        // 2. If a main collection has a custom theme, fold it into the site-wide theme.
        //    This makes the main collection's theme the effective one from app start.
        api.collections.getMain()
          .then(main => {
            if (main.theme) setBase(mergeCollectionTheme(globalTheme, main.theme));
          })
          .catch(() => {});
      })
      .catch(() => {});
  }, []);

  const theme = useMemo(
    () => (override ? mergeCollectionTheme(base, override) : base),
    [base, override],
  );

  // The one place the CSS variables are written. Because it re-runs on every change to
  // either layer, dropping an override restores the site-wide colours on its own — no
  // page reload needed to get them back.
  useEffect(() => { applyTheme(theme); }, [theme]);

  function setBaseTheme(raw: ThemeConfig) {
    setBase({ ...DEFAULTS, ...withoutNulls(raw) } as ThemeConfig);
  }

  const value = useMemo(
    () => ({ theme, setBaseTheme, setCollectionOverride: setOverride }),
    [theme], // setBaseTheme only calls a stable setter; setOverride is stable itself
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export { DEFAULTS as THEME_DEFAULTS };
