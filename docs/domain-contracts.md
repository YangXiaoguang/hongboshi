# 领域契约说明

`shared/domain` 是红博士后续二次开发的共享业务语言层。它同时提供 TypeScript 类型和 Zod 运行时校验，目标是让 mock、前端、API、数据库 seed 和测试都围绕同一套契约演进。

## 当前模块

| 文件                         | 责任                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| `common.ts`                  | ID、日期、分页、金额、API 响应和错误结构                         |
| `course.ts`                  | 课程、优惠、折扣、学习进度                                       |
| `courseCatalog.ts`           | 课程目录筛选、搜索、排序、分页                                   |
| `courseProduct.ts`           | 后台课程商品、价格、状态、审核、详情内容和列表查询               |
| `courseAccess.ts`            | 课程购买权益、会员权益、访问判断                                 |
| `courseMembershipProduct.ts` | 会员商品/套餐、价格、权益、后台配置、生命周期和审计契约          |
| `courseLearningRecord.ts`    | 课程学习进度、练习记录、完成快照和阶段证明预览准备               |
| `user.ts`                    | 用户资料、角色、权限、登录来源、协议同意、登录请求和用户后台聚合 |
| `userNotification.ts`        | 用户站内消息、售后进度通知、读取状态和隐私最小化摘要             |
| `userPreference.ts`          | 用户偏好、账号收藏课程、账号券包、收藏/领取/使用来源和更新时间   |
| `assessment.ts`              | 测评题目、答案、报告、推荐、风险等级                             |
| `assessmentEngine.ts`        | 测评维度评分、风险分级、推荐路径生成                             |
| `counseling.ts`              | 咨询师、擅长方向、时段、预约状态、预约请求与结果                 |
| `growthProfile.ts`           | 成长档案聚合、摘要指标和用户成长时间线                           |
| `order.ts`                   | 可购买对象、订单、支付、订单后台和交易后台聚合契约               |
| `finance.ts`                 | 财务后台查询、汇总、导出、账期规则、手续费和结算预览             |
| `risk.ts`                    | 风险事件、风险复核后台、SOP 模板、升级队列和审计日志             |
| `auditCenter.ts`             | 统一审计中心只读聚合、导出、详情追踪、归档事件和隐私边界         |

## 使用约定

- 新增跨端数据结构时，先在 `shared/domain` 增加 schema 和 type。
- 前端组件只 import type；需要校验外部数据时 import schema。
- 服务端 API 入参和出参必须通过 schema parse 或 safeParse。
- 数据库字段可以比领域模型更细，但不能绕过领域模型暴露给前端。
- 枚举值使用英文稳定值或现有中文业务值，展示文案由 UI 层决定。

当前后台权限已经开始从粗粒度 `admin:manage` 拆分为资源级能力。课程商品模块使用 `catalog:read`、`catalog:edit`、`catalog:review`、`catalog:publish`、`catalog:price` 控制列表/详情读取、内容编辑、审核、上下架和改价；会员商品模块使用 `membership_product:read` 控制会员商品后台读取，使用 `membership_product:manage` 控制商品文案、套餐价格和套餐状态写入；用户会员后台使用 `user:read` 控制用户列表与详情聚合，使用 `user:membership` 控制会员开通、延期、到期标记和计划调整；订单后台使用 `order:read` 控制课程、会员和咨询订单列表/详情读取，使用 `order:operate` 控制关闭待支付订单、标记异常、解除异常和售后工单处理；交易后台使用 `transaction:read` 控制支付/退款流水、回调状态、关联订单和业务对象摘要读取，使用 `transaction:operate` 控制退款申请、交易异常工单和交易操作审计写入；财务后台使用 `finance:read` 控制收入、退款、净收款、待退款、异常金额、财务导出、规则读取和结算预览，使用 `finance:manage` 控制手续费规则写入；风险复核台使用 `risk:read` 控制风险事件队列、隐私最小化详情和 SOP 控制台读取，使用 `risk:review` 控制复核处理动作，使用 `risk:sop` 控制 SOP 模板写入；审计中心使用 `audit:read` 控制跨模块审计只读聚合，使用 `audit:archive` 控制手动归档任务；`catalog_viewer` 为课程与会员商品只读角色，`catalog_operator` 为课程与会员商品运营角色，`operator` 与 `admin` 继续拥有课程商品、会员商品完整权限，且拥有用户后台读取、会员操作、订单后台读取、订单操作、交易后台读取、交易操作、财务读取、风险读取、风险处理和审计中心读取权限，当前仅 `admin` 拥有财务规则写入、风险 SOP 模板维护和审计归档权限。

`UserAdminListResultSchema` 与 `UserAdminDetailSchema` 是运营用户会员后台的聚合契约，只暴露账号摘要、角色、会员状态、课程权益、订单摘要、咨询预约摘要、风险等级/状态摘要和会员操作审计摘要。手机号只允许脱敏值，咨询说明、测评答案和风险信号原文不进入该契约；后续需要查看敏感内容时应新增更高权限和审计事件，而不是扩展当前聚合视图。`UserAdminMembershipActionRequestSchema`、`UserAdminMembershipAuditEventSchema` 和 `UserAdminMembershipMutationResultSchema` 描述会员开通、延期、标记到期、调整计划、操作原因、操作者角色和前后会员状态。

`OrderAdminListResultSchema` 与 `OrderAdminDetailSchema` 是运营订单后台的投影契约，聚合课程、会员和咨询订单，暴露订单状态、商品类型、金额、用户脱敏摘要、支付回调摘要、关联履约对象、售后申请摘要、状态时间线、当前异常标记和操作审计。`OrderAdminActionRequestSchema`、`OrderAdminExceptionFlagSchema`、`OrderAdminAuditEventSchema` 与 `OrderAdminMutationResultSchema` 描述关闭待支付订单、标记异常、解除异常、操作原因、操作者角色和前后状态快照。`OrderAfterSalesAdminActionRequestSchema`、`OrderAfterSalesAuditEventSchema` 与 `OrderAfterSalesAdminMutationResultSchema` 描述售后工单进入处理中、解决、关闭和联动退款申请；`link_refund` 动作必须同时满足 `order:operate` 与 `transaction:operate`，并复用交易后台 `request_refund` 状态机。渠道受理成功后售后工单进入 `linked_to_refund`、订单只推进到 `refunding`；渠道拒绝或失败时保留售后原状态并返回冲突。退款完成由 `refund.succeeded` 回调或受控模拟事件驱动，支付回调处理成功后会把同订单、同用户、处于 `linked_to_refund` 的售后工单以 `system_payment_webhook` 作为系统操作者自动标记为 `resolved`，并写入摘要级审计和用户站内通知。

`TransactionAdminListResultSchema` 与 `TransactionAdminDetailSchema` 是运营交易后台的投影契约，聚合支付回调收据、支付/退款流水、课程/会员/咨询订单、业务对象状态、订单异常标记、用户售后申请摘要和交易异常工单。列表支持关键词、流水类型、渠道、处理状态、商品类型、日期范围、排序和分页；详情解释单条流水的关联订单、用户脱敏摘要、课程/会员权益或咨询预约状态、异常提示、售后诉求、处理时间线和交易操作审计。`TransactionAdminActionRequestSchema`、`TransactionAdminWorkOrderSchema`、`TransactionAdminAuditEventSchema`、`TransactionRefundProviderResultSchema` 与 `TransactionAdminMutationResultSchema` 描述退款申请、标记异常、解决异常、退款渠道受理结果、操作原因、操作者角色和前后状态快照。退款申请只允许服务端在渠道受理成功后把合规已支付订单推进到 `refunding`，不得直接写入 `refunded`；从售后工单联动的退款申请必须携带匹配的 `afterSalesRequestId`，仅允许开放售后工单消除 `after_sales_open` 阻塞并写入双侧审计；渠道拒绝或失败必须留下交易审计且不得修改订单，退款完成仍由 `refund.succeeded` 回调或受控模拟事件驱动。

