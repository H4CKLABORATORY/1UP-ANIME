# 1UP Anime — theme system (one system, not six)

Live entry point (loaded by `index.html`):

- `themes/oneup/theme.css` — the only theme stylesheet (was 10 files)
- `themes/oneup/theme.js` — the only theme script (was 9 files)

## What was consolidated (Phase 1, Nov 2026)

Six theme systems loaded at once on every page — kokomi-studio,
october-2026, kokomi-mobile-preview, cinematic-v3, oneup-palette,
oneup-motion — with overlapping rules and no documented order. They are now
one system: the rules and scripts are the same code, in the same cascade and
execution order the live page used before, concatenated into these two files
with a banner per source section. The old per-theme files live in git
history. Nothing about the default look changed.

Kept as files (referenced by path from the bundle):

- `themes/oneup/arcane-seal.svg` — October editorial seal
- `themes/oneup/characters.json` — allow-list for the cinematic intro layers

## Palettes — optional, never required

Default is `esmeralda` (black + green). The other options are `violeta`
(black + violet) and `original` (the original 1UP design). Switching is an
opt-in advanced setting via the palette button in the header; the choice is
stored in `localStorage` (`oneup.palette.v1`) and applied automatically.
The visitor never has to choose anything: the site works from the first
click with zero setup.

## Intro video rule

The signature video (`#original-signature`) has no `src` in the markup
(`preload="none"`). The cinematic studio section attaches its source only
when the intro actually plays, and the opening controller cancels any
in-flight fetch before removing the overlay — removing a `<video>`
mid-download aborts the fetch (`net::ERR_ABORTED` on GitHub Pages).

## Preview-only files

`themes/preview-only/` holds files that were never part of the live page:
`cinematic-studio.css` (standalone studio preview, with page-level rules
that must NOT load on the live site) and `kokomi-opening.js` (the Kokomi
mobile preview intro controller). Deleted outright: `app.js` and
`styles.css` (legacy Jikan explorer + legacy stylesheet — nothing loaded
them; `studio.js` is the live engine) and the `brand-signature.*` files
(nothing referenced them). All deleted files are recoverable from git
history.

## Removed on purpose

- `themes/cinematic-v3/studio.css` is NOT in the live bundle: its global
  rules (`html,body{overflow:hidden}`, `*{box-sizing}`) would break the
  live page. Its scoped equivalents live in `production.css`, which IS in
  the bundle.
