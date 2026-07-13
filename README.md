# AI照片厚涂油画客服出图系统 V1

客服内部使用的 AI 出图后台。生产部署目标为阿里云香港 Ubuntu 24.04，应用使用 Docker Compose 启动，公网访问由宿主机 Nginx 反向代理到应用容器。

## 技术栈

- Next.js + React + TypeScript
- TailwindCSS + shadcn/ui 风格组件
- Prisma + SQLite
- Docker Volume 本地文件存储
- 外部 AI 聚合平台 API

## 服务器环境

- Ubuntu 24.04
- Node.js 24
- Docker
- Docker Compose
- 宿主机 Nginx

## 一键启动应用

```bash
cp .env.example .env
nano .env
docker compose up -d --build
```

必须配置：

```env
AI_API_BASE_URL=https://api.lk888.ai
AI_API_KEY=
AI_PUBLIC_BASE_URL=https://admin.example.com
ADMIN_INITIAL_PASSWORD=change-this-password
```

`AI_PUBLIC_BASE_URL` 必须是 AI 平台能访问到的公网后台地址，否则 AI 平台无法读取客服上传的原图。

## 宿主机 Nginx

`docker-compose.yml` 只启动应用容器，并把应用绑定到宿主机本地：

```txt
127.0.0.1:3000
```

将 [nginx/default.conf](nginx/default.conf) 复制到服务器：

```bash
sudo cp nginx/default.conf /etc/nginx/conf.d/ai-painting-admin.conf
sudo nginx -t
sudo systemctl reload nginx
```

把配置里的 `admin.example.com` 改成你的真实后台域名。

## 常用命令

查看容器状态：

```bash
docker compose ps
```

查看应用日志：

```bash
docker compose logs -f app
```

重启应用：

```bash
docker compose restart app
```

停止应用：

```bash
docker compose down
```

## 初始管理员

首次启动且数据库为空时，系统会读取 `.env` 创建管理员：

```env
ADMIN_INITIAL_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=change-this-password
ADMIN_INITIAL_NAME=系统管理员
```

数据库已有用户和模板后，容器重启不会覆盖后台数据。

## 数据持久化

Compose 使用 Docker Volume 保存数据：

- `sqlite_data`: SQLite 数据库
- `uploads`: 客服上传原图
- `generated`: AI 生成图

不要直接删除这些 volume，否则历史任务和图片会丢失。

## 安全要求

以下内容不能上传到 GitHub：

- `.env`
- API Key
- SQLite 数据库
- 用户上传图片
- AI 生成图片
- 日志文件
- `node_modules`

这些内容已经通过 `.gitignore` 和 `.dockerignore` 排除。

## 后续正式化建议

V1 使用本地 Docker Volume 存储图片。正式面向客户自助上传时，建议优先接入：

- 阿里云 OSS
- HTTPS 证书
- CDN
- PostgreSQL
- 队列任务系统
