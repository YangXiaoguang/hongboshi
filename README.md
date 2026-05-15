# 红博士心理小讲堂

心理咨询与成长陪伴项目，包含 PC 课程中心、小程序端预览、个人成长空间、心理状态快速评估、咨询预约入口和运营管理后台。当前版本已完成课程目录、课程详情、课程权益 API adapter、本地开发期持久化、基础登录会话、课程权益权限守卫、成长档案聚合、测评推荐基础链路、咨询预约雏形、课程商品后台列表、用户会员后台、统一订单后台、交易退款后台、财务管理只读台、CSV 导出、账期手续费规则、结算预览、咨询排班运营、咨询师档案与资质服务状态、服务记录与履约异常、风险复核台、风险 SOP 模板、升级队列、审计中心、审计 CSV 导出、审计事件详情追踪、统一审计 Store 架构方案、审计归档表草案、退款申请、异常工单、会员权益操作审计、订单操作审计、交易操作审计、风险处理记录、跨模块审计聚合、资源级权限、上下架、改价、基础信息编辑、内容审核流、详情内容管理、内容质量校验、审计记录、前台课程发布联动和 PostgreSQL Store。

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
- [统一审计 Store 架构方案](./docs/audit-store-architecture.md)
- [课程中心 Feature 架构](./docs/course-feature-architecture.md)
- [运营管理后台建设路线图](./docs/admin-management-roadmap.md)
- [Codex 连续执行状态](./docs/codex-execution-state.md)
- [Codex 连续执行协议](./docs/codex-operating-protocol.md)

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需填写。当前主流程可直接运行，以下变量用于替换 mock 登录、启用地图组件或调整本地课程权益、课程商品、交易操作、财务规则、风险复核记录和咨询师档案 overlay 持久化：

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
- `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE`
- `HONGBOSHI_COURSE_PRODUCT_CONTENT_FILE`
- `HONGBOSHI_TRANSACTION_OPERATION_STORE`
- `HONGBOSHI_TRANSACTION_OPERATION_FILE`
- `HONGBOSHI_TRANSACTION_REFUND_PROVIDER`
- `HONGBOSHI_FINANCE_RULE_STORE`
- `HONGBOSHI_FINANCE_RULE_FILE`
- `HONGBOSHI_RISK_REVIEW_STORE`
- `HONGBOSHI_RISK_REVIEW_FILE`
- `HONGBOSHI_RISK_SOP_STORE`
- `HONGBOSHI_RISK_SOP_FILE`
- `HONGBOSHI_COUNSELOR_PROFILE_STORE`
- `HONGBOSHI_COUNSELOR_PROFILE_FILE`
- `DATABASE_URL`
- `DATABASE_POOL_MAX`
- `HONGBOSHI_AUTH_SESSION_STORE`
- `HONGBOSHI_RISK_EVENT_STORE`
- `HONGBOSHI_ASSESSMENT_RESULT_STORE`
- `HONGBOSHI_COUNSELING_APPOINTMENT_STORE`
- `HONGBOSHI_COUNSELING_OPERATION_STORE`
- `HONGBOSHI_PAYMENT_WEBHOOK_STORE`

切换 PostgreSQL 时，先配置 `DATABASE_URL`，再按需将对应 Store 变量设置为 `postgres`。课程商品、课程商品详情内容、交易操作、风险复核处理记录、风险 SOP 模板与升级队列均支持 `file`、`memory` 和 `postgres`；财务账期与手续费规则、咨询师档案 overlay 当前支持 `file` 和 `memory`。本地开发仍可用 `.env.example` 中的文件模式。运行：

```bash
pnpm db:doctor
pnpm db:migrate
```

`db:doctor` 会检查 Store 配置是否合法，并在配置了 `DATABASE_URL` 时执行一次 PostgreSQL 连通性检查；`db:migrate` 会记录已执行的 SQL 迁移，重复运行会跳过已应用项。

服务端启动和数据库脚本会优先读取 `.env.local`，再读取 `.env`；已存在的系统环境变量不会被文件覆盖。

## 当前业务状态

