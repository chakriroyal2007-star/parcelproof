# Run ParcelProof on another computer

## Requirements and verified platforms

Install Node.js 22.23.2 to match the verified environment (minimum 22.13), with npm. Download Node from https://nodejs.org/en/download. Extract the source ZIP before running commands. The directory containing `package.json` is the project directory.

| Environment | Status |
|---|---|
| macOS ARM64, Node 22.23.2 | Build, automated tests and Chrome workflows verified locally |
| Windows PowerShell / Command Prompt | Portable commands provided; not executed on Windows in this session |
| Linux | Portable commands provided; not executed on Linux in this session |
| Docker | Configuration included; not executed because Docker is unavailable here |
| GitHub Actions | Three-platform workflow included; no remote CI run has been performed |

Do not copy `node_modules`, `.next`, or `.env.local` between computers. Install dependencies on each machine. Never distribute API keys. The source ZIP excludes credentials, generated databases and installed dependencies.

## macOS or Linux terminal

```bash
cd /path/to/parcelproof
node --version
npm --version
npm ci
npm run setup
npm run doctor
npm run dev
```

If using nvm, `nvm install` and `nvm use` in the project select the version in `.nvmrc`. This is optional; a normal Node installation works.

## Windows PowerShell

```powershell
Set-Location "C:\Projects\parcelproof"
node --version
npm.cmd --version
npm.cmd ci
npm.cmd run setup
npm.cmd run doctor
npm.cmd run dev
```

Using `npm.cmd` avoids PowerShell script-execution-policy issues without changing system security settings. Choose the actual folder where you extracted the project.

## Windows Command Prompt

```bat
cd /d C:\Projects\parcelproof
node --version
npm ci
npm run setup
npm run doctor
npm run dev
```

For all systems, open **http://127.0.0.1:3000**. Keep the terminal running. Stop with Ctrl+C. Setup creates `.env.local` only when absent and initializes synthetic records without erasing existing work. No API key is needed for fixture mode.

## Production-style local demo

Stop the development server first:

```text
npm run build
npm start
```

Open the same URL. Rebuild after source edits. Use `npm run dev -- --port 3001` or `npm start -- --port 3001` if port 3000 is occupied, then open port 3001. On PowerShell, substitute `npm.cmd` if needed.

## Real AI mode

Edit `.env.local` in a text editor:

```dotenv
AI_MODE=live
OPENAI_API_KEY=your-real-api-key
OPENAI_MODEL=gpt-4.1-mini
EMBEDDING_MODEL=text-embedding-3-small
PARCELPROOF_DB=data/parcelproof.sqlite
DEMO_NOW=2026-10-01T12:00:00.000Z
```

Do not use a `NEXT_PUBLIC_` prefix for the key. Restart the app after changing configuration.

```text
npm run doctor
npm run ingest
npm run evaluate:live
npm run dev
```

Ingestion and evaluation make real, potentially billable API calls using synthetic records. Evaluation creates a separate database under `data/live-evaluation-*`, makes no approval calls, and saves generated outputs, observed timings and pass/fail checks to `reports/live-evaluation.json`. It does not alter the main demo case state. Manually inspect the generated quotations, citations and reply before presenting. Model access depends on your API account.

`evaluate:live` intentionally refuses to run in fixture mode or without a key. It does not manufacture live results. To return to an offline demo, set `AI_MODE=fixture` and restart. Re-analyze the case to replace a saved live narrative with fixture output.

## Configuration reference

| Variable | Default | Purpose |
|---|---|---|
| `AI_MODE` | `fixture` | `fixture` or `live` |
| `OPENAI_API_KEY` | empty | Server-only provider credential; required only for live mode |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Structured extraction and reconciliation model |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Real embedding model; re-ingest after changing it |
| `PARCELPROOF_DB` | `data/parcelproof.sqlite` | Writable local SQLite path, relative to project directory |
| `DEMO_NOW` | `2026-10-01T12:00:00.000Z` | Fixed scenario clock for policy/deadline decisions |
| `PLAYWRIGHT_CHANNEL` | unset | Optional installed browser channel, e.g. `chrome`, for browser tests |

Shell environment values take precedence over `.env.local`. Keep configuration in that one file for a straightforward demo. Doctor prints whether a key is configured, never its value, and makes no network calls. It checks prerequisites, not live provider connectivity or index completeness.

