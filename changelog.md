# Changelog

All notable changes to this project are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

- No documented changes.

## [72.0.0] - 2026-03-23

### Added

- Ability to log in with GitHub and Google
- New “no organization” screen with the option to request access
- Support for uploading a store logo
- Ability to customize environment columns
- Slack messages can now be configured per store

### Changed

- Updated login screen layout
- Refactored login, password recovery, and user email sending logic
- Refactored the layout of the environment Kanban board

### Fixed

- Refactored Firestore read logic to reduce reads and improve performance

### Removed

- BrowserStack integration

## [71.0.1] - 2026-02-01

### Added

- Refactor: reorganized UI folders, added changelog tooling, and optimized Firestore user reads (PR #250).

## [71.0.0] - 2026-02-01

### Changed

- Refactor: Firestore caching with CacheStore and summary/detail reads (PR #248).

## [70.0.1] - 2026-01-31

### Fixed

- Fixed table row background styling (PR #247).

## [70.0.0] - 2026-01-31

### Changed

- Refactor: moved use-case wiring to infrastructure services (PR #245).

## [69.0.0] - 2026-01-31

### Removed

- Internal cleanup and removals (details were not documented in the changelog) (PR #243).

## [68.0.3] - 2026-01-31

### Changed

- Internal changes (details were not documented in the changelog) (PR #242).

## [68.0.2] - 2026-01-30

### Changed

- Improved table responsiveness and back navigation actions (PR #241).

## [68.0.1] - 2026-01-28

### Removed

- Reverted a previous update labeled "Update 3" (PR #240).

## [68.0.0] - 2026-01-28

### Removed

- Reverted responsiveness and i18n coverage changes for environment views (PR #239).

## [67.0.0] - 2026-01-28

### Changed

- Improved responsiveness and i18n coverage for environment views (PR #237).

## [66.0.1] - 2026-01-28

### Changed

- Internal update (details were not documented in the changelog) (PR #235).

## [66.0.0] - 2026-01-28

### Fixed

- Minor fixes and adjustments (details were not documented in the changelog) (PR #236).

## [65.0.0] - 2026-01-24

### Fixed

- Minor fixes and adjustments (details were not documented in the changelog).

## [64.2.2] - 2026-01-24

### Changed

- Redesign of theme tokens and UI styling (PR #233).

## [64.2.1] - 2026-01-24

### Changed

- Internal changes (details were not documented in the changelog) (PR #232).

## [64.2.0] - 2026-01-24

### Changed

- Reduced Firestore reads with caching and shared listeners (PR #231).

## [64.1.1] - 2026-01-24

### Fixed

- Bug fixes after recent changes (details were not documented in the changelog) (PR #230).

## [64.1.0] - 2026-01-23

### Fixed

- Bug fixes after recent changes (details were not documented in the changelog).

## [64.0.0] - 2026-01-23

### Fixed

- Maintenance release referenced as "Fix/1.3.1" (details were not documented in the changelog) (PR #15).

## [63.2.0] - 2026-01-23

### Changed

- Enhanced environment bug tracking: severity/priority, details modal, and export updates (PR #228).

## [63.1.0] - 2026-01-23

### Changed

- Hardened Firestore cache reads with cache-first helpers (PR #227).

## [63.0.2] - 2026-01-23

### Changed

- Simplified files in external directory (PR #226).

## [63.0.1] - 2026-01-22

### Fixed

- Internal integration fix (details were not documented in the changelog).

## [63.0.0] - 2026-01-22

### Added

- Internal feature work (details were not documented in the changelog).

## [62.1.1] - 2026-01-22

### Fixed

- Prevented EnvironmentPage modal evidence update loops and fixed hook dependencies (PR #225).

## [62.1.0] - 2026-01-22

### Added

- Added support for Excel export.
- Formatted Excel exports and moved Leave action out of manage modal (PR #224).

## [62.0.0] - 2026-01-22

### Fixed

- Fixed environment exports, time localization, and bug counts (PR #223).

## [61.0.0] - 2026-01-22

### Changed

- Release 1.3.0 (PR #14).
- [QM-41](https://qualitydigital.atlassian.net/browse/QM-41) – Median-based calculation for scenario execution time.
- [QM-43](https://qualitydigital.atlassian.net/browse/QM-43) – Support for editing environments with test suite selection in QA Manager.
- [QM-44](https://qualitydigital.atlassian.net/browse/QM-44) – Updated positioning of the “Go” button in test suite registration flow.
- [QM-42](https://qualitydigital.atlassian.net/browse/QM-42) – Refactored internal models and improved data structure consistency.

### Fixed

- [QM-45](https://qualitydigital.atlassian.net/browse/QM-45) – Fixed Slack message notification delivery issue.

## [60.0.0] - 2026-01-19

### Added

- Integrated StoresRealtimeProvider into AppProviders for real-time store updates.

## [59.0.0] - 2026-01-22

### Changed

- Centralized store listener with persistent Firestore cache (PR #219).

## [58.0.1] - 2026-01-22

### Added

- Allowed adding evidence after completion and prevented details column wrapping (PR #218).

## [58.0.0] - 2026-01-22

### Removed

- Internal removal (details were not documented in the changelog) (PR #217).

## [57.1.1] - 2026-01-22

### Removed

- Internal removal (details were not documented in the changelog) (PR #215).

## [57.1.0] - 2026-01-22

### Changed

- Internal change (details were not documented in the changelog) (PR #214).

## [57.0.0] - 2026-01-22

### Changed

- Avoided redundant auth profile reads and switched bugs to on-demand listing (PR #212).

## [56.0.0] - 2026-01-22

### Removed

- Removed activity log functionality (PR #211).

## [55.0.0] - 2026-01-22

### Added

- Implemented activity logging feature with real-time updates (PR #210).

## [54.0.0] - 2026-01-21

### Added

- Implemented activity logging feature with real-time updates (details were not documented in the changelog).

## [53.0.0] - 2026-01-21

### Changed

- Replaced loading placeholders with skeleton components (PR #209).

## [52.0.0] - 2026-01-21

### Removed

- Removed remaining log feature artifacts (PR #208).

## [51.1.0] - 2026-01-21

### Removed

- Removed console logging, improved login UX, and refactored StoreSummary performance (PR #207).

## [51.0.0] - 2026-01-21

### Changed

- Replaced realtime environment listeners with fetch-based reads and manual refetch (PR #206).

## [50.3.1] - 2026-01-21

### Added

- Internal addition (details were not documented in the changelog) (PR #204).

## [50.3.0] - 2026-01-21

### Added

- Internal addition (details were not documented in the changelog).

## [50.2.0] - 2026-01-21

### Changed

- Defaulted to device language, simplified public links, and improved page load performance (PR #203).

## [50.1.0] - 2026-01-21

### Changed

- Internal changes (details were not documented in the changelog) (PR #202).

## [50.0.1] - 2026-01-21

### Added

- Added moment label to environment cards (PR #201).
- [QM-27](https://qualitydigital.atlassian.net/browse/QM-27) – Fixed missing i18n in “Moment” field.

## [50.0.0] - 2026-01-21

### Changed

- Moved environment creation into kanban card (PR #200).

### Added

- [QM-29](https://qualitydigital.atlassian.net/browse/QM-29) – Added pagination to scenarios table.
- [QM-14](https://qualitydigital.atlassian.net/browse/QM-14) – Added scenario details modal.
- [QM-12](https://qualitydigital.atlassian.net/browse/QM-12) – Added anchor support when editing test scenarios.
- [QM-26](https://qualitydigital.atlassian.net/browse/QM-26) – Enabled result sharing (public link, PDF, and Markdown) after environment completion.
- [QM-34](https://qualitydigital.atlassian.net/browse/QM-34) – Added BrowserStack credentials configuration per organization.
- [QM-35](https://qualitydigital.atlassian.net/browse/QM-35) – Persisted theme and language preferences in Firebase.

### Fixed

- [QM-33](https://qualitydigital.atlassian.net/browse/QM-33) – Fixed save button stuck in loading state and displaying i18n key on error.
- [QM-32](https://qualitydigital.atlassian.net/browse/QM-32) – Fixed PDF and Markdown exports missing i18n labels and values.
- [QM-36](https://qualitydigital.atlassian.net/browse/QM-36) – Fixed error when adding users by email returning undefined response.
- [QM-28](https://qualitydigital.atlassian.net/browse/QM-28) – Fixed scenario criticality filter displaying i18n keys.
- [QM-31](https://qualitydigital.atlassian.net/browse/QM-31) – Fixed user role label displayed without translation.

### Changed

- [QM-25](https://qualitydigital.atlassian.net/browse/QM-25) – Improved responsiveness for large screens (1920px).
- [QM-30](https://qualitydigital.atlassian.net/browse/QM-30) – Removed profile photo upload feature.
- [QM-37](https://qualitydigital.atlassian.net/browse/QM-37) – Removed organization logo upload feature.

## [49.0.4] - 2026-01-21

### Changed

- Internal changes (details were not documented in the changelog) (PR #198).

## [49.0.3] - 2026-01-21

### Added

- Internal addition (details were not documented in the changelog) (PR #197).

## [49.0.2] - 2026-01-21

### Changed

- Formatted Slack summary and auto-send on completion (PR #196).

## [49.0.1] - 2026-01-21

### Changed

- Internal changes (details were not documented in the changelog) (PR #195).

## [49.0.0] - 2026-01-19

### Changed

- Release 1.2.0 (PR #12).

## [48.1.0] - 2026-01-19

### Changed

- Made links clickable, improved action UI, and internationalized PDF exports (PR #194).

## [48.0.1] - 2026-01-18

### Fixed

- Internal fix (details were not documented in the changelog) (PR #192).

## [48.0.0] - 2026-01-18

### Changed

- Standardized back navigation, simplified Profile layout, hid BrowserStack when missing, and showed org store counts (PR #191).

## [47.1.0] - 2026-01-18

### Added

- Internal addition (details were not documented in the changelog) (PR #189).

## [47.0.0] - 2026-01-18

### Removed

- Removed unused automation normalization helper (PR #188).

## [46.0.0] - 2026-01-18

### Changed

- Refactor: pruned unused global styles and shared environment option helper (PR #187).

## [45.0.0] - 2026-01-18

### Removed

- Removed unused store import/export flows (PR #186).

## [44.0.0] - 2026-01-18

### Removed

- Internal removal (details were not documented in the changelog) (PR #185).

## [43.0.1] - 2026-01-17

### Added

- Enhanced user dashboard and preferences management (PR #184).

## [43.0.0] - 2026-01-17

### Changed

- Internal integration update (details were not documented in the changelog).

## [42.0.0] - 2025-12-12

### Changed

- Refactor: improved UserDashboardPage subtitle handling and error states.

## [41.0.1] - 2026-01-17

### Changed

- Internal changes (details were not documented in the changelog) (PR #183).

## [41.0.0] - 2026-01-17

### Added

- Internal addition (details were not documented in the changelog) (PR #181).

## [40.0.0] - 2026-01-16

### Changed

- Centralized i18n strings and replaced hardcoded UI text with translations (PR #180).

## [39.0.0] - 2025-12-22

### Changed

- Internal release labeled "realease 1.10" (details were not documented in the changelog) (PR #178).

## [38.0.0] - 2025-12-12

### Changed

- Release 1.1.0 (PR #8).

## [37.0.1] - 2025-12-09

### Added

- Internal merge related to translation feature (details were not documented in the changelog).

## [37.0.0] - 2025-12-09

### Added

- Added translation files (PR #9).

## [36.0.4] - 2025-12-05

### Added

- Translation feature work (PR #10).

## [36.0.3] - 2025-12-05

### Added

- Added translations to `environmentPage`.
- [QM-8](https://qualitydigital.atlassian.net/browse/QM-8)

## [36.0.2] - 2025-12-05

### Added

- Added homepage translations.
- [QM-7](https://qualitydigital.atlassian.net/browse/QM-7)

## [36.0.1] - 2025-12-05

### Added

- Added translations to admin store page.
- [QM-6](https://qualitydigital.atlassian.net/browse/QM-6)

## [36.0.0] - 2025-12-05

### Removed

- Removed merge conflicts.

## [35.0.1] - 2025-12-05

### Added

- Added translations to admin page.
- [QM-5](https://qualitydigital.atlassian.net/browse/QM-5)

## [35.0.0] - 2025-12-05

### Removed

- Removed merge conflicts and unnecessary dependency usage in `useEffect`.

## [34.0.0] - 2025-12-05

### Changed

- Internal changes (details were not documented in the changelog) (PR #4).

## [33.1.0] - 2025-12-05

### Changed

- Login flow adjustments (PR #2).

## [33.0.0] - 2025-12-02

### Added

- Evidence as text input support (PR #1).

## [32.0.1] - 2025-12-01

### Changed

- Refined dark theme experience and toggle UI (PR #174).

## [32.0.0] - 2025-12-01

### Removed

- Removed unused auth config (PR #173).

## [31.3.2] - 2025-12-01

### Changed

- Configured semantic-release on main branch (PR #170).

## [31.3.1] - 2025-12-01

### Changed

- Updated light and dark theme palettes (PR #169).

## [31.1.0] - 2025-12-01

### Removed

- Removed storage uploads for profile and evidence (PR #166).

## [30.0.0] - 2025-11-29

### Removed

- Removed JSON import/export options and email member invites (PR #160).

## [29.0.2] - 2025-11-24

### Changed

- Displayed organization branding in dashboard header (PR #157).

## [29.0.1] - 2025-11-24

### Fixed

- Fixed organization user lookup within Firestore transaction (PR #156).

## [29.0.0] - 2025-11-24

### Changed

- Enabled automatic organization enrollment via email domain (PR #155).

## [28.0.4] - 2025-11-24

### Removed

- Removed bundled favicon asset (PR #153).

## [28.0.3] - 2025-11-24

### Changed

- Used external QaLite logo reference (PR #151).

## [28.0.0] - 2025-11-24

### Changed

- Refined toast visuals and admin redirect (PR #148).

## [27.1.2] - 2025-11-24

### Changed

- Persisted Firebase auth cookie on auth state changes (PR #147).

## [27.1.1] - 2025-11-23

### Added

- Added data-testids to delete confirmation modals (PR #146).

## [27.1.0] - 2025-11-23

### Added

- Added deletion confirmation modals (PR #144).

## [27.0.1] - 2025-11-23

### Added

- Added public flag to Vercel deployment config (PR #143).

## [27.0.0] - 2025-11-23

### Removed

- Removed unused exports and spinner component (PR #142).

## [26.2.0] - 2025-11-23

### Added

- Added markdown and PDF exports (PR #140).

## [26.1.9] - 2025-11-23

### Changed

- Simplified BrowserStack and environment kanban headers (PR #139).

## [26.1.8] - 2025-11-22

### Changed

- Improved BrowserStack and environment kanban behaviors (PR #138).

## [26.1.7] - 2025-11-22

### Changed

- Refreshed BrowserStack and environment kanban layouts (PR #137).

## [26.1.6] - 2025-11-22

### Added

- Added toggles for optional Slack and BrowserStack inputs (PR #136).

## [26.1.5] - 2025-11-22

### Changed

- Improved BrowserStack kanban dark mode (PR #135).

## [26.1.4] - 2025-11-22

### Changed

- Refined BrowserStack build entity fields (PR #134).

## [26.1.3] - 2025-11-22

### Changed

- Enhanced BrowserStack kanban and exposed it to users (PR #133).

## [26.1.2] - 2025-11-22

### Changed

- Improved BrowserStack error handling (PR #132).

## [26.1.1] - 2025-11-22

### Fixed

- Restricted BrowserStack kanban to admin area (PR #131).

## [26.1.0] - 2025-11-22

### Added

- Added BrowserStack kanban and credentials (PR #129).

## [26.0.3] - 2025-11-22

### Fixed

- Fixed admin store back navigation (PR #128).

## [26.0.2] - 2025-11-22

### Added

- Added data-testid hooks across key flows (PR #126).

## [26.0.1] - 2025-11-22

### Removed

- Removed redundant loading fallback and suite description display (PR #125).

## [26.0.0] - 2025-11-22

### Changed

- Optimized routing performance and memoized environment handlers (PR #124).

## [25.0.3] - 2025-11-22

### Added

- Added editor configuration and Prettier ignore (PR #123).

## [25.0.0] - 2025-11-21

### Changed

- Refactor: simplified types and docs (PR #115).

## [24.1.0] - 2025-11-21

### Changed

- Enhanced environment summary exports and DTO naming (PR #114).

## [24.0.0] - 2025-11-21

### Fixed

- Renamed use case files with UseCase suffix (PR #113).

## [23.1.0] - 2025-11-21

### Added

- Added DTO layer for entities (PR #112).

## [23.0.0] - 2025-11-21

### Changed

- Refactored entities and DTOs into separate modules (PR #111).

## [22.0.0] - 2025-11-21

### Changed

- Refactored environment workflows and repository modules (PR #110).

## [21.0.0] - 2025-11-20

### Added

- Added explicit use case classes per domain entity (PR #109).

## [20.2.0] - 2025-11-19

### Added

- Added Firebase activity logging and admin viewer (PR #108).

## [20.1.0] - 2025-11-19

### Removed

- Removed custom Slack message formatting (PR #106).

## [20.0.0] - 2025-11-19

### Removed

- Reverted Slack environment summary sharing (PR #107).

## [19.1.0] - 2025-11-19

### Added

- Added Slack environment summary sharing (PR #105).

## [19.0.3] - 2025-11-19

### Fixed

- Fixed duplicate status pill on public environment page (PR #104).

## [19.0.2] - 2025-11-19

### Added

- Added environment invite link (PR #103).

## [19.0.0] - 2025-11-19

### Changed

- Simplified architecture with lib modules (PR #101).

## [18.3.2] - 2025-11-18

### Changed

- Updated release workflow to use semantic-release (PR #99).

## [18.3.1] - 2025-11-18

### Changed

- Restricted header branding to active organization (PR #98).

## [18.3.0] - 2025-11-18

### Changed

- Enhanced auth forms with password toggle and clearer errors (PR #97).

## [18.2.1] - 2025-11-18

### Removed

- Removed phone fields from auth (PR #96).

## [18.2.0] - 2025-11-18

### Fixed

- Enforced corporate email policy and fixed automation metrics (PR #95).

## [18.1.1] - 2025-11-18

### Added

- Added toggle to archived environments column (PR #94).

## [18.0.0] - 2025-11-18

### Changed

- Improved kanban stats and auth feedback (PR #92).

## [17.0.0] - 2025-11-18

### Changed

- Restored horizontal scroll confinement for suite tables (PR #91).

## [16.2.0] - 2025-11-17

### Changed

- Simplified environment summary card (PR #86).

## [16.1.1] - 2025-11-17

### Added

- Added Vercel SPA routing config (PR #84).

## [16.1.0] - 2025-11-17

### Changed

- Refactor: centralized environment labels (PR #82).

## [16.0.0] - 2025-11-17

### Changed

- Refactor: environment engagement and summary hooks (PR #81).

## [15.0.0] - 2025-11-17

### Changed

- Simplified service wiring and realtime hooks (PR #80).

## [14.0.0] - 2025-11-17

### Changed

- Simplified service layer (PR #79).

## [13.1.4] - 2025-11-17

### Added

- Added ability to leave environments before conclusion (PR #76).

## [13.1.3] - 2025-11-17

### Changed

- Enforced environment exit flow rules (PR #75).

## [13.1.2] - 2025-11-17

### Changed

- Improved environment export UX and loading indicators (PR #74).

## [13.1.1] - 2025-11-17

### Fixed

- Fixed bug workflow and environment entry (PR #73).

## [13.1.0] - 2025-11-17

### Changed

- Revamped bug registration workflow (PR #71).

## [13.0.0] - 2025-11-17

### Removed

- Reverted link rendering simplification without custom component (PR #72).

## [12.7.0] - 2025-11-17

### Changed

- Simplified link rendering without custom component (PR #70).

## [12.6.1] - 2025-11-17

### Changed

- Styled suite action buttons and hid store URLs (PR #69).

## [12.4.1] - 2025-11-17

### Changed

- Improved environment kanban organization (PR #65).

## [12.4.0] - 2025-11-17

### Changed

- Improved collaborator avatars and simplified profile form (PR #64).

## [12.3.0] - 2025-11-17

### Added

- Added category list toggle and adjusted environment stats (PR #63).

## [12.1.3] - 2025-11-17

### Removed

- Removed outdated helper texts and organization description inputs (PR #60).

## [12.1.2] - 2025-11-17

### Changed

- Refactored auth orchestration and theme context memoization (PR #59).

## [12.1.1] - 2025-11-17

### Changed

- Improved page loading indicator (PR #58).

## [12.1.0] - 2025-11-17

### Added

- Added page loader and environment participant visuals (PR #57).

## [12.0.0] - 2025-11-17

### Fixed

- Showed environment participants and improved suite responsiveness (PR #56).

## [11.1.1] - 2025-11-16

### Removed

- Removed organization selection UI from admin stores page (PR #52).

## [11.1.0] - 2025-11-16

### Added

- Added organization insights and cleaned up branding (PR #51).

## [11.0.0] - 2025-11-16

### Added

- Added organization logo support and updated header branding (PR #50).

## [10.1.9] - 2025-11-16

### Changed

- Allowed viewing environment details without entering (PR #49).

## [10.1.8] - 2025-11-16

### Changed

- Moved organization management to store view and restricted store settings (PR #48).

## [10.1.7] - 2025-11-16

### Changed

- Improved environment summary and admin dashboards (PR #47).

## [10.1.6] - 2025-11-16

### Changed

- Improved responsive layout and status summary (PR #46).

## [10.1.5] - 2025-11-16

### Changed

- Improved environment and suite management UX (PR #45).

## [10.1.4] - 2025-11-16

### Removed

- Removed bug tracking and refined environment cards (PR #44).

## [10.1.3] - 2025-11-16

### Added

- Gated environment features behind entry action (PR #43).

## [10.1.2] - 2025-11-16

### Added

- Added automated release workflow (PR #38).

## [10.1.1] - 2025-11-16

### Changed

- Showed participant avatars on environment cards (PR #37).

## [10.1.0] - 2025-11-16

### Changed

- Localized dashboard copy to Portuguese (PR #36).

## [10.0.0] - 2025-11-16

### Changed

- Refactored environment management into services (PR #33).

## [9.0.4] - 2025-11-16

### Changed

- Refreshed kanban cards and status controls (PR #32).

## [9.0.0] - 2025-11-16

### Added

- Reworked environment UX and services (PR #31).

## [8.1.1] - 2025-11-16

### Fixed

- Fixed environments loading loop (PR #30).

## [8.1.0] - 2025-11-16

### Added

- Added environment kanban and evidence management (PR #29).

## [8.0.0] - 2025-11-16

### Changed

- Refactored auth wiring and service factories (PR #28).

## [7.0.0] - 2025-11-16

### Removed

- Reverted environment testing page (PR #27).

## [6.0.0] - 2025-11-16

### Added

- Added environment testing page (PR #26).

## [5.3.0] - 2025-11-16

### Added

- Added environments kanban board to store summary (PR #25).

## [5.2.8] - 2025-11-15

### Changed

- Moved suite form onto card layer (PR #24).

## [5.2.7] - 2025-11-15

### Added

- Hid suite sections until dedicated view (PR #23).

## [5.2.6] - 2025-11-15

### Added

- Restructured suite management layouts (PR #22).

## [5.2.5] - 2025-11-15

### Changed

- Modernized suite cards (PR #21).

## [5.2.0] - 2025-11-15

### Added

- Added test suite management to store summary (PR #16).

## [5.0.2] - 2025-11-15

### Removed

- Removed manage stores CTA from admin organizations page (PR #14).

## [5.0.1] - 2025-11-15

### Changed

- Locked admin store view to selected organization (PR #13).

## [4.1.0] - 2025-11-15

### Changed

- Aligned admin dashboard with user organization layout (PR #10).

## [4.0.0] - 2025-11-15

### Added

- Reorganized dashboards for organization navigation (PR #9).

## [3.0.0] - 2025-11-15

### Added

- Added admin management for organizations from dashboard (PR #7).

## [2.1.2] - 2025-11-14

### Added

- Added profile contact fields and hid register header (PR #6).

## [2.1.1] - 2025-11-14

### Removed

- Removed auth hero section (PR #5).

## [2.0.0] - 2025-11-14

### Changed

- Refined auth flows with themed toasts and UI refresh (PR #3).

## [1.0.0] - 2025-11-14

### Added

- Added themed UI and profile management (PR #2).
- Added Firebase auth architecture scaffold (PR #1).

## [0.2.0] - 2025-11-14

### Added

- Initial Firebase auth project scaffolding (PR #1).
