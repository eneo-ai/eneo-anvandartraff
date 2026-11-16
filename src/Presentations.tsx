import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Heading, Text } from '@astryxdesign/core/Text';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Card } from '@astryxdesign/core/Card';
import { List, ListItem } from '@astryxdesign/core/List';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { Icon } from '@astryxdesign/core/Icon';
import { Banner } from '@astryxdesign/core/Banner';
import { presentations, type HtmlPresentation, type FilePresentation, type Presentation } from './content';

const coverImage: CSSProperties = { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' };

export function PresentationLibrary() {
  return <VStack gap={8}>
    <VStack gap={4} maxWidth="72ch">
      <Heading level={1} id="page-title">Presentationer</Heading>
      <Text as="p" type="large" color="secondary">Öppna en presentation för att visa bildspelet, gå till helskärm eller hämta en PowerPoint-fil. Materialet fylls på efter hand.</Text>
    </VStack>
    <Grid columns={{ minWidth: 280, max: 3 }} gap={6}>
      {presentations.map(presentation => <ClickableCard key={presentation.id} padding={0}
        href={`#presentation/${presentation.id}`} label={`Öppna ${presentation.title}`}>
        <img src={presentation.cover} alt="" style={coverImage} />
        <VStack gap={3} padding={5}>
          <Heading level={2}>{presentation.title}</Heading>
          <Text color="secondary">{presentation.description}</Text>
          <Text type="supporting">{presentation.format === 'pptx' ? 'PowerPoint · PPTX' : 'HTML · Bildspel i webbläsaren'}</Text>
        </VStack>
      </ClickableCard>)}
    </Grid>
    <Text as="p" type="supporting">Fler presentationer och dokument läggs till inför och efter träffen.</Text>
  </VStack>;
}

function WebPresentation({ presentation, index }: { presentation: HtmlPresentation | FilePresentation; index: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const slides = presentation.format === 'html' ? presentation.slides : undefined;
  const href = (slideIndex: number) => `#presentation/${presentation.id}/${slideIndex + 1}`;

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(document.fullscreenElement === frame.current);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  useEffect(() => {
    if (!slides) return;
    const total = slides.length;
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight' && index < total - 1) {
        event.preventDefault(); window.location.hash = href(index + 1);
      } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault(); window.location.hash = href(index - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentation, index]);

  async function toggleFullscreen() {
    setError('');
    try {
      if (document.fullscreenElement === frame.current) await document.exitFullscreen();
      else await frame.current?.requestFullscreen();
    } catch {
      setError('Helskärm kunde inte öppnas. Du kan fortsätta visa presentationen här.');
    }
  }

  return <VStack ref={frame} gap={6}>
    <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
      <img src="/eneo-logo.svg" alt="Eneo" style={{ height: 'var(--spacing-6)', width: 'auto' }} />
      <HStack gap={3} wrap="wrap">
        <Button label={copied ? 'Länk kopierad' : 'Kopiera länk'} icon={<Icon icon="copy" />} clickAction={async () => {
          try { await navigator.clipboard.writeText(window.location.href); setCopied(true); }
          catch { setError('Kopiera adressen från webbläsaren för att dela presentationen.'); }
        }} />
        {document.fullscreenEnabled && <Button label={fullscreen ? 'Lämna helskärm' : 'Helskärm'} clickAction={toggleFullscreen} />}
        {presentation.format === 'html-file' && <Button href={presentation.file} label="Öppna separat" target="_blank" icon={<Icon icon="externalLink" />} />}
      </HStack>
    </HStack>
    {error && <Banner role="alert" status="error" title={error} />}
    {presentation.format === 'html' ? <>
      <Card variant="gray" padding={6}>
        <VStack gap={6} minHeight={fullscreen ? 'auto' : '22rem'} maxWidth={fullscreen ? '90%' : '72ch'}>
          <Heading level={2} type="display-3" id="slide-title" textWrap="balance">{presentation.slides[index].title}</Heading>
          <Text as="p" type="large" weight="normal">{presentation.slides[index].opening}</Text>
          <List listStyle="disc" edge="flush" density="spacious">
            {presentation.slides[index].points.map(point => <ListItem key={point} label={<Text type="large" weight="normal">{point}</Text>} />)}
          </List>
        </VStack>
      </Card>
      <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
        <Button href={index > 0 ? href(index - 1) : undefined} label="Föregående" isDisabled={index === 0} icon={<Icon icon="chevronLeft" />} />
        <Text hasTabularNumbers>Bild {index + 1} av {presentation.slides.length}</Text>
        <Button href={index < presentation.slides.length - 1 ? href(index + 1) : undefined} label="Nästa" isDisabled={index === presentation.slides.length - 1} icon={<Icon icon="chevronRight" />} />
      </HStack>
      <Text as="p" type="supporting">Byt bild med knapparna eller piltangenterna. Lämna helskärm med Esc eller knappen ovan.</Text>
    </> : <iframe src={presentation.file} title={presentation.title} allowFullScreen
      style={{ width: '100%', minHeight: '60vh', border: 'none', backgroundColor: 'var(--color-background-surface)' }} />}
  </VStack>;
}

export function PresentationPage({ presentation, index = 0 }: { presentation: Presentation; index?: number }) {
  return <VStack gap={8}>
    <Link href="#presentationer" hasUnderline>Alla presentationer</Link>
    <VStack gap={4} maxWidth="72ch">
      <Heading level={1} id="page-title">{presentation.title}</Heading>
      <Text as="p" color="secondary">{presentation.description}</Text>
      <Text type="supporting">{presentation.format === 'pptx' ? 'PowerPoint · PPTX' : 'HTML · Bildspel i webbläsaren'}</Text>
    </VStack>
    {presentation.format === 'pptx' ? <VStack gap={5} maxWidth="48rem">
      <img src={presentation.cover} alt={`Omslag till ${presentation.title}`} style={coverImage} />
      <Link href={presentation.file} download isStandalone hasUnderline>Ladda ner PowerPoint (PPTX)</Link>
      <Text as="p">Öppna filen i PowerPoint för att visa bildspelet i helskärm eller redigera presentationen.</Text>
    </VStack> : <WebPresentation presentation={presentation} index={index} />}
  </VStack>;
}
