import { createContext, useContext } from 'react';

export const themeNames = ['Dark', 'Light', 'Legacy', 'Pink'] as const;
export type ThemeName = (typeof themeNames)[number];

export const themes = {
  Dark: {
    background: '#0B0D12',
    surface: '#151922',
    surfaceRaised: '#202633',
    border: '#343E50',
    green: '#6DE6D2',
    greenSoft: '#B3F5E9',
    muted: '#9CA8B7',
    danger: '#FF727A',
    white: '#F2F5FA',
    black: '#090B10',
    statusBar: 'light',
  },
  Light: {
    background: '#F7F9F5',
    surface: '#FFFFFF',
    surfaceRaised: '#EEF3EC',
    border: '#D6DED1',
    green: '#36734E',
    greenSoft: '#4C8060',
    muted: '#68756A',
    danger: '#BA3B42',
    white: '#1D2A20',
    black: '#000000',
    statusBar: 'dark',
  },
  Legacy: {
    background: '#050805',
    surface: '#0A120B',
    surfaceRaised: '#0E1A10',
    border: '#1C5522',
    green: '#39FF14',
    greenSoft: '#9BFF8A',
    muted: '#7E9B80',
    danger: '#FF5E5E',
    white: '#E8F7E8',
    black: '#000000',
    statusBar: 'light',
  },
  Pink: {
    background: '#FFF1F6',
    surface: '#FFFBFD',
    surfaceRaised: '#FFE2EC',
    border: '#F3B9CC',
    green: '#D92F7B',
    greenSoft: '#A73568',
    muted: '#92677A',
    danger: '#C83254',
    white: '#492A37',
    black: '#000000',
    statusBar: 'dark',
  },
} as const;

export type ThemePalette = (typeof themes)[ThemeName] & {
  font: string;
  fontBold: string;
};

export type ThemeContextValue = {
  theme: ThemePalette;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => Promise<void>;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside MemoixProvider.');
  return value;
}

export function isThemeName(value: string | null): value is ThemeName {
  return themeNames.some(themeName => themeName === value);
}

export const font = 'Comic Sans MS';

export const entityColors = [
  '#FF5733', '#33FF57', '#3357FF', '#FF33A1',
  '#A133FF', '#33FFF5', '#FF8C33', '#57FF33',
  '#5733FF', '#FF3333', '#33A1FF', '#A1FF33',
  '#FFD700', '#FF4500', '#8A2BE2', '#00CED1',
  '#DC143C', '#ADFF2F', '#20B2AA', '#FF69B4',
  '#FF1493', '#7FFF00', '#D2691E', '#4B0082',
  '#8B0000', '#556B2F', '#2E8B57', '#FF6347',
  '#4682B4', '#DA70D6', '#00FA9A', '#B22222',
] as const;
