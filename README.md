# 红博士心理小讲堂

课程发现页前端项目，包含 PC 课程中心与小程序端预览两套体验。当前版本以高保真前端原型为主，课程、登录、收藏、分享、优惠券等业务能力均为前端 mock，后端只负责生产环境静态文件托管。

## 技术栈

- Vite 7
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui 风格组件
- Express 静态生产服务
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
  index.ts          # 生产静态服务入口
shared/
  const.ts          # 前后端共享常量
```

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写。当前主流程不依赖环境变量，以下变量只在替换 mock 登录或启用地图组件时需要：

- `VITE_OAUTH_PORTAL_URL`
- `VITE_APP_ID`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`

## 当前业务状态

- 课程数据来自 `client/src/lib/mockData.ts`
- PC 端主页面位于 `client/src/pages/Home.tsx`
- 小程序端预览位于 `client/src/components/MobileView.tsx`
- 登录状态由 `client/src/contexts/AuthContext.tsx` 模拟
- 生产构建后由 `server/index.ts` 托管 `dist/public`

## 后续二开建议

1. 定义真实课程、用户、收藏、优惠券、订单和会员 API。
2. 将 mock 数据迁移到 API adapter，保留 mock 作为开发 fallback。
3. 拆分 `MobileView`、`LoginModal`、`CourseCard` 等大组件。
4. 为筛选、分页、登录、收藏等核心行为补充单元测试。
5. 引入 ESLint 或统一的代码质量检查规则。