`FinanceAdminOverviewSchema` 是财务后台第一版只读投影契约，聚合支付成功、退款成功、退款中订单、失败/处理中回调和开放交易异常工单。`FinanceAdminQuerySchema` 支持关键词、渠道、商品类型、日期范围、排序和分页；`FinanceAdminEntrySchema` 只输出订单 ID、用户脱敏摘要、商品标题、类型、渠道、金额、发生时间、来源状态和异常等级，不包含咨询说明、测评答案或风险信号原文。财务口径固定为：`payment.succeeded + processed` 计入收入，`refund.succeeded + processed` 计入退款，订单 `refunding` 且尚无成功退款回调计入待退款，失败/处理中回调和开放交易异常工单只进入异常提示，不直接影响净收款。

`FinanceAdminExportSchema` 是财务 CSV 导出的稳定契约，复用 `FinanceAdminExportQuerySchema` 的筛选条件和同一套服务端财务口径。导出文件包含生成时间、操作者、筛选条件、汇总金额、口径版本、字段定义和明细行；明细行保留发生时间、事项类型、订单 ID、用户脱敏摘要、业务类型、商品标题、渠道、金额、来源状态、异常等级、交易号、回调收据 ID 和财务备注，并预留账期、手续费、结算批次和发票状态字段。导出不会新增敏感字段，也不在前端重新计算金额口径。

`FinanceAdminRuleConfigSchema`、`FinanceAdminChannelFeeRuleSchema`、`FinanceAdminSettlementPreviewSchema` 和 `FinanceAdminRuleConsoleSchema` 是财务账期与手续费规则的第一版契约。当前账期策略固定为自然月，按中国业务时间生成 `YYYY-MM` 账期；渠道规则包含渠道、费率、固定手续费、最低手续费、生效时间、规则版本和备注。结算预览复用服务端财务明细口径，按账期和渠道估算手续费、预计结算金额、退款中金额和异常未结算金额。规则写入只更新规则 Store，不修改历史订单、支付回调、交易流水或 CSV 明细事实。

`CourseLearningRecordSchema` 是用户端课程学习记录同步契约，按 `userId + courseId` 保存章节进度、练习记录、课程完成快照和阶段证明预览。`CourseLearningProgressSyncRequestSchema`、`CourseLearningPracticeSyncRequestSchema` 与 `CourseLearningCompletionSubmitRequestSchema` 分别描述章节完成同步、章节练习保存和课程完成反馈提交；服务端必须校验登录态、课程已发布已审核、课程权益可学习、章节 ID 属于当前课程，才能写入记录。阶段证明当前只允许 `preview`/`pending_review`/`issued` 的准备字段，第一版只生成预览，不签发正式证书编号。

`CourseCheckoutCreateRequestSchema` 是课程与会员结算创建请求契约。`course` 模式必须携带课程 ID，可携带账号券包的 `couponClaimId`；服务端会读取 `UserPreferenceSchema` 校验该券已领取、未使用、未过期，并确认对应营销规则仍是当前课程可用的 `course_coupon`。`membership` 模式直接携带 `membershipProductId` 与 `membershipPlanId`，不再要求课程 ID；服务端从 `CourseMembershipProductStore` 读取当前会员商品与套餐，校验商品/套餐为 active 后创建新会员订单，订单 item 的 `targetId` 直接记录套餐 ID，金额使用 Store 中的 `originalPrice/payablePrice`，支付成功后由 checkout service 写入会员权益来源。已有待支付会员订单按历史订单快照继续支付，即使套餐随后被暂停也不会被迫重下单；新订单会按当前 Store 状态拒绝。课程订单金额仍由服务端课程定价与营销规则统一计算，会员订单金额由会员套餐价格统一计算，前端不得自行改写应付金额。`OrderCouponApplicationSchema` 记录订单关联的券包 claim ID、marketing rule ID、预留/已使用状态、关联时间和使用时间；支付成功后课程 checkout service 会把课程订单券应用推进为 `used`，并同步把账号券包记录写入使用订单和使用时间。用户端结算抽屉可以展示未领取但适用的课程券并调用 `UserPreferenceCouponClaimRequestSchema` 完成领取；领取只更新账号券包和使用意图，订单金额与核销仍以服务端 checkout 为准。个人中心订单深链以 `orderId` 查询参数打开同一订单详情抽屉，详情只读取 `Order`、`couponApplication`、课程权益与营销规则名称来展示商品、金额、支付、用券、权益交付、时间线和售后说明。`OrderAfterSalesCreateRequestSchema`、`OrderAfterSalesRequestSchema`、`OrderAfterSalesSummarySchema`、`OrderAfterSalesListResultSchema` 与 `OrderAfterSalesMutationResultSchema` 是用户端售后申请契约，只允许登录用户对本人已支付或退款中订单提交售后诉求，记录申请类型、说明、联系方式、状态和创建时间；申请写入独立售后 Store 并追加保存，用户端提交不会直接推进 `refunding` 或 `refunded`。后台处理后，个人中心只展示售后状态、运营备注摘要、退款受理单号和退款完成摘要提示；课程订单退款完成由 `POST /api/payments/webhooks/simulated` 的 `refund.succeeded` 事件推进到 `refunded`，用户端不直接改写退款成功状态。

`CourseMembershipProductSchema` 与 `CourseMembershipPlanSchema` 是会员商品化共享契约，描述会员商品 ID、商品状态、首图、卖点、套餐价格、原价参考、有效期、覆盖权益、适合人群、服务保障、购买须知和更新时间。`CourseMembershipProductSnapshotSchema` 是用户端公共快照契约，只返回 active 商品与 active 套餐，不包含后台审计事件；`/membership`、课程详情/课程列表会员结算摘要和成长空间结算入口优先读取该快照，普通网络读取失败时回退 `defaultCourseMembershipProduct` 保持页面可浏览，公共快照返回 `CONFLICT`、商品 inactive 或无 active 套餐时进入 `unavailable` 状态并阻止创建新会员订单，错误 `details.reason` 分别为 `product_inactive` 或 `no_active_plan`。`CourseMembershipProductAdminConsoleSchema`、`CourseMembershipProductUpdateRequestSchema`、`CourseMembershipPlanUpdateRequestSchema`、`CourseMembershipPlanStatusUpdateRequestSchema` 和 `CourseMembershipProductAdminAuditEventSchema` 描述运营后台读取、商品文案更新、套餐改价、套餐暂停/恢复、操作原因、操作者角色和 before/after 摘要。当前 `defaultCourseMembershipProduct` 承载“成长会员年卡”，`/admin/memberships` 已可读取并维护会员商品基础信息、套餐价格和套餐状态，动作写入会员商品审计；用户端公共快照和服务端 checkout 已接入同一会员商品 Store，后台页提供前台快照预览和复制 `/membership` 前台链接提示。课程上下文中的会员结算只保留“开通后可学本课”的展示解释，订单创建不再依赖具体课程。`findPendingMembershipCheckoutOrder` 按会员套餐 ID 召回待支付会员订单；`findMembershipCheckoutAnchorCourse` 仅用于课程页/成长空间展示待支付提示时选择一个可读的课程上下文，不参与服务端会员订单创建。已有待支付会员订单在前台会标注“历史订单金额”并继续按订单记录金额支付，不受后续套餐改价或暂停影响。

