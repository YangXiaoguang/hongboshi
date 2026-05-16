# 课程中心 Feature 架构

课程中心已经从页面内逻辑拆到 `client/src/features/courses`，作为后续接真实 API 的第一条业务样板线。

## 目录职责

```text
client/src/features/courses/
  api/
    httpCourseAccessRepository.ts # 课程权益 API adapter，随请求携带用户 ID
    httpCourseRepository.ts  # 课程 API adapter，失败时由 hook 回落到 mock
    mockCourseRepository.ts  # 当前 mock 数据源 adapter
    localCourseAccessRepository.ts # 按用户隔离的本地课程购买与会员权益 fallback
    localCourseEngagementRepository.ts # 本地收藏与学习进度持久化
  hooks/
    useCourseCatalog.ts      # 页面消费的课程列表状态与动作
    useCourseDetail.ts       # 课程详情 API/fallback 读取状态
    useCourseAccess.ts       # 课程权益、模拟购买和会员解锁动作
    useCourseEngagement.ts   # 收藏、学习状态和章节进度动作
  model/
    courseAccess.ts          # 免费、已购、会员、待购买等访问控制纯逻辑
    courseAccess.test.ts     # 权益判断与模拟订单单测
    courseCatalog.ts         # 筛选、搜索、排序、分页、推荐纯逻辑
    courseCatalog.test.ts    # 领域逻辑单测
    courseDetail.ts          # 课程详情、章节、适合人群与相关课程构造
    courseDetail.test.ts     # 详情构造与相关课程单测
    courseEngagement.ts      # 收藏、学习进度纯逻辑
    courseEngagement.test.ts # 参与度状态单测
    coursePath.ts            # 用户端课程路径、路径筛选和路径课程推荐逻辑
    coursePath.test.ts       # 路径稳定性、fallback 和课程挑选单测
  index.ts                   # feature 对外出口
```

## 边界规则

- 页面和组件只从 `@/features/courses` 获取课程相关类型、常量和动作。
- `client/src/lib/mockData.ts` 只保留原型数据，不再承载筛选、分页、排序等业务规则。
- 课程 mock seed 已上移到 `shared/data/mockCourses.ts`，前端、开发期 API 和生产 Express API 共用同一份数据。
- `shared/domain/course.ts`、`courseCatalog.ts`、`courseAccess.ts` 负责跨端契约和纯业务规则，`features/courses/model` 只保留前端 feature 出口。
- 后续接后端时，优先替换 `httpCourseRepository` 和 `/api/courses` 实现，保留 mock repository 作为本地 fallback。
- 课程详情页位于 `client/src/pages/CourseDetail.tsx`，当前通过 `useCourseDetail` 读取 API/fallback 数据。
- 用户端课程路径当前位于前端 feature model，首页和 `/courses` 通过 `CoursePathSection` 选择路径并驱动课程列表筛选；路径重点课程、快速开始货架和课程卡片均可按权益状态触发开始学习、立即购买或开通会员，后续可平滑迁移为运营后台可配置路径。
- 收藏与学习进度当前写入 localStorage；接入用户系统后替换 engagement repository 即可。
- 购买状态与会员权益优先同步 `/api/course-access`，服务端优先通过 auth session cookie 识别用户；请求头 `x-hongboshi-user-id` 仅作为读取场景的开发期兜底。
- 课程购买和会员开通要求 `member` 权限，未登录会返回 `UNAUTHORIZED`，前端打开登录弹窗，不再本地解锁；服务不可用时才回落当前用户的 localStorage。
- 服务端课程权益状态由 `server/modules/courses/courseAccessStore.ts` 管理，默认写入 `.hongboshi-data/course-access.json`，后续替换为数据库时保持 `CourseAccessStore` 接口不变。

## 当前 API

- `GET /api/courses`：返回课程目录结果，支持 `category`、`type`、`sort`、`keyword`、`vipOnly`、`page`、`pageSize` 查询参数；开发环境由 Vite middleware 提供，生产环境由 Express 提供。
- `GET /api/courses/:courseId`：返回单个课程基础信息。
- `GET /api/courses/:courseId/content`：返回已审核通过且已上架课程的服务端详情内容；详情页优先使用服务端摘要、适合人群和章节，读取失败时继续回落前端领域模型。
- `GET /api/catalog/admin/course-products/content-quality`：返回后台课程商品详情内容批量校验结果，供运营快速判断哪些商品可以提交审核。
- 后台课程商品接口已拆分 `catalog:read`、`catalog:edit`、`catalog:review`、`catalog:publish`、`catalog:price` 权限；前端也会按权限显示或隐藏危险动作。
- `GET /api/course-access`：返回当前课程权益状态。
- `POST /api/course-access/purchases`：模拟课程购买并返回最新权益状态。
- `POST /api/course-access/membership`：模拟开通成长会员并返回最新权益状态。

前台购买意图通过 `/courses/:courseId?checkout=course|membership` 传入详情页；详情页会自动唤起购买确认抽屉，但最终是否能学习仍由课程权益状态机和支付结果决定。

以上课程权益读取 API 会先读取登录 session。未登录且未传开发期请求头时默认落到 `local-user`，用于未登录访客和本地开发；写入 API 必须有有效登录 session。

## 后续落点

1. 将 `/api/courses` 从 seed 数据替换为数据库查询，并把当前 shared 查询模型映射到数据库索引。
2. 将 `CourseAccessStore` 从 JSON 文件替换为真实订单、会员和支付回调。
3. 扩展 loading、empty、error 和权限状态到订单、会员、学习记录。
4. 将购买确认抽屉抽成课程交易复用组件，让 `/courses` 可直接半屏下单并召回待支付订单。
5. 把移动预览里的课程卡片继续拆成可复用组件。
6. 将素材占位升级为真实资料管理，补齐资料下载、学习记录和课程内容完成度统计。
7. 将课程路径从前端配置升级为后台运营配置，并接入测评推荐规则。
