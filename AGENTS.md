# AGENTS.md

Colordoku is a zero-build browser puzzle. Everything in `site/` is served to GitHub Pages exactly as written.

## Commands

- `npm start`: serves `site/` at http://localhost:8000
- `npm test`: game logic unit tests (`node:test`)
- `npm run check`: lint, format check, type check, and tests. Run it before every commit
- `npm run images`: regenerates `site/assets/*.png` and `docs/images/*.png` with local Chrome

## Rules

- No build step, bundler, framework, or runtime dependency. Everything in `site/` must run as served
- `site/js/game/` is pure logic and never touches `document`, `window`, or `navigator`. Page code lives in `site/js/ui/` and `site/js/main.js`
- Every game logic change comes with a test in `test/`
- Types live in JSDoc comments and must pass `npm run typecheck`
- The `--region-N` colors in `site/css/tokens.css` stay in the same order as `REGION_NAMES` in `site/js/game/rules.js`
- Changing the generator changes what existing share links produce. That's allowed, but do it on purpose
- After changing how the site looks, run `npm run images` and commit the new PNGs
