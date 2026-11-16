// Layout adapted from Astryx's MIT-licensed documentation template.
// Copyright (c) Meta Platforms, Inc. and affiliates. See NOTICE.md.
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav } from '@astryxdesign/core/TopNav';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { Heading, Text } from '@astryxdesign/core/Text';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Grid } from '@astryxdesign/core/Grid';
import { List, ListItem } from '@astryxdesign/core/List';
import { Link } from '@astryxdesign/core/Link';
import { Button } from '@astryxdesign/core/Button';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { meeting, pages, aiPresentation, presentations, programme, resources, type PageId, type Presentation, type HtmlPresentation } from './content';
import { PresentationLibrary, PresentationPage } from './Presentations';

type Route = { kind: 'page'; id: PageId }
  | { kind: 'presentation'; presentation: Presentation }
  | { kind: 'slide'; presentation: HtmlPresentation; index: number }
  | { kind: 'missing' };

const contentAnchor = '#astryx-app-shell-main';

function readRoute(): Route {
  const path = window.location.hash === contentAnchor ? 'oversikt' : window.location.hash.slice(1) || 'oversikt';
  const page = pages.find(page => page.id === path);
  if (page) return { kind: 'page', id: page.id };
  const detail = /^presentation\/([a-z-]+)$/.exec(path);
  const detailPresentation = detail && presentations.find(item => item.id === detail[1]);
  if (detailPresentation) return { kind: 'presentation', presentation: detailPresentation };
  const match = /^presentation\/([a-z-]+)\/([1-9][0-9]*)$/.exec(path);
  const presentation = match && presentations.find(item => item.id === match[1]);
  const index = match ? Number(match[2]) - 1 : -1;
  return presentation && presentation.format === 'html' && index < presentation.slides.length
    ? { kind: 'slide', presentation, index }
    : { kind: 'missing' };
}

function Opening({ title, description }: { title: string; description: string }) {
  return <VStack gap={4} maxWidth="72ch">
    <Heading level={1} id="page-title" textWrap="balance">{title}</Heading>
    <Text as="p" type="large" color="secondary">{description}</Text>
  </VStack>;
}

function Overview() {
  return <>
    <Card variant="gray" padding={10}>
      <VStack gap={4} maxWidth="72ch">
        <Heading level={1} type="display-2" id="page-title" textWrap="balance">Vi ses på Eneos användarträff.</Heading>
        <Text as="p" type="large">Program, presentationer och länkar samlade på ett ställe. Med fokus på teknikspåret.</Text>
        <Text as="p" weight="semibold">{meeting.date} · {meeting.location}</Text>
        <HStack gap={3} wrap="wrap">
          <Button href="#program" label="Se dagens program" variant="primary" size="lg" />
          <Button href="#teknikspar" label="Utforska teknikspåret" size="lg" />
        </HStack>
      </VStack>
    </Card>
    <Grid columns={{ minWidth: 260, max: 2 }} gap={8}>
      <VStack gap={4}>
        <Heading level={2}>Hitta hit och kom igång</Heading>
        <Text as="p">{meeting.location}, {meeting.address}. Dagen pågår {meeting.time}. {meeting.coffee}.</Text>
        <Text as="p">Ta med egen utvecklingsdator till teknikspåret. Enligt inbjudan behöver du ha konton för GitHub och Claude Code och/eller Codex klara i förväg.</Text>
        <Link href="/program.pdf" isStandalone hasUnderline>Öppna inbjudan och programmet (PDF)</Link>
      </VStack>
      <VStack gap={4}>
        <Heading level={2}>Börja med utveckling med AI</Heading>
        <Text as="p">Hur förändras utvecklarens arbete när AI skriver en stor del av koden? Vi börjar i arkitekturen och tar med frågor om tillit och validering.</Text>
        <Link href="#presentation/utveckling-med-ai" isStandalone hasUnderline>Öppna presentationen: Utveckling med AI</Link>
        <Text as="p" type="supporting">Ett första diskussionsunderlag som vi bygger vidare på inför träffen.</Text>
      </VStack>
    </Grid>
    <List header={<Heading level={2}>Hitta materialet</Heading>} density="spacious" hasDividers edge="flush">
      <ListItem href="#program" label={<Text weight="semibold">Program</Text>} description={<Text color="secondary">Tider, gemensamma pass och båda spåren.</Text>} />
      <ListItem href="#presentationer" label={<Text weight="semibold">Presentationer</Text>} description={<Text color="secondary">Bildspel och underlag att öppna på dator eller telefon.</Text>} />
      <ListItem href="#lankar" label={<Text weight="semibold">Länkar</Text>} description={<Text color="secondary">Kod och resurser för att utforska vidare.</Text>} />
    </List>
  </>;
}

