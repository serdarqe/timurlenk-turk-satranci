# Source Distribution Notice

This repository is the public source package for Timurlenk Turkish Chess application builds that include Fairy-Stockfish / WASM engine components.

For a Google Play or APK/AAB release, the published build should be matched to a Git tag from this repository. That tag is the reference point for the application source, Android project files, Web build inputs, bundled WASM assets, license notices, and validation scripts used for that release.

## Included

- `LICENSE`
- `README.md`
- `THIRD_PARTY_NOTICES.md`
- `src/` - application source
- `android/` - Android / Capacitor project source, excluding generated assets and signing material
- `functions/` - optional Firebase Functions source, excluding dependency folders and runtime secrets
- `public/` - public assets, Fairy-Stockfish / WASM files, attribution files, and privacy policy
- `scripts/` - release, engine, and validation scripts
- `tests/` - automated regression and engine integration tests
- `package.json` and `package-lock.json` - Web build and dependency metadata
- `capacitor.config.json`, `firebase.json`, and `firestore.rules` - app/service configuration templates used by the source tree

## Not Included

- private Firebase configuration such as `.env`, `.firebaserc`, and real `google-services.json`
- Firebase runtime config files such as `functions/.runtimeconfig.json`
- APK/AAB packages
- local build output
- signing keys, service accounts, secrets, or `.env` files
- generated dependency folders such as `node_modules/`
- generated Web/Android build output such as `dist/`, `android/app/build/`, and `android/app/src/main/assets/public/`

## GPL Note

Fairy-Stockfish is GPL licensed. If a distributed application build includes GPL engine components, the corresponding source obligations for that distributed build must be satisfied.

This repository should be described as corresponding source only for builds that match a published source tag from this repository.
