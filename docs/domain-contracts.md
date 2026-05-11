# 领域契约说明

`shared/domain` 是红博士后续二次开发的共享业务语言层。它同时提供 TypeScript 类型和 Zod 运行时校验，目标是让 mock、前端、API、数据库 seed 和测试都围绕同一套契约演进。

## 当前模块

| 文件                  | 责任                                               |
| --------------------- | -------------------------------------------------- |
| `common.ts`           | ID、日期、分页、金额、API 响应和错误结构           |
| `course.ts`           | 课程、优惠、折扣、学习进度                         |
| `courseCatalog.ts`    | 课程目录筛选、搜索、排序、分页                     |
| `courseProduct.ts`    | 后台课程商品、价格、状态、审核和列表查询           |
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

当前课程 seed 位于 `shared/data/mockCourses.ts`，用于首次初始化课程商品 Store 和测试 fallback。开发环境和生产 Express 的 `GET /api/courses` 与 `GET /api/courses/:courseId` 读取 `server/modules/catalog/courseProductStore.ts`：只返回 `published` 商品，并把后台商品价格、会员包含、上下架状态映射回 `CourseSchema`。`GET /api/catalog/admin/course-products` 供运营/管理员读取 `CourseProductListResultSchema`，当前 Store 支持内存、JSON 文件和 PostgreSQL，默认开发期写入 `.hongboshi-data/course-products.json`，首次无数据时从课程 seed 初始化；后台列表支持搜索、分类、状态、排序、分页和最近审计。`PATCH /api/catalog/admin/course-products/:productId/status`、`/price` 与 `/info` 供运营/管理员执行上下架、价格编辑和基础信息编辑，入参分别通过 `CourseProductStatusUpdateRequestSchema`、`CourseProductPriceUpdateRequestSchema` 与 `CourseProductBasicInfoUpdateRequestSchema` 校验，服务端写入 `CourseProductAuditEventSchema`。快速测评题库位于 `shared/data/assessmentQuestions.ts`，通过 `GET /api/assessments/quick` 暴露，通过 `POST /api/assessments/quick/report` 生成维度分、风险等级、推荐路径和可选风险事件；`GET /api/assessments/latest` 返回当前登录用户最近一次测评报告。咨询师与排班 seed 位于 `shared/data/counselingSeed.ts`，通过 `GET /api/counseling/availability` 暴露，`POST /api/counseling/appointments` 生成待支付预约单、锁定时段、同步生成 `counseling_session` 待支付订单、保存关联测评报告 ID，并根据咨询前信息生成可选风险事件；`POST /api/payments/webhooks/simulated` 接收统一的 `payment.succeeded` / `refund.succeeded` 支付事件并驱动咨询订单、预约确认与退款完成，配置 `HONGBOSHI_PAYMENT_WEBHOOK_SECRET` 后会校验 `x-hongboshi-payment-timestamp` 与 `x-hongboshi-payment-signature`，并通过 `payment_webhook_events` 收据表/内存 Store 保证同一事件幂等；`GET /api/payments/admin/reconciliation` 供运营/管理员读取 `PaymentReconciliationConsoleSchema`，对比支付回调收据、业务订单和咨询预约状态；`POST /api/counseling/appointments/:appointmentId/actions` 执行确认支付、取消和改期，其中确认支付会生成一条模拟支付成功事件，再复用同一套 webhook 处理器把关联订单置为 `paid` 并驱动预约进入已预约；取消动作统一通过可配置的 `evaluateCounselingCancellation` 策略决策，待支付取消会关闭订单并释放原时段，已确认取消会把订单置为 `refunding` 并释放时段，退款完成必须由 `refund.succeeded` 回调驱动；已确认预约的 `reschedule` 会释放原时段并锁定新的可用时段。`POST /api/counseling/appointments/:appointmentId/fulfillment` 供咨询师/运营标记服务完成或未到访并写入 `CounselingOperationAuditEventSchema`；`GET /api/counseling/workbench/appointments` 供咨询师读取本人预约，运营/管理员读取全部咨询师预约，并返回 `CounselingWorkbenchSchema` 汇总；`GET /api/counseling/admin/operations` 和 `PUT /api/counseling/admin/cancellation-policy` 供运营/管理员读取运营控制台与更新 `CounselingCancellationPolicySchema`。待支付预约超过 30 分钟会在咨询可用时段、预约列表、工作台、成长档案和预约操作读取时自动取消、关闭订单并释放时段；`GET /api/counseling/appointments` 返回当前用户的预约记录摘要。`GET /api/growth/profile` 需要登录，聚合课程权益、订单、最新测评报告、咨询预约摘要和成长时间线，作为个人成长空间的服务端视图。课程目录查询逻辑位于 `shared/domain/courseCatalog.ts`，课程权益逻辑位于 `shared/domain/courseAccess.ts`，测评评分逻辑位于 `shared/domain/assessmentEngine.ts`。登录会话由 `/api/auth/session` 和 `/api/auth/login/*` 提供，服务端优先通过 HttpOnly session cookie 识别用户；课程购买、会员开通、咨询预约和成长档案读取通过登录会话识别用户，并在登录时记录 terms/privacy 协议版本。课程权益读取仍保留 `x-hongboshi-user-id` 作为开发期兜底；登录会话、课程权益、课程商品、测评结果、咨询预约、咨询运营配置/审计、风险事件和支付回调收据已经拆出 Store 接口，并已有 PostgreSQL 实现，默认仍可使用 JSON/内存实现；咨询预约数据库实现依赖 `uniq_active_counseling_slot` 避免同一时段被重复占用，并通过 `order_id` 关联订单，咨询运营数据库实现通过 `counseling_operation_settings` 保存规则快照，通过 `counseling_operation_audit_events` 追加记录规则变更和履约状态变化。后续接数据库时，API 返回结构应继续通过 `LoginSessionSchema`、`CourseCatalogResultSchema`、`CourseProductListResultSchema`、`CourseProductMutationResultSchema`、`CourseAccessStateSchema`、`AssessmentFlowSchema`、`AssessmentResultSchema`、`CounselingAvailabilitySchema`、`CounselingAppointmentCreateResultSchema`、`CounselingAppointmentActionResultSchema`、`CounselingAppointmentListSchema`、`CounselingWorkbenchSchema`、`CounselingOperationsConsoleSchema`、`PaymentReconciliationConsoleSchema`、`GrowthProfileSchema` 和 `CourseSchema` 校验。

