# Eneo användarträff

Publik mötessajt inför Eneos användarträff den **17 november 2026** i Solna, med fokus på teknikspåret.

**[Öppna mötessajten](https://eneo-anvandartraff.sundsvall.dev)**

Här samlas program, presentationer och länkar. Besökare kan läsa materialet på telefon och dator. Innehållet uppdateras i repot.

## Ändra innehållet

[`src/content.ts`](src/content.ts) äger datum, navigation, program, presentationer och länkar. Lägg dokument i `public/` och länka till dem med `/filnamn.pdf`.

Programmet är återgivet från [`public/program.pdf`](public/program.pdf). Bildspelet om utveckling med AI är ett första diskussionsunderlag från förberedelserna inför träffen, inte arrangörernas presentation.

Varje avsnitt, presentation och presentationsbild har en egen delbar adress, till exempel `/#teknikspar`, `/#presentation/utveckling-med-ai` och `/#presentation/utveckling-med-ai/1`. Presentationsbiblioteket visar klickbara kort med omslagsbild och rubrik. HTML-bildspel kan styras med föregående/nästa eller piltangenter och visas i helskärm där webbläsaren stöder det. Esc lämnar helskärm.

### Lägg till en presentation

Varje presentation i `presentations` har `id`, `title`, `description` och `cover`. Omslaget länkar till en bild under `public/`.

- `format: 'html'`: ange minst en bild i `slides` för sajtens inbyggda HTML-bildspel.
- `format: 'html-file'`: lägg en fristående HTML-presentation i `public/presentations/` och ange dess adress i `file`. Den visas i en inbäddad vy med helskärm och kan öppnas separat.
- `format: 'pptx'`: lägg PowerPoint-filen i `public/presentations/` och ange dess adress i `file`. Presentationssidan visar omslaget och en nedladdningslänk. Filen visas i PowerPoint; ingen tredjepartsvisare tar emot materialet.

Det första diskussionsunderlaget är HTML. Ingen PPTX-fil har levererats ännu.

## Teknik och ägare

- React, TypeScript och Astryx. Dokumentationsmallen från Astryx äger innehållsramen.
- `src/MeetingPage.tsx` äger sidram, navigation och mötets innehållsvyer.
- `src/Presentations.tsx` äger bibliotek, presentationssidor och visning av HTML/PPTX.
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
