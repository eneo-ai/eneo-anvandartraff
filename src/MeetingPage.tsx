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
import { Grid } from '@astryxdesign/core/Grid';
import { List, ListItem } from '@astryxdesign/core/List';
import { Link } from '@astryxdesign/core/Link';
import { Button } from '@astryxdesign/core/Button';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { meeting, pages, technicalTrackPresentation, presentations, resources, solutionExamples, exampleCategories, moduleMarketplace, type SolutionExample, type PageId, type Presentation, type HtmlPresentation } from './content';
import { PresentationLibrary, PresentationPage } from './Presentations';
import { ProjectionView } from './Projection';
import { Programme } from './Programme';
import { LibraryCard } from './LibraryCard';

type Route = { kind: 'page'; id: PageId }
  | { kind: 'example'; example: SolutionExample }
  | { kind: 'presentation'; presentation: Presentation }
  | { kind: 'slide'; presentation: HtmlPresentation; index: number }
  | { kind: 'projection'; presentation: HtmlPresentation; mode: 'audience' | 'presenter'; initialIndex?: number }
  | { kind: 'missing' };

const contentAnchor = '#astryx-app-shell-main';

function readRoute(): Route {
  const path = window.location.hash === contentAnchor ? 'oversikt' : window.location.hash.slice(1) || 'oversikt';
  const page = pages.find(page => page.id === path);
  if (page) return { kind: 'page', id: page.id };
  const exampleMatch = /^exempel\/([a-z-]+)$/.exec(path);
  const example = exampleMatch && solutionExamples.find(item => item.id === exampleMatch[1]);
  if (example) return { kind: 'example', example };
  const projection = /^(visa|presentator)\/([a-z-]+)(?:\/([1-9][0-9]*))?$/.exec(path);
  const projectedPresentation = projection && presentations.find(item => item.id === projection[2]);
  const projectedIndex = projection?.[3] ? Number(projection[3]) - 1 : undefined;
  if (projectedPresentation?.format === 'html' && (projectedIndex === undefined || projectedIndex < projectedPresentation.slides.length)) return {
    kind: 'projection', presentation: projectedPresentation,
    mode: projection?.[1] === 'presentator' ? 'presenter' : 'audience',
    initialIndex: projectedIndex,
  };
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
        <Link href={`#presentation/${technicalTrackPresentation.id}`} isStandalone hasUnderline>Öppna presentationen: {technicalTrackPresentation.title}</Link>
        <Text as="p" type="supporting">Bildspel för teknikspåret med talaranteckningar och presentatörsvy.</Text>
      </VStack>
    </Grid>
    <List header={<Heading level={2}>Hitta materialet</Heading>} density="spacious" hasDividers edge="flush">
      <ListItem href="#program" label={<Text weight="semibold">Program</Text>} description={<Text color="secondary">Tider, gemensamma pass och båda spåren.</Text>} />
      <ListItem href="#exempel" label={<Text weight="semibold">Moduler och integrationer</Text>} description={<Text color="secondary">Tal till text som Eneo-modul och API-integrationer från Sundsvall.</Text>} />
      <ListItem href="#presentationer" label={<Text weight="semibold">Presentationer</Text>} description={<Text color="secondary">Bildspel och underlag att öppna på dator eller telefon.</Text>} />
      <ListItem href="#lankar" label={<Text weight="semibold">Länkar</Text>} description={<Text color="secondary">Kod och resurser för att utforska vidare.</Text>} />
    </List>
  </>;
}

function ExamplesLibrary() {
  return <VStack gap={10}>
    <Opening title="Moduler och integrationer" description="Se vad vi kan återanvända och bygga vidare på tillsammans. Här finns Eneo-moduler och exempel på verksamhetslösningar som ansluter via API." />
    {exampleCategories.map(category => <VStack key={category.kind} gap={6}>
      <VStack gap={3} maxWidth="72ch">
        <Heading level={2}>{category.title}</Heading>
        <Text as="p">{category.description}</Text>
      </VStack>
      <Grid columns={{ minWidth: 280, max: 3 }} gap={6}>
        {solutionExamples.filter(example => example.kind === category.kind).map(example => <LibraryCard key={example.id}
          title={example.title} description={example.summary} cover={example.cover} headingLevel={3}
          href={`#exempel/${example.id}`} detail={example.kind === 'module' ? example.availability.label : 'Läs om integrationen'} />)}
      </Grid>
    </VStack>)}
    <VStack gap={3} maxWidth="72ch">
      <Heading level={2}>{moduleMarketplace.title}</Heading>
      <Text as="p">{moduleMarketplace.description}</Text>
      <Text as="p">{moduleMarketplace.nextStep}</Text>
    </VStack>
    <Text as="p" type="supporting">Bilderna är illustrationer av användningsområdena. Beskrivningarna bygger på projektens öppna dokumentation.</Text>
  </VStack>;
}

