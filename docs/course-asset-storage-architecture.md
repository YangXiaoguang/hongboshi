# 课程素材正式存储架构准备

## 目标

当前课程素材已经打通开发期链路：后台登记或上传素材、合规审核、绑定章节资料、学习页受控下载。下一阶段的目标是把 `.hongboshi-data/course-product-assets.json` 与本地文件目录演进为可检索、可审计、可清理、可复用的正式素材系统。

本阶段只落设计与工程边界，不切换运行时真相源。现有 JSON Store、本地文件 adapter、后台素材管理和用户端下载接口继续可用。

## 数据模型

`server/db/migrations/0019_course_product_asset_tables.sql` 先落三类表：

- `course_product_asset_objects`：保存对象存储事实。核心字段包括 `object_key`、`provider`、`bucket`、`region`、`mime_type`、`size_bytes`、`content_hash`、`original_file_name`、`reference_count`、`created_by`、`created_at` 和 `deleted_at`。
- `course_product_assets`：保存业务素材元数据。核心字段包括 `product_id`、`course_id`、`chapter_id`、`kind`、`title`、`source_type`、`object_key`、`public_url`、`usage`、`compliance_status`、`download_enabled`、`reference_count`、上传/审核人和软删除时间。
- `course_product_asset_references`：保存素材引用关系。核心字段包括 `asset_id`、`product_id`、`course_id`、`chapter_id`、`reference_type`、`material_placeholder_id`、`material_placeholder_index`、`created_by`、`created_at` 和 `deleted_at`。

索引优先覆盖运营高频查询：按课程商品查看素材、按课程/章节查资料、按合规状态查审核队列、按对象 key 定位文件、按引用类型统计使用情况和按软删除状态清理。

## 对象存储 Adapter

`server/modules/catalog/courseProductAssetObjectStorage.ts` 定义正式对象存储接口和 provider 配置边界：

- `putObject`：写入对象，返回 `objectKey`、`provider`、`mimeType`、`sizeBytes`、`contentHash`、原文件名和创建人。
- `readObject`：按 `objectKey` 读取对象，供后台下载和受控下载接口复用。
- `createSignedReadUrl`：按 provider、对象 key、过期时间和签名密钥生成短期读取 URL；本地模式生成服务端本地读取路由，远端 provider 通过公开基础域名生成对象路径 URL。
- `deleteObject`：支持软删与物理删除两种语义，默认软删，避免误删仍被引用的学习资料。

`resolveCourseProductAssetObjectStorageConfig` 读取 `HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PROVIDER`，默认 `local`，并支持 `s3`、`oss`、`cos` 三类远端 provider 占位。远端 provider 必须提供 `HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_PUBLIC_BASE_URL`、`HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_BUCKET`、`HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_REGION` 和 `HONGBOSHI_COURSE_PRODUCT_ASSET_OBJECT_SIGNING_SECRET`；`HONGBOSHI_COURSE_PRODUCT_ASSET_SIGNED_URL_TTL_SECONDS` 控制默认短期读取 URL 有效期，默认 600 秒。

当前远端 provider 先落稳定工程边界：`createCourseProductAssetObjectStorage` 会按配置返回 provider-aware adapter，descriptor 会记录 provider/bucket/region，短期 URL 会走对应公开域名与 HMAC 签名；对象字节仍复用注入的 `CourseProductAssetFileStorage`，后续接入真实 SDK adapter 时替换 byte storage/putObject/readObject 实现即可，不需要改 API payload、素材 Store 或前台学习页。

本地实现 `LocalCourseProductAssetObjectStorage` 复用现有 `CourseProductAssetFileStorage`，生成 `course-assets/{productId}/{assetId}/{sha256前缀}-{fileName}` 形式的对象 key，并计算 `sha256:*` 内容指纹。现有 `uploadCourseProductAssetFile` 已改为通过 `CourseProductAssetObjectStorage.putObject` 写入文件对象并保存 `objectKey` 与 `contentHash`；后台下载、公开图片查看和已解锁课程资料下载会通过 object storage adapter 读取对象，历史 `storageKey` 仍作为兼容 fallback。

## 回填计划

