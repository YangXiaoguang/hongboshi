# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-16 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：本轮提交后以 Git 历史最新提交为准
- 当前阶段：`TRX-A/B 课程商品详情与购买确认体验`
- 当前状态：`TRX-A/B 课程商品详情与购买确认体验` 已完成，课程详情页已升级为电商式商品详情，支持 sticky 交易面板、交付/保障说明、购买前目录预览、移动端底部购买条和购买确认抽屉。
- 本轮完成后下一步：执行 `TRX-C 课程订单状态与支付结果服务端化`

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
- 完成课程路径与推荐转化体验：新增稳定课程路径模型、路径展示组件和快速开始区，路径选择可驱动课程列表筛选。
- 完成课程详情转化与学习计划入口：课程详情展示所属学习路径、权益 CTA、加入学习计划、路径下一课和同主题补充推荐。
- 完成成长空间学习计划承接：`/me/courses` 首屏展示本次继续和下一步建议，并将进行中、收藏待学、已完成课程分区管理。
- 完成课程学习页与章节进度承接：新增 `/courses/:courseId/learn`，可从详情页和成长空间进入章节学习工作台，并复用本地 engagement 记录章节完成状态。
- 完成课程资料与练习记录闭环：学习页按章节展示讲义摘要、练习记录、保存草稿、练习完成状态和课程练习摘要，并通过独立本地 repository 为后续服务端同步预留字段。
- 完成课程完成反馈与阶段证书准备：学习页完成态展示课程总结、练习沉淀、下一步建议和阶段证明预览，证书字段预留 `source`、`syncStatus`、`certificateId` 和 `issuedAt`。
- 完成成长空间学习档案与阶段证明承接：`/me/courses` 已把已完成课程沉淀为学习档案，展示完成时间、章节/练习沉淀、阶段证明预览、复习反馈入口、待补练习提醒和同路径下一步。
- 完成课程商品详情与购买确认体验：`/courses/:courseId` 已补齐商品详情、交易面板、购买确认抽屉、支付方式选择、购买须知校验、支付成功反馈和移动端购买条。
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

TRX-A/B 课程商品详情与购买确认体验已交付：

- `client/src/features/courses/model/courseCheckout.ts`：新增课程结算摘要模型，统一计算单课购买、会员购买、原价、优惠抵扣、实付金额、交付内容、保障说明、支付方式和开发期支付提示。
- `client/src/features/courses/model/courseCheckout.test.ts`：覆盖课程优惠金额、优惠不倒挂、会员结算摘要和金额格式化。
- `client/src/pages/CourseDetail.tsx`：课程详情页升级为课程商品页，首屏保留课程视觉和核心信息，右侧交易区改为 sticky 商品面板，展示价格、优惠、权益状态、会员/单买对比、学习状态、交付承诺和主操作。
- `client/src/pages/CourseDetail.tsx`：课程目录从购买前“标记完成”改为商品详情预览，只展示章节结构和解锁状态，避免未购买用户误以为可直接学习或改写进度。
- `client/src/pages/CourseDetail.tsx`：新增购买确认抽屉，包含订单摘要、商品金额、原价参考、优惠抵扣、实付金额、交付内容、支付方式、购买须知确认和支付成功权益交付反馈。
- `client/src/pages/CourseDetail.tsx`：移动端新增底部购买条，用户在手机首屏即可看到价格和购买/学习主动作。
- `client/src/features/courses/index.ts`：导出课程结算模型和类型，保持课程 feature 边界统一。

TRX-A/B 验收结果：

- `/courses/1` 会员课程可看到商品交易面板、开通会员/单独购买对比、交付承诺和权益保障说明。
- `/courses/5` 单买课程可打开购买确认抽屉，抽屉展示课程商品、优惠、实付金额、交付内容和支付方式。
- 购买须知未确认时不会进入成功态；确认购买须知后可进入“权益已准备好 / 购买已确认”成功反馈，并展示“开始学习”和“查看成长空间”入口。
- 课程目录购买前只展示“购买后学习”，不再出现“标记完成”入口。
- 浏览器检查桌面宽度无横向溢出；移动宽度 390px 下课程详情、底部购买条和购买确认抽屉无横向溢出；控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、87 个测试文件 / 402 个测试和生产构建均完成。

