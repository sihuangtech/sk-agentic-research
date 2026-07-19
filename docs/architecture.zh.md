# Agentic Research 系统架构

## 设计目标

系统的核心不是“尽可能自动写论文”，而是建立一条可以回答以下问题的科研记录链：

- 这个假设依据了哪些可访问证据？
- 实验前约定的基线、指标和成功门槛是什么？
- 哪些代码在什么环境和种子下真正运行过？
- 候选方案是否在未参与开发的留出条件下稳定优于基线？
- 最终报告中的每个结论能否回溯到实验记录？

## 分层结构

```text
Web / CLI
    ↓
Workflow Engine          状态、暂停、恢复、取消、事件
    ↓
Research Services        检索、假设、规划、迭代、验证、写作
    ↓
Domain Contracts         Evidence / Hypothesis / Manifest / Trial / Report
    ↓
Infrastructure Adapters  LLM / Search / Python / Notebook / Filesystem
```

依赖方向只能向下。领域层不知道 FastAPI、React、OpenAI 或文件系统的具体实现，因此检索源、模型和执行器可以替换而不改科研规则。

源码部署边界只有两个：`backend/` 包含 API、命令行和全部科研领域逻辑，`frontend/` 包含 Web 控制台。`data/workspace/` 只保存本地运行产物，不是第三个应用或 Python 包。

## 可恢复状态机

每个运行保存在 `data/workspace/runs/<run_id>/`：

```text
run.json          当前状态、阶段、决策、指标和产物索引
events.jsonl       追加式事件时间线
hypothesis.json   本次运行使用的假设快照
evidence.json     本次运行使用的证据快照
approval.json     人工批准记录
experiment/       计划、清单、基线和候选代码
trials/           每个阶段、方案和种子的独立运行目录
validation.json   最终验证门禁报告
```

阶段完成后才写入 `completed_stages`。失败恢复时，工作流读取 `run.json`，跳过已经完成的昂贵阶段。

## 从其他项目吸收的设计

- OpenAGS：文件化状态协议和可恢复阶段；
- Curie：实验组、控制组和验证器职责分离；
- Arbor：开发路径与留出验证分离；
- autoresearch：有限迭代和指标驱动的候选保留；
- AI-Scientist / Agent Laboratory：真实实验产物进入写作流程；
- 深度研究项目：来源归一化、并行检索、证据去重与引用绑定；
- MLAgentBench：保留命令、环境、耗时、退出码和失败原因。

没有采用的设计包括：默认无限循环、单模型单一自评分、启动时自动安装系统软件、模型生成代码直接执行、默认 Git 自动提交、只凭文件存在推断成功，以及用随机数模拟科研结果。

## 扩展点

- `SearchProvider`：增加 PubMed、Crossref、OpenAlex 或内部知识库；
- `LlmClient`：接入本地模型或其他 OpenAI 兼容服务；
- `ExperimentExecutor`：增加 Docker、Slurm、Kubernetes 或远程 GPU 执行器；
- `ResultValidator`：增加置信区间、显著性检验、多重比较修正；
- `WritingService`：增加期刊模板、BibTeX 和人工审稿阶段。
