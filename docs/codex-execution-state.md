# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-12 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `40a7db0 Add admin order console`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M5-A 交易与退款管理只读台`
- 当前状态：`M4-B 订单状态动作与审计` 已完成，下一轮应进入交易流水、退款流水和支付异常聚合的只读管理台。
- 本轮完成后下一步：执行 `M5-A 交易与退款管理只读台`

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

## 最近完成阶段

M4-B 订单状态动作与审计已交付：

- `shared/domain/order.ts`：新增订单后台动作、异常标记、操作审计快照和动作返回契约。
- `shared/domain/user.ts`：新增 `order:operate` 后台操作权限，`operator/admin` 默认拥有。
- `server/modules/courses/courseAccessStore.ts` 与 `server/modules/courses/postgresCourseAccessStore.ts`：新增订单异常标记和订单操作审计存储，JSON 文件 Store 与 PostgreSQL Store 均可持久化。
- `server/db/migrations/0010_order_admin_operations.sql`：新增 `order_admin_exception_flags` 与 `order_admin_audit_events`。
- `server/modules/orders/orderAdminApi.ts`：新增 `/api/orders/admin/orders/:orderId/actions`，支持关闭待支付、标记异常和解除异常，复用订单状态机并返回最新详情。
- `client/src/features/orders/api/httpAdminOrderRepository.ts`：新增订单动作提交和响应解析。
- `client/src/pages/admin/OrderManagement.tsx`：详情面板新增订单动作入口、异常标记展示和操作审计列表。
- README、数据库说明、领域契约、产品路线、后台路线图和本文件同步了订单操作边界。

M4-B 验收结果：

- 具备订单操作权限的账号可以关闭待支付订单，并看到最新 `closed` 状态。
- 订单异常标记和解除异常可追溯，包含操作者、原因、前后状态和时间。
- 无权限账号不能调用订单动作；订单读取仍由 `order:read` 控制。
- 动作完成后 `/admin/orders` 列表与详情同步刷新。
- `pnpm run ci` 已通过。

## 下一步任务包

### M5-A: 交易与退款管理只读台

业务目标：

在订单后台之后，建立面向交易运营的只读管理台，统一查看支付流水、退款流水、回调收据、关联订单和业务对象状态，为后续退款申请、支付异常处理工单和真实渠道适配打基础。本阶段不发起真实退款，也不接微信/支付宝商户配置。

实施范围：

- 在 `shared/domain` 新增交易后台列表、详情、筛选、流水摘要、退款摘要和关联订单摘要契约。
- 新增 `transaction:read` 交易读取权限，先让 `operator/admin` 拥有；后续退款动作再拆 `transaction:refund` 或更细权限。
- 新增 `server/modules/transactions` 或等价模块，聚合支付回调收据、课程权益订单、咨询预约快照和订单异常标记。
- 新增后台 API：交易/退款流水列表与详情，支持关键词、渠道、流水类型、处理状态、日期范围和分页。
- 新增 `/admin/transactions` 页面或将交易管理从规划切换为可用，展示流水列表、详情、订单/业务对象关联和异常摘要。
- 保持 `/admin/payments` 支付对账页面可用；若新页面复用其数据结构，必须避免破坏现有对账视图。
- 不发起真实退款、不修改订单退款状态、不接真实支付渠道密钥；这些动作进入 M5-B/M5-C。
- 更新 README、`docs/database-schema.md`、`docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 增加 domain、server API、前端 repository/page 关键测试。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add transaction admin console`。

验收标准：

- 运营/管理员可以查看支付成功、退款成功、处理中和失败回调收据的统一流水列表。
- 交易详情可以解释流水关联的订单、商品类型、咨询预约或课程/会员权益。
- 权限不足账号不能读取交易后台接口或进入页面。
- 当前阶段只读，不提供退款申请或渠道补偿动作。
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
- 真实支付渠道优先接微信支付还是支付宝。建议先把渠道适配接口稳定，再选择一个渠道试点。
- 订单异常当前以审计事件和异常标记摘要表达，不改动现有 `OrderStatusSchema`；进入 M5 后需要评估支付异常工单、退款异常和财务异常是否统一到更大的异常处理模型。
