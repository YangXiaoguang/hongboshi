# 课程中心 Feature 架构

课程中心已经从页面内逻辑拆到 `client/src/features/courses`，作为后续接真实 API 的第一条业务样板线。

## 目录职责

```text
client/src/features/courses/
  api/
    mockCourseRepository.ts  # 当前 mock 数据源 adapter
  hooks/
    useCourseCatalog.ts      # 页面消费的课程列表状态与动作
  model/
    courseCatalog.ts         # 筛选、搜索、排序、分页、推荐纯逻辑
    courseCatalog.test.ts    # 领域逻辑单测
  index.ts                   # feature 对外出口
```

## 边界规则

- 页面和组件只从 `@/features/courses` 获取课程相关类型、常量和动作。
- `client/src/lib/mockData.ts` 只保留原型数据，不再承载筛选、分页、排序等业务规则。
- `shared/domain/course.ts` 负责跨端契约，`features/courses/model` 负责前端课程场景逻辑。
- 后续接后端时，优先新增真实 `CourseRepository` adapter，再替换 `useCourseCatalog` 的数据源。

## 后续落点

1. 新增课程详情页和章节模型。
2. 将收藏、学习进度、购买状态从页面 state 拆入独立 service。
3. 为课程列表接入 API adapter，保留 mock adapter 作为本地 fallback。
4. 加入 loading、empty、error 和权限状态。
5. 把移动预览里的课程卡片继续拆成可复用组件。
