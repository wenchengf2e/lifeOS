# 人生罗盘

## Goal

新增一个独立的人生战略构建器：用 Problem → Goal → Challenge → Strategy → Project 五级链组织长期方向，用 Risk 登记册跟踪可能偏离理想状态的场景，并通过快照对比看到自己的变化。

用户价值：

- 把「我在解决什么问题」到「这周在做什么项目」放在同一条链上，目标和行动不再脱节。
- 用 Risk 的 prevent / detect / respond 状态，提前发现「有预防但没检测」的盲区。
- 通过快照 diff 看到半年、一年前的自己和现在的差异。

## Background

- 这是新模块，独立于现有「人生 OS 六栏 / 五步诊断 / 恐惧清单」。旧模块暂不迁移、不联动，未来可能淘汰。
- 现有技术栈：React 19 + TypeScript、Hono、Cloudflare D1、Drizzle、TanStack Query；页面数据通过 `/api/bootstrap` 全量加载。
- 规划阶段已确认的核心决策：
  - 6 类实体，严格五级父子链；Risk 独立于链，作为根级登记册。
  - `telos_items` 采用精简列 + `data` JSON；`parent_id` 指向唯一上级。
  - 删除父节点时级联删除整条子树（二次确认）。
  - 版本历史采用整图快照 + 确定性 diff，不做逐条事件日志。
  - 快照仅由用户手动创建，不做自动定时，也不做到期提醒。
  - profile（mission / current state / ideal state）存独立的 `telos_profiles` 表，每用户一条当前档案；历史交给快照。
  - 罗盘数据不进入 `/api/bootstrap`，通过 `/api/telos/*` 独立加载。

## Requirements

### R1 实体与层级

- 支持 6 类实体：problem、goal、challenge、strategy、project、risk。
- 严格父子链：problem ← goal ← challenge ← strategy ← project。
- risk 是独立根节点，不挂在目标链下。
- 每类只允许一种合法父类；problem 和 risk 的父级为空。
- 父节点必须存在且属于同一用户；非法父级由 API 拒绝。

### R2 实体内容

- 每个实体有标题、状态、排序和分类专属内容。
- 分类专属内容至少覆盖：
  - problem：问题描述、为什么重要、证据、范围。
  - goal：成功标准、指标、截止日期、取舍、不做什么。
  - challenge：证据、根因、可控性、严重程度。
  - strategy：假设、前提假设、领先指标、停止条件。
  - project：下一步行动、里程碑。
  - risk：场景、概率、影响、prevent / detect / respond 的当前状态和备注。
- 状态按分类校验，不允许跨分类的非法状态。

### R3 主视图与操作

- 主视图用嵌套树展示五级链（problem → goal → challenge → strategy → project），支持展开 / 折叠；risk 单独一块登记册。
- 默认展开 problem 层，更深层级折叠，避免首屏过长。
- 支持新建、编辑、删除、调整父级、同级排序。
- 删除父节点时，二次确认显示将删除的后代数量；确认后删除整条子树。
- 详情视图能看到当前实体、父级链、子节点和分类专属内容。

### R4 Risk 登记册

- 每个 risk 记录 prevent / detect / respond 三项的当前状态（none / partial / ready）和备注。
- 登记册能按概率 × 影响排序，或按状态筛选。
- 风险不参与五级链，但可以单独查看和编辑。

### R5 快照与变化对比

- 快照仅由用户手动创建（无自动定时、无到期提示），保存当前 profile + 全部 items。
- 支持查看快照列表和两个快照之间的差异：新增、删除、字段变化、状态变化、父级变化。
- diff 不依赖 AI，纯确定性计算；AI 摘要作为可选增强，不阻塞首版。
- 快照不可变；删除快照需要二次确认。

### R6 罗盘档案

- 页面顶部可编辑三段文字：使命（mission）、当前状态（current）、理想状态（ideal）。
- 保存到 `telos_profiles` 表（每用户一条当前档案），通过 `GET /api/telos/profile` 读取、`PUT /api/telos/profile` 保存。
- 档案包含在快照中；diff 时把三段文字的变化单独列出。

### R7 导航与兼容

- 新增顶级导航入口和路由（暂定 `/compass`）。
- 罗盘数据不进入 `/api/bootstrap`；页面用独立接口和独立缓存加载，bootstrap 的体积与故障面不受影响。
- 旧模块保持现状：不迁移数据、不联动、不删除、不隐藏。
- 新模块不改变现有模块的接口和数据。

## Acceptance Criteria

- [ ] 能创建 problem，并在其下依次创建 goal → challenge → strategy → project，嵌套树层级正确，展开 / 折叠可用。
- [ ] 尝试把 goal 挂到 strategy 下、或把 project 挂到 problem 下时，API 返回 400，前端给出错误提示。
- [ ] 删除 problem 时，确认框显示将删除的 goal / challenge / strategy / project 数量；确认后整条子树消失，其他树不受影响。
- [ ] 删除 project 只删除自身，不影响上级。
- [ ] risk 独立展示，prevent / detect / respond 三个状态可编辑、保存并回显。
- [ ] 创建快照 A，修改若干实体，再创建快照 B；diff 能列出新增、删除、字段变化、状态变化、父级变化。
- [ ] 快照 diff 在手机宽度下可读，不需要横向滚动整张图。
- [ ] 编辑并保存 mission / current / ideal，刷新后回显；两个快照的档案差异能单独列出。
- [ ] `/api/bootstrap` 响应不包含罗盘数据；罗盘页面通过 `/api/telos/*` 独立加载，bootstrap 失败或变慢不影响罗盘。
- [ ] 旧模块页面可正常访问，数据不变。
- [ ] `npm run typecheck` 与 `npm run build` 通过。

## Out of Scope

- 旧数据迁移或导入（人生 OS、五步诊断、恐惧清单）。
- 旧模块下线、导航隐藏或数据清理。
- AI 生成 / 改写实体、AI 差异摘要（可作为后续增强）。
- 自动快照、定时任务、快照到期提示（首版仅手动创建）。
- 多用户、权限、协作。
- 通用图关系（多父级、跨树引用、任意类型边）。
- 提醒、回看、review_at / last_reviewed_at。
- 对现有月复盘、模式库、Reality OS 的改动。
- bootstrap 接口本身的拆分或重构（本任务只保证罗盘不新增 bootstrap 依赖，旧接口保持现状）。

## Open Questions

无。主视图形态与快照节奏均已在规划阶段确认。
