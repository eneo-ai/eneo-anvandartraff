# Eneo användarträff

Publik mötessajt inför Eneos användarträff den **17 november 2026** i Solna, med fokus på teknikspåret.

**[Öppna mötessajten](https://eneo-anvandartraff.sundsvall.dev)**

Här samlas program, presentationer och länkar. Besökare kan läsa materialet på telefon och dator. Innehållet uppdateras i repot.

## Ändra innehållet

[`src/content.ts`](src/content.ts) äger datum, navigation, program, presentationer och länkar. Lägg dokument i `public/` och länka till dem med `/filnamn.pdf`.

Programmet är återgivet från [`public/program.pdf`](public/program.pdf). Bildspelet om utveckling med AI är ett första diskussionsunderlag från förberedelserna inför träffen, inte arrangörernas presentation.

Varje avsnitt och varje presentationsbild har en egen delbar adress, till exempel `/#teknikspar` och `/#presentation/utveckling-med-ai/1`. Bildspelet kan styras med föregående/nästa eller piltangenter på dator.

## Teknik och ägare

- React, TypeScript och Astryx. Dokumentationsmallen från Astryx äger innehållsramen.
- `src/MeetingPage.tsx` äger sidram, navigation, innehållsvyer och bildspel.
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