## 服务端 Store 边界

- 课程权益：`server/modules/courses/courseAccessStore.ts` 已支持 JSON 文件和内存实现。
- 课程商品：`server/modules/catalog/courseProductStore.ts` 负责后台课程商品快照、筛选、排序、分页、汇总、写动作和审计事件；当前支持内存、JSON 文件与 PostgreSQL Store，并为前台 `/api/courses` 提供已上架课程映射。
- 测评结果：`server/modules/assessments/assessmentResultStore.ts` 负责按用户保存与读取最新报告。
- 咨询预约：`server/modules/counseling/counselingAppointmentStore.ts` 负责时段、预约单和预约关联风险事件。
- 咨询运营：`server/modules/counseling/counselingOperationStore.ts` 负责取消规则和规则/履约审计。
- 支付回调：`server/modules/payments/paymentWebhookEventStore.ts` 负责支付事件幂等收据，`server/modules/payments/paymentWebhookSecurity.ts` 负责签名校验。
- 风险事件：`server/modules/risk/riskEventStore.ts` 负责统一保存测评和咨询前信息触发的风险事件，`server/modules/risk/postgresRiskEventStore.ts` 提供 PostgreSQL 实现。
- 后续数据库实现应优先替换 Store，而不是改 API payload 或页面组件。

## 数据库准备层

- 初始 PostgreSQL 表结构草案见 `server/db/migrations/0001_core_tables.sql`，支付回调收据增量迁移见 `server/db/migrations/0002_payment_webhook_events.sql`。
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

- 预约：`pending_payment -> scheduled -> completed / no_show / cancelled -> refunded`
- 订单：`created -> pending_payment -> paid -> refunding -> refunded`，未支付取消或超时进入 `closed`
- 风险事件：`open -> reviewing -> resolved / escalated`
- 课程权益：`requires_purchase / requires_membership -> owned / member_included`
- 学习进度：`not_started -> in_progress -> completed`
- 测评风险：`low -> medium -> high -> urgent`

这些流程后续不要依赖零散布尔字段，应集中在 service 或状态机函数中维护。
