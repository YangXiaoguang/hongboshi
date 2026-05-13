# 数据库 Schema 准备说明

本项目下一阶段目标是把开发期 JSON/内存 Store 逐步替换为 PostgreSQL。当前已经先落下数据库准备层，避免后续在接入 ORM 或迁移工具时重新讨论核心业务表；课程商品、课程详情内容、会员权益操作审计和订单操作审计均已完成开发期 Store、专用 PostgreSQL 表与 Store。M5-A 交易流水只读台没有新增数据库表，读取现有 `payment_webhook_events`、`orders`、`order_items`、`order_admin_exception_flags` 等表/Store 投影。M5-B 交易退款动作新增独立 `TransactionOperationStore`，开发期先使用内存/JSON 文件保存交易异常工单和操作审计，M5-C 再补 PostgreSQL 表与 Store。

## 文件位置

- `server/db/schema.ts`：核心表契约，供测试和后续 Store 实现引用。
- `server/db/migrations/0001_core_tables.sql`：PostgreSQL 初始迁移草案。
- `server/db/migrations/0002_payment_webhook_events.sql`：支付回调收据表，用于签名后的事件幂等和处理结果追踪。
- `server/db/migrations/0003_counseling_operations.sql`：咨询运营配置与履约审计表。
- `server/db/migrations/0004_course_products.sql`：课程商品表与课程商品审计事件表。
- `server/db/migrations/0005_course_product_review_workflow.sql`：课程商品审核审计动作约束与审核状态索引。
- `server/db/migrations/0006_course_product_content_management.sql`：课程商品内容审计动作约束。
- `server/db/migrations/0007_course_product_contents.sql`：课程商品详情内容表，使用 JSONB 保存适合人群、章节和素材占位。
- `server/db/migrations/0008_catalog_permissions.sql`：扩展 `user_roles` 角色约束，支持课程商品只读与课程商品运营角色。
- `server/db/migrations/0009_user_membership_audit_events.sql`：用户会员权益后台操作审计表，记录操作者、原因和前后会员状态。
- `server/db/migrations/0010_order_admin_operations.sql`：订单后台异常标记表与订单操作审计表，记录待支付关闭、异常标记和解除异常的前后状态。
- `server/db/migrationRunner.ts`：轻量 SQL migration runner，记录已应用迁移。
- `server/db/runtimeConfig.ts`：运行时持久化 Store 配置解析与校验。
- `server/db/schema.test.ts`：检查迁移中是否包含核心表、关键列和查询索引。

## 初始化命令

1. 配置 `DATABASE_URL`。
2. 按需将 `HONGBOSHI_AUTH_SESSION_STORE`、`HONGBOSHI_COURSE_ACCESS_STORE`、`HONGBOSHI_COURSE_PRODUCT_STORE`、`HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE`、`HONGBOSHI_RISK_EVENT_STORE`、`HONGBOSHI_ASSESSMENT_RESULT_STORE`、`HONGBOSHI_COUNSELING_APPOINTMENT_STORE`、`HONGBOSHI_COUNSELING_OPERATION_STORE`、`HONGBOSHI_PAYMENT_WEBHOOK_STORE` 设置为 `postgres`。`HONGBOSHI_TRANSACTION_OPERATION_STORE` 当前支持 `file` 和 `memory`，PostgreSQL 支持进入 M5-C。
3. 运行 `pnpm db:doctor` 检查 Store 配置与数据库连接。
4. 运行 `pnpm db:migrate` 应用 `server/db/migrations/*.sql`。

迁移记录保存在 `hongboshi_schema_migrations`，因此 `pnpm db:migrate` 可以重复执行。当前 migration 文件本身也使用 `CREATE TABLE IF NOT EXISTS` 与 `CREATE INDEX IF NOT EXISTS`，方便开发期反复初始化。

服务端启动、`db:doctor` 和 `db:migrate` 都会先加载 `.env.local`，再加载 `.env`；如果同名系统环境变量已经存在，文件值不会覆盖它。