function Programme() {
  const [showBoth, setShowBoth] = useState(false);
  return <>
    <Opening title="Dagens program" description="Tisdag 17 november. Gemensamma pass och teknikspåret visas från början. Du kan också visa huvudspåret." />
    <HStack gap={4} wrap="wrap" vAlign="center">
      <Button label={showBoth ? 'Visa teknikspåret' : 'Visa även huvudspåret'} onClick={() => setShowBoth(value => !value)} />
      <Link href="/program.pdf" hasUnderline>Programmet som PDF</Link>
    </HStack>
    <List density="spacious" hasDividers edge="flush" header={<Heading level={2}>{showBoth ? 'Hela programmet' : 'Teknikspåret och gemensamma pass'}</Heading>}>
      {programme.map(entry => <ListItem key={entry.time} align="start"
        startContent={<VStack width="7rem"><Text hasTabularNumbers weight="semibold">{entry.time}</Text></VStack>}
        label={entry.kind === 'shared'
          ? <Text weight="semibold">{entry.session.title}</Text>
          : <Text weight="semibold">{entry.technical?.title ?? 'Inget separat teknikpass i programmet'}</Text>}
        description={<VStack gap={2}>
          {entry.kind === 'shared'
            ? <Text color="secondary">Gemensamt för alla{entry.session.detail ? ` · ${entry.session.detail}` : ''}</Text>
            : <>
              {entry.technical && <Text color="secondary">Teknikspåret</Text>}
              {showBoth && <Text color="secondary">Huvudspåret: {entry.main.title}{entry.main.detail ? ` · ${entry.main.detail}` : ''}</Text>}
            </>}
        </VStack>} />)}
    </List>
    <Text as="p" type="supporting">Återgivet från arrangörernas inbjudan. Se PDF-programmet för originalet.</Text>
  </>;
}

function TechnicalTrack() {
  const presentation = aiPresentation;
  return <>
    <Opening title="Teknikspåret" description="Förberedelser för samtalet om hur Eneo utvecklas med hjälp av AI, följt av ett praktiskt pass med egen utveckling." />
    <List header={<Heading level={2}>Teknikpassen</Heading>} edge="flush" hasDividers density="spacious">
      {programme.flatMap(entry => entry.kind === 'parallel' && entry.technical ? [
        <ListItem key={entry.time} startContent={<Text hasTabularNumbers weight="semibold">{entry.time}</Text>}
          label={<Text weight="semibold">{entry.technical.title}</Text>} />,
      ] : [])}
    </List>
    <Section variant="muted" padding={6}>
      <VStack gap={4} maxWidth="72ch">
        <Heading level={2}>Så arbetar vi med AI</Heading>
        <Text as="p">Vi lägger mycket av arbetet på att diskutera problemet, arkitekturen och hur lösningen ska passa in i systemet. Uppgifterna behöver inte vara färdigspecificerade från början.</Text>
        <Text as="p">Sedan låter vi AI skriva en stor del av koden. Vi validerar resultatet både mänskligt och med AI, men detaljgranskar inte varje kodrad. Det innebär en viss tillit till implementationen, samtidigt som vi behåller ansvaret för lösningen.</Text>
        <Link href={`#presentation/${presentation.id}`} hasUnderline isStandalone>Öppna presentationen</Link>
        <Text as="p" type="supporting">Diskussionsunderlag utifrån vårt samtal inför träffen.</Text>
      </VStack>
    </Section>
    <List header={<Heading level={2}>Frågor att ta med</Heading>} listStyle="disc" edge="flush" density="spacious">
      {presentation.slides[presentation.slides.length - 1].points.map(point => <ListItem key={point} label={<Text>{point}</Text>} />)}
    </List>
    <VStack gap={4} maxWidth="72ch">
      <Heading level={2}>Inför det praktiska passet</Heading>
      <Text as="p">Ta med egen dator och ha GitHub samt Claude Code och/eller Codex redo, enligt inbjudan. Passet med egen utveckling börjar 13.00.</Text>
      <Link href="#lankar" hasUnderline isStandalone>Gå till kod och länkar</Link>
    </VStack>
  </>;
}

