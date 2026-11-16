export const meeting = {
  title: 'Eneo användarträff',
  date: '17 november 2026',
  location: 'Folkets Hus, Solna',
  address: 'Skytteholmsvägen 2',
  time: '09.00–17.00',
  coffee: 'Kaffe och macka från 08.15',
} as const;

export const pages = [
  { id: 'oversikt', title: 'Översikt' },
  { id: 'program', title: 'Program' },
  { id: 'teknikspar', title: 'Teknikspåret' },
  { id: 'presentationer', title: 'Presentationer' },
  { id: 'lankar', title: 'Länkar' },
] as const;

export type PageId = typeof pages[number]['id'];

interface Session {
  title: string;
  detail?: string;
}

export type ProgrammeEntry = { time: string } & (
  | { kind: 'shared'; session: Session }
  | { kind: 'parallel'; technical: Session | null; main: Session }
);

// Transcribed from the supplied invitation. The PDF remains the source.
export const programme: readonly ProgrammeEntry[] = [
  { time: '09.00', kind: 'shared', session: { title: 'Introduktion' } },
  { time: '09.25', kind: 'shared', session: { title: 'Praktisk info' } },
  { time: '09.30', kind: 'parallel',
    technical: { title: 'Hur Eneo utvecklas med hjälp av AI' },
    main: { title: 'Införa AI i verksamheten – från pilot till produktion', detail: 'Erfarenheter från Herrljunga och Borlänge' } },
  { time: '10.30', kind: 'shared', session: { title: 'Paus', detail: 'Smoothie serveras' } },
  { time: '10.45', kind: 'parallel', technical: null,
    main: { title: 'Säkerhet, sekretess och driftsformer', detail: 'Hellströms advokatbyrå och Sundsvall/Ånge' } },
  { time: '11.45', kind: 'shared', session: { title: 'Lunch', detail: 'Gemensam promenad till lunchrestaurangen' } },
  { time: '13.00', kind: 'parallel', technical: { title: 'Praktiskt pass – egen utveckling' },
    main: { title: 'Praktiska tillämpningar', detail: 'Skellefteå, Sundsvall, Region Västerbotten och Helsingborg' } },
  { time: '14.30', kind: 'shared', session: { title: 'Kaffe och fika' } },
  { time: '15.00', kind: 'parallel', technical: null,
    main: { title: 'KB-labb om tal till text', detail: 'Data, träning och utvärdering' } },
  { time: '15.30–17.00', kind: 'shared', session: { title: 'Med tanke på framtiden', detail: 'Framtida roadmap och samtal om vart Eneo är på väg' } },
];

export interface Slide {
  title: string;
  opening: string;
  points: readonly string[];
  notes?: readonly string[];
}

interface PresentationMetadata {
  id: string;
  title: string;
  description: string;
  cover: string;
}

export interface HtmlPresentation extends PresentationMetadata {
  format: 'html';
  slides: readonly [Slide, ...Slide[]];
}

export interface FilePresentation extends PresentationMetadata {
  format: 'pptx' | 'html-file';
  file: string;
}

export type Presentation = HtmlPresentation | FilePresentation;

