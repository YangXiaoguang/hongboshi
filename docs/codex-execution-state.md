# Codex 连续执行状态

> 这个文件是后续“进行下一步”的主要记忆来源。每次完成一个阶段或关键步骤后，必须更新本文件，再提交并推送。

## 当前指针

- 最后更新时间：2026-06-02 Asia/Shanghai
- 当前分支：`main`
- GitHub 仓库：`https://github.com/YangXiaoguang/hongboshi.git`
- 最近已知基线提交：本轮提交后以 Git 历史最新提交为准
- 当前阶段：`M7 咨询运营增强`
- 当前状态：`M7-H 咨询师用户端详情增强与咨询转化体验` 已完成；`/consulting` 从普通列表预约升级为咨询师优先的转化页面，新增推荐咨询师选择器、咨询师深度资料卡、匹配标签、最近可约时段摘要、可预约时段区、隐私提示、右侧预约单和移动端底部预约条，用户可通过 `/consulting?counselorId=...` 直达某位咨询师并顺畅切换。课程商品 `ADM-PRO-T-A` 暂缓，待本轮咨询运营体验稳定后继续。
- 本轮完成后下一步：执行 `M7-I 咨询预约待支付召回与个人中心承接体验`

## 已完成关键能力

- 项目已提交到 GitHub，并以 `main` 作为持续开发分支。
- 建立连续执行基建：后台路线图、Codex 执行状态和操作协议已进入仓库。
- 建立统一 `/admin` 运营管理后台框架，提供后台首页、侧边导航、移动端导航和统一权限守卫。
- 完成后台壳分离第一刀：后台登录、无权限、授权后工作台不再复用用户端 `AppHeader`；新增后台专用顶栏、模块上下文、用户端返回入口、通知入口和退出入口。
- `/admin/counseling` 和 `/admin/payments` 已接入统一后台 shell，原 URL 保持可用。
- 顶部用户菜单的运营入口已统一指向 `/admin`。
- 完成课程商品与课程素材治理代码级拆分第二刀：`/admin/course-assets/governance` 独立拥有治理数据加载、单素材治理、批量草案、审批、取消和执行预案弹窗；`/admin/courses` 删除 `workspace` 分支，只保留商品列表、基础编辑、价格/审核/上下架入口。
- 完成课程商品内容编辑详情页承载：新增 `/admin/courses/:courseId`，将详情文案、成交图文、章节资料、素材上传和合规处理从商品列表页迁出，并支持 `returnTo` 返回原筛选分页。
- 完成课程商品动作弹窗组件化：基础信息、价格、审核和上下架弹窗已拆入 `client/src/pages/admin/courses/*`，列表页继续保留动作状态与刷新编排，并新增弹窗静态渲染回归。
- 完成新增课程商品与商品编辑工作台壳：新增 `POST /api/catalog/admin/course-products`、`product_create` 审计动作、`/admin/courses/new` 与 `/admin/courses/:courseId/edit` 后台路由；课程商品列表新增“新增商品”和“工作台”入口，工作台已按基础信息、商品图片、价格权益、H5 详情和发布审核组织后续编辑能力。
- 完成商品图片管理与 H5 富文本编辑器底座：`CourseProductDetailContentSchema` 新增受控 `richTextBlocks`，支持标题、正文、图片、要点、FAQ、讲师介绍和购买须知；商品工作台会加载既有详情内容，图片步骤可维护成交主视觉、详情图和证明图，H5 步骤可维护摘要、适合人群、卖点和结构化内容块，并提供移动端预览。
- 完成商品编辑工作台减负修正：取消左侧 5 步竖向导航和右侧常驻发布面板，改为顶部流程条、紧凑发布状态条和可展开发布详情，让基础信息、商品图片、价格权益与 H5 编辑拥有完整横向空间。
- 完成商品图片编辑减负与开发期免审核链路：商品工作台图片步骤改为上传即用，图片状态不再打断主视觉、详情图和 H5 图片块选择；前台课程详情模型会渲染后台维护的成交图文图片，公开图片读取不再要求成交图先过素材审核，学习资料下载仍保留原权限和审核边界。
- 完成商品图片排序、批量选择与自动保存体验：可用图片支持勾选多张批量加入详情图，单张设主图/加入详情、上传图片和详情图排序都会自动保存到商品详情；手动标题、说明、URL 修改继续保留独立保存入口。
- 完成前台 H5 内容块消费：课程详情页读取 `merchandising.richTextBlocks`，按标题、正文、图片、要点、FAQ、讲师介绍和购买须知渲染课程图文介绍，不使用任意 HTML，缺失时继续保留现有成交展示结构。
- 完成课程商品运营体验降复杂度修正：商品工作台图文内容默认进入简化编辑，可一键生成成交摘要、适合人群、卖点和移动端详情；图片上传支持 MIME 兜底、大小提示、默认操作原因和主视觉直传，服务端 JSON body limit 与 20MB 素材上限匹配；用户端课程详情新增购买决策条，并对长图文详情做渐进展开。
- 完成课程商品详情装修器 Lite 首个切片：图文内容页升级为三栏结构（页面结构/内容编辑/样式面板 + 移动预览），详情图和 H5 图片块支持受控样式（风格、留白、圆角、比例、适配、说明展示），用户端课程详情按同一份结构化样式渲染，旧内容编辑页保存时保留样式字段。
- 完成详情装修器模板化与组件抽取第一刀：抽出 `courseProductDetailDesigner` 模型和左右面板组件，新增温暖课程型、下单决策型、图文故事型三套受控模板；模板可补齐空白文案、重排 H5 区块、统一图片/段落样式，并用单测固定结构化输出。
- 完成详情装修器区块编排与模板草案持久化：H5 区块支持上移、下移、复制和删除确认；右侧整体面板新增服务端运营模板库，可读取系统模板、保存个人模板、套用和删除个人模板，保存当前区块结构、文案和样式，套用后仍需通过既有图文内容保存进入服务端 `content_update`。
- 完成详情装修器服务端模板库与动作审计：新增详情模板共享契约、开发期 JSON Store、读取/创建/删除/套用 API、前端 repository 和工作台接入；模板库区分系统、团队和个人作用域，首版开放系统模板读取与个人模板写入；模板保存、套用和删除会写入模板动作审计。
- 完成详情模板库管理与团队共享申请：商品编辑工作台新增模板库管理弹窗，支持系统/团队/个人筛选、关键词搜索、模板详情预览、区块摘要、审计时间线、套用/删除和个人模板申请团队共享；服务端新增共享申请契约、API、状态和 `template_share_request` 审计。
- 完成图文内容富文本快编减负：商品编辑工作台“图文内容”默认展示轻量富文本摘要、适合人群、成交卖点、结构化详细图文编辑器和手机预览；原页面结构、样式面板、模板库和复杂区块控制收进“高级装修”，默认不再打断运营主路径。
- 完成 H5 图片块素材选择增强与发布前预览收口：H5 图片块可从商品图片中一键填入图片地址、说明和标题；发布设置步骤展示移动成交页预览、价格权益、卖点、详情图、H5 内容块和图文预检提醒。
- 完成工作台审核动作接入与内容质量问题定位：发布审核步骤可直接提交审核、通过、驳回或撤回；服务端提交审核失败会返回结构化质量问题，工作台按问题路径跳转到商品图片、H5 详情或课程内容详情页。
- 完成工作台上架状态联动与商品中心发布队列减负：发布审核步骤可直接执行上架/下架，展示商品草稿、内容审核、上架状态和前台可售状态流；商品中心列表行收敛为“工作台”和“发布管理”，基础信息/价格/内容编辑优先进入工作台。
- 完成发布设置去审核化与一键上架体验：发布设置页默认隐藏审核动作和流程状态，聚焦前台售卖状态、移动成交页预览、发布前检查和保存并上架/下架主动作；一键上架会自动保存图文内容并通过服务端质量校验与审计。
- 完成发布后前台回看与购买链路验证入口：发布设置页可在前台可售后直接打开用户端详情页和课程购买抽屉，帮助运营发布后立即验证成交图文与下单入口。
- 完成课程商品列表行与筛选组件化：`CourseProducts.tsx` 仅保留查询、权限、分页和动作弹窗编排；指标、最近审计、筛选条、列表行和展示格式化逻辑已拆入 `client/src/pages/admin/courses/*`，为后续发布队列分组和批量操作预案预留边界。
- 完成课程商品发布队列只读预案：课程商品中心按待补内容、待提交审核、待审核、待上架和已上架复查分组，并展示批量提交审核、审核跟进、批量上架和已发布复查的 preview-only 预案。
- 完成课程商品发布队列服务端聚合与批量草案：新增共享契约、服务端聚合 API、内存/JSON 草案 Store 和后台草案入口；草案记录筛选条件、候选快照、阻塞摘要、风险分布、创建人和原因，不写课程商品审计事件，不执行批量状态变更。
- 完成课程商品发布队列草案审批与漂移预检：草案支持 `draft -> pending_approval -> approved/rejected/canceled`，非管理员不可自审；审批前会对比候选快照与当前队列，输出消失候选、新增候选、状态/内容质量/风险变化和是否需要重建；后台发布队列面板已提供提交、预检、通过、驳回和取消入口，仍不执行批量状态变更。
- 完成心理咨询类项目的现代化界面优化。
- 建立产品工程路线文档、领域契约文档、数据库准备文档和课程中心 Feature 架构文档。
- 建立课程中心、课程权益、成长档案、心理测评和咨询预约基础闭环。
- 建立咨询预约订单绑定、支付回调抽象、支付回调签名校验和幂等收据。
- 建立咨询改期、取消、退款、履约动作和咨询师工作台。
- 完成用户端课程优先信息架构：新增 `/courses` 课程列表页，首页首屏改为课程主线，复用课程发现组件并把课程筛选区前置。
- 完成课程路径与推荐转化体验：新增稳定课程路径模型、路径展示组件和快速开始区，路径选择可驱动课程列表筛选。
- 完成课程详情转化与学习计划入口：课程详情展示所属学习路径、权益 CTA、加入学习计划、路径下一课和同主题补充推荐。
- 完成成长空间学习计划承接：`/me/courses` 首屏展示本次继续和下一步建议，并将进行中、收藏待学、已完成课程分区管理。
- 完成课程学习页与章节进度承接：新增 `/courses/:courseId/learn`，可从详情页和成长空间进入章节学习工作台，并复用本地 engagement 记录章节完成状态。
- 完成课程资料与练习记录闭环：学习页按章节展示讲义摘要、练习记录、保存草稿、练习完成状态和课程练习摘要，并通过独立本地 repository 为后续服务端同步预留字段。
- 完成课程完成反馈与阶段证书准备：学习页完成态展示课程总结、练习沉淀、下一步建议和阶段证明预览，证书字段预留 `source`、`syncStatus`、`certificateId` 和 `issuedAt`。
- 完成成长空间学习档案与阶段证明承接：`/me/courses` 已把已完成课程沉淀为学习档案，展示完成时间、章节/练习沉淀、阶段证明预览、复习反馈入口、待补练习提醒和同路径下一步。
- 完成课程商品详情与购买确认体验：`/courses/:courseId` 已补齐商品详情、交易面板、购买确认抽屉、支付方式选择、购买须知校验、支付成功反馈和移动端购买条。
- 完成课程电商化货架主动作：`/courses` 的课程路径、快速开始区和课程列表卡片均前置“开始学习 / 立即购买 / 开通会员”，未解锁课程可带购买意图进入详情页并自动打开结算抽屉。
- 建立课程电商化转化研究文档：`docs/course-commerce-conversion-analysis.md` 记录中国电商购买链路特征、当前断点、CUX-A 到 CUX-G 转化升级路线。
- 完成课程列表半屏下单与待支付召回：购买确认抽屉抽成 `CourseCheckoutDrawer`，`/courses` 可直接下单/支付/取消，待支付订单会在课程中心召回并把卡片主动作切换为“继续支付”。
- 完成课程详情商品信任模块：新增 `courseTrust` 纯模型和购买信任区，详情页前置讲师可信度、学习反馈、内容边界、售后/隐私口径和 FAQ，交易面板展示评分、阶段完成率和信任摘要。
- 完成全局待支付订单召回：新增 `coursePendingCheckout` 纯模型和 `CoursePendingCheckoutBanner` 共享组件，课程中心、课程详情和成长空间复用同一套继续支付/取消订单入口。
- 完成课程优惠与组合购：新增共享 `coursePricing` 和前端 `coursePromotion` 纯模型，课程卡片、快速开始区、详情页和结算抽屉统一展示券后价、本单优惠、会员替代和路径组合预览。
- 完成课程交易界面商品化优化：新增课程商品陈列模型，首页首屏直接展示可购买课程商品，课程中心首屏提供热门课程商品推荐和独立货架，课程卡片默认进入详情页课程介绍区，详情页新增粘性锚点、图文课程亮点区、内容规模/适合状态/核心收获证明点和就近购买动作，降低用户找课与购买路径成本。
- 完成课程详情成交图文素材后台化：`CourseProductDetailContentSchema` 新增 `merchandising` 成交素材契约，后台 `/admin/courses` 可维护主视觉、成交卖点和图文资产，前台课程详情优先使用运营素材，PostgreSQL `course_product_contents.sales_assets` 可保存同一份内容。
- 完成课程素材资产登记、真实文件上传、受控读取与学习页资料绑定基础：新增 `CourseProductAsset*` 共享契约、开发期 JSON Store、本地文件存储 adapter、后台素材读取/URL 登记/文件上传/合规处理 API、审计动作、成交图文图片公开读取、章节资料绑定和已解锁课程资料下载入口。
- 完成课程素材正式存储设计准备：新增素材对象/短期读取 URL/删除结果/引用关系/回填计划共享契约，服务端对象存储 adapter 接口和本地兼容实现，文件上传写入 `objectKey` 与 sha256 `contentHash`，并落下素材对象表、素材元数据表和素材引用表迁移草案。
- 完成课程素材 PostgreSQL Store 与回填 dry-run 基础：新增 `PostgresCourseProductAssetStore`、显式 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=postgres` 切换、对象素材表同步和 `dryRunCourseProductAssetBackfill`，可检查 JSON Store 与章节占位回填到专表前的素材数、引用数和跳过原因。
- 完成课程素材回填写入任务与运营确认入口准备：新增 backfill 请求/结果契约、受控 commit service、PostgreSQL 引用 upsert、后台 `GET/POST /api/catalog/admin/course-products/assets/backfill` 和前端 repository 入口，管理员可先预检再确认写入对象素材、素材元数据和章节引用关系。
- 完成课程素材正式对象存储 provider 与短期读取 URL 接入：新增 local/s3/oss/cos provider 配置解析、远端配置校验、HMAC 短期读取 URL、`.env.example` provider 环境变量、上传/读取路径 object storage adapter 化和课程 API payload 签名 URL 生成，HTTP 路由仍保持服务端权限/合规校验后返回文件流。
- 完成课程素材治理后台与引用报表基础：新增 `CourseProductAssetGovernance*` 共享契约、只读治理 service、`GET /api/catalog/admin/course-products/assets/governance`、前端 repository 读取方法和测试，支持未引用素材、重复 contentHash、待审/驳回、下载关闭资料、软删候选、缺失商品和引用来源识别。
- 完成 `/admin/courses` 素材治理面板接入：课程商品后台并行读取素材治理结果，展示总素材、未引用、重复 hash、待审、驳回、下载关闭、软删候选和引用来源；支持按治理问题筛选、查看素材行建议，并可定位课程或打开既有素材队列，保持只读不引入批量写动作。
- 完成开发期后台账号登录基建：新增 `/api/auth/login/admin-dev`、`AdminDevLoginRequestSchema`、静态后台账号 Store、scrypt 密码哈希校验、后台入口专用登录表单和 `AuthContext.loginWithAdminDev`；默认开发账号与普通用户登录隔离，生产环境默认关闭。
- 完成课程素材治理受控动作：新增 `CourseProductAssetGovernanceAction*` 契约、`POST /api/catalog/admin/course-products/:productId/assets/:assetId/governance-actions`、单素材治理 service、`asset_governance` 审计动作和 `/admin/courses` 行级处理入口；支持记录处理、标记重复主素材和软删除确认，软删除不做物理对象删除且受控读取会拒绝 `deletedAt` 素材。
- 完成课程素材治理历史与批量草稿预览：新增 `CourseProductAssetGovernanceHistory*` 和 `CourseProductAssetGovernanceBatchDraft*` 契约、`GET /api/catalog/admin/course-products/assets/governance/history`、`GET /api/catalog/admin/course-products/assets/governance/batch-draft`、治理历史/草稿 service 和 `/admin/courses` 历史筛选/草稿摘要；批量草稿只读预览，不修改素材 Store、不写审计、不合并引用和不物理删除对象。
- 完成课程素材治理批量任务草案：新增 `CourseProductAssetGovernanceBatchTask*` 契约、内存/JSON Store、`GET/POST /api/catalog/admin/course-products/assets/governance/batch-tasks`、取消草案 API 和 `/admin/courses` 最近草案入口；第一版只允许 `acknowledge_issue` 待审批草案，创建时重新计算预览并拒绝空候选/重复待审批草案，取消仅允许创建人或管理员。
- 完成课程素材治理批量任务审批与预检：批量任务状态扩展为待审批、已通过、已驳回和已取消；新增审批/驳回请求契约、审批前后摘要、候选快照、审批前预检摘要和 `PATCH /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/review`，非管理员不能审批自己创建的草案，审批前候选消失、问题类型变化或数量变化过大时保持待审批并提示重建草案。
- 完成课程素材治理批量任务执行只读预案：新增 `CourseProductAssetGovernanceBatchTaskExecutionPlan*` 契约、只读执行预案 service、`GET /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execution-plan`、前端 repository 和 `/admin/courses` 执行预案面板；仅已审批且无需重建的任务可生成逐素材计划、漂移跳过项、风险等级和预计审计事件数量。
- 完成课程素材治理批量任务受控执行状态机：新增执行请求/结果/明细/摘要契约、`POST /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execute`、执行中/完成/部分完成/失败状态、重复执行幂等回放、漂移候选跳过、批量 `asset_governance` 审计写入和 `/admin/courses` 执行确认交互；第一版只支持 `acknowledge_issue`，不修改素材 Store、不合并引用、不软删和不物理删除对象。
- 完成课程素材治理批量任务执行历史增强：扩展批量任务查询契约和 service 筛选，新增执行详情读取 API、前端 repository 和 `/admin/courses` 批量任务筛选/分页/执行明细复盘；已执行任务可脱离弹窗内存态重新打开，查看执行摘要、执行项结果、跳过/失败原因和关联审计事件。
- 完成课程素材治理批量任务 PostgreSQL Store 与索引准备：新增 `0021_course_product_asset_governance_batch_tasks.sql`、`PostgresCourseProductAssetGovernanceBatchTaskStore`、显式 `HONGBOSHI_COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STORE=postgres` 切换、任务头/候选快照/执行明细/执行审计事件 ID 表、幂等键、执行锁预留字段和查询索引。
- 完成课程素材治理批量任务异步队列与安全重试边界：新增执行 job 契约、最小内存队列、可复用执行 worker、执行锁 helper、Store 锁接口、PostgreSQL 原子抢锁/释放、失败尝试次数与最近失败原因字段；失败任务可安全重试，并发执行会被锁拒绝，后台任务列表展示“可重试”和最近失败线索。
- 完成课程素材治理队列观测与学习资料运营报表基础：新增批量任务队列观测契约、队列 job 列表读取、只读观测 service/API、前端 repository 和 `/admin/courses` 队列摘要；新增学习资料运营报表契约/service/API/repository，聚合章节资料槽位绑定率、资料素材类型、合规、下载开放、引用来源和治理问题分布，保持不新增批量写动作。
- 完成课程素材治理批量软删与引用合并只读预案：新增 `CourseProductAssetGovernanceBatchActionPlan*` 契约、只读预案 service/API/repository 和 `/admin/courses` 高风险批量动作预案区，支持重复 `contentHash` 主素材建议、引用合并影响列表、软删除候选风险、学习下载/成交展示位使用识别，并明确 `previewOnly=true`、`executable=false`、不修改素材 Store、不写审计。
- 完成 `/admin/courses` 减负第一刀：课程商品页默认只读取商品列表和内容质量，不再默认加载素材治理、学习资料报表、治理历史、批量任务、队列观测和高风险预案；新增 `/admin/course-assets/governance` 独立后台入口承接素材治理工作区。
- 完成课程转化漏斗埋点：新增共享 `courseConversion` 事件契约、前端 analytics repository、课程中心曝光/点击/下单事件和课程详情浏览/购买/支付/学习启动事件，为后续运营分析与营销后台化提供数据基线。
- 完成营销规则后台只读基线：新增共享 `courseMarketing` 规则契约、服务端课程营销规则派生 Store、公共规则 API、后台规则 API、前端营销规则 repository/hook 和 `/admin/marketing` 只读控制台。
- 完成营销规则持久化与审计：营销规则 Store 已支持状态覆盖层、JSON 文件持久化、暂停/恢复 API、操作原因、审计事件和后台行级操作，前台公共规则快照会实时排除暂停规则。
- 完成用户端个人中心与关于我们：新增 `/me` 个人中心，集中展示账号、课程订单、咨询预约、收藏课程和服务端营销优惠；新增 `/about` 关于我们，展示平台定位、服务范围、隐私边界和可信承接路径。
- 完成个人中心资料编辑服务端化：新增 `UserProfileUpdateRequestSchema`、`PATCH /api/auth/profile` 和前端 `updateProfile` 认证上下文，个人中心账号页可编辑昵称与头像链接并同步当前登录会话。
- 完成账号级收藏同步：新增 `UserPreferenceSchema`、用户偏好 Store、`/api/user-preferences/me` 和收藏课程写接口，`useCourseEngagement` 登录后可读取/写入账号收藏，首页、课程列表、课程详情、成长空间和个人中心复用同一同步链路。
- 完成账号券包领取状态：`UserPreferenceSchema` 已扩展 `couponClaims`，新增课程券领取 API，个人中心优惠页可领取课程券并展示可领取/已领取状态；结算抵扣仍沿用服务端营销规则自动计算。
- 完成结算券包抵扣与使用态沉淀：课程 checkout 请求支持携带 `couponClaimId`，订单保存 `couponApplication`，服务端校验已领券与营销规则适用范围，支付成功后订单券应用与用户券包同步进入 `used` 并记录订单 ID/使用时间；课程中心、课程详情和成长空间结算抽屉均展示账号券包并传递使用意图，个人中心优惠页展示已使用券和关联订单入口。
- 完成结算内领券与订单详情深链：课程中心、课程详情和成长空间的结算抽屉会展示当前课程未领取但可用的课程券，支持一键领取并自动选中；支付成功态展示本单用券信息和查看订单入口，个人中心可通过 `orderId` 深链定位并高亮订单。
- 完成用户端订单详情与售后服务入口：个人中心新增订单详情抽屉，复用 `Order` 与 `couponApplication` 展示商品、金额、支付、用券、权益交付、时间线和售后说明；待支付订单可继续支付或取消，已支付订单可进入课程或成长空间。
- 完成用户端售后申请工单与后台交易联动：新增 `OrderAfterSales*` 共享契约、独立售后申请 Store/API、个人中心订单详情售后表单，后台订单/交易详情读取售后摘要，交易异常提示可标出待处理售后。
- 完成售后工单后台处理动作与退款申请联动：新增售后后台动作契约、审计事件、订单/交易后台处理面板和用户端处理进度展示；运营可将售后工单标记处理中、解决、关闭，或在权限与交易安全检查通过后联动发起退款申请。
- 完成售后进度通知与个人中心消息联动：新增账号级站内消息契约、通知 Store/API、售后后台动作通知写入、顶部消息入口、个人中心消息 tab 和订单详情售后进度展示。
- 完成退款成功回调与售后工单自动收尾：课程 `refund.succeeded` 支持课程订单，订单进入 `refunded` 后自动解决关联售后工单、写入系统审计和 `refund_completed` 站内通知，支付对账可识别 `course_access` 业务快照。
- 完成退款完成后的课程权益回收与用户端访问边界：课程 `refunded` 订单会在没有其他有效已支付同课订单时移除对应 `ownedCourseIds`，课程列表、课程详情和成长空间随权益状态回到购买入口，个人中心订单详情显示权益已停止并提供重新购买入口。
- 完成会员退款权益来源字段与退款后会员边界：`CourseMembership` 新增 `sourceType/sourceOrderId/sourceActorId/sourceUpdatedAt`，会员 checkout 写入订单来源，后台人工会员动作写入人工来源，会员退款只回收匹配当前订单来源且无其他有效会员订单覆盖的会员权益。
- 完成会员来源可视化与重新开通直达体验：`/admin/users` 用户详情展示会员来源摘要、来源订单/操作者和更新时间；个人中心已退款会员订单进入 `checkout=membership&intent=renew_membership`，课程列表自动打开会员结算，成长空间登录后承接同一重开意图。
- 完成会员独立商品化与套餐开通入口：新增 `CourseMembershipProductSchema`、`CourseMembershipPlanSchema` 和默认成长会员年卡，新增 `/membership` 会员商品页，课程中心、个人中心、成长空间、页头页脚和已退款会员订单重开链路均可进入独立会员商品页或会员结算；结算抽屉可在独立会员上下文展示会员订单、会员首图、套餐权益和购买须知。
- 完成会员结算服务端去课程锚点：`CourseCheckoutCreateRequestSchema` 的 `membership` 模式可直接接收会员商品/套餐 ID；服务端按套餐创建会员订单，支付成功后写入 `checkout_order` 来源；`/membership` 不再依赖 `findMembershipCheckoutAnchorCourse`，待支付会员订单按套餐 ID 召回，个人中心会员待支付会回到会员开通页。
- 完成会员商品运营后台配置化首个切片：新增 `membership_product:read/manage` 权限、会员商品后台契约、会员商品 Store、后台 API、前端 repository 和 `/admin/memberships` 页面，运营可维护会员商品文案、套餐价格、套餐暂停/恢复，并查看操作审计；用户端读取服务端快照与结算金额同步进入下一步。
- 完成会员商品可用性体验与运营联动收口：用户端会员商品公共快照可识别 `CONFLICT`/不可售状态，`/membership`、课程列表、课程详情和成长空间会阻止新会员订单并提示“暂不可购买”；历史待支付会员订单仍按订单金额继续支付；后台 `/admin/memberships` 展示前台快照预览和复制前台链接提示。
- 完成会员售卖状态端到端回归与真实支付前准备：新增会员售卖回归测试，覆盖后台改价、公共快照金额、新会员订单金额、套餐暂停、历史待支付订单继续按原金额返回、恢复售卖后新单使用当前价格；公共快照不可售错误提供 `product_inactive` / `no_active_plan` reason；新增 `docs/membership-sales-readiness.md` 沉淀真实支付前待支付、改价、暂停恢复、支付成功和退款边界。
- 完成课程订单状态与支付结果服务端化：新增课程 checkout 共享契约、订单扩展字段、服务端创建/读取/支付/取消 API 和前端 repository/hook，课程权益只在服务端支付成功后交付，重复支付保持幂等。
- 课程详情页购买抽屉已接入订单状态，支持待创建、待支付、支付中、支付成功、失败重试和取消待支付订单，并展示订单号、支付保留时间、支付渠道和权益交付摘要。
- TRX-C 浏览器验证已通过：在 `/courses/16` 完成登录、创建订单、模拟支付成功、权益到账和“开始学习”入口切换；`pnpm run ci` 已通过 87 个测试文件 / 411 个测试和生产构建。
- 完成课程学习记录服务端同步：新增 `CourseLearningRecord*` 共享契约、课程学习记录 Store、`/api/course-learning/records` API 和前端 repository，服务端写入会校验登录、课程已发布审核、课程权益可学习和章节归属。
- 学习页与成长空间已接入登录态服务端同步：章节进度、练习记录和课程完成反馈优先同步服务端，网络失败时继续保留本地记录并展示温和同步提示。
- 阶段证明第一版仅生成预览/待签发准备字段，保留 `source`、`syncStatus`、`certificateId`、`issuedAt` 和 `issuerStatus`，不签发正式证书编号。
- UX-I 定向测试已通过：90 个测试文件 / 425 个测试完成；本轮最终已执行 `pnpm run ci`。
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
- 建立课程商品 JSON 文件 Store，开发期默认写入 `.hongboshi-data/course-products.json`，状态、价格和审计事件可重启恢复。
- `/api/courses` 和课程详情已读取课程商品 Store，只展示 `published + approved` 商品，并同步后台价格与会员权益变化。
- 建立课程商品 PostgreSQL Store、`course_products` 与 `course_product_audit_events` 迁移表，支持 seed 初始化、状态/价格/基础信息和审计事件持久化。
- `/admin/courses` 支持课程商品基础信息编辑，服务端通过共享契约校验标题、封面、分类、类型、讲师、学习人数和操作原因。
- 建立课程商品审核动作契约，支持提交审核、通过审核、驳回审核和撤回审核。
- 建立课程商品审核状态流转 service 与 `/api/catalog/admin/course-products/:productId/review`，审核动作写入 `review_update` 审计事件。
- `/admin/courses` 支持行级审核动作，驳回原因会在列表中直接展示，帮助运营快速定位阻塞项。
- `/api/courses` 和课程详情只展示 `published + approved` 商品，未审核通过的课程即使异常处于上架状态也不会进入前台。
- 建立第一版 `CourseProductDetailContentSchema`，为课程详情摘要、适合人群、章节时长和素材占位管理预留稳定契约。
- 建立课程商品详情内容 Store，支持内存/JSON 文件保存课程摘要、适合人群、章节和素材占位。
- 建立后台课程详情内容读取/更新 API 与 `/admin/courses` 内容编辑弹窗，运营可维护章节和素材占位。
- 课程内容更新会写入 `content_update` 审计事件，并将已审核或已上架商品回退到未提交审核/下架，避免内容绕过复审发布。
- 前台课程详情支持读取服务端内容 Store，读取失败时继续使用原前端详情 fallback。
- 建立 `course_product_contents` PostgreSQL 表与 `PostgresCourseProductContentStore`，课程详情内容可切换到数据库持久化。
- 建立 `CourseProductContentQuality*` 共享契约与 `evaluateCourseProductContentQuality`，覆盖摘要、适合人群、章节、时长、素材占位和素材就绪提醒。
- 建立课程商品内容批量校验 API `/api/catalog/admin/course-products/content-quality`，后台列表展示内容达标/可审/待补状态。
- 课程商品提交审核前会执行内容质量校验，存在阻塞问题时返回冲突提示，避免薄内容进入审核流。
- 建立课程商品资源级权限：`catalog:read`、`catalog:edit`、`catalog:review`、`catalog:publish`、`catalog:price`。
- 新增 `catalog_viewer` 和 `catalog_operator` 角色，课程商品只读与课程运营账号可进入 `/admin/courses`，不再依赖全局 `admin:manage`。
- `/admin/courses` 根据权限显示或隐藏编辑、内容、审核、上下架和改价动作；服务端仍作为最终权限边界。
- 课程详情素材占位已预留资料 ID、资料地址、上传人、上传时间、下载开关和合规审核状态，为后续真实文件管理留出稳定契约。
- 建立 `user:read` 后台读取权限，`operator` 与 `admin` 可读取用户会员后台。
- 建立 `user:membership` 会员操作权限，`operator` 与 `admin` 可执行会员权益后台动作。
- 建立用户会员后台共享契约 `UserAdminListResultSchema` 与 `UserAdminDetailSchema`，统一描述用户列表、会员摘要、课程权益、订单摘要、咨询预约摘要和风险摘要。
- 建立会员后台动作契约 `UserAdminMembershipActionRequestSchema`、会员操作审计事件和会员操作返回契约。
- 建立 `server/modules/users/userAdminApi.ts`，从 auth 用户目录、课程权益、咨询预约和风险事件 Store 聚合用户会员只读数据，并在缺少真实用户目录时提供开发期 fallback 用户。
- 新增 `/api/users/admin/users/:userId/membership`，支持开通、延期、标记到期和调整计划，并写入会员操作审计。
- 新增 `/admin/users` 用户会员后台，支持关键词、角色、会员状态筛选、分页、列表、详情摘要、会员动作入口和审计列表。
- 用户会员详情保持隐私最小化：手机号仅使用脱敏值，不返回咨询说明、测评答案和风险信号原文。
- 课程权益 Store 已保存会员操作审计事件，JSON 文件 Store 和 PostgreSQL Store 均支持读取与追加；新增 `user_membership_audit_events` 数据库迁移表。
- 建立 `order:read` 后台读取权限，`operator` 与 `admin` 可读取统一订单后台。
- 建立订单后台共享契约 `OrderAdminListResultSchema` 与 `OrderAdminDetailSchema`，统一描述订单列表、订单详情、金额、支付回调摘要、关联履约对象和只读状态时间线。
- 建立 `server/modules/orders/orderAdminApi.ts`，从课程权益订单、咨询预约记录、支付回调收据和 auth 用户目录聚合订单后台数据，并在缺少真实订单时提供开发期 fallback 订单。
- 新增 `/admin/orders` 统一订单只读台，支持关键词、订单状态、商品类型、排序、分页、列表和详情摘要。
- 建立 `order:operate` 后台操作权限，`operator` 与 `admin` 可执行订单后台写动作。
- 建立订单后台动作契约、异常标记契约、操作审计契约和订单动作返回契约。
- 课程权益 Store 已保存订单异常标记和订单操作审计事件，JSON 文件 Store 和 PostgreSQL Store 均支持读取与追加；新增 `order_admin_exception_flags` 与 `order_admin_audit_events` 数据库迁移表。
- 新增 `/api/orders/admin/orders/:orderId/actions`，支持关闭待支付订单、标记异常和解除异常，服务端校验权限、原因和订单状态机。
- `/admin/orders` 详情面板已加入订单操作入口、异常标记展示和操作审计列表，动作完成后刷新列表与详情。
- 建立 `transaction:read` 后台读取权限，`operator` 与 `admin` 可读取交易退款后台。
- 建立交易后台共享契约 `TransactionAdminListResultSchema` 与 `TransactionAdminDetailSchema`，统一描述支付/退款流水、回调状态、金额、渠道、用户脱敏摘要、关联订单、业务对象、异常提示和处理时间线。
- 建立 `server/modules/transactions/transactionAdminApi.ts`，从支付回调收据、课程权益订单、咨询预约快照、订单异常标记和 auth 用户目录聚合交易流水，并在缺少真实流水时提供开发期 fallback 数据。
- 新增 `/api/transactions/admin/transactions` 列表与详情接口，支持关键词、流水类型、渠道、处理状态、商品类型、日期范围、排序和分页。
- 新增 `/admin/transactions` 交易退款只读台，支持支付/退款流水列表、筛选、摘要指标、详情检查器、订单/业务对象关联和异常摘要。
- 后台导航已将交易退款从“规划”切换为“可用”，仍保留 `/admin/payments` 支付对账页。
- 建立 `transaction:operate` 后台操作权限，`operator` 与 `admin` 可执行交易后台写动作。
- 建立交易后台动作契约、异常工单契约、交易操作审计契约和交易动作返回契约。
- 新增交易操作 Store，开发期支持内存与 JSON 文件 `.hongboshi-data/transaction-operations.json`，保存交易异常工单和操作审计。
- 新增 `/api/transactions/admin/transactions/:transactionId/actions`，支持 `request_refund`、`mark_exception`、`resolve_exception`，服务端校验权限、原因、流水状态、订单状态和异常状态。
- 退款申请只把允许的已支付订单推进到 `refunding`，不直接写入 `refunded`，退款完成仍由 `refund.succeeded` 回调驱动。
- `/admin/transactions` 详情面板已加入交易操作入口、异常工单状态和交易操作审计列表，动作完成后刷新列表与详情。
- 建立 `transaction_admin_work_orders` 与 `transaction_admin_audit_events` 迁移表，并把交易操作 Store 接入 PostgreSQL。
- `HONGBOSHI_TRANSACTION_OPERATION_STORE` 已支持 `memory/file/postgres`，配置 `DATABASE_URL` 时可自动选择 PostgreSQL。
- 建立退款渠道适配接口 `TransactionRefundProvider`，首版支持人工与模拟受理，只返回受理摘要，不制造退款成功态。
- `request_refund` 会先调用退款渠道适配器；渠道拒绝或失败会写入审计且不修改订单，渠道受理成功后才把订单推进到 `refunding`。
- `/admin/transactions` 操作审计列表已展示退款渠道受理、拒绝或失败摘要，便于客服和财务排查。
- 建立 `finance:read` 后台读取权限，`operator` 与 `admin` 可读取财务管理后台。
- 建立财务后台共享契约 `FinanceAdminOverviewSchema`，统一描述收入、退款、净收款、退款中金额、异常金额、渠道/业务类型分布、财务明细和口径说明。
- 建立 `server/modules/finance/financeAdminApi.ts`，从支付回调收据、课程/会员/咨询订单、交易异常工单和 auth 用户目录聚合财务只读数据。
- 新增 `/api/finance/admin/overview`，支持关键词、渠道、业务类型、日期范围、排序和分页。
- 新增 `/admin/finance` 财务管理只读台，展示收入、退款、净收款、退款中金额、异常金额、渠道净额、业务类型结构、脱敏明细和财务口径。
- 后台导航已将财务管理从“规划”切换为“可用”，仍保留 `/admin/orders`、`/admin/transactions` 和 `/admin/payments` 的既有能力。
- 财务口径已明确：支付成功计入收入，退款成功计入退款，`refunding` 计入待退款，失败/异常流水和开放交易异常工单只进入异常提示，不直接影响净收款。
- 建立财务 CSV 导出契约 `FinanceAdminExportSchema`，包含生成时间、操作者、筛选条件、汇总金额、口径版本、字段定义和明细行。
- 新增 `/api/finance/admin/export`，复用 `finance:read` 权限和财务只读台同一套服务端聚合口径。
- `/admin/finance` 已加入导出 CSV 入口、导出中/失败/成功状态和导出口径提示。
- 财务导出字段已预留账期、手续费、结算批次和发票状态，为后续账期、手续费和结算模块保留兼容空间。
- 建立财务账期与手续费共享契约 `FinanceAdminRuleConfigSchema`、`FinanceAdminChannelFeeRuleSchema` 和 `FinanceAdminSettlementPreviewSchema`，统一描述自然月账期、渠道费率、固定手续费、最低手续费、规则版本、生效时间和结算预览。
- 新增 `finance:manage` 后台写权限，当前仅 `admin` 可维护财务规则；`operator` 和 `admin` 可通过 `finance:read` 查看规则和结算预览。
- 新增 `server/modules/finance/financeRuleStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/finance-rules.json` 保存手续费规则，并为后续 PostgreSQL Store 保留接口。
- 新增 `/api/finance/admin/rules`，支持读取财务规则、维护渠道手续费规则和基于服务端财务明细生成结算预览。
- `/admin/finance` 已加入账期与手续费工作区，展示当前规则版本、渠道费率、固定手续费、最低手续费、自然月账期、预计手续费、预计结算金额、退款中金额和异常未结算金额。
- 结算预览复用财务只读台同一套收入/退款/待退款/异常口径，不修改订单、支付回调或交易状态。
- 建立咨询排班运营共享契约 `CounselingAdminScheduleConsoleSchema` 和 `CounselingAdminScheduleMutationResultSchema`，统一描述咨询师服务状态、未来时段、可预约/锁定/已预约/已关闭状态和排班动作结果。
- 新增 `/api/counseling/admin/schedules`，运营/管理员可读取排班控制台、添加可预约时段、关闭未预约时段和恢复已关闭时段。
- 咨询排班复用 `counselingAppointmentStore` 的 slot 数据，关闭时段表示为 `available=false` 且无活跃预约，避免产生第二套排班真相源。
- 排班服务端动作会校验时间范围、重叠时段、咨询师存在性和时段状态；锁定或已预约时段不能被关闭或覆盖。
- `/admin/counseling` 已加入排班管理区，支持新增时段、查看咨询师服务状态、未来排班和冲突提示，并可关闭/恢复可操作时段。
- 咨询运营审计已扩展 `schedule_slot_added`、`schedule_slot_closed` 和 `schedule_slot_restored`，数据库迁移 `0012_counseling_schedule_audit_actions.sql` 已补充审计动作约束。
- 建立咨询服务记录与履约异常共享契约 `CounselingServiceRecordConsoleSchema`，统一描述服务记录行、异常类型、筛选条件和汇总指标。
- 新增 `/api/counseling/admin/service-records`，运营/管理员可读取由预约、订单、时段、咨询师、风险事件和运营审计聚合的只读履约运营视图。
- 服务记录异常覆盖待支付锁定临近/过期/关闭、临近开始未确认、已取消待退款、退款中和未到访；服务端只输出风险等级摘要，不暴露咨询说明、测评答案或风险信号原文。
- `/admin/counseling` 已加入服务记录与履约异常区，支持按咨询师、预约状态、异常类型和关键词筛选，展示摘要指标和最近异常列表。
- 建立咨询师后台档案共享契约 `CounselorAdminProfileConsoleSchema` 与 `CounselorAdminProfileUpdateRequestSchema`，统一描述展示资料、擅长方向、价格、资质摘要、资质状态、接单开关和服务状态。
- 新增 `server/modules/counseling/counselorAdminProfileStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/counselor-profiles.json` 保存咨询师档案 overlay，并继续复用 seed 咨询师作为初始化来源。
- 新增 `/api/counseling/admin/counselors`，运营/管理员可读取和维护咨询师档案；写动作需要操作原因并写入咨询运营审计。
- 前台 `/api/counseling/availability` 已接入咨询师档案 overlay，暂停接单、关闭接新客、资质待复核或资质过期的咨询师不会进入用户可预约列表。
- `/admin/counseling` 已加入咨询师档案与服务状态区，支持按服务状态和关键词筛选，展示资质状态、排班摘要、服务摘要和接单切换。
- 完成咨询师维护工作台交互优化：咨询师档案区改为清单 + 详情维护面板，运营可直接编辑前台资料、资质状态、价格、擅长方向、接单门禁和操作原因，并按接单状态、资质状态与关键词筛选。
- 完成咨询运营页面减负与咨询师名册增删：`/admin/counseling` 拆为咨询师、排班、履约、规则与审计四个工作区；`/api/counseling/admin/counselors` 支持创建咨询师与软删除名册移除，删除会写入审计并阻止已有预约/履约记录的咨询师被移除。
- 完成咨询师抽屉式维护与档案丰富度优化：新增/编辑咨询师不再在页面底部展开长表单，统一使用右侧抽屉维护基础资料、前台介绍、擅长方向、资质信息、训练背景、咨询风格、适合人群、服务小时数和接单设置；保存前进行字段级校验并给出明确错误，提供“补全示例”降低开发期和运营录入阻塞。
- 完成咨询师前台预览、审计详情与排班联动入口：咨询师详情区展示前台可见性、可约承接、最近审计，支持用户端预览弹窗、打开 `/consulting?counselorId=...` 深链接、查看审计事件详情，并可一键切到排班区定位该咨询师和预填新增时段原因。
- 完成咨询师用户端详情增强与咨询转化体验：`/consulting` 前台预约页改为咨询师推荐、详情资料、匹配理由、可约时段和预约单并行推进；咨询师深链会同步页面选择，用户切换咨询师时同步 URL，移动端提供底部预约条，降低用户在购买咨询服务前的信息不足和反复滚动成本。
- 建立 `risk:read` 后台读取权限与 `risk:review` 风险处理权限，`operator` 与 `admin` 可进入风险复核台并执行处理动作。
- 建立风险复核后台共享契约 `RiskAdminListResultSchema`、`RiskAdminDetailSchema`、`RiskAdminActionRequestSchema`、`RiskAdminReviewRecordSchema` 和 `RiskAdminMutationResultSchema`，统一描述风险队列、隐私最小化详情、SOP 提醒和处理记录。
- 新增 `server/modules/risk/riskReviewStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/risk-reviews.json` 保存风险处理记录。
- 新增 `/api/risk/admin/events` 列表/详情接口和 `/api/risk/admin/events/:riskEventId/actions` 处理动作接口，支持风险等级、状态、来源、关键词筛选和状态机流转。
- 新增 `/admin/risk` 风险复核台，支持风险事件队列、摘要指标、详情检查器、SOP 提醒、处理记录和受控处理入口。
- 风险复核接口与页面只展示复核所需摘要，不输出测评答案原文、咨询前说明全文或风险信号原文。
- 建立 `risk:sop` 后台权限，当前仅 `admin` 可维护风险 SOP 模板，`operator` 可读取 SOP 控制台和执行复核动作。
- 建立风险 SOP 共享契约 `RiskSopTemplateSchema`、`RiskSopResultTemplateSchema`、`RiskSopConsoleSchema`、`RiskEscalationQueueItemSchema` 和 `RiskSopTemplateUpdateRequestSchema`。
- 新增 `server/modules/risk/riskSopStore.ts`，开发期支持内存/JSON 文件 `.hongboshi-data/risk-sop.json` 保存默认 SOP 模板、模板启停、版本、生效范围、处理结果模板和升级队列。
- 新增 `/api/risk/admin/sop` 和 `/api/risk/admin/sop/templates/:templateId`，支持 SOP 控制台读取、升级队列读取和管理员模板启停/编辑。
- 风险复核详情会返回服务端按风险等级和来源匹配的 SOP 模板，处理记录会保存 SOP 模板 ID、版本、结果模板 ID 和升级队列摘要。
- `/admin/risk` 已加入 SOP 模板区、升级队列、处理结果模板选择、升级优先级/负责人录入和升级状态提示。
- 建立 `risk_admin_review_records`、`risk_sop_templates` 和 `risk_escalation_queue_items` 数据库迁移表，保存风险复核记录、SOP 模板、升级队列和审计中心预备投影字段。
- 新增 `PostgresRiskReviewStore` 与 `PostgresRiskSopStore`，风险处理记录、SOP 模板和升级队列支持内存、JSON 文件与 PostgreSQL 三种实现。
- `HONGBOSHI_RISK_REVIEW_STORE` 与 `HONGBOSHI_RISK_SOP_STORE` 已支持 `memory/file/postgres`，配置 `DATABASE_URL` 时可自动选择 PostgreSQL，显式 `file` 仍保留本地开发模式。
- 风险 SOP 模板更新、升级队列创建/关闭和复核记录写入时会沉淀 actor、roles、resource、action、before/after 摘要和时间，为 M9 审计中心只读聚合预备数据。
- 建立统一审计中心共享契约 `AuditCenterListResultSchema`、`AuditCenterEventSchema` 和 `AuditCenterQuerySchema`，统一描述跨模块审计事件、筛选、分页、摘要和隐私提示。
- 建立 `audit:read` 后台读取权限，`operator` 与 `admin` 可读取审计中心，普通会员和咨询师不可访问。
- 新增 `server/modules/audit/auditAdminApi.ts` 和 `/api/audit/admin/events`，只读聚合课程商品审计、会员操作审计、订单操作审计、交易操作审计、咨询运营审计和风险复核记录。
- 课程权益 Store 与交易操作 Store 已补充全量审计读取方法，PostgreSQL Store 同步支持审计中心聚合所需读取边界。
- 新增 `/admin/audit` 审计中心页面，支持模块、动作、操作者、资源关键词和日期范围筛选，展示资源摘要、操作者、原因和 before/after 摘要。
- 后台导航已将审计中心从“规划”切换为“可用”，后台首页实施路线已同步到 M9-A。
- 建立审计中心导出契约 `AuditCenterExportSchema`，导出剥离分页并包含生成时间、操作者、筛选快照、口径版本、字段定义、模块汇总和 before/after 摘要。
- 新增 `/api/audit/admin/export`，复用 `audit:read` 权限和 M9-A 聚合筛选逻辑，输出 CSV 且保持只读隐私边界。
- 建立审计事件详情契约 `AuditCenterDetailResultSchema` 和 `/api/audit/admin/events/:eventId`，可按归一化事件 ID 定位来源模块、源事件 ID 和资源摘要。
- `/admin/audit` 已加入导出 CSV 入口、导出反馈、事件详情抽屉和来源定位提示。
- Vite 开发中间件已接入 `handleAuditAdminApiRequest`，开发环境 `/api/audit/admin/*` 与生产 Express 保持一致。
- 建立统一审计 Store 架构方案 `docs/audit-store-architecture.md`，明确目标/非目标、数据流、回填策略、索引、隐私白名单、失败恢复和 M9-D 最小切片。
- 建立审计归档事件契约 `AuditCenterArchiveEventSchema`、`AuditCenterSourceDescriptorSchema`、归档结构版本和隐私口径版本，保持现有审计列表、导出和详情契约向前兼容。
- 新增 `audit_center_archived_events` 只追加 PostgreSQL 归档表草案，包含稳定事件 ID、唯一幂等键、source event ID、模块、动作、资源、操作者、角色、原因、summary-only 前后摘要、发生时间、归档时间和口径版本。
- 归档表索引已覆盖模块/时间、动作/时间、资源、操作者/时间、来源和归档时间；当前不把业务写动作或审计真相源切换到该表。
- 建立 `AuditCenterArchiveRequestSchema` 与 `AuditCenterArchiveResultSchema`，统一描述归档筛选、批次 ID、归档人、成功数、跳过数和失败摘要。
- 建立 `audit:archive` 权限，当前仅 `admin` 可触发审计归档；`operator` 仍只能通过 `audit:read` 读取、导出和查看详情。
- 新增 `AuditArchiveStore`、内存实现和 PostgreSQL `PostgresAuditArchiveStore`，支持归档事件幂等写入、列表、计数和测试清理。
- 新增 `POST /api/audit/admin/archive` 手动归档 API，可按模块、动作、操作者、资源关键词和日期窗口归档当前聚合事件，返回批次 ID、成功数、跳过数和失败摘要。
- 归档映射会生成稳定幂等键、source descriptor、结构版本和隐私口径版本，并裁剪 before/after 中的 raw/payload/signature/answer/signal/note 等敏感字段。
- 建立 `AuditCenterArchiveVerificationResultSchema`，统一描述当前聚合总数、归档总数、总差异、模块差异、最近归档批次和最近归档事件摘要。
- 新增 `GET /api/audit/admin/archive/verification`，由 `audit:archive` 权限控制，普通 `operator` 仍只能读取审计中心，不能调用归档校验。
- `/admin/audit` 已加入管理员可见的归档控制台，可展示当前筛选条件、手动触发归档、展示批次 ID、扫描数、成功数、跳过数、失败数和安全失败摘要。
- `/admin/audit` 已加入归档只读校验摘要，显示当前聚合数量、归档数量、差异、模块分布差异和最近归档批次；归档表为空或校验失败不影响主审计列表、导出和详情。
- 前端审计仓储已接入 `archiveEvents` 和 `loadArchiveVerification`，列表、详情和导出 API 保持原有交互不变。
- 建立归档只读检索预览契约 `AuditCenterArchiveSearchQuerySchema`、`AuditCenterArchivePreviewItemSchema` 和 `AuditCenterArchiveSearchResultSchema`，支持模块、动作、操作者、资源关键词、批次 ID、发生日期、归档日期、分页和发生/归档时间排序。
- `AuditArchiveStore` 与 `PostgresAuditArchiveStore` 已支持归档表长期检索筛选、分页和计数，仍只返回 summary-only 摘要，不读取 raw payload。
- 新增 `GET /api/audit/admin/archive/events`，由 `audit:archive` 权限控制；普通 `operator` 仍只能通过 `audit:read` 访问主审计中心，不能访问归档表预览。
- `/admin/audit` 管理员归档控制台已加入“归档检索预览”，按当前筛选读取归档表前 5 条摘要行；归档预览为空或失败不影响主审计列表、导出、详情、归档和校验。

## 最近完成阶段

CUX-I-B-B-G 课程素材治理后台与引用报表基础已交付：

- `shared/domain/courseProduct.ts`：新增 `CourseProductAssetGovernanceIssueTypeSchema`、`CourseProductAssetGovernanceResultSchema`、治理 item/summary/product summary 契约和引用来源枚举，统一描述未引用、重复 hash、合规状态、下载关闭、软删候选和引用来源。
- `server/modules/catalog/courseProductAssetGovernance.ts`：新增只读治理 service，聚合素材 Store、课程商品 Store、课程详情内容 Store 和可选引用表；PostgreSQL Store 支持时读取 `listAssetReferences`，JSON/内存 Store 不支持引用表时从章节 `materialPlaceholders` 推导引用关系。
- `server/modules/catalog/catalogApi.ts`：新增 `GET /api/catalog/admin/course-products/assets/governance`，绑定 `catalog:read`，只返回治理摘要和只读素材列表，不执行删除、批量审核、自动清理或下载开关修改。
- `client/src/features/catalog/api/httpCourseProductRepository.ts`：新增 `parseCourseProductAssetGovernanceResponse` 和 `loadCourseProductAssetGovernance`，为下一步 `/admin/courses` 治理面板接入准备。
- 测试新增/更新 `shared/domain/courseProduct.test.ts`、`server/modules/catalog/courseProductAssetGovernance.test.ts`、`server/modules/catalog/catalogApi.test.ts` 和 `client/src/features/catalog/api/httpCourseProductRepository.test.ts`，覆盖治理契约、JSON fallback 引用推导、引用表优先、权限失败和前端仓储解析。
- `docs/course-asset-storage-architecture.md`、`docs/domain-contracts.md`、`docs/database-schema.md`、`docs/admin-management-roadmap.md` 与 `docs/product-engineering-roadmap.md` 已同步治理只读边界和下一步后台面板方向。

CUX-I-B-B-G 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- shared/domain/courseProduct.test.ts server/modules/catalog/courseProductAssetGovernance.test.ts server/modules/catalog/catalogApi.test.ts client/src/features/catalog/api/httpCourseProductRepository.test.ts` 实际执行全量 125 个测试文件 / 605 个测试并通过。
- 本轮新增后端 API 与前端 repository，没有新增页面；浏览器验证不适用。
- `pnpm run ci` 已通过：类型检查、125 个测试文件 / 605 个测试和生产构建均通过，Vite 仍保留既有大 chunk 提醒。

CUX-I-B-B-F 正式对象存储 provider 与短期读取 URL 接入已交付：

- `server/modules/catalog/courseProductAssetObjectStorage.ts`：新增 `resolveCourseProductAssetObjectStorageConfig` 与 `createCourseProductAssetObjectStorage`，支持 `local/s3/oss/cos` provider 配置、远端 provider 必填项校验、默认 600 秒短期读取 URL TTL 和 HMAC 签名。
- `LocalCourseProductAssetObjectStorage`：保留本地 byte storage 兼容实现，但 descriptor 已可写入 provider/bucket/region；配置 `HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PUBLIC_BASE_URL` 时会生成远端对象路径短期 URL，否则生成本地受控读取 URL。
- `server/modules/catalog/courseProductAssetStore.ts`：真实文件上传改为通过 `CourseProductAssetObjectStorage.putObject` 写入对象并保存 `objectKey/contentHash`；后台下载、公开图片查看和已解锁课程资料下载改为通过 object storage adapter 读取对象，历史 `storageKey` 继续作为兼容 fallback。
- `server/modules/courses/courseApi.ts`：课程素材公开查看和下载 payload 已携带 `signedReadUrl`，HTTP 路由当前仍在服务端完成登录、权益、合规和下载开关校验后返回文件流，避免前端绕过业务边界。
- `.env.example`：新增课程素材 Store、文件存储根目录、对象 provider、bucket、region、公开基础域名、签名密钥和签名 URL TTL 配置项。
- `server/modules/catalog/courseProductAssetObjectStorage.test.ts` 与 `server/modules/courses/courseApi.test.ts`：覆盖远端 provider 配置解析、缺少配置错误、provider 元数据写入、签名 URL 过期时间和课程 API 签名 URL 生成。
- `docs/course-asset-storage-architecture.md`、`docs/domain-contracts.md`、`docs/database-schema.md`、`docs/admin-management-roadmap.md` 与 `docs/product-engineering-roadmap.md` 已同步 provider 边界、短期 URL、HTTP 受控读取和下一步素材治理方向。

CUX-I-B-B-F 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- server/modules/catalog/courseProductAssetObjectStorage.test.ts server/modules/catalog/courseProductAssetStore.test.ts server/modules/courses/courseApi.test.ts shared/domain/courseProduct.test.ts` 实际执行全量 124 个测试文件 / 599 个测试并通过。
- 本轮是服务端存储 adapter、配置和契约基建，没有新增用户端页面；浏览器验证不适用。
- `pnpm run ci` 已通过：类型检查、124 个测试文件 / 599 个测试和生产构建均通过，Vite 仍保留既有大 chunk 提醒。

CUX-I-B-B-E 课程素材回填写入任务与运营确认入口准备已交付：

- `shared/domain/courseProduct.ts`：新增 `CourseProductAssetBackfillRequestSchema`、`CourseProductAssetBackfillMutationResultSchema` 和回填动作契约，区分 `dry_run` 与 `commit`，`commit` 必须显式确认并填写操作原因。
- `server/modules/catalog/courseProductAssetBackfill.ts`：在 dry-run 扫描基础上新增受控 commit service，共用候选收集逻辑，写入前校验确认状态和目标 Store 引用写入能力；章节素材引用 ID 由课程商品、章节、素材占位和素材 ID 组成，重复执行保持幂等。
- `server/modules/catalog/postgresCourseProductAssetStore.ts`：新增 `course_product_asset_references` 的 `saveAssetReference` 与 `listAssetReferences`，素材回填可先写对象事实与素材元数据，再写章节引用关系。
- `server/modules/catalog/catalogApi.ts`：新增 `GET/POST /api/catalog/admin/course-products/assets/backfill`，只读预检绑定 `catalog:read`，确认写入绑定 `catalog:review`，缺少 `DATABASE_URL` 或目标 Store 不支持引用写入时返回业务冲突。
- `client/src/features/catalog/api/httpCourseProductRepository.ts`：新增 backfill 结果解析、预检读取和写入请求方法，供后续运营后台按钮接入。
- `docs/course-asset-storage-architecture.md`、`docs/domain-contracts.md` 与 `docs/database-schema.md` 已同步受控回填 API、PostgreSQL 引用写入和继续保持 JSON Store 不自动切换的边界。

CUX-I-B-B-E 验收结果：

- `pnpm test -- shared/domain/courseProduct.test.ts server/modules/catalog/postgresCourseProductAssetStore.test.ts server/modules/catalog/courseProductAssetBackfill.test.ts server/modules/catalog/catalogApi.test.ts client/src/features/catalog/api/httpCourseProductRepository.test.ts` 实际执行全量 124 个测试文件 / 597 个测试并通过。
- `pnpm run check` 已通过。
- `pnpm run ci` 已通过：类型检查、124 个测试文件 / 597 个测试和生产构建均通过，Vite 仍保留既有大 chunk 提醒。
- 本轮是服务端 API、Store 与 repository 基建，没有新增用户端页面；浏览器验证不适用。

CUX-I-B-B-D 课程素材 PostgreSQL Store 与回填 dry-run 基础已交付：

- `server/modules/catalog/postgresCourseProductAssetStore.ts`：新增课程素材 PostgreSQL Store，实现 `listAssets(productId?)`、`getAsset(assetId)`、`saveAsset(asset)` 和测试清理能力；保存时从 `course_products` 反查 `course_id`，继续保持前端/API 的 `CourseProductAssetSchema` 不暴露 `courseId`。
- `server/modules/catalog/courseProductAssetStore.ts` 与 `server/db/runtimeConfig.ts`：支持显式 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=postgres`，配置 `DATABASE_URL` 后可切换素材资产 Store；默认仍保持 `file`，不会因有数据库连接而自动切换。
- PostgreSQL Store 会把素材元数据写入 `course_product_assets`；当素材存在 `objectKey` 与 `contentHash` 时，同步写入 `course_product_asset_objects`，外部 URL 素材不会被强制对象化。
- `server/modules/catalog/courseProductAssetBackfill.ts`：新增素材回填 dry-run service，读取素材 Store、课程商品 Store 与课程详情内容 Store，输出扫描数、可回填素材数、章节占位引用数、跳过数和原因，不写数据库。
- `CourseProductAssetBackfillPlanSchema` 已补充 `json_asset_store_and_content_placeholders` 来源；数据库说明、领域契约、后台路线图、产品路线和素材存储架构文档已同步。

CUX-I-B-B-D 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- shared/domain/courseProduct.test.ts server/modules/catalog/postgresCourseProductAssetStore.test.ts server/modules/catalog/courseProductAssetBackfill.test.ts server/modules/catalog/courseProductAssetStore.test.ts server/db/runtimeConfig.test.ts server/db/schema.test.ts` 实际执行全量 124 个测试文件 / 588 个测试并通过。
- 本轮是 Store/数据库/回填 dry-run 基建，没有新增用户端页面；浏览器验证不适用。

CUX-I-B-B-C 课程素材正式对象存储与素材专表设计准备已交付：

- `shared/domain/courseProduct.ts`：新增素材对象存储 provider、对象描述、短期读取 URL、删除结果、素材引用关系和回填计划契约；`CourseProductAssetSchema` 补充 `objectKey`、`contentHash`、`referenceCount` 和 `deletedAt`，现有 payload 向前兼容。
- `server/modules/catalog/courseProductAssetObjectStorage.ts`：新增正式对象存储 adapter 接口，覆盖 `putObject`、`readObject`、`createSignedReadUrl` 和 `deleteObject`；本地实现复用现有文件存储，生成 `course-assets/{productId}/{assetId}/{sha256前缀}-{fileName}` 对象 key，并计算 sha256 内容指纹。
- `server/modules/catalog/courseProductAssetStore.ts`：真实文件上传继续走现有 JSON Store 和本地文件读取路径，但会同步保存 `objectKey` 与 `contentHash`，为后续 PostgreSQL Store 和对象存储 provider 切换预埋字段。
- `server/db/migrations/0019_course_product_asset_tables.sql` 与 `server/db/schema.ts`：新增 `course_product_asset_objects`、`course_product_assets` 和 `course_product_asset_references` 表草案及索引，覆盖对象 key、provider、MIME、大小、hash、合规状态、下载开关、引用计数和软删除。
- `docs/course-asset-storage-architecture.md`：沉淀正式对象存储、素材专表、章节素材引用和 `.hongboshi-data/course-product-assets.json` / `materialPlaceholders` 回填方案；数据库、领域契约、产品路线和后台路线图已同步。

CUX-I-B-B-C 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- shared/domain/courseProduct.test.ts server/modules/catalog/courseProductAssetObjectStorage.test.ts server/modules/catalog/courseProductAssetStore.test.ts server/db/schema.test.ts` 已通过。
- `pnpm run ci` 已通过：类型检查、测试和生产构建均通过，Vite 仍保留大 chunk 体积提示。
- 本轮是工程基建与数据库/Store 边界设计切片，没有引入新用户端页面；因此未新增浏览器自动化验证。

CUX-I-B-B-B 学习页资料区绑定后台已通过素材与下载入口体验已交付：

- `shared/domain/courseProduct.ts`：章节素材占位 `assetUrl` 允许同源 `/api/` 受控下载地址，后台内容可保存 `assetId`、上传人、上传时间、合规状态和下载开关。
- `client/src/pages/admin/CourseProducts.tsx`：素材上传可选择关联章节；章节资料、练习表、音频和视频素材通过合规后自动开启下载，内容编辑器可把已通过且开启下载的素材一键绑定到章节 `materialPlaceholders`。
- `client/src/features/courses/model/coursePractice.ts`：学习页资料模型会从后台详情内容中筛选 `ready + approved/not_required + downloadEnabled` 的章节资料，待审、驳回或下载关闭素材不返回下载地址。
- `client/src/features/courses/api/httpCourseAssetRepository.ts` 与 `client/src/pages/CourseLearning.tsx`：学习页资料区展示已开放资料卡片，点击后走 `GET /api/courses/:courseId/assets/:assetId/download`，并对未登录、未解锁或下载失败展示清晰反馈；本地练习记录和章节进度逻辑保持独立。
- `docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和 `docs/database-schema.md` 已同步学习页资料绑定、内容 JSONB 边界和后续对象存储/素材专表方向。

CUX-I-B-B-B 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- shared/domain/courseProduct.test.ts client/src/features/courses/model/coursePractice.test.ts client/src/features/courses/api/httpCourseAssetRepository.test.ts` 实际执行全量 121 个测试文件 / 579 个测试并通过。
- `pnpm run ci` 已通过：类型检查、121 个测试文件 / 579 个测试和生产构建均通过，Vite 仍保留大 chunk 体积提示。
- 浏览器验证已启动本地开发服务 `http://localhost:3000/` 并尝试访问学习页，浏览器自动化导航被安全策略阻断，未做绕过；本轮以前述 CI、领域模型和下载仓储测试作为交付验收基线。

CUX-I-B-B-A 课程素材真实文件上传与受控读取基础已交付：

- `shared/domain/courseProduct.ts`：新增 `CourseProductAssetFileUploadRequestSchema`，并允许课程详情成交图文引用同源 `/api/` 图片资产 URL，文件上传契约继续校验素材类型、文件名、MIME、大小、上传原因和图片素材 MIME 边界。
- `server/modules/catalog/courseProductAssetStore.ts`：新增 `CourseProductAssetFileStorage`、内存实现与 `LocalCourseProductAssetFileStorage`，开发期文件默认写入 `.hongboshi-data/course-product-assets/files`，JSON Store 只保存 `storageKey`、文件名、MIME、大小和合规状态。
- `server/modules/catalog/catalogApi.ts`：新增 `POST /api/catalog/admin/course-products/:productId/assets/files` 和后台文件下载接口，继续按 `catalog:edit` / `catalog:read` 权限控制，并复用 `asset_upload` 审计动作。
- `server/modules/courses/courseApi.ts`：新增 `GET /api/courses/:courseId/assets/:assetId/view` 公开读取已发布课程的成交图文图片资产；新增 `GET /api/courses/:courseId/assets/:assetId/download`，要求登录、课程已解锁、素材已通过合规且开启下载。
- `client/src/features/catalog/api/httpCourseProductRepository.ts` 与 `client/src/pages/admin/CourseProducts.tsx`：后台素材资产库支持真实文件选择上传，自动带出文件名、MIME 和大小；对象存储素材可在后台下载，成交图文图片可一键设为成交主视觉或成交图文。
- `server/index.ts`：JSON 请求体上限调整到 25MB，匹配当前素材上传大小限制，真实二进制仍不会写入素材 JSON Store。

CUX-I-B-B-A 验收结果：

- `pnpm run check` 已通过。
- 定向测试覆盖已补充：课程素材文件上传、文件存储、公开图片读取、后台文件读取、未解锁下载拦截和已解锁下载成功。
- `pnpm run ci` 已通过：类型检查、120 个测试文件 / 575 个测试和生产构建均通过，Vite 仍保留大 chunk 体积提示。
- 浏览器冒烟验证已尝试连接当前 `http://localhost:3000/admin/courses` 页，后续页面读取被浏览器安全策略阻断，未做绕过；本轮以前述 CI 与单元/接口覆盖作为交付验收基线。

CUX-I-B-A 课程素材资产登记与合规队列基础已交付：

- `shared/domain/courseProduct.ts`：新增 `CourseProductAssetSchema`、素材类型、来源类型、上传请求、合规处理请求、列表结果和变更结果契约，统一描述详情图、证明图、章节资料、练习表、音频和视频资产。
- `server/modules/catalog/courseProductAssetStore.ts`：新增课程素材资产 Store，开发期支持内存和 JSON 文件 `.hongboshi-data/course-product-assets.json`，上传登记会写入 `asset_upload` 课程商品审计，合规处理会写入 `asset_review` 审计。
- `server/modules/catalog/catalogApi.ts`：新增 `GET/POST /api/catalog/admin/course-products/:productId/assets` 和 `PATCH /api/catalog/admin/course-products/:productId/assets/:assetId/compliance`，分别绑定 `catalog:read`、`catalog:edit` 和 `catalog:review` 权限。
- `client/src/features/catalog/api/httpCourseProductRepository.ts` 与 `client/src/pages/admin/CourseProducts.tsx`：后台课程详情编辑器新增“素材资产库”，可登记素材 URL、查看素材状态、合规通过/驳回，并将已通过素材一键设为成交主视觉或加入成交图文。
- `server/db/runtimeConfig.ts` 与 `server/db/migrations/0018_course_product_asset_audit_actions.sql`：运行时配置新增 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=memory/file`，数据库迁移扩展课程商品审计动作约束，允许记录素材登记和合规处理。
- `docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和 `docs/database-schema.md` 已同步 CUX-I-B-A 的契约、后台边界、Store 配置和下一步对象存储边界。

CUX-I-B-A 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- shared/domain/courseProduct.test.ts server/modules/catalog/courseProductAssetStore.test.ts server/modules/catalog/catalogApi.test.ts client/src/features/catalog/api/httpCourseProductRepository.test.ts server/db/runtimeConfig.test.ts` 实际执行全量 120 个测试文件 / 570 个测试并通过。
- 浏览器验证已通过：未登录访问 `/admin/courses` 可稳定进入后台登录提示态，用户端 `/courses/17?focus=content` 可正常渲染课程详情主视觉和课程亮点区，无横向溢出、无业务相关 console error。
- `pnpm run ci` 已通过：类型检查、120 个测试文件 / 570 个测试和生产构建均成功；Vite 仍保留既有大 chunk 提醒。

CUX-I-A 课程详情成交图文素材后台化已交付：

- `shared/domain/courseProduct.ts`：新增 `CourseProductMerchandisingContentSchema`、成交图文资产 usage、内容质量提醒和更新请求字段，详情内容契约可保存成交标题、副标题、主视觉、卖点和图文资产。
- `server/modules/catalog/courseProductContentStore.ts` 与 `server/modules/catalog/postgresCourseProductContentStore.ts`：默认详情内容会生成成交图文素材，更新内容时保存 `merchandising`；PostgreSQL 版新增 `sales_assets` JSONB 字段映射，并补充迁移与 schema 测试。
- `client/src/pages/admin/CourseProducts.tsx`：课程商品详情编辑器新增“成交图文素材”区，运营可维护详情主视觉、替代文本、成交卖点、图文资产用途、合规状态和素材备注，内容质量会提示缺少主视觉、卖点不足或资产待合规确认。
- `client/src/features/courses/model/courseMerchandising.ts` 与 `client/src/pages/CourseDetail.tsx`：课程详情商品化模型优先消费后台成交素材，详情页课程亮点区展示后台主视觉、标题、卖点和成交图文资产。
- `docs/domain-contracts.md`、`docs/product-engineering-roadmap.md`、`docs/admin-management-roadmap.md` 和 `docs/database-schema.md` 已同步 CUX-I-A 的契约、后台边界和数据库字段。

CUX-I-A 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- client/src/features/courses/model/courseMerchandising.test.ts shared/domain/courseProduct.test.ts server/modules/catalog/courseProductContentStore.test.ts server/modules/catalog/postgresCourseProductContentStore.test.ts server/db/schema.test.ts` 实际执行全量 119 个测试文件 / 563 个测试并通过。
- 浏览器验证已通过：`/courses/17?focus=content` 的课程亮点区正常展示主视觉和买前文案，无横向溢出、无业务相关 console error；未登录访问 `/admin/courses` 可稳定进入后台登录提示态。
- `pnpm run ci` 已通过：类型检查、119 个测试文件 / 563 个测试和生产构建均成功；Vite 仍保留既有大 chunk 提醒。

CUX-H 课程交易界面商品化优化已交付：

- `client/src/features/courses/model/courseMerchandising.ts`：新增课程商品陈列纯模型，统一精选课程排序、详情页商品化图片和买前证明点生成逻辑，并补充单元测试。
- `client/src/pages/Home.tsx`：首页首屏新增可购买课程商品货架，用户进入首页即可看到热门课程、券后价、学习人数和购买/会员动作；课程路径和课程发现区继续复用同一套主动作。
- `client/src/pages/Courses.tsx`：课程中心首屏新增热门课程商品推荐，并在筛选列表前增加独立课程商品货架，减少用户从进入课程页到下单的路径长度。
- `client/src/components/CourseCard.tsx` 与 `client/src/pages/CourseDetail.tsx`：课程卡片默认进入详情页课程介绍区；详情页新增粘性锚点、图文课程亮点、适合状态/内容规模/核心收获证明点和就近购买动作，避免用户被长页面直接淹没。

CUX-H 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- client/src/features/courses/model/courseMerchandising.test.ts` 实际执行全量 119 个测试文件 / 562 个测试并通过。
- `pnpm run ci` 已通过：类型检查、119 个测试文件 / 562 个测试和生产构建均成功；Vite 仍保留既有大 chunk 提醒。
- 浏览器验证已通过：`/` 首屏可直接看到课程商品货架；`/courses` 首屏可看到课程商品推荐和热门课程货架；`/courses/1?focus=content` 会自动定位到课程介绍区，页面无业务相关 console error。

UX-J 个人中心与关于我们核心页面已交付：

- `client/src/pages/PersonalCenter.tsx`：新增 `/me` 个人中心，支持账号、订单、收藏和优惠 tab；账号区展示登录方式、角色、课程权益、会员状态和同步状态。
- 个人中心订单区聚合课程权益订单和登录后的咨询预约，课程待支付订单可回到课程详情继续支付，已支付订单可回到课程详情查看。
- 个人中心收藏区复用本地课程 engagement 收藏状态，优惠区复用服务端 `courseMarketing` 活动规则展示可用课程券。
- `client/src/pages/About.tsx`：新增 `/about` 关于我们，使用全屏视觉首屏、平台理念、服务范围、隐私边界和最终行动入口，明确课程教育不替代医疗诊断和危机干预。
- `client/src/App.tsx`、`client/src/components/AppHeader.tsx`、`client/src/components/AppFooter.tsx`：新增 `/me`、`/about` 路由，并把顶部导航、用户菜单和页脚入口接到真实页面。

UX-J 验收结果：

- `pnpm run check` 已通过。
- 浏览器验证已通过：`/me`、`/me?tab=favorites`、`/about` 在桌面和移动视口均非空白且无横向溢出。
- `pnpm run ci` 已通过：类型检查、101 个测试文件 / 465 个测试和生产构建均成功；Vite 仍保留既有大 chunk 提醒。

CUX-G-B 营销规则持久化与审计已交付：

- `shared/domain/courseMarketing.ts`：新增营销规则状态更新请求、审计事件和规则变更返回契约，审计事件保存操作者、角色、原因、前后状态和发生时间。
- `server/modules/marketing/courseMarketingRuleStore.ts`：将规则 Store 升级为派生规则 + 状态覆盖层 + 审计事件，新增开发期 JSON 文件 `.hongboshi-data/course-marketing-rules.json`，重启后可恢复暂停/恢复状态和审计。
- `server/modules/marketing/courseMarketingApi.ts`：新增 `PATCH /api/course-marketing/admin/rules/:ruleId/status`，写操作复用 `catalog:price` 权限，并校验非法参数、重复状态、过期规则和不存在规则。
- `client/src/features/courses/api/httpCourseMarketingRepository.ts` 与 `/admin/marketing`：后台规则控制台支持行级暂停/恢复、填写操作原因、刷新规则和查看最近审计。
- 公共 `/api/course-marketing/rules` 继续只返回当前生效规则；当运营暂停路径组合或会员活动规则后，课程货架、详情页和结算摘要不会继续展示该活动。

CUX-G-B 验收结果：

- `pnpm run check` 已通过。
- `pnpm test -- shared/domain/courseMarketing.test.ts server/modules/marketing/courseMarketingRuleStore.test.ts server/modules/marketing/courseMarketingApi.test.ts client/src/features/courses/api/httpCourseMarketingRepository.test.ts` 已通过；Vitest 实际执行全量 101 个测试文件 / 465 个测试成功。
- `pnpm run ci` 已通过：类型检查、101 个测试文件 / 465 个测试和生产构建均成功；Vite 仍保留既有大 chunk 提醒。

CUX-G-A 营销规则后台只读基线已交付：

- `shared/domain/courseMarketing.ts`：新增课程营销规则共享契约，覆盖课程券、限时活动、会员活动价、路径组合购、规则状态、来源、范围、折扣、优先级和控制台摘要。
- `server/modules/marketing/courseMarketingRuleStore.ts`：新增课程营销规则派生 Store，从已发布课程商品和系统规则生成当前可用营销规则，保持前台展示与既有订单金额口径一致。
- `server/modules/marketing/courseMarketingApi.ts`：新增公共 `/api/course-marketing/rules` 和后台 `/api/course-marketing/admin/rules`，后台读取复用 `catalog:read` 权限。
- `client/src/features/courses/api/httpCourseMarketingRepository.ts` 与 `useCourseMarketingRules`：前端可读取服务端活动规则，失败时回退为空规则，不影响课程购买链路。
- `client/src/features/courses/model/coursePromotion.ts` 与 `courseCheckout.ts`：优惠展示和结算摘要可消费服务端营销规则，同时保留本地课程券 fallback。
- `/courses`、`/courses/:courseId`、课程卡片、路径区和快速开始区已接入服务端营销规则，仍保持当前券后价、会员替代和路径组合购体验。
- 新增 `/admin/marketing` 营销规则只读控制台，运营可查看全部规则、生效状态、来源、作用范围、折扣方式和优先级；规则编辑和审计留到下一步。

CUX-G-A 验收结果：

- API 已验证：`/api/course-marketing/rules` 返回公共活动规则快照，包含会员活动价、路径组合购和课程券规则。
- API 已验证：未登录访问 `/api/course-marketing/admin/rules` 返回 401，后台规则读取有权限边界。
- `pnpm test` 已通过：101 个测试文件 / 460 个测试成功，覆盖营销规则契约、派生 Store、API、前端解析、优惠模型和后台导航。

CUX-F 转化漏斗埋点已交付：

- `shared/domain/courseConversion.ts`：新增课程转化事件共享契约，统一事件名、来源、课程上下文、路径上下文、权益状态、结算模式、订单号、支付渠道、金额和扩展 metadata。
- `client/src/features/courses/model/courseConversion.ts`：新增课程事件 payload 纯模型，自动带入课程价格、课程属性、路径、权益状态和页面上下文。
- `client/src/features/courses/api/courseConversionAnalyticsRepository.ts`：新增前端埋点仓库，支持 localStorage 队列、会话 ID、可选 `VITE_ANALYTICS_ENDPOINT` / `VITE_ANALYTICS_WEBSITE_ID` 上报和失败保留。
- `client/src/pages/Courses.tsx`：课程中心已记录课程列表曝光、从货架进入详情、点击主动作、打开结算、创建订单、支付成功和支付后开始学习。
- `client/src/pages/CourseDetail.tsx`：课程详情已记录详情浏览、推荐课程点击、交易面板/优惠区/信任区/移动购买条主动作、打开结算、创建订单、支付成功和开始学习。
- `client/src/components/CourseCard.tsx` 与 `CourseDiscoverySection.tsx`：课程卡片支持外部接管详情点击，以便保留来源与位置。

CUX-F 验收结果：

- 浏览器已验证：桌面 `/courses` 首屏写入 12 条 `course_impression`，点击课程写入 `course_detail_click`，详情页写入 `course_detail_view`。
- 浏览器已验证：桌面 `/courses/2` 点击购买入口写入 `course_primary_action_click` 和 `course_checkout_opened`，页面无横向溢出。
- 浏览器已验证：移动端 `/courses/2` 底部购买条写入 `mobile_purchase_bar` 来源的主动作点击与结算打开事件，页面无横向溢出。
- `pnpm run ci` 已通过：类型检查、97 个测试文件 / 450 个测试和生产构建均成功；Vite 仍保留主包体积大于 500 kB 的既有提醒。

CUX-E 优惠与组合购已交付：

- `shared/domain/coursePricing.ts`：新增共享价格计算模型，统一课程标价、原价参考、优惠券抵扣、直降、会员活动价、实付金额和节省金额。
- `shared/domain/courseAccess.ts`：课程订单和会员订单创建改为复用共享价格模型，避免服务端订单金额与前端展示金额分叉。
- `client/src/features/courses/model/coursePromotion.ts`：新增优惠与组合购纯模型，输出课程直降、优惠券、限时折扣、会员替代方案、路径组合预览和推荐购买方式。
- `client/src/components/CourseCard.tsx` 与 `client/src/components/CourseStarterLanes.tsx`：课程货架和快速开始区展示券后价，让用户在浏览阶段即可看到实际购买价格。
- `client/src/pages/CourseDetail.tsx`：交易面板展示推荐购买方式，新增“优惠与组合购”比较区，单课、成长会员和路径组合预览可以并排判断。
- `client/src/components/CourseCheckoutDrawer.tsx`：订单确认抽屉新增“本单优惠”明细，展示自动计入订单的课程直降、优惠券或会员年卡优惠。

CUX-E 验收结果：

- 浏览器已验证：`/courses/2` 桌面详情页展示“券后价”“优惠与组合购”“本课券后购买”和“路径组合预览”，页面无横向溢出。
- 浏览器已验证：`/courses/2` 点击“购买本课”可打开结算抽屉，抽屉展示“本单优惠”“领券减100”和实付金额。
- 浏览器已验证：移动端 `/courses/2` 底部购买条展示券后价提示“领券减100 已自动计入券后价”，页面无横向溢出。
- 浏览器已验证：`/courses/8` 高价会员课程展示“成长会员年卡”“会员方案更划算”和推荐标签。
- `pnpm run ci` 已通过：类型检查、94 个测试文件 / 443 个测试和生产构建均成功；Vite 仍保留主包体积大于 500 kB 的既有提醒。

CUX-D 全局待支付订单召回已交付：

- `client/src/features/courses/model/coursePendingCheckout.ts`：新增待支付召回纯模型，统一从课程权益订单中生成课程/会员待支付提示，并按创建时间倒序展示。
- `client/src/components/CoursePendingCheckoutBanner.tsx`：新增共享待支付提示组件，支持课程中心横条、成长空间面板和详情页内联提醒，统一展示商品、实付金额、支付保留时间、继续支付和取消订单。
- `client/src/pages/Courses.tsx`：课程中心改为复用共享召回模型和组件，并支持从召回条直接取消待支付订单。
- `client/src/pages/CourseDetail.tsx`：当前课程存在待支付订单时，详情页首屏下方展示待支付提醒；交易面板与移动底部购买条会把主动作切换为“继续支付”。
- `client/src/pages/MyCourses.tsx`：成长空间新增待支付课程订单面板，可直接打开共享结算抽屉继续支付，也可取消订单；支付成功后可进入学习页。

CUX-D 验收结果：

- 浏览器已验证：`/courses/2` 当前课程存在待支付订单时展示“这门课有待支付订单”，交易面板主动作显示“继续支付”，页面无横向溢出。
- 浏览器已验证：移动端课程详情底部购买条展示待支付保留时间，主动作切换为“继续支付”，页面无横向溢出。
- 浏览器已验证：`/me/courses` 成长空间展示“待支付课程订单”，点击待支付课程可打开共享订单确认抽屉并显示“待支付 / 继续支付”。
- 浏览器已验证：成长空间待支付面板可直接取消订单，取消后待支付面板移除。
- `pnpm run ci` 已通过：类型检查、92 个测试文件 / 435 个测试和生产构建均成功。

CUX-C 商品信任模块已交付：

- `client/src/features/courses/model/courseTrust.ts`：新增课程信任纯模型，从课程详情稳定生成评分、反馈数、阶段完成率、讲师说明、内容审核点、学习反馈、售后/隐私边界和购买前 FAQ。
- `client/src/features/courses/model/courseTrust.test.ts`：覆盖信任指标稳定生成、售后口径、隐私边界和 FAQ 输出，避免后续 UI 直接拼业务文案。
- `client/src/pages/CourseDetail.tsx`：课程详情页新增“购买信任”区，用户购买前可查看讲师与内容审核、学习反馈、权益/待支付/售后/隐私说明和 FAQ。
- `client/src/pages/CourseDetail.tsx`：交易面板新增评分、阶段完成率和信任摘要，让价格、权益、信任证据和购买按钮处于同一决策面。

CUX-C 验收结果：

- 浏览器已验证：`/courses/2` 可看到购买信任区、讲师与内容审核、学习反馈、售后/隐私边界和购买前 FAQ；FAQ 可展开，交易面板展示评分和阶段完成率，页面无横向溢出。
- `pnpm run ci` 已通过：类型检查、91 个测试文件 / 433 个测试和生产构建均成功。

CUX-B 课程列表内半屏下单与待支付订单召回已交付：

- `client/src/components/CourseCheckoutDrawer.tsx`：从课程详情页抽出复用购买确认抽屉，统一订单摘要、价格优惠、支付方式、购买须知、待支付继续、取消订单和支付成功反馈。
- `shared/domain/courseAccess.ts`：新增 `findPendingCourseCheckoutOrder`，按课程与购买模式从课程权益状态中找待支付订单，避免前端重新发明订单匹配规则。
- `client/src/pages/Courses.tsx`：课程列表主动作从“带购买意图跳详情”升级为页面内打开结算抽屉；可直接创建订单、选择支付方式、确认支付并进入学习页。
- `client/src/pages/Courses.tsx`：课程中心新增待支付召回条，课程卡片、路径课程和快速开始货架遇到既有待支付订单时显示“继续支付”。
- `client/src/pages/CourseDetail.tsx`：详情页打开购买抽屉时优先展示既有待支付订单，用户从详情页也能继续支付或取消。

CUX-B 验收结果：

- 浏览器已验证：`/courses` 点击未解锁课程的“立即购买”后不离开列表页，直接打开课程商品订单确认抽屉；确认购买后支付成功态展示“开始学习”入口。
- 浏览器已验证：通过订单 API 创建待支付课程订单后刷新 `/courses`，课程中心展示待支付召回条；点击召回条会在当前列表页打开“待支付 / 继续支付”的订单抽屉。
- 继续支付沿用课程权益订单状态机，支付成功后权益到账并可进入学习页；取消待支付订单不会发放权益。
- `pnpm run ci` 已通过：类型检查、90 个测试文件 / 431 个测试和生产构建均成功。

CUX-A 课程电商化货架主动作已交付：

- `docs/course-commerce-conversion-analysis.md`：基于中国移动电商用户习惯，梳理货架化信息、固定购买入口、会员/单买并行、详情信任建设、下单弹层化和支付后即时履约的课程交易映射。
- `client/src/components/CourseCard.tsx`：课程卡片价格区新增主动作按钮，按权益状态展示“开始学习”“继续学习”“立即购买”或“开通会员”，保留详情箭头和收藏/分享能力。
- `client/src/components/CoursePathSection.tsx` 与 `client/src/components/CourseStarterLanes.tsx`：路径重点课程、热门课程、免费入门和会员可学货架均增加主动作入口，让用户在前置推荐区即可行动。
- `client/src/pages/Courses.tsx`：统一根据课程权益和学习进度派生货架主动作；免费、已购或会员可学课程直接进入学习页，未解锁课程带 `checkout=course|membership` 进入详情页。
- `client/src/pages/CourseDetail.tsx`：识别 URL 中的购买意图并自动打开购买确认抽屉，避免用户从列表进入后再次寻找购买按钮。

CUX-A 验收结果：

- `/courses` 的路径区、快速开始区、课程列表卡片均能看到清晰的课程交易主动作。
- 从未解锁课程点击“立即购买/开通会员”会进入详情页并自动唤起订单确认抽屉。
- 从免费或已解锁课程点击“开始学习/继续学习”会直接进入 `/courses/:courseId/learn`。
- 浏览器已验证：在 `/courses` 点击课程列表里的“立即购买”后进入 `/courses/2`，右侧自动打开“订单确认”抽屉，并展示价格、优惠、支付方式和购买须知。
- `git diff --check` 已通过。
- `pnpm run ci` 已通过：90 个测试文件 / 430 个测试通过，生产构建完成；Vite 仍有主包体积大于 500 kB 的既有提醒。

TRX-A/B 课程商品详情与购买确认体验已交付：

- `client/src/features/courses/model/courseCheckout.ts`：新增课程结算摘要模型，统一计算单课购买、会员购买、原价、优惠抵扣、实付金额、交付内容、保障说明、支付方式和开发期支付提示。
- `client/src/features/courses/model/courseCheckout.test.ts`：覆盖课程优惠金额、优惠不倒挂、会员结算摘要和金额格式化。
- `client/src/pages/CourseDetail.tsx`：课程详情页升级为课程商品页，首屏保留课程视觉和核心信息，右侧交易区改为 sticky 商品面板，展示价格、优惠、权益状态、会员/单买对比、学习状态、交付承诺和主操作。
- `client/src/pages/CourseDetail.tsx`：课程目录从购买前“标记完成”改为商品详情预览，只展示章节结构和解锁状态，避免未购买用户误以为可直接学习或改写进度。
- `client/src/pages/CourseDetail.tsx`：新增购买确认抽屉，包含订单摘要、商品金额、原价参考、优惠抵扣、实付金额、交付内容、支付方式、购买须知确认和支付成功权益交付反馈。
- `client/src/pages/CourseDetail.tsx`：移动端新增底部购买条，用户在手机首屏即可看到价格和购买/学习主动作。
- `client/src/features/courses/index.ts`：导出课程结算模型和类型，保持课程 feature 边界统一。

TRX-A/B 验收结果：

- `/courses/1` 会员课程可看到商品交易面板、开通会员/单独购买对比、交付承诺和权益保障说明。
- `/courses/5` 单买课程可打开购买确认抽屉，抽屉展示课程商品、优惠、实付金额、交付内容和支付方式。
- 购买须知未确认时不会进入成功态；确认购买须知后可进入“权益已准备好 / 购买已确认”成功反馈，并展示“开始学习”和“查看成长空间”入口。
- 课程目录购买前只展示“购买后学习”，不再出现“标记完成”入口。
- 浏览器检查桌面宽度无横向溢出；移动宽度 390px 下课程详情、底部购买条和购买确认抽屉无横向溢出；控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、87 个测试文件 / 402 个测试和生产构建均完成。

UX-H 成长空间学习档案与阶段证明承接已交付：

- `client/src/features/courses/model/courseLearningArchive.ts`：新增学习档案派生模型，复用学习计划、课程详情、学习会话、练习摘要和 UX-G `createCourseCompletionFeedback`，统一输出已完成课程档案、阶段证明预览、待补练习和同路径下一步。
- `client/src/features/courses/model/courseLearningArchive.ts`：对已完成但章节 ID 来自旧课程内容的本地记录做兼容归一，避免课程内容迭代后用户已完成记录从档案中消失。
- `client/src/pages/MyCourses.tsx`：成长空间的已完成课程区升级为“学习档案”，展示完成时间、章节进度、练习沉淀、证明状态、阶段证明预览卡、待补练习提示、查看完成反馈和继续路径入口。
- `client/src/pages/MyCourses.tsx`：首屏计划概览和指标区新增阶段证明摘要，并在有待补练习时给出轻量提醒，不抢占“本次继续”主线。
- `client/src/features/courses/index.ts`：导出学习档案模型和类型，保持课程 feature 边界统一。
- `client/src/features/courses/model/courseLearningArchive.test.ts`：覆盖已完成过滤、证书预览状态、完成时间排序、旧章节 ID 兼容和空状态稳定性。

UX-H 验收结果：

- `/me/courses` 能看到已完成课程的学习档案卡，包含“1 门完成”“1 个预览”“待补练习”、阶段证明预览和完成反馈入口。
- 未完成课程不会进入学习档案，也不会展示阶段证明预览口径。
- 已完成但练习未补齐的课程会展示待补练习提醒，练习完整状态仍由课程练习摘要统一判断。
- 从成长空间点击“查看完成反馈”可进入 `/courses/3/learn` 并看到 UX-G 的“课程完成反馈”。
- 浏览器检查桌面宽度无横向溢出，移动宽度 390px 下学习档案区、阶段证明卡和按钮无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、86 个测试文件 / 398 个测试和生产构建均完成。

UX-G 课程完成反馈与阶段证书准备已交付：

- `client/src/features/courses/model/courseCompletionFeedback.ts`：新增课程完成反馈派生模型，基于课程、学习会话、练习摘要、学习路径和下一课推荐输出完成标题、指标、练习沉淀、下一步建议和阶段证明预览。
- `client/src/features/courses/model/courseCompletionFeedback.ts`：阶段证明预览已包含课程名、学习路径、完成时间、章节数、练习完成数、`source`、`syncStatus`、`issueStatus`、`certificateId` 和 `issuedAt` 等后续服务端签发预留字段；第一版保持 `issueStatus=preview`，不生成真实证书编号。
- `client/src/pages/CourseLearning.tsx`：课程完成态区域升级为完整完成反馈面板，展示章节完成、练习完成、学习路径、练习沉淀、同路径下一课和阶段证明预览，并提供学习下一门、查看成长空间、复习本课程入口。
- `client/src/features/courses/index.ts`：导出课程完成反馈模型和类型，保持课程 feature 边界统一。
- `client/src/features/courses/model/courseCompletionFeedback.test.ts`：覆盖未完成不生成反馈、证书预览字段、下一课推荐、无下一课成长空间 fallback、无练习记录空状态和练习完整状态。

UX-G 验收结果：

- 完成 `/courses/3/learn` 后，页面展示“课程完成反馈”、练习沉淀摘要、下一步建议和“阶段证明预览”。
- 阶段证明预览展示待正式签发状态和“正式签发后生成”证书编号占位，没有声称已经正式签发真实证书。
- 完成前页面不提前出现课程完成反馈；`/courses/2/learn` 未解锁课程仍没有资料练习、完成反馈或证书预览入口。
- 浏览器检查桌面宽度无横向溢出，移动宽度 390px 下完成反馈区、证书预览和按钮无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、85 个测试文件 / 394 个测试和生产构建均完成。

UX-F 课程资料与练习记录闭环已交付：

- `client/src/features/courses/model/coursePractice.ts`：新增课程练习记录模型，按 `courseId + chapterId` 管理草稿、练习完成状态、来源、同步状态和更新时间，并提供资料摘要与课程练习统计派生方法。
- `client/src/features/courses/api/localCoursePracticeRepository.ts` 与 `client/src/features/courses/hooks/useCoursePractice.ts`：新增本地持久化 repository 和学习页 Hook，兼容空数据、历史脏数据和后续服务端同步字段。
- `client/src/pages/CourseLearning.tsx`：学习页右侧“资料与练习”升级为当前章节工作台，支持查看章节讲义、填写练习记录、保存草稿、标记练习完成、章节切换读取对应记录和课程完成练习摘要。
- `client/src/features/courses/index.ts`：导出课程练习模型、repository 和 Hook，保持课程 feature 边界统一。
- `client/src/features/courses/model/coursePractice.test.ts` 与 `client/src/features/courses/api/localCoursePracticeRepository.test.ts`：覆盖草稿保存、练习完成独立状态、课程摘要统计、历史数据兼容、资料摘要派生和本地持久化 fallback。

UX-F 验收结果：

- `/courses/3/learn` 可为当前章节保存练习记录，刷新后仍能读取本地草稿。
- 切换到其他章节后，资料与练习面板展示对应章节内容，不串章。
- 练习完成状态与章节完成状态独立，课程完成区可展示练习完成摘要。
- `/courses/2/learn` 未解锁课程仍展示权益边界提示，没有资料与练习输入区或保存入口。
- 浏览器检查桌面无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、84 个测试文件 / 389 个测试和生产构建均完成。

UX-E 课程学习页与章节进度承接已交付：

- `client/src/features/courses/model/courseLearningSession.ts`：新增课程学习会话派生模型，统一计算当前章节、有效完成章节、总进度、已完成状态和章节列表状态。
- `client/src/features/courses/model/courseLearningSession.test.ts`：覆盖当前章节选择、完成进度、完成态复习稳定性、历史脏章节 ID 过滤和未解锁保护。
- `client/src/pages/CourseLearning.tsx`：新增 `/courses/:courseId/learn` 学习页，首屏展示课程标题、所属路径、当前章节、总进度和章节完成 CTA；章节列表可复用 `completeChapter` 标记完成；右侧展示资料/练习占位、测评/咨询支持和同路径下一课。
- `client/src/App.tsx` 与 `client/src/features/courses/index.ts`：接入学习页路由并导出学习会话模型，保持课程 feature 边界统一。
- `client/src/pages/CourseDetail.tsx` 与 `client/src/pages/MyCourses.tsx`：详情页和成长空间中的可学习主 CTA 已进入学习页；未解锁课程仍回到详情页处理购买或会员权益。

UX-E 验收结果：

- `/courses/3/learn` 可访问，首屏能看到当前章节、总进度、章节完成动作、资料与练习、支持路径和同路径下一课。
- 点击“标记本章完成”后，章节进度从 0 推进到 33%，当前章节自动切换到下一章；成长空间和详情页读取同一份本地进度。
- `/courses/2/learn` 未解锁课程展示“课程尚未解锁”，没有章节完成入口，不能绕过购买或会员权限。
- 从课程详情 `/courses/3` 点击“继续学习”会进入 `/courses/3/learn`。
- 从成长空间 `/me/courses` 首屏点击“继续学习”会进入 `/courses/3/learn`。
- 浏览器检查桌面无横向溢出，控制台未发现页面错误。
- `pnpm run ci` 已通过：类型检查、82 个测试文件 / 382 个测试和生产构建均完成。

UX-D 成长空间学习计划承接已交付：

- `client/src/features/courses/model/courseLearningPlan.ts`：新增学习计划工作区派生模型，按进行中、收藏待学、已完成分组，并基于课程路径计算下一门建议课。
- `client/src/features/courses/model/courseLearningPlan.test.ts`：覆盖学习计划分组、同路径下一课跳过已在计划中的课程、空状态稳定性。
- `client/src/pages/MyCourses.tsx`：成长空间首屏改为学习计划主线，展示本次继续、下一步建议、计划概览；课程列表拆分为进行中、收藏待学、已完成，收藏中的可学课程可直接加入学习计划。
- `client/src/pages/MyCourses.tsx`：测评、咨询、订单和会员权益保留为辅助侧栏，不抢占课程学习主线。
- `client/src/features/courses/index.ts`：导出学习计划模型，保持课程 feature 边界统一。

UX-D 验收结果：

- 未登录访问 `/me/courses` 正常展示登录提示和课程中心入口。
- 登录后 `/me/courses` 首屏能看到“本次继续”“下一步建议”和计划概览。
- 免费收藏课程可从“收藏待学”点击“加入学习计划”，随后转入“进行中”并更新首屏继续学习目标。
- 进行中、收藏待学、已完成课程已分区展示，测评和咨询作为辅助区保留。
- 浏览器检查无横向溢出，控制台无错误。
- `pnpm run ci` 已通过：类型检查、81 个测试文件 / 378 个测试和生产构建均完成。

UX-C 课程详情转化与学习计划入口已交付：

- `client/src/features/courses/model/coursePath.ts`：新增按课程识别所属学习路径和获取同路径下一步课程的模型方法，复用 UX-B 的稳定路径数据。
- `client/src/features/courses/model/courseDetailConversion.ts`：新增课程详情主 CTA 文案模型，区分免费/已购/会员已覆盖/需购买/需会员等权益状态。
- `client/src/features/courses/hooks/useCourseDetail.ts`：详情 Hook 返回完整课程列表，支持详情页在 API 与 fallback 模式下稳定计算同路径推荐。
- `client/src/pages/CourseDetail.tsx`：课程详情首屏加入所属路径入口，权益卡片改为“加入学习计划/继续学习/购买/会员”清晰 CTA；新增学习路径说明、下一门建议课程、继续这条路径和同主题补充推荐，咨询陪伴入口跳转 `/consulting`。
- `client/src/features/courses/model/coursePath.test.ts` 与 `courseDetailConversion.test.ts`：覆盖路径识别、同路径下一课和权益 CTA 文案。

UX-C 验收结果：

- `/courses/1` 详情页可看到所属路径、路径位置、下一门建议课程和双层推荐，浏览器检查无横向溢出。
- `/courses/3` 免费课点击“加入学习计划”后切换为“继续学习”，复用现有课程 engagement 状态。
- “需要咨询师陪伴”可从课程详情跳转到 `/consulting`，不抢占课程主 CTA。
- 浏览器控制台无错误。
- `pnpm run ci` 已通过：类型检查、80 个测试文件 / 375 个测试和生产构建均完成。

UX-B 课程路径与推荐转化体验已交付：

- `client/src/features/courses/model/coursePath.ts`：新增稳定课程路径模型，覆盖情绪稳定、关系修复、亲子连接、职场韧性和自我成长，并提供路径课程挑选逻辑。
- `client/src/components/CoursePathSection.tsx`：新增课程路径展示组件，用户可切换路径、查看路径重点课程、进入课程详情或先做测评确认状态。
- `client/src/components/CourseStarterLanes.tsx`：新增课程页快速开始区，按热门课程、免费入门和会员可学组织课程入口。
- `client/src/pages/Home.tsx`：移除重复的旧困扰推荐段落，改为课程路径驱动课程发现区；选择路径会同步分类、排序、清空关键词并更新课程发现标题。
- `client/src/pages/Courses.tsx`：课程列表页接入课程路径、快速开始区和路径匹配课程标题，课程、测评和咨询的转化优先级更明确。
- `client/src/features/courses/model/coursePath.test.ts`：覆盖路径 ID 稳定性、未知路径 fallback 和课程挑选顺序。

UX-B 验收结果：

- 首页和 `/courses` 都可先选择课程路径，再进入匹配课程列表或课程详情。
- 点击“关系修复”路径后，课程发现区标题切换为“关系修复课程，先从沟通和边界开始”，并激活“婚姻关系”筛选。
- `/courses` 页面展示路径区、快速开始区和完整课程发现区；浏览器控制台无错误。
- `pnpm run ci` 已通过：类型检查、79 个测试文件 / 370 个测试和生产构建均完成。

UX-A 用户端课程优先信息架构已交付：

- `client/src/components/CourseDiscoverySection.tsx`：抽出可复用课程发现区，集中承载课程筛选、排序、搜索、会员内容筛选、课程卡片、收藏状态、课程权益状态和分页。
- `client/src/pages/Home.tsx`：首页首屏改为课程主线，主 CTA 指向 `/courses`，次 CTA 指向测评推荐；课程发现区从页面后半段提前到首屏之后，原“主题课程”入口改为真实跳转课程页。
- `client/src/pages/Courses.tsx`：新增用户端课程列表页，用课程主视觉、课程优先/测评推荐/咨询补充的三段说明和完整课程发现区承接独立课程入口。
- `client/src/components/AppHeader.tsx` 与 `client/src/App.tsx`：导航将“心理课程”提前并指向 `/courses`，新增 `/courses` 路由，课程页导航高亮与详情页路由保持一致。

UX-A 验收结果：

- 首页首屏标题、课程 CTA 和课程发现区已通过浏览器验收，课程发现区进入首屏下沿，用户第一屏即可感知课程主线。
- `/courses` 独立课程页可访问，顶部导航“心理课程”正常高亮，页面展示 12 个课程卡片和完整筛选入口。
- `pnpm run ci` 已通过：类型检查、78 个测试文件 / 367 个测试和生产构建均完成。

M9-E 审计归档后台入口与只读校验已交付：

- `shared/domain/auditCenter.ts`：新增 `AuditCenterArchiveVerificationResultSchema`，归档校验包含当前聚合总数、归档总数、总差异、模块差异、最近批次和最近归档事件摘要。
- `server/modules/audit/auditArchiveStore.ts` 与 `postgresAuditArchiveStore.ts`：归档列表支持按归档时间排序，供最近归档批次和最近归档事件摘要使用。
- `server/modules/audit/auditAdminApi.ts`：新增 `GET /api/audit/admin/archive/verification`，由 `audit:archive` 权限控制；校验失败返回安全错误摘要，审计主列表、导出和详情仍不依赖归档表。
- `client/src/features/audit/api/httpAuditCenterRepository.ts`：新增 `archiveEvents` 与 `loadArchiveVerification`，并修正 API 错误消息提取，归档、校验、列表、详情和导出共用稳定仓储边界。
- `client/src/pages/admin/AuditCenter.tsx`：新增管理员可见的归档控制台，展示当前筛选条件、手动归档按钮、归档中/成功/失败反馈、批次统计、失败摘要和只读校验摘要；`operator` 不显示归档入口。
- README、领域契约、数据库说明、产品工程路线、后台路线图和本文件已同步 M9-E 状态与下一步。
- 更新 `shared/domain/auditCenter.test.ts`、`server/modules/audit/auditAdminApi.test.ts`、`client/src/features/audit/api/httpAuditCenterRepository.test.ts` 和 `client/src/pages/admin/AuditCenter.test.ts`，覆盖校验契约、权限、归档校验摘要、仓储方法、页面归档筛选/权限反馈和主审计列表不受归档表失败影响。

M9-E 验收结果：

- 管理员能在 `/admin/audit` 按当前筛选条件触发手动归档，并看到批次 ID、扫描数、成功数、跳过数、失败数和安全失败摘要。
- `operator` 可继续读取审计中心，但看不到归档操作，也无法调用归档或归档校验接口。
- 归档校验接口能解释归档表和当前聚合口径的数量差异、模块分布差异、最近批次和最近归档事件摘要，不暴露原始 payload。
- 主审计列表、CSV 导出和详情仍读取当前聚合逻辑，不因归档表为空或校验失败而不可用。
- 隐私最小化边界不回退，现有后台模块能力不回退。
- `pnpm run ci` 已通过：类型检查、78 个测试文件 / 367 个测试和生产构建均完成。

## 下一步任务包

### 最近完成阶段：ADM-IA-B-B 治理弹窗与治理数据加载彻底迁出

ADM-IA-A 稳定切片已交付：

- `AdminLayout.tsx` 已脱离用户端 `AppHeader`，后台登录页、权限提示页和授权后工作台使用后台专用顶栏，不再显示用户端主导航。
- 后台顶栏只保留后台品牌、当前模块、用户端返回入口、消息入口、后台账号摘要和退出入口，降低管理员在前台/后台之间的心智混淆。
- `adminNavigation.ts` 新增 `course-assets` 模块，路径为 `/admin/course-assets/governance`，与课程商品模块并列。
- `/admin/courses` 默认只加载课程商品列表与内容质量，不再默认拉取素材治理、学习资料报表、治理历史、批量任务、队列观测和高风险预案。
- `/admin/course-assets/governance` 承接原素材治理工作区，继续保留治理摘要、学习资料报表、批量草稿、批量任务、队列观测和高风险动作只读预案。

ADM-IA-B-A 稳定切片已交付：

- 新增 `client/src/pages/admin/course-assets/courseAssetGovernanceModel.ts`，把素材治理筛选、批量任务 query/request 映射、执行预案摘要、治理建议、治理指标和批量任务状态 copy 从 `CourseProducts.tsx` 拆出。
- 新增 `client/src/pages/admin/course-assets/CourseProductAssetGovernancePanel.tsx`，把素材治理工作区主面板从课程商品页主文件迁出，`CourseProducts.tsx` 从 6263 行降至 4684 行。
- 新增 `client/src/pages/admin/courses/CourseProductsPage.tsx` 与 `client/src/pages/admin/course-assets/CourseAssetGovernancePage.tsx` 页面入口，`App.tsx` 不再直接在路由层传递 `workspace` 参数。
- `CourseProducts.test.ts` 继续通过 `CourseProducts.tsx` re-export 使用治理 helper，外部测试契约保持稳定。

ADM-IA-B-B 稳定切片已交付：

- `CourseAssetGovernancePage.tsx` 已升级为真实治理页面，独立拥有治理摘要、学习资料报表、治理历史、批量任务、队列观测和高风险动作预案的数据加载。
- 单素材治理、批量草案保存、批量审批/驳回、批量取消和执行预案/执行记录弹窗已从 `CourseProducts.tsx` 迁入 `course-assets` 页面。
- `CourseProducts.tsx` 已删除 `workspace` prop、`isAssetGovernanceWorkspace` 分支、治理状态、治理数据加载分支和治理弹窗，从 4684 行降至约 3310 行。
- 课程商品页保留商品指标、审计摘要、筛选表格、基础信息、内容、价格、审核和上下架动作；素材治理入口以独立工作区链接承接。
- 治理页“定位素材”改为跳转 `/admin/courses?keyword=课程标题`，商品页支持从 URL keyword 初始化搜索，避免治理页重新打开商品内容编辑弹窗。

### 最近完成阶段：ADM-IA-B-C-A 课程商品内容编辑详情页承载

业务目标：

`CourseProducts.tsx` 仍同时承载商品列表、基础信息弹窗、内容编辑长弹窗、素材上传/审核和价格/审核/状态动作。ADM-IA-B-C-A 先把课程商品“内容编辑/成交素材/章节资料”迁到详情路由，让 `/admin/courses` 更接近商品列表工作台。

ADM-IA-B-C-A 稳定切片已交付：

- 新增 `client/src/pages/admin/courses/CourseProductContentEditorPage.tsx`，独立承接详情文案、成交图文素材、章节资料、素材资产上传和素材合规处理。
- `App.tsx` 新增 `/admin/courses/:courseId` 后台详情路由，并继续包裹 `AdminLayout`。
- `/admin/courses` 的“内容”动作改为跳转到详情页，并用 `returnTo` 记录当前列表筛选、排序和分页；列表页也支持从 URL 初始化这些筛选参数。
- `CourseProducts.tsx` 删除内容编辑长弹窗、内容表单状态、素材上传/合规处理状态和内容保存 handler，从约 3310 行降至约 1734 行。
- 商品详情页复用现有 shared/domain 契约和后台 API，不改动服务端写入边界。

### 最近完成阶段：ADM-IA-B-C-B 课程商品基础/价格/审核动作弹窗组件化

业务目标：

`CourseProducts.tsx` 已不再承载素材治理和内容编辑，但仍包含基础信息、价格编辑、审核动作和上下架动作弹窗。下一步应继续把这些低复杂度动作拆到 `client/src/pages/admin/courses/*` 组件，让列表页最终只保留读取、筛选、表格、分页和动作编排。

ADM-IA-B-C-B 稳定切片已交付：

- 新增 `CourseProductBasicInfoDialog.tsx`、`CourseProductPriceDialog.tsx`、`CourseProductReviewDialog.tsx` 和 `CourseProductStatusDialog.tsx`，迁出基础信息、价格、审核和上下架弹窗 JSX。
- 新增 `courseProductAdminLabels.ts` 统一课程商品状态、审核状态和审核动作中文 copy，避免列表页和弹窗重复维护。
- `CourseProducts.tsx` 保持 `loadProducts`、动作提交和成功后刷新逻辑不变，只负责打开弹窗、维护表单状态和编排 API 调用。
- 新增 `CourseProductDialogs.test.tsx`，通过静态渲染覆盖四个弹窗组件的关键标题、表单项和主动作。

### 最近完成阶段：ADM-PRO-A + ADM-PRO-C 新增课程商品与商品编辑工作台壳

业务目标：

课程商品后台不能只有“维护现有 seed 商品”，必须具备类似电商商品中心的新增入口和独立编辑工作台。ADM-PRO-A + ADM-PRO-C 先打通新增课程商品草稿和工作台壳，后续图片管理、富文本 H5、发布审核和营销配置都挂到同一个稳定入口上。

ADM-PRO-A + ADM-PRO-C 稳定切片已交付：

- `shared/domain/courseProduct.ts` 新增 `CourseProductCreateRequestSchema`、创建价格校验和 `product_create` 审计动作，新增商品价格沿用免费/付费/划线价一致性规则。
- `server/modules/catalog/courseProductStore.ts` 新增 `createCourseProduct`，手动商品从 `courseId >= 10001` 起号，默认以 `draft + not_submitted + manual` 创建，并写入 `product_create` 审计事件。
- `server/modules/catalog/catalogApi.ts` 新增 `POST /api/catalog/admin/course-products`，绑定 `catalog:edit` 权限，返回既有 `CourseProductMutationResponseSchema`。
- `client/src/features/catalog/api/httpCourseProductRepository.ts` 新增 `createCourseProduct`，支持通过 POST 创建课程商品草稿。
- `client/src/pages/admin/courses/CourseProductEditorWorkspacePage.tsx` 新增商品编辑工作台壳，按基础信息、商品图片、价格权益、H5 详情、发布审核组织表单；新增模式可创建草稿，编辑模式可保存基础信息和价格权益，并把详情内容继续链接到现有内容详情页。
- `client/src/pages/admin/CourseProducts.tsx` 新增“新增商品”入口和行级“工作台”入口，最近审计可识别 `product_create`。
- 新增 `server/db/migrations/0023_course_product_create_audit.sql`，让 PostgreSQL 审计动作约束允许 `product_create`。
- 测试覆盖课程商品创建 Store/API、前端仓储 POST 行为和审计动作。

### 最近完成阶段：ADM-PRO-D + ADM-PRO-E 商品图片管理与 H5 富文本编辑器底座

业务目标：

新增商品和工作台壳已打通，但商品图片仍只是封面 URL 和素材详情页跳转，H5 详情仍依赖旧的内容详情页。下一步要把“电商商品管理”的核心编辑体验补起来：主图/详情图可管理、H5 级图文内容可编辑、预览和发布审核可以围绕同一工作台运转。

ADM-PRO-D + ADM-PRO-E 稳定切片已交付：

- `shared/domain/courseProduct.ts` 新增 `CourseProductRichTextBlockSchema` 和 `COURSE_PRODUCT_RICH_TEXT_BLOCK_TYPES`，支持 `section_heading`、`paragraph`、`image`、`bullet_list`、`faq`、`instructor_intro` 和 `purchase_note`，通过结构化字段保存 H5 内容，不允许前端提交任意 HTML。
- `CourseProductMerchandisingContentSchema` 新增 `richTextBlocks`，默认值保持向前兼容；内容质量校验新增 `rich_text_blocks_missing` 提醒，鼓励至少配置 3 个移动端 H5 内容块。
- `buildDefaultCourseProductContent` 默认生成 3 个基础 H5 内容块，旧内容详情页会透传已有 `richTextBlocks`，避免旧编辑器保存时丢失工作台 H5 内容。
- `client/src/pages/admin/courses/CourseProductEditorWorkspacePage.tsx` 会加载既有课程详情内容，商品图片步骤支持维护成交主视觉、详情图和证明图，H5 详情步骤支持维护摘要、适合人群、成交卖点、结构化内容块和移动端预览。
- 商品图片与 H5 详情保存复用 `PATCH /api/catalog/admin/course-products/:productId/content`，继续由 `catalog:edit` 控制，并写入既有 `content_update` 审计；发布/审核仍由商品中心既有动作承接。

### 最近完成阶段：ADM-PRO-F 商品素材选择器与上传接入 + 前台详情消费 H5 内容块

业务目标：

工作台已能用 URL 管理商品图片和结构化 H5 内容块，但商品图片仍需要手工粘贴 URL，前台课程详情也需要直接消费 `richTextBlocks`。本阶段把“运营编辑 -> 商品详情成交展示”的链路闭合到第一版：工作台接入素材库选择/上传，前台详情页按 H5 内容块渲染移动端友好的商品介绍。

ADM-PRO-F 稳定切片已交付：

- `client/src/pages/admin/courses/CourseProductEditorWorkspacePage.tsx` 图片步骤新增商品素材选择器，读取 `loadCourseProductAssets`，展示可用于成交展示的图片素材、合规状态、刷新入口、设为主视觉和加入详情图动作。
- 工作台内新增轻量图片上传入口，复用 `uploadCourseProductAssetFile` 与既有 `POST /api/catalog/admin/course-products/:productId/assets/files`，上传后素材进入素材库并加入商品图片草稿；新上传素材默认保持待审核边界，不新增第二套文件存储。
- `client/src/features/courses/model/courseMerchandising.ts` 将 `richTextBlocks` 纳入课程成交展示 profile，并过滤不可渲染块。
- 前台 `/courses/:courseId` 课程详情新增“课程图文介绍”区，按标题、正文、图片、要点、FAQ、讲师介绍和购买须知渲染受控 H5 内容。
- 验证已覆盖 `pnpm check`、全量 Vitest 136 个测试文件 / 678 条测试、`pnpm build` 和浏览器后台/前台冒烟。

### 最近完成阶段：ADM-PRO-G H5 图片块素材选择增强 + 商品发布前移动预览收口

业务目标：

ADM-PRO-F 已把素材库接入商品图片步骤，但 H5 图片块仍需要手工粘贴图片地址，发布前也缺少一个接近真实用户端的完整预览。下一步要把素材选择能力继续下沉到 H5 内容块，并把发布审核前的移动端预览做成更接近成交页的预检面板。

ADM-PRO-G 稳定切片已交付：

- 在 H5 内容块的图片块中接入同一套素材选择器，支持从商品图片一键填入 `imageUrl`、`altText` 和标题。
- 发布设置步骤增加移动端成交页预览摘要，展示主视觉、卖点、详情图、H5 内容块和价格权益。
- 成交图文图片上传后可直接用于主视觉、详情图和 H5 图片块，保持 `content_update` 审计边界不变。
- `client/src/pages/admin/courses/CourseProductEditorWorkspacePage.tsx` 新增发布前预检清单，覆盖主视觉、详情图、卖点数量、H5 内容块、H5 图片块、操作原因和归档状态。
- 发布审核步骤新增手机成交页预览，运营可在提交审核前查看主视觉、标题、副标题、价格权益、卖点、详情图和 H5 内容块的组合效果。

### 最近完成阶段：ADM-PRO-H 工作台审核动作接入 + 内容质量问题定位

业务目标：

工作台已具备内容编辑、素材选择、移动预览和预检提醒，但审核、上架等动作仍需要回到商品中心列表操作。下一步要把“编辑完成 -> 提交审核/查看阻塞原因”的闭环放进工作台，同时继续尊重既有权限、状态机和审计边界。

ADM-PRO-H 稳定切片已交付：

- `PATCH /api/catalog/admin/course-products/:productId/review` 在提交审核被内容质量阻塞时返回 `details.quality`，包含阻塞/提醒数量、问题 code、message 和 path。
- 前端 `CourseProductRepositoryError` 保留 HTTP status、错误 code 和 details，工作台可读取服务端质量问题而不是只显示通用错误文案。
- 发布审核步骤新增“服务端内容质量”面板，按阻塞/提醒展示问题，并可跳转到商品图片、H5 详情或独立课程内容详情页。
- 发布审核步骤新增“审核动作”面板，按当前审核状态展示提交审核、通过、驳回和撤回动作，复用顶部操作原因、权限校验和既有审核状态机。

### 最近完成阶段：ADM-PRO-I 工作台上架状态联动 + 商品中心发布队列减负

业务目标：

工作台已完成从编辑到审核的闭环，但已审核商品仍需要回到商品中心列表执行上架/下架。下一步要在不绕过发布权限和状态机的前提下，把“审核通过 -> 上架/下架 -> 观察发布状态”的单商品闭环放入工作台，同时让商品中心继续作为批量队列和筛选入口。

ADM-PRO-I 稳定切片已交付：

- 发布审核步骤新增“上架状态”面板，复用既有 `updateCourseProductStatus`，仅在审核通过且状态允许时展示上架/下架动作。
- 上架状态面板展示商品草稿、内容审核、上架状态和前台可售四段状态流，帮助运营判断当前卡点。
- 商品中心列表行移除基础信息、内容和改价等单商品编辑分散入口，具备编辑权限时优先进入“工作台”或“发布管理”。
- `/admin/courses/:courseId/edit?step=publish` 支持从商品中心直达发布审核步骤，列表继续承担筛选和队列视角。

### 最近完成阶段：ADM-PRO-J 课程商品详情装修器 Lite

业务目标：

原图文内容编辑虽然能力充足，但运营视角过于拥挤，难以像电商详情页一样按区块组织内容、单独调整图片和段落风格，也难以在保存前判断移动端成交页效果。本阶段先落一版受控装修器，不开放任意 HTML，不引入低可维护的自由拖拽，把复杂度收敛到“页面结构、内容编辑、样式面板、移动预览”四个稳定边界。

ADM-PRO-J 稳定切片已交付：

- `CourseProductMerchandisingAssetSchema` 和 `CourseProductRichTextBlockSchema` 新增受控 `style` 字段，支持风格、留白、圆角、图片比例、图片适配和说明展示方式。
- 商品工作台 H5/图文内容步骤升级为三栏编辑：左侧页面结构选择图片/段落区块，中间维护摘要、适合人群、卖点和详情块，右侧只编辑当前选中区块的样式并保留移动端预览。
- 旧 `/admin/courses/:courseId` 内容页保存时会透传既有样式字段，避免旧入口覆盖装修器配置。
- 用户端 `/courses/:courseId` 读取并渲染同一份结构化样式，详情图、H5 图片块和文字块可按运营配置呈现，不使用任意 HTML。
- 质量边界：样式能力保持枚举化和结构化，后续可继续做模板、区块组件抽取和素材复用，不把后台变成不可控网页编辑器。

### 最近完成阶段：ADM-PRO-K 详情装修器模板化与区块组件抽取

业务目标：

ADM-PRO-J 已经把详情页拆成结构、内容、样式和预览，但主文件仍承担过多装修器模型、样式选项和面板 JSX，后续继续加排序、复制、模板保存会迅速失控。本阶段先把详情装修器变成可维护的“模型层 + 面板组件 + 受控模板”结构，让运营不需要从空白区块开始搭建，也不开放任意 HTML 或自由 CSS。

ADM-PRO-K 稳定切片已交付：

- 新增 `client/src/pages/admin/courses/courseProductDetailDesigner.ts`，集中管理详情区块样式枚举、模板定义、默认块生成、保存前块选择和模板套用逻辑。
- 新增 `CourseProductDetailDesignerPanels.tsx`，把左侧页面结构和右侧模板/样式面板从商品工作台主文件拆出，主页面只保留数据编排、保存和预览逻辑。
- 新增温暖课程型、下单决策型、图文故事型三套受控模板，模板会补齐空白摘要、适合人群、卖点、H5 标题/副标题，重排结构化 H5 内容块，并统一当前图片与段落样式。
- 商品工作台支持在样式面板一键套用模板，套用后进入高级内容块模式并给出操作反馈，运营可继续局部调整每个图文区块。
- 新增 `courseProductDetailDesigner.test.ts` 固定图文故事型模板的区块顺序、图片样式和保存结果，避免后续迭代把详情结构改散。
- 验收已完成：`pnpm check`、定向测试集合、`pnpm build`、`git diff --check` 均通过；浏览器验证 `/admin/courses/1/edit?step=content` 模板套用成功，`/courses/16` 前台课程详情正常渲染。

下一步 ADM-PRO-L 建议范围：

- 增加 H5 内容块排序、复制和删除确认，保持受控区块 schema，不引入任意 HTML。
- 增加“保存为运营模板 / 从历史模板套用”的最小持久化草案，先限定在开发期 JSON 或现有内容 Store overlay，不影响前台发布内容。
- 把模板套用、区块排序和保存动作纳入操作原因与后续审计设计，避免后台装修动作不可追踪。

### 最近完成阶段：ADM-PRO-L 区块排序、复制与模板持久化

业务目标：

ADM-PRO-K 已经把详情装修器拆成模型层和面板组件，但运营在实际编辑 H5 详情时仍需要可控地调整段落顺序、复用已有区块和沉淀常用详情结构。本阶段先做“轻量但可用”的编排能力和本地模板草案库，避免把后台一步推向不可维护的自由拖拽或任意 HTML 编辑器。

ADM-PRO-L 稳定切片已交付：

- `courseProductDetailDesigner.ts` 新增 H5 区块克隆、插入、移动、删除和模板草案创建/解析/本地存取工具，继续使用 `H5BlockFormState` 和受控 `CourseProductRichTextBlockType`。
- 左侧页面结构列表和中间高级内容块均支持上移、下移、复制和删除；删除进入确认弹窗，明确“只改当前草稿，保存图文内容后生效”。
- 右侧整体样式面板新增“运营模板草案”，可把当前摘要、适合人群、卖点、H5 标题/副标题、区块结构、文案和样式保存到本机草案库，并可回套到当前商品草稿。
- 模板草案第一版使用浏览器本地持久化，不影响前台发布内容；真正进入商品内容仍需要点击“保存图文内容”，继续复用既有 `content_update` 权限、服务端质量校验和操作原因。
- 新增模型单测覆盖区块移动/复制/插入/删除、模板草案解析和回套，避免后续装修器能力扩展时破坏结构化输出。
- 验收已完成：`pnpm check`、全量测试 137 个测试文件 / 688 个测试、`pnpm build`、`git diff --check` 均通过；浏览器验证 `/admin/courses/1/edit?step=content` 可看到区块编排动作和模板草案区。

### 最近完成阶段：ADM-PRO-M 服务端模板库与装修动作审计

业务目标：

ADM-PRO-L 的本地模板草案能提升单机运营效率，但对于课程交易平台来说，详情页模板属于运营资产，必须能跨设备、跨商品复用，并为后续团队共享、审核复盘和模板治理留出服务端边界。本阶段将模板库从浏览器本地迁入后台服务端，同时保持“模板动作”和“商品内容发布”两条链路分离。

ADM-PRO-M 稳定切片已交付：

- 将本地模板草案升级为后台服务端模板库：新增共享契约、开发期 JSON Store、读取/创建/删除 API 和前端 repository。
- 模板库区分个人草案、团队共享模板和系统模板，首版开放系统模板读取与个人模板保存/套用/删除；团队模板仅先进入契约和 Store 边界。
- 新增 `CourseProductDetailTemplate*` 契约和 `courseProductDetailTemplateStore`，默认写入 `.hongboshi-data/course-product-detail-templates.json`，测试环境可使用内存 Store。
- 新增模板保存、删除和套用动作审计事件；模板动作写入模板库审计，真正影响前台详情内容仍必须通过“保存图文内容”触发既有 `content_update` 商品审计。
- 商品编辑工作台右侧“运营模板草案”升级为“运营模板库”，读取系统/个人模板，保存当前 H5 区块结构、文案和样式到服务端，并阻止删除系统模板。
- 新增 Store、API、repository 和详情装修器模型单测，固定模板库解析、保存、套用、删除和审计边界。

### 最近完成阶段：ADM-PRO-N 模板库管理与团队共享准备

业务目标：

ADM-PRO-M 已把详情模板迁入服务端，但右侧样式面板仍承担了过多模板管理信息，团队共享也只停留在契约边界。本阶段把“模板管理”从样式编辑中拆出来，形成独立管理弹窗，并让个人模板可以提交团队共享申请，继续保持模板动作和商品内容发布动作分离。

ADM-PRO-N 稳定切片已交付：

- 新增模板库管理弹窗：支持系统/团队/个人筛选、关键词搜索、模板数量汇总、模板详情、摘要/适合人群/卖点/H5 区块预览和审计时间线。
- 商品编辑工作台右侧样式面板只保留轻量保存与最近模板入口，复杂管理动作迁入弹窗，降低图文内容编辑负载。
- 新增模板共享状态 `private / pending_team_review / team_shared`，个人模板可提交团队共享申请，服务端写入 `template_share_request` 审计。
- 前端 repository、工作台状态和弹窗交互已接入模板列表返回的 `auditEvents`，套用、删除和共享申请后会刷新同一份模板库快照。
- 新增 Store、API、repository 和详情装修器模型单测，固定共享申请、待审核计数、筛选、标签和审计排序边界。

下一步 ADM-PRO-O 建议范围：

- 增加团队共享审核动作：管理员可通过/驳回 `pending_team_review` 模板，通过后转为团队模板或生成团队副本，驳回需保存原因。
- 在商品 `content_update` 审计中记录模板来源摘要：模板 ID、模板名称、模板版本/更新时间和套用时间，便于复盘成交页变更来源。
- 为模板库补充版本策略：个人模板覆盖保存、团队模板升级和历史引用需要有清晰的版本号或快照边界。

### 最近完成阶段：ADM-PRO-O 图文内容富文本快编减负

业务目标：

上一版详情装修器把结构管理、模板管理和样式面板同时暴露在默认页面，已经偏离运营人员“快速编辑商品详情并保存”的主路径。本阶段优先做减法，把课程商品图文内容页改成富文本快编：默认只编辑文案、图文段落和手机预览，复杂装修能力收进高级区。

ADM-PRO-O 稳定切片已交付：

- “图文内容”默认界面改为两栏：左侧富文本快编，右侧手机预览；不再默认展示页面结构和样式面板。
- 商品摘要改为轻量富文本编辑框，支持快速插入重点句和要点，继续按安全文本保存，避免任意 HTML 进入前台。
- 详细图文改为结构化富文本编辑器，支持正文、图片、要点、FAQ、讲师介绍和购买须知；底层仍保存为受控 `richTextBlocks`，不直接保存任意 HTML。
- 详情图文默认按人工编辑的结构化内容保存，`保存图文内容` 会进入既有 `/content` 契约、质量校验和 `content_update` 审计。
- 结构排序、样式调整、模板套用/保存和模板库管理已收进“高级装修”，默认折叠，保留专业能力但不干扰日常运营。

下一步 ADM-PRO-P 建议范围：

- 若需要真正的加粗/链接/强调样式持久化，应补 `summaryRichText` 或通用 inline rich text 契约，并让前台课程详情按白名单安全渲染。
- 将模板审核动作与团队模板发布做成后台队列，避免共享模板直接污染团队资产。
- 在商品内容审计中记录本次保存是否来自模板、富文本编辑或高级装修，方便后续复盘成交页改版效果。

### 最近完成阶段：ADM-PRO-P 摘要格式持久化与模板审核来源追踪

业务目标：

上一阶段把商品摘要改成了轻量富文本快编，但底层仍按普通文本保存，导致运营设置的重点句、要点结构无法在前台成交页稳定呈现。本阶段补齐“可编辑、可保存、可审核追踪”的最小闭环，同时继续避免任意 HTML 和复杂自由画布。

ADM-PRO-P 稳定切片已交付：

- `CourseProductDetailContentSchema` 新增 `summaryRichText` 白名单结构，仅支持段落、要点和重点标记；旧内容缺省会自动落到空结构或由编辑器从普通摘要转换。
- 商品编辑工作台默认摘要区域改为简化富文本框，支持新增段落/要点、切换重点、删除段落，保存时同步普通摘要和结构化摘要。
- 前台课程详情消费 `summaryRichText`，按安全组件渲染摘要段落、要点和重点文本，纯文本摘要仍作为 fallback。
- `CourseProductContentUpdateRequestSchema` 新增可选 `sourceTemplate`，工作台套用快速模板或服务端模板后，下一次保存会在 `content_update` 审计 after 中记录模板 ID、名称、来源和套用时间。
- 旧课程内容编辑页保留 `summaryRichText` 字段，避免旁路保存时丢失结构化摘要。
- 新增领域契约、详情装修器模型和内容 Store 测试，固定摘要富文本转换、默认内容、保存和模板来源审计边界。

下一步 ADM-PRO-Q 建议范围：

- 继续做摘要编辑减负：把“段落/要点/重点”进一步压缩成更像电商后台的块编辑体验，并加入一键从标题/卖点生成摘要但不自动覆盖人工内容。
- 做模板共享审核队列：管理员可通过/驳回 `pending_team_review` 模板，通过后生成团队共享模板或团队版本快照，驳回需保存原因。
- 为模板来源补版本策略：记录套用时的模板更新时间或内容快照摘要，避免模板后续被编辑后影响历史审计解释。

### 最近完成阶段：ADM-PRO-Q-A 摘要编辑进一步减负

业务目标：

ADM-PRO-P 已让摘要格式可以保存和前台渲染，但默认编辑器仍偏“字段表单”，运营在新建课程商品时需要自己组织适合人群、卖点和购买承接。本阶段先做摘要主路径减负：生成建议只作为草稿，不自动覆盖人工内容，运营确认后再填入或追加。

ADM-PRO-Q-A 稳定切片已交付：

- 新增 `createSummaryRichTextSuggestion` 纯模型方法，按课程标题、分类、类型、适合人群和成交卖点生成 1 段重点说明 + 2 条购买决策要点。
- 商品摘要编辑器新增“生成建议”，点击后只展示草稿建议，不改表单；已有摘要时按钮为“追加建议”，空摘要时为“填入摘要”。
- 摘要块编辑控件由下拉选择压缩成“说明/要点”切换按钮，并保留重点标记和删除，减少默认表单操作负担。
- 同一摘要建议能力在默认图文快编和高级装修摘要区域复用，保存仍走 `summaryRichText` 白名单结构。
- 新增装修器模型测试，固定建议生成不修改既有人工摘要。

下一步 ADM-PRO-Q-B 建议范围：

- 先补服务端模板共享审核动作契约：管理员可通过/驳回 `pending_team_review` 模板，通过后生成团队共享模板或团队版本快照，驳回需保存原因和审计。
- 再接入模板管理弹窗中的“待审核”筛选和审核动作，保持审核队列与商品内容保存动作分离。
- 模板通过时记录版本或内容摘要，为后续 `sourceTemplate` 审计解释提供稳定来源。

### 最近完成阶段：ADM-PRO-Q-B 模板共享审核队列服务端契约

业务目标：

个人模板申请团队共享后，不能直接污染团队模板资产，需要先进入审核。服务端必须先明确“待审核 -> 通过/驳回”的状态、权限、审计和快照边界，再接前端队列。

ADM-PRO-Q-B 稳定切片已交付：

- `CourseProductDetailTemplateShareReviewRequestSchema` 新增 `approve / reject` 审核动作契约。
- 详情模板新增审核元数据：审核人、审核时间、审核原因和通过后生成的团队模板 ID。
- 新增 `template_share_approve` 与 `template_share_reject` 审计动作，前端审计时间线标签同步支持。
- 服务端新增 `reviewCourseProductDetailTemplateTeamShare`：仅处理 `personal + pending_team_review` 模板；通过时生成独立 `team` 模板快照并把原个人模板标记为已共享；驳回时退回 `private` 并记录原因。
- Catalog API 新增共享审核 payload 和 `/share-review` 路由；只读账号不可审核，审核权限复用 `catalog:review`。
- 新增领域契约、Store 和 API 单测，固定通过、驳回、非待审核模板不可审核和权限边界。

下一步 ADM-PRO-Q-C 建议范围：

- 在模板库管理弹窗中增加“待审核”筛选视图，展示申请人、申请时间、模板内容摘要和最近审计。
- 给具备审核权限的管理员接入通过/驳回动作，驳回必须填写原因；审核后刷新模板库快照和审计时间线。
- 继续保持模板审核与商品内容 `/content` 保存动作分离，前端文案明确“通过后生成团队模板快照”。

### 最近完成阶段：ADM-PRO-Q-C 模板共享审核队列前端接入

业务目标：

服务端已经具备模板共享审核状态机后，后台需要让管理员在原有模板库中低成本处理申请，而不是再开一个信息负载更大的页面。审核动作必须和商品详情内容保存解耦，避免运营误以为通过模板会直接改动前台商品。

ADM-PRO-Q-C 稳定切片已交付：

- 模板库管理弹窗新增“待审核”筛选，和系统/团队/个人模板筛选并列，管理员可以直接聚焦共享申请。
- 选中待审核个人模板时，右侧新增共享审核区，展示申请人、申请时间、审核意见输入、通过和驳回按钮。
- 驳回动作前端强制填写审核原因；通过动作可使用默认原因，统一提交到 `/share-review`。
- 工作台接入 `reviewCourseProductDetailTemplateTeamShare` repository 方法，审核成功后刷新模板库快照和模板动作审计时间线。
- 无 `catalog:review` 权限的账号仍可查看申请，但不会展示审核输入和动作按钮。
- 新增模板库弹窗 SSR 测试和模型测试，固定待审核筛选、审核控件和审计动作文案。

下一步 ADM-PRO-Q-D 建议范围：

- 给团队模板补充“来源个人模板/审核人/审核原因/通过时间”的可读展示，让后续模板复用可追溯。
- 套用服务端团队模板后，在商品内容 `sourceTemplate` 审计解释中展示模板作用域、审核来源和生成快照 ID。
- 在模板通过后避免团队模板列表出现重复语义的同名模板，先做前端提示或服务端去重预检。

### 最近完成阶段：ADM-PRO-R-B 商品图片排序、批量选择与上传后自动保存体验

业务目标：

商品图片页已经去掉素材审核阻塞，但运营仍需要在上传、选择、排序和保存之间来回确认，容易误以为图片没有生效。本阶段把高频图片动作改成“动作即保存”，同时保留手动字段编辑后的明确保存入口。

ADM-PRO-R-B 稳定切片已交付：

- 抽出 `persistContentFormDraft`，上传、单张设主图、单张加入详情、批量加入详情和图片排序复用同一条内容保存路径。
- 可用图片支持勾选、多选清空和一键批量加入详情，成功后写入商品详情内容并刷新服务端返回的内容快照。
- 当前详情图支持上移/下移排序，排序动作会自动保存；手动修改标题、用途、图片地址和说明仍通过“保存手动修改”提交。
- 上传图片成功后直接保存为成交主视觉或详情图，不再提示“保存商品图片后生效”或“重新审核”。
- `courseProductDetailDesigner` 新增 `moveMediaAssetForm` 纯模型，并用单测固定图片排序边界。

下一步 ADM-PRO-S-A 建议范围：

- 发布设置页先去掉默认审核心智，把主动作改成“保存并上架 / 下架”，审核状态仅作为开发期兼容字段隐藏在权限边界内。
- 梳理服务端发布状态机：在开发期可以由具备编辑权限的后台账号直接把完整商品推进到可售，保留审计和内容质量校验。
- 发布设置页减少四段状态流和预检噪音，聚焦前台可售状态、最近保存时间、移动成交页预览和一键上架/下架。

### 最近完成阶段：ADM-PRO-S-A 发布设置去审核化与一键上架体验

业务目标：

商品图片和图文编辑已经进入“上传/选择后自动保存”的轻操作路径，发布页如果继续暴露审核动作、四段状态流和多组说明，会让运营误以为还需要复杂审批。本阶段先把默认发布体验改成“是否前台可售”和“保存并上架/下架”两个核心判断。

ADM-PRO-S-A 稳定切片已交付：

- 发布设置页顶部指标从完整度、上架状态、审核状态改为完整度、前台售卖和价格权益。
- 默认发布页删除审核动作区和四段发布状态流，保留移动成交页预览、发布前检查、服务端内容质量和发布操作。
- 新增 `saleStatusForProduct`，统一输出待创建、未上架、前台可售、发布异常和已归档的运营可读状态。
- 新增 `submitQuickPublish`：先保存当前图文内容，再按服务端现有状态机完成兼容发布状态推进，最后上架商品并记录审计；质量校验失败仍会回写结构化问题并定位到工作区。
- 下架动作保留为单独主动作，避免已上架商品和待上架商品在同一页出现多组按钮。

### 最近完成阶段：ADM-PRO-S-B 发布后前台回看与购买链路验证入口

业务目标：

发布页已经变成一键上架/下架后，运营下一步最关心的是“用户端是否看得到、是否能下单”。本阶段把发布后的前台回看和购买入口验证放在同一个轻量区域，避免运营发布后再去用户端手动找课程。

ADM-PRO-S-B 稳定切片已交付：

- 发布设置页新增“发布后验证”区，只有当前商品达到前台可售状态才开放验证动作。
- “查看前台详情”会打开 `/courses/:courseId?focus=content`，帮助运营直接回看成交图文内容。
- “打开购买入口”会打开 `/courses/:courseId?checkout=course`，复用用户端既有购买意图参数拉起课程结算抽屉。
- 验证区展示前台详情、成交图文和购买入口三个最小判断，避免再把审核流程塞回发布页。

下一步 ADM-PRO-T-A 建议范围：

- 商品基础信息和价格权益页继续减负，优先把明确安全的字段改为离焦自动保存或单区保存。
- 保留“操作原因”但提供更智能的默认值，减少每步都需要重复输入的负担。
- 在基础信息、价格权益和发布页串起“最近保存时间 / 最近操作者”摘要，帮助运营判断前台展示版本。

### 最近完成阶段：ADM-IA-B-C-C 课程商品列表行与筛选组件化

业务目标：

商品编辑、审核和上架主链路已经进入工作台，课程商品列表需要继续收敛为队列视图。本阶段把列表行、筛选区、指标区和审计摘要拆成稳定组件，降低 `CourseProducts.tsx` 的维护压力，并为后续发布队列分组、批量筛选和更多运营指标预留边界。

ADM-IA-B-C-C 稳定切片已交付：

- 新增 `CourseProductListRow`，承接商品封面、分类、讲师学习数、价格、状态、内容质量、工作台/发布管理入口和只读 fallback。
- 新增 `CourseProductFilters`，承接关键词、分类、状态和排序筛选，继续复用现有 `CourseProductListQuery`、URL 初始查询和分页刷新行为。
- 新增 `CourseProductMetrics` 和 `CourseProductAuditTrail`，把商品摘要指标与最近审计展示从主页面迁出。
- 新增 `courseProductListPresentation.ts`，集中课程商品价格、日期、状态样式、审核动作和审计文案格式化逻辑，避免列表页散落展示判断。
- `CourseProducts.tsx` 现在只负责认证权限、列表/内容质量加载、分页、刷新、动作弹窗和导航，不新增服务端写动作、不改变权限与审计契约。

### 最近完成阶段：ADM-IA-B-C-D 课程商品发布队列只读分组与批量操作预案

业务目标：

列表行和筛选区组件化后，可以在不新增高风险批量写动作的前提下，把课程商品中心进一步做成“发布运营队列”。本阶段先补只读分组、批量候选预案和发布风险提示，让运营能快速识别待补内容、待审核、待上架、已发布但需复查的商品集合，再为未来批量提交审核、批量上架和二次审批留下清晰边界。

ADM-IA-B-C-D 稳定切片已交付：

- 新增发布队列面板，展示待补内容、待提交审核、待审核、待上架和已上架复查 5 个只读队列。
- 课程商品列表曾以当前筛选范围预览队列，已在 ADM-IA-B-C-E 被服务端聚合替代。
- 批量预案明确 `previewOnly=true`、`executable=false`，仅展示批量提交审核、批量审核跟进、批量上架和已发布复查的候选/阻塞/风险，不新增写动作。
- 分组规则、归档排除、批量预案不可执行和风险分布已在 ADM-IA-B-C-E 迁入服务端契约与 API 测试覆盖。

### 最近完成阶段：ADM-IA-B-C-E 课程商品发布队列服务端聚合契约与批量草案

业务目标：

前端只读预案已经帮助运营看到发布队列，但大规模商品不能长期依赖前端聚合。本阶段把发布队列抽象成服务端聚合契约，并先建立“批量任务草案”而非真实执行：运营可基于筛选条件生成提交审核/上架候选快照，系统保存候选、阻塞、风险、创建人和原因，等待后续二次审批与漂移预检。

ADM-IA-B-C-E 稳定切片已交付：

- `shared/domain/courseProduct.ts` 增加课程商品发布队列摘要、候选快照、风险摘要、批量草案、草案列表和草案创建请求契约。
- 新增 `getCourseProductPublishQueue` 服务端聚合，按当前筛选条件读取完整范围，生成 5 个队列分组、动作预案、风险摘要和 safety notes，替代前端最多 200 条的临时聚合。
- 新增 `CourseProductPublishQueueBatchTaskStore` 接口与内存/JSON 实现，默认仅保存草案；草案记录操作者、角色、筛选条件、原因、候选快照、阻塞摘要、风险分布、`previewOnly=true` 和 `executable=false`。
- 新增 `/api/catalog/admin/course-products/publish-queue`、`/publish-queue/batch-tasks` GET/POST 后台 API，并接入 `catalog:read` / `catalog:review` 权限。
- `/admin/courses` 发布队列面板改为读取服务端聚合，支持按当前筛选条件生成批量草案，并展示最近草案摘要。
- 不改变现有单商品审核/上架状态机，不写课程商品审计事件。

### 最近完成阶段：ADM-IA-B-C-F 课程商品发布队列草案审批与漂移预检

业务目标：

发布队列草案已经可以保存候选快照，但任何真实批量动作都必须先具备审批、漂移预检、幂等执行计划和审计事件设计。下一步先做“可审批但不可执行”的稳定切片：运营创建草案后，管理员可查看候选漂移、阻塞变化和风险变化，并给出通过/驳回意见；仍不执行提交审核、审核通过或上架。

ADM-IA-B-C-F 稳定切片已交付：

- `shared/domain/courseProduct.ts` 扩展发布队列草案审批契约，新增提交、取消、审批请求，审批前后摘要和 `CourseProductPublishQueueBatchTaskApprovalPreflight` 漂移预检结构。
- `server/modules/catalog/courseProductPublishQueue.ts` 新增草案提交审批、取消、审批/驳回和预检 service；预检会对比草案 `candidateSnapshot` 与当前服务端队列，识别候选消失、新增候选、上架/审核状态变化、内容质量变化、队列分组和风险变化。
- 新增 `/api/catalog/admin/course-products/publish-queue/batch-tasks/:taskId/preflight|submit|cancel|review` 后台 API，继续使用 `catalog:review` 权限；非管理员不可审批自己创建的草案，漂移较大时返回 409 和预检详情。
- `/admin/courses` 发布队列面板升级为“草案审批台”，支持最近草案的提交审批、漂移预检、通过、驳回和取消，并展示预检摘要与安全提示。
- 本阶段仍不调用单商品 `review_update/status_update` 状态机、不写课程商品批量审计事件、不开放真实批量执行。

### 后台待续：ADM-IA-B-C-G 课程商品发布队列执行预案与审计事件设计

业务目标：

草案已经具备审批和漂移预检，但“审批通过”之后仍不能直接批量执行。下一步先做只读执行预案和审计事件结构设计：对已审批且无需重建的草案生成逐商品计划，明确每个候选会执行什么动作、为什么跳过、预计写入哪些审计事件，并继续保持 `previewOnly=true`、不修改商品 Store。

建议实施范围：

- 新增发布队列执行预案共享契约：逐商品计划项、计划状态、风险等级、预计审计事件、跳过原因和汇总指标。
- 新增只读执行预案 service/API：仅允许 `approved` 且 `approvalPreflight.requiresRecreate=false` 的草案生成预案；再次对当前队列做轻量漂移检查，漂移项进入 `skipped`。
- 后台发布队列面板提供“查看执行预案”入口，用抽屉或轻量详情区展示计划项、预计审计事件和不可执行安全边界。
- 明确未来真实执行的审计事件结构：批量提交审核对应 `review_update`，批量上架对应 `status_update`，复查/跟进类动作仅写计划或待办审计；本阶段仍不真正写审计、不修改商品状态。

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

- 课程详情章节/素材是否要从 JSONB 拆成独立表。建议 M2-G 先用 JSONB 保持可维护速度，等学习记录、资料下载和素材真实文件管理进入后再拆表。
- 真实支付渠道优先接微信支付还是支付宝。退款适配接口和受理摘要已完成，建议 M6 财务账期/手续费基础稳定后选择一个渠道试点。
- 财务账期第一版已按自然月落地；后续真实渠道结算时再决定是否引入支付渠道账单日或渠道结算周期覆盖规则。
- 财务导出第一版已采用 CSV；后续如有财务模板要求，再补 XLSX。
- 交易操作 Store 已独立落表；统一审计中心第一版已先做只读聚合，M9-F 已完成归档表只读检索预览，后台专项可在用户端交易链路稳定后回到 M9-G；当前连续执行指针为 ADM-PRO-M 服务端模板库与装修动作审计，ADM-IA-B-C-G 课程商品发布队列执行预案、CUX-I-B-B-T 高风险动作执行开关、会员待支付订单过期状态机和正式证书签发审核流需另立任务包。
