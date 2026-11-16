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
  localTokens: {
    '--presentation-heading-size': 'clamp(2rem, 4vw, 5.5rem)',
    '--presentation-body-size': 'clamp(1.25rem, 2.1vw, 2.75rem)',
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
      ':fullscreen .astryx-heading': { fontSize: 'var(--presentation-heading-size)' },
      ':fullscreen .astryx-text[data-type="large"]': { fontSize: 'var(--presentation-body-size)' },
      ':fullscreen > iframe': { flexGrow: '1' },
    } },
  },
});

export const projectionTheme = defineTheme({
  name: 'eneo-projection',
  extends: meetingTheme,
  components: {
    heading: { 'type:display-3': { fontSize: 'var(--presentation-heading-size)', lineHeight: '1.15' } },
    text: { 'type:large': { fontSize: 'var(--presentation-body-size)', lineHeight: '1.45' } },
  },
});

export const themes = {
  "neutral": meetingTheme,
} as const;
export type ThemeSlug = keyof typeof themes;

export const defaultThemeSlug: keyof typeof themes = "neutral";

// The programme keeps the invitation's distinct shared, main and technical rows.
export const programmeTheme = defineTheme({
  name: 'eneo-programme',
  extends: meetingTheme,
  localTokens: {
    '--programme-paper': '#FFFFFF',
    '--programme-ink': '#1B2435',
    '--programme-main-header': '#1976CC',
    '--programme-technical-header': '#8CBDEA',
    '--programme-shared': '#191D2D',
    '--programme-shared-label': '#8CBDEA',
    '--programme-shared-detail': '#CFD4DF',
    '--programme-main-surface': '#E8F2FC',
    '--programme-technical-surface': '#F0F2F5',
    '--programme-grid-line': '0.125rem',
    '--programme-time-width': '7rem',
    '--programme-compact-time-width': '4.5rem',
    '--programme-title-size': 'clamp(1.875rem, 3vw, 3.5rem)',
    '--programme-session-size': 'clamp(1rem, 1.15vw, 1.45rem)',
    '--programme-label-size': '0.8125rem',
    '--programme-label-tracking': '0.12em',
    // Rem scalar used against the root font size by the measured layout.
    '--programme-wide-min-rem': '44',
  },
  components: {
    'table-scroll-wrapper': { base: { marginInline: '0', width: '100%', maxWidth: '100%' } },
    stack: { base: {
      ':fullscreen': {
        backgroundColor: 'var(--programme-paper)',
        color: 'var(--programme-ink)',
        padding: 'clamp(var(--spacing-4), 3vw, var(--spacing-8))',
        boxSizing: 'border-box',
      },
      ':fullscreen .astryx-heading': { fontSize: 'var(--programme-title-size)', lineHeight: '1.1' },
    } },
  },
});