UX-H 成长空间学习档案与阶段证明承接已交付：

- `client/src/features/courses/model/courseLearningArchive.ts`：新增学习档案派生模型，复用学习计划、课程详情、学习会话、练习摘要和 UX-G `createCourseCompletionFeedback`，统一输出已完成课程档案、阶段证明预览、待补练习和同路径下一步。
- `client/src/features/courses/model/courseLearningArchive.ts`：对已完成但章节 ID 来自旧课程内容的本地记录做兼容归一，避免课程内容迭代后用户已完成记录从档案中消失。
- `client/src/pages/MyCourses.tsx`：成长空间的已完成课程区升级为“学习档案”，展示完成时间、章节进度、练习沉淀、证明状态、阶段证明预览卡、待补练习提示、查看完成反馈和继续路径入口。
- `client/src/pages/MyCourses.tsx`：首屏计划概览和指标区新增阶段证明摘要，并在有待补练习时给出轻量提醒，不抢占“本次继续”主线。
- `client/src/features/courses/index.ts`：导出学习档案模型和类型，保持课程 feature 边界统一。
- `client/src/features/courses/model/courseLearningArchive.test.ts`：覆盖已完成过滤、证书预览状态、完成时间排序、旧章节 ID 兼容和空状态稳定性。

UX-H 验收结果：

- `/me/courses` 能看到已完成课程的学习档案卡，包含“1 门完成”“1 个预览”“待补练习”、阶段证明预览和完成反馈入口。
- 未完成课程不会进入学习档案，也不会展示阶段证明预览口径。
- 已完成但练习未补齐的课程会展示待补练习提醒，练习完整状态仍由课程练习摘要统一判断。
- 从成长空间点击“查看完成反馈”可进入 `/courses/3/learn` 并看到 UX-G 的“课程完成反馈”。
- 浏览器检查桌面宽度无横向溢出，移动宽度 390px 下学习档案区、阶段证明卡和按钮无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、86 个测试文件 / 398 个测试和生产构建均完成。

UX-G 课程完成反馈与阶段证书准备已交付：

- `client/src/features/courses/model/courseCompletionFeedback.ts`：新增课程完成反馈派生模型，基于课程、学习会话、练习摘要、学习路径和下一课推荐输出完成标题、指标、练习沉淀、下一步建议和阶段证明预览。
- `client/src/features/courses/model/courseCompletionFeedback.ts`：阶段证明预览已包含课程名、学习路径、完成时间、章节数、练习完成数、`source`、`syncStatus`、`issueStatus`、`certificateId` 和 `issuedAt` 等后续服务端签发预留字段；第一版保持 `issueStatus=preview`，不生成真实证书编号。
- `client/src/pages/CourseLearning.tsx`：课程完成态区域升级为完整完成反馈面板，展示章节完成、练习完成、学习路径、练习沉淀、同路径下一课和阶段证明预览，并提供学习下一门、查看成长空间、复习本课程入口。
- `client/src/features/courses/index.ts`：导出课程完成反馈模型和类型，保持课程 feature 边界统一。
- `client/src/features/courses/model/courseCompletionFeedback.test.ts`：覆盖未完成不生成反馈、证书预览字段、下一课推荐、无下一课成长空间 fallback、无练习记录空状态和练习完整状态。

UX-G 验收结果：

- 完成 `/courses/3/learn` 后，页面展示“课程完成反馈”、练习沉淀摘要、下一步建议和“阶段证明预览”。
- 阶段证明预览展示待正式签发状态和“正式签发后生成”证书编号占位，没有声称已经正式签发真实证书。
- 完成前页面不提前出现课程完成反馈；`/courses/2/learn` 未解锁课程仍没有资料练习、完成反馈或证书预览入口。
- 浏览器检查桌面宽度无横向溢出，移动宽度 390px 下完成反馈区、证书预览和按钮无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、85 个测试文件 / 394 个测试和生产构建均完成。

