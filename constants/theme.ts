/**
 * Design tokens for Nook.
 *
 * Import anywhere:
 *   import { THEME } from '@/constants/theme';
 *   <View style={{ backgroundColor: THEME.light.bg }} />
 *
 * Later we'll wrap this in a `useTheme()` hook that picks the active
 * palette based on the user's theme setting (light/dark/system).
 */

export const ACCENTS = {
  teal: { base: "#0F9D8C", deep: "#0B6F64", soft: "#D5F0EB", name: "Teal" },
  indigo: { base: "#5457E8", deep: "#3A3CBF", soft: "#E4E4FB", name: "Indigo" },
  coral: { base: "#E56A4F", deep: "#B4482E", soft: "#FCE4DC", name: "Coral" },
  amber: { base: "#C78A1A", deep: "#8E6110", soft: "#F7E9C8", name: "Amber" },
  plum: { base: "#8A3D7A", deep: "#5F2855", soft: "#F0DAEA", name: "Plum" },
} as const;

export const THEME = {
  font: {
    body: "Inter_400Regular",
    heading: "Inter_700Bold",
    mono: "Inconsolata_400Regular",
  },
  light: {
    bg: "#F6F5F1",
    surface: "#FFFFFF",
    surfaceAlt: "#FAF9F5",
    border: "#ECE8DF",
    borderStrong: "#DBD5C7",
    ink: "#15171A",
    inkMuted: "#5B5E64",
    inkSoft: "#8B8E94",
    pill: "#F0EDE4",
    pillInk: "#2A2C30",
    positive: "#0E8A5F",
    negative: "#C44141",
    chipBg: "#F3F0E8",
  },
  dark: {
    bg: "#0E1210",
    surface: "#161B19",
    surfaceAlt: "#1B2220",
    border: "#262D2A",
    borderStrong: "#323A37",
    ink: "#F1EFEA",
    inkMuted: "#9BA1A0",
    inkSoft: "#6B7170",
    pill: "#222927",
    pillInk: "#E6E4DE",
    positive: "#45C596",
    negative: "#E06767",
    chipBg: "#1E2522",
  },
} as const;
export type ThemeScheme = keyof typeof THEME;
export type ThemeToken = keyof typeof THEME.light;
