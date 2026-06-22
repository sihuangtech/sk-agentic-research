# Papermill

Papermill is an autonomous AI research pipeline inspired by Fully Automated Research Systems (FARS). It coordinates specialized agents to move from literature discovery and hypothesis generation through experiment planning, execution, and paper drafting.

[中文文档](README.zh.md)

## What it does

The pipeline is designed around research hypotheses rather than document production. Each accepted hypothesis can be planned, tested, and documented as a concise LaTeX paper, whether the experimental outcome is positive or negative.

The system is composed of four agents that communicate through a shared workspace:

1. **Ideation agent** (`src/agents/ideation_agent.py`) searches research sources and proposes hypotheses. It supports arXiv, Semantic Scholar, Google Scholar, GitHub, and Hugging Face, and uses an internal review score to filter ideas.
2. **Planning agent** (`src/agents/planning_agent.py`) turns an idea into an experiment plan and a Python experiment scaffold.
3. **Experiment agent** (`src/agents/experiment_agent.py`) runs generated experiments, captures JSON results, and can ask the LLM to repair a failed experiment up to three times.
4. **Writing agent** (`src/agents/writing_agent.py`) creates charts, drafts a LaTeX paper, and compiles it with `pdflatex` when available.

`src/orchestrator.py` coordinates concurrent pipelines. A FastAPI backend and React/Vite frontend provide a browser interface for viewing ideas, pipeline status, papers, logs, and configuration.

## Requirements

- Python 3.9 or later
- Node.js 18 or later (only required for the web frontend)
- A LaTeX distribution with `pdflatex` (required to compile PDF papers)
- At least one configured LLM provider key

## Quick start

1. Create a local environment file and add the keys for the providers you intend to use:

   ```bash
   cp .env.example .env
   ```

2. Create and activate a Python virtual environment, then install backend dependencies:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. Review `config.yaml` and set the research directions, model name, concurrency, and time limits.

4. Run the autonomous pipeline:

   ```bash
   python -m src.orchestrator
   ```

## Web application

Build the frontend and copy the generated assets to the backend static directory:

```bash
cd frontend
npm install
npm run build
cd ..
mkdir -p backend/static
cp -r frontend/dist/* backend/static/
```

Then start the API server from the repository root:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Alternatively, `./start.sh` builds the frontend, installs Python dependencies, and starts the backend. Docker users can build and run the bundled `Dockerfile` or use `docker-compose.yml`.

## Project layout

```text
backend/                 FastAPI application and static web assets
frontend/                React/Vite web application
src/
├── agents/              LLM integration and research pipeline agents
├── workspace/           Persistent research artifacts
│   ├── ideas/           Generated hypotheses
│   ├── memory/          Processed-paper memory
│   ├── experiments/     Generated experiment plans and code
│   ├── results/         Experiment result data
│   ├── references/      Downloaded references
│   └── latex/           Generated LaTeX source and compiled papers
└── orchestrator.py      Pipeline coordinator
config.yaml              Runtime configuration
prompts.yaml             Agent prompt templates
```

## Configuration and credentials

`config.yaml` controls the research directions, selected model, hypothesis review threshold, concurrent pipelines, experiment timeout, and automatic commits. API keys and service tokens belong only in `.env`; use `.env.example` as the template and never commit real credentials.

## Notes

- Generated workspace artifacts are intentionally kept available for review and optional automatic Git commits.
- The LaTeX writer attempts to install `texlive-full` if `pdflatex` is unavailable. In local or production environments, install and manage TeX dependencies explicitly instead.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sihuangtech/papermill&type=Date)](https://star-history.com/#sihuangtech/papermill&Date)
