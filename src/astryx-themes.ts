import {neutralTheme as _astryxTheme0} from "@astryxdesign/theme-neutral/built";
import { defineTheme } from '@astryxdesign/core/theme';
import "@astryxdesign/theme-neutral/theme.css";

// The invitation's blue and white palette, expressed through the shared theme.
const meetingTheme = defineTheme({
  name: 'eneo-meeting', extends: _astryxTheme0,
  tokens: {
    '--color-accent': '#176CC5', '--color-text-accent': '#145EA9',
    '--color-icon-accent': '#145EA9', '--color-on-accent': '#FFFFFF',
    '--color-accent-muted': '#EAF3FC', '--color-background-body': '#F6F8FB',
    '--color-background-surface': '#FFFFFF', '--color-background-card': '#FFFFFF',
    '--color-text-primary': '#1B2435', '--color-text-secondary': '#536174',
    '--focus-outline-color': '#145EA9',
  },
  components: {
    card: { 'variant:gray': { backgroundColor: 'var(--color-accent-muted)' } },
    'side-nav': { base: { width: '15rem' } },
    'heading': { base: { overflowWrap: 'anywhere' } },
    'text': { base: { overflowWrap: 'anywhere' } },
    'stack': { base: {
      ':fullscreen': {
        backgroundColor: 'var(--color-background-surface)', padding: 'var(--spacing-6)',
        width: '100%', height: '100dvh', overflow: 'auto',
      },
      ':fullscreen > .astryx-card': { flexGrow: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      ':fullscreen .astryx-heading': { fontSize: 'clamp(1.8rem, 3.5vw, 4rem)' },
      ':fullscreen .astryx-text[data-type="large"]': { fontSize: 'clamp(1.0625rem, 2vw, 2rem)' },
      ':fullscreen > iframe': { flexGrow: '1' },
    } },
  },
});

export const themes = {
  "neutral": meetingTheme,
} as const;
export type ThemeSlug = keyof typeof themes;

export const defaultThemeSlug: keyof typeof themes = "neutral";
