---
name: Eneo användarträff
description: An invitation-led meeting folder with presentation and projection views.
colors:
  accent: "#176CC5"
  text-accent: "#145EA9"
  on-accent: "#FFFFFF"
  accent-muted: "#EAF3FC"
  background-body: "#F6F8FB"
  background-surface: "#FFFFFF"
  text-primary: "#1B2435"
  text-secondary: "#536174"
  neutral: "#0000000F"
  border: "#00000014"
  programme-paper: "#FFFFFF"
  programme-ink: "#1B2435"
  programme-main-header: "#1976CC"
  programme-technical-header: "#8CBDEA"
  programme-shared: "#191D2D"
  programme-shared-label: "#8CBDEA"
  programme-shared-detail: "#CFD4DF"
  programme-main-surface: "#E8F2FC"
  programme-technical-surface: "#F0F2F5"
typography:
  display-2:
    fontSize: "2.1875rem"
    lineHeight: 1.2571
  display-3:
    fontSize: "1.8125rem"
    lineHeight: 1.3793
  heading-1:
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3333
  heading-2:
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  large:
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.4118
  body:
    fontFamily: 'Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4286
  label:
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4286
  supporting:
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6667
  projection-heading:
    fontSize: "clamp(2rem, 4vw, 5.5rem)"
    lineHeight: 1.15
  projection-body:
    fontSize: "clamp(1.25rem, 2.1vw, 2.75rem)"
    fontWeight: 400
    lineHeight: 1.45
  programme-title:
    fontSize: "clamp(1.875rem, 3vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.1
  programme-session:
    fontSize: "clamp(1rem, 1.15vw, 1.45rem)"
    fontWeight: 600
    lineHeight: 1.35
  programme-detail:
    fontSize: "clamp(1rem, 1.15vw, 1.45rem)"
    fontWeight: 400
    lineHeight: 1.4
  programme-label:
    fontSize: "0.8125rem"
    fontWeight: 700
    letterSpacing: "0.12em"
rounded:
  element: "0.625rem"
  container: "0.75rem"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "10": "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.element}"
    padding: "{spacing.2} {spacing.3}"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.element}"
    padding: "{spacing.2} {spacing.3}"
    height: "32px"
  hero-card:
    backgroundColor: "{colors.accent-muted}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.container}"
    padding: "{spacing.10}"
  navigation-item:
    textColor: "{colors.text-primary}"
    rounded: "{rounded.element}"
    padding: "0 {spacing.2}"
    height: "32px"
  library-card:
    backgroundColor: "{colors.background-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.container}"
    padding: "0"
  slide-card:
    backgroundColor: "{colors.accent-muted}"
    rounded: "{rounded.container}"
    padding: "{spacing.6}"
  projection-slide-card:
    backgroundColor: "{colors.accent-muted}"
    rounded: "{rounded.container}"
    padding: "{spacing.8}"
  programme-main-header:
    backgroundColor: "{colors.programme-main-header}"
    textColor: "{colors.programme-paper}"
    padding: "{spacing.3}"
  programme-technical-header:
    backgroundColor: "{colors.programme-technical-header}"
    textColor: "{colors.programme-ink}"
    padding: "{spacing.3}"
  programme-shared-row:
    backgroundColor: "{colors.programme-shared}"
    textColor: "{colors.programme-paper}"
    padding: "{spacing.3}"
  programme-time-column:
    width: "7rem"
  programme-compact-time-column:
    width: "4.5rem"
---

# Design System: Eneo användarträff

## Overview

**Creative North Star: "En läsbar mötesmapp"**

The supplied invitation establishes the blue and white palette and plain sans serif character. Astryx's documentation template supplies the navigation and reading frame. The existing Eneo SVG wordmark anchors the shell, programme and presentation tools; preserve its proportions and artwork.

Extend this same visual identity across reading, material selection and projection. Timetable rows stay dense and ordered, presentation covers make the library easy to scan, and the audience canvas gives the slide more space and larger type. The standalone HTML presentation retains its own authored design inside its file.

**Key Characteristics:**

- Blue actions, dark blue text, white surfaces and pale blue reading panels.
- A familiar documentation shell with readable text widths and wrapping actions.
- Invitation-style programme rows with a persistent time column and distinct track fields.
- Image-led presentation cards and a restrained, scalable audience canvas.
- Astryx-owned focus, interaction and mobile navigation states.

