# Codex 连续执行协议

## 用途

本协议用于保证红博士项目可以长期、连续、可追踪地由 Codex 迭代。它解决三个问题：

- 不遗忘：关键记忆写进仓库，而不是只留在对话里。
- 可继续：用户说“进行下一步”时，Codex 能读取状态文件并接着做。
- 可维护：每一步都有边界、测试、文档、提交和推送。

## 每轮启动流程

当用户要求“进行下一步”“进入下一步”“继续开发”或类似指令时，按以下顺序执行：

1. 检查工作区：

   ```bash
   git status --short
   git branch --show-current
   git log --oneline -3
   ```

2. 阅读连续执行状态：

   ```bash
   sed -n '1,240p' docs/codex-execution-state.md
   sed -n '1,240p' docs/codex-operating-protocol.md
   ```

3. 按需要阅读相关业务文档：

   ```bash
   sed -n '1,260p' docs/admin-management-roadmap.md
   sed -n '1,260p' docs/product-engineering-roadmap.md
   sed -n '1,220p' docs/domain-contracts.md
   ```

4. 只执行 `docs/codex-execution-state.md` 中的“下一步任务包”。

5. 如果发现下一步范围过大，将任务拆成一个可交付小步，并把剩余部分写回状态文件。

## 每轮交付流程

每个可交付小步都按以下顺序结束：

1. 完成代码或文档变更。
2. 补充或更新测试。
3. 更新相关文档。
4. 更新 `docs/codex-execution-state.md`：
   - 当前指针
   - 已完成关键能力
   - 下一步任务包
   - 待决策问题
5. 运行验证：

   ```bash
   pnpm run ci
   ```

6. 查看变更：

   ```bash
   git status --short
   git diff --stat
   ```

7. 提交并推送：

   ```bash
   git add ...
   git commit -m "<清晰的阶段性提交信息>"
   git push origin main
   ```

8. 最终回复用户：
   - 本轮完成了什么。
   - 验证结果。
   - 提交 hash。
   - 下一步是什么。

## 任务拆分规则

优先把任务拆成能在一次 Codex 执行中完成、验证和提交的小步。

合理的小步示例：

- 建立统一后台布局和导航。
- 增加课程商品列表的共享契约和只读 API。
- 增加订单后台列表和详情接口。
- 增加某个后台页面的只读视图。
- 增加某个状态机动作和审计事件。

过大的任务示例：

- 一次性完成整个运营后台。
- 一次性接入所有支付渠道。
- 一次性重构全部数据层。
- 一次性拆分所有权限。

遇到过大任务时，应完成最小稳定切片，并把后续切片写入下一步任务包。

## 工程边界

- 不绕过共享契约：前后端公共结构必须在 `shared/domain` 中定义。
- 不在页面里写核心业务规则：状态流转、金额校验、风险判断和权限判断必须进入 service 或 domain 层。
- 不直接在前端修改敏感状态：订单、支付、退款、预约、会员、风险处理必须调用服务端动作。
- 不做无审计的后台敏感写操作：如果当前还没有统一审计 Store，至少在本阶段文档中明确审计事件结构和接入点。
- 不混合无关重构：如果发现技术债，记录到文档或下一步，不在当前切片中扩大范围。
- 不回滚用户或其他执行轮的未授权改动：遇到已有变更先读懂，再顺着当前目标处理。

## 验证策略

默认验证：

```bash
pnpm run ci
```

前端页面变更还需要：

- 启动或复用本地开发服务。
- 用浏览器访问相关路径。
- 检查未登录、权限不足、正常权限三类状态中的关键页面。
- 对复杂 UI 变更保留截图或在最终回复中说明浏览器验证结果。

后端 API 变更还需要：

- 增加 API 或 service 单元测试。
- 覆盖权限失败、参数失败、成功路径和关键状态流转。

数据库变更还需要：

- 增加 migration。
- 更新 `docs/database-schema.md`。
- 尽量增加 Postgres Store 测试或至少覆盖 SQL 映射测试。

## 停止并请求用户决策的情况

以下情况不要自作主张继续扩大实现，需要在最终回复中明确说明并等待用户决定：

- 真实支付渠道需要商户号、证书、密钥或回调域名。
- 涉及真实短信、微信登录、隐私合规或未成年人保护策略，需要业务确认。
- 需要破坏性数据库迁移或删除历史数据。
- CI 失败且失败原因不是本轮可安全修复的问题。
- 产品策略存在互斥路径，例如课程先卖单课还是优先卖会员套餐。

## Git 提交规范

提交信息使用简短英文动词短语，便于后续查找：

- `Add unified admin shell`
- `Add course product admin contracts`
- `Add admin order console`
- `Add transaction refund actions`
- `Add finance dashboard summary`
- `Add risk review console`
- `Add admin audit center`

每次提交前确认：

- `git status --short` 只包含本轮相关文件。
- 文档状态已经更新。
- CI 已运行或阻塞原因已记录。

## “下一步”解释规则

用户说“进行下一步”时，默认含义是：

- 读取 `docs/codex-execution-state.md`。
- 执行其中“下一步任务包”的第一个可交付切片。
- 完成测试、文档、提交和推送。
- 将新的下一步写回状态文件。

如果用户明确指定了不同方向，以用户最新指令为准；但仍要在完成后更新执行状态，保证长期连续性。
