# 极志社区 ZhiX Frontend

> 极志社区（ZhiX Club）Web 前端，基于 React 18 构建，支持文章阅读、会员订阅、Apple Pay 支付等功能。

---

## 📸 界面预览

```
┌─────────────────────────────────────────────────────┐
│  🏠 极志社区          搜索...        登录  注册      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  封面图  │  │  封面图  │  │  封面图  │          │
│  │          │  │          │  │  付费🏷  │          │
│  │  文章标题 │  │  文章标题 │  │  文章标题 │          │
│  │  作者·日期│  │  作者·日期│  │  作者·日期│          │
│  │  摘要... │  │  摘要... │  │  摘要... │          │
│  │ ❤️ ☆ 👁️ │  │ ❤️ ☆ 👁️ │  │ ❤️ ☆ 👁️ │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│              [ 查看更多文章 ]                        │
└─────────────────────────────────────────────────────┘
```

---

## 🗂️ 项目结构

```
frontend/
├── public/
│   └── index.html              # HTML 入口
├── src/
│   ├── components/             # 公共组件
│   │   ├── Header.js           # 顶部导航栏（搜索、登录状态）
│   │   ├── AudioPlayer.js      # 音频播放器
│   │   ├── AudioEngine.js      # 音频引擎（自动播放控制）
│   │   ├── VideoPlayer.js      # 视频播放器
│   │   ├── VideoEngine.js      # 视频引擎
│   │   └── VideoAudioPlayer.js # 视频+音频联动播放器
│   ├── pages/                  # 页面组件
│   │   ├── Home.js             # 首页（文章列表、瀑布流）
│   │   ├── ArticleDetail.js    # 文章详情页
│   │   ├── Editor.js           # 文章编辑器（管理员）
│   │   ├── ManageArticles.js   # 文章管理（管理员）
│   │   ├── Login.js            # 登录页
│   │   ├── Register.js         # 注册页
│   │   ├── Membership.js       # 会员订阅页（Apple Pay）
│   │   ├── PaymentSuccess.js   # 支付成功页
│   │   ├── Favorites.js        # 我的收藏
│   │   ├── UserLevel.js        # 用户等级
│   │   └── AvatarSelector.js   # 头像选择
│   ├── context/
│   │   ├── AuthContext.js      # 全局认证状态（登录/注册/登出）
│   │   └── ArticleContext.js   # 文章点赞/浏览数实时状态
│   ├── utils/
│   │   └── paymentService.js   # Apple Pay 支付工具函数
│   ├── App.js                  # 路由配置
│   ├── config.js               # API 地址配置
│   ├── index.js                # React 入口
│   └── index.css               # 全局样式
├── package.json
└── .env.local                  # 本地环境变量（不提交）
```

---

## ✨ 功能特性

### 🏠 首页 — 文章列表

```
游客视角：                        登录用户视角：
┌──────────────────┐             ┌──────────────────┐
│  文章卡片 × 3    │             │  全部文章卡片     │
│  ──────────────  │             │  ──────────────  │
│  [ 查看更多 ]    │  →注册→     │  ❤️ 点赞  ☆ 收藏 │
│  弹出注册引导    │             │  无限滚动         │
└──────────────────┘             └──────────────────┘
```

- 瀑布流卡片布局，自适应列数
- 封面支持图片和视频（mp4/webm）
- 视频封面自动播放，滚动出视口自动暂停
- 点赞 ❤️、收藏 ⭐、浏览量 👁️ 实时更新
- 付费文章显示 `付费` 角标，外链文章显示 `🔗 外链` 角标
- 全文搜索（URL 参数 `?search=关键词`）
- 游客仅展示前 3 篇，点击"查看更多"弹出注册引导

### 📄 文章详情

- Markdown 渲染
- 付费文章需会员权限，非会员跳转订阅页
- 外链文章直接跳转目标 URL

### 👤 用户系统

```
注册流程：
填写邮箱/密码/手机/昵称 → 自动分配随机头像 → 注册成功

登录流程：
邮箱 + 密码 → JWT Token → 存入 localStorage → 全局 AuthContext 更新
```

- JWT 认证，Token 存储于 `localStorage`
- 三种角色：游客 / 普通用户 / 管理员
- 管理员专属路由：`/manage`、`/editor`（PrivateRoute 保护）
- 头像选择器（`/avatar`）
- 用户等级页（`/level`）

### 💳 会员订阅 — Apple Pay

