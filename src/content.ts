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
  { id: 'exempel', title: 'Moduler och integrationer' },
  { id: 'presentationer', title: 'Presentationer' },
  { id: 'testkonto', title: 'Testkonto' },
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

interface ExampleContent {
  id: string;
  title: string;
  summary: string;
  cover: string;
  description: string;
  connection: string;
  inspiration: readonly string[];
  href: string;
}

export type SolutionExample = ExampleContent & (
  | { kind: 'module'; availability: { label: string; description: string }; productUrl: string; documentationUrl: string }
  | { kind: 'api-integration' }
);

export const exampleCategories = [
  {
    kind: 'module',
    title: 'Moduler för Eneo',
    description: 'Återanvändbara applikationer som ansluts genom Eneos nyare modulhantering. Inloggning och behörigheter hanteras via Eneo, så att varje lösning inte behöver bygga en egen inloggning.',
  },
  {
    kind: 'api-integration',
    title: 'API-integrationer från Sundsvall',
    description: 'Verksamhetslösningar som kopplar egna gränssnitt och system till Eneo via API. De visar vad som redan har byggts i Sundsvalls kommun och använder egna integrationsupplägg utanför den nyare modulhanteringen.',
  },
] as const;

export const moduleMarketplace = {
  title: 'Mot en gemensam marknadsplats',
  description: 'Målet är en gemensam marknadsplats där kommuner och myndigheter kan dela de Eneo-moduler vi bygger. Då kan fler återanvända och vidareutveckla en lösning, i stället för att lösa samma problem på flera håll.',
  nextStep: 'Tal till text visar riktningen. Här samlar vi exempel att inspireras av på vägen mot marknadsplatsen.',
};

// Sources checked on 2026-11-16: the public repositories' documentation and
// eneo.ai/tal-till-resultat.html. Category and marketplace direction supplied by the user.
// These describe available code, not confirmed production deployments.
export const solutionExamples: readonly SolutionExample[] = [
  {
    id: 'tal-till-text',
    kind: 'module',
    title: 'Tal till text',
    summary: 'Från samtal till text och dokument, med inloggning via Eneo.',
    cover: '/integrations/tal-till-text.jpg',
    description: 'Spela in ett samtal i webbläsaren eller ladda upp en ljudfil. Ett publicerat flöde i Eneo transkriberar ljudet och kan skapa exempelvis mötesanteckningar eller ett Word-dokument. Verksamheten bestämmer flödet och var en människa ska granska resultatet.',
    connection: 'Modulen registreras i Eneos modulhantering. Användaren loggar in via Eneo och får tillgång till flöden utifrån sina behörigheter. Modulen har ett eget gränssnitt, medan Eneo hanterar inloggning, åtkomst och körning av flöden.',
    availability: {
      label: 'Under utveckling',
      description: 'Kräver Eneos nyare modul- och flödesstöd, som ännu inte ingår i en släppt version.',
    },
    inspiration: [
      'Återanvänd samma modul i flera organisationer och anpassa flödena till verksamhetens behov.',
      'Bygg på Eneos modulhantering och inloggning när ni utvecklar en ny applikation.',
      'Dela källkod och erfarenheter så att fler kan bidra till samma lösning.',
    ],
    href: 'https://github.com/eneo-ai/eneo-mod-speech-to-text',
    productUrl: 'https://eneo.ai/tal-till-resultat.html',
    documentationUrl: 'https://eneo-ai.github.io/eneo-mod-speech-to-text/kom-igang/',
  },
  {
    id: 'scenario',
    kind: 'api-integration',
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
    kind: 'api-integration',
    title: 'Serviceassistenten',
    summary: 'Gör AI-hjälpen tillgänglig direkt på webbplatsen där frågan uppstår.',
    cover: '/integrations/serviceassistent.jpg',
    description: 'En AI-assistent som kan köras fristående eller bäddas in i en webbplats. Assistent, texter och utseende konfigureras för sammanhanget. Repot har också stöd för att föra över bygget till en Sitevision-webbapp.',
    connection: 'Ett återanvändbart webbgränssnitt som ansluter till en assistent via API. Vilken assistent och API-adress det ansluter till styrs av konfigurationen. Detta är en API-integration, inte en modul registrerad i Eneos nyare modulhantering.',
    inspiration: [
      'Lägg en avgränsad assistent där användaren redan söker information, till exempel på intranätet.',
      'Anpassa frågor och texter till målgruppen samtidigt som webbgränssnittet återanvänds.',
    ],
    href: 'https://github.com/Sundsvallskommun/web-app-ai-service-module-2',
  },
  {
    id: 'confluence',
    kind: 'api-integration',
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
    kind: 'api-integration',
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

// The skill's files live in public/skills/eneo/; tools/package_skill.py builds the archive.
export const eneoSkill = {
  title: 'Låt din kodagent arbeta i Eneo',
  description: 'Eneo-skillen lär Claude Code, Codex och andra kodagenter hur Eneo fungerar. Agenten guidar dig till en API-nyckel och kan sedan förklara Eneo, skapa och testa assistenter och appar åt dig, lägga till kunskap eller hjälpa dig att bygga en egen integration.',
  downloadHref: '/skills/eneo.zip',
  guideHref: '/skills/eneo/SKILL.md',
  startPrompt: 'Ladda ner https://eneo-anvandartraff.sundsvall.dev/skills/eneo.zip och packa upp den i projektets mapp för skills (.claude/skills/ för Claude Code, annars en mapp i projektet). Läs sedan eneo/SKILL.md och följ den. Jag har ett testkonto i Eneo på https://eneo-modules.sundsvall.dev men ingen API-nyckel än. Hjälp mig att komma igång.',
  manualInstall: 'Du kan också ladda ner zip-filen själv, packa upp den i projektets mapp för skills och be agenten läsa eneo/SKILL.md.',
  examples: [
    'Skapa en upphandlingsassistent i Eneo som hjälper handläggare att granska förfrågningsunderlag mot våra riktlinjer. Välj en lämplig modell, skriv en systemprompt och testa assistenten.',
    'Förklara hur ytor, assistenter och kunskap hänger ihop i Eneo.',
    'Skapa en app som tar emot ett uppladdat protokoll och ger tillbaka besluten som en punktlista. Testa den med ett exempel.',
    'Bygg en enkel chattsida mot min assistent.',
  ],
  moduleHint: {
    text: 'Behöver du ett eget gränssnitt och egen logik räcker inte assistenter och appar. Då bygger du en modul:',
    label: 'börja i eneo-module-kit',
    href: 'https://github.com/eneo-ai/eneo-module-kit',
  },
  caveat: 'Testmiljön kör en förhandsversion av Eneo. Skillen slår upp API:et i den installation du arbetar mot, så den går att använda även mot er egen Eneo, där en del funktioner kan saknas.',
} as const;

export const resources = [
  { title: 'Eneo på GitHub', description: 'Källkod, ärenden och utveckling av Eneo.', href: 'https://github.com/eneo-ai/eneo' },
  { title: 'Eneo-ai', description: 'Organisationens projekt och kodförråd.', href: 'https://github.com/eneo-ai' },
  { title: 'Mötessajtens källkod', description: 'Innehåll och kod för den här sidan. Här fyller vi på materialet.', href: 'https://github.com/eneo-ai/eneo-anvandartraff' },
] as const;
