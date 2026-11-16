import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import svSE from '@astryxdesign/core/locales/sv-SE.generated.js';
import { themes, defaultThemeSlug } from './astryx-themes';
import MeetingPage from './MeetingPage';

const root = document.getElementById('root');
if (!root) throw new Error('Sidans rot saknas.');
createRoot(root).render(
  <Theme theme={themes[defaultThemeSlug]} mode="light">
    <InternationalizationProvider locale="sv-SE" messages={{ 'sv-SE': svSE }}>
      <MeetingPage />
    </InternationalizationProvider>
  </Theme>,
);