## Tests

```text
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

On Linux, browser libraries may be needed: use Playwright's `npx playwright install --with-deps chromium` on a machine where you can install system packages. The core tests do not need a browser or network. The browser suite starts a separate server at port 3100 and uses `data/e2e.sqlite`.

To use installed Chrome on macOS/Linux:

```bash
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL="chrome"
npm.cmd run test:e2e
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

Command Prompt:

```bat
set PLAYWRIGHT_CHANNEL=chrome
npm run test:e2e
set PLAYWRIGHT_CHANNEL=
```

`.github/workflows/checks.yml` is ready to run fixture tests and builds on Windows, macOS and Ubuntu after you push the project to your own GitHub repository. It needs no model credential. The workflow has not been run remotely here.

## Docker option

Requires Docker Engine/Desktop with Compose. This path is provided but has not been executed in this session.

From the extracted project:

```text
docker compose up --build
```

Open http://127.0.0.1:3000. Stop another local app on that port first. The container serves on its internal network, while Compose exposes it only on your computer's loopback address. A named volume preserves the SQLite database. The image runs as the non-root `node` user. Dependency installation and the first image build require internet access.

```text
 docker compose down
```

This stops containers and retains data. `docker compose down --volumes` also deletes the demo database; use it only when intentionally resetting Docker data.

For live Docker mode, create `.env.local` from `.env.example` and edit the key/mode. Copy with `cp .env.example .env.local` on macOS/Linux, `Copy-Item .env.example .env.local` in PowerShell, or `copy .env.example .env.local` in Command Prompt. Then:

```text
 docker compose --env-file .env.local up --build -d
 docker compose --env-file .env.local exec parcelproof npm run ingest
```

Use the same `--env-file` argument for subsequent Compose commands. Credentials are passed at runtime and excluded from the image build. The Docker database path is fixed to the mounted `/app/data/parcelproof.sqlite`, independent of the host path.

## Reset and backup

Stop the server, then `npm run reset`. This deletes the configured SQLite database and reseeds all four cases. Re-run `npm run ingest` for live mode afterward. Start the server again. Reset does not erase the key in `.env.local`.

For a backup, stop the server and copy the database plus any matching `-wal` and `-shm` files together, or copy the entire `data` directory. Keep backups private if you later replace synthetic data. Do not copy only a live SQLite main file while its process is writing.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `node` / `npm` not found | Install Node, reopen the terminal and confirm versions |
| Unknown `node:sqlite` or CLI option | Use Node 22.13+; 22.23.2 matches the local verification |
| PowerShell blocks `npm.ps1` | Run `npm.cmd` instead |
| `npm ci` reports lock mismatch | Keep `package.json` and `package-lock.json` from the same source bundle; do not mix versions |
| Registry/proxy/DNS installation error | Check your organization's approved npm registry/proxy; do not disable TLS verification |
| Missing native package after moving computers | Delete copied `node_modules`; reinstall with `npm ci` on the target machine |
| Port already in use | Stop the other app or use `--port 3001` |
| Missing database permission | Put the project and configured database in a user-writable folder; run doctor |
| Live index missing or outdated | Run `npm run ingest` in live mode with the same database/model configuration |
| API key, quota or model access error | Check server configuration and API account; use fixture mode for an offline demonstration |
| Model output rejected | No action was authorized; inspect the error and re-analyze rather than bypassing validation |
| Promise no longer overdue | Reset the scenario clock to the documented value; reset demo data if a refund was already approved |
| Browser executable missing | Install Chromium or configure the installed Chrome channel |
| Changes missing with `npm start` | Stop, rebuild, then restart; refresh the browser |
| Modified fixture code does not change old records | Stop and reset the demo database, then re-ingest for live mode |

This app requires a persistent Node process and writable SQLite storage. Static-only hosting cannot run it. Public/serverless/multi-instance deployment needs additional persistence, authentication and operational work; it is not a one-click production deployment.

References: [npm clean installs](https://docs.npmjs.com/cli/v10/commands/npm-ci/), [Node CLI](https://nodejs.org/api/cli.html), [Docker Compose](https://docs.docker.com/compose/gettingstarted/).
