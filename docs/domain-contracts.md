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
| `growthProfile.ts`    | 成长档案聚合、摘要指标和用户成长时间线             |
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
    schema.ts
    migrations/
```

当前课程 seed 位于 `shared/data/mockCourses.ts`，开发环境和生产 Express 都通过 `GET /api/courses` 暴露同一份课程数据。快速测评题库位于 `shared/data/assessmentQuestions.ts`，通过 `GET /api/assessments/quick` 暴露，通过 `POST /api/assessments/quick/report` 生成维度分、风险等级、推荐路径和可选风险事件；`GET /api/assessments/latest` 返回当前登录用户最近一次测评报告。咨询师与排班 seed 位于 `shared/data/counselingSeed.ts`，通过 `GET /api/counseling/availability` 暴露，`POST /api/counseling/appointments` 生成待支付预约单、锁定时段、保存关联测评报告 ID，并根据咨询前信息生成可选风险事件；`POST /api/counseling/appointments/:appointmentId/actions` 执行确认支付和取消预约，取消后释放原时段；`GET /api/counseling/appointments` 返回当前用户的预约记录摘要。`GET /api/growth/profile` 需要登录，聚合课程权益、订单、最新测评报告、咨询预约摘要和成长时间线，作为个人成长空间的服务端视图。课程目录查询逻辑位于 `shared/domain/courseCatalog.ts`，课程权益逻辑位于 `shared/domain/courseAccess.ts`，测评评分逻辑位于 `shared/domain/assessmentEngine.ts`。登录会话由 `/api/auth/session` 和 `/api/auth/login/*` 提供，服务端优先通过 HttpOnly session cookie 识别用户；课程购买、会员开通、咨询预约和成长档案读取通过登录会话识别用户，并在登录时记录 terms/privacy 协议版本。课程权益读取仍保留 `x-hongboshi-user-id` 作为开发期兜底；登录会话、课程权益、测评结果、咨询预约和风险事件已经拆出 Store 接口，并已有 PostgreSQL 实现，默认仍可使用 JSON/内存实现；咨询预约数据库实现依赖 `uniq_active_counseling_slot` 避免同一时段被重复占用。后续接数据库时，API 返回结构应继续通过 `LoginSessionSchema`、`CourseCatalogResultSchema`、`CourseAccessStateSchema`、`AssessmentFlowSchema`、`AssessmentResultSchema`、`CounselingAvailabilitySchema`、`CounselingAppointmentCreateResultSchema`、`CounselingAppointmentActionResultSchema`、`CounselingAppointmentListSchema`、`GrowthProfileSchema` 和 `CourseSchema` 校验。

## 服务端 Store 边界

- 课程权益：`server/modules/courses/courseAccessStore.ts` 已支持 JSON 文件和内存实现。
- 测评结果：`server/modules/assessments/assessmentResultStore.ts` 负责按用户保存与读取最新报告。
- 咨询预约：`server/modules/counseling/counselingAppointmentStore.ts` 负责时段、预约单和预约关联风险事件。
- 风险事件：`server/modules/risk/riskEventStore.ts` 负责统一保存测评和咨询前信息触发的风险事件，`server/modules/risk/postgresRiskEventStore.ts` 提供 PostgreSQL 实现。
- 后续数据库实现应优先替换 Store，而不是改 API payload 或页面组件。

## 数据库准备层

- 初始 PostgreSQL 表结构草案见 `server/db/migrations/0001_core_tables.sql`。
- 表契约见 `server/db/schema.ts`，测试会校验迁移里包含核心表、关键列和索引。
- 详细说明见 `docs/database-schema.md`。
- 当前迁移文件是下一阶段接入 Prisma/Drizzle 前的基准，不会在启动时自动执行。

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
