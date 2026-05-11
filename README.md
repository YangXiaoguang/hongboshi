# 红博士心理小讲堂

心理咨询与成长陪伴项目，包含 PC 课程中心、小程序端预览、个人成长空间、心理状态快速评估、咨询预约入口和运营管理后台。当前版本已完成课程目录、课程详情、课程权益 API adapter、本地开发期持久化、基础登录会话、课程权益权限守卫、成长档案聚合、测评推荐基础链路、咨询预约雏形、课程商品后台列表、上下架、改价、基础信息编辑、审计记录、前台课程发布联动和 PostgreSQL Store。

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
pnpm db:doctor   # 检查持久化配置与 PostgreSQL 连接
pnpm db:migrate  # 执行 server/db/migrations 下的 SQL 迁移
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
- [数据库 Schema 准备说明](./docs/database-schema.md)
- [课程中心 Feature 架构](./docs/course-feature-architecture.md)
- [运营管理后台建设路线图](./docs/admin-management-roadmap.md)
- [Codex 连续执行状态](./docs/codex-execution-state.md)
- [Codex 连续执行协议](./docs/codex-operating-protocol.md)

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写。当前主流程可直接运行，以下变量用于替换 mock 登录、启用地图组件或调整本地课程权益/课程商品持久化：

- `VITE_OAUTH_PORTAL_URL`
- `VITE_APP_ID`
- `VITE_FRONTEND_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_ANALYTICS_ENDPOINT`
- `VITE_ANALYTICS_WEBSITE_ID`
- `HONGBOSHI_COURSE_ACCESS_STORE`
- `HONGBOSHI_COURSE_ACCESS_FILE`
- `HONGBOSHI_COURSE_PRODUCT_STORE`
- `HONGBOSHI_COURSE_PRODUCT_FILE`
- `DATABASE_URL`
- `DATABASE_POOL_MAX`
- `HONGBOSHI_AUTH_SESSION_STORE`
- `HONGBOSHI_RISK_EVENT_STORE`
- `HONGBOSHI_ASSESSMENT_RESULT_STORE`
- `HONGBOSHI_COUNSELING_APPOINTMENT_STORE`
- `HONGBOSHI_COUNSELING_OPERATION_STORE`
- `HONGBOSHI_PAYMENT_WEBHOOK_STORE`

切换 PostgreSQL 时，先配置 `DATABASE_URL`，再按需将对应 Store 变量设置为 `postgres`。课程商品支持 `file`、`memory` 和 `postgres`，本地开发仍可用 `.env.example` 中的文件模式。运行：

```bash
pnpm db:doctor
pnpm db:migrate
```

`db:doctor` 会检查 Store 配置是否合法，并在配置了 `DATABASE_URL` 时执行一次 PostgreSQL 连通性检查；`db:migrate` 会记录已执行的 SQL 迁移，重复运行会跳过已应用项。

服务端启动和数据库脚本会优先读取 `.env.local`，再读取 `.env`；已存在的系统环境变量不会被文件覆盖。

## 当前业务状态