从开发期数据迁移到素材专表时，建议分三步：

1. 干跑扫描：
   - 扫描 `.hongboshi-data/course-product-assets.json`，按 `id`、`productId`、`chapterId`、`kind`、`storageKey`、`publicUrl`、`complianceStatus` 和 `downloadEnabled` 生成素材行候选。
   - 扫描 `course_product_contents.chapters[].materialPlaceholders[]`，按 `assetId`、`assetUrl`、`chapterId`、`type` 生成引用行候选。
   - 输出 `CourseProductAssetBackfillPlanSchema` / `CourseProductAssetBackfillMutationResultSchema` 结果，不写库。
2. 受控写入：
   - `GET /api/catalog/admin/course-products/assets/backfill` 提供管理员只读预检，`POST /api/catalog/admin/course-products/assets/backfill` 接收 `dry_run` 或 `commit` 动作。
   - `commit` 必须具备 `catalog:review` 权限、`confirmWrite=true` 和操作原因；缺少 `DATABASE_URL` 或目标 Store 不支持引用写入时返回冲突，不做部分静默切换。
   - 对 `sourceType=object_storage` 且存在 `objectKey/contentHash` 的素材写入 `course_product_asset_objects`，并写入/更新 `course_product_assets`。
   - 对外部 URL 或历史 data URL 素材只写 `course_product_assets`，`object_key` 为空，后续由运营重新上传或转存对象存储。
3. 引用关系回填：
   - 当前切片先把章节资料按 `chapter_material/chapter_exercise/chapter_audio/chapter_video` 写入引用表，引用 ID 由课程商品、章节、素材占位和素材 ID 组成，重复执行保持幂等。
   - 成交图文素材引用后续可按 `merchandising_showcase/proof/gallery` 补充，不改变现有章节资料引用口径。
   - 回填完成后仍保持 API payload 不变，前台继续读取 `CourseProductAssetSchema` 和章节 `materialPlaceholders`。

## 兼容边界

- 当前不删除 `.hongboshi-data/course-product-assets.json`。
- 当前支持显式开启 `HONGBOSHI_COURSE_PRODUCT_ASSET_STORE=postgres`，但默认开发路径仍保持 JSON 文件 Store，避免在未回填时误切换。
- 当前不把学习页下载改为签名 URL 直连对象存储，仍走 `/api/courses/:courseId/assets/:assetId/download` 做登录、权益、合规和下载开关校验；服务端读取 payload 内部可取得 `signedReadUrl`，HTTP 路由当前继续返回文件流，避免绕过课程权益和合规边界。
- 当前不允许前端直接修改合规状态、下载开关或对象 key。
- 当前不自动把开发期 JSON Store 切换为 PostgreSQL；管理员应先查看 backfill 预检结果，再通过受控写入入口回填。

## 素材治理只读基线

`server/modules/catalog/courseProductAssetGovernance.ts` 已建立只读治理 service，聚合课程商品、课程详情内容、素材 Store 和可选引用表，输出 `CourseProductAssetGovernanceResultSchema`：

- 识别未引用素材、重复 `contentHash`、待审核素材、驳回素材、下载关闭的学习资料、疑似可软删素材和缺失课程商品的孤立素材。
- 当素材 Store 支持 `listAssetReferences` 时，引用数量优先来自 `course_product_asset_references`；开发期 JSON/内存 Store 不支持引用表时，会从 `course_product_contents.chapters[].materialPlaceholders[]` 兼容推导，并在结果中标记 `referenceSource=content_material_placeholders`。
- `GET /api/catalog/admin/course-products/assets/governance` 由 `catalog:read` 权限控制，只返回治理摘要和只读素材列表，不执行删除、批量审核、自动清理或下载开关修改。
- 前端 `httpCourseProductRepository.loadCourseProductAssetGovernance` 已可读取同一契约，为下一步 `/admin/courses` 治理面板接入准备。

## 素材治理受控动作

`server/modules/catalog/courseProductAssetGovernanceAction.ts` 已建立单素材治理动作 service，使用 `CourseProductAssetGovernanceActionRequestSchema` / `CourseProductAssetGovernanceActionResultSchema` 描述操作输入和结果：

