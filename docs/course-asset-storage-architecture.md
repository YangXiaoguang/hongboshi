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

`server/modules/catalog/courseProductAssetObjectStorage.ts` 定义正式对象存储接口：

- `putObject`：写入对象，返回 `objectKey`、`provider`、`mimeType`、`sizeBytes`、`contentHash`、原文件名和创建人。
- `readObject`：按 `objectKey` 读取对象，供后台下载和受控下载接口复用。
- `createSignedReadUrl`：生成短期读取 URL，后续对接 OSS/COS/S3 时替换为真实签名 URL。
- `deleteObject`：支持软删与物理删除两种语义，默认软删，避免误删仍被引用的学习资料。

本地实现 `LocalCourseProductAssetObjectStorage` 复用现有 `CourseProductAssetFileStorage`，生成 `course-assets/{productId}/{assetId}/{sha256前缀}-{fileName}` 形式的对象 key，并计算 `sha256:*` 内容指纹。现有 `uploadCourseProductAssetFile` 已开始写入 `objectKey` 与 `contentHash`，但仍用原有 `storageKey` 读取，保证运行路径兼容。

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
- 当前不把学习页下载改为签名 URL 直连对象存储，仍走 `/api/courses/:courseId/assets/:assetId/download` 做登录、权益、合规和下载开关校验。
- 当前不允许前端直接修改合规状态、下载开关或对象 key。
- 当前不自动把开发期 JSON Store 切换为 PostgreSQL；管理员应先查看 backfill 预检结果，再通过受控写入入口回填。

## 后续切片

- `CUX-I-B-B-D`：已实现 `PostgresCourseProductAssetStore`，让素材列表、上传登记、合规审核和后台下载可显式切换 PostgreSQL；已实现素材回填 dry-run service，可扫描 JSON Store 与章节素材占位并输出扫描数、可回填素材数、引用数、跳过数和原因。
- `CUX-I-B-B-E`：已实现素材回填写入 service、PostgreSQL 引用 upsert 和后台 backfill API，允许管理员在 dry-run 结果确认后把对象素材、素材元数据和章节引用关系写入 PostgreSQL。
- `CUX-I-B-B-F`：接入正式对象存储 provider，并把本地签名 URL 替换为真实短期签名 URL。
- `CUX-I-B-B-G`：增加素材治理后台，包括未引用素材、重复内容 hash、待审队列、过期软删和引用报表。
