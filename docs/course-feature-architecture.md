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
    courseDetail.ts          # 课程详情、章节、适合人群与相关课程构造
    courseDetail.test.ts     # 详情构造与相关课程单测
  index.ts                   # feature 对外出口
```

## 边界规则

- 页面和组件只从 `@/features/courses` 获取课程相关类型、常量和动作。
- `client/src/lib/mockData.ts` 只保留原型数据，不再承载筛选、分页、排序等业务规则。
- `shared/domain/course.ts` 负责跨端契约，`features/courses/model` 负责前端课程场景逻辑。
- 后续接后端时，优先新增真实 `CourseRepository` adapter，再替换 `useCourseCatalog` 的数据源。
- 课程详情页位于 `client/src/pages/CourseDetail.tsx`，当前通过 repository 读取 mock detail，之后可平滑切换 API detail。

## 后续落点

1. 将收藏、学习进度、购买状态从页面 state 拆入独立 service。
2. 为课程列表和详情接入真实 API adapter，保留 mock adapter 作为本地 fallback。
3. 加入 loading、empty、error 和权限状态。
4. 把移动预览里的课程卡片继续拆成可复用组件。
5. 将章节、作业、资料下载和学习记录落到持久化模型。