UX-F 课程资料与练习记录闭环已交付：

- `client/src/features/courses/model/coursePractice.ts`：新增课程练习记录模型，按 `courseId + chapterId` 管理草稿、练习完成状态、来源、同步状态和更新时间，并提供资料摘要与课程练习统计派生方法。
- `client/src/features/courses/api/localCoursePracticeRepository.ts` 与 `client/src/features/courses/hooks/useCoursePractice.ts`：新增本地持久化 repository 和学习页 Hook，兼容空数据、历史脏数据和后续服务端同步字段。
- `client/src/pages/CourseLearning.tsx`：学习页右侧“资料与练习”升级为当前章节工作台，支持查看章节讲义、填写练习记录、保存草稿、标记练习完成、章节切换读取对应记录和课程完成练习摘要。
- `client/src/features/courses/index.ts`：导出课程练习模型、repository 和 Hook，保持课程 feature 边界统一。
- `client/src/features/courses/model/coursePractice.test.ts` 与 `client/src/features/courses/api/localCoursePracticeRepository.test.ts`：覆盖草稿保存、练习完成独立状态、课程摘要统计、历史数据兼容、资料摘要派生和本地持久化 fallback。

UX-F 验收结果：

- `/courses/3/learn` 可为当前章节保存练习记录，刷新后仍能读取本地草稿。
- 切换到其他章节后，资料与练习面板展示对应章节内容，不串章。
- 练习完成状态与章节完成状态独立，课程完成区可展示练习完成摘要。
- `/courses/2/learn` 未解锁课程仍展示权益边界提示，没有资料与练习输入区或保存入口。
- 浏览器检查桌面无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、84 个测试文件 / 389 个测试和生产构建均完成。

UX-E 课程学习页与章节进度承接已交付：

- `client/src/features/courses/model/courseLearningSession.ts`：新增课程学习会话派生模型，统一计算当前章节、有效完成章节、总进度、已完成状态和章节列表状态。
- `client/src/features/courses/model/courseLearningSession.test.ts`：覆盖当前章节选择、完成进度、完成态复习稳定性、历史脏章节 ID 过滤和未解锁保护。
- `client/src/pages/CourseLearning.tsx`：新增 `/courses/:courseId/learn` 学习页，首屏展示课程标题、所属路径、当前章节、总进度和章节完成 CTA；章节列表可复用 `completeChapter` 标记完成；右侧展示资料/练习占位、测评/咨询支持和同路径下一课。
- `client/src/App.tsx` 与 `client/src/features/courses/index.ts`：接入学习页路由并导出学习会话模型，保持课程 feature 边界统一。
- `client/src/pages/CourseDetail.tsx` 与 `client/src/pages/MyCourses.tsx`：详情页和成长空间中的可学习主 CTA 已进入学习页；未解锁课程仍回到详情页处理购买或会员权益。

UX-E 验收结果：

- `/courses/3/learn` 可访问，首屏能看到当前章节、总进度、章节完成动作、资料与练习、支持路径和同路径下一课。
- 点击“标记本章完成”后，章节进度从 0 推进到 33%，当前章节自动切换到下一章；成长空间和详情页读取同一份本地进度。
- `/courses/2/learn` 未解锁课程展示“课程尚未解锁”，没有章节完成入口，不能绕过购买或会员权限。
- 从课程详情 `/courses/3` 点击“继续学习”会进入 `/courses/3/learn`。
- 从成长空间 `/me/courses` 首屏点击“继续学习”会进入 `/courses/3/learn`。
- 浏览器检查桌面无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、82 个测试文件 / 382 个测试和生产构建均完成。

UX-D 成长空间学习计划承接已交付：

