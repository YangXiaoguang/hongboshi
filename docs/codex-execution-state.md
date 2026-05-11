# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-12 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `1ec138f Add course product content management`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M2-H 课程商品权限细化与素材管理收口`
- 当前状态：`M2-G 课程商品内容数据库化与批量校验` 已完成，下一轮应拆分课程商品后台权限，并为后续真实素材管理保留稳定入口。
- 本轮完成后下一步：执行 `M2-H 课程商品权限细化与素材管理收口`

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

## 最近完成阶段

M2-G 课程商品内容数据库化与批量校验已交付：

- `server/db/migrations/0007_course_product_contents.sql`：新增 `course_product_contents` 表，以 JSONB 保存适合人群、章节和素材占位。
- `server/modules/catalog/postgresCourseProductContentStore.ts`：新增课程详情内容 PostgreSQL Store，支持读取、保存和测试清空。
- `server/modules/catalog/courseProductContentStore.ts`：新增批量内容质量校验 service，并支持 `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=postgres`。
- `shared/domain/courseProduct.ts`：新增内容质量校验 issue、result、batch result 契约与 `evaluateCourseProductContentQuality`。
- `server/modules/catalog/catalogApi.ts`：新增 `GET /api/catalog/admin/course-products/content-quality`，并在提交审核前执行内容质量阻塞校验。
- `client/src/features/catalog/api/httpCourseProductRepository.ts` 与 `client/src/pages/admin/CourseProducts.tsx`：新增批量内容质量读取，列表和内容弹窗展示校验状态。
- `server/db/runtimeConfig.ts` 与 `server/db/schema.ts`：补齐课程详情内容 Store 配置和数据库契约。
- README、领域契约、数据库说明、课程中心架构、产品路线和后台路线图同步了课程详情内容数据库化与质量校验边界。

M2-G 验收结果：

- `HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE=postgres` 且配置 `DATABASE_URL` 后，课程详情内容可写入 PostgreSQL。
- 未配置 PostgreSQL 时，现有 JSON 内容 Store 继续可用。
- 审核提交前会得到明确的内容质量校验结果；阻塞项会阻止进入审核流，素材未就绪作为提醒展示。
- 后台课程商品列表和内容弹窗能展示内容校验状态。
- 前台详情内容读取仍只允许已审核通过且已上架课程。
- `pnpm check` 和相关测试已通过；完整 CI 需在提交前运行。

## 下一步任务包

### M2-H: 课程商品权限细化与素材管理收口

业务目标：

把课程商品后台从粗粒度 `admin:manage` 推进到更适合长期运营的资源级权限。课程商品查看、编辑、审核、发布和价格操作应能分别授权，为后续订单、财务、风控后台拆权建立样板；同时为素材占位升级为真实资料管理预留稳定入口。

实施范围：

- 在 `shared/domain/user.ts` 中拆分课程商品权限，例如 `catalog:read`、`catalog:edit`、`catalog:review`、`catalog:publish`、`catalog:price`，并保持 `admin` 默认拥有全部能力。
- 调整课程商品后台 API 权限判断：列表/内容校验只需 read；基础信息/详情内容编辑需 edit；审核动作需 review；上下架需 publish；改价需 price。
- 前端 `/admin/courses` 根据权限展示或禁用对应动作，避免只有接口报错。
- 更新后台导航权限，使具备课程商品读取权限但非全局管理员的运营角色也可进入课程商品页面。
- 为素材占位预留真实资料管理的领域字段或后续任务记录，例如文件 ID、下载状态、上传人和合规审核状态，但不在本阶段接入真实对象存储。
- 更新 README、`docs/database-schema.md`、`docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 增加授权、API 权限矩阵和前端动作显隐测试。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add course catalog permissions`。

验收标准：

- 不同课程商品操作使用不同权限判断，测试覆盖无权限、只读、编辑、审核、发布和改价关键路径。
- 现有 `operator` 与 `admin` 仍能完成当前课程商品管理主流程。
- 前端不会向无权限用户展示危险动作，后端仍作为最终权限边界。
- 课程商品权限拆分不影响咨询运营、支付对账和前台课程读取。
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
- 课程商品权限拆分后，是否新增独立的 `catalog_operator` 角色，还是先让现有 `operator` 自动继承课程商品全量权限。
- 真实支付渠道优先接微信支付还是支付宝。建议先把渠道适配接口稳定，再选择一个渠道试点。
