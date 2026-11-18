# 技术设计：恐惧清单可选权衡分析

## 1. 边界

- 纯前端数据形状扩展 + 详情页 UI；不改 Worker 路由、D1 表结构、migration。
- 新增内容存在 `FearData.analysis` 里，随现有 `PATCH /api/fears/:id` 的 `data` 一起保存。
- 五步进度、归档、列表、导出逻辑保持不动。

## 2. 数据契约（`shared/types.ts`）

```ts
export type FearAnalysis = {
  /** 潜在好处，最多 3 条；空字符串在归一化时保留，UI 负责过滤展示。 */
  benefits: string[];
  /** 对取得「至少还算不错」结果的把握，0 表示未评，1–5。 */
  confidenceLevel: number;
  /** 历史案例：更普通（甚至不如自己聪明）的人也做到过的具体例子。 */
  precedent: string;
  /** 这件事对用户的影响程度，0 表示未评，1–5。 */
  impactLevel: number;
  inaction: {
    sixMonths: string;
    oneYear: string;
    threeYears: string;
  };
};

export type FearData = {
  version: 1;
  fear: string;
  rootCause: string;
  problem: string;
  action: string;
  evidence: string;
  analysis: FearAnalysis;
};
```

`createEmptyFearAnalysis()`（由 `createEmptyFearData()` 调用）返回空分析：两个 level（把握 / 影响）为 `0`，`benefits` 为 `[]`，`precedent` 与三个代价为空字符串。

`normalizeFearData()`：

- `confidenceLevel` / `impactLevel` 用现有 `asNumber` 后 `Math.min(5, Math.max(0, Math.round(...)))`
- `benefits` 用 `asStringArray`，最多取前 3 条
- `precedent` 用 `asString`；旧记录里的 `benefitLevel` 会被忽略

旧记录缺少 `analysis` 时自动得到空分析，无需 migration。

## 3. 前端组件

新增 `src/components/fears/FearAnalysisCard.tsx`：

```ts
type Props = {
  data: FearAnalysis;
  onChange: (next: FearAnalysis) => void;
};
```

职责：

- 折叠状态：本地 `useState`，初始值 = `hasFearAnalysis(data)`（有内容则展开，否则折叠）。
- 头部：标题「权衡分析」、`可选` chip、状态摘要（未填写 / 已填写）、展开箭头，`aria-expanded`。
- 主体：
  - 潜在好处：最多 3 行文本输入，最后一行可「添加一条」，已有行可移除。
  - 把握程度：5 个按钮（1–5），问题为「你有多大的把握取得一个『至少还算不错』的结果？」；点击已选值设为 0。
  - 历史案例：文本域，提示用户写具体的「更普通的人也做到过」的案例。
  - 影响程度：5 个按钮，规则同把握程度。
  - 不行动代价：三个文本域，标签和提示语来自 `content/fears.ts`。
- 所有修改通过 `onChange` 回传，不直接调接口。

> 设计取舍：「尝试的预期收益」评分已移除。孤立的主观收益分不改变决策；收益信息由具体好处列表承载，再结合把握程度、影响程度和不行动代价判断。

`src/lib/fears.ts` 增加：

```ts
export function hasFearAnalysis(data: FearAnalysis): boolean;
export function fearAnalysisSummary(data: FearAnalysis): string;
```

- `hasFearAnalysis`：任一 level > 0、任一条好处非空、`precedent` 非空、或任一不行动代价非空。
- `fearAnalysisSummary`：折叠时显示「已填写」；可选展示 `把握 4 · 影响 5`，未评时显示「未填写（可选）」。

## 4. 详情页接入

`src/pages/FearDetailPage.tsx`：

- `updateAnalysis(next: FearAnalysis)`：更新 `draft.data.analysis` 并 `markDirty()`。
- 渲染顺序改为：

```tsx
{fearSteps.slice(0, 3).map(renderStep)}
<FearAnalysisCard data={draft.data.analysis} onChange={updateAnalysis} />
{fearSteps.slice(3).map(renderStep)}
```

- 复用现有 800ms 防抖、`changeVersion` 版本守卫、离开补保存；不做新的保存逻辑。
- `fearProgress` 只统计 `fearSteps` 的五个字段，分析不进入 5/5 进度。

## 5. 内容文案（`src/content/fears.ts`）

```ts
export const fearAnalysisCopy = {
  title: "权衡分析",
  optional: "可选",
  expand: "展开分析",
  collapse: "收起分析",
  benefitsLabel: "潜在好处",
  benefitsHint: "如果这件事做成，最值得的是什么？写具体一点，最多 3 条。",
  addBenefit: "+ 添加一条好处",
  confidenceLabel: "你有多大的把握能取得一个「至少还算不错」的结果？",
  confidenceHint: "不是做到最好，而是「至少不算失败」。1 = 几乎没把握，5 = 很有把握；再次点击已选值可清除。",
  precedentLabel: "历史案例",
  precedentHint: "历史上，有没有比你更普通（甚至没你聪明）的人做过类似的事，并且成功了？写清楚是谁、做了什么、结果如何，不要只写「肯定有人做到过」。",
  impactLabel: "这件事对我的影响程度",
  impactHint: "如果一直不解决，它对你生活的影响有多大？",
  inactionTitle: "如果什么都不做",
  inaction: {
    sixMonths: {
      label: "6 个月后",
      hint: "如果保持现状，半年后你的财务状况、情绪状态和身体健康会付出什么代价？",
    },
    oneYear: {
      label: "1 年后",
      hint: "一年过去，如果你依然停留在原地，会错过哪些机会或产生怎样的遗憾？",
    },
    threeYears: {
      label: "3 年后",
      hint: "三年后回望今天，维持现状会给你的人生带来多大程度的负面累积？",
    },
  },
};
```

## 6. 兼容与风险

- **旧数据**：`normalizeFearData` 补空分析；`bootstrap` / `export` 自动包含 `analysis`。
- **无 migration**：回滚只需回退前端与类型；旧 Worker 不关心 `data` 内部字段。
- **折叠状态**：只在组件挂载时根据内容决定；用户手动收起后不被自动重新展开。
- **进度不变**：分析不计入 5/5，列表卡片暂不展示分析状态。
- **空内容判定**：trim 后判断，避免空格被当成已填写。
