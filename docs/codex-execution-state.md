# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-16 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：本轮提交后以 Git 历史最新提交为准
- 当前阶段：`UX-A 用户端课程优先信息架构`
- 当前状态：`UX-A 用户端课程优先信息架构` 已完成，首页首屏主 CTA 已切换为课程，课程发现区提前到首屏后，新增 `/courses` 用户端课程列表页，顶部导航“心理课程”具备独立路由与高亮状态；咨询和测评已调整为课程选择的辅助入口。
- 本轮完成后下一步：执行 `UX-B 课程路径与推荐转化体验`

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
- 完成用户端课程优先信息架构：新增 `/courses` 课程列表页，首页首屏改为课程主线，复用课程发现组件并把课程筛选区前置。
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
- `/api/courses` 和课程详情已读取课程商品 Store，只展示 `published + approved` 商品，并同步后台价格与会员权益变化。
- 建立课程商品 PostgreSQL Store、`course_products` 与 `course_product_audit_events` 迁移表，支持 seed 初始化、状态/价格/基础信息和审计事件持久化。
- `/admin/courses` 支持课程商品基础信息编辑，服务端通过共享契约校验标题、封面、分类、类型、讲师、学习人数和操作原因。
- 建立课程商品审核动作契约，支持提交审核、通过审核、驳回审核和撤回审核。
- 建立课程商品审核状态流转 service 与 `/api/catalog/admin/course-products/:productId/review`，审核动作写入 `review_update` 审计事件。
- `/admin/courses` 支持行级审核动作，驳回原因会在列表中直接展示，帮助运营快速定位阻塞项。
- `/api/courses` 和课程详情只展示 `published + approved` 商品，未审核通过的课程即使异常处于上架状态也不会进入前台。
- 建立第一版 `CourseProductDetailContentSchema`，为课程详情摘要、适合人群、章节时长和素材占位管理预留稳定契约。
- 建立课程商品详情内容 Store，支持内存/JSON 文件保存课程摘要、适合人群、章节和素材占位。
- 建立后台课程详情内容读取/更新 API 与 `/admin/courses` 内容编辑弹窗，运营可维护章节和素材占位。
- 课程内容更新会写入 `content_update` 审计事件，并将已审核或已上架商品回退到未提交审核/下架，避免内容绕过复审发布。
- 前台课程详情支持读取服务端内容 Store，读取失败时继续使用原前端详情 fallback。
- 建立 `course_product_contents` PostgreSQL 表与 `PostgresCourseProductContentStore`，课程详情内容可切换到数据库持久化。
- 建立 `CourseProductContentQuality*` 共享契约与 `evaluateCourseProductContentQuality`，覆盖摘要、适合人群、章节、时长、素材占位和素材就绪提醒。
- 建立课程商品内容批量校验 API `/api/catalog/admin/course-products/content-quality`，后台列表展示内容达标/可审/待补状态。
- 课程商品提交审核前会执行内容质量校验，存在阻塞问题时返回冲突提示，避免薄内容进入审核流。
- 建立课程商品资源级权限：`catalog:read`、`catalog:edit`、`catalog:review`、`catalog:publish`、`catalog:price`。
- 新增 `catalog_viewer` 和 `catalog_operator` 角色，课程商品只读与课程运营账号可进入 `/admin/courses`，不再依赖全局 `admin:manage`。
- `/admin/courses` 根据权限显示或隐藏编辑、内容、审核、上下架和改价动作；服务端仍作为最终权限边界。
- 课程详情素材占位已预留资料 ID、资料地址、上传人、上传时间、下载开关和合规审核状态，为后续真实文件管理留出稳定契约。
- 建立 `user:read` 后台读取权限，`operator` 与 `admin` 可读取用户会员后台。
- 建立 `user:membership` 会员操作权限，`operator` 与 `admin` 可执行会员权益后台动作。
- 建立用户会员后台共享契约 `UserAdminListResultSchema` 与 `UserAdminDetailSchema`，统一描述用户列表、会员摘要、课程权益、订单摘要、咨询预约摘要和风险摘要。
- 建立会员后台动作契约 `UserAdminMembershipActionRequestSchema`、会员操作审计事件和会员操作返回契约。
- 建立 `server/modules/users/userAdminApi.ts`，从 auth 用户目录、课程权益、咨询预约和风险事件 Store 聚合用户会员只读数据，并在缺少真实用户目录时提供开发期 fallback 用户。
- 新增 `/api/users/admin/users/:userId/membership`，支持开通、延期、标记到期和调整计划，并写入会员操作审计。
- 新增 `/admin/users` 用户会员后台，支持关键词、角色、会员状态筛选、分页、列表、详情摘要、会员动作入口和审计列表。
- 用户会员详情保持隐私最小化：手机号仅使用脱敏值，不返回咨询说明、测评答案和风险信号原文。
- 课程权益 Store 已保存会员操作审计事件，JSON 文件 Store 和 PostgreSQL Store 均支持读取与追加；新增 `user_membership_audit_events` 数据库迁移表。
- 建立 `order:read` 后台读取权限，`operator` 与 `admin` 可读取统一订单后台。
- 建立订单后台共享契约 `OrderAdminListResultSchema` 与 `OrderAdminDetailSchema`，统一描述订单列表、订单详情、金额、支付回调摘要、关联履约对象和只读状态时间线。
- 建立 `server/modules/orders/orderAdminApi.ts`，从课程权益订单、咨询预约记录、支付回调收据和 auth 用户目录聚合订单后台数据，并在缺少真实订单时提供开发期 fallback 订单。
- 新增 `/admin/orders` 统一订单只读台，支持关键词、订单状态、商品类型、排序、分页、列表和详情摘要。
- 建立 `order:operate` 后台操作权限，`operator` 与 `admin` 可执行订单后台写动作。
- 建立订单后台动作契约、异常标记契约、操作审计契约和订单动作返回契约。
- 课程权益 Store 已保存订单异常标记和订单操作审计事件，JSON 文件 Store 和 PostgreSQL Store 均支持读取与追加；新增 `order_admin_exception_flags` 与 `order_admin_audit_events` 数据库迁移表。
- 新增 `/api/orders/admin/orders/:orderId/actions`，支持关闭待支付订单、标记异常和解除异常，服务端校验权限、原因和订单状态机。
- `/admin/orders` 详情面板已加入订单操作入口、异常标记展示和操作审计列表，动作完成后刷新列表与详情。
- 建立 `transaction:read` 后台读取权限，`operator` 与 `admin` 可读取交易退款后台。
- 建立交易后台共享契约 `TransactionAdminListResultSchema` 与 `TransactionAdminDetailSchema`，统一描述支付/退款流水、回调状态、金额、渠道、用户脱敏摘要、关联订单、业务对象、异常提示和处理时间线。
- 建立 `server/modules/transactions/transactionAdminApi.ts`，从支付回调收据、课程权益订单、咨询预约快照、订单异常标记和 auth 用户目录聚合交易流水，并在缺少真实流水时提供开发期 fallback 数据。
- 新增 `/api/transactions/admin/transactions` 列表与详情接口，支持关键词、流水类型、渠道、处理状态、商品类型、日期范围、排序和分页。
- 新增 `/admin/transactions` 交易退款只读台，支持支付/退款流水列表、筛选、摘要指标、详情检查器、订单/业务对象关联和异常摘要。
- 后台导航已将交易退款从“规划”切换为“可用”，仍保留 `/admin/payments` 支付对账页。
- 建立 `transaction:operate` 后台操作权限，`operator` 与 `admin` 可执行交易后台写动作。
- 建立交易后台动作契约、异常工单契约、交易操作审计契约和交易动作返回契约。
- 新增交易操作 Store，开发期支持内存与 JSON 文件 `.hongboshi-data/transaction-operations.json`，保存交易异常工单和操作审计。
- 新增 `/api/transactions/admin/transactions/:transactionId/actions`，支持 `request_refund`、`mark_exception`、`resolve_exception`，服务端校验权限、原因、流水状态、订单状态和异常状态。
- 退款申请只把允许的已支付订单推进到 `refunding`，不直接写入 `refunded`，退款完成仍由 `refund.succeeded` 回调驱动。
- `/admin/transactions` 详情面板已加入交易操作入口、异常工单状态和交易操作审计列表，动作完成后刷新列表与详情。
- 建立 `transaction_admin_work_orders` 与 `transaction_admin_audit_events` 迁移表，并把交易操作 Store 接入 PostgreSQL。
- `HONGBOSHI_TRANSACTION_OPERATION_STORE` 已支持 `memory/file/postgres`，配置 `DATABASE_URL` 时可自动选择 PostgreSQL。
- 建立退款渠道适配接口 `TransactionRefundProvider`，首版支持人工与模拟受理，只返回受理摘要，不制造退款成功态。
- `request_refund` 会先调用退款渠道适配器；渠道拒绝或失败会写入审计且不修改订单，渠道受理成功后才把订单推进到 `refunding`。
- `/admin/transactions` 操作审计列表已展示退款渠道受理、拒绝或失败摘要，便于客服和财务排查。
- 建立 `finance:read` 后台读取权限，`operator` 与 `admin` 可读取财务管理后台。
- 建立财务后台共享契约 `FinanceAdminOverviewSchema`，统一描述收入、退款、净收款、退款中金额、异常金额、渠道/业务类型分布、财务明细和口径说明。
- 建立 `server/modules/finance/financeAdminApi.ts`，从支付回调收据、课程/会员/咨询订单、交易异常工单和 auth 用户目录聚合财务只读数据。
- 新增 `/api/finance/admin/overview`，支持关键词、渠道、业务类型、日期范围、排序和分页。
- 新增 `/admin/finance` 财务管理只读台，展示收入、退款、净收款、退款中金额、异常金额、渠道净额、业务类型结构、脱敏明细和财务口径。
- 后台导航已将财务管理从“规划”切换为“可用”，仍保留 `/admin/orders`、`/admin/transactions` 和 `/admin/payments` 的既有能力。
- 财务口径已明确：支付成功计入收入，退款成功计入退款，`refunding` 计入待退款，失败/异常流水和开放交易异常工单只进入异常提示，不直接影响净收款。
- 建立财务 CSV 导出契约 `FinanceAdminExportSchema`，包含生成时间、操作者、筛选条件、汇总金额、口径版本、字段定义和明细行。
- 新增 `/api/finance/admin/export`，复用 `finance:read` 权限和财务只读台同一套服务端聚合口径。
- `/admin/finance` 已加入导出 CSV 入口、导出中/失败/成功状态和导出口径提示。
- 财务导出字段已预留账期、手续费、结算批次和发票状态，为后续账期、手续费和结算模块保留兼容空间。
- 建立财务账期与手续费共享契约 `FinanceAdminRuleConfigSchema`、`FinanceAdminChannelFeeRuleSchema` 和 `FinanceAdminSettlementPreviewSchema`，统一描述自然月账期、渠道费率、固定手续费、最低手续费、规则版本、生效时间和结算预览。
- 新增 `finance:manage` 后台写权限，当前仅 `admin` 可维护财务规则；`operator` 和 `admin` 可通过 `finance:read` 查看规则和结算预览。
- 新增 `server/modules/finance/financeRuleStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/finance-rules.json` 保存手续费规则，并为后续 PostgreSQL Store 保留接口。
- 新增 `/api/finance/admin/rules`，支持读取财务规则、维护渠道手续费规则和基于服务端财务明细生成结算预览。
- `/admin/finance` 已加入账期与手续费工作区，展示当前规则版本、渠道费率、固定手续费、最低手续费、自然月账期、预计手续费、预计结算金额、退款中金额和异常未结算金额。
- 结算预览复用财务只读台同一套收入/退款/待退款/异常口径，不修改订单、支付回调或交易状态。
- 建立咨询排班运营共享契约 `CounselingAdminScheduleConsoleSchema` 和 `CounselingAdminScheduleMutationResultSchema`，统一描述咨询师服务状态、未来时段、可预约/锁定/已预约/已关闭状态和排班动作结果。
- 新增 `/api/counseling/admin/schedules`，运营/管理员可读取排班控制台、添加可预约时段、关闭未预约时段和恢复已关闭时段。
- 咨询排班复用 `counselingAppointmentStore` 的 slot 数据，关闭时段表示为 `available=false` 且无活跃预约，避免产生第二套排班真相源。
- 排班服务端动作会校验时间范围、重叠时段、咨询师存在性和时段状态；锁定或已预约时段不能被关闭或覆盖。
- `/admin/counseling` 已加入排班管理区，支持新增时段、查看咨询师服务状态、未来排班和冲突提示，并可关闭/恢复可操作时段。
- 咨询运营审计已扩展 `schedule_slot_added`、`schedule_slot_closed` 和 `schedule_slot_restored`，数据库迁移 `0012_counseling_schedule_audit_actions.sql` 已补充审计动作约束。
- 建立咨询服务记录与履约异常共享契约 `CounselingServiceRecordConsoleSchema`，统一描述服务记录行、异常类型、筛选条件和汇总指标。
- 新增 `/api/counseling/admin/service-records`，运营/管理员可读取由预约、订单、时段、咨询师、风险事件和运营审计聚合的只读履约运营视图。
- 服务记录异常覆盖待支付锁定临近/过期/关闭、临近开始未确认、已取消待退款、退款中和未到访；服务端只输出风险等级摘要，不暴露咨询说明、测评答案或风险信号原文。
- `/admin/counseling` 已加入服务记录与履约异常区，支持按咨询师、预约状态、异常类型和关键词筛选，展示摘要指标和最近异常列表。
- 建立咨询师后台档案共享契约 `CounselorAdminProfileConsoleSchema` 与 `CounselorAdminProfileUpdateRequestSchema`，统一描述展示资料、擅长方向、价格、资质摘要、资质状态、接单开关和服务状态。
- 新增 `server/modules/counseling/counselorAdminProfileStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/counselor-profiles.json` 保存咨询师档案 overlay，并继续复用 seed 咨询师作为初始化来源。
- 新增 `/api/counseling/admin/counselors`，运营/管理员可读取和维护咨询师档案；写动作需要操作原因并写入咨询运营审计。
- 前台 `/api/counseling/availability` 已接入咨询师档案 overlay，暂停接单、关闭接新客、资质待复核或资质过期的咨询师不会进入用户可预约列表。
- `/admin/counseling` 已加入咨询师档案与服务状态区，支持按服务状态和关键词筛选，展示资质状态、排班摘要、服务摘要和接单切换。
- 建立 `risk:read` 后台读取权限与 `risk:review` 风险处理权限，`operator` 与 `admin` 可进入风险复核台并执行处理动作。
- 建立风险复核后台共享契约 `RiskAdminListResultSchema`、`RiskAdminDetailSchema`、`RiskAdminActionRequestSchema`、`RiskAdminReviewRecordSchema` 和 `RiskAdminMutationResultSchema`，统一描述风险队列、隐私最小化详情、SOP 提醒和处理记录。
- 新增 `server/modules/risk/riskReviewStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/risk-reviews.json` 保存风险处理记录。
- 新增 `/api/risk/admin/events` 列表/详情接口和 `/api/risk/admin/events/:riskEventId/actions` 处理动作接口，支持风险等级、状态、来源、关键词筛选和状态机流转。
- 新增 `/admin/risk` 风险复核台，支持风险事件队列、摘要指标、详情检查器、SOP 提醒、处理记录和受控处理入口。
- 风险复核接口与页面只展示复核所需摘要，不输出测评答案原文、咨询前说明全文或风险信号原文。
- 建立 `risk:sop` 后台权限，当前仅 `admin` 可维护风险 SOP 模板，`operator` 可读取 SOP 控制台和执行复核动作。
- 建立风险 SOP 共享契约 `RiskSopTemplateSchema`、`RiskSopResultTemplateSchema`、`RiskSopConsoleSchema`、`RiskEscalationQueueItemSchema` 和 `RiskSopTemplateUpdateRequestSchema`。
- 新增 `server/modules/risk/riskSopStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/risk-sop.json` 保存默认 SOP 模板、模板启停、版本、生效范围、处理结果模板和升级队列。
- 新增 `/api/risk/admin/sop` 和 `/api/risk/admin/sop/templates/:templateId`，支持 SOP 控制台读取、升级队列读取和管理员模板启停/编辑。
- 风险复核详情会返回服务端按风险等级和来源匹配的 SOP 模板，处理记录会保存 SOP 模板 ID、版本、结果模板 ID 和升级队列摘要。
- `/admin/risk` 已加入 SOP 模板区、升级队列、处理结果模板选择、升级优先级/负责人录入和升级状态提示。
- 建立 `risk_admin_review_records`、`risk_sop_templates` 和 `risk_escalation_queue_items` 数据库迁移表，保存风险复核记录、SOP 模板、升级队列和审计中心预备投影字段。
- 新增 `PostgresRiskReviewStore` 与 `PostgresRiskSopStore`，风险处理记录、SOP 模板和升级队列支持内存、JSON 文件与 PostgreSQL 三种实现。
- `HONGBOSHI_RISK_REVIEW_STORE` 与 `HONGBOSHI_RISK_SOP_STORE` 已支持 `memory/file/postgres`，配置 `DATABASE_URL` 时可自动选择 PostgreSQL，显式 `file` 仍保留本地开发模式。
- 风险 SOP 模板更新、升级队列创建/关闭和复核记录写入时会沉淀 actor、roles、resource、action、before/after 摘要和时间，为 M9 审计中心只读聚合预备数据。
- 建立统一审计中心共享契约 `AuditCenterListResultSchema`、`AuditCenterEventSchema` 和 `AuditCenterQuerySchema`，统一描述跨模块审计事件、筛选、分页、摘要和隐私提示。
- 建立 `audit:read` 后台读取权限，`operator` 与 `admin` 可读取审计中心，普通会员和咨询师不可访问。
- 新增 `server/modules/audit/auditAdminApi.ts` 和 `/api/audit/admin/events`，只读聚合课程商品审计、会员操作审计、订单操作审计、交易操作审计、咨询运营审计和风险复核记录。
- 课程权益 Store 与交易操作 Store 已补充全量审计读取方法，PostgreSQL Store 同步支持审计中心聚合所需读取边界。
- 新增 `/admin/audit` 审计中心页面，支持模块、动作、操作者、资源关键词和日期范围筛选，展示资源摘要、操作者、原因和 before/after 摘要。
- 后台导航已将审计中心从“规划”切换为“可用”，后台首页实施路线已同步到 M9-A。
- 建立审计中心导出契约 `AuditCenterExportSchema`，导出剥离分页并包含生成时间、操作者、筛选快照、口径版本、字段定义、模块汇总和 before/after 摘要。
- 新增 `/api/audit/admin/export`，复用 `audit:read` 权限和 M9-A 聚合筛选逻辑，输出 CSV 且保持只读隐私边界。
- 建立审计事件详情契约 `AuditCenterDetailResultSchema` 和 `/api/audit/admin/events/:eventId`，可按归一化事件 ID 定位来源模块、源事件 ID 和资源摘要。
- `/admin/audit` 已加入导出 CSV 入口、导出反馈、事件详情抽屉和来源定位提示。
- Vite 开发中间件已接入 `handleAuditAdminApiRequest`，开发环境 `/api/audit/admin/*` 与生产 Express 保持一致。
- 建立统一审计 Store 架构方案 `docs/audit-store-architecture.md`，明确目标/非目标、数据流、回填策略、索引、隐私白名单、失败恢复和 M9-D 最小切片。
- 建立审计归档事件契约 `AuditCenterArchiveEventSchema`、`AuditCenterSourceDescriptorSchema`、归档结构版本和隐私口径版本，保持现有审计列表、导出和详情契约向前兼容。
- 新增 `audit_center_archived_events` 只追加 PostgreSQL 归档表草案，包含稳定事件 ID、唯一幂等键、source event ID、模块、动作、资源、操作者、角色、原因、summary-only 前后摘要、发生时间、归档时间和口径版本。
- 归档表索引已覆盖模块/时间、动作/时间、资源、操作者/时间、来源和归档时间；当前不把业务写动作或审计真相源切换到该表。
- 建立 `AuditCenterArchiveRequestSchema` 与 `AuditCenterArchiveResultSchema`，统一描述归档筛选、批次 ID、归档人、成功数、跳过数和失败摘要。
- 建立 `audit:archive` 权限，当前仅 `admin` 可触发审计归档；`operator` 仍只能通过 `audit:read` 读取、导出和查看详情。
- 新增 `AuditArchiveStore`、内存实现和 PostgreSQL `PostgresAuditArchiveStore`，支持归档事件幂等写入、列表、计数和测试清理。
- 新增 `POST /api/audit/admin/archive` 手动归档 API，可按模块、动作、操作者、资源关键词和日期窗口归档当前聚合事件，返回批次 ID、成功数、跳过数和失败摘要。
- 归档映射会生成稳定幂等键、source descriptor、结构版本和隐私口径版本，并裁剪 before/after 中的 raw/payload/signature/answer/signal/note 等敏感字段。
- 建立 `AuditCenterArchiveVerificationResultSchema`，统一描述当前聚合总数、归档总数、总差异、模块差异、最近归档批次和最近归档事件摘要。
- 新增 `GET /api/audit/admin/archive/verification`，由 `audit:archive` 权限控制，普通 `operator` 仍只能读取审计中心，不能调用归档校验。
- `/admin/audit` 已加入管理员可见的归档控制台，可展示当前筛选条件、手动触发归档、展示批次 ID、扫描数、成功数、跳过数、失败数和安全失败摘要。
- `/admin/audit` 已加入归档只读校验摘要，显示当前聚合数量、归档数量、差异、模块分布差异和最近归档批次；归档表为空或校验失败不影响主审计列表、导出和详情。
- 前端审计仓储已接入 `archiveEvents` 和 `loadArchiveVerification`，列表、详情和导出 API 保持原有交互不变。