- `client/src/features/courses/model/courseLearningPlan.ts`：新增学习计划工作区派生模型，按进行中、收藏待学、已完成分组，并基于课程路径计算下一门建议课。
- `client/src/features/courses/model/courseLearningPlan.test.ts`：覆盖学习计划分组、同路径下一课跳过已在计划中的课程、空状态稳定性。
- `client/src/pages/MyCourses.tsx`：成长空间首屏改为学习计划主线，展示本次继续、下一步建议、计划概览；课程列表拆分为进行中、收藏待学、已完成，收藏中的可学课程可直接加入学习计划。
- `client/src/pages/MyCourses.tsx`：测评、咨询、订单和会员权益保留为辅助侧栏，不抢占课程学习主线。
- `client/src/features/courses/index.ts`：导出学习计划模型，保持课程 feature 边界统一。

UX-D 验收结果：

- 未登录访问 `/me/courses` 正常展示登录提示和课程中心入口。
- 登录后 `/me/courses` 首屏能看到“本次继续”“下一步建议”和计划概览。
- 免费收藏课程可从“收藏待学”点击“加入学习计划”，随后转入“进行中”并更新首屏继续学习目标。
- 进行中、收藏待学、已完成课程已分区展示，测评和咨询作为辅助区保留。
- 浏览器检查无横向溢出，控制台无错误。
- `pnpm run ci` 已通过：类型检查、81 个测试文件 / 378 个测试和生产构建均完成。

UX-C 课程详情转化与学习计划入口已交付：

- `client/src/features/courses/model/coursePath.ts`：新增按课程识别所属学习路径和获取同路径下一步课程的模型方法，复用 UX-B 的稳定路径数据。
- `client/src/features/courses/model/courseDetailConversion.ts`：新增课程详情主 CTA 文案模型，区分免费/已购/会员已覆盖/需购买/需会员等权益状态。
- `client/src/features/courses/hooks/useCourseDetail.ts`：详情 Hook 返回完整课程列表，支持详情页在 API 与 fallback 模式下稳定计算同路径推荐。
- `client/src/pages/CourseDetail.tsx`：课程详情首屏加入所属路径入口，权益卡片改为“加入学习计划/继续学习/购买/会员”清晰 CTA；新增学习路径说明、下一门建议课程、继续这条路径和同主题补充推荐，咨询陪伴入口跳转 `/consulting`。
- `client/src/features/courses/model/coursePath.test.ts` 与 `courseDetailConversion.test.ts`：覆盖路径识别、同路径下一课和权益 CTA 文案。

UX-C 验收结果：

- `/courses/1` 详情页可看到所属路径、路径位置、下一门建议课程和双层推荐，浏览器检查无横向溢出。
- `/courses/3` 免费课点击“加入学习计划”后切换为“继续学习”，复用现有课程 engagement 状态。
- “需要咨询师陪伴”可从课程详情跳转到 `/consulting`，不抢占课程主 CTA。
- 浏览器控制台无错误。
- `pnpm run ci` 已通过：类型检查、80 个测试文件 / 375 个测试和生产构建均完成。

UX-B 课程路径与推荐转化体验已交付：

- `client/src/features/courses/model/coursePath.ts`：新增稳定课程路径模型，覆盖情绪稳定、关系修复、亲子连接、职场韧性和自我成长，并提供路径课程挑选逻辑。
- `client/src/components/CoursePathSection.tsx`：新增课程路径展示组件，用户可切换路径、查看路径重点课程、进入课程详情或先做测评确认状态。
- `client/src/components/CourseStarterLanes.tsx`：新增课程页快速开始区，按热门课程、免费入门和会员可学组织课程入口。
- `client/src/pages/Home.tsx`：移除重复的旧困扰推荐段落，改为课程路径驱动课程发现区；选择路径会同步分类、排序、清空关键词并更新课程发现标题。
- `client/src/pages/Courses.tsx`：课程列表页接入课程路径、快速开始区和路径匹配课程标题，课程、测评和咨询的转化优先级更明确。
- `client/src/features/courses/model/coursePath.test.ts`：覆盖路径 ID 稳定性、未知路径 fallback 和课程挑选顺序。

