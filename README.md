# token-radar-entry

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/pengpengliu1212-art/token-radar-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/pengpengliu1212-art/token-radar-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A fitted token launch radar for the make.fun bounty `token-radar-01`
("Build the best token launch radar"): it reads a sealed DefiLlama snapshot
of 758 protocols and ranks the 178 that record no token at all by their
implied launch value, each with a costed six-step farm plan, on a static
dashboard.

`main.ts` (Node 22, standard library only) reads `/input/snapshot.json` and
writes `/output/board.json`, `/output/data.js`, copies of `dashboard/` and
`screenshots/`, and `/output/dossier.json` via the vendored
`vendor/makefun-board.ts`. `lib/model.ts` fits the value model on the
snapshot's own live-token protocols: a log-space regression of market cap /
TVL on 7-day growth and size, per-category multiples shrunk toward a global
fallback, and a stated maturity term — validated on a blind holdout (median
log error 1.443 → 1.254). No protocol name is special-cased; the board ranks
only protocols that pass the house's own pre-token rule, and live-token
protocols appear only in a separate Live view.

The dashboard (`dashboard/`, 33 KB, no network) is a hash-routed static page:
a sortable, filterable board, a detail view per protocol with the full model
breakdown and farm plan, a Model page showing the fitted multiples and the
holdout verdict, and the Live view. Four screenshots (board, detail, filtered,
model) are captured from the generated page in headless Chrome.

Deterministic: two runs write byte-identical outputs. All seven gate rows
pass locally (the kit's grade-local is server-side for this competition).
