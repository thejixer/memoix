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

export const entityColorsByTheme: Record<ThemeName, readonly string[]> = {
  Dark: [
    '#FF8A65', '#81C784', '#64B5F6', '#F06292', '#BA68C8',
    '#4DD0E1', '#FFB74D', '#AED581', '#7986CB', '#E57373',
    '#4FC3F7', '#DCE775', '#FFD54F', '#FF8A80', '#B39DDB',
    '#80CBC4', '#F48FB1', '#C5E1A5', '#80DEEA', '#FFAB91',
  ],
  Light: [
    '#A12A12', '#246B32', '#174D9B', '#A11D58', '#5D2A91',
    '#006B70', '#8A4B00', '#4D6415', '#3E438C', '#A32020',
    '#075985', '#746000', '#8A3A00', '#7A287D', '#25645B',
    '#6B3B08', '#8B3150', '#3E621B', '#6B3F85', '#295C87',
  ],
  Legacy: [
    '#FF8066', '#8CFF7A', '#70A7FF', '#FF72B6', '#D49BFF',
    '#63FFF2', '#FFC266', '#B5FF72', '#A29BFF', '#FF7777',
    '#68C9FF', '#F4FF70', '#FFE45C', '#FF9A66', '#C49BFF',
    '#76E8D7', '#FF8CBC', '#B4F28A', '#78D8FF', '#FFB18C',
  ],
  Pink: [
    '#9A2F18', '#28683C', '#244F99', '#A02C62', '#633C91',
    '#176B70', '#8B4C1D', '#59651D', '#49458C', '#A33038',
    '#17618A', '#76631A', '#91432B', '#812F72', '#2D665E',
    '#75431F', '#903B58', '#4E681F', '#694987', '#315C83',
  ],
};
