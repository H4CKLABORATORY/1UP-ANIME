# 1UP Anime — Design system (Phase 8 consolidation)

One theme (`themes/oneup/`), one identity: Black Clover / anti-magic —
dark, cinematic, its own accents. Phase 8 did **not** rebrand anything:
it consolidated the values the theme already used into named tokens,
migrated the main surfaces onto them, removed dead CSS, and polished
states (hover / focus / loading / empty / reduced motion). This file is
the inventory: every token, where its value came from, and every value
that changed (and why).

## Measured references — calibration only, nothing copied

The design study (`1up-anime-audit/JKANIME_DESIGN_STUDY.md`, live-browser
pass 2026-11-07) measured, from rendered pixels: Crunchyroll page
background `#000000`, header band `#272727`, action oranges
`#FF5E00` / `#FF640A`; jkanime's structure patterns (A–Z directory,
weekly schedule grid, episode list). Those numbers were used **only as
a premium-feel calibration**: 1UP's detail page already used `#000000`,
`#272727` and `#FF640A` (Phase 2), which is why they appear below as
1UP tokens. No HTML, CSS, JS, images, logos or text from either site
were copied; jkanime's structure patterns were adopted in earlier
phases as generic streaming UX. 1UP's own identity tokens (emerald
`esmeralda` default palette, `--kp-*` kokomi values, the ✦ anti-magic
motif, its crest and wordmark) are unchanged and remain the default
look. The palette picker stays an optional advanced setting — the
theme is automatic by default and no visitor ever has to choose
(standing rules 1 and 2).

## Tokens

Defined in `themes/oneup/theme.css`, section `11/11 — Phase 8`
(`:root { --oneup-* }`). Community surfaces (`comunidad.html`,
`moderacion.html`, `admin-episodios.html`) do not load the theme sheet,
so `community.css` defines the same token names and scales from **its
own** existing palette (blue-ink La Plaza palette); moderation/admin
consume them with exact-value fallbacks.

### Colour

| Token | Value | Source (pre-token) |
|---|---|---|
| `--oneup-color-page` | `#000000` | anime-detail.css page background (Phase 2) |
| `--oneup-color-bg` | `#080b11` | `--kp-bg`, theme.css §1/10 |
| `--oneup-color-header` | `#272727` | anime-detail.css top bar (Phase 2) |
| `--oneup-color-panel` | `#131b24` | `--kp-panel` |
| `--oneup-color-raised` | `#161d25` | `--panel`, theme.css §1/10 |
| `--oneup-color-ink` | `#f5f6f4` | `--kp-ink` |
| `--oneup-color-muted` | `#adb9be` | `--kp-muted` |
| `--oneup-color-line` | `#ffffff21` | `--kp-line` |
| `--oneup-color-accent` | `#e7a66d` | `--kp-accent` |
| `--oneup-color-accent-strong` | `#c87651` | `--orange2`, theme.css §1/10 |
| `--oneup-color-action` | `#ff640a` | anime-detail.css action orange (Phase 2) |
| `--oneup-color-action-hot` | `#ff5e00` | measured action-orange family, detail hover use |
| `--oneup-color-cream` | `#f8ebd5` | `--cream`, theme.css §1/10 |
| `--oneup-color-dialog` | `#15111c` | ui-quality.css `#auth-dialog` background |
| `--oneup-color-focus` | `#a2ffd0` | `--oneup-pal-highlight` (esmeralda) |

Community sheet equivalents alias its own `:root` vars (`--bg`,
`--panel`, `--panel2`, `--ink`, `--muted`, `--accent`, `--line`) and add
`--oneup-color-label: #c0cee9`, `--oneup-color-state: #bbd0ff`,
`--oneup-color-focus: #a7c6ff` (its pre-token label/state/focus
colours). Moderation adds `--oneup-color-card: #141d32` (its card
background).

### Type

`--oneup-font-body: 'Outfit', system-ui, sans-serif` ·
`--oneup-font-display: 'Barlow Condensed', Impact, sans-serif` — the
two families the pages already load; no new fonts, no new external
dependencies (Phase 8 added none). Scale: `--oneup-text-xs 10px`,
`sm 12px`, `md 14px`, `lg 15px` — the sizes the migrated surfaces
already used (ficha técnica, loading text, labels).

### Spacing

4px base scale, steps `--oneup-space-1..8` = 4 / 8 / 12 / 16 / 20 / 24 /
32 / 48px. Radii: `--oneup-radius-sm 7px`, `md 10px`, `lg 12px`,
`xl 16px`, `--oneup-radius-dialog 23px` (ui-quality.css auth dialog
declaration; a later finale layer computes 16px on the live dialog —
unchanged by Phase 8, verified identical before/after).

## Surfaces migrated

- **Home rails + catalog grid** (`themes/oneup/theme.css` §11/11):
  `.card-rail` / `.poster-grid` gap, `.anime-card` radius, `.card-info`
  padding now use tokens.
- **Detail page** (`anime-detail.css`): page/header backgrounds,
  top-bar spacing, ficha técnica grid, loading and not-found states
  use tokens; every `var()` fallback is the exact pre-token value, so
  `studio.html` (which loads this sheet without the theme) renders
  identically.
- **Community** (`community.css`): buttons, hero, panels, composer,
  feed cards, messages, its dialog, focus colour, labels and state
  colours use tokens.
- **Moderation / admin** (`moderacion.css`, `admin-episodios.css`):
  card surface, gaps, padding, label and status colours use tokens
  (with exact-value fallbacks).