课程 `refund.succeeded` 回调保存 `refunded` 订单时，会通过 `settleRefundedCourseAccessOrder` 结清权益：单课退款先保留退款完成订单事实，再按课程 ID 检查是否仍有其他 `paid/refunding` 同课订单；只有不存在其他有效同课订单时，才从 `ownedCourseIds` 移除该课程。`CourseMembershipSchema` 已新增 `sourceType`、`sourceOrderId`、`sourceActorId` 和 `sourceUpdatedAt`，会员 checkout 支付成功会写入 `checkout_order` 来源，后台人工开通、延期、到期和计划调整会写入 `admin_manual` 来源，旧的直接开通接口写入 `direct_activation` 来源。会员订单退款完成时，仅当当前会员来源仍匹配这笔退款订单且没有其他有效会员订单覆盖，才把会员降为 `expired`；如果会员已被后台人工调整、直接开通或由另一笔会员订单覆盖，则保留当前会员权益，避免退款误伤。`/admin/users` 用户详情只展示来源摘要、来源订单 ID 或操作者 ID、更新时间，不扩展手机号、咨询说明、测评答案或风险原文。用户端课程列表、课程详情和成长空间继续只依赖 `resolveCourseAccess` 计算可学习状态，已退款权益会回到购买/开通入口；个人中心已退款订单只展示退款完成、权益已停止或已按来源处理，并通过稳定的 `checkout=membership&intent=renew_membership` 入口打开可开通会员的结算链路，不再让用户回到列表后自行寻找入口。

`UserNotificationSchema`、`UserNotificationListResultSchema` 与 `UserNotificationMutationResultSchema` 是用户端站内消息契约，首版只承载售后进度通知，不接真实短信、微信或邮件。通知资源固定为 `order_after_sales`，只保存订单 ID、课程名摘要、售后工单 ID、可选交易流水和退款受理单号；内容展示处理中、已解决、已关闭、退款已受理、退款暂未受理和退款已完成，不包含支付 raw payload、咨询说明、测评答案或风险信号原文。`refund_completed` 只说明支付回调已确认退款完成、售后工单已自动收尾和到账以原支付渠道为准。`UserNotificationMarkReadRequestSchema` 只改变当前登录用户自己的读取状态，不影响售后工单、订单、退款或后台审计事实。

`UserPreferenceSchema` 是用户端账号偏好契约，当前保存账号级收藏课程列表和账号券包。`UserFavoriteCourseSchema` 记录课程 ID、收藏来源、首次收藏时间和最近更新时间；`UserPreferenceFavoriteUpdateRequestSchema` 接受当前账号完整收藏课程 ID 列表，服务端去重、保留已有首次收藏时间，并按登录会话写入独立用户偏好 Store。`UserCouponClaimSchema` 记录领取到账号的营销规则 ID、领取状态、领取时间、过期时间、使用订单和最近更新时间；`UserPreferenceCouponClaimRequestSchema` 只接受营销规则 ID，服务端会校验规则存在、类型为课程券且当前有效后再写入券包；`UserPreferenceCouponUseRequestSchema` 描述券包核销所需的 claim ID 和订单 ID，当前由课程支付成功链路内部调用，不作为用户端随意核销入口。未登录用户仍使用本地收藏 fallback，并只能查看可用营销规则，登录后才会沉淀收藏、券包领取和使用状态。

`CounselingServiceRecordConsoleSchema` 是咨询服务记录与履约异常后台的聚合契约，包含咨询师筛选项、筛选条件、服务记录行、异常摘要和服务端时间。服务记录行只输出履约运营所需字段：预约 ID、用户 ID、咨询师、时段、预约状态、订单状态、支付锁定截止时间、风险等级摘要、最近审计动作和异常标签；不会输出咨询说明、测评答案或风险信号原文。当前异常类型覆盖待支付锁定临近/过期/关闭、临近开始仍未确认、已取消待退款、退款中和未到访。

`CounselorAdminProfileConsoleSchema` 是咨询师后台档案与服务状态契约，复用 `CounselorSchema` 作为统一事实模型，并在后台侧补充接单状态、资质审核摘要、资质到期时间、排班摘要、服务摘要和最近可约时间。`CounselorAdminProfileUpdateRequestSchema` 只允许运营提交受控档案字段、服务状态、接单开关和资质状态，并必须填写操作原因；接口不承载身份证件、资质原件、合同文件或临床记录。

`RiskAdminListResultSchema` 与 `RiskAdminDetailSchema` 是风险复核台的后台投影契约，聚合 `riskEventStore` 中的风险事件、auth 用户脱敏摘要、关联测评/咨询对象摘要、人工处理记录、服务端匹配的 SOP 模板和升级队列摘要。列表支持风险等级、状态、来源、关键词、排序和分页；详情只输出复核所需 `signalSummary`、关联对象摘要、SOP 模板步骤、升级状态和处理记录，不输出 `RiskEvent.signal`、测评答案原文或咨询前说明全文。`RiskSopTemplateSchema`、`RiskSopResultTemplateSchema`、`RiskEscalationQueueItemSchema` 和 `RiskSopConsoleSchema` 描述 SOP 模板、处理结果备注模板、升级队列和 SOP 控制台。`RiskAdminActionRequestSchema`、`RiskAdminReviewRecordSchema` 与 `RiskAdminMutationResultSchema` 描述开始复核、已联系用户、建议咨询、升级处理和标记解决动作，记录操作者、角色、前后状态、备注、处理时间、SOP 模板 ID/版本、结果模板 ID 和升级摘要。处理记录由独立 `RiskReviewStore` 保存，SOP 模板与升级队列由 `RiskSopStore` 保存；两者均支持 PostgreSQL，并在数据库层保留 actor、resource、action、before/after 摘要和时间投影，避免把审计事实混入风险事件本体，同时为统一审计中心预备只读聚合字段。

`AuditCenterListResultSchema` 是统一审计中心第一版只读聚合契约，从课程商品审计、会员操作审计、订单操作审计、交易操作审计、咨询运营审计和风险复核记录中归一化 `AuditCenterEventSchema`。列表支持模块、动作、操作者、资源关键词、日期范围和分页筛选；事件只包含模块、动作、资源定位、操作者、原因、摘要、发生时间和 before/after 摘要，不新增写入真相源，不允许审计事件修改或删除，也不暴露咨询说明、测评答案、风险信号原文和支付敏感原文。`AuditCenterExportSchema` 复用同一套筛选条件但剥离分页，输出 CSV 元数据、生成时间、操作者、筛选快照、口径版本、字段定义、模块汇总和 before/after 摘要；`AuditCenterDetailResultSchema` 用审计中心事件 ID 定位来源模块和源事件 ID，返回同一隐私边界下的事件详情与追踪提示。`AuditCenterArchiveEventSchema` 是统一审计 Store 的只追加归档契约，包含稳定事件 ID、唯一幂等键、source descriptor、模块、动作、资源、操作者、角色、原因、summary-only before/after 摘要、发生时间、归档时间、结构版本和隐私口径版本；`AuditCenterArchiveRequestSchema` 与 `AuditCenterArchiveResultSchema` 描述手动归档筛选、批次 ID、归档人、成功数、跳过数和失败摘要。`AuditCenterArchiveVerificationResultSchema` 描述归档只读校验结果，包含当前聚合总数、归档总数、总差异、模块差异、最近归档批次和最近归档事件摘要。`AuditCenterArchiveSearchQuerySchema`、`AuditCenterArchivePreviewItemSchema` 与 `AuditCenterArchiveSearchResultSchema` 描述归档表只读检索预览，支持模块、动作、操作者、资源关键词、批次 ID、发生日期、归档日期、分页和发生/归档时间排序，只返回 summary-only 摘要行。它不会替换现有业务 Store 真相源，只为回填、长期留存和跨模块检索提供兼容投影。

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
    audit/
  middleware/
    auth.ts
    error-handler.ts
    request-id.ts
    rate-limit.ts
  db/
    schema.ts
    migrations/