Finish review: **SHIP within reviewed scope** for the programme, earlier presentation wrapper and generic inline engine; the external deck content, newer manuscript controls and illustrated integration surfaces are documented from source and were not independently reviewed in this pass.

## Colors

### Primary

Invitation blue (`accent`) identifies primary actions. Darker link blue (`text-accent`) serves links, accent icons and the keyboard focus outline; `on-accent` supplies white action labels. Pale invitation blue (`accent-muted`) fills the overview and generic inline slide cards.

The programme preserves its own invitation palette: stronger blue for the main-track header, light blue for the technical-track header and shared-session label, and navy for shared rows. Main-track and technical-track cells use separate pale fields. These scoped programme tokens belong to `programmeTheme` in `src/astryx-themes.ts`.

### Neutral

The cool page wash surrounds white surfaces. Dark reading text carries content; slate supports descriptions. Neutral overlays and quiet borders come from the inherited light theme. The programme uses white paper and gutters, dark ink and a lighter shared-row detail color. `src/main.tsx` selects light mode.

**The Theme Owner Rule.** Keep the meeting, projection and programme palettes in `src/astryx-themes.ts`; extend their semantic tokens instead of adding page-level palette overrides.

## Typography

The shell inherits Astryx Neutral's Figtree-first sans serif stack. The optional Figtree font stylesheet is not imported, so system fallbacks are part of the implemented appearance. The frontmatter records the desktop scale; heading semantics and explicit weight props determine weight. Generic slide body text explicitly uses normal weight, while ordinary large text inherits the theme's semibold default.

For coarse pointers below the inherited large breakpoint, Neutral adapts the base from 14 to 16 and the ratio from 1.2 to 1.1736. It does not replace the font stack. Text can wrap anywhere, titles use balanced wrapping where requested, and programme times and slide counters use tabular numerals.

The projection roles apply to generic inline audience slides and fullscreen inline viewing. The audience theme sets the heading and body clamps in the frontmatter with more open leading; the fullscreen frame also applies the same size variables. Programme titles, sessions and uppercase tracked labels use their own named roles. The standalone HTML file owns its embedded font, slide hierarchy and notes typography; the shell theme does not restyle it.

## Layout

`src/MeetingPage.tsx` preserves Astryx's documentation frame: section AppShell, auto height, content width 1200, side navigation (15rem), outer gap 10 and prose width (72ch). Compact page padding switches at `max-width: 48rem` from spacing 8 to spacing 5. AppShell's inherited mobile navigation switches below 768px, so at 768px compact padding can coexist with the persistent side navigation.

Overview support content uses up to two auto-fitting columns with minimum width 260 and gap 8. Presentation and integration libraries share LibraryCard and use up to three columns with minimum width 280 and gap 6. Covers fill a 16:9 frame with declared image dimensions and asynchronous decoding; their text panels use padding 5 and gap 3. Integration detail images follow the same aspect ratio within a 72ch reading column. Toolbars wrap.

The programme measures its actual available content width with ResizeObserver. At 44rem or wider it renders a fixed-layout semantic table with the frontmatter's wide time column and two equal remaining track columns. The table wrapper fills the content width with zero inline margin; time header cells have no inherited maximum width. White grid lines (`--programme-grid-line`, 0.125rem) separate the fields. Below that threshold an ordered list keeps a compact time rail while stacking labelled main and technical sessions. Shared rows span both tracks in either layout. No viewport-only breakpoint substitutes for this measured-content rule.

Generic inline slide cards have reading padding 6, a minimum height (22rem) and content width (72ch). Audience cards use padding 8 and the full available width. Projection roots fill at least the viewport height with a responsive spacing-4-to-8 inset; the presenter main region is capped at 90rem and notes at 72ch. Embedded HTML files fill the width at 60vh; the current file adapter targets the iframe itself for fullscreen, sets its fullscreen height to 100% and returns keyboard focus to the embedded file. The fullscreen programme has its own white-paper frame and responsive inset.

**The Time Rail Rule.** Preserve the dedicated time width and equal track columns; switch to labelled stacked rows when the programme's own content area is too narrow.

## Elevation & Depth

Content is flat at rest. White surfaces, pale blue panels, programme color fields, quiet borders and spacing establish hierarchy. The library uses Astryx's bordered default ClickableCard; overview and slide cards use its borderless gray variant mapped to pale blue. The mobile drawer, scrim and interactive overlays remain Astryx-owned. No project-specific shadow system is added.

## Shapes

