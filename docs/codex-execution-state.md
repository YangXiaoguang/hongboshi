# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-11 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `d859ab6 Add course product admin actions`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M2-D 课程商品 PostgreSQL Store 与基础信息编辑`
- 当前状态：`M2-C 课程商品持久化与前台发布联动` 已完成，下一轮应把课程商品 Store 接到 PostgreSQL，并补齐基础信息编辑。
- 本轮完成后下一步：执行 `M2-D 课程商品 PostgreSQL Store 与基础信息编辑`

## 已完成关键能力

- 项目已提交到 GitHub，并以 `main` 作为持续开发分支。
- 建立连续执行基建：后台路线图、Codex 执行状态和操作协议已进入仓库。
- 建立统一 `/admin` 运营管理后台框架，提供后台首页、侧边导航、移动端导航和统一权限守卫。
- `/admin/counseling` 和 `/admin/payments` 已接入统一后台 shell，原 URL 保持可用。
- 顶部用户菜单的运营入口已统一指向 `/admin`。
- 完成心理咨询类项目的现代化界面优化。
- 建立产品工程路线文档、领域契约文档、数据库准备文档和课程中心 Feature 架构文档。
- 建立课程中心、课程权益、成长档案、心理测评和咨询预约基础闭环。
- 建立咨询预约订单绑定、支付回调抽象、支付回调签名校验和幂等收据。
- 建立咨询改期、取消、退款、履约动作和咨询师工作台。
- 建立 `/admin/counseling` 咨询运营配置页面、取消规则和履约审计。
- 建立咨询运营配置/审计 Store，并支持 PostgreSQL 切换。
- 建立 `/admin/payments` 支付对账页面，对比支付回调收据、业务订单和咨询预约状态。
- 建立课程商品共享契约 `CourseProductListResultSchema`，定义商品状态、审核状态、价格、筛选和分页响应。
- 建立 `server/modules/catalog` 课程商品只读 Store 与后台 API，首版从课程 seed 映射商品快照并校验 `admin:manage`。
- 建立 `/admin/courses` 课程商品列表页面，支持搜索、状态筛选、分类筛选、排序和分页。
- 后台导航已将课程商品从“规划”切换为“可用”。
- 建立课程商品状态动作与价格编辑契约，服务端统一校验上下架、价格和原因。
- 建立课程商品开发期可变 Store、上下架/改价 API 和课程商品审计事件。
- `/admin/courses` 支持行级上架、下架、改价操作，并展示最近审计记录。
- 建立课程商品 JSON 文件 Store，开发期默认写入 `.hongboshi-data/course-products.json`，状态、价格和审计事件可重启恢复。
- `/api/courses` 和课程详情已读取课程商品 Store，只展示 `published` 商品，并同步后台价格与会员权益变化。

## 最近完成阶段

M2-C 课程商品持久化与前台发布联动已交付：

- `server/modules/catalog/courseProductStore.ts`：新增 `JsonFileCourseProductStore`、课程商品文件 schema、Store 路径解析、产品到前台课程映射，以及 `published` 商品过滤。
- `server/modules/courses/courseApi.ts`：`GET /api/courses` 与 `GET /api/courses/:courseId` 改为读取课程商品 Store，后台下架后前台不可见，后台改价后前台同步。
- `server/db/runtimeConfig.ts`：新增 `HONGBOSHI_COURSE_PRODUCT_STORE=file|memory` 运行时配置，默认开发期使用文件 Store。
- `.env.example`：补充 `HONGBOSHI_COURSE_PRODUCT_STORE` 与 `HONGBOSHI_COURSE_PRODUCT_FILE`。
- `server/modules/catalog/courseProductStore.test.ts`、`server/modules/courses/courseApi.test.ts`、`server/db/runtimeConfig.test.ts`：覆盖 JSON Store 重启恢复、前台发布过滤、价格同步和运行时配置。
- README、领域契约、数据库说明、产品路线和后台路线图同步了课程商品 Store 边界。

