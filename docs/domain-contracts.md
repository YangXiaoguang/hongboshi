# 领域契约说明

`shared/domain` 是红博士后续二次开发的共享业务语言层。它同时提供 TypeScript 类型和 Zod 运行时校验，目标是让 mock、前端、API、数据库 seed 和测试都围绕同一套契约演进。

## 当前模块

| 文件                  | 责任                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `common.ts`           | ID、日期、分页、金额、API 响应和错误结构                         |
| `course.ts`           | 课程、优惠、折扣、学习进度                                       |
| `courseCatalog.ts`    | 课程目录筛选、搜索、排序、分页                                   |
| `courseProduct.ts`    | 后台课程商品、价格、状态、审核、详情内容和列表查询               |
| `courseAccess.ts`     | 课程购买权益、会员权益、访问判断                                 |
| `user.ts`             | 用户资料、角色、权限、登录来源、协议同意、登录请求和用户后台聚合 |
| `assessment.ts`       | 测评题目、答案、报告、推荐、风险等级                             |
| `assessmentEngine.ts` | 测评维度评分、风险分级、推荐路径生成                             |
| `counseling.ts`       | 咨询师、擅长方向、时段、预约状态、预约请求与结果                 |
| `growthProfile.ts`    | 成长档案聚合、摘要指标和用户成长时间线                           |
| `order.ts`            | 可购买对象、订单、支付、订单后台和交易后台聚合契约               |
| `finance.ts`          | 财务后台查询、汇总、导出、账期规则、手续费和结算预览             |
| `risk.ts`             | 风险事件、审计日志                                               |

## 使用约定

- 新增跨端数据结构时，先在 `shared/domain` 增加 schema 和 type。
- 前端组件只 import type；需要校验外部数据时 import schema。
- 服务端 API 入参和出参必须通过 schema parse 或 safeParse。
- 数据库字段可以比领域模型更细，但不能绕过领域模型暴露给前端。
- 枚举值使用英文稳定值或现有中文业务值，展示文案由 UI 层决定。

当前后台权限已经开始从粗粒度 `admin:manage` 拆分为资源级能力。课程商品模块使用 `catalog:read`、`catalog:edit`、`catalog:review`、`catalog:publish`、`catalog:price` 控制列表/详情读取、内容编辑、审核、上下架和改价；用户会员后台使用 `user:read` 控制用户列表与详情聚合，使用 `user:membership` 控制会员开通、延期、到期标记和计划调整；订单后台使用 `order:read` 控制课程、会员和咨询订单列表/详情读取，使用 `order:operate` 控制关闭待支付订单、标记异常和解除异常；交易后台使用 `transaction:read` 控制支付/退款流水、回调状态、关联订单和业务对象摘要读取，使用 `transaction:operate` 控制退款申请、交易异常工单和交易操作审计写入；财务后台使用 `finance:read` 控制收入、退款、净收款、待退款、异常金额、财务导出、规则读取和结算预览，使用 `finance:manage` 控制手续费规则写入；`catalog_viewer` 为课程商品只读角色，`catalog_operator` 为课程商品运营角色，`operator` 与 `admin` 继续拥有课程商品完整权限，且拥有用户后台读取、会员操作、订单后台读取、订单操作、交易后台读取、交易操作和财务读取权限，当前仅 `admin` 拥有财务规则写入权限。

`UserAdminListResultSchema` 与 `UserAdminDetailSchema` 是运营用户会员后台的聚合契约，只暴露账号摘要、角色、会员状态、课程权益、订单摘要、咨询预约摘要、风险等级/状态摘要和会员操作审计摘要。手机号只允许脱敏值，咨询说明、测评答案和风险信号原文不进入该契约；后续需要查看敏感内容时应新增更高权限和审计事件，而不是扩展当前聚合视图。`UserAdminMembershipActionRequestSchema`、`UserAdminMembershipAuditEventSchema` 和 `UserAdminMembershipMutationResultSchema` 描述会员开通、延期、标记到期、调整计划、操作原因、操作者角色和前后会员状态。

`OrderAdminListResultSchema` 与 `OrderAdminDetailSchema` 是运营订单后台的投影契约，聚合课程、会员和咨询订单，暴露订单状态、商品类型、金额、用户脱敏摘要、支付回调摘要、关联履约对象、状态时间线、当前异常标记和操作审计。`OrderAdminActionRequestSchema`、`OrderAdminExceptionFlagSchema`、`OrderAdminAuditEventSchema` 与 `OrderAdminMutationResultSchema` 描述关闭待支付订单、标记异常、解除异常、操作原因、操作者角色和前后状态快照。退款、补偿和真实支付渠道仍需要在交易退款模块中新增专门状态机动作。

