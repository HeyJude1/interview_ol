# AI 智能面试练习平台 — 前端

基于 React 18 + TypeScript + Vite + Tailwind CSS 4 构建。

## 启动

```bash
pnpm install
pnpm dev        # 开发模式，默认 http://localhost:5173
pnpm build      # 生产构建
```

Vite 开发服务器已配置代理，`/api` 请求自动转发到后端 `http://localhost:8080`。

## 技术栈

| 技术 | 说明 |
|------|------|
| React 18 | UI 框架 |
| TypeScript 5.6 | 类型安全 |
| Vite 5.4 | 构建工具，HMR 热更新 |
| Tailwind CSS 4 | 原子化样式，支持暗色模式 |
| React Router 7 | 客户端路由 + 懒加载 |
| Framer Motion 12 | 页面过渡与交互动画 |
| Recharts 3 | 雷达图、得分趋势等图表 |
| Lucide React | 图标库 |
| Axios | HTTP 请求封装 |

## 目录结构

```
frontend/src/
├── api/           # 各模块 API 封装（resume / interview / knowledgebase）
├── components/    # 通用组件（Layout、雷达图、得分进度条等）
├── pages/         # 页面组件（懒加载）
│   ├── UploadPage.tsx              # 首页 & 简历上传
│   ├── HistoryPage.tsx             # 档案看板
│   ├── ResumeDetailPage.tsx        # 简历分析详情
│   ├── InterviewPage.tsx           # 模拟面试
│   ├── InterviewHistoryPage.tsx    # 演练复盘
│   ├── KnowledgeBaseManagePage.tsx # 知识库管理
│   ├── KnowledgeBaseQueryPage.tsx  # AI 检索问答
│   └── KnowledgeBaseUploadPage.tsx # 知识库上传
├── types/         # TypeScript 类型定义
├── hooks/         # 自定义 Hook（useTheme）
├── utils/         # 工具函数（日期格式化、得分展示）
├── App.tsx        # 根组件 + 路由配置
└── main.tsx       # 入口
```

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/upload` | 导入档案 | 简历上传 + AI 分析创建 |
| `/history` | 档案看板 | 简历列表，卡片墙展示 |
| `/history/:resumeId` | 简历详情 | AI 五维评分 + 优化建议 |
| `/interview/:resumeId` | 模拟面试 | 逐题作答 |
| `/interviews` | 演练复盘 | 面试记录 + 评估汇总 |
| `/knowledgebase` | 知识库 | 文档管理 |
| `/knowledgebase/upload` | 知识库上传 | 导入文档并触发向量化 |
| `/knowledgebase/chat` | 检索陪练 | RAG 流式问答 |
