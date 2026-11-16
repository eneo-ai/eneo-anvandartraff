# Testkonton för användarträffen

## Syfte och ägare

Deltagaren öppnar `/#testkonto` via en länk eller QR-kod, anger arrangörens gemensamma träffkod och får ett eget konto till `https://eneo-modules.sundsvall.dev`.

Eneo äger användare, lösenordspolicy, roller och inloggning. Träffsidan återanvänder dess `POST /api/v1/admin/users/`; ingen egen användardatabas eller inloggning införs för mötets läsmaterial. `server/workshop-accounts.mjs` äger kontobeställningen och dess tillstånd. `server/http.mjs` är HTTP-adaptern och serverar även Vites filer. `src/WorkshopAccounts.tsx` äger formuläret; `src/content.ts` äger sidans plats i navigationen.

Den tidigare Nginx-processen ersätts av en Node-process på samma port, 8080. Sidramen, programmet, presentationerna och deras adresser ändras inte.

## Drift

Konfiguration sätts endast i Dokploys miljövariabler, aldrig i frontend, URL:er eller Git:

| Variabel | Innehåll |
| --- | --- |
| `WORKSHOP_CODE` | Gemensam träffkod, minst åtta tecken |
| `WORKSHOP_ENCRYPTION_KEY` | 32 slumpbyte kodade som base64; bevara samma nyckel vid omstarter |
| `WORKSHOP_CLOSES_AT` | Sista tid för nya konton, ISO-tid med tidszon |
| `WORKSHOP_MAX_ACCOUNTS` | Kontotak, initialt 150 |
| `WORKSHOP_DATABASE_PATH` | `/app/data/workshop.sqlite` |
| `ENEO_BASE_URL` | `https://eneo-modules.sundsvall.dev` |
| `ENEO_API_KEY` | Separat tidsbegränsad service-nyckel med tenant-adminbehörighet |
| `ENEO_API_KEY_HEADER` | `X-API-Key` i den aktuella testmiljön |
| `ENEO_ROLE_ID` | Den särskilda workshoprollens UUID |
| `PUBLIC_ORIGIN` | `https://eneo-anvandartraff.sundsvall.dev` |

Montera en beständig volym på `/app/data`. Kör en enda applikationsreplik. Databasen innehåller kontobeställningar och krypterade inloggningsuppgifter; Eneo lagrar själva användarna. Säkerhetskopiera volym och krypteringsnyckel tillsammans genom driftens ordinarie rutiner. Om ingen kontokonfiguration finns fungerar lässidan fortfarande och kontotjänsten rapporterar stängt. Ofullständig konfiguration stoppar starten.

Workshoprollen ger tillgång till chatt, AI, flöden, egna API-nycklar och de resurser som behövs för övningarna. Den ger inte `admin` eller `modules`; organisationsgemensam modulkonfiguration görs av arrangören. Varje konto får 50 MB lagringskvot. Den kvoten är inte ett tak för modellkostnad.

Den första lösenordsinloggningen följer Eneos ordinarie krav på att välja eget lösenord. Återhämtning på träffsidan visar det ursprungliga lösenordet; efter bytet använder deltagaren sitt nya lösenord. Träffsidan kan inte återställa det.

## Kontrakt och fel

- QR-koden innehåller enbart sidans publika adress. Träffkoden delas separat av arrangören.
- `GET /api/workshop/status` lämnar öppet/stängt, inloggningsadress och stängningstid.
- `POST /api/workshop/accounts` tar en träffkod och ett slumpmässigt UUID per webbläsarflik. Samma UUID återanvänder samma beställning, även efter omstart.
- Kontot reserveras före Eneo-anropet. Ett parallellt försök skapar inte ytterligare en användare.
- Ett osäkert svar, timeout eller avbrott blir ett uttryckligt osäkert tillstånd. Ingen automatisk omsändning av kontoskapandet görs. Arrangören får kontrollera kontot i Eneo.
- Fel träffkod, stängt kontoskapande, fullt kontotak och nekande från Eneo ger begripliga fel utan att avslöja API-svar eller nycklar.
- Endast beställningens UUID sparas i flikens `sessionStorage`. Kod och lösenord sparas inte i webbläsarlagring. Inloggningsuppgifter krypteras i serverns databas för återhämtning vid avbrutna svar.
- Stängningstiden stoppar nya konton. Den inaktiverar inte redan skapade Eneo-användare. Hantera dessa i Eneos administration med workshoprollen och e-postprefixet `traff-` som identifiering.

## Acceptans och validering

Kontrollera att rätt kod skapar ett konto med rätt roll, att fel kod inte skapar något, att dubbla försök och omstarter återger samma konto, att kontotaket och stängningstiden stoppar nyregistrering, samt att osäkra Eneo-svar aldrig automatiskt skapar ett till konto. Kontrollera även att den tidigare lässidan och den levererade presentationen fortfarande kan öppnas.

Lokala kontroller, en i taget genom resursvakten:

```sh
python3 /Users/maxeriksson/.codex/scripts/run-guarded.py --seconds 120 -- npm run typecheck
python3 /Users/maxeriksson/.codex/scripts/run-guarded.py --seconds 120 -- node --test --test-concurrency=1 server/workshop-accounts.test.mjs server/http.test.mjs
```

Backendtesterna använder en riktig tillfällig SQLite-databas och ett ersatt HTTP-anrop till Eneo; de startar ingen lokal server och skapar inga riktiga konton. Bygg och publicering sker i Dokploy. Verifiera därefter ett verkligt konto, återhämtning och inloggning mot testmiljön. Publicera aldrig testlösenord i skärmbilder eller loggar.

## Återställning

Stoppa nya konton genom stängningstiden. Vid återställning av hela ändringen: återställ kodcommitten och publicera igen, men bevara volymen och krypteringsnyckeln. Återkalla service-nyckeln i Eneo om kontotjänsten avvecklas. En återställning av mötessajten tar inte bort konton som redan skapats i Eneo.

## Lokala resultat

Typkontrollen och samtliga 16 fokuserade backendtester godkändes den 16 november 2026. Resursvakten rapporterade toppar om 258,9 MiB respektive 12,6 MiB. Ingen lokal server, fullständig byggning eller webbläsartestrunner startades. En oberoende källkodsgranskning fann inga blockerande fel; faktisk kontoregistrering och visuell kontroll verifieras på den publicerade miljön.