`TransactionAdminListResultSchema` 与 `TransactionAdminDetailSchema` 是运营交易后台的投影契约，聚合支付回调收据、支付/退款流水、课程/会员/咨询订单、业务对象状态、订单异常标记和交易异常工单。列表支持关键词、流水类型、渠道、处理状态、商品类型、日期范围、排序和分页；详情解释单条流水的关联订单、用户脱敏摘要、课程/会员权益或咨询预约状态、异常提示、处理时间线和交易操作审计。`TransactionAdminActionRequestSchema`、`TransactionAdminWorkOrderSchema`、`TransactionAdminAuditEventSchema`、`TransactionRefundProviderResultSchema` 与 `TransactionAdminMutationResultSchema` 描述退款申请、标记异常、解决异常、退款渠道受理结果、操作原因、操作者角色和前后状态快照。退款申请只允许服务端在渠道受理成功后把合规已支付订单推进到 `refunding`，不得直接写入 `refunded`；渠道拒绝或失败必须留下审计且不得修改订单，退款完成仍由 `refund.succeeded` 回调或受控模拟事件驱动。

`FinanceAdminOverviewSchema` 是财务后台第一版只读投影契约，聚合支付成功、退款成功、退款中订单、失败/处理中回调和开放交易异常工单。`FinanceAdminQuerySchema` 支持关键词、渠道、商品类型、日期范围、排序和分页；`FinanceAdminEntrySchema` 只输出订单 ID、用户脱敏摘要、商品标题、类型、渠道、金额、发生时间、来源状态和异常等级，不包含咨询说明、测评答案或风险信号原文。财务口径固定为：`payment.succeeded + processed` 计入收入，`refund.succeeded + processed` 计入退款，订单 `refunding` 且尚无成功退款回调计入待退款，失败/处理中回调和开放交易异常工单只进入异常提示，不直接影响净收款。

`FinanceAdminExportSchema` 是财务 CSV 导出的稳定契约，复用 `FinanceAdminExportQuerySchema` 的筛选条件和同一套服务端财务口径。导出文件包含生成时间、操作者、筛选条件、汇总金额、口径版本、字段定义和明细行；明细行保留发生时间、事项类型、订单 ID、用户脱敏摘要、业务类型、商品标题、渠道、金额、来源状态、异常等级、交易号、回调收据 ID 和财务备注，并预留账期、手续费、结算批次和发票状态字段。导出不会新增敏感字段，也不在前端重新计算金额口径。

`FinanceAdminRuleConfigSchema`、`FinanceAdminChannelFeeRuleSchema`、`FinanceAdminSettlementPreviewSchema` 和 `FinanceAdminRuleConsoleSchema` 是财务账期与手续费规则的第一版契约。当前账期策略固定为自然月，按中国业务时间生成 `YYYY-MM` 账期；渠道规则包含渠道、费率、固定手续费、最低手续费、生效时间、规则版本和备注。结算预览复用服务端财务明细口径，按账期和渠道估算手续费、预计结算金额、退款中金额和异常未结算金额。规则写入只更新规则 Store，不修改历史订单、支付回调、交易流水或 CSV 明细事实。

`CounselingServiceRecordConsoleSchema` 是咨询服务记录与履约异常后台的聚合契约，包含咨询师筛选项、筛选条件、服务记录行、异常摘要和服务端时间。服务记录行只输出履约运营所需字段：预约 ID、用户 ID、咨询师、时段、预约状态、订单状态、支付锁定截止时间、风险等级摘要、最近审计动作和异常标签；不会输出咨询说明、测评答案或风险信号原文。当前异常类型覆盖待支付锁定临近/过期/关闭、临近开始仍未确认、已取消待退款、退款中和未到访。

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
    finance/
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

