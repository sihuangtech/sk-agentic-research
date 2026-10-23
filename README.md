# Second Moon

<img src="frontend/public/brand/second-moon.png" alt="Second Moon icon" width="96" />

Your personal research agent.

Work from a paper or an idea to analysis scripts, experiments and research outputs in the same project. Second Moon reads and edits real files, runs local tools and saves results in your project folder, turning conversations into work you can inspect and reuse.

[中文说明](README.zh.md) · [Get started](#get-started) · [Run from source](#run-from-source) · [Data and background work](#data-and-background-work)

## What you can do

- **Understand a research project**: review documentation, code and materials, identify research goals and decide what to test next. Keep separate conversations for different projects and reopen past sessions to continue working.
- **Read papers and explore literature**: extract PDF text with page references and find publication titles, authors, DOIs and source links to support your notes and evidence review.
- **Analyze data and run experiments**: inspect data, write or revise scripts, execute local commands and save results and charts in the project. Project environments such as Python, R and Julia must be installed separately.
- **Collaborate during execution**: follow streaming answers and tool results, steer an active task, queue a follow-up or stop the current turn. Run lengthy commands as independent jobs, inspect their status and recent logs, and cancel them separately.
- **Inspect and edit outputs**: browse files, edit text and code, and preview PDFs and images. Responses support Markdown, tables and mathematical notation. The editor detects changes made by other programs before saving.
- **Keep research context**: save personal preferences and project memory for future turns, then edit or delete them whenever needed.
- **Schedule ongoing research**: set up recurring tasks, such as finding new papers and updating literature notes. Every run creates a conversation so you can inspect its process and results.

## Get started

1. Open the app, choose **Open project**, and select an existing research folder.
2. Connect your model service in **Models & API settings**, save the configuration and test the connection. You can also connect a model already running locally.
3. Create a research session, select a model and describe your task. Press `⌘ / Ctrl + Enter` to send.
4. Use **Files**, **Jobs**, **Memory** and **Automations** to inspect outputs and manage ongoing work.

Try a task such as:

> Read the project documentation and existing scripts. Summarize completed work and identify the questions that still need to be tested.

> Inspect the CSV files in data, report missing values and outliers, write a reproducible analysis script, save charts to figures, and record the commands you actually run.

> Read the methods section of this PDF. Include page references and list the data, parameters and steps needed to reproduce the experiment. Separate anything the paper does not establish.

The agent can change files and execute local commands. Start with a separate project to become familiar with its behavior, and keep backups of important materials.

## Languages

Choose from Simplified Chinese, Traditional Chinese, English, Japanese, Korean, French, German, Spanish, Brazilian Portuguese and Russian in the sidebar. Your choice is saved locally; the first launch follows your system or browser language preferences.

Interface labels, dates, service messages and tray menus update together without clearing your draft. New turns and newly scheduled tasks default to the selected language; you can request another response language in the task. Existing files, user content and past responses retain their original text.

The editor's internal menu language is selected when it first loads. Restart the app to fully update those menus after switching languages. Its current official Brazilian Portuguese pack has no translated strings, so those internal menus remain in English; the app's own Portuguese interface and messages are translated.

## Data and background work

Source materials and generated outputs stay in your chosen project folder. Conversations, memories, job records and model configurations are stored in the local application data directory. API keys entered in settings are kept separately in the operating system's credential store, without plaintext storage in project files or the configuration database.

Online model requests send the relevant prompts, file contents, memories and tool results to your configured provider, which handles model billing. Literature search requires an internet connection. Local models can support offline tasks that do not need external information. There is currently no cloud account service, device synchronization or team collaboration backend.

Closing the window leaves the app running in the system tray. Quitting stops local execution. Stopping a conversation turn does not cancel independently submitted command jobs; cancel those in **Jobs**.

Scheduled work requires the app to be running. Nothing executes while the computer sleeps, is shut down or the app has quit. On restart, an overdue schedule runs once rather than replaying every missed interval. Conversation history can be restored, but interrupted processes and experiments are not automatically restarted.

## Run from source

Install Node.js 24 or later. Desktop development and packaging also require Rust and the [Tauri platform prerequisites](https://v2.tauri.app/start/prerequisites/). From the repository root:

```bash
npm ci
npm run desktop:dev
```

Build a desktop package for your machine:

```bash
npm run desktop:build
```

Packages are written to `src-tauri/target/release/bundle/`. Packaged apps include the required Node.js runtime; users do not need to install Node.js separately. Research scripts still require their own project environments. Build natively for each target operating system and architecture. Current macOS builds use local ad-hoc signing; public notarization and signing for other platforms are not configured.

For browser development, run `npm run dev` and open `http://127.0.0.1:5173`. Development data is stored in `.research-data/`. This development interface connects to a service on your machine.

## Current limits

- PDF reading extracts text layers, without OCR. Check complex formulas, tables and figures against the original document.
- Literature search provides publication metadata and source links, not a substitute for reading papers and verifying scientific claims.
- Files and commands run with your user permissions. The project folder is not an operating-system sandbox; per-command approval and container isolation are not implemented.
- The workbench provides code editing and command logs, without an interactive terminal, managed notebook kernels, remote cluster execution or a full IDE debugger.

## License

[GPL-3.0-only](LICENSE). Third-party dependencies retain their respective licenses.
