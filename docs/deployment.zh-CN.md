# Agentic Research 部署文档

本文档面向当前项目的两种交付方式：

1. 网站版：部署到服务器，通过 `https://agenticresearch.skstudio.cn` 访问；
2. 桌面版：在 macOS、Windows 或 Linux 上构建 Tauri 安装包，由用户在本机运行。

当前后端是 FastAPI，前端是 React/Vite。网站版使用 Docker 运行，桌面版使用 Tauri 2 启动 Python sidecar。两种版本共用同一套科研工作流和前端代码。

## 一、网站版部署

### 1. DNS

在 `skstudio.cn` 的 DNS 控制台添加记录：

```text
类型：A
主机记录：agenticresearch
记录值：服务器公网 IPv4
TTL：600
```

如果服务器使用 IPv6，再增加对应的 `AAAA` 记录。确认解析生效：

```bash
dig +short agenticresearch.skstudio.cn
```

### 2. 服务器准备

以下示例以 Ubuntu 22.04/24.04 为例。先安装 Git、Docker 和 Nginx：

```bash
sudo apt update
sudo apt install -y git nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

重新登录服务器后检查：

```bash
docker --version
nginx -v
```

### 3. 获取代码和配置密钥

```bash
sudo mkdir -p /opt/agentic-research
sudo chown -R "$USER":"$USER" /opt/agentic-research
git clone <你的 Git 仓库地址> /opt/agentic-research
cd /opt/agentic-research
cp .env.example .env
chmod 600 .env
```

编辑 `.env`，至少配置实际使用的模型服务密钥。不要把 `.env` 提交到 Git。

### 4. 启动应用容器

```bash
cd /opt/agentic-research
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:8000/api/v1/system/status
```

容器只绑定服务器本机的 `127.0.0.1:8000`，公网流量必须通过 Nginx 进入。研究产物会持久化到项目的 `data/workspace/`，配置文件挂载为项目根目录的 `config.yaml`。

查看日志：

```bash
docker compose logs -f --tail=200 app
```

### 5. Nginx 配置

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/agenticresearch.skstudio.cn
```

写入以下内容：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name agenticresearch.skstudio.cn;

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
```

这里使用不带尾部 `/` 的 `proxy_pass`，保留 `/api/v1/...` 路径；`proxy_buffering off` 用于实时日志和 SSE；较长的超时适合科研实验任务。

启用站点并检查配置：

```bash
sudo ln -s /etc/nginx/sites-available/agenticresearch.skstudio.cn \
  /etc/nginx/sites-enabled/agenticresearch.skstudio.cn
sudo nginx -t
sudo systemctl reload nginx
```

### 6. 生成并配置 SSL 证书

推荐使用 Let's Encrypt + Certbot。它会自动申请证书、修改 Nginx 配置并配置 HTTP 到 HTTPS 跳转。申请前必须满足：

- `agenticresearch.skstudio.cn` 已解析到当前服务器；
- 服务器安全组和防火墙开放 TCP `80`、`443`；
- Nginx 已加载上一节的 HTTP 配置；
- 从公网访问 `http://agenticresearch.skstudio.cn` 时不能被其他服务拦截。

先安装 Certbot 和 Nginx 插件：

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

申请证书并让 Certbot 自动改写 Nginx：

```bash
sudo certbot --nginx \
  --domain agenticresearch.skstudio.cn \
  --agree-tos \
  --no-eff-email \
  --redirect
```

执行过程中填写管理员邮箱。证书和私钥默认保存于：

```text
/etc/letsencrypt/live/agenticresearch.skstudio.cn/fullchain.pem
/etc/letsencrypt/live/agenticresearch.skstudio.cn/privkey.pem
```