当前课程 seed 位于 `shared/data/mockCourses.ts`，用于首次初始化课程商品 Store 和测试 fallback。开发环境和生产 Express 的 `GET /api/courses` 与 `GET /api/courses/:courseId` 读取 `server/modules/catalog/courseProductStore.ts`：只返回 `published + approved` 商品，并把后台商品价格、会员包含、上下架状态映射回 `CourseSchema`。`GET /api/courses/:courseId/content` 会读取 `CourseProductDetailContentSchema`，前台详情页优先使用服务端摘要、适合人群、章节和素材占位，读取失败时继续使用本地 `buildCourseDetail` fallback。`GET /api/catalog/admin/course-products` 供运营/管理员读取 `CourseProductListResultSchema`，当前 Store 支持内存、JSON 文件和 PostgreSQL，默认开发期写入 `.hongboshi-data/course-products.json`，首次无数据时从课程 seed 初始化；后台列表支持搜索、分类、状态、排序、分页和最近审计。`GET /api/catalog/admin/course-products/content-quality` 供运营/管理员读取 `CourseProductContentQualityBatchResultSchema`，批量判断详情内容是否满足审核提交条件。`GET/PATCH /api/catalog/admin/course-products/:productId/content` 供运营/管理员读取和保存详情内容，入参通过 `CourseProductContentUpdateRequestSchema` 校验，内容实质变更会写入 `content_update` 审计事件，并将商品回退到未提交审核，已上架商品会同步转为下架。`PATCH /api/catalog/admin/course-products/:productId/status`、`/price`、`/info` 与 `/review` 供运营/管理员执行上下架、价格编辑、基础信息编辑和审核状态流转，入参分别通过 `CourseProductStatusUpdateRequestSchema`、`CourseProductPriceUpdateRequestSchema`、`CourseProductBasicInfoUpdateRequestSchema` 与 `CourseProductReviewActionRequestSchema` 校验；提交审核会先运行 `evaluateCourseProductContentQuality`，摘要、适合人群、章节数量、章节时长或素材占位存在阻塞问题时会返回冲突提示，服务端写入 `CourseProductAuditEventSchema`。快速测评题库位于 `shared/data/assessmentQuestions.ts`，通过 `GET /api/assessments/quick` 暴露，通过 `POST /api/assessments/quick/report` 生成维度分、风险等级、推荐路径和可选风险事件；`GET /api/assessments/latest` 返回当前登录用户最近一次测评报告。咨询师与排班 seed 位于 `shared/data/counselingSeed.ts`，通过 `GET /api/counseling/availability` 暴露，`POST /api/counseling/appointments` 生成待支付预约单、锁定时段、同步生成 `counseling_session` 待支付订单、保存关联测评报告 ID，并根据咨询前信息生成可选风险事件；`GET /api/counseling/admin/schedules` 供运营/管理员读取 `CounselingAdminScheduleConsoleSchema`，按咨询师展示未来排班、服务状态、可预约/锁定/已预约/已关闭时段和冲突提示；`POST /api/counseling/admin/schedules` 通过 `CounselingAdminScheduleActionRequestSchema` 执行新增可预约时段、关闭未预约时段和恢复已关闭时段，复用 `counselingAppointmentStore` 的 slot 数据，锁定或已预约时段不可被直接覆盖，动作写入 `CounselingOperationAuditEventSchema`；`GET /api/counseling/admin/service-records` 供运营/管理员读取 `CounselingServiceRecordConsoleSchema`，从预约、订单、时段、咨询师、风险事件和咨询运营审计聚合服务记录、异常标签和摘要指标，只展示运营履约所需字段。`POST /api/payments/webhooks/simulated` 接收统一的 `payment.succeeded` / `refund.succeeded` 支付事件并驱动咨询订单、预约确认与退款完成，配置 `HONGBOSHI_PAYMENT_WEBHOOK_SECRET` 后会校验 `x-hongboshi-payment-timestamp` 与 `x-hongboshi-payment-signature`，并通过 `payment_webhook_events` 收据表/内存 Store 保证同一事件幂等；`GET /api/payments/admin/reconciliation` 供运营/管理员读取 `PaymentReconciliationConsoleSchema`，对比支付回调收据、业务订单和咨询预约状态；`GET /api/transactions/admin/transactions` 与详情接口供具备 `transaction:read` 的后台账号读取 `TransactionAdminListResultSchema` 和 `TransactionAdminDetailSchema`，聚合支付/退款流水、回调处理状态、订单、业务对象和异常摘要；`GET /api/finance/admin/overview` 供具备 `finance:read` 的后台账号读取 `FinanceAdminOverviewSchema`，聚合收入、退款、净收款、退款中金额、异常金额、渠道/业务类型分布和财务明细；`GET /api/finance/admin/export` 供具备 `finance:read` 的后台账号按当前筛选条件导出 `FinanceAdminExportSchema` 对应 CSV，文件内包含生成时间、筛选条件、汇总金额、口径版本和账期/手续费/结算/发票预留字段；`GET/PUT /api/finance/admin/rules` 供具备 `finance:read` 的后台账号读取规则和结算预览，具备 `finance:manage` 的后台账号维护渠道手续费规则；`POST /api/counseling/appointments/:appointmentId/actions` 执行确认支付、取消和改期，其中确认支付会生成一条模拟支付成功事件，再复用同一套 webhook 处理器把关联订单置为 `paid` 并驱动预约进入已预约；取消动作统一通过可配置的 `evaluateCounselingCancellation` 策略决策，待支付取消会关闭订单并释放原时段，已确认取消会把订单置为 `refunding` 并释放时段，退款完成必须由 `refund.succeeded` 回调驱动；已确认预约的 `reschedule` 会释放原时段并锁定新的可用时段。`POST /api/counseling/appointments/:appointmentId/fulfillment` 供咨询师/运营标记服务完成或未到访并写入 `CounselingOperationAuditEventSchema`；`GET /api/counseling/workbench/appointments` 供咨询师读取本人预约，运营/管理员读取全部咨询师预约，并返回 `CounselingWorkbenchSchema` 汇总；`GET /api/counseling/admin/operations` 和 `PUT /api/counseling/admin/cancellation-policy` 供运营/管理员读取运营控制台与更新 `CounselingCancellationPolicySchema`。待支付预约超过 30 分钟会在咨询可用时段、预约列表、工作台、成长档案、服务记录和预约操作读取时自动取消、关闭订单并释放时段；`GET /api/counseling/appointments` 返回当前用户的预约记录摘要。`GET /api/growth/profile` 需要登录，聚合课程权益、订单、最新测评报告、咨询预约摘要和成长时间线，作为个人成长空间的服务端视图。`GET /api/users/admin/users` 与 `GET /api/users/admin/users/:userId` 供具备 `user:read` 的后台账号读取用户会员列表与隐私最小化详情，`PATCH /api/users/admin/users/:userId/membership` 供具备 `user:membership` 的后台账号执行会员开通、延期、标记到期和计划调整，并写入会员操作审计；服务端从 auth 用户目录、课程权益、咨询预约和风险事件 Store 聚合，缺少真实用户目录时会提供开发期 fallback 用户。课程目录查询逻辑位于 `shared/domain/courseCatalog.ts`，课程权益逻辑位于 `shared/domain/courseAccess.ts`，测评评分逻辑位于 `shared/domain/assessmentEngine.ts`。登录会话由 `/api/auth/session` 和 `/api/auth/login/*` 提供，服务端优先通过 HttpOnly session cookie 识别用户；课程购买、会员开通、咨询预约和成长档案读取通过登录会话识别用户，并在登录时记录 terms/privacy 协议版本。课程权益读取仍保留 `x-hongboshi-user-id` 作为开发期兜底；登录会话、课程权益、会员操作审计、课程商品、课程商品详情内容、测评结果、咨询预约、咨询运营配置/审计、风险事件、支付回调收据和交易操作审计已经拆出 Store 接口，并已有 PostgreSQL 实现，默认仍可使用 JSON/内存实现；财务规则已拆出 `FinanceRuleStore`，当前支持内存/JSON 文件，后续可补 PostgreSQL Store；咨询预约数据库实现依赖 `uniq_active_counseling_slot` 避免同一时段被重复占用，并通过 `order_id` 关联订单；咨询排班运营基础复用 `counseling_slots.available` 和活跃预约状态派生 `available/locked/scheduled/closed`，服务记录基础复用预约、订单、时段、风险事件和审计 Store 派生，不新增临床记录数据源；咨询运营数据库实现通过 `counseling_operation_settings` 保存规则快照，通过 `counseling_operation_audit_events` 追加记录规则变更、排班动作和履约状态变化。后续接数据库时，API 返回结构应继续通过 `LoginSessionSchema`、`UserAdminListResultSchema`、`UserAdminDetailSchema`、`UserAdminMembershipMutationResultSchema`、`CourseCatalogResultSchema`、`CourseProductListResultSchema`、`CourseProductMutationResultSchema`、`CourseProductContentMutationResultSchema`、`CourseProductContentQualityBatchResultSchema`、`CourseAccessStateSchema`、`AssessmentFlowSchema`、`AssessmentResultSchema`、`CounselingAvailabilitySchema`、`CounselingAppointmentCreateResultSchema`、`CounselingAppointmentActionResultSchema`、`CounselingAppointmentListSchema`、`CounselingWorkbenchSchema`、`CounselingOperationsConsoleSchema`、`CounselingAdminScheduleConsoleSchema`、`CounselingAdminScheduleMutationResultSchema`、`CounselingServiceRecordConsoleSchema`、`PaymentReconciliationConsoleSchema`、`TransactionAdminListResultSchema`、`TransactionAdminDetailSchema`、`FinanceAdminOverviewSchema`、`FinanceAdminExportSchema`、`FinanceAdminRuleConsoleSchema`、`GrowthProfileSchema` 和 `CourseSchema` 校验。

