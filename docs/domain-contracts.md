# 领域契约说明

`shared/domain` 是红博士后续二次开发的共享业务语言层。它同时提供 TypeScript 类型和 Zod 运行时校验，目标是让 mock、前端、API、数据库 seed 和测试都围绕同一套契约演进。

## 当前模块

| 文件                  | 责任                                               |
| --------------------- | -------------------------------------------------- |
| `common.ts`           | ID、日期、分页、金额、API 响应和错误结构           |
| `course.ts`           | 课程、优惠、折扣、学习进度                         |
| `courseCatalog.ts`    | 课程目录筛选、搜索、排序、分页                     |
| `courseAccess.ts`     | 课程购买权益、会员权益、访问判断                   |
| `user.ts`             | 用户资料、角色、权限、登录来源、协议同意、登录请求 |
| `assessment.ts`       | 测评题目、答案、报告、推荐、风险等级               |
| `assessmentEngine.ts` | 测评维度评分、风险分级、推荐路径生成               |
| `counseling.ts`       | 咨询师、擅长方向、时段、预约状态、预约请求与结果   |
| `order.ts`            | 可购买对象、订单、支付                             |
| `risk.ts`             | 风险事件、审计日志                                 |

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

当前课程 seed 位于 `shared/data/mockCourses.ts`，开发环境和生产 Express 都通过 `GET /api/courses` 暴露同一份课程数据。快速测评题库位于 `shared/data/assessmentQuestions.ts`，通过 `GET /api/assessments/quick` 暴露，通过 `POST /api/assessments/quick/report` 生成维度分、风险等级、推荐路径和可选风险事件。咨询师与排班 seed 位于 `shared/data/counselingSeed.ts`，通过 `GET /api/counseling/availability` 暴露，`POST /api/counseling/appointments` 生成待支付预约单、锁定时段，并根据咨询前信息生成可选风险事件；`GET /api/counseling/appointments` 返回当前用户的预约记录摘要。课程目录查询逻辑位于 `shared/domain/courseCatalog.ts`，课程权益逻辑位于 `shared/domain/courseAccess.ts`，测评评分逻辑位于 `shared/domain/assessmentEngine.ts`。登录会话由 `/api/auth/session` 和 `/api/auth/login/*` 提供，服务端优先通过 HttpOnly session cookie 识别用户；课程购买、会员开通和咨询预约通过登录会话识别用户，并在登录时记录 terms/privacy 协议版本。课程权益读取仍保留 `x-hongboshi-user-id` 作为开发期兜底，服务端默认使用 JSON 文件持久化；咨询预约当前使用进程内 Store，后续应替换为带事务和时段锁的数据库实现。后续接数据库时，API 返回结构应继续通过 `LoginSessionSchema`、`CourseCatalogResultSchema`、`CourseAccessStateSchema`、`AssessmentFlowSchema`、`AssessmentResultSchema`、`CounselingAvailabilitySchema`、`CounselingAppointmentCreateResultSchema`、`CounselingAppointmentListSchema` 和 `CourseSchema` 校验。

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
- 课程权益：`requires_purchase / requires_membership -> owned / member_included`
- 学习进度：`not_started -> in_progress -> completed`
- 测评风险：`low -> medium -> high -> urgent`

这些流程后续不要依赖零散布尔字段，应集中在 service 或状态机函数中维护。
