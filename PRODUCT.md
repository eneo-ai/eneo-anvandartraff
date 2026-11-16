# Eneo användarträff

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: React, TypeScript, Astryx and Vite. Static output served by Nginx in Dokploy.

## Users and purpose

Deltagare på Eneos användarträff den 17 november 2026 använder sidan på telefon och dator för att hitta program, presentationer och länkar. Utgångspunkten är teknikspåret.

## Capabilities and constraints

Publik lässida, bekräftat av användaren. Innehållet uppdateras tillsammans med Codex i källkoden. Eget publikt GitHub-repo under eneo-ai och egen Dokploy-applikation under Eneo-dev på panel.sundsvall.dev.

Användaren har också begärt Eneos logga, ett bibliotek med bild/rubrik per presentation, en egen sida per presentation samt val för helskärm. Presentationer kan vara HTML eller PPTX. HTML kan visas i webbläsaren; PPTX-filer laddas ner för visning i PowerPoint. Inga PPTX-filer har tillhandahållits ännu.

Publikvyn ska vara läsbar på stor skärm och inte rendera talaranteckningar. Presentatörsvyn visar anteckningarna under förhandsvisningen och kan styra ett separat publikfönster i samma webbläsare. Mobil- och iPad-storlekar ingår i den responsiva visningen. Anteckningarna uppdateras i koden.

Programmet ska återge PDF-inbjudans igenkännbara design men renderas från kodens programdata, så att tider och pass kan uppdateras. Original-PDF:en finns kvar för nedladdning.

Integrationsexemplen ska inspirera andra med det som redan är byggt i Sundsvall. Använd samma bildkort som presentationerna, med ett eget representativt omslag per exempel och Scenarioverktyget först. AI-backend ingår inte. Korten leder till egna sidor med nytta, integrationsupplägg, idéer att ta med och källkod. Omslagen är illustrationer, inte skärmbilder av applikationerna.

## Evidence

Programmet kommer från användarens inbjudan, `public/program.pdf`. Beskrivningen av AI-arbetssättet kommer från samtalet och är ett diskussionsunderlag; den är inte en verifierad beskrivning av hela Eneos utvecklingsorganisation. Inga presentationer från arrangörerna har levererats.

## Product principles

- Dela direkta länkar till varje avsnitt.
- Materialet ska gå att läsa med telefonen under träffen.
- Visa tydligt vad som är förberedelser och vad som kommer från programmet.
- Ett gemensamt innehållsregister för navigation, sidor och presentationer.