## 设计原则

- 领域契约仍以 `shared/domain` 为准，数据库字段不能绕过 Zod schema 暴露给前端。
- 金额统一以 `*_cents` 整数存储，避免浮点金额误差；API 层再转换为领域模型里的金额数值。
- 测评分数、推荐结果这类强业务结构先用 `JSONB` 存储，保持与报告生成引擎同步；当运营查询变复杂后再拆维度表。
- 咨询时段和预约单分表，`uniq_active_counseling_slot` 防止同一时段被多个有效预约占用；咨询预约通过 `order_id` 关联 `orders`，用于支付确认、超时关闭和后续退款流转。
- 风险事件独立建表，测评报告和咨询预约通过 `risk_event_id` 关联，咨询预约同时保留 `assessment_report_id`，方便咨询师在服务前回看用户授权带入的测评上下文。
- 审计日志只追加，不作为业务状态来源；咨询运营审计单独保留规则快照、履约状态前后值和操作者角色，会员操作审计保留前后会员状态、订单操作审计保留订单状态和异常标记前后快照、操作原因和操作者角色，便于后台追溯。
- 交易流水以 `payment_webhook_events` 为准，订单和业务对象状态分别来自订单、课程权益和咨询预约 Store。交易退款动作的开发期状态来源是 `TransactionOperationStore`，默认 JSON 文件为 `.hongboshi-data/transaction-operations.json`，保存交易异常工单和交易操作审计；PostgreSQL 表将在 M5-C 独立落地。

## 初始核心表

| 领域           | 表                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 用户与认证     | `users`, `user_roles`, `user_consents`, `auth_sessions`                                                                                                                                    |
| 课程权益与订单 | `course_memberships`, `course_access_grants`, `course_products`, `course_product_contents`, `orders`, `order_items`, `payments`, `payment_webhook_events`                                  |
| 测评           | `assessment_reports`                                                                                                                                                                       |
| 咨询           | `counselors`, `counseling_slots`, `counseling_appointments`, `counseling_operation_settings`                                                                                               |
| 风险与审计     | `risk_events`, `audit_logs`, `course_product_audit_events`, `counseling_operation_audit_events`, `user_membership_audit_events`, `order_admin_exception_flags`, `order_admin_audit_events` |

## 后续接入顺序

1. 选择 Prisma 或 Drizzle，并让其 migration 与 `0001_core_tables.sql` 对齐。
2. 扩展 PostgreSQL 版 Store：登录会话、课程权益、会员操作审计、订单操作审计、课程商品、课程商品详情内容、风险事件、测评结果、咨询预约、咨询运营配置/审计和支付回调收据已经完成第一版，且已能支撑用户会员后台、统一订单后台和交易流水聚合；下一步优先补齐交易操作工单与审计的 PostgreSQL Store。
3. 使用 `DATABASE_URL` 控制 Store 实现，开发期保留内存/JSON fallback。
4. 增加集成测试：登录 -> 购买课程 -> 测评 -> 咨询预约 -> 成长档案聚合。
5. 上线前补齐迁移回滚策略、备份策略、PII 最小化和日志脱敏。

## 数据库 Store 试点

`server/modules/risk/postgresRiskEventStore.ts` 已实现 `risk_events` 表的保存、单条读取、按用户读取和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_RISK_EVENT_STORE=postgres` 时，风险事件会写入 PostgreSQL。

`server/modules/assessments/postgresAssessmentResultStore.ts` 已实现 `assessment_reports` 表的保存、最新报告读取、按用户读取和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_ASSESSMENT_RESULT_STORE=postgres` 时，测评报告会写入 PostgreSQL。