UX-B 验收结果：

- 首页和 `/courses` 都可先选择课程路径，再进入匹配课程列表或课程详情。
- 点击“关系修复”路径后，课程发现区标题切换为“关系修复课程，先从沟通和边界开始”，并激活“婚姻关系”筛选。
- `/courses` 页面展示路径区、快速开始区和完整课程发现区；浏览器控制台无错误。
- `pnpm run ci` 已通过：类型检查、79 个测试文件 / 370 个测试和生产构建均完成。

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

### TRX-C: 课程订单状态与支付结果服务端化

业务目标：

在 TRX-A/B 已补齐课程商品详情和购买确认体验后，把当前“确认后直接 paid 并解锁”的开发期快捷逻辑升级为更接近真实交易的订单状态流。第一版仍可使用模拟支付渠道，但必须让服务端区分创建订单、待支付、支付成功、支付失败/取消和权益交付，不再由前端确认按钮直接跳过交易过程。

实施范围：

- 在 `shared/domain` 补充用户端课程订单/支付流程契约，明确 `created`、`pending_payment`、`paid`、`closed` 等状态与支付渠道、订单金额、优惠金额、支付超时和权益交付摘要。
- 拆分课程购买 API：创建课程订单、发起/模拟支付、读取订单详情、取消待支付订单；支付成功后才授予课程或会员权益。
- 服务端写动作必须校验登录态、课程存在性、课程上下架/审核状态、购买权限和订单状态机；重复支付请求保持幂等。
- 课程权益 Store 继续作为权益真相源，但权益授予只能由支付成功或模拟支付成功服务端动作触发，不再由前端购买按钮直接 grant。
- 前端购买确认抽屉接入订单状态：点击确认后进入待支付/支付中，成功后展示权益交付，失败或取消时保留继续支付入口。
- 成长空间或用户订单入口展示课程交易记录的基本状态，方便用户确认购买后在哪里继续。
- 增加共享契约、服务端 API、Store、前端 repository、详情页抽屉和成长空间订单摘要测试，覆盖待支付、支付成功、重复支付、取消、未登录、未上架/无权限和支付失败 fallback。
- 运行 `pnpm run ci`。
- 更新本文件，提交并推送，建议 commit message：`Add course checkout order flow`

验收标准：

- 点击课程购买确认后，服务端先创建订单或进入待支付状态，前端能展示订单号、待支付金额和支付方式。
- 只有支付成功或模拟支付成功后，课程权益/会员权益才会生效，并可进入学习页。
- 取消或失败的订单不会授予课程权益，用户能看到继续支付或重新下单入口。
- 重复点击确认支付不会产生重复权益或重复已支付订单。
- 未登录用户会进入登录提示，不会创建匿名付费订单。
- `/admin/orders`、`/admin/transactions` 或用户成长空间能读取到课程交易记录，不破坏现有后台订单/财务口径。
- CI 通过。

### 用户端待续：UX-I 课程学习记录服务端同步与阶段证明签发准备

业务目标：

在 UX-E 到 UX-H 已形成本地学习进度、练习记录、完成反馈和学习档案后，建立服务端学习记录同步边界，让登录用户的学习档案具备跨设备、可审计、可升级的基础。第一版以“服务端记录与阶段证明签发准备”为目标，不做公开分享、不生成正式证书编号、不替代后续真实签发审核流程。

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
- 交易操作 Store 已独立落表；统一审计中心第一版已先做只读聚合，M9-E 已完成归档后台入口与只读校验，后台专项可继续 M9-F 归档表只读检索预览；当前课程交易连续执行指针为 TRX-C 课程订单状态与支付结果服务端化，UX-I 学习记录服务端同步作为用户端待续任务保留。
