import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ThemeConfig } from '../types';

const DEFAULTS: ThemeConfig = {
  navbarBg: '#FAFAF8',
  navbarText: '#1C1C1C',
  navbarTextSelected: '#C9A96E',
  navbarTextInactive: '#9C9C9C',
  announcementBg: '#1C1C1C',
  announcementText: '#FFFFFF',
  siteBg: '#FAFAF8',
  siteText: '#1C1C1C',
  cardText: '#1C1C1C',
  cardButtonBg: '#1C1C1C',
  cardButtonText: '#FFFFFF',
  navbarSeparator: '#E8E4DC',
  siteTextMuted: '#9C9C9C',
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

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (t: ThemeConfig) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULTS);

  useEffect(() => {
    applyTheme(DEFAULTS);
    api.theme.get()
      .then(raw => {
        const t: ThemeConfig = { ...DEFAULTS, ...Object.fromEntries(Object.entries(raw).filter(([, v]) => v != null)) };
        setThemeState(t);
        applyTheme(t);
      })
      .catch(() => {});
  }, []);

  function setTheme(raw: ThemeConfig) {
    const t: ThemeConfig = { ...DEFAULTS, ...Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => v != null)) };
    setThemeState(t);
    applyTheme(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
