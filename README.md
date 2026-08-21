# SynCan

SynCan is an internal web app for managing inventory, IT assets, and toner/refill tracking, with a built-in isometric network diagram editor (based on [FossFLOW](https://github.com/stan-smith/FossFLOW) / [Isoflow](https://github.com/markmanx/isoflow)) for documenting infrastructure layouts.

## Features

- **Dashboard** - overview of assets, inventory, and toner status
- **Inventory** - track stock items
- **Assets** - track IT assets with history
- **Toner** - toner/refill tracking and status
- **Reports** - generate reports
- **Diagram Editor** (`/flow`) - draw isometric network/infrastructure diagrams, powered by the embedded `fossflow-lib` package
- **Auth** - JWT-based login, session handling

## Monorepo Structure

```
packages/
  syncan-app/       # Frontend (React, RSBuild) - dashboard, inventory, assets, toner, reports, diagram editor
  syncan-backend/   # Backend (Express + MySQL) - auth, data API, diagram storage
  fossflow-lib/     # Diagram editor library (forked from Isoflow), used by syncan-app
```

## Quick Deploy with Docker

```bash
# Using Docker Compose (recommended - includes persistent storage)
docker compose up
```

This builds the image locally from the `Dockerfile` and starts:
- the frontend + nginx on port `80`
- the backend API on port `3001`

Server storage is enabled by default. Diagrams are saved to the volume mounted in `compose.yml` (`/opt/syncan/diagrams` by default). Configure DB connection, JWT secrets, etc. via the environment variables in `compose.yml`.

To disable diagram server storage, set `ENABLE_SERVER_STORAGE=false`.

## Local Development

```bash
# Install dependencies (workspace root)
npm install

# Build the diagram library (required first time, and after changes to fossflow-lib)
npm run build:lib

# Start the frontend dev server
npm run dev

# In another terminal, start the backend
npm run dev:backend
```

Frontend dev server runs at [http://localhost:3000](http://localhost:3000) by default (see `packages/syncan-app`).

### Development Commands

```bash
npm run dev            # Start syncan-app dev server
npm run dev:backend    # Start syncan-backend dev server
npm run dev:lib        # Watch mode for fossflow-lib

npm run build          # Build fossflow-lib then syncan-app
npm run build:lib      # Build fossflow-lib only
npm run build:app      # Build syncan-app only

npm test               # Run unit tests
npm run lint           # Check for linting errors
```

## Diagram Editor Basics

The `/flow` page embeds the diagram editor:

1. **Add items** - press "+" on the top menu to open the component library, then drag onto the canvas.
2. **Connect items** - select the Connector tool, then click two nodes to link them (drag mode also available in Settings).
3. **Save** - Quick Save (session), Export/Import (JSON), or server storage (if enabled).

## Credits

The diagram editor is built on top of [FossFLOW](https://github.com/stan-smith/FossFLOW) by Stan Smith, which itself is forked from [Isoflow](https://github.com/markmanx/isoflow). Reference docs for that part of the codebase live in `packages/fossflow-lib/docs/`.

## License

MIT
