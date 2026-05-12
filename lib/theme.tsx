import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { ACCENTS, THEME } from '@/constants/theme';

export type Scheme = 'light' | 'dark' | 'system';
export type EffectiveScheme = 'light' | 'dark';
export type AccentKey = keyof typeof ACCENTS;
export type Palette = Record<keyof typeof THEME.light, string>;
export type Accent = Record<keyof typeof ACCENTS.teal, string>;

type ThemeContextValue = {
  scheme: Scheme;
  effectiveScheme: EffectiveScheme;
  palette: Palette;
  accent: Accent;
  accentKey: AccentKey;
  setScheme: (s: Scheme) => void;
  setAccent: (a: AccentKey) => void;
};

const STORAGE_KEY = 'nook:theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isAccentKey = (v: unknown): v is AccentKey =>
  typeof v === 'string' && v in ACCENTS;

const isScheme = (v: unknown): v is Scheme =>
  v === 'light' || v === 'dark' || v === 'system';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [scheme, setSchemeState] = useState<Scheme>('system');
  const [accentKey, setAccentKeyState] = useState<AccentKey>('teal');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as {
            scheme?: unknown;
            accent?: unknown;
          };
          if (isScheme(parsed.scheme)) setSchemeState(parsed.scheme);
          if (isAccentKey(parsed.accent)) setAccentKeyState(parsed.accent);
        } catch {
          // ignore malformed payload
        }
      })
      .catch(() => {
        // defaults are fine
      });
  }, []);

  const persist = (next: { scheme?: Scheme; accent?: AccentKey }) => {
    const value = {
      scheme: next.scheme ?? scheme,
      accent: next.accent ?? accentKey,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)).catch(() => {});
  };

  const setScheme = (s: Scheme) => {
    setSchemeState(s);
    persist({ scheme: s });
  };
  const setAccent = (a: AccentKey) => {
    setAccentKeyState(a);
    persist({ accent: a });
  };

  const effectiveScheme: EffectiveScheme =
    scheme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : scheme;

  const palette = THEME[effectiveScheme] as Palette;
  const accent = ACCENTS[accentKey] as Accent;

  return (
    <ThemeContext.Provider
      value={{
        scheme,
        effectiveScheme,
        palette,
        accent,
        accentKey,
        setScheme,
        setAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

export function useAccent(): Accent {
  return useTheme().accent;
}