## 最近完成阶段

UX-A 用户端课程优先信息架构已交付：

- `client/src/components/CourseDiscoverySection.tsx`：抽出可复用课程发现区，集中承载课程筛选、排序、搜索、会员内容筛选、课程卡片、收藏状态、课程权益状态和分页。
- `client/src/pages/Home.tsx`：首页首屏改为课程主线，主 CTA 指向 `/courses`，次 CTA 指向测评推荐；课程发现区从页面后半段提前到首屏之后，原“主题课程”入口改为真实跳转课程页。
- `client/src/pages/Courses.tsx`：新增用户端课程列表页，用课程主视觉、课程优先/测评推荐/咨询补充的三段说明和完整课程发现区承接独立课程入口。
- `client/src/components/AppHeader.tsx` 与 `client/src/App.tsx`：导航将“心理课程”提前并指向 `/courses`，新增 `/courses` 路由，课程页导航高亮与详情页路由保持一致。

UX-A 验收结果：

- 首页首屏标题、课程 CTA 和课程发现区已通过浏览器验收，课程发现区进入首屏下沿，用户第一屏即可感知课程主线。
- `/courses` 独立课程页可访问，顶部导航“心理课程”正常高亮，页面展示 12 个课程卡片和完整筛选入口。
- `pnpm run ci` 已通过：类型检查、78 个测试文件 / 367 个测试和生产构建均完成。

