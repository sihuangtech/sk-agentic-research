# Second Moon development rules

- This repository is the Tauri/React/Node research agent, not the sibling SK Scholar Next.js app.
- Every first-party frontend, backend, shared, desktop, stylesheet, script and test source file must stay at or below **300 physical lines**, including comments and blank lines. Split by responsibility; do not minify or collapse statements to bypass the limit.
- Run `npm run check:lines` after changes. `npm run lint` and `npm test` also enforce the limit. Dependencies, research checkouts, lockfiles and generated build outputs are not first-party source.
- Store localization strings in **JSON**, not TS dictionaries. Use official `i18next/react-i18next`; keep initialization and type declarations in TS. Keep every language's keys and interpolation parameters aligned.
- Supported languages are registered in `shared/languages.json`. UI resources: `frontend/src/i18n/locales/<locale>.json`. Shared service/native resources: `shared/locales/<locale>.json`. Add matching Agent response instructions and official Monaco language packs when expanding languages.
- Do not translate user-authored content, original model outputs or process logs. Store stable status/error codes and localize their presentation.
- Install SDKs/dependencies with official npm/Cargo commands. Do not compile or import SDKs from `open-source-repositories/`.
- Preserve the dark research-workbench appearance and existing research materials.
- Verify with `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; check Rust when desktop code changes.
