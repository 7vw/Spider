export type ThemeId = 'classic' | 'miles' | 'symbiote' | '2099';
export type PatternKind = 'web' | 'glitch' | 'veins' | 'grid';

export interface ThemeMeta {
  id: ThemeId;
  pattern: PatternKind;
  /** Swatches for the theme picker; the real values live in styles/themes.css. */
  swatch: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
  { id: 'classic', pattern: 'web', swatch: ['#08090D', '#E62429', '#101D35'] },
  { id: 'miles', pattern: 'glitch', swatch: ['#050506', '#FF1F3D', '#2A0A12'] },
  { id: 'symbiote', pattern: 'veins', swatch: ['#040404', '#F5F5F7', '#1A1A1D'] },
  { id: '2099', pattern: 'grid', swatch: ['#060A16', '#E62429', '#1C3F8F'] },
];

export const themeMeta = (id: ThemeId) => THEMES.find((t) => t.id === id) ?? THEMES[0];