```
订阅流程：
┌─────────────────────────────┐
│       开通会员               │
│                             │
│       ¥39.99 / 月           │
│                             │
│  ✓ 解锁所有付费文章          │
│  ✓ 无广告阅读体验            │
│  ✓ 优先评论通知              │
│  ✓ 专属会员标识              │
│                             │
│   [ 🍎 Apple Pay 支付 ]     │
└─────────────────────────────┘
         ↓ 支付成功
   isPremium = true → 跳转回原页面
```

- 调用独立支付微服务（`PAYMENT_API_URL`）
- 创建支付会话 → 处理支付 → 更新用户会员状态
- 支持退款查询

### 🎬 多媒体播放

- `VideoAudioPlayer`：视频封面 + 独立音轨联动
- `AudioEngine`：多卡片音频互斥播放（同时只播一个）
- 基于 IntersectionObserver 实现视口感知自动播放/暂停

---

## 🚀 快速开始

### 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | 18+ |
| npm | 9+ |

### 安装依赖

```bash
cd frontend
npm install
```

### 配置环境变量

创建 `.env.local`：

```env
REACT_APP_API_URL=http://localhost:8080
REACT_APP_PAYMENT_API_URL=http://localhost:8081
```

### 启动开发服务器

```bash
npm start
```

浏览器访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
npm run build
```

产物输出至 `build/` 目录，可直接部署到 AWS S3 / Nginx / CDN。

---

## 🔗 路由结构

| 路径 | 页面 | 权限 |
|------|------|------|
| `/` | 首页文章列表 | 所有人 |
| `/article/:id` | 文章详情 | 所有人（付费内容需会员）|
| `/login` | 登录 | 游客 |
| `/register` | 注册 | 游客 |
| `/membership` | 会员订阅 | 登录用户 |
| `/payment/success` | 支付成功 | 登录用户 |
| `/favorites` | 我的收藏 | 登录用户 |
| `/level` | 用户等级 | 登录用户 |
| `/avatar` | 头像选择 | 登录用户 |
| `/manage` | 文章管理 | 🔒 管理员 |
| `/editor` | 新建文章 | 🔒 管理员 |
| `/editor/:id` | 编辑文章 | 🔒 管理员 |

---

## 🌐 API 对接

所有接口通过 `src/config.js` 统一配置：

```js
// src/config.js
export const API_BASE_URL = 'http://localhost:8080/api';
export const PAYMENT_API_URL = process.env.REACT_APP_PAYMENT_API_URL || 'http://localhost:8081';
```

主要接口：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/articles` | GET | 获取文章列表 |
| `/api/articles/homepage` | GET | 首页文章（游客） |
| `/api/articles/:id` | GET | 文章详情 |
| `/api/articles/:id/like` | POST | 点赞 |
| `/api/articles/:id/favorite` | POST/DELETE | 收藏/取消 |
| `/api/articles/:id/view` | POST | 增加浏览量 |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 |
| `/api/favorites` | GET | 我的收藏列表 |
| `/api/avatar/random` | GET | 随机头像 |

---

## 🏗️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2 | UI 框架 |
| React Router | 6.20 | 客户端路由 |
| Context API | — | 全局状态管理 |
| CSS3 | — | 样式（内联 + 模块） |
| Create React App | 5.0 | 构建工具 |

---

## ☁️ 生产部署（AWS S3 + CloudFront）

```
本地构建
   ↓
npm run build
   ↓
上传 build/ → AWS S3 Bucket（静态网站托管）
   ↓
CloudFront CDN 分发（HTTPS + 全球加速）
   ↓
Route 53 域名解析 → zhix.club
```

详细步骤参考项目根目录 `docs/项目frontend部署指南1.0版.md`。

---

## 📦 依赖说明

```json
{
  "react": "^18.2.0",          // UI 核心
  "react-dom": "^18.2.0",      // DOM 渲染
  "react-router-dom": "^6.20.0", // 路由
  "react-scripts": "5.0.1"     // CRA 构建脚本
}
```

无额外 UI 库依赖，所有样式均为原生 CSS / 内联样式，保持轻量。

---

## 🔐 安全说明

- JWT Token 存储于 `localStorage`，每次请求携带 `Authorization: Bearer <token>`
- 管理员路由通过 `PrivateRoute` 组件保护，非管理员自动重定向首页
- 支付流程通过独立支付微服务处理，前端不接触支付密钥

---

## 📄 License

MIT © ZhiX Team