M9-E 审计归档后台入口与只读校验已交付：

- `shared/domain/auditCenter.ts`：新增 `AuditCenterArchiveVerificationResultSchema`，归档校验包含当前聚合总数、归档总数、总差异、模块差异、最近批次和最近归档事件摘要。
- `server/modules/audit/auditArchiveStore.ts` 与 `postgresAuditArchiveStore.ts`：归档列表支持按归档时间排序，供最近归档批次和最近归档事件摘要使用。
- `server/modules/audit/auditAdminApi.ts`：新增 `GET /api/audit/admin/archive/verification`，由 `audit:archive` 权限控制；校验失败返回安全错误摘要，审计主列表、导出和详情仍不依赖归档表。
- `client/src/features/audit/api/httpAuditCenterRepository.ts`：新增 `archiveEvents` 与 `loadArchiveVerification`，并修正 API 错误消息提取，归档、校验、列表、详情和导出共用稳定仓储边界。
- `client/src/pages/admin/AuditCenter.tsx`：新增管理员可见的归档控制台，展示当前筛选条件、手动归档按钮、归档中/成功/失败反馈、批次统计、失败摘要和只读校验摘要；`operator` 不显示归档入口。
- README、领域契约、数据库说明、产品工程路线、后台路线图和本文件已同步 M9-E 状态与下一步。
- 更新 `shared/domain/auditCenter.test.ts`、`server/modules/audit/auditAdminApi.test.ts`、`client/src/features/audit/api/httpAuditCenterRepository.test.ts` 和 `client/src/pages/admin/AuditCenter.test.ts`，覆盖校验契约、权限、归档校验摘要、仓储方法、页面归档筛选/权限反馈和主审计列表不受归档表失败影响。

