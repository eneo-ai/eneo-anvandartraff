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

export const resources = [
  { title: 'Eneo på GitHub', description: 'Källkod, ärenden och utveckling av Eneo.', href: 'https://github.com/eneo-ai/eneo' },
  { title: 'Eneo-ai', description: 'Organisationens projekt och kodförråd.', href: 'https://github.com/eneo-ai' },
  { title: 'Mötessajtens källkod', description: 'Innehåll och kod för den här sidan. Här fyller vi på materialet.', href: 'https://github.com/eneo-ai/eneo-anvandartraff' },
] as const;