```

当前课程 seed 位于 `shared/data/mockCourses.ts`，用于首次初始化课程商品 Store 和测试 fallback。开发环境和生产 Express 的 `GET /api/courses` 与 `GET /api/courses/:courseId` 读取 `server/modules/catalog/courseProductStore.ts`：只返回 `published + approved` 商品，并把后台商品价格、会员包含、上下架状态映射回 `CourseSchema`。`GET /api/courses/:courseId/content` 会读取 `CourseProductDetailContentSchema`，前台详情页优先使用服务端摘要、适合人群、成交图文素材、章节和素材占位，读取失败时继续使用本地 `buildCourseDetail` fallback。`GET /api/catalog/admin/course-products` 供运营/管理员读取 `CourseProductListResultSchema`，当前 Store 支持内存、JSON 文件和 PostgreSQL，默认开发期写入 `.hongboshi-data/course-products.json`，首次无数据时从课程 seed 初始化；后台列表支持搜索、分类、状态、排序、分页和最近审计。`POST /api/catalog/admin/course-products` 供具备 `catalog:edit` 的后台账号创建手动课程商品草稿，入参通过 `CourseProductCreateRequestSchema` 校验，默认写入 `draft + not_submitted + manual` 商品并记录 `product_create` 审计事件。`GET /api/catalog/admin/course-products/content-quality` 供运营/管理员读取 `CourseProductContentQualityBatchResultSchema`，批量判断详情内容是否满足审核提交条件。`GET/PATCH /api/catalog/admin/course-products/:productId/content` 供运营/管理员读取和保存详情内容，入参通过 `CourseProductContentUpdateRequestSchema` 校验，内容实质变更会写入 `content_update` 审计事件，并将商品回退到未提交审核，已上架商品会同步转为下架；其中 `merchandising` 保存详情成交标题、副标题、主视觉、卖点、已审核图文资产和受控 `richTextBlocks`，H5 内容块支持标题、正文、图片、要点、FAQ、讲师介绍和购买须知，不保存任意 HTML。`PATCH /api/catalog/admin/course-products/:productId/status`、`/price`、`/info` 与 `/review` 供运营/管理员执行上下架、价格编辑、基础信息编辑和审核状态流转，入参分别通过 `CourseProductStatusUpdateRequestSchema`、`CourseProductPriceUpdateRequestSchema`、`CourseProductBasicInfoUpdateRequestSchema` 与 `CourseProductReviewActionRequestSchema` 校验；提交审核会先运行 `evaluateCourseProductContentQuality`，摘要、适合人群、章节数量、章节时长或素材占位存在阻塞问题时会返回冲突提示，并在错误 `details.quality` 中返回结构化问题列表，缺少成交主视觉、成交卖点不足、H5 内容块不足或成交素材待合规确认会返回提醒，服务端写入 `CourseProductAuditEventSchema`。

商品工作台图片步骤复用课程素材资产读取和文件上传契约；H5 图片块只从已通过/免审素材快速选择或手工填写受控图片地址，发布审核步骤的预检清单只做前端提示，不替代服务端内容质量校验；工作台审核动作复用 `/review` 状态机，服务端阻塞问题会按 path 定位到商品图片、H5 详情或课程内容详情页；工作台上架/下架动作复用 `/status` 状态机、`catalog:publish` 权限和 `status_update` 审计，前台仍只展示 `published + approved` 商品；前台课程详情会消费 `merchandising.richTextBlocks`，按受控组件渲染标题、正文、图片、要点、FAQ、讲师介绍和购买须知。

课程商品详情模板库由 `CourseProductDetailTemplateSchema`、`CourseProductDetailTemplateCreateRequestSchema`、`CourseProductDetailTemplateApplyRequestSchema`、`CourseProductDetailTemplateListResultSchema` 和 `CourseProductDetailTemplateMutationResultSchema` 描述。`GET/POST /api/catalog/admin/course-products/detail-templates` 供具备 `catalog:read` / `catalog:edit` 的后台账号读取系统/团队/个人模板和保存个人模板；`POST /api/catalog/admin/course-products/detail-templates/:templateId/apply` 只记录模板套用动作审计并返回模板内容，不直接修改课程商品详情；`DELETE /api/catalog/admin/course-products/detail-templates/:templateId` 仅允许删除个人模板，系统模板只读。模板库开发期默认写入 `.hongboshi-data/course-product-detail-templates.json`，可通过 `HONGBOSHI_COURSE_PRODUCT_DETAIL_TEMPLATE_STORE=memory|file` 切换；模板保存、套用和删除写入 `CourseProductDetailTemplateAuditEventSchema`，真正影响前台发布内容仍必须通过 `/content` 保存并写入课程商品 `content_update` 审计。

课程素材资产由 `CourseProductAssetSchema`、`CourseProductAssetUploadRequestSchema`、`CourseProductAssetFileUploadRequestSchema`、`CourseProductAssetComplianceUpdateRequestSchema`、`CourseProductAssetListResultSchema` 和 `CourseProductAssetMutationResultSchema` 描述，当前覆盖详情主图、证明图片、章节资料、练习表、音频和视频等资产类型。正式化准备已补充 `CourseProductAssetObjectDescriptorSchema`、`CourseProductAssetSignedReadUrlSchema`、`CourseProductAssetObjectDeleteResultSchema`、`CourseProductAssetReferenceSchema`、`CourseProductAssetBackfillPlanSchema`、`CourseProductAssetBackfillRequestSchema`、`CourseProductAssetBackfillMutationResultSchema`、`CourseProductAssetGovernanceResultSchema`、`CourseProductAssetGovernanceActionRequestSchema`、`CourseProductAssetGovernanceActionResultSchema`、`CourseProductAssetGovernanceHistoryResultSchema`、`CourseProductAssetGovernanceBatchDraftResultSchema`、`CourseProductAssetGovernanceBatchTaskReviewRequestSchema`、`CourseProductAssetGovernanceBatchTaskListResultSchema`、`CourseProductAssetGovernanceBatchTaskMutationResultSchema`、`CourseProductAssetGovernanceBatchTaskExecutionPlanResultSchema`、`CourseProductAssetGovernanceBatchTaskExecutionResultSchema`、`CourseProductAssetGovernanceBatchTaskExecutionDetailResultSchema` 和 `CourseProductAssetGovernanceBatchActionPlanResultSchema`，统一描述对象 key、存储 provider、MIME、大小、sha256 内容指纹、短期读取 URL、软删除结果、素材引用关系、回填预检、受控写入结果、素材治理摘要、单素材治理动作、治理动作历史、批量治理草稿预览、待审批批量任务草案、批量草案审批动作、已审批草案执行只读预案、受控执行结果、历史执行详情和高风险批量动作只读预案；回填来源支持 `json_asset_store_and_content_placeholders`，用于同时扫描开发期素材 Store 与章节素材占位。

素材对象存储边界由 `server/modules/catalog/courseProductAssetObjectStorage.ts` 承接。`HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER` 默认 `local`，并支持 `s3`、`oss`、`cos` 远端 provider 占位；远端 provider 需要配置对象公开基础域名、bucket、region、签名密钥和可选 TTL。`createCourseProductAssetObjectStorage` 会生成 provider-aware adapter，上传路径通过 `putObject` 写入对象并保存 `objectKey/contentHash`，下载和公开查看路径通过 `readObject` 读取对象，并可生成 `CourseProductAssetSignedReadUrlSchema` 描述的短期读取 URL。当前 HTTP 用户端路由仍返回服务端文件流：`GET /api/courses/:courseId/assets/:assetId/view` 只对已发布已审核课程的已通过图片开放内联读取；`GET /api/courses/:courseId/assets/:assetId/download` 要求登录且课程已解锁，并校验素材已通过合规、开启下载和课程归属。签名 URL 先作为服务端对象读取能力和后续直连对象存储的稳定契约，不让前端绕过登录、权益、合规和下载开关。

`GET /api/catalog/admin/course-products/assets/backfill` 供具备 `catalog:read` 的后台账号读取回填预检；`POST /api/catalog/admin/course-products/assets/backfill` 支持 `dry_run` 与 `commit`，其中 `commit` 需要 `catalog:review`、`confirmWrite=true` 和操作原因，服务端会把对象素材、素材元数据和章节引用关系幂等写入 PostgreSQL，缺少 `DATABASE_URL` 或目标 Store 不支持引用写入时返回冲突。`GET /api/catalog/admin/course-products/assets/governance` 供具备 `catalog:read` 的后台账号读取素材治理摘要，返回未引用素材、重复 `contentHash`、待审/驳回素材、下载关闭学习资料、软删候选、缺失商品素材和引用来源；当 Store 支持引用表时读取 `course_product_asset_references`，否则从章节 `materialPlaceholders` 推导。`GET /api/catalog/admin/course-products/assets/governance/history` 供具备 `catalog:read` 的后台账号按素材、商品、动作、问题类型、操作者和日期范围读取 `asset_governance` 历史摘要；`GET /api/catalog/admin/course-products/assets/governance/batch-draft` 供具备 `catalog:review` 的后台账号生成批量治理草稿预览，仅返回候选数量、问题类型分布、拟处理动作分布和安全提示，不修改素材 Store、不写审计、不读取原始文件和不暴露对象签名 URL。`GET /api/catalog/admin/course-products/assets/governance/batch-action-plan` 供具备 `catalog:review` 的后台账号生成高风险批量动作只读预案，支持 `all`、`mark_duplicate_primary` 和 `mark_soft_deleted` 动作筛选，可按商品和预览数量收敛范围；返回重复素材主素材建议、引用合并影响、软删除候选影响、风险摘要和安全提示，并固定声明只读、不可执行、不修改素材 Store、不写审计。`GET/POST /api/catalog/admin/course-products/assets/governance/batch-tasks` 供具备 `catalog:review` 的后台账号读取和创建批量治理任务草案，列表可按审批状态、执行状态、创建人、执行人、问题筛选、动作和日期范围检索；第一版只允许保存 `acknowledge_issue` 待审批草案，创建时会重新计算预览并拒绝空候选或同筛选重复待审批草案；`PATCH /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/review` 支持审批通过和驳回，非管理员不能审批自己创建的草案，通过审批前会重新计算候选范围、问题类型和仍可执行数量，候选漂移过大时保持待审批并返回重建提示；`GET /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execution-plan` 只允许已审批且审批预检未要求重建的草案生成执行只读预案，输出逐素材计划/跳过原因、风险等级、预计审计事件数量和安全提示；`GET /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execution-detail` 可重新读取已审批任务的执行详情，返回执行预案、执行摘要、逐素材结果、跳过/失败原因和关联审计事件；`POST /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execute` 只允许已审批任务在 `confirmExecution=true` 和执行原因存在时受控执行，第一版仅支持 `acknowledge_issue`，执行前重新生成预案，漂移项跳过，成功项写入 `asset_governance` 审计和任务执行结果，重复执行已完成任务会幂等回放；`PATCH /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/cancel` 仅允许草案创建人或管理员取消待审批草案。`POST /api/catalog/admin/course-products/:productId/assets/:assetId/governance-actions` 供具备 `catalog:review` 的后台账号执行单素材治理动作，当前支持记录处理、标记重复主素材和软删除确认；服务端会校验问题类型仍匹配、重复主素材属于同一 hash 分组、软删除候选无引用，并写入 `asset_governance` 审计事件，不做批量处理或物理删除。`GET/POST /api/catalog/admin/course-products/:productId/assets` 供具备 `catalog:read` / `catalog:edit` 的后台账号读取素材队列和登记外部 URL 素材；`POST /api/catalog/admin/course-products/:productId/assets/files` 供运营上传开发期文件素材，JSON Store 保存 `storageKey/objectKey`、`contentHash`、文件名、MIME、大小、合规状态和上传人；显式开启 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=postgres` 后，素材元数据会映射到 `course_product_assets`，对象素材会同步 `course_product_asset_objects`。`GET /api/catalog/admin/course-products/:productId/assets/:assetId/download` 供后台只读下载对象存储文件；`PATCH /api/catalog/admin/course-products/:productId/assets/:assetId/compliance` 供具备 `catalog:review` 的账号将素材标记为通过或驳回，章节资料、练习表、音频和视频通过后可开启下载。素材登记、合规和治理动作会写入课程商品审计事件 `asset_upload` / `asset_review` / `asset_governance`；批量治理任务草案和审批只保存任务记录，执行只追加批量 `asset_governance` 审计和任务执行结果，不修改素材 Store、不合并引用、不软删和不物理删除对象；回填写入当前通过 backfill 结果记录操作者和原因。后台内容编辑器可把已通过且开启下载的学习资料绑定到章节 `materialPlaceholders`，自动写入 `assetId`、`/api/courses/:courseId/assets/:assetId/download`、上传人、上传时间、合规状态和下载开关；内容保存仍触发课程复审。学习页只展示 `ready + approved/not_required + downloadEnabled` 且未软删除的章节资料入口，待审、驳回、下载关闭或 `deletedAt` 的素材不会暴露 URL。

