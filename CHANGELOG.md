# Changelog

This project follows the basic format of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). For tagged releases, use the version from the Git tag. The tagged release is maintained by the release owner in this English `CHANGELOG.md`; daily user-perceivable changes are recorded in the Chinese `CHANGELOG-zh.md` in this repository. Both files contain user-perceivable facts only and ship in the npm package.

For new releases, use headings in the format `## [x.y.z] - YYYY-MM-DD`. When an entry can be linked unambiguously to a GitHub issue, append `(#xx)`. Historical entries keep their original heading format.

---

## [Unreleased]

## [0.1.4] - 2026-11-25

### Fixed

- Fixed all four marketplace tools failing to load on Pi 1.6.0 after the schema API moved out of `pi-ai`.

## [0.1.3] - 2026-07-16

### Fixed
- **Human-readable projection for object fields**: the `license` and `author` objects in package details are now rendered as human-readable fields instead of raw object text.

## [0.1.2] - 2026-06-11

### Changed

- Standardized the Pi package entry: added a root `index.ts` as the Pi extension entry, moved the implementation from `extensions/` to `src/`, and updated the typecheck paths and the published `files` list accordingly. The public tools and their behavior are unchanged; this release only changes the package entry and published layout.

## [0.1.1] - 2026-06-07

### Changed

- Search, detail, audit, and install results now collapse to a one-line summary. Press `Ctrl+O` to expand the full Markdown result. While a tool is running, it shows `⏳ Running...`. The model still receives the full text.
- Search shows the package count, detail shows the package name and version, audit shows the risk level and finding count, and install shows the outcome and audit risk.

## [0.1.0] - 2026-06-01

- Added `marketplace_search`, `marketplace_detail`, `marketplace_audit`, and `marketplace_install`, with tool-specific guidance for the model. Package audits inspect both metadata and source code.
- Large-package audits could stall, had no cancellation, and could flag benign HTTP references. Installation offered no progress feedback, and the interface was not localized.