function Links() {
  return <>
    <Opening title="Länkar och resurser" description="Kod och material för att förbereda dig och fortsätta utforska efter träffen." />
    <List header={<Heading level={2}>Projekt på GitHub</Heading>} hasDividers density="spacious" edge="flush">
      {resources.map(resource => <ListItem key={resource.href} href={resource.href}
        label={<Text weight="semibold" color="accent">{resource.title}</Text>}
        description={<Text color="secondary">{resource.description}</Text>} />)}
    </List>
    <VStack gap={4}>
      <Heading level={2}>Dokument</Heading>
      <Link href="/program.pdf" hasUnderline isStandalone>Inbjudan och programmet (PDF)</Link>
    </VStack>
  </>;
}

function PageContent({ route }: { route: Route }) {
  if (route.kind === 'slide') return <PresentationPage presentation={route.presentation} index={route.index} />;
  if (route.kind === 'presentation') return <PresentationPage presentation={route.presentation} />;
  if (route.kind === 'missing') return <>
    <Opening title="Sidan finns inte" description="Länken pekar på ett avsnitt eller en bild som inte finns. Gå tillbaka till översikten för att hitta materialet." />
    <Link href="#oversikt" hasUnderline>Till översikten</Link>
  </>;
  switch (route.id) {
    case 'oversikt': return <Overview />;
    case 'program': return <Programme />;
    case 'teknikspar': return <TechnicalTrack />;
    case 'presentationer': return <PresentationLibrary />;
    case 'lankar': return <Links />;
  }
}

// Frame and spacing from Astryx's documentation page template.
export default function MeetingPage() {
  const [route, setRoute] = useState(readRoute);
  const [menuOpen, setMenuOpen] = useState(false);
  const firstRender = useRef(true);
  const compact = useMediaQuery('(max-width: 48rem)');
  const activeId = route.kind === 'slide' || route.kind === 'presentation' ? 'presentationer' : route.kind === 'page' ? route.id : undefined;
  useEffect(() => {
    let lastPageUrl = window.location.href;
    const navigate = () => {
      // AppShell transfers focus to main; its native fragment is not a page.
      if (window.location.hash === contentAnchor) {
        window.history.replaceState(null, '', lastPageUrl);
        return;
      }
      lastPageUrl = window.location.href;
      setRoute(readRoute());
      setMenuOpen(false);
    };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    const pageHeading = document.getElementById('page-title');
    const heading = document.fullscreenElement?.querySelector<HTMLElement>('#slide-title') ?? pageHeading;
    document.title = `${pageHeading?.textContent ?? meeting.title} · Eneo 17 november`;
    if (heading) {
      heading.tabIndex = -1;
      if (!firstRender.current) heading.focus({ preventScroll: true });
    }
    firstRender.current = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);
  return <AppShell height="auto" variant="section"
    mobileNav={{ isOpen: menuOpen, onOpenChange: setMenuOpen }}
    topNav={<TopNav label="Eneo användarträff"
      heading={<Link href="#oversikt"><img src="/eneo-logo.svg" alt="Eneo" style={{ height: 'var(--spacing-6)', width: 'auto', display: 'block' }} /></Link>}
      endContent={<Text type="supporting">{compact ? '17 november' : `${meeting.date} · Solna`}</Text>} />}
    sideNav={<SideNav aria-label="Mötets avsnitt" footer={<VStack padding={4} gap={3}>
      <Text type="supporting">En samlingsplats inför och efter träffen.</Text>
      <Link href="https://github.com/eneo-ai/eneo-anvandartraff" size="sm" hasUnderline>Källkod på GitHub</Link>
    </VStack>}>
      <SideNavSection title="Användarträffen">
        {pages.map(page => <SideNavItem key={page.id} href={`#${page.id}`} label={page.title} isSelected={activeId === page.id} />)}
      </SideNavSection>
    </SideNav>}>
    <Layout height="auto" contentWidth={1200} content={<LayoutContent padding={compact ? 5 : 8}>
      <VStack gap={10}><PageContent route={route} /><Text as="p" type="supporting">Eneo användarträff · 17 november 2026 · Materialet fylls på löpande.</Text></VStack>
    </LayoutContent>} />
  </AppShell>;
}