- 第一版仅支持 `acknowledge_issue`、`mark_duplicate_primary` 和 `mark_soft_deleted` 三类单素材动作，不做批量处理，不做物理删除对象。
- 写动作由 `catalog:review` 权限控制，并会在执行前重新计算治理结果，校验素材存在、商品存在、问题类型仍匹配、重复主素材属于同一 `contentHash` 分组，以及软删除候选没有引用。
- `mark_soft_deleted` 只设置素材 `deletedAt` 并关闭 `downloadEnabled`；后台文件、对象存储字节和引用表不被物理删除。受控下载入口已拒绝读取 `deletedAt` 素材。
- 每次治理动作写入课程商品审计事件 `asset_governance`，记录 actor、assetId、productId、治理动作、问题类型、引用数量、重复素材 ID、before/after 摘要、原因和时间。
- `/admin/courses` 治理面板已开放单行处理入口；批量删除、自动合并引用、物理对象清理和跨课程素材复用仍后置。

## 治理历史与批量草稿

`server/modules/catalog/courseProductAssetGovernanceHistory.ts` 已补充治理动作历史和批量处理草稿预览：

- `GET /api/catalog/admin/course-products/assets/governance/history` 由 `catalog:read` 权限控制，只从课程商品审计事件中过滤 `asset_governance`，支持按素材 ID、商品 ID、治理动作、问题类型、操作者和日期范围筛选；返回审计摘要，不读取原始文件，不暴露对象签名 URL。
- `GET /api/catalog/admin/course-products/assets/governance/batch-draft` 由 `catalog:review` 权限控制，按当前治理问题筛选生成候选素材数、问题类型分布、拟处理动作分布和安全提示；第一版仅预览，不修改素材 Store、不写审计、不合并引用、不软删和不物理删除。
- `/admin/courses` 素材治理面板已展示最近治理动作、历史筛选和批量处理草稿摘要，帮助运营在进入真实批量任务前确认风险边界。

## 批量治理任务草案

`server/modules/catalog/courseProductAssetGovernanceBatchTask.ts` 已建立批量治理任务草案 service，`server/modules/catalog/courseProductAssetGovernanceBatchTaskStore.ts` 提供内存、JSON 文件与显式 PostgreSQL Store，默认文件为 `.hongboshi-data/course-product-asset-governance-batch-tasks.json`，配置 `HONGBOSHI_COURSE_PRODUCT_ASSET_GOVERNANCE_BATCH_TASK_STORE=postgres` 且存在 `DATABASE_URL` 时会写入 PostgreSQL：

