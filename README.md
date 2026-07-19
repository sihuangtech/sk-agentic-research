# Agentic Research: Local, Auditable AI Research Agent

Agentic Research connects evidence discovery, falsifiable hypotheses, experiment planning, real Python or Notebook execution, held-out validation, and research writing in a resumable autonomous research workflow. It treats generated claims as hypotheses to test, not as scientific results.

[中文文档](README.zh.md)

## What you can do with it

### Turn a research direction into an executable plan

Provide a topic such as “reliable few-shot medical image segmentation.” Papermill collects and organizes evidence, proposes falsifiable hypotheses, and creates an experiment plan with a baseline, candidate approach, metrics, seed schedule, and pass criteria. The plan pauses for your approval before generated code runs.

### Run AI-authored experiments, not just AI-written conclusions

After approval, Papermill generates Python experiments or parameterized Jupyter notebooks and runs them locally under controlled limits. Each trial retains its code, inputs, raw results, logs, exit status, and duration. Executed notebooks are retained for review and reproduction.

### Judge results with held-out validation

Development seeds are used to improve a candidate; separate held-out seeds are used only for the final decision. Papermill compares baseline and candidate success rate, minimum improvement, and variability, then reports `accepted`, `rejected`, `inconclusive`, or `invalid` rather than treating a single successful run as a finding.

### Produce an auditable research report

Completed runs can produce Markdown, LaTeX, and optional PDF reports. Citations are drawn from the saved evidence snapshot, and results and limitations are included. Unvalidated results are explicitly labelled instead of being presented as positive conclusions.

### Manage the workflow locally

Use the Tauri desktop app, CLI, or Web console to see progress, live logs, metrics, hypotheses, reports, and approval requests. Interrupted runs can be resumed or cancelled. The desktop UI supports Simplified Chinese and English, follows the OS language on first launch, and remembers the user's explicit choice. Desktop data stays in the OS application-data directory; Web/CLI artifacts remain under `data/workspace/`.

### Use your own model provider

OpenAI, Anthropic Claude, and Google Gemini are supported. Each provider has its own Base URL, model ID, and API key. OpenAI can use either the Responses API or the traditional Chat Completions-compatible interface, including compatible gateways that provide the selected interface.

## Operating boundaries

- Metrics, thresholds, and seed schedules are fixed before each experiment; baseline and candidate are compared under the same conditions.
- Generated code does not run through a shell. API keys are removed from its environment, and execution has time, memory, and log limits.
- Papermill helps design, execute, and audit research; it cannot prove that a study design is sound, data is leak-free, or a conclusion is statistically significant. Domain review remains necessary for high-stakes research.

## Workflow

```text
Research direction
  -> multi-source evidence retrieval and deduplication
  -> falsifiable hypothesis and structured review
  -> baseline/candidate experiment plan
  -> human approval by default
  -> bounded iteration on development seeds
  -> independent held-out validation
  -> accepted / rejected / inconclusive / invalid
  -> Markdown / LaTeX / optional PDF report
```

## Install

Python 3.10+ and Node.js 20+ are required. Install dependencies only through the official package-manager commands:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'

cd frontend
npm ci
cd ..

cp .env.example .env
```

Desktop development additionally requires Rust stable and the [Tauri 2 system prerequisites](https://v2.tauri.app/start/prerequisites/):

```bash
npm install
npm --prefix frontend install
```

OpenAI, Anthropic Claude, and Google Gemini each support a Base URL, model ID, and API key through the Web settings page or their provider-prefixed environment variables. OpenAI can use either the traditional Chat Completions-compatible interface or the Responses API. Keys are stored only in the Git-ignored local `.env` and are never returned by the API.

The defaults are `gpt-5.6-terra` through the Responses API, `claude-sonnet-5`, and `gemini-3.5-flash`. For a third-party compatibility gateway, use only model IDs and API modes exposed by that gateway.

## First run

Run diagnostics and the real-process offline demo before configuring an external model:

```bash
python -m backend.cli doctor
python -m backend.cli demo
python -m pytest
```

The demo launches 12 isolated child processes and stores its auditable artifacts under `data/workspace/runs/`.

## Research commands

```bash
python -m backend.cli run --direction "Reliable few-shot medical image segmentation" --max-ideas 2
python -m backend.cli status
python -m backend.cli approve <run_id>
python -m backend.cli resume <run_id>
python -m backend.cli cancel <run_id>
python -m backend.cli daemon
```

With the default configuration, a new run pauses at `waiting_review` before generated experiment code executes.

## Web console

Build the frontend and start the local API/static server:

```bash
./start.sh
```

Open `http://127.0.0.1:8000`.

## Tauri desktop app

The desktop app reuses the existing React/Vite frontend and bundles FastAPI as a Python sidecar, so end users do not need to install Python or Node.js.

```bash
npm run desktop:dev
npm run desktop:build
```

The build scripts generate the target-triple sidecar automatically. The Rust host chooses an unused loopback port, creates an ephemeral API token, starts the backend, and terminates it when the app exits. Desktop configuration and research artifacts live in the OS application-data directory. See the [Chinese desktop architecture guide](docs/desktop.zh.md) for details.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The service binds to `127.0.0.1:8000`, runs as a non-root container user, and persists `data/workspace/` on the host.

## Documentation and limitations

- [Chinese architecture guide](docs/architecture.zh.md)
- [Research protocol](docs/research-protocol.zh.md)
- [Security boundaries](docs/security.zh.md)
- [Frontend guide](frontend/README.md)
- [Tauri desktop architecture](docs/desktop.zh.md)

Static checks and local resource monitoring are defense-in-depth controls, not a strong sandbox. Run untrusted generated experiments inside a dedicated container or VM, and require domain review before treating output as scientific evidence.
