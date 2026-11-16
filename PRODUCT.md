# Eneo användarträff

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: React, TypeScript, Astryx and Vite. Static output and workshop account API served by Node in Dokploy.

## Users and purpose

Deltagare på Eneos användarträff den 17 november 2026 använder sidan på telefon och dator för att hitta program, presentationer och länkar. Utgångspunkten är teknikspåret.

## Capabilities and constraints

Publikt läsmaterial, bekräftat av användaren. En uttryckligen begärd kontosida skapar testkonton i eneo-modules.sundsvall.dev via servern, skyddad av en gemensam träffkod. QR och länk öppnar samma formulär; inga administratörsuppgifter eller träffkoder publiceras i frontend. Innehållet uppdateras tillsammans med Codex i källkoden. Eget publikt GitHub-repo under eneo-ai och egen Dokploy-applikation under Eneo-dev på panel.sundsvall.dev.

Användaren har också begärt Eneos logga, ett bibliotek med bild/rubrik per presentation, en egen sida per presentation samt val för helskärm. Presentationer kan vara HTML eller PPTX. HTML kan visas i webbläsaren; PPTX-filer laddas ner för visning i PowerPoint. Inga PPTX-filer har tillhandahållits ännu.

Publikvyn ska vara läsbar på stor skärm och inte rendera talaranteckningar. Presentatörsvyn visar anteckningarna under förhandsvisningen och kan styra ett separat publikfönster i samma webbläsare. Mobil- och iPad-storlekar ingår i den responsiva visningen. Anteckningarna uppdateras i koden.

Programmet ska återge PDF-inbjudans igenkännbara design men renderas från kodens programdata, så att tider och pass kan uppdateras. Original-PDF:en finns kvar för nedladdning.

Exempelbiblioteket skiljer mellan moduler för Eneo och API-integrationer från Sundsvall. Tal till text visar den nyare modulhanteringen med inloggning och behörigheter via Eneo. Scenarioverktyget ligger först bland API-integrationerna. Samma bildkort som presentationerna används, med ett eget representativt omslag per exempel. AI-backend ingår inte. Korten leder till egna sidor med nytta, integrationsupplägg, idéer att ta med och källkod. Omslagen är illustrationer, inte skärmbilder av applikationerna.

Målet är en gemensam marknadsplats där kommuner och myndigheter delar och vidareutvecklar Eneo-moduler för att slippa lösa samma problem på flera håll. Mötessajten presenterar riktningen och befintliga exempel; den är inte en modulbutik. Tal till text och det nyare modul- och flödesstödet märks som under utveckling enligt produktbeskrivningen den 16 november 2026.

## Evidence

Programmet kommer från användarens inbjudan, `public/program.pdf`. Beskrivningen av AI-arbetssättet kommer från samtalet och är ett diskussionsunderlag; den är inte en verifierad beskrivning av hela Eneos utvecklingsorganisation. Inga presentationer från arrangörerna har levererats.

## Product principles

- Dela direkta länkar till varje avsnitt.
- Materialet ska gå att läsa med telefonen under träffen.
- Visa tydligt vad som är förberedelser och vad som kommer från programmet.
- Ett gemensamt innehållsregister för navigation, sidor och presentationer.
