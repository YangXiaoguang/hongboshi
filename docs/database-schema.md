# 数据库 Schema 准备说明

本项目下一阶段目标是把开发期 JSON/内存 Store 逐步替换为 PostgreSQL。当前已经先落下数据库准备层，避免后续在接入 ORM 或迁移工具时重新讨论核心业务表；课程商品、课程详情内容、课程素材资产、课程素材治理批量任务、会员权益操作审计、订单操作审计、交易操作审计、风险复核记录、风险 SOP 模板和风险升级队列均已完成开发期 Store、专用 PostgreSQL 表与 Store。课程详情内容表已补充 `sales_assets`，用于承载课程详情页成交主视觉、成交卖点和运营图文资产；章节 `materialPlaceholders` 当前继续保存在课程详情内容 JSONB 中，可记录绑定素材的 `assetId`、同源受控下载 URL、上传人、上传时间、合规状态和下载开关。课程素材资产已先使用独立 JSON Store 保存资产元数据和合规状态，文件二进制由对象存储 adapter 写入受控文件目录；`0019_course_product_asset_tables.sql` 已补充素材对象表、素材元数据表和素材引用表，`PostgresCourseProductAssetStore` 可映射素材元数据、对象素材事实和素材引用关系，回填 service 可先扫描 JSON Store 与章节素材占位，再由管理员确认后受控写入 PostgreSQL。批量素材治理任务草案可使用 `.hongboshi-data/course-product-asset-governance-batch-tasks.json` 保存，也可显式配置 `HONGBOSHI_COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STORE=postgres` 写入 `0021_course_product_asset_governance_batch_tasks.sql` 中的任务头、候选快照、执行明细和执行审计事件 ID 表；`0022_course_product_asset_governance_batch_task_execution_retry.sql` 补充执行尝试次数、最近失败原因、失败时间和失败重试索引。受控执行会基于最新预案只对 `acknowledge_issue` 写入课程商品 `asset_governance` 审计，不修改素材 Store、不合并引用、不软删和不物理删除对象。任务列表已支持按审批状态、执行状态、创建人、执行人、问题筛选、动作和任务运营时间过滤，执行详情可重新读取摘要、明细和审计事件；PostgreSQL 结构已提供 JSONB/数组字段映射、幂等键、执行锁字段、失败重试字段和组合索引，服务端已具备最小队列接口、执行 worker、原子抢锁、释放锁、并发保护和失败安全重试。对象存储 provider 配置已支持 `local/s3/oss/cos`、bucket、region、公开基础域名、签名密钥和短期读取 URL TTL，当前远端 provider 先作为稳定边界和签名 URL 能力，真实云 SDK 接入时可替换 adapter 而不改变素材表结构。会员权益表已补充来源字段，用于区分会员 checkout 订单、后台人工会员动作和旧的直接开通来源，支撑会员退款后的安全权益回收。课程学习记录已新增独立内存/JSON Store，先保存章节进度、练习记录、完成快照和阶段证明预览准备字段，后续再补专用 PostgreSQL 表。M5-A 交易流水只读台没有新增数据库表，读取现有 `payment_webhook_events`、`orders`、`order_items`、`order_admin_exception_flags` 等表/Store 投影。M5-C 已把交易退款动作产生的异常工单、操作审计和退款渠道受理摘要纳入独立持久化边界。M8-C 已把风险复核处理记录、SOP 模板和升级队列推进到 PostgreSQL 边界，并预留 M9 审计中心可消费的 actor/resource/action/before/after 投影字段。M9-A/M9-B 审计中心仍是只读聚合模型，列表、详情和 CSV 导出直接消费各业务 Store/表中的既有审计事实。M9-C 新增统一审计 Store 方案与 `audit_center_archived_events` 只追加归档表草案；M9-D 新增 Archive Store 和手动归档任务；M9-E 新增归档后台入口和只读校验接口，但当前仍不把业务写动作或审计真相源切换到该表。

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
- `server/db/migrations/0011_transaction_admin_operations.sql`：交易后台异常工单与操作审计表，记录退款申请、异常标记、异常解决及退款渠道受理摘要。
- `server/db/migrations/0012_counseling_schedule_audit_actions.sql`：扩展咨询运营审计动作约束，允许记录排班新增、关闭和恢复。
- `server/db/migrations/0013_counselor_profile_audit_actions.sql`：扩展咨询运营审计动作约束，允许记录咨询师档案和接单状态维护。
- `server/db/migrations/0014_risk_review_sop_persistence.sql`：风险复核处理记录、风险 SOP 模板和升级队列表，包含审计中心预备投影字段与查询索引。
- `server/db/migrations/0015_audit_center_archive.sql`：统一审计中心归档表草案，包含唯一幂等键、source descriptor、summary-only 摘要字段和跨模块查询索引。
- `server/db/migrations/0016_course_membership_source_fields.sql`：课程会员权益来源字段，补充订单来源、人工操作者来源和来源更新时间。
- `server/db/migrations/0017_course_product_merchandising_assets.sql`：课程详情成交图文素材字段，为课程商品详情增加 `sales_assets` JSONB，用于保存主视觉、成交卖点和图文资产。
- `server/db/migrations/0018_course_product_asset_audit_actions.sql`：扩展课程商品审计动作约束，允许记录素材登记 `asset_upload` 和素材合规处理 `asset_review`。
- `server/db/migrations/0019_course_product_asset_tables.sql`：课程素材对象、素材元数据和素材引用关系表草案，预留正式对象存储、合规治理、引用统计和软删除清理能力。
- `server/db/migrations/0020_course_product_asset_governance_audit.sql`：扩展课程商品审计动作约束，允许记录单素材治理动作 `asset_governance`。
- `server/db/migrations/0021_course_product_asset_governance_batch_tasks.sql`：课程素材治理批量任务、候选快照、执行明细和执行审计事件 ID 表，包含幂等键、执行锁和运营查询索引。
- `server/db/migrations/0022_course_product_asset_governance_batch_task_execution_retry.sql`：批量任务执行重试字段，补充执行尝试次数、最近失败原因、失败时间和失败重试查询索引。
- `server/db/migrationRunner.ts`：轻量 SQL migration runner，记录已应用迁移。
- `server/db/runtimeConfig.ts`：运行时持久化 Store 配置解析与校验。
- `server/db/schema.test.ts`：检查迁移中是否包含核心表、关键列和查询索引。