`server/modules/counseling/postgresCounselingAppointmentStore.ts` 已实现咨询师 seed、咨询时段 seed、预约保存、全量预约读取、按用户读取、订单关联和风险事件关联读取能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_COUNSELING_APPOINTMENT_STORE=postgres` 时，咨询预约会写入 PostgreSQL。

`server/modules/counseling/postgresCounselingOperationStore.ts` 已实现取消规则配置、规则变更审计、履约审计读取和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_COUNSELING_OPERATION_STORE=postgres` 时，咨询运营配置与审计会写入 PostgreSQL。

`server/modules/courses/postgresCourseAccessStore.ts` 已实现课程会员、课程授权、订单、订单明细、会员操作审计、订单异常标记和订单操作审计事件的保存、单用户读取与后台聚合所需的用户权益快照列表能力。开发期默认仍可使用 JSON Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_COURSE_ACCESS_STORE=postgres` 时，课程权益、会员操作审计和订单操作审计会写入 PostgreSQL。

`server/modules/auth/postgresAuthSessionStore.ts` 已实现用户、角色、协议同意和登录会话的保存、读取、注销与用户目录列表能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_AUTH_SESSION_STORE=postgres` 时，登录会话会写入 PostgreSQL，并只保存 session token 的哈希值。

`server/modules/payments/postgresPaymentWebhookEventStore.ts` 已实现支付回调事件的登记、重复事件读取、处理结果保存和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_PAYMENT_WEBHOOK_STORE=postgres` 时，支付回调收据会写入 PostgreSQL，避免服务重启后重复处理同一支付事件。

`server/modules/transactions/transactionOperationStore.ts` 已实现交易异常工单和交易操作审计的内存 Store 与 JSON 文件 Store。开发期默认使用 `.hongboshi-data/transaction-operations.json` 保存退款申请、异常标记、异常解决等交易后台动作产生的工单和审计事件；当设置 `HONGBOSHI_TRANSACTION_OPERATION_STORE=memory` 时可临时切回内存。PostgreSQL Store 将在 M5-C 补齐。

`server/modules/catalog/courseProductStore.ts` 已实现课程商品内存 Store 与 JSON 文件 Store。开发期默认使用 `.hongboshi-data/course-products.json` 保存课程商品状态、价格和审计事件；当设置 `HONGBOSHI_COURSE_PRODUCT_STORE=memory` 时可临时切回内存。

`server/modules/catalog/postgresCourseProductStore.ts` 已实现 `course_products` 与 `course_product_audit_events` 的保存、读取、初始化 seed、基础信息/价格/审核/状态更新承载和审计事件读取能力。当配置 `DATABASE_URL`，且 `HONGBOSHI_COURSE_PRODUCT_STORE=postgres` 时，课程商品会写入 PostgreSQL。

`server/modules/catalog/courseProductContentStore.ts` 已实现课程详情内容的内存 Store、JSON 文件 Store 和批量内容质量校验。开发期默认使用 `.hongboshi-data/course-product-content.json` 保存详情摘要、适合人群、章节和素材占位；当设置 `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=memory` 时可临时切回内存。

`server/modules/catalog/postgresCourseProductContentStore.ts` 已实现 `course_product_contents` 的读取、保存和清空能力。表内以 `JSONB` 保存适合人群、章节和素材占位；当配置 `DATABASE_URL`，且 `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=postgres` 时，课程详情内容会写入 PostgreSQL。内容更新会写入课程商品审计事件，并把需要复审的商品回退到未提交审核。

当前实现已覆盖登录会话、课程权益、会员操作审计、订单异常标记、订单操作审计、课程商品、课程详情内容、测评报告、咨询预约、咨询运营配置/审计、风险事件与支付回调收据持久化，并支撑 `/admin/users` 用户会员聚合、会员权益后台动作、`/admin/orders` 统一订单聚合及受控订单动作，以及 `/admin/transactions` 交易流水聚合、退款申请和异常工单动作。交易操作当前仍是 JSON/内存 Store，下一步补齐 PostgreSQL 版；这个试点用于先验证连接池、SQL 映射、领域 schema 校验和后续数据库 Store 的测试模式。