`GET /api/memberships/product` 是用户端会员商品公共快照接口，返回 `CourseMembershipProductSnapshotSchema`，只包含 active 商品与 active 套餐，不返回审计记录；当商品或套餐不可售时返回业务冲突错误，用户端据此进入不可购买状态而不是继续展示可下单 fallback，服务端通过 `details.reason` 区分商品暂停和无可售套餐。`GET/PATCH /api/memberships/admin/product` 供具备 `membership_product:read` / `membership_product:manage` 的后台账号读取和维护 `CourseMembershipProductAdminConsoleSchema`，包括会员商品文案、首图、权益范围、商品状态、套餐列表和最近审计。`PATCH /api/memberships/admin/plans/:planId` 支持套餐改价和套餐展示字段受控更新，入参通过 `CourseMembershipPlanUpdateRequestSchema` 校验；`PATCH /api/memberships/admin/plans/:planId/status` 支持暂停或恢复套餐售卖，入参通过 `CourseMembershipPlanStatusUpdateRequestSchema` 校验。所有会员商品写动作必须携带操作原因，并写入 `CourseMembershipProductAdminAuditEventSchema`。

快速测评题库位于 `shared/data/assessmentQuestions.ts`，通过 `GET /api/assessments/quick` 暴露，通过 `POST /api/assessments/quick/report` 生成维度分、风险等级、推荐路径和可选风险事件；`GET /api/assessments/latest` 返回当前登录用户最近一次测评报告。咨询师与排班 seed 位于 `shared/data/counselingSeed.ts`，前台 `GET /api/counseling/availability` 会读取咨询师档案 overlay，只有服务状态活跃、允许接新客且资质已通过或临近到期提醒的咨询师才进入可预约列表；`GET/PUT /api/counseling/admin/counselors` 供运营/管理员读取和维护 `CounselorAdminProfileConsoleSchema`，支持服务状态、接单开关、资质状态、资质到期时间和基础展示资料，写动作会进入咨询运营审计；`POST /api/counseling/appointments` 生成待支付预约单、锁定时段、同步生成 `counseling_session` 待支付订单、保存关联测评报告 ID，并根据咨询前信息生成可选风险事件；`GET /api/counseling/admin/schedules` 供运营/管理员读取 `CounselingAdminScheduleConsoleSchema`，按咨询师展示未来排班、服务状态、可预约/锁定/已预约/已关闭时段和冲突提示；`POST /api/counseling/admin/schedules` 通过 `CounselingAdminScheduleActionRequestSchema` 执行新增可预约时段、关闭未预约时段和恢复已关闭时段，复用 `counselingAppointmentStore` 的 slot 数据，锁定或已预约时段不可被直接覆盖，动作写入 `CounselingOperationAuditEventSchema`；`GET /api/counseling/admin/service-records` 供运营/管理员读取 `CounselingServiceRecordConsoleSchema`，从预约、订单、时段、咨询师、风险事件和咨询运营审计聚合服务记录、异常标签和摘要指标，只展示运营履约所需字段。`GET /api/risk/admin/events`、`GET /api/risk/admin/events/:riskEventId` 和 `PATCH /api/risk/admin/events/:riskEventId/actions` 供具备 `risk:read`/`risk:review` 的后台账号读取风险复核队列、查看隐私最小化详情并写入处理记录；服务端从风险事件 Store、auth 用户目录、测评报告、咨询预约记录、风险复核记录和 SOP Store 聚合摘要，处理动作通过状态机推进 `open/reviewing/escalated/resolved`，并可在升级时写入升级队列。`GET /api/risk/admin/sop` 供具备 `risk:read` 的后台账号读取 SOP 模板和升级队列摘要；`PATCH /api/risk/admin/sop/templates/:templateId` 供具备 `risk:sop` 的管理员启停或维护 SOP 模板，PostgreSQL 版 Store 会保存操作者、角色、原因和 before/after 摘要。`GET /api/audit/admin/events` 供具备 `audit:read` 的后台账号读取 `AuditCenterListResultSchema`，从课程商品、会员、订单、交易、咨询运营和风险复核既有审计事实聚合跨模块只读列表，并支持模块、动作、操作者、资源关键词和日期范围筛选；`GET /api/audit/admin/archive/verification` 供具备 `audit:archive` 的管理员读取 `AuditCenterArchiveVerificationResultSchema`，对比归档表和当前聚合口径的总数、模块差异、最近批次和最近归档事件摘要，不返回 raw payload。`POST /api/payments/webhooks/simulated` 接收统一的 `payment.succeeded` / `refund.succeeded` 支付事件并驱动咨询订单、预约确认、咨询退款完成和课程订单退款完成；课程 `refund.succeeded` 只更新真实存在且金额匹配的课程权益订单，并在订单进入 `refunded` 后自动收尾同订单售后工单。配置 `HONGBOSHI_PAYMENT_WEBHOOK_SECRET` 后会校验 `x-hongboshi-payment-timestamp` 与 `x-hongboshi-payment-signature`，并通过 `payment_webhook_events` 收据表/内存 Store 保证同一事件幂等；`GET /api/payments/admin/reconciliation` 供运营/管理员读取 `PaymentReconciliationConsoleSchema`，对比支付回调收据、课程/咨询业务订单和咨询预约状态；`GET /api/transactions/admin/transactions` 与详情接口供具备 `transaction:read` 的后台账号读取 `TransactionAdminListResultSchema` 和 `TransactionAdminDetailSchema`，聚合支付/退款流水、回调处理状态、订单、业务对象和异常摘要；`GET /api/finance/admin/overview` 供具备 `finance:read` 的后台账号读取 `FinanceAdminOverviewSchema`，聚合收入、退款、净收款、退款中金额、异常金额、渠道/业务类型分布和财务明细；`GET /api/finance/admin/export` 供具备 `finance:read` 的后台账号按当前筛选条件导出 `FinanceAdminExportSchema` 对应 CSV，文件内包含生成时间、筛选条件、汇总金额、口径版本和账期/手续费/结算/发票预留字段；`GET/PUT /api/finance/admin/rules` 供具备 `finance:read` 的后台账号读取规则和结算预览，具备 `finance:manage` 的后台账号维护渠道手续费规则；`POST /api/counseling/appointments/:appointmentId/actions` 执行确认支付、取消和改期，其中确认支付会生成一条模拟支付成功事件，再复用同一套 webhook 处理器把关联订单置为 `paid` 并驱动预约进入已预约；取消动作统一通过可配置的 `evaluateCounselingCancellation` 策略决策，待支付取消会关闭订单并释放原时段，已确认取消会把订单置为 `refunding` 并释放时段，退款完成必须由 `refund.succeeded` 回调驱动；已确认预约的 `reschedule` 会释放原时段并锁定新的可用时段。`POST /api/counseling/appointments/:appointmentId/fulfillment` 供咨询师/运营标记服务完成或未到访并写入 `CounselingOperationAuditEventSchema`；`GET /api/counseling/workbench/appointments` 供咨询师读取本人预约，运营/管理员读取全部咨询师预约，并返回 `CounselingWorkbenchSchema` 汇总；`GET /api/counseling/admin/operations` 和 `PUT /api/counseling/admin/cancellation-policy` 供运营/管理员读取运营控制台与更新 `CounselingCancellationPolicySchema`。待支付预约超过 30 分钟会在咨询可用时段、预约列表、工作台、成长档案、服务记录和预约操作读取时自动取消、关闭订单并释放时段；`GET /api/counseling/appointments` 返回当前用户的预约记录摘要。`GET /api/growth/profile` 需要登录，聚合课程权益、订单、最新测评报告、咨询预约摘要和成长时间线，作为个人成长空间的服务端视图。`GET /api/users/admin/users` 与 `GET /api/users/admin/users/:userId` 供具备 `user:read` 的后台账号读取用户会员列表与隐私最小化详情，`PATCH /api/users/admin/users/:userId/membership` 供具备 `user:membership` 的后台账号执行会员开通、延期、标记到期和计划调整，并写入会员操作审计；服务端从 auth 用户目录、课程权益、咨询预约和风险事件 Store 聚合，缺少真实用户目录时会提供开发期 fallback 用户。课程目录查询逻辑位于 `shared/domain/courseCatalog.ts`，课程权益逻辑位于 `shared/domain/courseAccess.ts`，测评评分逻辑位于 `shared/domain/assessmentEngine.ts`。登录会话由 `/api/auth/session` 和 `/api/auth/login/*` 提供，服务端优先通过 HttpOnly session cookie 识别用户；课程购买、会员开通、咨询预约和成长档案读取通过登录会话识别用户，并在登录时记录 terms/privacy 协议版本。课程权益读取仍保留 `x-hongboshi-user-id` 作为开发期兜底；登录会话、课程权益、会员商品、会员操作审计、课程商品、课程商品详情内容、测评结果、咨询预约、咨询运营配置/审计、风险事件、风险复核处理记录、风险 SOP 模板与升级队列、支付回调收据和交易操作审计已经拆出 Store 接口，核心 Store 已有 PostgreSQL 实现或 JSON/内存实现；财务规则已拆出 `FinanceRuleStore`，咨询师档案已拆出 `CounselorAdminProfileStore`，两者当前支持内存/JSON 文件，后续可补 PostgreSQL Store；审计中心当前是跨 Store 只读投影，不新增业务状态表；咨询预约数据库实现依赖 `uniq_active_counseling_slot` 避免同一时段被重复占用，并通过 `order_id` 关联订单；咨询排班运营基础复用 `counseling_slots.available` 和活跃预约状态派生 `available/locked/scheduled/closed`，服务记录基础复用预约、订单、时段、风险事件和审计 Store 派生，不新增临床记录数据源；咨询运营数据库实现通过 `counseling_operation_settings` 保存规则快照，通过 `counseling_operation_audit_events` 追加记录规则变更、排班动作、履约状态变化和咨询师档案/接单状态变化。后续接数据库时，API 返回结构应继续通过 `LoginSessionSchema`、`UserAdminListResultSchema`、`UserAdminDetailSchema`、`UserAdminMembershipMutationResultSchema`、`CourseMembershipProductAdminConsoleSchema`、`CourseMembershipProductAdminMutationResultSchema`、`CourseCatalogResultSchema`、`CourseProductListResultSchema`、`CourseProductMutationResultSchema`、`CourseProductContentMutationResultSchema`、`CourseProductContentQualityBatchResultSchema`、`CourseAccessStateSchema`、`AssessmentFlowSchema`、`AssessmentResultSchema`、`CounselingAvailabilitySchema`、`CounselingAppointmentCreateResultSchema`、`CounselingAppointmentActionResultSchema`、`CounselingAppointmentListSchema`、`CounselingWorkbenchSchema`、`CounselingOperationsConsoleSchema`、`CounselingAdminScheduleConsoleSchema`、`CounselingAdminScheduleMutationResultSchema`、`CounselorAdminProfileConsoleSchema`、`CounselorAdminProfileMutationResultSchema`、`CounselingServiceRecordConsoleSchema`、`PaymentReconciliationConsoleSchema`、`TransactionAdminListResultSchema`、`TransactionAdminDetailSchema`、`FinanceAdminOverviewSchema`、`FinanceAdminExportSchema`、`FinanceAdminRuleConsoleSchema`、`RiskAdminListResultSchema`、`RiskAdminDetailSchema`、`RiskAdminMutationResultSchema`、`RiskSopConsoleSchema`、`RiskSopTemplateMutationResultSchema`、`AuditCenterListResultSchema`、`AuditCenterArchiveResultSchema`、`AuditCenterArchiveVerificationResultSchema`、`GrowthProfileSchema` 和 `CourseSchema` 校验。

