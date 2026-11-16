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
  { id: 'exempel', title: 'Exempel från Sundsvall' },
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

export type FilePresentation = PresentationMetadata & (
  | { format: 'pptx'; file: string }
  | { format: 'html-file'; file: string; presenterUrl?: string }
);

export type Presentation = HtmlPresentation | FilePresentation;

export const technicalTrackQuestions = [
  'Vilka ändringar behöver alltid mänsklig detaljgranskning?',
  'Hur får vi AI-granskningen att utmana lösningens antaganden?',
  'Hur behåller vi förmågan att felsöka och vidareutveckla systemet?',
] as const;

export const technicalTrackPresentation: FilePresentation = {
  id: 'hur-eneo-utvecklas-med-ai',
  title: 'Hur Eneo utvecklas med hjälp av AI',
  description: 'Teknikspåret den 17 november 2026. Bildspel om vårt arbetssätt med AI och det praktiska passet, med talaranteckningar och egen presentatörsvy.',
  cover: '/presentations/utveckling-med-ai.svg',
  format: 'html-file',
  file: '/presentations/hur-eneo-utvecklas-med-ai.html',
  presenterUrl: '/presentations/hur-eneo-utvecklas-med-ai.html?presenter',
};

export const presentations: readonly Presentation[] = [technicalTrackPresentation];

export interface IntegrationExample {
  id: string;
  title: string;
  summary: string;
  cover: string;
  description: string;
  connection: string;
  inspiration: readonly string[];
  href: string;
}

// Verified against each public repository's README on 2026-11-16.
// These describe the available code, not confirmed production deployments.
export const sundsvallExamples: readonly IntegrationExample[] = [
  {
    id: 'scenario',
    title: 'Scenarioverktyget',
    summary: 'Utforska livsval tillsammans. AI låter berättelsen följa gruppens beslut.',
    cover: '/integrations/scenario.jpg',
    description: 'Ett verktyg för vuxenledda samtal med unga om livsval och konsekvenser. Gruppen väljer hur en berättelse ska fortsätta, och AI anpassar scenariot efter valen. Verktyget är avsett att användas med en utbildad samtalsledare.',
    connection: 'Med livet som insats är en verksamhetsnära webbapplikation byggd på Eneo. Det egna gränssnittet formar upplevelsen kring berättelsen, gruppens val och samtalsledarens roll.',
    inspiration: [
      'Låt AI bli en del av en gemensam aktivitet där människor diskuterar och väljer tillsammans.',
      'Utgå från en konkret situation i verksamheten och anpassa gränssnittet till den.',
    ],
    href: 'https://github.com/Sundsvallskommun/web-app-scenario',
  },
  {
    id: 'serviceassistent',
    title: 'Serviceassistenten',
    summary: 'Gör AI-hjälpen tillgänglig direkt på webbplatsen där frågan uppstår.',
    cover: '/integrations/serviceassistent.jpg',
    description: 'En AI-assistent som kan köras fristående eller bäddas in i en webbplats. Assistent, texter och utseende konfigureras för sammanhanget. Repot har också stöd för att föra över bygget till en Sitevision-webbapp.',
    connection: 'En återanvändbar webbmodul för att möta användaren där den redan befinner sig. Vilken assistent och API-adress den ansluter till styrs av konfigurationen.',
    inspiration: [
      'Lägg en avgränsad assistent där användaren redan söker information, till exempel på intranätet.',
      'Anpassa frågor och texter till målgruppen samtidigt som webbmodulen återanvänds.',
    ],
    href: 'https://github.com/Sundsvallskommun/web-app-ai-service-module-2',
  },
  {
    id: 'confluence',
    title: 'Confluence till Eneo',
    summary: 'Låt befintlig dokumentation bli ett kunskapsunderlag som uppdateras när källan ändras.',
    cover: '/integrations/confluence.jpg',
    description: 'Samlar in och synkroniserar innehåll från Confluence till Eneos kunskapsbaser. Ändringar hanteras genom webhooks och schemalagda jobb som bearbetar och laddar upp innehållet.',
    connection: 'AI Data Collector kopplar ihop källsystemet Confluence med Eneos kunskapsbaser. Dokumentationen kan fortsätta förvaltas där den redan finns, medan integrationen för över innehållet till Eneo.',
    inspiration: [
      'Bygg vidare på den dokumentation som verksamheten redan underhåller.',
      'Undersök vilka andra kunskapskällor som skulle kunna synkroniseras på ett liknande sätt.',
    ],
    href: 'https://github.com/Sundsvallskommun/api-service-ai-data-collector',
  },
  {
    id: 'self-service',
    title: 'Self Service AI',
    summary: 'Koppla frågor om fakturor och förbrukning till uppgifter i verksamhetens system.',
    cover: '/integrations/self-service.jpg',
    description: 'Samordnar sessioner och frågor till en AI-assistent om kundens fakturor och förbrukning. Tjänsten kopplar samman Eneo med API:er för bland annat kunder, avtal, anläggningar, mätdata och fakturor.',
    connection: 'Eneo kopplas till verksamhetsdata från flera system för att ge assistenten sammanhang kring kundens fråga. Repot beskriver också kopplingen till Lime för chatthistorik.',
    inspiration: [
      'Utgå från återkommande kundfrågor och identifiera vilka uppgifter som behövs för att besvara dem.',
      'Utforska hur flera befintliga API:er kan bidra till en sammanhängande självservicetjänst.',
    ],
    href: 'https://github.com/Sundsvallskommun/api-service-self-service-ai',
  },
];

export const resources = [
  { title: 'Tal till text – Eneo-modul', description: 'Spela in ett samtal eller ladda upp en ljudfil och låt ett publicerat Eneo-flöde omvandla ljudet till text. Modulen finns under eneo-ai.', href: 'https://github.com/eneo-ai/eneo-mod-speech-to-text' },
  { title: 'Eneo på GitHub', description: 'Källkod, ärenden och utveckling av Eneo.', href: 'https://github.com/eneo-ai/eneo' },
  { title: 'Eneo-ai', description: 'Organisationens projekt och kodförråd.', href: 'https://github.com/eneo-ai' },
  { title: 'Mötessajtens källkod', description: 'Innehåll och kod för den här sidan. Här fyller vi på materialet.', href: 'https://github.com/eneo-ai/eneo-anvandartraff' },
] as const;