M9-E 验收结果：

- 管理员能在 `/admin/audit` 按当前筛选条件触发手动归档，并看到批次 ID、扫描数、成功数、跳过数、失败数和安全失败摘要。
- `operator` 可继续读取审计中心，但看不到归档操作，也无法调用归档或归档校验接口。
- 归档校验接口能解释归档表和当前聚合口径的数量差异、模块分布差异、最近批次和最近归档事件摘要，不暴露原始 payload。
- 主审计列表、CSV 导出和详情仍读取当前聚合逻辑，不因归档表为空或校验失败而不可用。
- 隐私最小化边界不回退，现有后台模块能力不回退。
- `pnpm run ci` 已通过：类型检查、78 个测试文件 / 367 个测试和生产构建均完成。

## 下一步任务包

### UX-B: 课程路径与推荐转化体验

业务目标：

在 UX-A 已把课程提升为用户端第一主线后，进一步把“课程货架”升级为“课程路径与推荐转化体验”。用户不只是看到很多课程，而是能按当前困扰快速进入适合的学习路径，并在测评、课程详情和咨询辅助之间形成清晰闭环。

实施范围：

- 在首页课程发现区上方或课程页中增加“推荐学习路径”区，围绕情绪稳定、亲密关系、亲子沟通、职场压力和自我成长组织课程组合。
- 提炼路径数据模型，优先在前端 feature 层用稳定类型承载，后续可迁移到后台运营配置。
- 将当前“从真实困扰开始”的推荐课程与 `/courses` 列表联动得更明确：选择困扰后可直接筛选课程、查看路径，并跳转到课程详情。
- 优化课程页首屏下方的转化结构：热门课程、免费入门、会员可学、路径课程之间要有清晰优先级。
- 保持咨询服务为课程学习后的深度支持入口，不抢占课程主线。
- 增加必要的组件测试或模型测试，确保路径推荐、筛选联动和空状态可维护。
- 运行 `pnpm run ci`。
- 更新本文件，提交并推送，建议 commit message：`Prioritize course discovery on user pages` 或下一阶段更具体描述。

