# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-12 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `477a6dd Add admin user member console`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M4-A 统一订单管理只读台`
- 当前状态：`M3-B 会员权益操作与审计` 已完成，下一轮应进入统一订单后台的只读聚合、筛选和详情视图。
- 本轮完成后下一步：执行 `M4-A 统一订单管理只读台`

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

## 最近完成阶段

M3-B 会员权益操作与审计已交付：

- `shared/domain/user.ts`：新增 `user:membership` 权限、会员开通/延期/到期标记/计划调整请求契约、会员操作审计事件契约和会员操作返回契约。
- `server/modules/courses/courseAccessStore.ts` 与 PostgreSQL 实现：新增会员操作审计事件读取与追加能力，JSON 文件 Store 会与课程权益状态一起持久化。
- `server/db/migrations/0009_user_membership_audit_events.sql` 与 `server/db/schema.ts`：新增会员操作审计表、用户/操作者时间索引和核心表契约。
- `server/modules/users/userAdminApi.ts`：新增 `/api/users/admin/users/:userId/membership`，服务端校验 `user:membership`、校验原因、计算会员到期时间、保存最新权益并写入审计。
- `client/src/features/users/api/httpAdminUserRepository.ts`：新增会员操作 repository 与响应解析。
- `client/src/pages/admin/UserMembers.tsx`：详情区新增会员动作入口和会员操作审计列表，动作完成后刷新列表与详情。
- README、数据库说明、领域契约、产品路线、后台路线图和本文件同步了用户会员后台从只读聚合升级到受控操作的边界。

M3-B 验收结果：

- 运营/管理员可对用户执行会员开通、延期、标记到期和计划调整。
- 会员动作写入审计事件，包含操作者、角色、原因、前后会员状态和时间。
- 无 `user:membership` 权限的账号不能调用会员操作接口，前端不会展示操作入口。
- 动作完成后 `/admin/users` 列表与详情可同步看到最新会员状态和审计记录。
- `pnpm run ci` 已通过。

## 下一步任务包

### M4-A: 统一订单管理只读台

业务目标：

把课程订单、会员订单和咨询预约订单纳入统一后台视图，让运营可以按用户、订单状态、商品类型和时间范围检索订单，并在详情中看清订单金额、明细、支付状态、履约对象和关联业务状态。M4-A 先做只读聚合，不开放关闭、退款或异常处理动作。

实施范围：

- 在 `shared/domain` 新增订单后台列表、详情、查询、汇总和时间线契约；优先复用已有 `OrderSchema`、`OrderItemSchema`、`OrderStatusSchema` 和商品类型枚举。
- 新增 `order:read` 后台读取权限，先让 `operator/admin` 拥有；前端后台导航新增订单管理入口。
- 新增 `server/modules/orders` 后台聚合 API：从课程权益订单、咨询预约记录、支付回调收据和用户目录中组装统一订单列表与详情。
- `/admin/orders` 新增订单管理只读台，支持关键词、订单状态、商品类型、时间排序、分页、列表和详情。
- 详情中展示订单明细、金额、支付时间、关联用户、关联咨询预约/课程/会员对象、支付回调摘要和只读时间线。
- 不实现关闭待支付、退款、补偿、手工改状态；这些动作留给 M4-B/M5，并必须走服务端状态机和审计。
- 更新 README、`docs/database-schema.md`、`docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 增加 domain、server API、前端 repository/page 关键测试；如需要 Store 扩展，只扩展读取聚合能力。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add admin order console`。

验收标准：

- 运营/管理员可进入 `/admin/orders` 查看统一订单列表和详情。
- 订单列表可区分课程、会员、咨询服务等商品类型，并展示订单状态、金额、用户和创建/支付时间。
- 订单详情可以解释订单与支付、咨询预约或课程/会员权益之间的只读关联。
- 非后台账号不能读取订单后台接口。
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
- 订单后台是否先用现有 `OrderSchema` 聚合，还是提前引入更完整的订单履约/支付/退款投影视图。建议 M4-A 先做只读投影，M4-B 再补状态机动作。
