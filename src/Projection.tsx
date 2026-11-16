import { useState } from 'react';
import { Heading, Text } from '@astryxdesign/core/Text';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { Icon } from '@astryxdesign/core/Icon';
import { Banner } from '@astryxdesign/core/Banner';
import type { HtmlPresentation } from './content';
import { SlideCanvas } from './Presentations';
import { usePresentationFullscreen, usePresentationSession, useSlideKeyboard } from './presentation-session';

function SlideControls({ index, total, onSelect }: {
  index: number;
  total: number;
  onSelect: (index: number) => void;
}) {
  return <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap" width="100%" aria-label="Bildkontroller">
    <Button label="Föregående" size="lg" isDisabled={index === 0}
      icon={<Icon icon="chevronLeft" />} clickAction={() => onSelect(index - 1)} />
    <Text hasTabularNumbers role="status" aria-live="polite" aria-atomic="true">Bild {index + 1} av {total}</Text>
    <Button label="Nästa" size="lg" isDisabled={index === total - 1}
      icon={<Icon icon="chevronRight" />} clickAction={() => onSelect(index + 1)} />
  </HStack>;
}

export function ProjectionView({ presentation, mode, initialIndex }: {
  presentation: HtmlPresentation;
  mode: 'audience' | 'presenter';
  initialIndex?: number;
}) {
  const { index, select, syncAvailable } = usePresentationSession(presentation, initialIndex);
  const { ref, fullscreen, supported, error, toggle } = usePresentationFullscreen();
  const [popupError, setPopupError] = useState('');
  const [audienceOpened, setAudienceOpened] = useState(false);
  const slide = presentation.slides[index];
  const total = presentation.slides.length;
  const audienceHref = `#visa/${encodeURIComponent(presentation.id)}/${index + 1}`;

  useSlideKeyboard({ index, total, onSelect: select });

  function openAudience() {
    setPopupError('');
    // Also share this selection with any audience window that is already open.
    select(index);
    try {
      const url = new URL(window.location.href);
      url.hash = audienceHref;
      const audience = window.open(url.href, `eneo-audience-${presentation.id}`, 'popup,width=1440,height=900');
      if (!audience) {
        setPopupError('Webbläsaren blockerade publikfönstret. Tillåt popupfönster för sidan och välj Öppna publikvy igen, eller använd länken nedan.');
        return;
      }
      setAudienceOpened(true);
    } catch {
      setPopupError('Publikfönstret kunde inte öppnas. Använd länken nedan för att öppna publikvyn i en ny flik.');
    }
  }

  const fullscreenButton = supported && <Button size="lg" label={fullscreen ? 'Lämna helskärm' : 'Helskärm'} clickAction={toggle} />;
  const controls = <SlideControls index={index} total={total} onSelect={select} />;

  return <VStack ref={ref} className={`projection-root projection-${mode}`} gap={6} padding={5}
      width="100%" minHeight="100dvh" style={{
        backgroundColor: 'var(--color-background-body)',
        padding: 'clamp(var(--spacing-4), 3vw, var(--spacing-8))',
        boxSizing: 'border-box',
      }}>
      {mode === 'audience' ? <>
        <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
          <img src="/eneo-logo.svg" alt="Eneo" style={{ height: 'var(--spacing-6)', width: 'auto' }} />
          {fullscreenButton}
        </HStack>
        {error && <Banner role="alert" status="error" title={error} />}
        <VStack as="main" id="main-content" gap={0} width="100%" vAlign="center"
          style={{ flexGrow: 1, minWidth: 0 }} aria-label={presentation.title}>
          <SlideCanvas slide={slide} large headingLevel={1} />
        </VStack>
        {controls}
      </> : <VStack as="main" id="main-content" gap={6} width="100%" maxWidth="90rem" style={{ marginInline: 'auto' }}>
        <VStack gap={4}>
          <Link href={`#presentation/${encodeURIComponent(presentation.id)}/${index + 1}`} hasUnderline>Till presentationens sida</Link>
          <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
            <VStack gap={2}>
              <Heading level={1} id="page-title">Presentatörsvy</Heading>
              <Text color="secondary">{presentation.title}</Text>
            </VStack>
            <HStack gap={3} wrap="wrap">
              <Button size="lg" label="Öppna publikvy" variant="primary" icon={<Icon icon="externalLink" />} clickAction={openAudience} />
            </HStack>
          </HStack>
          <Text as="p" color="secondary">Flytta publikfönstret till projektorn och välj Helskärm där. Behåll det här fönstret på din egen skärm för talaranteckningarna.</Text>
        </VStack>
        {error && <Banner role="alert" status="error" title={error} />}
        {popupError && <Banner role="alert" status="error" title="Publikvyn behöver öppnas manuellt" description={
          <VStack gap={3}>
            <Text as="p">{popupError}</Text>
            <Link href={audienceHref} target="_blank" rel="noopener" hasUnderline>Öppna publikvyn i en ny flik</Link>
          </VStack>
        } />}
        {!syncAvailable && <Banner role="alert" status="warning" title="Bildbyten kan inte delas mellan fönstren" description="Webbläsaren blockerar lokal lagring. Du kan fortsätta här och byta bild direkt i publikfönstret med knapparna eller piltangenterna." />}
        {audienceOpened && <Text as="p" role="status" color="secondary">Publikvyn öppnades i ett separat fönster. Flytta det till projektorn.</Text>}
        <SlideCanvas slide={slide} />
        {controls}
        <VStack as="section" gap={4} maxWidth="72ch" aria-labelledby="speaker-notes-title">
          <Heading level={2} id="speaker-notes-title">Talaranteckningar</Heading>
          {slide.notes?.length ? slide.notes.map(note => <Text key={note} as="p" type="large" weight="normal">{note}</Text>) :
            <Text as="p" color="secondary">Det finns inga talaranteckningar för den här bilden.</Text>}
          {index < total - 1 && <Text as="p" color="secondary">Nästa bild: {presentation.slides[index + 1].title}</Text>}
          <Text as="p" type="supporting" color="secondary">Byt bild med knapparna eller piltangenterna. Bildbyten delas mellan fönster i samma webbläsare när lokal lagring är tillgänglig. Talaranteckningarna visas bara i presentatörsvyn.</Text>
        </VStack>
      </VStack>}
    </VStack>;
}
