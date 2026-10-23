# 更新日志

第二月亮的重要变更均记录在此。由于项目早期没有创建发布 Tag，以下历史根据仓库中的真实提交记录整理。

英文更新日志：[CHANGELOG.md](CHANGELOG.md)

本文档遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，项目版本遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## 0.4.0 - 2026-10-24

- 更新第二月亮品牌名称、双月科研轨道图标与用户使用说明，GitHub 仓库更名为 sk-research-agent。
- 按职责拆分前后端、样式与测试，新增每文件 300 行上限检查，并接入 lint、测试与 CI。
- 使用官方 i18next/react-i18next 和 10 种语言 JSON 资源，新增持久化语言切换、地区匹配、日期格式、API 错误、Agent 回答语言与托盘本地化；接入对应的 Monaco 官方语言包。

- 改为 Tauri + React + TypeScript + Node.js + 官方 Pi SDK 的本地优先架构。
- 新增项目会话、工具执行、中途指导、排队消息、取消与 Pi 历史恢复。
- 新增系统钥匙串 API 配置、SQLite 业务存储、个人/项目记忆和定时任务。
- 新增 Monaco 编辑、PDF.js 预览、PDF 分页文本提取、Crossref 检索及独立命令任务。
- 新增托盘后台运行和单实例控制；官方 Node 与 npm 发布依赖随桌面应用打包。
- 移除旧 Python/FastAPI/DBOS 流水线、PyInstaller 打包脚本及云端部署入口，不保留旧 API 兼容。
- 增加真实 Pi SDK 接入受控模型服务的集成测试；真实 API 需要配置后测试。

## 0.3.0 - 2026-08-26

### 新增

- 使用 OpenAI Agents SDK 作为统一 Agent 运行时：OpenAI 使用原生 Responses 或 Chat Completions 适配器，Anthropic 与 Gemini 使用 SDK 的 LiteLLM 适配层。
- 使用 DBOS 为研究方向运行、人工审批、继续执行和进程重启恢复提供持久化工作流。
- 建立明确的云端/桌面运行模式，并通过状态 API 展示计算与研究数据所在位置，同时不暴露凭据。
- 为批次和运行记录增加确定性标识，避免工作流恢复时重复执行已完成的研究任务。
- 增加运行模式测试和前端共享类型定义。
- 增加响应式 GitHub 仓库图标并链接到项目源码。

### 变更

- 将项目重构为一套共享科研核心、两种交付模式：云端 Web Agent 由服务器执行；本地桌面 Agent 除外部大模型和文献 API 外均在用户设备上执行。
- 重新设计研究工作台，突出待审批任务、科研阶段主线、运行健康状态和醒目的云端/本地位置标识。
- 云端浏览器中的模型服务与配置改为只读；桌面端仍可在本机编辑。
- 保留结构化 JSON 校验并完善模型输出恢复逻辑，以兼容不同第三方模型服务。
- 将 Python、Node.js、React、Vite、Tauri 和 Rust 依赖更新到当前兼容的最新稳定版本。
- Python 安装和运行流程统一使用 `uv`，并同步更新部署、桌面、环境变量和架构文档。
- Python 命令改为 `agentic-research`，并统一 Python、npm、前端、Cargo 与 Tauri 的版本号。

### 安全

- 默认关闭 Agents SDK 链路追踪；只有显式启用时才记录追踪数据，并默认排除敏感内容。
- 不向实验子进程和公开运行状态响应传递 API Key。
- 禁止普通云端用户通过 Web 界面修改服务器级模型凭据。

## 0.2.0 - 2026-07-20

### 新增

- 将早期原型重建为本地优先、可审计的科研工作流，覆盖证据收集、可证伪假设、实验计划、人工审批、代码或 Notebook 执行、留出验证和报告生成。
- 增加 FastAPI REST/SSE 接口、React/Vite 工作台、进程管理、运行产物、实时日志和模型服务配置。
- 增加生成代码策略检查、受限子进程执行、运行锁、模型服务校验，以及覆盖研究与执行层的测试套件。
- 增加 Tauri 2 桌面应用、内置 Python sidecar、本地生命周期管理、全平台图标和桌面安装包构建流程。
- 增加英文和简体中文界面、语言与主题偏好持久化，以及双语资源一致性检查。
- 增加 Docker、Nginx 和非容器部署材料，以及科研协议、安全、桌面和 Semantic Scholar 文档。
- 增加带重试的结构化 JSON 提取，处理不完全规范的模型响应。

### 变更

- 使用领域层、基础设施层、研究层、工作流层和 API 层替代原有 `src/agents` 原型结构。
- 产品从 Papermill 更名为 Agentic Research，并将软件包名称统一为 `sk-agentic-research`。
- 前端从 JavaScript 迁移到 TypeScript，并完善导航、响应式布局、明暗主题和设置体验。
- 更新模型服务默认值、环境变量端口、依赖锁文件、仓库信息和部署说明。

### 移除

- 在可审计工作流架构落地后，移除原有单体 FARS agents 和 orchestrator。
- 移除论文写作流程中自动安装大型系统依赖的行为。

## 0.1.0 - 2026-06-22

此版本根据最早的 FARS 和科研工作流提交记录补发整理；原仓库当时没有创建 `v0.1.0` Tag。

### 2026-06-22

- 增加独立的简体中文 README，并更新前端依赖。

### 2026-03-02

- 创建 Fully Automated Research System（FARS）初始原型，包括构思、规划、实验、写作和编排 Agent。
- 接入早期文献与代码仓库检索，并提供统一的 OpenAI、Anthropic 和 Google 模型客户端。
- 增加实验自动重试、LaTeX 论文生成、图表和首版自动 PDF 流程。
- 增加首版 FastAPI 与 React/Vite Web 界面、实时监控、Docker 和 Nginx 配置。
- 将原型重组到 `src/`，并把提示词抽离为配置文件。
