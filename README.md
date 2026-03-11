<div align="center">

# ⚡ ZhiX Club · 极志社区

**前端 · Frontend**

---

> 🔥 不只是博客，是你的数字主场。  
> *Not just a blog — your digital stage.*

---

[![Author](https://img.shields.io/badge/🧑‍💻%20作者主页-点击探索→-FF6B6B?style=for-the-badge&logoColor=white)](https://www.macfans.app/)
[![Author EN](https://img.shields.io/badge/🌐%20Author's%20World-Explore%20Now%20→-6C63FF?style=for-the-badge&logoColor=white)](https://www.macfans.app/)

---

</div>

## 🇨🇳 中文版

<div align="center">

### 你好，这里是极志社区前端

一个**颜值在线、性能拉满**的现代 Web 应用。  
React 18 驱动，Apple HIG 设计语言，部署在 AWS 云端。

</div>

### 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18 |
| 路由 | React Router 6 |
| 状态 | Context API |
| 样式 | CSS3 · 响应式 |
| 构建 | Create React App |
| 部署 | AWS S3 + CloudFront |

### 📂 项目结构

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/       # 公共组件
│   ├── pages/            # 页面
│   ├── context/          # 全局状态
│   ├── utils/            # 工具函数
│   ├── config.js
│   ├── App.js
│   └── index.js
└── package.json
```

### 🚀 快速上手

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.local.example .env.local
```

`.env.local` 示例：

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_PAYMENT_API_URL=http://localhost:8081
```

```bash
# 启动开发服务器
npm start        # → http://localhost:3000

# 构建生产版本
npm run build
```

### ✨ 功能一览

- ✅ 响应式设计，全端适配
- ✅ Apple HIG 设计规范
- ✅ 管理员 / 用户 / 游客三级权限
- ✅ Markdown 文章编辑器
- ✅ 全文搜索
- ✅ 点赞 · 收藏
- ✅ Apple Pay 支付

### 📦 部署

详见 [Frontend 部署指南](../docs/项目frontend部署指南1.0版.md)，通过 GitHub Actions 自动部署至 AWS S3 + CloudFront。

---

<div align="center">

💡 **想了解更多？来作者的主页逛逛 →**

[![Visit Author](https://img.shields.io/badge/🚀%20作者主页-macfans.app-FF6B6B?style=for-the-badge)](https://www.macfans.app/)

</div>

---

## 🇺🇸 English Version

<div align="center">

### Welcome to ZhiX Club Frontend

A **sleek, high-performance** modern web app.  
Powered by React 18, designed with Apple HIG, deployed on AWS.

</div>

### 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 |
| Routing | React Router 6 |
| State | Context API |
| Styling | CSS3 · Responsive |
| Build | Create React App |
| Deploy | AWS S3 + CloudFront |

### 📂 Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/       # Shared components
│   ├── pages/            # Page views
│   ├── context/          # Global state
│   ├── utils/            # Helpers
│   ├── config.js
│   ├── App.js
│   └── index.js
└── package.json
```

### 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
```

`.env.local` example:

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_PAYMENT_API_URL=http://localhost:8081
```

```bash
# Start dev server
npm start        # → http://localhost:3000

# Build for production
npm run build
```

### ✨ Features

- ✅ Fully responsive — desktop, tablet, mobile
- ✅ Apple HIG design language
- ✅ Role-based access: Admin / User / Guest
- ✅ Markdown article editor
- ✅ Full-text search
- ✅ Like & bookmark
- ✅ Apple Pay integration

### 📦 Deployment

See [Frontend Deployment Guide](../docs/项目frontend部署指南1.0版.md). Auto-deployed to AWS S3 + CloudFront via GitHub Actions.

---

<div align="center">

✨ **Curious about the author? Step into their world →**

[![Visit Author](https://img.shields.io/badge/🌐%20Author's%20Homepage-Explore%20Now-6C63FF?style=for-the-badge)](https://www.macfans.app/)

</div>

---

<div align="center">

**Made with ❤️ · ZhiX Team**

</div>