- 课程 seed 来自 `shared/data/mockCourses.ts`，当前用于课程商品 Store 初始化和测试 fallback；前台课程列表/详情通过课程商品 Store 读取已上架商品
- 共享业务类型位于 `shared/domain`
- PC 端主页面位于 `client/src/pages/Home.tsx`
- 个人成长空间位于 `client/src/pages/MyCourses.tsx`，通过 `/me/courses` 展示课程权益、学习进度、测评报告、咨询预约、会员和订单
- 心理状态快速评估位于 `client/src/pages/Assessment.tsx`，通过 `/assessment` 生成维度分、风险等级和推荐路径
- 咨询预约入口位于 `client/src/pages/Consulting.tsx`，通过 `/consulting` 选择咨询师、时段和咨询前信息
- 咨询师工作台位于 `client/src/pages/CounselorWorkbench.tsx`，通过 `/counselor/workbench` 处理分配预约、履约状态和退款中订单
- 运营管理后台位于 `client/src/pages/admin`，通过 `/admin` 提供统一后台入口、导航、权限守卫和后续模块骨架
- 课程商品后台位于 `client/src/pages/admin/CourseProducts.tsx`，通过 `/admin/courses` 展示课程商品、价格、状态、审核状态、筛选、分页、基础信息编辑、上下架、改价和最近审计
- 咨询运营配置位于 `client/src/pages/CounselingOperations.tsx`，通过 `/admin/counseling` 配置取消规则并查看履约审计
- 支付对账位于 `client/src/pages/PaymentReconciliation.tsx`，通过 `/admin/payments` 对比支付回调收据、业务订单和咨询预约状态
- 小程序端预览位于 `client/src/components/MobileView.tsx`
- 登录状态由 `/api/auth/session`、`/api/auth/login/phone`、`/api/auth/login/wechat` 和 `AuthContext` 共同管理，服务端会话可切换到 PostgreSQL
- 课程目录、课程详情、课程权益、后台课程商品、快速测评、咨询预约和成长档案分别由 `/api/courses`、`/api/course-access`、`/api/catalog/admin/course-products`、`/api/assessments/quick`、`/api/counseling/availability`、`/api/counseling/appointments` 和 `/api/growth/profile` 提供；`/api/courses` 已联动课程商品发布状态、价格和会员权益
- 课程权益开发期默认写入 `.hongboshi-data/course-access.json`，也可通过 `HONGBOSHI_COURSE_ACCESS_STORE=postgres` 切到 PostgreSQL
- 课程商品开发期默认写入 `.hongboshi-data/course-products.json`，也可通过 `HONGBOSHI_COURSE_PRODUCT_STORE=memory` 临时切回内存，或通过 `HONGBOSHI_COURSE_PRODUCT_STORE=postgres` 写入 PostgreSQL
- 测评结果、咨询预约、咨询运营配置、咨询审计、风险事件和支付回调收据已抽象为服务端 Store 接口，均已有 PostgreSQL 实现，默认仍可使用内存实现
- 数据库准备层位于 `server/db`，初始 PostgreSQL 迁移草案见 `server/db/migrations/0001_core_tables.sql`
- 登录会话、课程权益、课程商品、风险事件、测评结果、咨询预约、咨询运营配置/审计和支付回调 Store 已有 PostgreSQL 实现；设置 `DATABASE_URL` 且分别将对应 `HONGBOSHI_*_STORE` 设为 `postgres` 后可切换
- 课程权益读取优先使用服务端 session cookie 识别用户，`x-hongboshi-user-id` 仅作为开发期读取兜底
- 课程购买和会员开通必须具备 `member` 权限，登录时会记录 terms/privacy 协议版本
- 成长档案读取需要登录；当前聚合课程权益、订单、最新测评报告、咨询预约和最近时间线
- 咨询预约提交和预约记录读取需要登录；当前会生成待支付预约单、锁定时段，并对高风险/危机诉求生成风险事件
- 咨询师工作台需要 `counselor`、`operator` 或 `admin` 角色；服务端通过 `counseling:fulfill` 权限控制读取和履约操作
- 咨询运营配置需要 `operator` 或 `admin` 角色；服务端通过 `admin:manage` 权限控制取消规则更新和审计读取
- 支付对账需要 `operator` 或 `admin` 角色；服务端通过 `admin:manage` 权限控制回调收据和业务状态读取
- 课程商品后台列表与写动作需要 `operator` 或 `admin` 角色；服务端通过 `admin:manage` 权限控制商品快照读取、基础信息编辑、上下架和改价
- 生产构建后由 `server/index.ts` 托管 `dist/public`

## 后续二开建议

1. 接入真实短信/微信登录服务，并替换当前 mock 登录凭证校验。
2. 引入 Prisma 或 Drizzle 管理迁移、事务和类型安全查询。
3. 建立订单支付状态机，区分待支付、已支付、退款、支付超时关闭。
4. 接入真实支付渠道、退款通道和支付对账异常处理动作。
5. 建立风险人工复核台，承接高风险测评和咨询前信息。
6. 为课程商品补齐内容审核流、课程详情内容管理、章节/素材管理和更细粒度权限。
7. 拆分 `MobileView`、`LoginModal`、`CourseCard` 等大组件。
8. 引入 ESLint 或统一的代码质量检查规则。
