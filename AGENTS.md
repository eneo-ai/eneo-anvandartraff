# AGENTS.md

Project-specific guidance for AI coding agents.

## Project scope

This is a public resource site for the Eneo user meeting. Meeting content is read-only; the explicitly authorized workshop account form provisions Eneo test accounts through the server owner described in WORKSHOP.md. `src/content.ts` is the canonical content registry. Keep programme facts faithful to `public/program.pdf`; label preparation material as discussion material.

Never commit credentials. The Dokploy project belongs to Eneo-dev. Build remotely in Dokploy for publication.

## Local resource safety

Run every local installation, type check, linter, build or test through:

`python3 /Users/maxeriksson/.codex/scripts/run-guarded.py --seconds 600 -- <command> <args...>`

Use a shorter deadline for small checks. Do not start local development servers, browser/E2E tests, full production builds or full test suites without the user's explicit request for that execution. Use one worker. Do not bypass the global lock, raise the guard's ceilings or retry a resource-stopped job automatically. Do not kill unrelated processes.

<!-- ASTRYX:START -->
Astryx v0.7.3 · 173 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
