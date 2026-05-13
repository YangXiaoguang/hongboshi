# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-13 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `fa4428d Add transaction admin console`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M5-C 交易操作数据库化与渠道适配接口`
- 当前状态：`M5-B 退款申请与异常工单动作` 已完成，下一轮应把交易操作 Store 接入 PostgreSQL，并为真实支付渠道退款适配预留稳定接口。
- 本轮完成后下一步：执行 `M5-C 交易操作数据库化与渠道适配接口`

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

## 最近完成阶段

M5-B 退款申请与异常工单动作已交付：

- `shared/domain/order.ts`：新增交易后台动作请求、异常工单、操作审计、动作返回契约，并把交易工单纳入流水详情。
- `shared/domain/user.ts`：新增 `transaction:operate` 后台操作权限，`operator/admin` 默认拥有。
- `server/modules/transactions/transactionOperationStore.ts`：新增交易操作 Store，支持内存和 JSON 文件持久化。
- `server/modules/transactions/transactionAdminApi.ts`：新增交易动作 API，支持退款申请、标记异常和解决异常，所有动作写入交易审计。
- `client/src/features/transactions/api/httpTransactionAdminRepository.ts`：新增交易动作 PATCH 调用与 mutation 响应解析。
- `client/src/pages/admin/TransactionManagement.tsx`：交易详情新增操作表单、异常工单卡片和操作审计列表。
- `.env.example` 与 `server/db/runtimeConfig.ts`：登记交易操作 Store 的开发期持久化配置。
- README、数据库说明、领域契约、产品路线、后台路线图和本文件同步了交易操作边界。

M5-B 验收结果：

- 具备 `transaction:operate` 的账号可以对允许的已支付订单发起退款申请，订单进入 `refunding`，并能在详情看到审计记录。
- 处理中、失败、金额不一致、退款流水、未匹配订单或订单状态不合规的退款申请会被服务端拒绝。
- 交易异常工单可标记和解决，记录操作者、原因、前后快照和时间。
- 无权限账号不能调用交易动作；交易读取仍由 `transaction:read` 控制。
- 当前阶段不调用真实渠道退款接口，不把退款直接置为完成，退款完成仍由回调驱动。
- `pnpm check` 与交易/领域相关测试已通过；最终提交前仍需运行 `pnpm run ci`。

## 下一步任务包

### M5-C: 交易操作数据库化与渠道适配接口

业务目标：

把 M5-B 的交易操作工单和审计从开发期 JSON Store 推进到可生产替换的 PostgreSQL Store，并建立退款渠道适配接口。该阶段仍不直接接真实微信/支付宝退款，但要把“后台申请退款 -> 渠道适配器受控受理 -> 等待退款成功回调”的工程边界稳定下来。

实施范围：

- 新增数据库迁移，保存交易异常工单与交易操作审计事件，字段与 `TransactionAdminWorkOrderSchema`、`TransactionAdminAuditEventSchema` 对齐。
- 新增 `PostgresTransactionOperationStore`，实现 `TransactionOperationStore` 接口，并纳入 `HONGBOSHI_TRANSACTION_OPERATION_STORE=postgres` 配置。
- 更新 `server/db/runtimeConfig.ts`、`.env.example`、`docs/database-schema.md` 和 DB schema 测试，明确 `memory/file/postgres` 支持边界。
- 新增退款渠道适配接口，例如 `TransactionRefundProvider`，首版提供 `manual`/`simulated` 实现，只返回受理结果，不制造 `refund.succeeded` 成功态。
- `request_refund` 动作调用适配接口记录受理摘要，失败时不得修改订单状态；成功受理后仍只进入 `refunding`。
- 在交易详情展示退款受理摘要或失败原因，为客服和财务排查留痕。
- 保持 `/admin/transactions`、`/admin/orders`、`/admin/payments` 现有能力可用。
- 更新 README、`docs/database-schema.md`、`docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 增加 PostgreSQL Store、迁移契约、退款适配器、server API 和前端展示关键测试。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add transaction operation persistence`。

验收标准：

- 交易操作工单和审计可以在 PostgreSQL Store 下保存、读取和清空，CI 覆盖迁移契约。
- `HONGBOSHI_TRANSACTION_OPERATION_STORE=file|memory|postgres` 配置行为明确，`db:doctor` 能检查不合法配置。
- 退款申请的渠道受理结果可追溯；渠道受理失败不会把订单推进到退款中。
- 即使渠道受理成功，也不直接完成退款，完成态仍由 `refund.succeeded` 回调或受控模拟事件驱动。
- 现有 M5-B 退款申请、异常工单、操作审计行为不回退。
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
- 真实支付渠道优先接微信支付还是支付宝。建议 M5-C 先完成适配接口和受理摘要，再选择一个渠道试点。
- 交易操作 Store 当前已独立于订单异常标记；下一步需要决定交易操作 PostgreSQL 表是独立迁移，还是后续并入统一审计中心视图。建议先独立落表，M9 再做跨模块审计聚合。