## 初始化命令

1. 配置 `DATABASE_URL`。
2. 按需将 `HONGBOSHI_AUTH_SESSION_STORE`、`HONGBOSHI_COURSE_ACCESS_STORE`、`HONGBOSHI_COURSE_PRODUCT_STORE`、`HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE`、`HONGBOSHI_COURSE_PRODUCT_ASSET_STORE`、`HONGBOSHI_RISK_EVENT_STORE`、`HONGBOSHI_RISK_REVIEW_STORE`、`HONGBOSHI_RISK_SOP_STORE`、`HONGBOSHI_ASSESSMENT_RESULT_STORE`、`HONGBOSHI_COUNSELING_APPOINTMENT_STORE`、`HONGBOSHI_COUNSELING_OPERATION_STORE`、`HONGBOSHI_PAYMENT_WEBHOOK_STORE`、`HONGBOSHI_TRANSACTION_OPERATION_STORE`、`HONGBOSHI_AUDIT_ARCHIVE_STORE` 设置为 `postgres`。其中风险复核记录、风险 SOP/升级队列与审计归档配置 `DATABASE_URL` 后可自动切换 PostgreSQL；风险相关 Store 显式设置为 `file` 时继续使用开发期 JSON 文件，审计归档显式设置为 `memory` 时继续使用内存实现。课程素材资产已支持显式 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=postgres`，但不会因配置 `DATABASE_URL` 自动切换，默认仍保持 `file`，便于先通过 backfill 预检和确认写入把历史素材落入 PostgreSQL；文件对象存储可通过 `HONGBOSHI_COURSE_PRODUCT_ASSET_FILE_ROOT` 指向本地受控目录，对象 provider 可通过 `HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER`、`HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_BUCKET`、`HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_REGION`、`HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PUBLIC_BASE_URL`、`HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET` 和 `HONGBOSHI_COURSE_PRODUCT_ASSET_SIGNED_URL_TTL_SECONDS` 配置。
3. 运行 `pnpm db:doctor` 检查 Store 配置与数据库连接。
4. 运行 `pnpm db:migrate` 应用 `server/db/migrations/*.sql`。

迁移记录保存在 `hongboshi_schema_migrations`，因此 `pnpm db:migrate` 可以重复执行。当前 migration 文件本身也使用 `CREATE TABLE IF NOT EXISTS` 与 `CREATE INDEX IF NOT EXISTS`，方便开发期反复初始化。

服务端启动、`db:doctor` 和 `db:migrate` 都会先加载 `.env.local`，再加载 `.env`；如果同名系统环境变量已经存在，文件值不会覆盖它。

## 设计原则

- 领域契约仍以 `shared/domain` 为准，数据库字段不能绕过 Zod schema 暴露给前端。
- 金额统一以 `*_cents` 整数存储，避免浮点金额误差；API 层再转换为领域模型里的金额数值。
- 测评分数、推荐结果这类强业务结构先用 `JSONB` 存储，保持与报告生成引擎同步；当运营查询变复杂后再拆维度表。
- 咨询时段和预约单分表，`uniq_active_counseling_slot` 防止同一时段被多个有效预约占用；咨询预约通过 `order_id` 关联 `orders`，用于支付确认、超时关闭和后续退款流转。排班运营不新增第二套时段表，基础版通过 `counseling_slots.available` 与活跃预约状态派生可预约、锁定、已预约和已关闭状态。
- 风险事件独立建表，测评报告和咨询预约通过 `risk_event_id` 关联，咨询预约同时保留 `assessment_report_id`，方便咨询师在服务前回看用户授权带入的测评上下文。风险复核处理记录、SOP 模板和升级队列当前不改写风险信号原文，只保存处理摘要、模板版本、操作者、角色、动作、升级状态、前后状态和时间。
- 审计日志只追加，不作为业务状态来源；咨询运营审计单独保留规则快照、排班动作、履约状态、咨询师档案/服务状态动作和操作者角色，会员操作审计保留前后会员状态、订单操作审计保留订单状态和异常标记前后快照、交易操作审计保留交易异常工单和退款渠道受理结果，风险复核记录保留人工处理轨迹、SOP 模板版本和升级摘要。统一审计中心当前只读聚合这些事实，导出和详情只生成查询投影；`audit_center_archived_events` 只作为后续回填和长期检索的归档投影，不反写业务 Store，也不保存咨询说明、测评答案、风险信号或支付敏感原文。归档只读校验只比较当前聚合与归档表的总数、模块分布、最近批次和最近事件摘要；归档只读检索预览只返回 summary-only 摘要行，不把归档表作为主列表来源。
- 交易流水以 `payment_webhook_events` 为准，订单和业务对象状态分别来自订单、课程权益和咨询预约 Store。交易退款动作的操作记录来源是 `TransactionOperationStore`，默认 JSON 文件为 `.hongboshi-data/transaction-operations.json`，也可通过 `HONGBOSHI_TRANSACTION_OPERATION_STORE=postgres` 切换到 PostgreSQL。

## 初始核心表

| 领域           | 表                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 用户与认证     | `users`, `user_roles`, `user_consents`, `auth_sessions`                                                                                                                                                                                                                                                                                                                         |
| 课程权益与订单 | `course_memberships`, `course_access_grants`, `course_products`, `course_product_contents`, `course_product_asset_objects`, `course_product_assets`, `course_product_asset_references`, `orders`, `order_items`, `payments`, `payment_webhook_events`                                                                                                                           |
| 测评           | `assessment_reports`                                                                                                                                                                                                                                                                                                                                                            |
| 咨询           | `counselors`, `counseling_slots`, `counseling_appointments`, `counseling_operation_settings`                                                                                                                                                                                                                                                                                    |
| 风险与审计     | `risk_events`, `risk_admin_review_records`, `risk_sop_templates`, `risk_escalation_queue_items`, `audit_logs`, `course_product_audit_events`, `counseling_operation_audit_events`, `user_membership_audit_events`, `order_admin_exception_flags`, `order_admin_audit_events`, `transaction_admin_work_orders`, `transaction_admin_audit_events`, `audit_center_archived_events` |

## 后续接入顺序

1. 选择 Prisma 或 Drizzle，并让其 migration 与 `0001_core_tables.sql` 对齐。
2. 扩展 PostgreSQL 版 Store：登录会话、课程权益、会员操作审计、订单操作审计、交易操作审计、课程商品、课程商品详情内容、课程素材资产、风险事件、风险复核记录、风险 SOP 模板、风险升级队列、测评结果、咨询预约、咨询运营配置/审计、支付回调收据和审计归档已经完成第一版，且已能支撑用户会员后台、统一订单后台、交易流水聚合、风险复核台、审计中心只读聚合、详情定位、CSV 导出、手动归档、归档只读校验和归档检索预览；课程素材资产当前需显式设置为 PostgreSQL，课程学习记录和咨询师档案 overlay 当前先使用内存/JSON Store，后续可补 PostgreSQL 表。
3. 使用 `DATABASE_URL` 控制 Store 实现，开发期保留内存/JSON fallback。
4. 增加集成测试：登录 -> 购买课程 -> 测评 -> 咨询预约 -> 成长档案聚合。
5. 上线前补齐迁移回滚策略、备份策略、PII 最小化和日志脱敏。

## 数据库 Store 试点

`server/modules/risk/postgresRiskEventStore.ts` 已实现 `risk_events` 表的保存、单条读取、按用户读取和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_RISK_EVENT_STORE=postgres` 时，风险事件会写入 PostgreSQL。

`server/modules/risk/riskReviewStore.ts` 已实现风险复核处理记录的内存 Store、JSON 文件 Store 与 PostgreSQL Store。开发期默认可使用 `.hongboshi-data/risk-reviews.json` 保存复核动作、操作者、角色、前后状态、备注摘要、SOP 模板版本、结果模板和升级摘要；当配置 `DATABASE_URL` 且未显式设置为 `file` 时可自动切换 PostgreSQL，也可通过 `HONGBOSHI_RISK_REVIEW_STORE=postgres` 强制写入 `risk_admin_review_records`。数据库记录包含 `audit_resource_type`、`audit_resource_id`、`before_snapshot` 和 `after_snapshot`，供后续统一审计中心只读聚合。

`server/modules/risk/riskSopStore.ts` 已实现风险 SOP 模板与升级队列的内存 Store、JSON 文件 Store 与 PostgreSQL Store。开发期默认可使用 `.hongboshi-data/risk-sop.json` 保存默认 SOP 模板、模板启停、版本、生效范围、处理结果模板和升级队列；当配置 `DATABASE_URL` 且未显式设置为 `file` 时可自动切换 PostgreSQL，也可通过 `HONGBOSHI_RISK_SOP_STORE=postgres` 写入 `risk_sop_templates` 与 `risk_escalation_queue_items`。PostgreSQL 版会在空表时初始化默认 SOP 模板，并保存模板更新、升级队列创建/关闭的操作者、原因和 before/after 摘要。

`server/modules/assessments/postgresAssessmentResultStore.ts` 已实现 `assessment_reports` 表的保存、最新报告读取、按用户读取和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_ASSESSMENT_RESULT_STORE=postgres` 时，测评报告会写入 PostgreSQL。

`server/modules/counseling/postgresCounselingAppointmentStore.ts` 已实现咨询师 seed、咨询时段 seed、预约保存、全量预约读取、按用户读取、订单关联和风险事件关联读取能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_COUNSELING_APPOINTMENT_STORE=postgres` 时，咨询预约会写入 PostgreSQL。

`server/modules/counseling/postgresCounselingOperationStore.ts` 已实现取消规则配置、规则变更审计、排班动作审计、履约审计读取和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_COUNSELING_OPERATION_STORE=postgres` 时，咨询运营配置与审计会写入 PostgreSQL。

`server/modules/counseling/counselorAdminProfileStore.ts` 已实现咨询师后台档案 overlay 的内存 Store 与 JSON 文件 Store，默认开发期可写入 `.hongboshi-data/counselor-profiles.json`，保存咨询师展示资料、接单开关、资质状态和资质到期时间。当前档案变更和服务状态变更会写入咨询运营审计；后续如果需要资质原件、合同文件或复杂审核流，应新增专用表和文件存储边界。

`server/modules/courses/postgresCourseAccessStore.ts` 已实现课程会员、课程授权、订单、订单明细、会员操作审计、订单异常标记和订单操作审计事件的保存、单用户读取与后台聚合所需的用户权益快照列表能力。开发期默认仍可使用 JSON Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_COURSE_ACCESS_STORE=postgres` 时，课程权益、会员操作审计和订单操作审计会写入 PostgreSQL。

`server/modules/courses/courseLearningRecordStore.ts` 已实现课程学习记录的内存 Store 与 JSON 文件 Store。开发期默认使用 `.hongboshi-data/course-learning-records.json` 保存登录用户的章节进度、练习记录、完成快照和阶段证明预览准备字段；当设置 `HONGBOSHI_COURSE_LEARNING_RECORD_STORE=memory` 时可临时切回内存。当前没有 PostgreSQL 表，后续可新增 `course_learning_records` 和 `course_learning_practice_records` 等专用表，并继续由 API 层校验课程权益后写入。

`server/modules/auth/postgresAuthSessionStore.ts` 已实现用户、角色、协议同意和登录会话的保存、读取、注销与用户目录列表能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_AUTH_SESSION_STORE=postgres` 时，登录会话会写入 PostgreSQL，并只保存 session token 的哈希值。

`server/modules/payments/postgresPaymentWebhookEventStore.ts` 已实现支付回调事件的登记、重复事件读取、处理结果保存和清空能力。默认仍使用内存 Store；当配置 `DATABASE_URL`，且 `HONGBOSHI_PAYMENT_WEBHOOK_STORE=postgres` 时，支付回调收据会写入 PostgreSQL，避免服务重启后重复处理同一支付事件。

`server/modules/transactions/transactionOperationStore.ts` 已实现交易异常工单和交易操作审计的内存 Store 与 JSON 文件 Store。开发期默认使用 `.hongboshi-data/transaction-operations.json` 保存退款申请、异常标记、异常解决等交易后台动作产生的工单和审计事件；当设置 `HONGBOSHI_TRANSACTION_OPERATION_STORE=memory` 时可临时切回内存。

`server/modules/transactions/postgresTransactionOperationStore.ts` 已实现 `transaction_admin_work_orders` 与 `transaction_admin_audit_events` 的保存、读取和清空能力。交易审计可保存 `refund_provider_result`，用于记录人工或模拟退款通道的受理、拒绝或失败摘要；当配置 `DATABASE_URL`，且 `HONGBOSHI_TRANSACTION_OPERATION_STORE=postgres` 时，交易操作会写入 PostgreSQL。

`server/modules/catalog/courseProductStore.ts` 已实现课程商品内存 Store 与 JSON 文件 Store。开发期默认使用 `.hongboshi-data/course-products.json` 保存课程商品状态、价格和审计事件；当设置 `HONGBOSHI_COURSE_PRODUCT_STORE=memory` 时可临时切回内存。

`server/modules/catalog/postgresCourseProductStore.ts` 已实现 `course_products` 与 `course_product_audit_events` 的保存、读取、初始化 seed、基础信息/价格/审核/状态更新承载和审计事件读取能力。当配置 `DATABASE_URL`，且 `HONGBOSHI_COURSE_PRODUCT_STORE=postgres` 时，课程商品会写入 PostgreSQL。

`server/modules/catalog/courseProductContentStore.ts` 已实现课程详情内容的内存 Store、JSON 文件 Store 和批量内容质量校验。开发期默认使用 `.hongboshi-data/course-product-content.json` 保存详情摘要、适合人群、章节和素材占位；素材占位可保存学习页消费的受控下载 URL，但文件事实仍在课程素材资产 Store 与对象存储目录中。当设置 `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=memory` 时可临时切回内存。

`server/modules/catalog/postgresCourseProductContentStore.ts` 已实现 `course_product_contents` 的读取、保存和清空能力。表内以 `JSONB` 保存适合人群、章节、素材占位和 `sales_assets` 成交图文素材；章节素材绑定仍作为内容 JSONB 的一部分保存，后续如需素材报表、批量治理或跨课程复用，再拆出素材专表与关联表。当配置 `DATABASE_URL`，且 `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=postgres` 时，课程详情内容会写入 PostgreSQL。内容更新会写入课程商品审计事件，并把需要复审的商品回退到未提交审核。

`server/modules/catalog/courseProductAssetStore.ts` 已实现课程素材资产的内存 Store、JSON 文件 Store 与显式 PostgreSQL Store。开发期默认使用 `.hongboshi-data/course-product-assets.json` 保存课程详情主图、证明图片、章节资料、练习表、音频和视频等资产元数据、来源 URL 或 `storageKey/objectKey`、`contentHash`、合规状态、上传人和更新时间；当设置 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=memory` 时可临时切回内存，当设置 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=postgres` 且配置 `DATABASE_URL` 时，素材元数据写入 `course_product_assets`，对象素材同步写入 `course_product_asset_objects`。`PostgresCourseProductAssetStore` 同时支持 `course_product_asset_references` 的幂等写入和读取。真实文件上传通过 `CourseProductAssetObjectStorage.putObject` 写入对象并保存 `objectKey/contentHash`，后台下载、公开图片查看和学习页受控下载通过 object storage adapter 读取对象，历史 `storageKey` 保留兼容 fallback，已软删除 `deletedAt` 素材会被受控读取入口拒绝。`server/modules/catalog/courseProductAssetObjectStorage.ts` 已定义正式对象存储 adapter 接口、provider 配置解析、local/s3/oss/cos 远端 provider 占位、HMAC 短期读取 URL 和软删/物理删除语义；当前远端 provider 的字节读写仍复用注入的文件 byte storage，后续接真实云 SDK 时替换 adapter 即可。`server/modules/catalog/courseProductAssetBackfill.ts` 提供 dry-run 预检与受控 commit 回填，读取 JSON/内存素材 Store 与课程详情内容，输出扫描数、可回填素材数、引用数、跳过数和原因；commit 必须由具备 `catalog:review` 权限的管理员通过 `confirmWrite` 和操作原因确认，再写入对象素材、素材元数据和章节引用关系。`server/modules/catalog/courseProductAssetGovernance.ts` 提供只读治理聚合，不新增表：PostgreSQL 模式优先读取 `course_product_asset_references` 计算引用数量，JSON/内存模式从章节 `materialPlaceholders` 推导引用，输出未引用、重复 hash、待审/驳回、下载关闭、软删候选和缺失商品等摘要。`server/modules/catalog/courseProductAssetGovernanceAction.ts` 提供单素材治理动作，写入 `asset_governance` 课程商品审计事件，支持记录处理、标记重复主素材和软删除确认，不做物理对象删除。`server/modules/catalog/courseProductAssetGovernanceHistory.ts` 复用 `course_product_audit_events` 读取治理动作历史，并基于当前治理快照生成批量处理草稿预览；`server/modules/catalog/courseProductAssetGovernanceBatchTask.ts` 保存批量草案、审批状态和执行状态，可为已审批草案只读生成执行预案，也可在确认后受控执行 `acknowledge_issue`，写入批量 `asset_governance` 审计事件、执行明细和摘要，漂移项跳过，重复执行幂等回放。批量任务历史已支持运营筛选和执行详情回放，`PostgresCourseProductAssetGovernanceBatchTaskStore` 已提供等价持久化、子表快照、原子执行锁、失败重试字段和索引；`courseProductAssetGovernanceBatchTaskExecutionQueue.ts` 提供最小队列接口，执行 worker 可被 HTTP runNow 和未来异步消费者复用。`courseProductAssetGovernanceBatchActionPlan.ts` 只读生成批量软删与引用合并预案，输出重复素材主素材建议、引用重定向影响、软删除影响和前台展示/学习下载占用，不修改 Store、不写审计、不执行真实合并。执行仍不修改素材 Store、不合并引用、不软删和不物理删除对象。素材登记、文件上传、合规和治理动作当前均通过课程商品审计事件落库；后续应实现真实云 SDK provider、高风险动作执行开关/二次审批和真实批量处理审批边界。

`server/modules/audit/auditArchiveStore.ts` 已实现统一审计归档 Store 接口和内存实现，`server/modules/audit/postgresAuditArchiveStore.ts` 已实现 `audit_center_archived_events` 的幂等写入、列表、计数、长期检索和测试清理能力，列表可按发生时间或归档时间排序，并支持模块、动作、操作者、批次、资源关键词、发生日期和归档日期筛选。手动归档任务通过 `AuditCenterArchiveEventSchema` 校验后写入，只保存稳定事件 ID、唯一幂等键、来源模块/源事件 ID、来源 Store/表、模块、动作、资源、操作者、角色、原因、summary-only 前后摘要、发生时间、归档时间、结构版本和隐私口径版本，并使用模块、动作、资源、操作者、来源和归档时间索引。归档只读校验通过 Archive Store 读取总数、模块计数、最近批次和最近归档事件摘要，用于解释归档表和当前聚合口径的差异；归档检索预览通过同一 Store 返回摘要行。当前没有对应业务写入切换，审计中心列表/导出/详情仍读取现有聚合逻辑。

当前实现已覆盖登录会话、课程权益、课程学习记录、会员操作审计、订单异常标记、订单操作审计、交易操作审计、课程商品、课程详情内容、课程素材资产、课程素材治理批量任务、测评报告、咨询预约、咨询运营配置/审计、风险事件、风险复核记录、风险 SOP 模板、风险升级队列、审计归档与支付回调收据持久化，并支撑 `/admin/users` 用户会员聚合、会员权益后台动作、`/admin/orders` 统一订单聚合及受控订单动作、`/admin/transactions` 交易流水聚合、退款申请和异常工单动作、`/admin/risk` 风险复核、SOP 模板和升级队列，以及 `/admin/audit` 审计中心只读聚合、详情定位、CSV 导出、手动归档和归档校验控制台。课程学习记录和咨询师档案 overlay 仍先使用内存/JSON Store；课程素材 PostgreSQL Store、对象存储 provider 配置、短期读取 URL、受控回填 API、素材治理只读 API、批量治理任务 PostgreSQL Store、执行锁、安全重试队列边界、队列 job 观测、学习资料运营报表和高风险批量动作只读预案已先落工程准备，为后续学习档案持久化、真实云 SDK 对象存储、高风险动作执行开关、正式证书签发和资质审核流留下边界。这个试点用于先验证连接池、SQL 映射、领域 schema 校验和后续数据库 Store 的测试模式。
