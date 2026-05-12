# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-12 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `92c7505 Add course product content postgres store`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M3-A 用户与会员管理只读台`
- 当前状态：`M2-H 课程商品权限细化与素材管理收口` 已完成，下一轮应进入用户与会员后台的只读视图和服务端聚合契约。
- 本轮完成后下一步：执行 `M3-A 用户与会员管理只读台`

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

## 最近完成阶段

M2-H 课程商品权限细化与素材管理收口已交付：

- `shared/domain/user.ts`：新增 `admin:read`、`catalog:*` 权限以及 `catalog_viewer`、`catalog_operator` 角色。
- `shared/domain/courseProduct.ts`：为素材占位新增 `assetId`、`assetUrl`、上传人、上传时间、`complianceStatus` 和 `downloadEnabled` 字段。
- `server/db/migrations/0008_catalog_permissions.sql`：扩展 `user_roles` 角色约束。
- `server/modules/catalog/catalogApi.ts`：将课程商品列表、内容读取、内容校验、基础信息/详情编辑、审核、上下架和改价分别绑定到资源级权限。
- `client/src/features/admin/adminNavigation.ts` 与 `AppHeader`：允许具备课程商品读取权限但没有全局管理权限的账号进入后台课程商品模块。
- `client/src/pages/admin/CourseProducts.tsx`：根据权限显示/隐藏危险动作，并在内容编辑中保留素材资料元数据入口。
- 新增课程商品前端权限 helper 测试、API 权限矩阵测试、角色权限测试。
- README、领域契约、数据库说明、课程中心架构、产品路线和后台路线图同步了课程商品权限拆分边界。

M2-H 验收结果：

- 不同课程商品操作使用不同权限判断：读取、编辑、审核、发布和改价已经拆分。
- `catalog_viewer` 可读取课程商品和内容校验，但不能写；`catalog_operator`、`operator`、`admin` 可完成课程商品主流程。
- 前端不会向无写权限用户展示危险动作，后端仍作为最终权限边界。
- 课程商品权限拆分不影响咨询运营、支付对账和前台课程读取。
- `pnpm run ci` 已通过。

## 下一步任务包

### M3-A: 用户与会员管理只读台

业务目标：

建立运营可用的用户与会员后台只读入口，把用户账号、角色、会员状态、课程权益、订单摘要、咨询预约摘要和风险提示聚合到一个隐私最小化视图。该阶段不做敏感信息编辑，只先打通查询、权限、聚合契约和页面骨架。

实施范围：

- 在 `shared/domain` 新增用户后台聚合契约，例如用户列表项、用户详情摘要、会员状态、课程权益摘要、订单摘要、咨询预约摘要和风险摘要。
- 建立 `server/modules/users` 或等价模块，先从现有 auth session/user consent、课程权益、订单、咨询预约、风险事件 Store 聚合只读数据；缺失真实用户表时可用开发期 seed/fallback。
- 新增后台 API：用户列表、用户详情，只读查询需要 `admin:manage` 或后续 `user:read` 权限；本阶段可先引入 `user:read` 并让 `operator/admin` 拥有。
- 新增 `/admin/users` 页面，从规划模块切为可用，支持关键词搜索、角色/会员状态筛选、列表和详情抽屉/详情区。
- 保持隐私最小化：手机号只展示 masked；不展示咨询记录全文、测评答案和敏感风险说明原文。
- 更新 README、`docs/database-schema.md`、`docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 增加 domain、server API 和前端 repository/page 关键测试。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add admin user member console`。

验收标准：

- 运营/管理员可进入 `/admin/users` 查看用户列表和隐私最小化详情。
- 用户详情能解释会员、课程权益、订单和咨询预约摘要来源。
- 非后台账号不能读取用户后台接口。
- 页面具备 loading、empty、error 状态，不影响现有后台模块。
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
- 用户后台是否需要独立客服角色，例如 `support_operator`。建议 M3-A 先用 `user:read` 权限，角色命名等真实组织分工确认后再细化。
