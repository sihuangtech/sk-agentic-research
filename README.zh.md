# Papermill：本地可审计 AI 科研工作流

Papermill 将文献证据、可证伪假设、实验计划、真实代码/Notebook 执行、留出验证和研究报告连接成一条可恢复的本地工作流。它不把“模型生成了一段实验结果”视为科研，也不会因为候选方案跑通一次就宣布假设成立。

[English documentation](README.md)

## 你可以用它做什么

### 1. 把研究方向变成可执行的研究计划

输入一个研究方向，例如“小样本医学影像分割的可靠性”。系统会检索并整理相关证据，提出可被实验推翻的假设，随后生成包含基线、候选方案、评价指标、随机种子和通过门槛的实验计划。计划生成后默认暂停，等你确认再执行。

### 2. 让 AI 编写并运行实验，而不是只写结论

获批后，系统会生成 Python 实验代码或带参数的 Jupyter Notebook，并在本地受控环境中运行。每次运行都会保存代码、输入参数、原始结果、日志、退出状态和耗时；Notebook 还会保存已执行版本，方便复现和检查。

### 3. 用独立验证判断结果是否可靠

系统将用于改进方案的开发种子与最终判断的留出种子分开。它比较基线和候选方案的成功率、最小提升量和波动情况，并给出 `accepted`（接受）、`rejected`（拒绝）、`inconclusive`（证据不足）或 `invalid`（结果无效）四种结论，避免把偶然跑通当成发现。

### 4. 获得可追溯的研究报告

运行完成后可生成 Markdown、LaTeX 和可选 PDF 报告。报告引用来自本次保存的证据快照，并附带实验结果和限制说明；验证未通过时会明确标注，不会包装成正面结论。

### 5. 在本机管理全过程

可通过命令行或 Web 控制台查看研究进度、实时日志、实验指标、假设、报告和待审批计划。中断的任务可以恢复，也可以取消；所有运行产物保存在本地 `data/workspace/`。

### 6. 选择自己的大模型服务

支持 OpenAI、Anthropic Claude 和 Google Gemini。每个服务都可单独配置 Base URL、模型 ID 和 API Key；OpenAI 可选择 Responses API 或传统 Chat Completions 兼容接口，因此也能接入提供相应接口的兼容网关。

## 工作方式与边界

- 每项实验都固定评价指标、门槛和随机种子，基线与候选方案在同一条件下比较；
- 生成代码不会通过 shell 执行，运行时会移除 API Key，并限制超时、内存和日志；
- 这是一套帮助设计、执行和审计研究的工具，不能自动证明实验设计正确、数据没有泄漏或结论具有统计显著性。高风险研究仍应由领域研究者复核。

## 工作流

```text
研究方向
  → 多来源证据检索与去重
  → 可证伪假设 + 多维审核
  → 基线/候选实验计划
  → 人工审批（默认开启）
  → 开发种子上的候选有限迭代
  → 独立留出种子验证
  → accepted / rejected / inconclusive / invalid
  → 带证据和限制说明的 Markdown / LaTeX / 可选 PDF
```

详细设计见：

- [系统架构](docs/architecture.zh.md)
- [科研与实验协议](docs/research-protocol.zh.md)
- [安全边界](docs/security.zh.md)

## 安装

要求 Python 3.10+、Node.js 20+。所有依赖均通过官方包管理器命令安装。

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'

cd frontend
npm ci
cd ..
```

复制环境变量模板并填写至少一个模型密钥：

```bash
cp .env.example .env
```

支持 OpenAI、Anthropic Claude 和 Google Gemini。三者都可以在 Web 设置页依次填写 Base URL、模型 ID 和 API Key；OpenAI 还能选择传统 Chat Completions 兼容接口或 Responses API。配置写入对应的 `OPENAI_*`、`ANTHROPIC_*`、`GOOGLE_*` 环境变量，密钥不会由接口返回。

默认模型为 `gpt-5.6-terra`（Responses API）、`claude-sonnet-5` 和 `gemini-3.5-flash`。使用第三方兼容网关时，应以该网关实际开放的模型 ID 和接口模式为准。

`OPENAI_API_MODE` 仅接受 `responses`（调用 `/v1/responses`，默认）或 `chat_completions`（调用 `/v1/chat/completions`）。如果中转服务只声明“OpenAI 兼容”但没有实现 Responses API，应选择 `chat_completions`。

## 第一次运行

先做不会访问模型和网络的环境诊断与真实实验演示：

```bash
python -m backend.cli doctor
python -m backend.cli demo
python -m pytest
```

`demo` 会实际运行 3 个开发种子和 3 个留出种子下的基线/候选实验，共 12 个独立子进程，并在 `data/workspace/runs/` 保存审计产物。

## 启动一项研究

```bash
python -m backend.cli run --direction "小样本医学影像分割的可靠性" --max-ideas 2
python -m backend.cli status
```

默认配置会在规划完成后进入 `waiting_review`：

```bash
python -m backend.cli approve <run_id>
```

失败后可恢复，未完成运行可取消：

```bash
python -m backend.cli resume <run_id>
python -m backend.cli cancel <run_id>
```

需要持续探索配置中的研究方向时：

```bash
python -m backend.cli daemon
```

## Web 控制台

```bash
./start.sh
```

浏览器打开 `http://127.0.0.1:8000`。控制台提供运行状态、真实指标、假设、研究报告、实时日志、配置校验和人工审批。

## 实验代码协议

Python 实验必须：

1. 从 `PAPERMILL_SEED` 读取随机种子；
2. 从 `PAPERMILL_OUTPUT` 读取结果文件位置；
3. 输出符合清单 `metric.json_path` 的有限数值；
4. 不安装依赖、不启动子进程，默认不能联网；
5. 单个生成代码文件不超过 250 行。

Notebook 使用带 `parameters` 标签的参数单元。执行器会注入 `seed` 和 `results_path`，并保存 `executed.ipynb`。

## 结果为什么更可信

- 开发种子和验证种子在配置校验阶段就必须完全分离；
- 基线和候选必须采用相同指标与种子集合；
- 最小提升量在实验前写入 `manifest.json`；
- 最终决策只读取留出验证结果；
- 任一试验的原始输出、日志、退出码和耗时均可回溯；
- 结果缺失、波动过大或成功率不足不会被包装成阳性结论。

这仍然不能自动证明实验设计科学、数据没有泄漏或结果具有统计显著性。高风险科研必须由领域研究者审核数据、方法和结论。

## Docker

```bash
cp .env.example .env
docker compose up --build
```

服务只绑定本机 `127.0.0.1:8000`。容器以非 root 用户运行，工作区持久化到宿主机。Docker 镜像默认不包含 LaTeX；没有 `pdflatex` 时仍会生成 Markdown 和 `.tex`，不会在运行时自动安装系统软件。