交易动作补充：`PATCH /api/transactions/admin/transactions/:transactionId/actions` 供具备 `transaction:operate` 的后台账号执行退款申请、标记异常和解决异常，入参通过 `TransactionAdminActionRequestSchema` 校验，并通过 `TransactionOperationStore` 写入交易异常工单和操作审计。退款申请必须先校验流水处理状态、关联订单状态和异常状态，再调用 `TransactionRefundProvider` 取得受理结果；受理失败或拒绝只写审计，不修改订单，受理成功后只进入 `refunding`，不制造 `refund.succeeded` 成功态。

## 服务端 Store 边界

- 课程权益：`server/modules/courses/courseAccessStore.ts` 已支持 JSON 文件和内存实现，并保存会员后台操作审计事件。
- 用户会员后台：`server/modules/users/userAdminApi.ts` 负责用户会员聚合与会员权益后台动作，读取 auth 用户目录、课程权益、咨询预约和风险事件 Store，只输出脱敏手机号和摘要字段；会员操作由服务端计算状态、校验原因并写入审计。
- 订单后台：`server/modules/orders/orderAdminApi.ts` 负责课程、会员和咨询订单聚合，读取课程权益订单、咨询预约记录、支付回调收据和 auth 用户目录，只输出履约与对账所需摘要；订单写动作只接受受控意图，关闭待支付订单复用订单状态机，异常标记写入异常摘要与审计事件。
- 交易后台：`server/modules/transactions/transactionAdminApi.ts` 负责支付/退款流水聚合与受控交易动作，读取支付回调收据、课程权益订单、咨询预约快照、订单异常标记、交易异常工单和 auth 用户目录，只输出对账、履约排障和客服核查所需摘要；写动作通过 `server/modules/transactions/transactionOperationStore.ts` 保存交易异常工单和操作审计，通过 `server/modules/transactions/transactionRefundProvider.ts` 调用人工/模拟退款受理接口。退款申请只在渠道受理成功后把合规订单推进到 `refunding`，不直接完成退款或伪造渠道成功；渠道失败会写入受理摘要审计。
- 财务后台：`server/modules/finance/financeAdminApi.ts` 负责收入、退款、净收款、待退款和异常金额只读聚合，读取支付回调收据、课程/会员/咨询订单、交易异常工单和 auth 用户目录；财务口径由服务端统一计算，前端只展示聚合结果和口径说明。CSV 导出复用同一聚合逻辑，输出生成时间、操作者、筛选条件、汇总金额、口径版本和稳定字段定义，并为账期、手续费、结算批次和发票状态预留字段。`server/modules/finance/financeRuleStore.ts` 负责自然月账期和渠道手续费规则，开发期支持内存/JSON 文件 `.hongboshi-data/finance-rules.json`；`/api/finance/admin/rules` 读取规则、维护规则并基于同一财务明细生成结算预览。
- 课程商品：`server/modules/catalog/courseProductStore.ts` 负责后台课程商品快照、筛选、排序、分页、汇总、写动作、审核状态流和审计事件；当前支持内存、JSON 文件与 PostgreSQL Store，并为前台 `/api/courses` 提供已审核通过且已上架课程映射。`server/modules/catalog/catalogApi.ts` 将读取、编辑、审核、发布和改价分别绑定到 `catalog:*` 权限。
- 课程详情内容：`server/modules/catalog/courseProductContentStore.ts` 负责课程摘要、适合人群、章节、素材占位和批量质量校验；当前支持内存、JSON 文件与 PostgreSQL Store，内容更新会写入课程商品审计并触发复审。素材占位已预留 `assetId`、`assetUrl`、上传人、上传时间、下载开关和合规审核状态，后续可平滑接真实文件管理。
- 测评结果：`server/modules/assessments/assessmentResultStore.ts` 负责按用户保存与读取最新报告。
- 咨询预约：`server/modules/counseling/counselingAppointmentStore.ts` 负责时段、预约单和预约关联风险事件；运营排班动作复用同一 slot 存储，关闭时段表示为 `available=false` 且无活跃预约；服务记录读取同一预约/时段事实源并只输出运营履约摘要。
- 咨询运营：`server/modules/counseling/counselingOperationStore.ts` 负责取消规则以及规则、排班、履约审计；服务记录会读取最近审计动作作为运营追溯上下文。
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
