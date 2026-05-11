# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-11 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：`0daf47b Add unified admin shell`
- 当前阶段：`M2-B 课程商品上下架与价格编辑动作`
- 当前状态：`M2-A 课程商品契约与只读后台列表` 已完成，下一轮应开始课程商品写动作的服务端状态机与审计设计。
- 本轮完成后下一步：执行 `M2-B 课程商品上下架与价格编辑动作`

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

## 最近完成阶段

M2-A 课程商品契约与只读后台列表已交付：

- `shared/domain/courseProduct.ts`：课程商品、商品状态、审核状态、价格、后台列表查询和响应契约。
- `server/modules/catalog/courseProductStore.ts`：从 `shared/data/mockCourses.ts` 映射课程商品快照，并提供筛选、排序、分页和汇总。
- `server/modules/catalog/catalogApi.ts`：新增 `GET /api/catalog/admin/course-products`，运营/管理员可读，非后台账号不可读。
- `client/src/features/catalog/api/httpCourseProductRepository.ts`：前端仓储解析后台课程商品列表响应。
- `client/src/pages/admin/CourseProducts.tsx`：课程商品后台列表，支持搜索、状态、分类、排序和分页。
- `client/src/features/admin/adminNavigation.ts`：课程商品模块已标记为可用，`/admin` 首页状态指向 M2-B。
- 增加共享契约、server store/API、frontend repository 和后台导航测试。

M2-A 验收结果：

- 运营或管理员可从 `/admin` 进入 `/admin/courses`。
- 非运营账号无法读取课程商品后台 API。
- 后台课程商品列表展示标题、分类、讲师、学习人数、价格、状态、审核状态、更新时间和来源。
- 搜索、状态筛选、分类筛选、排序和分页查询走共享契约。
- 首版不提供上下架或编辑动作，写操作留到 M2-B。

## 下一步任务包

### M2-B: 课程商品上下架与价格编辑动作

业务目标：

把只读课程商品升级为可运营商品动作：由服务端统一处理上下架、价格编辑和审核状态变更，并为后续数据库持久化、前台只展示已上架课程、操作审计打基础。

实施范围：

- 扩展 `shared/domain/courseProduct.ts`，定义课程商品动作请求、动作结果、价格更新 payload 和审计事件契约。
- 扩展 `server/modules/catalog` Store 接口，增加 `updateStatus`、`updatePrice`、`appendAuditEvent` 等受控写方法；开发期可先用内存或 JSON Store。
- 新增后台课程商品动作 API，必须校验 `admin:manage` 权限，所有状态变更由 server service 决策。
- 上下架规则建议：草稿可上架，已上架可下架，已归档不可直接上架；价格必须非负，免费课程价格为 0。
- 新增课程商品审计列表或详情区，至少记录操作者、动作、变更前后状态、原因和时间。
- 前端 `/admin/courses` 增加行级动作入口、价格编辑弹层/表单、loading/error/成功反馈。
- 保持只读列表筛选分页能力不回退。
- 增加共享契约、server action、frontend repository/page 和审计测试。
- 更新 README、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add course product admin actions`。

验收标准：

- 运营或管理员可在 `/admin/courses` 对商品执行上架、下架和价格编辑。
- 非运营账号无法调用课程商品写 API。
- 非法状态流转、非法价格和缺少原因的敏感动作会被拒绝。
- 每次商品状态或价格变更都有审计事件。
- 列表刷新后能看到变更后的商品状态和价格。
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
- 课程商品管理是否优先接 PostgreSQL，还是先用 JSON Store 做开发期运营闭环。建议 M2 使用 Store 接口并同时提供内存/JSON，数据库迁移同步准备。
- 真实支付渠道优先接微信支付还是支付宝。建议先把渠道适配接口稳定，再选择一个渠道试点。
