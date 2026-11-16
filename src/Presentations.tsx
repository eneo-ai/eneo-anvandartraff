import { useRef, useState, type CSSProperties } from 'react';
import { Heading, Text } from '@astryxdesign/core/Text';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { LibraryCard } from './LibraryCard';
import { Card } from '@astryxdesign/core/Card';
import { List, ListItem } from '@astryxdesign/core/List';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { Icon } from '@astryxdesign/core/Icon';
import { Banner } from '@astryxdesign/core/Banner';
import { Theme } from '@astryxdesign/core/theme';
import { presentations, type HtmlPresentation, type FilePresentation, type Presentation, type Slide } from './content';
import { projectionTheme } from './astryx-themes';
import { usePresentationFullscreen, useSlideKeyboard } from './presentation-session';

const coverImage: CSSProperties = { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' };

export function PresentationLibrary() {
  return <VStack gap={8}>
    <VStack gap={4} maxWidth="72ch">
      <Heading level={1} id="page-title">Presentationer</Heading>
      <Text as="p" type="large" color="secondary">Öppna en presentation för att visa bildspelet, gå till helskärm eller hämta en PowerPoint-fil. Materialet fylls på efter hand.</Text>
    </VStack>
    <Grid columns={{ minWidth: 280, max: 3 }} gap={6}>
      {presentations.map(presentation => <LibraryCard key={presentation.id}
        title={presentation.title} description={presentation.description} cover={presentation.cover}
        href={`#presentation/${presentation.id}`}
        detail={presentation.format === 'pptx' ? 'PowerPoint · PPTX' : 'HTML · Bildspel i webbläsaren'} />)}
    </Grid>
    <Text as="p" type="supporting">Fler presentationer och dokument läggs till inför och efter träffen.</Text>
  </VStack>;
}

export function SlideCanvas({ slide, large = false, headingLevel = 2 }: { slide: Slide; large?: boolean; headingLevel?: 1 | 2 }) {
  const content = <VStack className="slide-canvas" gap={large ? 8 : 6} width="100%" maxWidth={large ? '100%' : '72ch'}>
    <Heading level={headingLevel} type="display-3" id="slide-title" textWrap="balance">{slide.title}</Heading>
    <Text as="p" type="large" weight="normal">{slide.opening}</Text>
    <List listStyle="disc" edge="flush" density="spacious">
      {slide.points.map(point => <ListItem key={point} label={<Text type="large" weight="normal">{point}</Text>} />)}
    </List>
  </VStack>;

  return <Card variant="gray" padding={large ? 8 : 6} width="100%" minHeight={large ? 'auto' : '22rem'}>
    {large ? <Theme theme={projectionTheme} mode="light">{content}</Theme> : content}
  </Card>;
}

function WebPresentation({ presentation, index }: { presentation: HtmlPresentation | FilePresentation; index: number }) {
  const embeddedFrame = useRef<HTMLIFrameElement>(null);
  const filePresentation = presentation.format === 'html-file' ? presentation : undefined;
  const { ref: frame, fullscreen, supported, error, toggle } = usePresentationFullscreen(filePresentation ? embeddedFrame : undefined);
  const [copiedLink, setCopiedLink] = useState('');
  const [shareError, setShareError] = useState('');
  const [fileReady, setFileReady] = useState(false);
  const [presenterError, setPresenterError] = useState('');
  const [presenterOpened, setPresenterOpened] = useState(false);
  const slides = presentation.format === 'html' ? presentation.slides : undefined;
  const href = (slideIndex: number) => `#presentation/${presentation.id}/${slideIndex + 1}`;

  useSlideKeyboard({ index, total: slides?.length ?? 0, onSelect: slideIndex => { window.location.hash = href(slideIndex); } });

  function openFilePresenter() {
    if (!filePresentation?.presenterUrl) return;
    setPresenterError('');
    setPresenterOpened(false);
    try {
      const url = new URL(filePresentation.presenterUrl, window.location.href);
      url.hash = embeddedFrame.current?.contentWindow?.location.hash ?? '';
      const presenter = window.open(url.href, `eneo-presenter-${presentation.id}`, 'popup,width=1360,height=800');
      if (!presenter) {
        setPresenterError('Webbläsaren blockerade manusfönstret. Tillåt popupfönster för sidan och välj Öppna manus igen, eller använd länken nedan.');
        return;
      }
      setPresenterOpened(true);
    } catch {
      setPresenterError('Manusfönstret kunde inte öppnas. Använd länken nedan för att öppna det i en ny flik.');
    }
  }

  return <VStack ref={frame} gap={6}>
    <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
      <img src="/eneo-logo.svg" alt="Eneo" style={{ height: 'var(--spacing-6)', width: 'auto' }} />
      <HStack gap={3} wrap="wrap">
        <Button label={copiedLink === window.location.href ? 'Länk kopierad' : 'Kopiera länk'} icon={<Icon icon="copy" />} clickAction={async () => {
          const link = window.location.href;
          setShareError('');
          try { await navigator.clipboard.writeText(link); setCopiedLink(link); }
          catch { setShareError('Kopiera adressen från webbläsaren för att dela presentationen.'); }
        }} />
        {filePresentation?.presenterUrl && <Button label="Öppna manus" isDisabled={!fileReady}
          icon={<Icon icon="externalLink" />} clickAction={openFilePresenter} />}
        {supported && <Button label={fullscreen ? 'Lämna helskärm' : filePresentation ? 'Presentera i helskärm' : 'Helskärm'}
          variant={filePresentation ? 'primary' : 'secondary'} isDisabled={Boolean(filePresentation && !fileReady)} clickAction={async () => {
            await toggle();
            if (filePresentation) embeddedFrame.current?.contentWindow?.focus();
          }} />}
        {presentation.format === 'html' && <>
          <Button href={`#visa/${presentation.id}/${index + 1}`} label="Presentera" target="_blank" icon={<Icon icon="externalLink" />} />
          <Button href={`#presentator/${presentation.id}/${index + 1}`} label="Presentatörsvy" />
        </>}
        {presentation.format === 'html-file' && <Button href={presentation.file} label="Öppna separat" target="_blank" icon={<Icon icon="externalLink" />} />}
      </HStack>
    </HStack>
    {(error || shareError) && <Banner role="alert" status="error" title={error || shareError} />}
    {presenterError && filePresentation?.presenterUrl && <Banner role="alert" status="error" title="Manusvyn behöver öppnas manuellt" description={
      <VStack gap={3}>
        <Text as="p">{presenterError}</Text>
        <Link href={filePresentation.presenterUrl} target="_blank" rel="noopener" hasUnderline>Öppna manus i en ny flik</Link>
      </VStack>
    } />}
    {filePresentation?.presenterUrl && <Text as="p" type="supporting">
      Öppna manus på din egen skärm först. Visa sedan den här sidan på projektorn och välj Presentera i helskärm.
      Manusfönstrets piltangenter styr bildspelet. Esc lämnar helskärm.
    </Text>}
    {presenterOpened && <Text as="p" role="status" color="secondary">Manusfönstret öppnades. Flytta det till din egen skärm innan du startar helskärm på projektorn.</Text>}
    {presentation.format === 'html' ? <>
      <SlideCanvas slide={presentation.slides[index]} large={fullscreen} />
      <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
        <Button href={index > 0 ? href(index - 1) : undefined} label="Föregående" isDisabled={index === 0} icon={<Icon icon="chevronLeft" />} />
        <Text hasTabularNumbers>Bild {index + 1} av {presentation.slides.length}</Text>
        <Button href={index < presentation.slides.length - 1 ? href(index + 1) : undefined} label="Nästa" isDisabled={index === presentation.slides.length - 1} icon={<Icon icon="chevronRight" />} />
      </HStack>
      <Text as="p" type="supporting">Byt bild med knapparna eller piltangenterna. I presentatörsvyn kan du läsa talaranteckningar och styra ett separat publikfönster. Lämna helskärm med Esc eller knappen ovan.</Text>
    </> : <iframe ref={embeddedFrame} src={presentation.file} title={presentation.title} allowFullScreen onLoad={() => setFileReady(true)}
      style={{ width: '100%', height: fullscreen ? '100%' : '60vh', minHeight: fullscreen ? 0 : '60vh', border: 'none', backgroundColor: 'var(--color-background-surface)' }} />}
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
    </VStack> : <WebPresentation key={presentation.id} presentation={presentation} index={index} />}
  </VStack>;
}
