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

## 后续切片

- `CUX-I-B-B-D`：已实现 `PostgresCourseProductAssetStore`，让素材列表、上传登记、合规审核和后台下载可显式切换 PostgreSQL；已实现素材回填 dry-run service，可扫描 JSON Store 与章节素材占位并输出扫描数、可回填素材数、引用数、跳过数和原因。
- `CUX-I-B-B-E`：已实现素材回填写入 service、PostgreSQL 引用 upsert 和后台 backfill API，允许管理员在 dry-run 结果确认后把对象素材、素材元数据和章节引用关系写入 PostgreSQL。
- `CUX-I-B-B-F`：已接入对象存储 provider 配置解析、local/s3/oss/cos 边界、远端公开域名短期 HMAC 签名 URL、上传/读取路径 object storage adapter 化和 provider 级测试。真实云 SDK、STS 临时凭证和 CDN 回源策略仍属于上线前集成任务。
- `CUX-I-B-B-G`：已完成素材治理共享契约、只读 service、后台 API 和前端 repository 基础，覆盖未引用素材、重复内容 hash、待审/驳回素材、下载关闭资料、软删候选和引用数量。
- `CUX-I-B-B-H`：在 `/admin/courses` 接入素材治理面板，展示治理摘要、问题筛选、引用来源提示和素材详情跳转；继续保持只读，不引入批量删除。
- `CUX-I-B-B-I`：已接入单素材治理受控动作、`asset_governance` 审计、软删除读取边界和后台单行处理入口；后续可继续补真实对象清理审批流。
- `CUX-I-B-B-J`：已接入治理动作历史筛选、批量处理草稿预览、后台历史/草稿展示和只读安全边界；真实批量写入、自动合并引用、对象物理删除和异步任务队列继续后置。