审计中心补充：`GET /api/audit/admin/events/:eventId` 供具备 `audit:read` 的后台账号按审计中心归一化事件 ID 读取 `AuditCenterDetailResultSchema`，定位来源模块、源事件 ID 和资源摘要；`GET /api/audit/admin/export` 供具备 `audit:read` 的后台账号按当前筛选条件导出 `AuditCenterExportSchema` 对应 CSV，导出剥离分页并包含生成时间、筛选条件、操作者、口径版本、字段定义、模块汇总和 before/after 摘要。`POST /api/audit/admin/archive` 供具备 `audit:archive` 的管理员按模块、动作、操作者、资源关键词和日期窗口手动归档当前聚合事件，返回批次 ID、成功数、跳过数和失败摘要；归档前会把事件映射为 `AuditCenterArchiveEventSchema` 并通过 schema 校验，再写入只追加归档表。`GET /api/audit/admin/archive/verification` 同样要求 `audit:archive`，只读取归档表和当前聚合结果，返回 `AuditCenterArchiveVerificationResultSchema` 的数量差异、模块差异、最近批次和最近归档事件摘要，不暴露敏感原文，也不切换审计主列表来源。`GET /api/audit/admin/archive/events` 供具备 `audit:archive` 的管理员读取归档表摘要预览，支持模块、批次、动作、操作者、关键词、发生日期和归档日期筛选，普通 `audit:read` 账号不能调用。后续 API 返回结构应同步通过 `AuditCenterDetailResultSchema`、`AuditCenterExportSchema`、归档事件/校验契约和 `AuditCenterArchiveSearchResultSchema` 校验。

