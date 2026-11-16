import { useEffect, useState, type CSSProperties } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { Heading, Text } from '@astryxdesign/core/Text';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { Button } from '@astryxdesign/core/Button';
import { Link } from '@astryxdesign/core/Link';
import { Banner } from '@astryxdesign/core/Banner';
import { meeting, programme, type ProgrammeEntry } from './content';
import { programmeTheme } from './astryx-themes';
import { usePresentationFullscreen } from './presentation-session';

type Session = Extract<ProgrammeEntry, { kind: 'shared' }>['session'];

const cellStyle: CSSProperties = {
  padding: 'var(--spacing-3)',
  border: 'var(--programme-grid-line) solid var(--programme-paper)',
  verticalAlign: 'top',
};

const trackLabelStyle: CSSProperties = {
  fontSize: 'var(--programme-label-size)',
  letterSpacing: 'var(--programme-label-tracking)',
  textTransform: 'uppercase',
};

function SessionText({ session, shared = false }: { session: Session; shared?: boolean }) {
  return <VStack gap={1} style={{ minWidth: 0 }}>
    <Text weight="semibold" color="inherit" style={{ fontSize: 'var(--programme-session-size)', lineHeight: '1.35' }}>{session.title}</Text>
    {session.detail && <Text color="inherit" style={{
      fontSize: 'var(--programme-session-size)',
      color: shared ? 'var(--programme-shared-detail)' : 'var(--color-text-secondary)',
      lineHeight: '1.4',
    }}>{session.detail}</Text>}
  </VStack>;
}

function SharedSession({ session }: { session: Session }) {
  return <HStack gap={3} wrap="wrap" vAlign="start">
    <Text weight="bold" color="inherit" style={{ ...trackLabelStyle, color: 'var(--programme-shared-label)', paddingBlockStart: 'var(--spacing-1)' }}>Gemensamt</Text>
    <SessionText session={session} shared />
  </HStack>;
}

function TechnicalSession({ session }: { session: Session | null }) {
  return session ? <SessionText session={session} /> :
    <Text color="secondary" aria-label="Inget separat teknikpass i programmet">—</Text>;
}

function ScheduleTable() {
  return <Table density="balanced" dividers="none" aria-label="Dagens program med huvudspår och teknikspår" style={{
    width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse',
  }}>
    <colgroup>
      <col style={{ width: 'var(--programme-time-width)' }} />
      <col span={2} style={{ width: 'calc((100% - var(--programme-time-width)) / 2)' }} />
    </colgroup>
    <TableHeader>
      <TableRow>
        <TableHeaderCell scope="col" style={{ ...cellStyle, maxWidth: 'none' }}>
          <Text weight="semibold" color="secondary">Tid</Text>
        </TableHeaderCell>
        <TableHeaderCell scope="col" style={{ ...cellStyle, backgroundColor: 'var(--programme-main-header)', color: 'var(--programme-paper)' }}>
          <Text weight="bold" color="inherit" style={trackLabelStyle}>Huvudspår</Text>
        </TableHeaderCell>
        <TableHeaderCell scope="col" style={{ ...cellStyle, backgroundColor: 'var(--programme-technical-header)', color: 'var(--programme-ink)' }}>
          <Text weight="bold" color="inherit" style={trackLabelStyle}>Teknikspår – för utvecklare</Text>
        </TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {programme.map(entry => <TableRow key={entry.time}>
        <TableHeaderCell scope="row" style={{
          ...cellStyle,
          maxWidth: 'none',
          whiteSpace: 'normal',
          backgroundColor: entry.kind === 'shared' ? 'var(--programme-shared)' : 'var(--programme-paper)',
          color: entry.kind === 'shared' ? 'var(--programme-paper)' : 'var(--programme-ink)',
        }}>
          <Text hasTabularNumbers weight="semibold" color="inherit" style={{ fontSize: 'var(--programme-session-size)' }}>{entry.time}</Text>
        </TableHeaderCell>
        {entry.kind === 'shared' ? <TableCell colSpan={2} style={{ ...cellStyle, backgroundColor: 'var(--programme-shared)', color: 'var(--programme-paper)' }}>
          <SharedSession session={entry.session} />
        </TableCell> : <>
          <TableCell style={{ ...cellStyle, backgroundColor: 'var(--programme-main-surface)' }}>
            <SessionText session={entry.main} />
          </TableCell>
          <TableCell style={{ ...cellStyle, backgroundColor: 'var(--programme-technical-surface)' }}>
            <TechnicalSession session={entry.technical} />
          </TableCell>
        </>}
      </TableRow>)}
    </TableBody>
  </Table>;
}

