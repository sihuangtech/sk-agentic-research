# Papermill: Local, Auditable AI Research Workflow

Papermill connects evidence discovery, falsifiable hypotheses, experiment planning, real Python or Notebook execution, held-out validation, and research writing in a resumable local workflow. It treats generated claims as hypotheses to test, not as scientific results.

[中文文档](README.zh.md)

## Core guarantees

- Typed contracts for evidence, hypotheses, experiment manifests, trials, and validation reports.
- Atomic run state and an append-only event timeline for recovery and audit.
- Baseline/candidate comparisons on identical metrics and seed schedules.
- Separate development and held-out seeds; only held-out results determine the final decision.
- Explicit `accepted`, `rejected`, `inconclusive`, and `invalid` outcomes.
- Bounded candidate iteration instead of unbounded benchmark searching.
- Static code checks, secret-stripped environments, time/memory/output limits, and no shell execution.
- Real Papermill execution for parameterized Jupyter notebooks.
- Human approval before generated code runs by default.
- Citation allowlists and mandatory negative-result labels in generated reports.

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

## Project layout

There are only two deployable application boundaries:

```text
backend/                 FastAPI, CLI, research domain, execution and workflow
├── api/                 HTTP routes, dependencies and process management
├── core/                Configuration, atomic storage and run repository
├── domain/              Typed research contracts
├── infrastructure/      LLM, search, code policy and executors
├── research/            Literature, hypotheses, planning, validation and writing
└── workflow/            Resumable workflow engine and dependency assembly
frontend/                React/Vite web console
data/workspace/          Local runtime artifacts; not an application package
tests/                   Unit and real offline execution tests
docs/                    Architecture, protocol and security documentation
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

OpenAI, Anthropic Claude, and Google Gemini each support a Base URL, model ID, and API key through the Web settings page or their provider-prefixed environment variables. OpenAI can use either the traditional Chat Completions-compatible interface or the Responses API. Keys are stored only in the Git-ignored local `.env` and are never returned by the API.

The defaults are `gpt-5.6-terra` through the Responses API, `claude-sonnet-5`, and `gemini-3.5-flash`. For a third-party compatibility gateway, use only model IDs and API modes exposed by that gateway.

An editable setuptools installation may generate `local_ai_papermill.egg-info`. It is ignored package metadata, not a source or deployment directory.

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

Open `http://127.0.0.1:8000`. For separate development servers:

```bash
python -m uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000` during development.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The service binds to `127.0.0.1:8000`, runs as a non-root container user, and persists `data/workspace/` on the host.

## Development checks

```bash
python -m ruff check backend tests
python -m pytest
cd frontend && npm run lint && npm run build
```

Source files are kept below 250 lines. Chinese comments explain design constraints while identifiers remain in English for cross-language collaboration.

## Documentation and limitations

- [Chinese architecture guide](docs/architecture.zh.md)
- [Research protocol](docs/research-protocol.zh.md)
- [Security boundaries](docs/security.zh.md)
- [Frontend guide](frontend/README.md)

Static checks and local resource monitoring are defense-in-depth controls, not a strong sandbox. Run untrusted generated experiments inside a dedicated container or VM, and require domain review before treating output as scientific evidence.
