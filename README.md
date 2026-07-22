# Nimlat

Nimlat is a desktop application for organizing an anime library and tracking how titles, seasons, and episodes are
integrated into a personal media collection.

It combines a locally managed anime catalog with user-owned library state. Metadata is enriched from AniList and Jikan,
while persistent state is kept in SQLite databases owned by the Electron main process. Images and logs are stored
alongside those databases in the application data directory.

## Features

- Browse large libraries through a virtualized PixiJS media wall, with search, filters, selection, and ignored-item
  views.
- Organize media into official series groups or custom user groups, with local overrides and safe reconciliation when
  catalog grouping changes.
- Inspect media metadata, episodes, characters, voice actors, staff, relations, and group release timelines.
- Track watched and integrated state at group, media, and episode level.
- Connect external tracking providers, including AniList import and synchronization workflows.
- Monitor upcoming and recently released titles through Release Watch.
- Configure download-search providers, query presets, and external browser actions.
- Maintain portrait, banner, and episode artwork through a local cache and user-managed image galleries.
- Download a verified catalog baseline, populate a catalog from providers, and incrementally hydrate or refresh metadata
  in the background.
- Inspect failed enrichment jobs and retry recoverable catalog operations.

## Technology

| Area                    | Main technologies                                        |
|-------------------------|----------------------------------------------------------|
| Desktop runtime         | Electron 43, Vite                                        |
| Renderer                | React 19, TypeScript, Ant Design, TanStack Router, Jotai |
| High-volume rendering   | PixiJS, TanStack Virtual                                 |
| Main-process data       | SQLite through `better-sqlite3`                          |
| Background coordination | RxJS, `p-queue`                                          |
| External metadata       | AniList GraphQL API, Jikan API                           |
| Testing                 | Vitest, Testing Library, Playwright Electron             |
| Packaging               | electron-builder                                         |

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A native build toolchain for Electron dependencies such as `better-sqlite3`:
  - Windows: Python 3 and Visual Studio 2022 Build Tools with the **Desktop development with C++** workload
  - macOS: Python 3 and Xcode Command Line Tools (`xcode-select --install`)
  - Linux: Python 3, `make`, and a C/C++ compiler toolchain (commonly the distribution's `build-essential` package)

The native toolchain is required whenever a compatible prebuilt binary is unavailable.

### Windows 11 setup

Windows needs these three prerequisites before `npm install` can compile native Electron modules such as
`better-sqlite3`:

1. **Node.js LTS**, which also installs npm.
2. **Python 3**, used by `node-gyp` while compiling native modules.
3. **Visual Studio 2022 Build Tools** with the **Desktop development with C++** workload, which provides the MSVC
   compiler and Windows SDK. The full Visual Studio IDE is not required.

Open PowerShell as Administrator and install all three with `winget`:

```powershell
winget install --exact --id OpenJS.NodeJS.LTS
winget install --exact --id Python.Python.3.13
winget install --exact --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

Alternatively, install Node.js LTS from [nodejs.org](https://nodejs.org/), Python 3 from
[python.org](https://www.python.org/downloads/windows/) with **Add Python to PATH** enabled, and Build Tools from
[visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/). In Visual Studio Installer, select the
**Desktop development with C++** workload and keep its recommended components enabled.

After all installers finish, close and reopen PowerShell. Verify Node.js/npm and Python:

```powershell
node --version
npm --version
py -3 --version
```

Verify that the Visual C++ toolchain is installed. The command should print the Build Tools installation directory:

```powershell
& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
```

If `py -3 --version` fails but Python is installed, reopen the terminal first. If Python is in a non-standard location,
point `node-gyp` at its executable for the current PowerShell session:

```powershell
$env:npm_config_python = "C:\path\to\python.exe"
```

Then install dependencies (or rerun the command if it previously failed):

```bash
npm install
```

The install lifecycle rebuilds native dependencies for the Electron version used by the project.

## Development

Start Vite, Electron, and the Ant Design theme generator in watch mode:

```bash
npm run dev
```

Source changes restart or refresh the appropriate process. Application data is written to the platform application-data
directory under `Nimlat`, not to the repository. Development and packaged builds can therefore share local data on the
same machine; back up that directory or use an isolated OS profile before testing destructive data flows.

Before submitting a change, run the complete local validation gate:

```bash
npm run validate
```

Tests must not call live metadata or tracking services. Provider behavior in automated tests is supplied through
deterministic doubles.

## NPM Scripts

### Development and code quality

| Command                 | Purpose                                                                  |
|-------------------------|--------------------------------------------------------------------------|
| `npm run dev`           | Run the renderer, Electron processes, and theme generator in watch mode. |
| `npm run lint`          | Check the repository with ESLint.                                        |
| `npm run test`          | Run the Vitest suite once.                                               |
| `npm run test:watch`    | Run Vitest in interactive watch mode.                                    |
| `npm run audit:exports` | Detect unused exports and dead public surface area.                      |
| `npm run audit:prod`    | Audit production dependencies with npm.                                  |

### Validation

| Command                  | Purpose                                                                                          |
|--------------------------|--------------------------------------------------------------------------------------------------|
| `npm run validate:quick` | Run repository type checking, linting, the export audit, and unit/component tests.               |
| `npm run test:e2e`       | Exercise renderer-to-preload-to-main-to-SQLite flows in Electron with mocked external providers. |
| `npm run smoke:db`       | Run the Electron-backed database smoke suite against temporary databases.                        |
| `npm run validate`       | Run `validate:quick`, the complete Electron E2E suite, and the database smoke suite.             |

### Build and distribution

| Command                  | Purpose                                                                                                                                                      |
|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `npm run build`          | Clean previous outputs, generate theme variables, build the renderer, main, and preload bundles into `dist/`, prepare icons, and verify the output contract. |
| `npm run verify:build`   | Verify an existing `dist/` build without rebuilding it.                                                                                                      |
| `npm run package`        | Build the application and create packages for the current platform in `release/`.                                                                            |
| `npm run package:mac`    | Build macOS DMG and ZIP artifacts for x64 and arm64.                                                                                                         |
| `npm run package:win`    | Build a Windows NSIS installer.                                                                                                                              |
| `npm run package:linux`  | Build a Linux AppImage.                                                                                                                                      |
| `npm run publish:github` | Build and publish configured artifacts to GitHub Releases; credentials and a release-ready version are required.                                             |

`prebuild` and `postinstall` are npm lifecycle hooks. They generate renderer theme variables and rebuild native Electron
dependencies respectively. Scripts prefixed with `internal:` are implementation details composed by the public commands
above.

Maintainers can run **Build draft release** from the repository's GitHub Actions page. The manual workflow accepts only
`master`, derives `v<version>` from `package.json`, and creates or updates a GitHub Draft Release. It builds Windows x64,
Linux x64, and separate macOS x64 and ARM64 DMGs, uploads updater metadata only for supported platforms, then verifies the
draft. Installer filenames include the target operating system. macOS packages use an ad-hoc code signature so they can
be built without a paid Apple Developer membership; because they are not notarized, users must explicitly approve Nimlat
in macOS Privacy & Security on first launch and install future macOS releases manually. No temporary GitHub Actions
artifacts are stored; publishing the verified draft remains a manual action.

## Architecture

Nimlat follows Electron's process isolation model. The renderer never receives direct access to Electron or SQLite APIs.

| Step | Boundary               | Responsibility                                                                      |
|-----:|------------------------|-------------------------------------------------------------------------------------|
|    1 | React renderer         | Calls task-specific methods on the typed `window.electronAPI` contract.             |
|    2 | Preload context bridge | Converts those calls into narrow IPC requests without exposing Electron primitives. |
|    3 | Main IPC handlers      | Validate and delegate requests to application services.                             |
|    4 | Services and daemons   | Own orchestration, provider communication, filesystem work, and business rules.     |
|    5 | Database facades       | Provide thin entry points to SQL operations owned by the database layer.            |
|    6 | SQLite                 | Persists catalog, user, and image state across the three attached databases.        |

Renderer-visible mutations travel in the opposite direction through domain buses, main-process event bridges, and typed
IPC events.

The primary boundaries are:

- **Renderer:** functional React components, TanStack routes, feature hooks, UI services, and PixiJS surfaces. It
  communicates only through the typed preload API.
- **Preload:** the narrow `contextBridge` contract exposed as `window.electronAPI`. It contains transport adapters, not
  business rules.
- **Main process:** application services, provider clients, background daemons, IPC registration, update handling, and
  filesystem ownership.
- **Database layer:** every SQL statement and database operation lives under `src/database`. Main-process code reaches
  it through thin facades.
- **Domain events:** mutations publish main-process bus events; IPC bridges translate them into renderer invalidations
  or item patches.

Business and selection rules belong in the main process or database layer. Renderer state is intentionally limited to
presentation and short-lived interaction state.

## Data Storage

Nimlat opens one primary database and attaches two additional SQLite datasets:

| Database        | Responsibility                                                                                                   |
|-----------------|------------------------------------------------------------------------------------------------------------------|
| `user_data.db`  | User configuration, watch and integration state, custom grouping, tracking accounts, and release-watch state.    |
| `anime_data.db` | Replaceable shared catalog data, provider mappings, people, relations, episodes, grouping, and hydration queues. |
| `image_data.db` | Remote-image cache bookkeeping, local-upload metadata, galleries, and active image selections.                   |

SQLite is the runtime source of truth. Catalog baseline replacement is checksum-verified and uses backup/rollback
protection. Published schema changes require an explicit migration and maintainer review; user databases must never be
silently
wiped or rebuilt.

## Repository Layout

```text
.
├── src/
│   ├── architecture/    # Executable dependency and boundary checks
│   ├── busses/          # Main and renderer domain-event buses
│   ├── constants/       # Process-specific and shared constants
│   ├── database/        # Schema initialization, SQL operations, and DB facades
│   ├── loggers/         # Main and renderer logging infrastructure
│   ├── main/            # Electron bootstrap, services, daemons, providers, and IPC
│   ├── preload/         # Typed contextBridge modules
│   ├── renderer/        # React routes, features, components, hooks, and Pixi surfaces
│   └── shared/          # Cross-process types and pure helpers
├── tools/               # Build, validation, smoke, and Electron E2E tooling
├── dist/                # Generated development/production build output
└── release/             # Generated installer and archive artifacts
```

## Working Conventions

- Keep SQL and database operations inside `src/database`.
- Keep IPC handlers thin; orchestration and error handling belong in main-process services.
- Keep Electron APIs isolated in preload and expose only typed, task-specific methods.
- Use shared types for contracts that cross process or feature boundaries.
- Publish domain events after mutations that affect renderer-visible state.
- Use CSS modules and Ant Design theme tokens for component styling.
- Preserve bounded database payloads and virtualization for large media collections.
- Add focused tests for changed behavior and run `npm run validate` for boundary, IPC, database, or packaging changes.

## Project Information

See [LICENSE](LICENSE) for licensing terms, [NOTICE.md](NOTICE.md) for project notices, and
[RELEASING.md](RELEASING.md) for the maintainer release process.