function ExamplePage({ example }: { example: SolutionExample }) {
  return <VStack gap={8}>
    <Link href="#exempel" hasUnderline>Alla moduler och integrationer</Link>
    <Opening title={example.title} description={example.summary} />
    <VStack gap={6} maxWidth="72ch">
      {example.kind === 'module'
        ? <VStack gap={2}>
          <Text as="p" weight="semibold">{example.availability.label}</Text>
          <Text as="p">{example.availability.description}</Text>
        </VStack>
        : <Text as="p" type="supporting">API-integration från Sundsvalls kommun.</Text>}
      <img src={example.cover} alt="" width={1200} height={675} decoding="async"
        style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />
      <VStack gap={3}>
        <Heading level={2}>Vad lösningen gör</Heading>
        <Text as="p">{example.description}</Text>
      </VStack>
      <VStack gap={3}>
        <Heading level={2}>Så hänger det ihop</Heading>
        <Text as="p">{example.connection}</Text>
      </VStack>
      <List header={<Heading level={2}>Idéer att ta med</Heading>} listStyle="disc" edge="flush" density="spacious">
        {example.inspiration.map(idea => <ListItem key={idea} label={<Text>{idea}</Text>} />)}
      </List>
      <Link href={example.href} hasUnderline isStandalone>Utforska {example.title} på GitHub</Link>
      {example.kind === 'module' && <VStack gap={3}>
        <Link href={example.productUrl} hasUnderline isStandalone>Läs om {example.title}</Link>
        <Link href={example.documentationUrl} hasUnderline isStandalone>Kom igång med modulen</Link>
      </VStack>}
      <Text as="p" type="supporting">Diskussionsunderlag baserat på projektets dokumentation. Beskrivningen gäller tillgänglig kod; aktuell produktionsdrift är inte verifierad.</Text>
    </VStack>
  </VStack>;
}

function Links() {
  return <>
    <Opening title="Länkar och resurser" description="Kod och material för att förbereda dig och fortsätta utforska efter träffen." />
    <Link href="#exempel" hasUnderline isStandalone>Utforska Eneo-moduler och API-integrationer</Link>
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

function PageContent({ route }: { route: Exclude<Route, { kind: 'projection' }> }) {
  if (route.kind === 'example') return <ExamplePage example={route.example} />;
  if (route.kind === 'slide') return <PresentationPage presentation={route.presentation} index={route.index} />;
  if (route.kind === 'presentation') return <PresentationPage presentation={route.presentation} />;
  if (route.kind === 'missing') return <>
    <Opening title="Sidan finns inte" description="Länken pekar på ett avsnitt eller en bild som inte finns. Gå tillbaka till översikten för att hitta materialet." />
    <Link href="#oversikt" hasUnderline>Till översikten</Link>
  </>;
  switch (route.id) {
    case 'oversikt': return <Overview />;
    case 'program': return <Programme />;
    case 'exempel': return <ExamplesLibrary />;
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
  const activeId = route.kind === 'slide' || route.kind === 'presentation' ? 'presentationer'
    : route.kind === 'example' ? 'exempel' : route.kind === 'page' ? route.id : undefined;
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
    const title = route.kind === 'projection' ? route.presentation.title : pageHeading?.textContent ?? meeting.title;
    document.title = `${title} · Eneo 17 november`;
    if (heading) {
      heading.tabIndex = -1;
      if (!firstRender.current) heading.focus({ preventScroll: true });
    }
    firstRender.current = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);
  if (route.kind === 'projection') return <ProjectionView presentation={route.presentation} mode={route.mode} initialIndex={route.initialIndex} />;
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
