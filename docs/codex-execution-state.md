# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-11 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：`30bb0ba Add course product admin list`
- 当前阶段：`M2-C 课程商品持久化与前台发布联动`
- 当前状态：`M2-B 课程商品上下架与价格编辑动作` 已完成，下一轮应让课程商品状态影响前台可见课程，并补齐开发期持久化。
- 本轮完成后下一步：执行 `M2-C 课程商品持久化与前台发布联动`

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

## 最近完成阶段

M2-B 课程商品上下架与价格编辑动作已交付：

- `shared/domain/courseProduct.ts`：新增状态更新请求、价格更新请求、课程商品审计事件和动作结果契约。
- `server/modules/catalog/courseProductStore.ts`：新增开发期可变内存 Store、状态更新服务、价格更新服务和审计事件追加。
- `server/modules/catalog/catalogApi.ts`：新增 `PATCH /api/catalog/admin/course-products/:productId/status` 和 `/price`，运营/管理员可写，非后台账号不可写。
- `client/src/features/catalog/api/httpCourseProductRepository.ts`：新增课程商品状态和价格 mutation repository。
- `client/src/pages/admin/CourseProducts.tsx`：新增行级上下架、改价面板、操作原因、成功/失败反馈和最近审计列表。
- `client/src/pages/admin/AdminHome.tsx`：后台实施路线更新到 M2-C。
- 增加共享契约、server action、frontend repository 和审计测试。

M2-B 验收结果：

- 运营或管理员可在 `/admin/courses` 对课程商品执行上架、下架和价格编辑。
- 非运营账号无法调用课程商品写 API。
- 重复状态流转、非法状态流转、非法价格和缺少原因的动作会被拒绝。
- 每次课程商品状态或价格变更都有审计事件。
- 列表刷新后能看到变更后的商品状态、价格和审计记录。

## 下一步任务包

### M2-C: 课程商品持久化与前台发布联动

业务目标：

让课程商品管理真正影响用户侧课程中心：后台下架后前台不再展示，价格调整后前台课程卡片和详情同步变化；同时让开发期状态和审计记录在服务重启后可恢复，为后续 PostgreSQL 课程商品表做准备。

实施范围：

- 新增课程商品开发期 JSON Store，建议环境变量 `HONGBOSHI_COURSE_PRODUCT_STORE` 与 `HONGBOSHI_COURSE_PRODUCT_FILE`，默认仍可使用内存。
- 将 `/api/courses` 与课程详情读取接到课程商品 Store：只返回 `published` 商品，并映射商品价格、会员权益和上下架状态。
- 保留 seed fallback：首次启动 JSON Store 时从 `shared/data/mockCourses.ts` 初始化课程商品。
- 更新 `/admin/courses` 列表刷新逻辑，确保写动作后前台读取同一份 Store。
- 增加前台课程列表、课程详情、后台 Store 持久化和状态过滤测试。
- 文档补充课程商品 Store 边界、环境变量和后续 PostgreSQL 表设计方向。
- 更新 README、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Persist course product publishing state`。

验收标准：

- 后台下架某个课程商品后，前台课程列表和详情不再展示该课程。
- 后台改价后，前台课程卡片和详情读取更新后的价格。
- 开发期 JSON Store 重启后可恢复课程商品状态、价格和审计事件。
- 课程商品 Store 接口仍能平滑替换为 PostgreSQL 实现。
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