- `CourseProductAssetGovernanceBatchTask*` 契约记录任务 ID、筛选快照、候选素材快照、候选数、问题分布、拟处理动作分布、创建人、审批状态、原因、备注、审批信息、审批前后摘要、审批前预检、取消信息、执行状态、执行尝试次数、执行原因、最近失败原因、执行摘要、逐素材执行明细和审计事件 ID；`CourseProductAssetGovernanceBatchTaskExecutionJob*` 契约描述队列 job 的排队、运行、成功和失败状态，`CourseProductAssetGovernanceBatchTaskQueueObservation*` 契约只读描述最近 job、可重试压力和运营提示。
- `GET/POST /api/catalog/admin/course-products/assets/governance/batch-tasks` 由 `catalog:review` 控制，列表支持按审批状态、执行状态、创建人、执行人、问题筛选、动作和日期范围检索；第一版只允许创建 `acknowledge_issue` 草案，创建时会重新计算批量草稿预览，拒绝空候选和同筛选重复待审批草案。
- `PATCH /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/cancel` 仅允许草案创建人或管理员取消待审批草案。
- `PATCH /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/review` 支持通过审批和驳回草案；非管理员不能审批自己创建的草案，通过审批前会重新计算候选范围，候选消失、问题类型变化或数量变化过大时保持待审批并提示重新生成。
- `GET /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execution-plan` 仅允许已通过审批且审批预检未要求重建的草案生成只读执行预案，返回逐素材计划/跳过原因、风险等级、预计审计事件数量和安全提示；该接口不修改素材 Store、不写 `asset_governance` 审计、不合并引用、不软删和不物理删除对象。
- `GET /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execution-detail` 可重新读取已审批任务的执行详情，返回执行预案、执行摘要、逐素材结果、跳过/失败原因和关联审计事件，避免历史任务只能依赖弹窗内存态。
- `POST /api/catalog/admin/course-products/assets/governance/batch-tasks/:taskId/execute` 仅允许具备 `catalog:review` 的后台账号在明确确认和填写执行原因后执行已审批任务；第一版只执行 `acknowledge_issue`，执行前会通过 Store 抢占执行锁并重新生成预案，漂移项跳过，成功项只追加 `asset_governance` 审计并保存执行状态；失败任务保存最近失败原因和失败时间，可在锁释放后安全重试，已完成任务仍幂等回放。
- `server/modules/catalog/courseProductAssetGovernanceBatchTaskExecutionQueue.ts` 已提供 `enqueue/runNow/getJobStatus/listJobs` 最小队列接口，当前 HTTP 入口使用 `runNow` 复用同一 worker；后续接 BullMQ、Redis 队列或云任务时只替换队列实现，不改执行状态机。
- `/admin/courses` 批量草稿区已加入“保存草案”、批量任务筛选/分页列表、通过审批、驳回、取消、已审批任务“生成执行预案/查看执行记录”和预案内“确认执行记录处理”入口，明确展示审批状态、执行状态、执行摘要、跳过/失败线索、最近失败原因、可重试提示和审计事件 ID；同一区域已展示队列观测摘要，区分最近 job、执行中、失败和可重试任务。当前批量执行只写审计和任务执行结果，不修改素材 Store、不合并引用、不软删和不物理删除对象。

## 高风险批量动作只读预案

`server/modules/catalog/courseProductAssetGovernanceBatchActionPlan.ts` 已建立批量软删与引用合并的只读预案 service，复用素材治理结果、课程详情内容、素材 Store 和可选引用表，不新增写入：

- `CourseProductAssetGovernanceBatchActionPlan*` 契约记录动作筛选、重复素材分组、建议主素材、受影响引用、软删除影响、风险等级、安全软删数量和只读安全声明。
- `GET /api/catalog/admin/course-products/assets/governance/batch-action-plan` 由 `catalog:review` 控制，支持 `all`、`mark_duplicate_primary`、`mark_soft_deleted`、商品 ID 和预览数量参数；接口固定返回 `previewOnly=true`、`executable=false`、`willModifyAssetStore=false`、`willWriteAuditEvents=false`。
- 重复素材预案会按引用数量、前台成交/学习使用、合规通过、下载开放和上传时间建议主素材，并列出后续可能需要重定向的引用；跨课程、前台使用或学习下载占用会提高风险等级。
- 软删除预案会标出是否仍有引用、是否通过审核、是否开放下载、是否在课程详情成交素材或章节资料中使用，并只把无引用、未开放下载且未被前台使用的素材标为可安全软删候选。
- `/admin/courses` 已在素材治理面板展示“高风险批量动作只读预案”，运营可先看到重复组、合并影响、软删影响和安全提示；当前仍不可执行，不修改素材 Store、不合并引用、不软删、不写审计、不物理删除对象。

## 学习资料运营报表

`server/modules/catalog/courseProductLearningMaterialOperationsReport.ts` 复用素材治理结果、课程商品 Store 和课程详情章节素材占位，提供学习资料运营只读报表：

- `CourseProductLearningMaterialOperationsReport*` 契约聚合课程数、章节数、资料槽位数、已绑定槽位数、绑定率、学习资料素材数、已通过合规数、开放下载数、未引用数、待审/驳回数、软删候选数、治理问题数和引用来源。
- 报表分布覆盖资料类型、合规状态、下载状态、引用类型和治理问题类型；课程维度行展示每个课程的章节数、资料槽位、已绑定槽位、绑定率、资料素材数、开放下载数和问题素材数。
- `GET /api/catalog/admin/course-products/assets/learning-material-report` 由 `catalog:read` 控制，只返回摘要和问题分布，不返回文件内容、签名 URL 或敏感用户学习记录。
- `/admin/courses` 已把学习资料运营报表放在素材治理面板内，用于决定后续是优先补齐资料绑定、处理合规，还是进入批量治理预案。

