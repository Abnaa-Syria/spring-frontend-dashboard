import { ConfigProvider } from 'antd';
import type { Locale } from 'antd/es/locale';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildTheme, palettes, type Palette } from '../theme';

export type ThemeMode = 'light' | 'dark' | 'system';
const KEY = 'spring.theme';

const readMode = (): ThemeMode => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
};
const systemDark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

interface Ctx { mode: ThemeMode; dark: boolean; palette: Palette; setMode: (m: ThemeMode) => void }
const ThemeModeContext = createContext<Ctx | null>(null);

/** Light / dark / follow-the-system, remembered per browser. Drives antd tokens and the CSS variables. */
export function ThemeModeProvider({ children, locale }: { children: ReactNode; locale: Locale }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setSysDark(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const dark = mode === 'dark' || (mode === 'system' && sysDark);
  const palette = palettes[dark ? 'dark' : 'light'];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B1220' : '#16304F');
  }, [dark]);

  const value = useMemo<Ctx>(() => ({
    mode, dark, palette,
    setMode: (m) => {
      setModeState(m);
      try { if (m === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch { /* storage unavailable */ }
    },
  }), [mode, dark, palette]);
  const theme = useMemo(() => buildTheme(dark), [dark]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ConfigProvider direction="rtl" locale={locale} theme={theme}>{children}</ConfigProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode outside ThemeModeProvider');
  return ctx;
}