function StackedSchedule() {
  return <VStack as="ol" gap={0} aria-label="Dagens program med huvudspår och teknikspår" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
    {programme.map(entry => <HStack as="li" key={entry.time} gap={0} vAlign="stretch" style={{
      borderBlockEnd: 'var(--programme-grid-line) solid var(--programme-paper)',
      backgroundColor: entry.kind === 'shared' ? 'var(--programme-shared)' : 'var(--programme-paper)',
      color: entry.kind === 'shared' ? 'var(--programme-paper)' : 'var(--programme-ink)',
    }}>
      <VStack paddingBlock={3} paddingInline={2} width="var(--programme-compact-time-width)" style={{ flexShrink: 0 }}>
        <Text hasTabularNumbers weight="semibold" color="inherit" style={{ fontSize: 'var(--programme-session-size)' }}>{entry.time}</Text>
      </VStack>
      {entry.kind === 'shared' ? <VStack padding={3} style={{ flex: 1, minWidth: 0 }}>
        <SharedSession session={entry.session} />
      </VStack> : <VStack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <VStack gap={2} padding={3} style={{ backgroundColor: 'var(--programme-main-surface)' }}>
          <Text weight="bold" style={{ ...trackLabelStyle, color: 'var(--programme-main-header)' }}>Huvudspår</Text>
          <SessionText session={entry.main} />
        </VStack>
        <VStack gap={2} padding={3} style={{ backgroundColor: 'var(--programme-technical-surface)' }}>
          <Text weight="bold" style={{ ...trackLabelStyle, color: 'var(--programme-ink)' }}>Teknikspår – för utvecklare</Text>
          <TechnicalSession session={entry.technical} />
        </VStack>
      </VStack>}
    </HStack>)}
  </VStack>;
}

export function Programme() {
  const { ref, fullscreen, supported, error, toggle } = usePresentationFullscreen();
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    // Measure the actual content area: the navigation still occupies space on iPad.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const minimumRem = Number.parseFloat(getComputedStyle(frame).getPropertyValue('--programme-wide-min-rem'));
      setWide(entry.contentRect.width >= minimumRem * rootFontSize);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [ref]);

  return <Theme theme={programmeTheme} mode="light">
    <VStack ref={ref} gap={6} width="100%" style={{ minWidth: 0, backgroundColor: 'var(--programme-paper)', color: 'var(--programme-ink)' }}>
      <VStack as="header" gap={5}>
        <HStack gap={4} hAlign="between" vAlign="center" wrap="wrap">
          <img src="/eneo-logo.svg" alt="Eneo" style={{ height: 'var(--spacing-8)', width: 'auto', display: 'block' }} />
          <HStack gap={4} vAlign="center" wrap="wrap">
            <Link href="/program.pdf" hasUnderline>Originalprogram (PDF)</Link>
            {supported && <Button label={fullscreen ? 'Lämna helskärm' : 'Helskärm'} clickAction={toggle} />}
          </HStack>
        </HStack>
        <VStack gap={2}>
          <Heading level={1} id="page-title" style={{ fontSize: 'var(--programme-title-size)', lineHeight: '1.1' }}>Dagens program</Heading>
          <Text as="p" color="secondary">{meeting.date} · {meeting.time}</Text>
        </VStack>
        <HStack gap={5} wrap="wrap" padding={4} style={{ backgroundColor: 'var(--programme-main-surface)' }}>
          <VStack gap={1} style={{ flex: '1 1 16rem', minWidth: 0 }}>
            <Text weight="bold" color="accent" style={trackLabelStyle}>Plats</Text>
            <Text weight="semibold">{meeting.location} · {meeting.address}</Text>
          </VStack>
          <VStack gap={1} style={{ flex: '1 1 16rem', minWidth: 0 }}>
            <Text weight="bold" color="accent" style={trackLabelStyle}>Innan vi börjar</Text>
            <Text weight="semibold">{meeting.coffee}</Text>
          </VStack>
        </HStack>
      </VStack>
      {error && <Banner role="alert" status="error" title={error} />}
      {wide ? <ScheduleTable /> : <StackedSchedule />}
      <HStack as="footer" gap={4} hAlign="between" wrap="wrap">
        <Text as="p" type="supporting">Återgivet från arrangörernas inbjudan.</Text>
        <Link href="#teknikspar" hasUnderline>Förberedelser för teknikspåret</Link>
      </HStack>
    </VStack>
  </Theme>;
}
