# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-11 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：上一阶段 `c401669 Persist course product publishing state`，本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M2-E 课程商品内容审核流与详情管理`
- 当前状态：`M2-D 课程商品 PostgreSQL Store 与基础信息编辑` 已完成，下一轮应补齐课程商品内容审核流和课程详情内容管理。
- 本轮完成后下一步：执行 `M2-E 课程商品内容审核流与详情管理`

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
- `/api/courses` 和课程详情已读取课程商品 Store，只展示 `published` 商品，并同步后台价格与会员权益变化。
- 建立课程商品 PostgreSQL Store、`course_products` 与 `course_product_audit_events` 迁移表，支持 seed 初始化、状态/价格/基础信息和审计事件持久化。
- `/admin/courses` 支持课程商品基础信息编辑，服务端通过共享契约校验标题、封面、分类、类型、讲师、学习人数和操作原因。

## 最近完成阶段

M2-D 课程商品 PostgreSQL Store 与基础信息编辑已交付：

- `shared/domain/courseProduct.ts`：新增 `info_update` 审计动作与 `CourseProductBasicInfoUpdateRequestSchema`，基础信息写动作继续走共享契约。
- `server/db/migrations/0004_course_products.sql` 与 `server/db/schema.ts`：新增课程商品表、课程商品审计表和关键索引契约。
- `server/modules/catalog/postgresCourseProductStore.ts`：新增 `PostgresCourseProductStore`，实现课程商品读写、seed 初始化、审计事件追加和清空。
- `server/modules/catalog/courseProductStore.ts`：默认 Store 支持 `HONGBOSHI_COURSE_PRODUCT_STORE=postgres`，并新增基础信息更新 service。
- `server/modules/catalog/catalogApi.ts`：新增 `PATCH /api/catalog/admin/course-products/:productId/info`，运营/管理员可编辑基础信息，非法入参、无权限和无变化会被拒绝。
- `client/src/features/catalog/api/httpCourseProductRepository.ts` 与 `client/src/pages/admin/CourseProducts.tsx`：新增基础信息 mutation repository 和后台编辑弹窗。
- README、领域契约、数据库说明、产品路线和后台路线图同步了课程商品 PostgreSQL 与基础信息编辑边界。

M2-D 验收结果：

- `HONGBOSHI_COURSE_PRODUCT_STORE=postgres` 且配置 `DATABASE_URL` 后，课程商品、价格、状态和审计事件可写入 PostgreSQL。
- 没有配置 PostgreSQL 时，现有 JSON 文件开发流程保持可用。
- 运营可编辑课程商品基础信息，非法字段、缺少原因、无权限请求和无变化请求会被拒绝。
- 前台课程列表/详情继续只展示已上架商品，并同步最新商品信息。

## 下一步任务包

### M2-E: 课程商品内容审核流与详情管理

业务目标：

把课程商品从“可编辑商品壳”推进到“可审核、可发布的课程内容”。该阶段要把审核状态从展示字段升级为受控状态流，并为课程详情、章节和素材管理预留稳定的数据模型。

实施范围：

- 扩展 `shared/domain/courseProduct.ts`：新增审核动作请求契约，建议覆盖提交审核、通过、驳回和撤回。
- 扩展课程商品审计动作，记录审核状态前后值、原因和操作者。
- 服务端新增审核状态流转 service 与 `PATCH /api/catalog/admin/course-products/:productId/review`，保持 `published` 只能来自 `approved` 商品。
- 后台 `/admin/courses` 增加审核状态动作入口和驳回原因输入，列表中明确展示审核阻塞原因。
- 为课程详情内容管理建立第一版领域契约，建议先覆盖详情摘要、适合人群、章节标题、章节时长和素材占位，不急于做完整富文本 CMS。
- 如果范围过大，优先完成审核状态流，再把详情/章节管理拆到 M2-F。
- 增加 domain、server action、API、前端 repository 和关键 UI 测试。
- 更新 README、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add course product review workflow`。

验收标准：

- 未审核通过的课程商品不能上架。
- 运营/管理员可提交审核、通过审核、驳回审核或撤回审核，并产生审计事件。
- 审核失败原因能在后台列表中被运营看到。
- 前台课程列表/详情不受未发布或未审核内容影响。
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

- 后台权限是否需要从 `admin:manage` 拆为 `admin:read`、`catalog:manage`、`order:manage`、`finance:read`、`risk:review` 等更细粒度权限。建议在 M2 或 M3 前完成第一版拆分。
- 课程详情内容是继续复用前端 `courseDetail` 模型，还是抽到新的 server Store。建议 M2-E 先定义共享契约和审核动作，M2-F 再做完整内容 Store。
- 真实支付渠道优先接微信支付还是支付宝。建议先把渠道适配接口稳定，再选择一个渠道试点。