交易动作补充：`PATCH /api/transactions/admin/transactions/:transactionId/actions` 供具备 `transaction:operate` 的后台账号执行退款申请、标记异常和解决异常，入参通过 `TransactionAdminActionRequestSchema` 校验，并通过 `TransactionOperationStore` 写入交易异常工单和操作审计。退款申请必须先校验流水处理状态、关联订单状态和异常状态，再调用 `TransactionRefundProvider` 取得受理结果；受理失败或拒绝只写审计，不修改订单，受理成功后只进入 `refunding`，不制造 `refund.succeeded` 成功态。

## 服务端 Store 边界

- 课程权益：`server/modules/courses/courseAccessStore.ts` 已支持 JSON 文件和内存实现，并保存会员后台操作审计事件。
- 课程学习记录：`server/modules/courses/courseLearningRecordStore.ts` 负责登录用户的章节进度、练习记录、课程完成快照和阶段证明预览准备；当前支持内存/JSON 文件 `.hongboshi-data/course-learning-records.json`，API 写入前会读取课程权益 Store 校验用户已解锁课程。后续接 PostgreSQL 时应新增独立 Store，而不是把学习进度混入课程权益订单事实。
- 用户偏好：`server/modules/users/userPreferenceStore.ts` 负责登录用户的账号级偏好，当前支持内存/JSON 文件 `.hongboshi-data/user-preferences.json`，保存收藏课程 ID、收藏来源、券包领取/使用状态、关联订单和时间戳。偏好不进入课程学习记录；课程订单只保存 `couponApplication` 作为交易关联快照，金额口径仍复用服务端营销规则。后续接 PostgreSQL 时应独立落表，供收藏同步、优惠券领取状态、核销追踪和运营召回使用。
- 售后退款收尾：`server/modules/orders/orderAfterSalesRefundCompletion.ts` 负责支付退款成功后的售后自动收尾，只处理同订单、同用户、状态为 `linked_to_refund` 的售后工单；写入的审计 action 仍为 `resolve`，操作者固定为 `system_payment_webhook`，用户通知通过 `refund_completed` 摘要承接，不保存支付 raw payload。
- 用户会员后台：`server/modules/users/userAdminApi.ts` 负责用户会员聚合与会员权益后台动作，读取 auth 用户目录、课程权益、咨询预约和风险事件 Store，只输出脱敏手机号和摘要字段；会员操作由服务端计算状态、校验原因并写入审计。
- 订单后台：`server/modules/orders/orderAdminApi.ts` 负责课程、会员和咨询订单聚合，读取课程权益订单、咨询预约记录、支付回调收据和 auth 用户目录，只输出履约与对账所需摘要；订单写动作只接受受控意图，关闭待支付订单复用订单状态机，异常标记写入异常摘要与审计事件。
- 交易后台：`server/modules/transactions/transactionAdminApi.ts` 负责支付/退款流水聚合与受控交易动作，读取支付回调收据、课程权益订单、咨询预约快照、订单异常标记、交易异常工单和 auth 用户目录，只输出对账、履约排障和客服核查所需摘要；写动作通过 `server/modules/transactions/transactionOperationStore.ts` 保存交易异常工单和操作审计，通过 `server/modules/transactions/transactionRefundProvider.ts` 调用人工/模拟退款受理接口。退款申请只在渠道受理成功后把合规订单推进到 `refunding`，不直接完成退款或伪造渠道成功；渠道失败会写入受理摘要审计。
- 会员商品：`server/modules/memberships/courseMembershipProductStore.ts` 负责成长会员商品、套餐价格、套餐状态和会员商品审计事件；当前支持内存/JSON 文件 `.hongboshi-data/course-membership-product.json`，默认从 `defaultCourseMembershipProduct` 初始化。后台 API、用户端公共快照 API 和会员 checkout 创建都通过该 Store 读取会员商品配置，避免结算金额和展示商品长期停留在前端默认配置。
- 财务后台：`server/modules/finance/financeAdminApi.ts` 负责收入、退款、净收款、待退款和异常金额只读聚合，读取支付回调收据、课程/会员/咨询订单、交易异常工单和 auth 用户目录；财务口径由服务端统一计算，前端只展示聚合结果和口径说明。CSV 导出复用同一聚合逻辑，输出生成时间、操作者、筛选条件、汇总金额、口径版本和稳定字段定义，并为账期、手续费、结算批次和发票状态预留字段。`server/modules/finance/financeRuleStore.ts` 负责自然月账期和渠道手续费规则，开发期支持内存/JSON 文件 `.hongboshi-data/finance-rules.json`；`/api/finance/admin/rules` 读取规则、维护规则并基于同一财务明细生成结算预览。
- 课程商品：`server/modules/catalog/courseProductStore.ts` 负责后台课程商品快照、筛选、排序、分页、汇总、写动作、审核状态流和审计事件；当前支持内存、JSON 文件与 PostgreSQL Store，并为前台 `/api/courses` 提供已审核通过且已上架课程映射。`server/modules/catalog/catalogApi.ts` 将读取、编辑、审核、发布和改价分别绑定到 `catalog:*` 权限。
- 课程详情内容：`server/modules/catalog/courseProductContentStore.ts` 负责课程摘要、适合人群、章节、素材占位和批量质量校验；当前支持内存、JSON 文件与 PostgreSQL Store，内容更新会写入课程商品审计并触发复审。素材占位已保存 `assetId`、受控 `assetUrl`、上传人、上传时间、下载开关和合规审核状态，学习页会消费已通过且开启下载的占位资料；`docs/course-asset-storage-architecture.md` 已明确后续对象存储 adapter、素材专表、引用表和回填策略，后续可在不改变前台读取契约的前提下切换正式素材 Store。
- 课程素材治理任务：`server/modules/catalog/courseProductAssetGovernanceBatchTaskStore.ts` 负责保存批量治理任务草案和执行状态，当前支持内存、JSON 文件 `.hongboshi-data/course-product-asset-governance-batch-tasks.json` 与显式 PostgreSQL Store；`server/modules/catalog/postgresCourseProductAssetGovernanceBatchTaskStore.ts` 会把任务头、候选快照、执行明细和执行审计事件 ID 写入 `course_product_asset_gov_batch_*` 表，并保留幂等键、执行锁、执行尝试次数、最近失败原因和失败时间字段。第一版任务保存 `acknowledge_issue` 待审批草案、审批/驳回记录、审批前预检、取消记录、执行状态、执行摘要、执行明细和审计事件 ID；`CourseProductAssetGovernanceBatchTaskExecutionJobSchema` 描述队列 job 的 queued/running/succeeded/failed 状态、尝试次数和执行摘要，`CourseProductAssetGovernanceBatchTaskQueueObservationResultSchema` 只读聚合最近 job、失败原因、可重试压力和运营提示。执行 service 已抽出可复用 worker，HTTP execute 入口和未来队列消费者共享同一状态机；执行前先抢占 Store 锁，失败任务可安全重试，已完成任务幂等回放，并发执行会被拒绝。不修改素材 Store、不合并引用、不软删和不物理删除对象。任务列表已支持审批/执行状态、创建人、执行人、问题筛选、动作和日期范围检索，执行详情可脱离弹窗内存态重新读取，并展示最近失败原因；`CourseProductLearningMaterialOperationsReportSchema` 只读描述学习资料槽位绑定率、资料素材类型、合规状态、下载开放、引用来源、治理问题分布和课程维度问题行；`CourseProductAssetGovernanceBatchActionPlanResultSchema` 只读描述重复素材主素材建议、引用合并影响、软删除影响和不可执行安全边界。后续应补真实批量处理执行开关、二次审批和写入边界。
- 测评结果：`server/modules/assessments/assessmentResultStore.ts` 负责按用户保存与读取最新报告。
- 咨询预约：`server/modules/counseling/counselingAppointmentStore.ts` 负责时段、预约单和预约关联风险事件；运营排班动作复用同一 slot 存储，关闭时段表示为 `available=false` 且无活跃预约；服务记录读取同一预约/时段事实源并只输出运营履约摘要。
- 咨询师档案：`server/modules/counseling/counselorAdminProfileStore.ts` 负责 seed 咨询师档案 overlay、接单开关、资质状态、资质到期时间和展示资料维护；前台可预约列表和后台排班/服务记录读取同一份咨询师档案，避免前后台展示漂移。
- 咨询运营：`server/modules/counseling/counselingOperationStore.ts` 负责取消规则以及规则、排班、履约、咨询师档案和服务状态审计；服务记录会读取最近审计动作作为运营追溯上下文。
- 风险复核：`server/modules/risk/riskAdminApi.ts` 负责风险事件队列、隐私最小化详情、SOP 模板匹配、升级队列和受控处理动作，读取风险事件 Store、auth 用户目录、测评结果、咨询预约、`RiskReviewStore` 和 `RiskSopStore`。`server/modules/risk/riskReviewStore.ts` 支持内存、JSON 文件 `.hongboshi-data/risk-reviews.json` 和 PostgreSQL，处理记录只保存处理摘要、操作者、角色、动作、前后状态、SOP 模板版本、升级摘要和时间。`server/modules/risk/riskSopStore.ts` 支持内存、JSON 文件 `.hongboshi-data/risk-sop.json` 和 PostgreSQL，保存默认 SOP 模板、模板启停、结果模板、升级队列以及模板/升级队列的审计投影字段。
- 审计中心：`server/modules/audit/auditAdminApi.ts` 负责跨模块审计只读聚合，读取课程商品审计、会员操作审计、订单操作审计、交易操作审计、咨询运营审计和风险复核记录，统一映射为 `AuditCenterEventSchema`；导出和详情复用同一套权限、筛选和隐私边界，导出只生成 CSV 投影，详情只定位来源模块和源事件 ID。`server/modules/audit/auditArchiveStore.ts` 与 `postgresAuditArchiveStore.ts` 负责统一审计归档，按 `AuditCenterArchiveEventSchema` 校验后写入 `audit_center_archived_events`，并为只读校验提供总数、模块计数、最近批次和最近归档事件摘要读取能力，为只读检索预览提供模块、动作、操作者、批次、资源关键词、发生日期和归档日期筛选，支持 `HONGBOSHI_AUDIT_ARCHIVE_STORE=memory/postgres`。统一审计 Store 方案见 `docs/audit-store-architecture.md`，归档任务保持只追加、摘要级、幂等回填和可追溯边界。
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
- 学习记录同步：`local_only / sync_pending -> synced`
- 阶段证明：`preview -> pending_review -> issued`
- 测评风险：`low -> medium -> high -> urgent`

这些流程后续不要依赖零散布尔字段，应集中在 service 或状态机函数中维护。
