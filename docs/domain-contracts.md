# 领域契约说明

`shared/domain` 是红博士后续二次开发的共享业务语言层。它同时提供 TypeScript 类型和 Zod 运行时校验，目标是让 mock、前端、API、数据库 seed 和测试都围绕同一套契约演进。

## 当前模块

| 文件 | 责任 |
| --- | --- |
| `common.ts` | ID、日期、分页、金额、API 响应和错误结构 |
| `course.ts` | 课程、优惠、折扣、课程查询、学习进度 |
| `user.ts` | 用户资料、角色、登录来源、协议同意 |
| `assessment.ts` | 测评题目、答案、报告、推荐、风险等级 |
| `counseling.ts` | 咨询师、擅长方向、时段、预约状态 |
| `order.ts` | 可购买对象、订单、支付 |
| `risk.ts` | 风险事件、审计日志 |

## 使用约定

- 新增跨端数据结构时，先在 `shared/domain` 增加 schema 和 type。
- 前端组件只 import type；需要校验外部数据时 import schema。
- 服务端 API 入参和出参必须通过 schema parse 或 safeParse。
- 数据库字段可以比领域模型更细，但不能绕过领域模型暴露给前端。
- 枚举值使用英文稳定值或现有中文业务值，展示文案由 UI 层决定。

## 后端落地建议

第一阶段 API 可以按下面的模块组织：

```text
server/
  modules/
    auth/
    users/
    courses/
    assessments/
    counseling/
    orders/
    admin/
    risk/
  middleware/
    auth.ts
    error-handler.ts
    request-id.ts
    rate-limit.ts
  db/
    schema/
    migrations/
```

## 前端落地建议

```text
client/src/
  app/
    providers/
    routes/
  features/
    courses/
    assessments/
    counseling/
    orders/
    auth/
  entities/
    course/
    user/
    counselor/
  shared/
    api/
    ui/
    hooks/
    lib/
```

## 状态机优先的领域

- 预约：`pending_payment -> scheduled -> completed / cancelled / refunded`
- 订单：`created -> pending_payment -> paid / closed / refunding / refunded`
- 风险事件：`open -> reviewing -> resolved / escalated`
- 学习进度：`not_started -> in_progress -> completed`

这些流程后续不要依赖零散布尔字段，应集中在 service 或状态机函数中维护。
