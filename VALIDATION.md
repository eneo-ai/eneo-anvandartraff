# Validation evidence

Recorded on 16 November 2026 for the programme and presentation work. The programme time-column correction is commit `64aa7a183956f069bc70067e88bbb057b7a7d441`.

## Programme time correction

The wide programme previously clipped the time labels: the first table column was measured at 26 CSS pixels and the table wrapper extended outside its content frame. `src/Programme.tsx` now defines a semantic column group with a theme-owned 7rem time column and two equal track columns. The time header cells explicitly allow their full width. The programme theme keeps the table wrapper inside its frame.

The programme registry in `src/content.ts` remains the source for both table and stacked layouts. No programme text or times changed in this correction.

Focused static validation passed in the isolated fix checkout:

```sh
python3 /Users/maxeriksson/.codex/scripts/run-guarded.py --seconds 120 -- npm run typecheck
```

The supervisor reported a peak of 246.9 MiB. No local development server, production build, browser test runner or full test suite was started for this correction. Dokploy built and deployed the correction remotely; deployment `mHTpejnpSHK4C88qYkUUz` completed successfully.

Manual checks on the deployed programme:

| Browser viewport width | Observed result |
| --- | --- |
| 1440 CSS pixels | All ten time cells measured 112 CSS pixels wide, with no clipped text. The table remained within its content frame. |
| 1024 CSS pixels | All ten time cells remained 112 CSS pixels wide with no clipped text. |
| 768 CSS pixels | Stacked programme showed every complete time label; no horizontal page overflow. |
| 390 CSS pixels | Stacked programme showed every complete time label, including 15.30–17.00; no horizontal page overflow. |

The invitation's blue track headers, navy shared rows and pale parallel-track fields remain visible. The programme fullscreen action entered native fullscreen in the main browser tab, removed the surrounding application navigation and displayed “Lämna helskärm”. The agenda remains vertically scrollable; it is not compressed to fit a single screen.

## Presentation and visual review scope

The independent finish review returned **SHIP** for the programme, the presentation wrapper reviewed at that time and the generic inline presentation engine. The review included the corrected mobile library cover after its SVG had finished loading.

Earlier manual checks of the generic inline engine confirmed that an explicitly linked starting slide was preserved, presenter and audience windows synchronized slide changes in both directions, the audience view omitted the notes DOM and application navigation, and native fullscreen worked in the main tab. That illustrative inline deck was subsequently removed from the content registry. These checks do not establish the behavior of every standalone HTML presentation.

The standalone technical HTML deck, later manuscript controls and illustrated integration examples were updated concurrently in separate work. Their complete content and independent presentation behavior were outside this finish review. No PPTX file has been supplied for an end-to-end download check. Native fullscreen in the separate audience popup could not be verified in the in-app browser's focus context. Viewport checks represent browser sizes, not physical iPad or phone hardware. This was not a full WCAG audit.

## Evidence and recovery

Local review captures are stored in the primary checkout's ignored `.impeccable/review/` directory:

- `programme-desktop-final.jpg`
- `programme-mobile-final.jpg`
- `programme-tablet-768-final.jpg`
- `programme-tablet-1024-final.jpg`
- `programme-fullscreen-final.jpg`
- `library-mobile-final.jpg`

The correction changes only `src/Programme.tsx` and the programme theme in `src/astryx-themes.ts`. It requires no data migration. If recovery is needed, revert the correction commit and redeploy through Dokploy; a targeted revert preserves later presentation and integration changes.
