# Papermill：本地可审计 AI 科研工作流

Papermill 将文献证据、可证伪假设、实验计划、真实代码/Notebook 执行、留出验证和研究报告连接成一条可恢复的本地工作流。它不把“模型生成了一段实验结果”视为科研，也不会因为候选方案跑通一次就宣布假设成立。

[English documentation](README.md)

## 这次重构解决了什么

旧版只是四个 Agent 串行调用：一个模型给自己的假设打分，生成一份脚本后直接在宿主机运行，找到 `results.json` 就写论文。新版增加了：

- 结构化科研契约：证据、假设、实验清单、试验记录、验证报告都有 Pydantic 模型；
- 可恢复状态机：每个阶段、事件、错误和产物都原子写入本地工作区；
- 基线与候选分离：同一指标、同一开发种子，不能在看到结果后改门槛；
- 留出验证：开发种子用于候选改进，独立验证种子只用于最终结论；
- 结果门禁：成功率、最小改进量和变异系数共同决定 `accepted/rejected/inconclusive/invalid`；
- 有限迭代：候选方案最多改进指定次数，不能无限搜索直到偶然得到好结果；
- 受控执行：不经过 shell，剔除 API Key，限制超时、内存、日志长度并检查危险 Python 语法；
- Notebook 执行：检查代码单元后调用官方 Papermill，保存执行后的 Notebook 和结果；
- 人工审批：默认生成实验计划后暂停，批准后才执行模型生成代码；
- 可信写作：引用只能来自证据快照，未通过验证时报告标题和结论会被强制标记；
- 离线演示：无需网络或 API Key，实际运行 12 个子进程验证整条实验链。

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

可编辑安装可能生成 `local_ai_papermill.egg-info`。它是已被 Git 忽略的 setuptools 安装元数据，不是源码目录或第三个部署单元。

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

开发时可分别启动：

```bash
python -m uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

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

## 目录结构

```text
backend/                 独立后端部署单元
├── api/                 FastAPI 路由、依赖与进程管理
├── core/                配置、原子存储、运行仓库
├── domain/              领域模型与科研契约
├── infrastructure/      LLM、检索、代码策略、执行器
├── research/            文献、假设、规划、实验、验证、写作
└── workflow/            可恢复工作流和依赖装配
frontend/                独立前端部署单元
└── src/
    ├── api/             HTTP 客户端
    ├── components/      可复用界面组件
    ├── hooks/           SSE/状态 Hook
    └── pages/           独立页面
data/workspace/          本地运行数据，不属于源码包
tests/                   单元测试与真实离线执行测试
docs/                    架构、科研协议和安全文档
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

服务只绑定本机 `127.0.0.1:8000`。容器以非 root 用户运行，工作区持久化到宿主机。Docker 镜像默认不包含 LaTeX；没有 `pdflatex` 时仍会生成 Markdown 和 `.tex`，不会在运行时自动安装系统软件。

## 开发检查

```bash
python -m ruff check backend tests
python -m pytest
cd frontend && npm run lint && npm run build
```

项目源代码保持单文件不超过 250 行；中文注释解释设计理由，类型和函数名保持英文以便跨语言协作。
