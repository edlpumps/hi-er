# Node 22.17.0 Upgrade — Dependency Compatibility Summary

**Date:** July 7, 2026  
**Project:** hi-er (HI Energy Ratings)  
**Target Node version:** 22.17.0

## Verdict

The current dependency set is **compatible with Node 22.17.0**. No additional dependency changes are required purely for the Node version upgrade.

## What Was Checked

| Check | Result |
|-------|--------|
| `engines.node` in `package.json` | Pinned to `22.17.0` |
| Full dependency tree engine constraints | **0 mismatches** against 22.17.0 |
| Upper-bound Node constraints (`< 22`, etc.) | **None found** |
| `npm install --engine-strict` on 22.17.0 | **Succeeds** |
| All 47 direct dependencies `require()` | **All load** |
| `@resvg/resvg-js` native rendering | **Works** |
| App bootstrap (`index.js`) | **Starts and connects to Mongo** |

## Upgrade History

- **`409bed5` (Node 22.17.0):** Changed `engines.node` from `19.7.0` to `22.17.0`. No dependency version bumps in this commit.
- **`cefb728` (Beta 05 26 25):** Upgraded Express from `4.14.0` to `5.1.0`, which requires Node ≥ 18. This was the main framework change supporting newer Node versions.

## Notable Packages (Old but Working on 22.17.0)

These packages are legacy or unmaintained but still load and run on Node 22.17.0:

| Package | Version | Notes |
|---------|---------|-------|
| `request` | 2.88.2 | Deprecated HTTP client; used in `routes/admin.js`, `routes/participant.js` |
| `phantomjs-prebuilt` | 2.1.14 | Abandoned; used with `html-pdf` for PDF generation in `routes/certificates.js` |
| `html-pdf` | 2.2.0 | Depends on PhantomJS |
| `connect-mongo` | 1.3.2 | Very old; uses MongoDB driver 2.x while Mongoose 6 uses driver 4.x internally (separate stacks) |
| `express-session` | 1.14.1 | Pre-dates Node 22; no engine blocker |
| `helmet` | 2.1.3 | Pre-dates Node 22; no engine blocker |
| `nodemailer` | 2.7.0 | Pre-dates Node 22; no engine blocker |
| `lodash` | 4.17.2 | Pre-dates Node 22; no engine blocker |

## Separate Concerns (Not Node Version Blockers)

### Security

`npm audit` reports **94 vulnerabilities** (25 critical, 31 high, 24 moderate, 14 low). These stem from outdated packages, not from Node 22 incompatibility.

### Tests

`npm test` fails with a `TypeError` in `controllers/circulator.js:568` (`Cannot read properties of undefined (reading 'push')`). This failure occurs on both Node 22.17.0 and 22.18.0 and appears to be an application/test bug, not a Node upgrade issue.

### Strict Engine Pin

The `engines` field is pinned to the exact version `"22.17.0"`. With `npm install --engine-strict`, developers on 22.18.0 or other 22.x patch versions will get an `EBADENGINE` error. Consider relaxing to `"22.x"` or `">=22.17.0 <23"` if patch flexibility is desired.

## Recommendations (Future Work)

1. **Security:** Prioritize upgrading or replacing deprecated packages (`request`, `phantomjs-prebuilt`/`html-pdf`, old `connect-mongo`, etc.).
2. **Tests:** Fix the pre-existing failure in `tests/circulator-model-checks.js` / `controllers/circulator.js`.
3. **Engines field:** Consider relaxing the exact pin if the team wants to allow 22.x patch versions without friction.

## Bottom Line

No additional dependency changes are needed purely for Node 22.17.0. Install, require, native modules, and app startup all work. The bigger risks are security debt from unmaintained packages and the pre-existing test failure — not Node version incompatibility.