验收标准：

- 用户进入首页或 `/courses` 后，可以先按困扰选择学习路径，再进入匹配课程列表或课程详情。
- 课程路径不是静态装饰，至少能影响课程筛选、推荐展示或跳转行为。
- 课程、测评和咨询的优先级清楚：课程为主线，测评用于推荐，咨询用于深度支持。
- 课程发现组件继续复用，避免首页和课程页各自维护一套筛选逻辑。
- 移动端不会出现标题、按钮或课程卡片文字明显溢出。
- CI 通过。

### 后台专项待续：M9-F 审计归档只读检索预览

业务目标：

在 M9-E 已完成的归档控制台和校验接口基础上，给管理员提供“归档表只读检索预览”能力，用于确认归档表里的长期留存数据能被安全检索。当前阶段仍不把主审计列表默认切到归档表，不做自动定时任务，也不允许从归档预览修改或删除审计事件。

实施范围：

- 在 `shared/domain/auditCenter.ts` 补充归档只读检索契约，例如 `AuditCenterArchiveQuerySchema` 与 `AuditCenterArchiveListResultSchema`，支持模块、批次 ID、动作、资源关键词、日期范围和分页。
- 扩展 `AuditArchiveStore` 与 `PostgresAuditArchiveStore` 的只读查询能力，在不暴露 raw payload 的前提下返回 `AuditCenterArchivedEventSummarySchema` 或等价 summary-only 行。
- 新增 `GET /api/audit/admin/archive/events` 或等价只读接口，权限使用 `audit:archive`；普通 `audit:read` 不能访问归档表预览。
- 在 `/admin/audit` 的归档控制台中增加“归档预览”区域，支持按批次或模块查看归档摘要行，与主审计列表视觉上明确区分。
- 前端 repository 增加归档预览 API，保持主列表、导出、详情、归档和校验现有交互不回退。
- 归档预览只读，不提供导出、详情反查、修改或删除动作；如果归档表为空或查询失败，主审计列表仍可用。
- 增加测试覆盖权限、查询筛选、分页、隐私边界、前端仓储、页面预览状态和现有审计列表不受影响。
- 更新 README、`docs/domain-contracts.md`、`docs/database-schema.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add audit archive preview`

