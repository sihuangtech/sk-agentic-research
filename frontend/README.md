# Agentic Research Web 控制台

`frontend/` 是 Agentic Research 的独立前端部署单元，使用 React、Vite、React Router 和 Tailwind CSS。它只负责展示与交互，科研状态、实验执行和审计数据均由 `backend/` 提供。

## 功能页面

- 科研总览：创建研究方向，查看真实指标、运行状态和环境检查结果；
- 研究假设：浏览和筛选通过结构化审核的假设；
- 研究报告：查看工作流生成的论文与报告产物；
- 运行日志：查看后端日志和运行事件；
- 系统设置：配置三家模型的 API Key、Base URL 和经过后端校验的工作流参数；
- 人工门禁：批准、恢复或取消科研运行，启动或停止持续调度。

页面使用 `HashRouter`，因此作为后端静态站点部署时不需要额外配置 SPA 路由回退。

## 目录结构

```text
src/
├── api/             Axios 客户端和统一错误处理
├── components/      页面框架、状态徽标和运行卡片
├── hooks/           运行状态 SSE 数据流
├── pages/           总览、假设、报告、日志和设置页面
├── App.tsx          页面路由
├── index.css        全局样式与设计变量
└── main.tsx         React 入口
```

## 安装与开发

要求 Node.js 20+。依赖只使用 npm 官方命令安装：

```bash
npm ci
npm run dev
```

开发服务器启动后访问 Vite 输出的本地地址。前端请求统一使用 `/api/v1`；`vite.config.js` 会将 `/api` 代理到 `http://127.0.0.1:8000`，因此需要在项目根目录另开终端启动后端：

```bash
.venv/bin/python -m uvicorn backend.main:app --reload --port 8000
```

## 构建与检查

```bash
npm run lint
npm run build
npm run preview
```

生产构建输出到 `frontend/dist/`。项目根目录的 `./start.sh` 会自动构建前端、清理旧哈希资源并复制到 `backend/static/`；Docker 多阶段构建也会把同一份产物交给 FastAPI 静态托管。

## 开发约束

- 浏览器端不得保存或读取 LLM API Key；密钥只存在于后端环境变量；
- API 请求集中放在 `src/api/`，页面不自行拼接后端主机地址；
- 跨页面状态流优先封装为 Hook，避免重复管理 SSE 生命周期；
- 新源码文件保持不超过 250 行，并通过 ESLint 与生产构建检查。
