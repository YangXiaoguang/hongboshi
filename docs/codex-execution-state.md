# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-05-11 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：`422f70e Add payment reconciliation console`
- 当前阶段：`M1 统一后台框架`
- 当前状态：`M0 连续执行基建` 已完成，下一轮应开始统一后台框架。
- 本轮完成后下一步：执行 `M1 统一后台框架`

## 已完成关键能力

- 项目已提交到 GitHub，并以 `main` 作为持续开发分支。
- 建立连续执行基建：后台路线图、Codex 执行状态和操作协议已进入仓库。
- 完成心理咨询类项目的现代化界面优化。
- 建立产品工程路线文档、领域契约文档、数据库准备文档和课程中心 Feature 架构文档。
- 建立课程中心、课程权益、成长档案、心理测评和咨询预约基础闭环。
- 建立咨询预约订单绑定、支付回调抽象、支付回调签名校验和幂等收据。
- 建立咨询改期、取消、退款、履约动作和咨询师工作台。
- 建立 `/admin/counseling` 咨询运营配置页面、取消规则和履约审计。
- 建立咨询运营配置/审计 Store，并支持 PostgreSQL 切换。
- 建立 `/admin/payments` 支付对账页面，对比支付回调收据、业务订单和咨询预约状态。

## 最近完成阶段

M0 连续执行基建已交付：

- `docs/admin-management-roadmap.md`：运营管理后台完整建设路线图。
- `docs/codex-execution-state.md`：当前执行状态、下一步任务和不变量。
- `docs/codex-operating-protocol.md`：Codex 每轮如何读取状态、执行、验证、提交和推送。
- README 和产品工程路线需要挂载这些文档入口。

M0 验收结果：

- 新对话或上下文压缩后，Codex 可通过文档恢复当前目标。
- 用户只说“进行下一步”时，Codex 能从“下一步任务包”继续。
- 每轮结束前都有明确的 Git 提交和远端推送要求。

## 下一步任务包

### M1: 统一后台框架

业务目标：

建立一个专业、可维护、可升级的运营管理后台骨架，把后续课程商品、用户、订单、交易、财务、风险和审计模块都纳入同一套信息架构。

实施范围：

- 新增 `client/src/pages/admin/AdminLayout.tsx`。
- 新增 `client/src/pages/admin/AdminHome.tsx`。
- 新增后台导航配置，建议放在 `client/src/features/admin/adminNavigation.ts` 或同等位置。
- 改造 `/admin/counseling` 和 `/admin/payments`，让它们在统一后台布局中显示，同时保留原 URL。
- 新增 `/admin` 路由，进入后台首页。
- 修改 `client/src/components/AppHeader.tsx`，运营入口优先指向 `/admin`。
- 复用现有 AuthContext 和 `userCan(..., "admin:manage")` 权限逻辑。
- 增加前端测试，覆盖未登录、权限不足、运营/管理员可访问和导航渲染。
- 更新 README、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和本文件。
- 运行 `pnpm run ci`。
- 提交并推送，建议 commit message：`Add unified admin shell`。

验收标准：

- `/admin` 可作为统一后台入口。
- `/admin/counseling` 和 `/admin/payments` 没有功能回退。
- 后续新增后台模块只需要接入导航配置和路由，不需要重复写后台框架。
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