验收标准：

- 管理员能在审计中心页面查看归档表摘要预览，并按模块、批次、动作、关键词和日期筛选。
- `operator` 可继续读取审计中心，但看不到归档预览，也无法调用归档预览接口。
- 归档预览只展示 summary-only 归档摘要，不暴露 raw payload、咨询说明、测评答案、风险信号或支付敏感原文。
- 主审计列表、导出、详情、归档和校验仍读取或调用各自既有边界，不因归档预览为空或失败而不可用。
- 归档预览失败时只展示安全错误摘要，不回显原始 payload。
- 隐私最小化边界不回退，不展示测评答案、咨询说明、风险信号原文和支付敏感原文。
- 现有后台模块能力不回退。
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

- 课程详情章节/素材是否要从 JSONB 拆成独立表。建议 M2-G 先用 JSONB 保持可维护速度，等学习记录、资料下载和素材真实文件管理进入后再拆表。
- 真实支付渠道优先接微信支付还是支付宝。退款适配接口和受理摘要已完成，建议 M6 财务账期/手续费基础稳定后选择一个渠道试点。
- 财务账期第一版已按自然月落地；后续真实渠道结算时再决定是否引入支付渠道账单日或渠道结算周期覆盖规则。
- 财务导出第一版已采用 CSV；后续如有财务模板要求，再补 XLSX。
- 交易操作 Store 已独立落表；统一审计中心第一版已先做只读聚合，M9-E 已完成归档后台入口与只读校验，下一步做归档表只读检索预览。