- 课程 seed 来自 `shared/data/mockCourses.ts`，当前用于课程商品 Store 初始化和测试 fallback；前台课程列表/详情通过课程商品 Store 读取已审核通过且已上架商品
- 共享业务类型位于 `shared/domain`
- PC 端主页面位于 `client/src/pages/Home.tsx`
- 个人成长空间位于 `client/src/pages/MyCourses.tsx`，通过 `/me/courses` 展示课程权益、学习进度、测评报告、咨询预约、会员和订单
- 心理状态快速评估位于 `client/src/pages/Assessment.tsx`，通过 `/assessment` 生成维度分、风险等级和推荐路径
- 咨询预约入口位于 `client/src/pages/Consulting.tsx`，通过 `/consulting` 选择咨询师、时段和咨询前信息
- 咨询师工作台位于 `client/src/pages/CounselorWorkbench.tsx`，通过 `/counselor/workbench` 处理分配预约、履约状态和退款中订单
- 运营管理后台位于 `client/src/pages/admin`，通过 `/admin` 提供统一后台入口、导航、权限守卫和后续模块骨架
- 课程商品后台位于 `client/src/pages/admin/CourseProducts.tsx`，通过 `/admin/courses` 展示课程商品、价格、状态、审核状态、筛选、分页、基础信息编辑、详情内容编辑、审核动作、上下架、改价、素材资料占位和最近审计
- 用户会员后台位于 `client/src/pages/admin/UserMembers.tsx`，通过 `/admin/users` 展示账号摘要、角色、会员状态、课程权益、订单摘要、咨询预约摘要、风险提示和会员操作审计；具备 `user:membership` 权限的后台账号可执行开通、延期、标记到期和调整计划，手机号、咨询说明、测评答案和风险信号原文保持最小化展示
- 订单管理后台位于 `client/src/pages/admin/OrderManagement.tsx`，通过 `/admin/orders` 展示课程、会员和咨询订单列表、筛选、详情、支付回调摘要、关联履约对象、状态时间线、待支付订单关闭、异常标记和订单操作审计
- 交易退款后台位于 `client/src/pages/admin/TransactionManagement.tsx`，通过 `/admin/transactions` 展示支付流水、退款流水、渠道回调状态、关联订单、业务对象和异常摘要；具备 `transaction:operate` 权限的后台账号可发起受控退款申请、标记交易异常工单、解决异常并查看交易操作审计与退款渠道受理摘要
- 财务管理后台位于 `client/src/pages/admin/FinanceManagement.tsx`，通过 `/admin/finance` 展示收入、退款、净收款、退款中金额、异常金额、渠道/业务类型分布、财务口径和脱敏明细，并支持按当前筛选条件导出带生成时间、筛选条件、汇总金额、口径版本和账期/手续费/结算/发票预留字段的 CSV；同页已接入自然月账期、渠道费率、固定手续费、最低手续费和结算预览
- 风险复核台位于 `client/src/pages/admin/RiskReview.tsx`，通过 `/admin/risk` 展示风险事件队列、用户脱敏摘要、风险等级、来源、关联测评/咨询对象摘要、服务端 SOP 模板、处理结果模板、升级队列、处理记录和受控处理动作，不展示测评答案原文、咨询前说明全文或风险信号原文
- 审计中心位于 `client/src/pages/admin/AuditCenter.tsx`，通过 `/admin/audit` 只读聚合课程商品、用户会员、订单、交易、咨询运营和风险复核的既有操作审计，支持模块、动作、操作者、资源关键词和日期筛选，并可按当前筛选条件导出 CSV、查看单条事件来源详情，同时保持咨询说明、测评答案、风险信号原文和支付敏感原文最小化；统一审计 Store 当前已完成架构方案、归档事件契约和只追加 PostgreSQL 归档表草案，尚未切换业务真相源
- 咨询运营配置位于 `client/src/pages/CounselingOperations.tsx`，通过 `/admin/counseling` 维护咨询师档案、资质摘要、服务状态、接单开关、未来排班、关闭/恢复可预约时段、查看服务记录与履约异常、配置取消规则并查看履约审计
- 支付对账位于 `client/src/pages/PaymentReconciliation.tsx`，通过 `/admin/payments` 对比支付回调收据、业务订单和咨询预约状态
- 小程序端预览位于 `client/src/components/MobileView.tsx`
- 登录状态由 `/api/auth/session`、`/api/auth/login/phone`、`/api/auth/login/wechat` 和 `AuthContext` 共同管理，服务端会话可切换到 PostgreSQL
- 课程目录、课程详情、课程权益、后台课程商品、后台用户会员、后台订单、后台交易流水、后台财务概览/导出/规则、后台风险复核/SOP、后台审计中心、快速测评、咨询预约、咨询运营排班/咨询师档案/服务记录和成长档案分别由 `/api/courses`、`/api/course-access`、`/api/catalog/admin/course-products`、`/api/users/admin/users`、`/api/users/admin/users/:userId/membership`、`/api/orders/admin/orders`、`/api/transactions/admin/transactions`、`/api/finance/admin/overview`、`/api/finance/admin/export`、`/api/finance/admin/rules`、`/api/risk/admin/events`、`/api/risk/admin/sop`、`/api/audit/admin/events`、`/api/audit/admin/events/:eventId`、`/api/audit/admin/export`、`/api/assessments/quick`、`/api/counseling/availability`、`/api/counseling/appointments`、`/api/counseling/admin/schedules`、`/api/counseling/admin/counselors`、`/api/counseling/admin/service-records` 和 `/api/growth/profile` 提供；`/api/courses` 已联动课程商品发布状态、审核状态、价格、会员权益和详情内容
- 课程权益和会员操作审计开发期默认写入 `.hongboshi-data/course-access.json`，也可通过 `HONGBOSHI_COURSE_ACCESS_STORE=postgres` 切到 PostgreSQL
- 课程商品开发期默认写入 `.hongboshi-data/course-products.json`，也可通过 `HONGBOSHI_COURSE_PRODUCT_STORE=memory` 临时切回内存，或通过 `HONGBOSHI_COURSE_PRODUCT_STORE=postgres` 写入 PostgreSQL
- 课程商品详情内容开发期默认写入 `.hongboshi-data/course-product-content.json`，也可通过 `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=memory` 临时切回内存，或通过 `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=postgres` 写入 PostgreSQL；后台会展示批量内容校验状态，提交审核前会拦截摘要、适合人群、章节、时长和素材占位等硬性问题，并已为素材资料 ID、资料地址、下载开关和合规审核状态预留字段
- 测评结果、咨询预约、咨询运营配置、咨询审计、咨询师档案 overlay、风险事件、风险复核处理记录、风险 SOP 模板与升级队列、支付回调收据、交易操作工单、交易操作审计和财务规则已抽象为服务端 Store 接口；咨询师档案 overlay 和财务规则当前先提供内存/JSON 文件实现，其余核心 Store 均已有 PostgreSQL 实现
- 数据库准备层位于 `server/db`，初始 PostgreSQL 迁移草案见 `server/db/migrations/0001_core_tables.sql`；审计归档表草案见 `server/db/migrations/0015_audit_center_archive.sql`
- 登录会话、课程权益、课程商品、课程商品详情内容、风险事件、风险复核记录、风险 SOP 模板与升级队列、测评结果、咨询预约、咨询运营配置/审计、支付回调和交易操作 Store 已有 PostgreSQL 实现；设置 `DATABASE_URL` 且分别将对应 `HONGBOSHI_*_STORE` 设为 `postgres` 后可切换，其中风险复核记录与风险 SOP/升级队列未显式设置为 `file` 时可随 `DATABASE_URL` 自动切换
- 课程权益读取优先使用服务端 session cookie 识别用户，`x-hongboshi-user-id` 仅作为开发期读取兜底
- 课程购买和会员开通必须具备 `member` 权限，登录时会记录 terms/privacy 协议版本
- 成长档案读取需要登录；当前聚合课程权益、订单、最新测评报告、咨询预约和最近时间线
- 咨询预约提交和预约记录读取需要登录；当前会生成待支付预约单、锁定时段，并对高风险/危机诉求生成风险事件
- 咨询师工作台需要 `counselor`、`operator` 或 `admin` 角色；服务端通过 `counseling:fulfill` 权限控制读取和履约操作
- 咨询运营配置需要 `operator` 或 `admin` 角色；服务端通过 `admin:manage` 权限控制咨询师档案读取/维护、服务状态切换、排班读取/维护、服务记录与异常摘要读取、取消规则更新和审计读取
- 支付对账需要 `operator` 或 `admin` 角色；服务端通过 `admin:manage` 权限控制回调收据和业务状态读取
- 课程商品后台使用资源级权限控制：`catalog:read` 可查看列表、详情和内容校验；`catalog:edit` 可编辑基础信息和详情内容；`catalog:review` 可执行审核动作；`catalog:publish` 可上下架；`catalog:price` 可改价。`catalog_viewer` 是课程商品只读角色，`catalog_operator` 是课程商品运营角色，现有 `operator` 和 `admin` 仍具备课程商品完整操作能力
- 用户会员后台使用 `user:read` 权限控制列表和详情聚合，使用 `user:membership` 权限控制会员开通、延期、到期标记和计划调整；当前由 `operator` 与 `admin` 拥有，详情不返回咨询说明、测评答案和风险信号原文
- 订单管理后台使用 `order:read` 权限控制课程、会员和咨询订单的列表与详情聚合，使用 `order:operate` 权限控制关闭待支付订单、标记异常和解除异常；当前由 `operator` 与 `admin` 拥有，详情只展示履约和对账所需摘要，操作必须填写原因并写入审计
- 交易退款后台使用 `transaction:read` 权限控制支付/退款流水的列表与详情聚合，使用 `transaction:operate` 权限控制退款申请、交易异常工单和操作审计；当前由 `operator` 与 `admin` 拥有，详情只展示对账、履约排障和客服核查所需摘要，退款申请会先经过 `HONGBOSHI_TRANSACTION_REFUND_PROVIDER` 对应的人工/模拟渠道受理，受理失败不会修改订单，受理成功也只把合规订单推进到 `refunding`，真实退款完成仍由 `refund.succeeded` 回调驱动
- 财务管理后台使用 `finance:read` 权限控制收入、退款、净收款、退款中金额、异常金额、财务明细聚合、CSV 导出、规则读取和结算预览；当前由 `operator` 与 `admin` 拥有。`finance:manage` 控制手续费规则写入，当前仅 `admin` 拥有。明细只展示财务对账所需脱敏摘要，支付成功计入收入、退款成功计入退款、退款中计入待退款、失败/异常流水只进入异常提示；结算预览只估算手续费和结算金额，不修改订单、支付或交易状态
- 风险复核台使用 `risk:read` 权限控制风险事件列表、隐私最小化详情和 SOP 控制台读取，使用 `risk:review` 权限控制开始复核、已联系、建议咨询、升级处理和标记解决，使用 `risk:sop` 权限控制 SOP 模板维护；`operator` 与 `admin` 拥有读取和处理权限，当前仅 `admin` 拥有 SOP 模板写权限。风险复核接口只返回摘要、关联对象、SOP 模板、升级摘要和处理记录，不返回风险信号原文
- 审计中心使用 `audit:read` 权限控制跨模块审计事件读取、CSV 导出和事件详情定位，当前由 `operator` 与 `admin` 拥有。审计中心保持只读聚合课程商品、会员、订单、交易、咨询运营和风险复核已有审计事实，不提供修改或删除动作，不返回咨询说明、测评答案、风险信号原文和支付敏感原文。统一归档表只允许保存 summary-only 摘要事件，使用唯一幂等键支持回填和重试
- 生产构建后由 `server/index.ts` 托管 `dist/public`

## 后续二开建议

1. 接入真实短信/微信登录服务，并替换当前 mock 登录凭证校验。
2. 引入 Prisma 或 Drizzle 管理迁移、事务和类型安全查询。
3. 接入真实支付渠道和退款通道，在现有退款渠道适配接口内替换人工/模拟受理实现。
4. 建立支付对账异常处理动作，并把交易异常工单与财务异常继续联动。
5. 在现有账期手续费规则基础上继续完善结算批次、渠道结算单、发票和财务审核流。
6. 在统一审计 Store 方案和归档表草案基础上，实现可手动触发的审计归档任务，再逐步建设长期归档、读取切换和风险通知协作。
7. 拆分 `MobileView`、`LoginModal`、`CourseCard` 等大组件。
8. 引入 ESLint 或统一的代码质量检查规则。