Controls and navigation use the inherited element radius; cards use the container radius and clip covers to their outer shape. Programme rows use straight shared edges and white grid lines. The original wordmark keeps its aspect ratio; cover images use a consistent crop rather than a decorative frame.

## Components

- **Buttons and links:** primary blue and neutral secondary Astryx variants. Default controls use medium height; overview and projection actions use large height (36px). Hover and press overlays, reduced-motion behavior and the shared focus outline (2px solid, 3px offset) stay with Astryx. Reading links remain underlined.
- **Navigation:** the SVG wordmark links to the overview. The shared content registry drives section links and current-page state. Selecting a destination closes the mobile menu; route changes update the document title, focus the page heading and return to the top. The skip link preserves the active route.
- **Shared library card and detail:** `src/LibraryCard.tsx` owns the ClickableCard combining cover, title, description and optional detail label for both presentation and integration libraries. Each item has a direct detail route and a return link. `src/content.ts` owns the typed `html`, `html-file` and `pptx` formats. The registered technical presentation is `hur-eneo-utvecklas-med-ai`, a standalone HTML file; no inline example deck or PPTX is currently registered.
- **Generic inline SlideCanvas:** `src/Presentations.tsx` renders title, opening and bullet points from the typed Slide contract. Reading controls expose previous/next, position, link copying, fullscreen and projection routes. Clipboard and fullscreen failures appear in explicit banners. The `html-file` adapter uses an iframe, “Öppna separat”, and optional `presenterUrl` support. Its current “Öppna manus” and primary “Presentera i helskärm” actions wait for the iframe load event; the manuscript popup receives the current embedded hash, with a manual-link fallback if blocked. These newer controls are described from source, outside this pass’s independently reviewed scope. PPTX uses its cover and a direct file download.
- **Generic projection and presenter:** `src/Projection.tsx` reuses SlideCanvas for both modes. The audience branch does not render notes. The presenter branch places notes beneath the preview, shows the next title and can open a separate audience window. `src/presentation-session.ts` owns keyboard input, fullscreen and same-origin local-storage synchronization. Blocked popup or storage access yields visible recovery guidance and direct audience navigation. Inline notes belong to Slide.notes in the registry; the registered external HTML deck owns its own presenter and notes behavior inside its file.
- **Illustrated integration examples:** `src/MeetingPage.tsx` renders the shared library cards and detail reading pages from `sundsvallExamples`. Their four JPEG covers are conceptual illustrations, labelled as illustrations on the index, with exact generation prompts and provenance in `.impeccable/assets/integrations.json`. They introduce no new control palette or type system.
- **Workshop accounts:** `src/WorkshopAccounts.tsx` adds a task page inside the same documentation frame. Existing Astryx TextInput, Button and Banner own email and code entry, waiting, explicit failures, closed registration, credential copying and first-login guidance. A two-column grid stacks on narrow content areas; the QR is a local SVG containing only the public account-page URL. Passwords and the event code never enter browser storage. `WORKSHOP.md` records the server contract and lifecycle.
- **Programme:** `src/Programme.tsx` renders shared and parallel entries from the canonical programme registry. Track labels remain visible in stacked rows; absent technical sessions have an accessible empty-state label. Programme fullscreen is a separate action from the original-PDF download.

Shipping media includes the existing Eneo SVG wordmark, SVG presentation cover, supplied programme PDF, authored standalone HTML presentation and four generated JPEG integration illustrations under `public/integrations/`. The JPEGs depict use cases rather than application screenshots; their image_gen provenance and exact prompts are owned by `.impeccable/assets/integrations.json` and embedded in the assets. Review screenshots are evidence only and remain in the primary checkout’s `.impeccable/review/` directory.

## Do's and Don'ts

### Do:

- **Do** reuse Astryx components, the documentation frame and the existing Eneo wordmark.
- **Do** keep palette decisions in the theme and programme/presentation content in the typed registry.
- **Do** preserve readable widths, wrapping tools and the programme's measured time-rail layout.
- **Do** keep notes in their format's owner and render them only in its presenter view.
- **Do** distinguish preparation material from the invitation's programme facts.

### Don't:

- **Don't** replace dense programme or resource rows with card-wrapped lists.
- **Don't** apply generic inline-slide styling or controls to the standalone HTML file's internals.
- **Don't** bypass Astryx's focus, mobile navigation or reduced-motion behavior.
- **Don't** introduce a second palette, spacing scale or altered wordmark.