- **Auth dialog** (`ui-quality.css`): background and radius consume
  `--oneup-color-dialog` / `--oneup-radius-dialog` with exact-value
  fallbacks. Verified pixel-identical before/after (see QA).

## Values that changed (complete list — all rhythm normalisations)

Nothing was recoloured. The only numeric changes are ±1–2px
normalisations onto the 4px spacing / radius scale:

| Surface | Before | After | Why |
|---|---|---|---|
| Home rail gap | 15px | 16px (`--oneup-space-4`) | on-scale |
| Catalog grid gap | 17px | 16px (`--oneup-space-4`) | on-scale |
| Detail top-bar vertical padding | 10px | 12px (`--oneup-space-3`) | on-scale |
| Ficha chip padding | 12px 14px | 12px 16px | on-scale |
| Not-found H1 margin | 10px 0 14px | 12px 0 16px | on-scale |
| Community hero radius | 17px | 16px (`--oneup-radius-xl`) | on-scale |
| Community empty radius | 11px | 10px (`--oneup-radius-md`) | on-scale |
| Community feed-card radius | 13px | 12px (`--oneup-radius-lg`) | on-scale |
| Community card-body padding | 19px | 20px (`--oneup-space-5`) | on-scale |
| Moderation card radius | 11px | 10px (`--oneup-radius-md`) | on-scale |
| Community friend-state colour | `#b6c7ff` | `#bbd0ff` (`--oneup-color-state`) | one state colour, not two near-identical blues |

## Component states

- **Cards** (home/catalog `.anime-card`, community `.c-feed-card`,
  moderation `.mod-card`): hover lift/tint on fine pointers (home lift
  pre-existed in the motion section); **`:focus-within`** ring +
  border so keyboard users tabbing into a card see the same emphasis;
  `:focus-visible` outlines use the focus token.
- **Loading**: async surfaces keep their existing placeholders
  (`.loading` / `.airing-empty` / `.anime-detail-loading`) restated on
  token surfaces; reusable `.oneup-skeleton` / `.c-skeleton` shimmer
  blocks added for async grids/feeds. A loading state is a status,
  never a gate — content replaces it the moment data arrives.
- **Empty**: `.empty` (catalog filters) and `.c-empty` (La Plaza) carry
  the anti-magic **✦** motif in the accent colour — the same glyph the
  site already used in `.placeholder-art` / `.loading`. The detail
  page's not-found state keeps its copy and gains token spacing.
- **Dialogs**: only `#auth-dialog` remains (see below); its sheet-in /
  veil animations are untouched.

## Motion rules

Durations stay in the pre-existing `--oneup-motion-*` scale
(170ms / 270ms, `cubic-bezier(.22,1,.36,1)`). Every animation or
transition Phase 8 added (skeleton shimmer, card transitions) is
disabled under `@media (prefers-reduced-motion: reduce)`, matching the
rule the motion section already applied to dialogs, the drawer and
cards.

## Dead CSS removed: `.anime-dialog`

The Phase 2 detail modal died when detail became a full page
(`tests/anime-detail.spec.js` asserts `#anime-dialog` count 0), but
`themes/oneup/theme.css` still carried its rules, several **grouped
with the live auth dialog**. Phase 8 untangled them: the two
standalone border-color rules and the mobile-only `#anime-dialog`
override were deleted; the four grouped selectors (open animation,
backdrop animation, backdrop veil, reduced-motion, `km-quiet`) now
target `#auth-dialog` / `.auth-dialog` only, declaration by
declaration identical. `grep anime-dialog themes/oneup/theme.css` →
0. Proof: Playwright auth spec in the e2e suite + before/after
computed-style capture of `#auth-dialog` (width, radius, background,
border, colour, panel padding, close-button background, backdrop —
identical at 390px and 1440px) and a **pixel-identical** auth-dialog
screenshot (same SHA-256 before/after). Legacy `.anime-dialog` rules
in `studio.css` / `spotlight.css` / `brand-v2.css` style the same
nonexistent element and were left untouched (out of this phase's
file scope; they are equally inert).

## Visual QA (Phase 8, Playwright, offline harness)

Same pattern as `tests/anime-detail.spec.js` (GitHub-Pages-like local
server, AniList fixture for `mal-27947`, other external requests
aborted). Captures at 390px and 1440px: home, catalog, detail
(`/anime/mal-27947`), community, auth dialog — before and after,
stored under `artifacts/phase8/` (not committed).

- Horizontal overflow: **0** on every page/viewport, before and after.
- Overlapping/clipped text: none found visually; the single automated
  flag (hero H1 “BLACK CLOVER SEASON 2”) is a box-measurement artifact
  — the title renders fully inside the overflow-hidden hero, before
  and after (verified in the screenshots).
- Broken images: only external AniList CDN covers, which the offline
  harness aborts by design (identical before/after; same-origin images
  all load). Counts vary ±3 with lazy-render timing.
- Contrast (computed, WCAG ratio): every sampled body-text/background
  pair passes AA (≥ 4.5:1) before and after — home body 15.31, card
  name 16.91, card sub 6.71, section heading 20.51, footer 10.56,
  catalog status 8.12, catalog intro 9.47, detail ficha dt 11.56 /
  dd 19.37, community body 9.94, community note 9.57, auth copy 11.52,
  auth label 12.10. No pair was under AA, so no token colour needed a
  contrast fix; the minimum pair (card sub, 6.71:1) is recorded here.