M2-C 验收结果：

- 后台下架某个课程商品后，前台课程列表和详情不再展示该课程。
- 后台改价后，前台课程卡片和详情读取更新后的价格。
- 开发期 JSON Store 重启后可恢复课程商品状态、价格和审计事件。
- 课程商品 Store 接口仍能平滑替换为 PostgreSQL 实现。

## 下一步任务包

### M2-D: 课程商品 PostgreSQL Store 与基础信息编辑

业务目标：

把课程商品从开发期文件持久化推进到可上线的数据库持久化，并让运营可以编辑课程商品基础信息。该阶段要保持 Store 抽象稳定，前台课程 API 和后台列表不感知底层从 JSON 切换到 PostgreSQL。

实施范围：

- 设计并新增课程商品数据库迁移，建议包含 `course_products` 与 `course_product_audit_events`，字段覆盖商品基础信息、价格、状态、审核状态、来源、发布时间和更新时间。
- 新增 `PostgresCourseProductStore`，实现 `CourseProductStore` 接口，并复用现有 Zod schema 做读写校验。
- 将 `HONGBOSHI_COURSE_PRODUCT_STORE` 扩展为 `memory|file|postgres`，配置 `DATABASE_URL` 时允许切换到 PostgreSQL。
- 增加课程商品基础信息编辑契约与服务端动作，优先覆盖标题、分类、类型、封面、讲师、学习人数或简介摘要这类低风险字段。
- 在 `/admin/courses` 增加基础信息编辑入口，写动作后刷新列表，并追加 `CourseProductAuditEventSchema` 审计事件。
- 保持 `/api/courses` 继续只读取已上架商品，确保 Postgres/File/Memory 三种 Store 下行为一致。
- 增加迁移校验、PostgreSQL Store 单测、API/action 单测和前端编辑交互测试。
- 更新 README、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add course product postgres store`。

验收标准：

- `HONGBOSHI_COURSE_PRODUCT_STORE=postgres` 且配置 `DATABASE_URL` 后，课程商品、价格、状态和审计事件可写入 PostgreSQL。
- 没有配置 PostgreSQL 时，现有 JSON 文件开发流程保持可用。
- 运营可编辑课程商品基础信息，非法字段、缺少原因或无权限请求会被拒绝。
- 前台课程列表/详情在三种 Store 下都只展示已上架商品，并同步最新商品信息。
- CI 通过。

## 执行不变量

- 每次开始前先执行 `git status --short`，确认工作区状态。
- 每次继续前阅读本文件和 `docs/codex-operating-protocol.md`。
- 只实现“下一步任务包”的范围；发现更大问题时记录到文档，不顺手大改。
- 共享数据结构必须先进入 `shared/domain`。
- 后台敏感接口必须有权限校验。
- 后台敏感动作必须有审计设计，当前阶段无法落地时也要写入后续任务。
- 涉及订单、支付、退款、咨询履约、风险处理的状态变更必须由 server service 决策。
- 完成后运行 `pnpm run ci`；如因环境阻塞无法运行，必须在最终回复和状态文件中说明。
- 完成后更新本文件的“当前指针”“已完成关键能力”和“下一步任务包”。
- 完成后提交 Git commit 并推送到 GitHub。

## 待决策问题

- 后台权限是否需要从 `admin:manage` 拆为 `admin:read`、`catalog:manage`、`order:manage`、`finance:read`、`risk:review` 等更细粒度权限。建议在 M2 或 M3 前完成第一版拆分。
- 课程商品 PostgreSQL 表是否独立保存课程内容详情，还是先只保存商品化字段并继续复用现有课程详情 seed。建议 M2-D 先保存商品化字段，内容详情在内容审核阶段独立建模。
- 真实支付渠道优先接微信支付还是支付宝。建议先把渠道适配接口稳定，再选择一个渠道试点。