## 后续切片

- `CUX-I-B-B-D`：已实现 `PostgresCourseProductAssetStore`，让素材列表、上传登记、合规审核和后台下载可显式切换 PostgreSQL；已实现素材回填 dry-run service，可扫描 JSON Store 与章节素材占位并输出扫描数、可回填素材数、引用数、跳过数和原因。
- `CUX-I-B-B-E`：已实现素材回填写入 service、PostgreSQL 引用 upsert 和后台 backfill API，允许管理员在 dry-run 结果确认后把对象素材、素材元数据和章节引用关系写入 PostgreSQL。
- `CUX-I-B-B-F`：已接入对象存储 provider 配置解析、local/s3/oss/cos 边界、远端公开域名短期 HMAC 签名 URL、上传/读取路径 object storage adapter 化和 provider 级测试。真实云 SDK、STS 临时凭证和 CDN 回源策略仍属于上线前集成任务。
- `CUX-I-B-B-G`：已完成素材治理共享契约、只读 service、后台 API 和前端 repository 基础，覆盖未引用素材、重复内容 hash、待审/驳回素材、下载关闭资料、软删候选和引用数量。
- `CUX-I-B-B-H`：在 `/admin/courses` 接入素材治理面板，展示治理摘要、问题筛选、引用来源提示和素材详情跳转；继续保持只读，不引入批量删除。
- `CUX-I-B-B-I`：已接入单素材治理受控动作、`asset_governance` 审计、软删除读取边界和后台单行处理入口；后续可继续补真实对象清理审批流。
- `CUX-I-B-B-J`：已接入治理动作历史筛选、批量处理草稿预览、后台历史/草稿展示和只读安全边界；真实批量写入、自动合并引用、对象物理删除和异步任务队列继续后置。
- `CUX-I-B-B-K`：已接入批量治理任务草案、内存/JSON Store、创建/列表/取消 API 和后台最近草案入口。
- `CUX-I-B-B-L`：已接入批量治理任务审批/驳回、跨人审批限制、审批前候选漂移预检和后台审批入口；执行队列、批量写审计和真实批量处理仍后置。
- `CUX-I-B-B-M`：已接入已审批批量任务执行只读预案、逐素材漂移跳过、风险等级、预计审计事件数量和后台预案面板。
- `CUX-I-B-B-N`：已接入批量任务受控执行状态机、执行确认、批量 `asset_governance` 审计写入、执行明细、部分完成/失败摘要和幂等回放；异步任务队列、批量软删/引用合并和物理对象清理继续后置。
- `CUX-I-B-B-O`：已接入批量任务执行结果历史与运营筛选，支持执行状态/操作者/时间/问题/动作筛选、执行详情读取 API、后台分页任务列表和执行明细复盘。
- `CUX-I-B-B-P`：已新增批量治理任务 PostgreSQL 表、候选快照表、执行明细表、执行审计事件 ID 表、幂等键、执行锁预留字段和查询索引，并实现 `PostgresCourseProductAssetGovernanceBatchTaskStore`。
- `CUX-I-B-B-Q`：已新增批量执行 job 契约、最小内存队列、可复用执行 worker、执行锁 helper、内存/JSON/PostgreSQL Store 抢锁释放、失败尝试次数和最近失败原因字段，支持并发保护与失败安全重试；批量软删、引用合并、物理对象清理和队列 job 持久化继续后置。
- `CUX-I-B-B-R`：已新增队列 job 只读观测、`listJobs`、队列观测 API、学习资料运营报表 service/API 和 `/admin/courses` 摘要展示；批量软删、引用合并、物理对象清理和队列 job 持久化继续后置。
- `CUX-I-B-B-S`：已新增批量软删与引用合并只读预案 service/API/repository 和 `/admin/courses` 高风险批量动作预案展示，支持重复素材主素材建议、引用合并影响、软删除影响和前台展示位/学习下载占用识别；真实批量写入、引用合并落库、物理对象清理和高风险动作二次审批继续后置。
