# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-11 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：`bba227e Add Codex continuity protocol`
- 当前阶段：`M2-A 课程商品契约与只读后台列表`
- 当前状态：`M1 统一后台框架` 已完成，下一轮应开始课程商品管理的第一个稳定切片。
- 本轮完成后下一步：执行 `M2-A 课程商品契约与只读后台列表`

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

## 最近完成阶段

M1 统一后台框架已交付：

- `client/src/pages/admin/AdminLayout.tsx`：统一后台 shell、鉴权面板、桌面侧边栏和移动端导航。
- `client/src/pages/admin/AdminHome.tsx`：后台首页、当前可用模块、工程原则和实施路线。
- `client/src/features/admin/adminNavigation.ts`：后台导航、权限状态和路由激活规则。
- `/admin` 新增为统一运营后台入口。
- `/admin/counseling` 和 `/admin/payments` 已在统一 shell 内展示，不再重复自带页眉。
- `client/src/components/AppHeader.tsx` 的运营入口已合并为“运营管理后台”。
- 增加 `client/src/features/admin/adminNavigation.test.ts`，覆盖未登录、权限不足、运营/管理员可访问和路由激活规则。

M1 验收结果：

- `/admin` 可作为统一后台入口。
- 未登录和权限不足账号由统一后台 shell 显示访问提示。
- 运营或管理员可进入后台首页，并能导航到咨询运营和支付对账。
- 后续新增后台模块只需要接入导航配置和路由。

## 下一步任务包

### M2-A: 课程商品契约与只读后台列表

业务目标：

把课程从展示型 seed 数据推进到可运营商品管理的第一步：先稳定课程商品契约、只读后台列表、筛选查询和前后端数据通路，为后续上下架、价格编辑和审计动作打基础。

实施范围：

- 新增 `shared/domain/courseProduct.ts` 或等价契约文件，定义课程商品、商品状态、审核状态、价格、分类和后台列表查询响应。
- 新增 `server/modules/catalog` 的只读服务与 Store 接口，首版可从现有 `shared/data/mockCourses.ts` 映射出课程商品快照。
- 新增后台课程商品列表 API，必须校验 `admin:manage` 权限。
- 新增 `client/src/features/catalog` 或 `client/src/features/admin/catalog` repository，解析后台课程商品列表响应。
- 新增 `/admin/courses` 页面并在后台导航中从“规划”切换为“可用”。
- 页面支持搜索、状态筛选、分类筛选和基础分页展示；首版不做写操作。
- 增加共享契约、server API、frontend repository 和后台导航测试。
- 更新 README、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add course product admin list`。

验收标准：

- 运营或管理员可从 `/admin` 进入 `/admin/courses`。
- 非运营账号无法读取课程商品后台 API。
- 后台课程商品列表能展示课程标题、分类、价格、状态、更新时间和来源。
- 搜索、状态筛选、分类筛选和分页查询走共享契约。
- 首版不提供上下架或编辑动作，相关写操作留到 M2-B。
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
