# Testkonton för användarträffen

## Syfte och ägare

Deltagaren öppnar `/#testkonto` via en länk eller QR-kod, anger sin egen mejladress och arrangörens gemensamma träffkod och får ett eget konto till `https://eneo-modules.sundsvall.dev`.

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

Nya testkonton får en färdig lösenfras som kan användas direkt: fem slumpmässigt valda vanliga svenska ord och fyra siffror, med bindestreck mellan delarna. Den fasta ordlistan har 256 unika ord med enbart a–z; varje ord och sifferdelen väljs oberoende med `crypto.randomInt`. Lösenfrasen är högst 59 ASCII-byte, inom Eneos gräns på 72 byte. Kontotjänsten skapar kontot med ett separat tillfälligt lösenord, loggar in som just det nya kontot och slutför Eneos ordinarie lösenordsbyte till det lösenord som visas för deltagaren. Hela kedjan har en gemensam tidsgräns på 15 sekunder. Administratörsnyckeln används bara för skapandet; lösenordsbytet använder det nya kontots egen inloggning.

Återhämtning visar det lösenord som tjänsten tidigare lämnade ut. Äldre konton kan fortfarande kräva ett byte vid första inloggning; de märks med `passwordReady: false`. Nya konton märks klara först när Eneo har godkänt lösenordsbytet. Om deltagaren själv senare byter lösenord använder hen sitt eget; tjänsten återställer det inte.

## Egen mejladress och inloggningslänk

Alla giltiga mejladresser tillåts med träffkoden; inga mejldomäner vitlistas för den lokala lösenordsinloggningen. Eneos regler för federerad inloggning ändras inte. Mejladressen används för att logga in och lösenordet visas på kontosidan; flödet skickar inget bekräftelsemejl. Adressen markeras inte som verifierad. Eneo är fortsatt slutlig ägare av mejlvalidering och unikhet.

En befintlig användare skrivs inte över. En upptagen adress ger en hänvisning till Eneos inloggning. Definitivt nekade försök kan rättas och skickas igen manuellt; skapade eller osäkra beställningar återanvänds aldrig för en annan adress. Samma flik kan återhämta sitt tidigare konto utan att ange mejladressen igen.

Öppna Eneo är en vanlig länk i samma flik både före och efter kontoskapandet, så att popupregler inte blockerar navigeringen. Kopiera inloggningsuppgifterna först. Den leder till `/login`, medan `next=/admin` kräver administratörsbehörighet efter inloggning.

## Kontrakt och fel

- QR-koden innehåller enbart sidans publika adress. Träffkoden delas separat av arrangören.
- `GET /api/workshop/status` lämnar öppet/stängt, inloggningsadress och stängningstid.
- `POST /api/workshop/accounts` tar en träffkod, en mejladress för ett nytt konto och ett slumpmässigt UUID per webbläsarflik. Återhämtning av ett tidigare konto skickar samma UUID utan mejladress, även för äldre automatiskt genererade adresser. Samma UUID återanvänder samma beställning, även efter omstart.
- Kontot reserveras före Eneo-anropet. Ett parallellt försök skapar inte ytterligare en användare.
- Ett osäkert svar, timeout eller avbrott blir ett uttryckligt osäkert tillstånd. Ingen automatisk omsändning av kontoskapandet görs. Arrangören får kontrollera kontot i Eneo.
- Fel träffkod, stängt kontoskapande, fullt kontotak och nekande från Eneo ger begripliga fel utan att avslöja API-svar eller nycklar.
- Endast beställningens UUID sparas i flikens `sessionStorage`. Kod och lösenord sparas inte i webbläsarlagring. Inloggningsuppgifter krypteras i serverns databas för återhämtning vid avbrutna svar.
- Stängningstiden stoppar nya konton. Den inaktiverar inte redan skapade Eneo-användare. Hantera dessa i Eneos administration med workshoprollen som identifiering. Äldre konton har automatiskt skapade adresser med prefixet `traff-`.

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

Typkontrollen och samtliga 16 fokuserade backendtester godkändes den 16 november 2026. Resursvakten rapporterade toppar om 258,9 MiB respektive 12,6 MiB. Ingen lokal server, fullständig byggning eller webbläsartestrunner startades. En oberoende källkodsgranskning fann inga blockerande fel. På den publicerade miljön verifierades ett verkligt konto, identiska uppgifter vid upprepat beställnings-ID, exakt en användare i Eneo med rätt workshoproll och 50 MB kvot, fungerande lösenordsinloggning samt kravet på lösenordsbyte. Fel träffkod nekades med HTTP 403 och visades med återhämtningsknapp i formuläret. Vyer med bredderna 390, 768 och 1280 CSS-pixlar hade ingen horisontell sidrullning. QR-koden laddades korrekt och förstorades därefter till 16rem för bättre skanning.

### Egen mejladress och direktlänk

Utökningen till egen mejladress godkändes med typkontroll och 26 fokuserade tester den 16 november 2026 (resursvaktens toppar 245,0 MiB respektive 12,7 MiB). Testerna täcker normalisering av internationella domäner, upptagna adresser, rättning efter definitivt nekande, nya flikar efter misslyckade försök samt återhämtning av tidigare genererade adresser. Den levererade presentationen och programmets data ändras inte.

### Direkt användbara lösenord och hämtaknapp

Nya konton slutför `POST /api/v1/users/login/token/` och `POST /api/v1/users/me/password/` efter att Eneo har skapat användaren. Först därefter lämnas de färdiga uppgifterna ut. Om något misslyckas efter skapandet blir beställningen osäker och återsänds inte som en ny användare. Metadata om färdigt lösenord följer de krypterade uppgifterna; befintliga poster kan läsas utan databasmigrering.

Hämta mitt tidigare konto är klickbar även före inmatning. Ett klick utan kod visar lokal vägledning och gör inget API-anrop. Träffkoden krävs fortfarande för hämtning från servern.

Ändringarna för färdiga lösenfraser och hämtaknapp godkändes med typkontroll och 41 fokuserade backendtester den 16 november 2026. Inga lokala servrar eller fulla byggen startades. Eneos ordinarie lösenordsbytes-API provades separat mot testmiljön och tog bort flaggan för första byte.
