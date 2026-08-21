# Changelog (SynCan)

All notable changes to the SynCan app itself go here. This is separate from
`packages/fossflow-lib/docs/CHANGELOG-upstream.md`, which is the changelog
inherited from the upstream FossFLOW project that the diagram editor is
based on.

## Unreleased

- Repo reorganized: `packages/fossflow-app` -> `packages/syncan-app`,
  `packages/fossflow-backend` -> `packages/syncan-backend`
- Removed unused Material Tailwind dashboard template leftovers
  (`main.jsx`, `routes.tsx`, unused demo images)
- Removed upstream-only CI workflows, e2e Selenium test harness, and
  GitHub Pages subpath test scripts (not applicable to this Docker-based
  deployment)
- Moved FossFLOW-library-specific docs into `packages/fossflow-lib/docs/`
