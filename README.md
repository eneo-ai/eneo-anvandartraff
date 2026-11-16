# Eneo användarträff

Publik mötessajt inför Eneos användarträff den **17 november 2026** i Solna, med fokus på teknikspåret.

**[Öppna mötessajten](https://eneo-anvandartraff.sundsvall.dev)**

Här samlas program, presentationer och länkar. Besökare kan läsa materialet på telefon och dator. Innehållet uppdateras i repot.

## Ändra innehållet

[`src/content.ts`](src/content.ts) äger datum, navigation, program, presentationer, Sundsvallsexempel och länkar. Lägg dokument i `public/` och länka till dem med `/filnamn.pdf`.

Programmet är återgivet från [`public/program.pdf`](public/program.pdf). Teknikspårets bildspel är den levererade HTML-presentationen om hur Eneo utvecklas med hjälp av AI.

Avsnittet `/#exempel` visar bildkort för Scenarioverktyget, Serviceassistenten, Confluence till Eneo (AI Data Collector) och Self Service AI. Varje kort leder till en egen sida, till exempel `/#exempel/scenario`, med beskrivning, integrationsupplägg, idéer att ta med och GitHub-länk. `sundsvallExamples` i innehållsregistret äger allt innehåll och bildreferenser. Uppgifterna kontrollerades mot respektive publikt repos README den 16 november 2026; de beskriver tillgänglig kod och innebär inte att produktionsdrift är bekräftad. Tal till text länkas separat under resurser eftersom det repot ligger under `eneo-ai`.

Omslagen i `public/integrations/` är AI-genererade illustrationer av användningsområdena. De är komprimerade JPEG-bilder med inbäddade bildpromptar. Generator och exakta promptar finns även i [bildregistret](.impeccable/assets/integrations.json). Lägg till ett exempel med ett unikt `id`, rubrik, kort `summary`, `cover`, beskrivning, `connection`, inspirationspunkter och en verifierad källänk.

Varje avsnitt och presentation har en egen delbar adress, till exempel `/#program` och `/#presentation/hur-eneo-utvecklas-med-ai`. Presentationsbiblioteket visar klickbara kort med omslagsbild och rubrik. HTML-bildspel kan styras med föregående/nästa eller piltangenter och visas i helskärm där webbläsaren stöder det. Esc lämnar helskärm.

### Lägg till en presentation

Varje presentation i `presentations` har `id`, `title`, `description` och `cover`. Omslaget länkar till en bild under `public/`.

- `format: 'html'`: ange minst en bild i `slides` för sajtens inbyggda HTML-bildspel.
- `format: 'html-file'`: lägg en fristående HTML-presentation i `public/presentations/` och ange dess adress i `file`. Den visas i en inbäddad vy med helskärm och kan öppnas separat. Om filen har en egen synkroniserad manusvy, ange dess adress i `presenterUrl` för att visa knappen **Öppna manus**. Båda adresserna ska ligga på sajtens egen domän; filen äger synkroniseringen.
- `format: 'pptx'`: lägg PowerPoint-filen i `public/presentations/` och ange dess adress i `file`. Presentationssidan visar omslaget och en nedladdningslänk. Filen visas i PowerPoint; ingen tredjepartsvisare tar emot materialet.

Teknikspårets presentation **Hur Eneo utvecklas med hjälp av AI** finns på `/#presentation/hur-eneo-utvecklas-med-ai`. Originalfilen ligger i `public/presentations/hur-eneo-utvecklas-med-ai.html` och registreras som `html-file`. Den innehåller 29 bilder och egna kontroller: piltangenter byter bild/steg, F växlar helskärm och P öppnar den synkroniserade presentatörsvyn med talaranteckningar. Välj **Öppna separat** för att visa presentationen utan sajtens sidram. Tryck H för samtliga kortkommandon.

Det tidigare exempelbildspelet har tagits bort. Ingen PPTX-fil har levererats ännu.

### Presentera med talaranteckningar

Teknikspårets HTML-fil är ersatt med den levererade versionen `index(6).html`. På presentationssidan:

1. Välj **Öppna manus** och flytta manusfönstret till din egen skärm. Det öppnas vid aktuell bild och aktuellt klicksteg.
2. Flytta presentationssidan till projektorn och välj **Presentera i helskärm**. Bara bildspelet fyller projektorn; manus, sidram och verktygsrad visas inte där.
3. Styr bilder och klicksteg med piltangenterna i manusfönstret. **Esc** lämnar helskärm.

Manus och helskärm startas med separata klick så att webbläsarens regler för popupfönster och helskärm kan följas. Om popupfönstret blockeras visas en länk för att öppna manus i en ny flik. Utan helskärmsstöd kan presentationen fortfarande visas inbäddad eller med **Öppna separat**. Anteckningarna redigeras i HTML-filen. **Öppna separat** följt av **P** öppnar också filens manusvy.

För inbyggda bildspel (`format: 'html'`): öppna presentationens **Presentatörsvy**. Välj **Öppna publikvy**, flytta det nya fönstret till projektorn och välj **Helskärm** i publikfönstret. Presentatörsvyn behåller förhandsvisning, kontroller och talaranteckningar på den egna skärmen. Publikvyn renderar inte anteckningarna.

Bildbyten synkroniseras mellan fönster på samma dator och i samma webbläsare via lokal lagring. Vid blockerad lagring kan bildbyten göras direkt i respektive fönster.

För inbyggda bildspel anges anteckningar i bildens valfria `notes`-fält i `src/content.ts`.

## Teknik och ägare

- React, TypeScript och Astryx. Dokumentationsmallen från Astryx äger innehållsramen.
- `src/MeetingPage.tsx` äger sidram, navigation och mötets innehållsvyer.
- `src/Presentations.tsx` äger bibliotek, presentationssidor och visning av HTML/PPTX.
- `src/LibraryCard.tsx` äger det gemensamma bildkortet för presentationer och integrationsexempel.
- `src/Projection.tsx` äger publik- och presentatörsvyn; `src/presentation-session.ts` äger bildsynkronisering, tangentbord och helskärm.
- `src/Programme.tsx` återger PDF-programmets design från samma redigerbara programdata. Det använder tabell på breda innehållsytor och staplade rader på smala.
- `src/astryx-themes.ts` äger färger och komponenternas anpassningar.
- Vite skapar statiska filer; Nginx serverar dem på port 8080 i en container.
- Ingen databas eller inloggning behövs för lässidan.

## Kontroller och drift

```sh
npm ci
npm run typecheck
npm run build
```

På den lokala utvecklingsdatorn ska potentiellt tunga kommandon köras genom resursvakten enligt `AGENTS.md`. Starta inte lokala servrar, fulla byggen eller webbläsartester utan uttrycklig begäran.

Dokploy bygger Dockerfilen från det publika repot under organisationen **Eneo-dev**. Byggsteget installerar den låsta beroendegrafen, kör typkontroll och skapar de statiska filerna. HTTPS termineras i Dokploy. Koden innehåller inga driftuppgifter eller API-nycklar. En GitHub-webhook publicerar ändringar på `main` automatiskt.

## Återställning

Återställ en innehållsändring med en Git-revert och publicera den committen via Dokploy. Applikationen har ingen beständig användardata att migrera.

## Ursprung

Sidramen är anpassad från Astryx `documentation`-mall (Meta Platforms, Inc. and affiliates, MIT). Se [`NOTICE.md`](NOTICE.md).
