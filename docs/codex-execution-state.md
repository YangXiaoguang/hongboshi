# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-14 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `ea0be14 Add finance rule foundation`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M7-B 咨询履约异常与服务记录基础`
- 当前状态：`M7-A 咨询排班运营基础` 已完成，咨询运营页已具备未来排班管理、服务状态、冲突保护和排班审计。
- 本轮完成后下一步：执行 `M7-B 咨询履约异常与服务记录基础`

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

## 最近完成阶段

M7-A 咨询排班运营基础已交付：

- `shared/domain/counseling.ts`：新增咨询排班控制台、咨询师服务状态、排班时段状态、排班动作请求和排班动作返回契约。
- `server/modules/counseling/counselingApi.ts`：新增 `/api/counseling/admin/schedules` GET/POST，复用 `admin:manage` 权限和现有咨询预约 slot Store。
- 排班状态由 slot 可用性和活跃预约派生：`available`、`locked`、`scheduled`、`closed`；关闭时段不新增独立表。
- 服务端支持新增可预约时段、关闭未预约时段、恢复已关闭时段，并校验时间范围、重叠冲突、咨询师存在性和危险状态覆盖。
- `CounselingOperationAuditEventSchema` 已扩展排班审计动作，新增数据库迁移 `0012_counseling_schedule_audit_actions.sql`。
- `client/src/features/counseling/api/httpCounselingRepository.ts`：新增排班控制台和排班动作解析/请求方法。
- `client/src/pages/CounselingOperations.tsx`：新增排班管理区，展示未来排班、咨询师服务状态、状态汇总、冲突提示和时段操作入口。
- README、领域契约、数据库说明、产品路线、后台路线图和本文件同步了排班运营边界。

M7-A 验收结果：

- 运营/管理员可以查看咨询师未来排班和服务状态，普通咨询师/会员不可访问后台排班接口。
- 新增、关闭、恢复时段均由服务端校验；锁定或已预约时段不会被直接关闭或覆盖。
- 排班动作会记录操作者、咨询师、时段、动作和原因到咨询运营审计。
- 前台咨询可用时段继续以服务端 slot 状态为准，后台关闭/恢复会影响后续可预约结果。
- 现有咨询预约、咨询师工作台、咨询运营配置、订单和支付回调能力不回退。
- `pnpm run ci` 已通过：类型检查、66 个测试文件 / 293 个测试和生产构建均完成。

## 下一步任务包

### M7-B: 咨询履约异常与服务记录基础

业务目标：

在排班可运营之后，补齐咨询服务交付过程的运营视图。运营需要能快速看到已完成、未到访、退款中、待支付过期释放、临近开始仍未确认等履约异常和服务记录，支持客服、咨询师管理和后续财务/风控联动。

实施范围：

- 在 `shared/domain/counseling.ts` 增加咨询服务记录和履约异常摘要契约，例如服务记录行、异常类型、筛选条件、汇总指标和返回结果。
- 新增 `/api/counseling/admin/service-records` 或同等接口，读取现有预约、订单、时段、咨询师、风险事件和运营审计，形成只读履约运营视图。
- 异常类型至少覆盖：待支付锁定临近/过期、退款中、未到访、已取消待退款、预约开始前临近未确认；不要暴露咨询说明、测评答案或风险信号原文。
- 可选扩展履约动作请求，允许咨询师/运营在标记完成或未到访时提交非敏感运营备注，写入审计而不是临床记录。
- 前端 `/admin/counseling` 增加服务记录/异常区，支持按咨询师、状态、异常类型筛选，展示汇总指标和最近异常列表。
- 不在本阶段做临床咨询记录、会谈笔记、咨询师薪酬结算或复杂质检流程。
- 更新 README、`docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 增加 shared domain、server API、repository 和页面关键测试。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add counseling service records foundation`。

验收标准：

- 运营/管理员可以查看咨询服务记录和履约异常摘要，普通会员不可访问。
- 服务记录来自服务端聚合，不在页面临时拼状态；敏感咨询内容继续最小化展示。
- 异常类型、筛选条件和汇总指标通过共享契约校验。
- 如新增运营备注，备注必须有权限校验、长度限制和审计记录。
- 现有排班、预约、工作台、取消规则、订单和支付回调能力不回退。
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
- 交易操作 Store 已独立落表；后续是否并入统一审计中心视图建议放到 M9 跨模块审计聚合处理。
