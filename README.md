# 红博士心理小讲堂

心理咨询与成长陪伴项目，包含 PC 课程中心与小程序端预览两套体验。当前版本已完成课程目录、课程详情、课程权益 API adapter 和本地开发期持久化，登录、咨询预约、测评等能力仍在逐步工程化。

## 技术栈

- Vite 7
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui 风格组件
- Express API 与静态生产服务
- pnpm 10

## 环境要求

- Node.js 22.12.0 或更高版本
- pnpm 10.4.1 或更高版本

建议使用 `.nvmrc` 对齐 Node 版本：

```bash
nvm use
```

## 快速开始

```bash
pnpm install --frozen-lockfile
pnpm dev
```

本地开发服务默认运行在：

```text
http://localhost:3000/
```

## 常用命令

```bash
pnpm dev      # 启动 Vite 开发服务
pnpm check    # TypeScript 类型检查
pnpm test     # 运行测试，没有测试文件时正常通过
pnpm build    # 构建前端与生产 server
pnpm start    # 运行生产构建产物
pnpm preview  # 预览前端构建产物
pnpm run ci   # CI 本地等价校验
```

## 目录结构

```text
client/
  index.html
  src/
    pages/          # 页面入口
    components/     # 业务组件与通用 UI 组件
    contexts/       # 认证、主题等全局状态
    hooks/          # 通用 hooks
    lib/            # mock 数据与工具函数
server/
  index.ts          # API 与生产静态服务入口
  modules/          # 课程、认证等后端模块
shared/
  const.ts          # 前后端共享常量
  domain/           # 前后端共享业务契约与 Zod 校验
docs/
  product-engineering-roadmap.md  # 产品工程路线
  domain-contracts.md             # 领域契约说明
```

## 产品工程文档

- [产品工程路线](./docs/product-engineering-roadmap.md)
- [领域契约说明](./docs/domain-contracts.md)
- [课程中心 Feature 架构](./docs/course-feature-architecture.md)

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写。当前主流程可直接运行，以下变量用于替换 mock 登录、启用地图组件或调整本地课程权益持久化：

- `VITE_OAUTH_PORTAL_URL`
- `VITE_APP_ID`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`
- `HONGBOSHI_COURSE_ACCESS_STORE`
- `HONGBOSHI_COURSE_ACCESS_FILE`

## 当前业务状态

- 课程 seed 来自 `shared/data/mockCourses.ts`，开发和生产 API 共用同一份数据
- 共享业务类型位于 `shared/domain`
- PC 端主页面位于 `client/src/pages/Home.tsx`
- 小程序端预览位于 `client/src/components/MobileView.tsx`
- 登录状态由 `client/src/contexts/AuthContext.tsx` 模拟
- 课程目录、课程详情和课程权益由 `/api/courses`、`/api/course-access` 提供
- 课程权益开发期默认写入 `.hongboshi-data/course-access.json`
- 生产构建后由 `server/index.ts` 托管 `dist/public`

## 后续二开建议

1. 将课程权益 JSON Store 替换为 PostgreSQL/Prisma 或 Drizzle。
2. 接入真实登录会话、协议同意和 RBAC 权限守卫。
3. 建立心理测评、推荐路径和咨询预约状态机。
4. 拆分 `MobileView`、`LoginModal`、`CourseCard` 等大组件。
5. 引入 ESLint 或统一的代码质量检查规则。