export const aiPresentation: HtmlPresentation = {
  id: 'utveckling-med-ai',
  title: 'Utveckling med AI',
  description: 'Vårt arbetssätt, från arkitekturdiskussion till implementation och validering. Ett diskussionsunderlag inför teknikspåret.',
  cover: '/presentations/utveckling-med-ai.svg',
  format: 'html',
  slides: [
    { title: 'Utveckling med AI',
      opening: 'Vi lägger mer av vårt arbete på arkitektur, krav och bedömning av resultatet. AI skriver en stor del av koden.',
      points: ['Ett samtal om hur utvecklarens arbete förändras.', 'Diskussionsunderlag inför Eneos användarträff den 17 november 2026.'],
      notes: ['Börja med hur vi arbetar idag: AI är med i både diskussionen, implementationen och granskningen.', 'Säg att detta är vårt diskussionsunderlag inför träffen. Vi vill jämföra erfarenheter med andra utvecklare.'] },
    { title: 'Vi arbetar fram lösningen',
      opening: 'Arbetet börjar med att förstå problemet och diskutera hur lösningen ska passa in i systemet.',
      points: ['Vi diskuterar arkitektur, ansvar och avgränsningar.', 'Uppgiften behöver inte vara färdigspecificerad från början.', 'Lösningen växer fram i dialog med AI.'],
      notes: ['Utgå från skillnaden mellan en färdig uppgiftslapp och en dialog om vad som faktiskt behöver lösas.', 'Beskriv hur vi resonerar om ansvar och hur en förändring passar in i systemet innan implementationen tar över.', 'Här kan vi lägga in ett konkret exempel från vårt arbete.'] },
    { title: 'AI gör en stor del av implementationen',
      opening: 'När riktningen är tydlig låter vi AI skriva koden, och återkommer till lösningsval när det behövs.',
      points: ['Människan sätter riktning och bedömer resultatet.', 'Vi detaljgranskar inte varje kodrad.', 'Arbetssättet innebär en viss tillit till AI:s implementation.'],
      notes: ['Var tydlig med att vi inte går igenom varje kodrad eller varje syntaxdetalj.', 'Det intressanta är hur vi bedömer helheten och var vi väljer att granska djupare.', 'Fråga gärna deltagarna hur mycket av implementationen de själva brukar läsa.'] },
    { title: 'Vi validerar på flera sätt',
      opening: 'Vi validerar resultatet både mänskligt och med AI. Ansvaret för lösningen ligger fortfarande hos oss.',
      points: ['Mänsklig bedömning av lösningen och dess beteende.', 'AI används även för granskning och för att hitta problem.', 'Att koden fungerar och att rätt problem är löst är två saker att bedöma.'],
      notes: ['Beskriv hur mänsklig bedömning och AI-granskning kompletterar varandra i vårt arbetssätt.', 'Lyft att en tekniskt fungerande implementation fortfarande kan bygga på ett missförstått krav.', 'Ta med frågan om hur granskningen kan utmana de antaganden som lösningen byggdes på.'] },
    { title: 'Var drar vi gränsen för tilliten?',
      opening: 'Hur mycket behöver vi förstå av implementationen för att kunna ansvara för den?',
      points: ['Vilka ändringar behöver alltid mänsklig detaljgranskning?', 'Hur får vi AI-granskningen att utmana lösningens antaganden?', 'Hur behåller vi förmågan att felsöka och vidareutveckla systemet?'],
      notes: ['Lämna utrymme för diskussion och försök få fram konkreta gränsdragningar.', 'Återknyt till att vi skriver mindre av koden själva men fortfarande behöver kunna bedöma och ansvara för systemet.', 'Samla frågor som vi vill ta med till användarträffen.'] },
  ],
};

export const technicalTrackPresentation: FilePresentation = {
  id: 'hur-eneo-utvecklas-med-ai',
  title: 'Hur Eneo utvecklas med hjälp av AI',
  description: 'Teknikspåret den 17 november 2026. Bildspel om vårt arbetssätt med AI och det praktiska passet, med talaranteckningar och egen presentatörsvy.',
  cover: '/presentations/utveckling-med-ai.svg',
  format: 'html-file',
  file: '/presentations/hur-eneo-utvecklas-med-ai.html',
};

export const presentations: readonly Presentation[] = [technicalTrackPresentation, aiPresentation];

export const resources = [
  { title: 'Eneo på GitHub', description: 'Källkod, ärenden och utveckling av Eneo.', href: 'https://github.com/eneo-ai/eneo' },
  { title: 'Eneo-ai', description: 'Organisationens projekt och kodförråd.', href: 'https://github.com/eneo-ai' },
  { title: 'Mötessajtens källkod', description: 'Innehåll och kod för den här sidan. Här fyller vi på materialet.', href: 'https://github.com/eneo-ai/eneo-anvandartraff' },
] as const;