检查 Nginx 和 HTTPS：

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I http://agenticresearch.skstudio.cn
curl -I https://agenticresearch.skstudio.cn
```

HTTP 请求应返回 `301` 或 `308` 并跳转到 HTTPS。完成后访问：

```text
https://agenticresearch.skstudio.cn
```

验证 API：

```bash
curl -fsS https://agenticresearch.skstudio.cn/api/v1/system/status
```

#### 自动续期

Let's Encrypt 证书有效期约 90 天。Certbot 通常会安装 systemd 定时器，先检查：

```bash
systemctl list-timers | grep certbot
```

手动执行一次续期演练：

```bash
sudo certbot renew --dry-run
```

如果系统没有启用定时器，可以创建续期任务：

```bash
sudo systemctl enable --now certbot.timer
```

续期后 Nginx 通常会自动重新加载；如未配置 reload hook，可增加：

```bash
sudo certbot renew --deploy-hook "systemctl reload nginx"
```

#### HTTP 验证失败时

如果域名暂时不能通过公网 HTTP 访问（例如服务器前面还有 CDN 或端口 80 被占用），可以改用 DNS 验证：

```bash
sudo certbot certonly --manual \
  --preferred-challenges dns \
  --domain agenticresearch.skstudio.cn
```

Certbot 会要求在 DNS 中添加一个 `_acme-challenge.agenticresearch.skstudio.cn` 的 TXT 记录。等待 TXT 记录生效后按提示继续。DNS 验证签发的证书不会自动修改 Nginx，因此仍需在 Nginx 的 HTTPS `server` 中使用上面的 `fullchain.pem` 和 `privkey.pem`，并配置：

```nginx
ssl_certificate /etc/letsencrypt/live/agenticresearch.skstudio.cn/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/agenticresearch.skstudio.cn/privkey.pem;
```

### 7. 更新网站版本

```bash
cd /opt/agentic-research
git pull --ff-only
docker compose up -d --build
docker image prune -f
```

更新前建议备份：

```bash
tar -czf /opt/agentic-research-workspace-$(date +%Y%m%d-%H%M%S).tar.gz data/workspace config.yaml .env
```

## 二、桌面版构建

桌面版不需要 Nginx、域名或服务器。用户启动应用后，Tauri 会在本机启动 FastAPI sidecar，前端通过回环地址访问它。实验产物默认保存在操作系统的应用数据目录，不上传到网站服务器。

### 1. 安装构建依赖

要求：Python 3.10+、Node.js 20+、Rust stable，以及当前操作系统所需的 Tauri 2 构建依赖。依赖使用官方命令安装：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -e '.[dev]'
npm install
npm --prefix frontend install
```

Tauri 官方前置依赖见：[Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/)。

### 2. 本地开发

```bash
npm run desktop:dev
```

该命令会构建前端、准备 sidecar，并打开桌面窗口。

### 3. 构建安装包

```bash
npm run desktop:build
```

安装包位于：

```text
src-tauri/target/release/bundle/
```

常见产物：

```text
macOS:  dmg/、macos/*.app
Windows: msi/、nsis/
Linux:   deb/、appimage/、rpm/
```

Tauri 安装包必须在对应操作系统上分别构建。苹果签名、公证和 Windows 代码签名不属于本部署流程；正式发布前再配置相应证书。

### 4. 桌面版数据位置

```text
macOS:  ~/Library/Application Support/cn.skstudio.papermill/
Windows: %APPDATA%\cn.skstudio.papermill\
Linux:  $XDG_DATA_HOME/cn.skstudio.papermill/
```

应用升级不会覆盖用户的模型配置、密钥和研究工作区。当前本地实验执行不是 Docker/虚拟机级强隔离；运行不可信代码时，应在服务器版接入 Docker、Cube Sandbox 或 MicroVM。

## 三、部署后的检查清单

```bash
# 网站入口
curl -I https://agenticresearch.skstudio.cn

# 后端健康状态
curl -fsS https://agenticresearch.skstudio.cn/api/v1/system/status

# 容器状态
docker compose ps

# Nginx 配置
sudo nginx -t
```

浏览器中还应手动确认：登录/配置模型、创建研究任务、查看实时日志、审批计划、生成报告和下载产物均正常。
