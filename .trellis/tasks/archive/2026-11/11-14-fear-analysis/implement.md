# 实施计划：恐惧清单可选权衡分析

## 执行清单

### 1. 共享类型（`shared/types.ts`）

- [ ] 增加 `FearAnalysis` 类型（benefits / confidenceLevel / precedent / impactLevel / inaction）
- [ ] `FearData` 增加 `analysis: FearAnalysis`
- [ ] `createEmptyFearAnalysis()` / `createEmptyFearData()` 返回空分析
- [ ] `normalizeFearData()` 归一化把握与影响评分（0–5）、benefits（最多 3 条）、precedent、inaction 三个字段

### 2. 文案与派生

- [ ] `src/content/fears.ts` 增加 `fearAnalysisCopy`（标题、可选、好处、把握程度、历史案例、影响程度、三段不行动代价提示）
- [ ] `src/lib/fears.ts` 增加 `hasFearAnalysis` 与 `fearAnalysisSummary`

### 3. 组件

- [ ] 新增 `src/components/fears/FearAnalysisCard.tsx`
  - 默认折叠，有内容自动展开
  - 潜在好处列表，最多 3 条，可增删
  - 把握程度 / 影响程度 1–5 评分按钮，点击已选值清除为 0
  - 历史案例文本域
  - 三段不行动代价文本域
  - 头部显示「可选」与填写状态，支持键盘展开 / 收起

### 4. 详情页接入

- [ ] `src/pages/FearDetailPage.tsx` 增加 `updateAnalysis`
- [ ] 在第 3 步和第 4 步之间插入 `<FearAnalysisCard />`
- [ ] 确认分析不进入 `fearProgress` 的 5/5 计算
- [ ] 复用现有自动保存、版本守卫、离开补保存

### 5. 文档

- [ ] `README.md` 功能说明补充「可选权衡分析」
- [ ] `docs/project-overview.md` 恐惧清单章节补充分析块
- [ ] `.trellis/spec/frontend/directory-structure.md` 组件清单增加 `FearAnalysisCard.tsx`
- [ ] 如有必要，`src/content/about.json` 补充一句

### 6. 验证

- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] 手动冒烟：
  - [ ] 新记录默认折叠；展开后可填写
  - [ ] 把握 / 影响程度可选、可清除；历史案例可填写；好处最多 3 条
  - [ ] 三段提示语与需求一致
  - [ ] 刷新后内容保留；旧记录（无 analysis）不报错
  - [ ] 五步进度仍为 5；归档 / 取消归档 / 删除不受影响
  - [ ] `/api/export` 中 `data.analysis` 存在

## 风险文件与回滚

| 文件 | 风险 | 回滚方式 |
| --- | --- | --- |
| `shared/types.ts` | `FearData` 形状变化 | 回退类型与 normalize 默认值 |
| `src/pages/FearDetailPage.tsx` | 插入位置错误导致步骤顺序错乱 | 回退渲染切片 |
| `src/components/fears/FearAnalysisCard.tsx` | 折叠状态或列表增删边界 | 回退组件 |

## 评审门

1. `npm run typecheck` + `npm run build` 通过。
2. 手动冒烟覆盖折叠、评分、列表增删、自动保存、旧数据。
3. 提交前确认没有改动归档 / Worker / migration 相关文件。
