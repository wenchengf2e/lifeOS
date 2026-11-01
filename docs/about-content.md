# 「关于」页内容维护

「关于」页不经过数据库和 API，内容直接来自项目里的静态 JSON，构建时打包进页面。

## 文件

| 路径 | 用途 |
| --- | --- |
| `src/content/about.json` | 页面标题、简介、章节和正文块 |
| `src/content/about.ts` | TypeScript 类型和 JSON 导入 |
| `src/pages/AboutPage.tsx` | 页面布局、目录和正文块渲染 |
| `public/about/` | 本地图片，访问路径为 `/about/文件名` |

## 顶层字段

```json
{
  "title": "关于 LifeOS",
  "subtitle": "页面标题下的一句话",
  "intro": "首屏大段简介",
  "updatedAt": "2026-10-31",
  "sections": []
}
```

- `updatedAt` 使用 `YYYY-MM-DD`，页面会显示为「最后更新 · X 年 X 月 X 日」。
- `sections` 的数组顺序就是页面顺序和目录顺序。

## 章节

```json
{
  "id": "principles",
  "eyebrow": "Principles",
  "title": "使用原则",
  "summary": "章节标题下的一句话",
  "blocks": []
}
```

- `id` 必须唯一，会作为锚点和目录链接。
- `eyebrow` 和 `summary` 可省略。

## 正文块

目前支持六种 `type`，可以自由组合：

### paragraph

```json
{ "type": "paragraph", "text": "一段正文。" }
```

### subheading

```json
{ "type": "subheading", "text": "小节标题" }
```

### list

无序列表：

```json
{ "type": "list", "items": ["第一条", "第二条"] }
```

有序列表，加上 `ordered: true`：

```json
{ "type": "list", "ordered": true, "items": ["第一步", "第二步"] }
```

### quote

```json
{
  "type": "quote",
  "text": "不评分，不催促。只记录事实，然后决定下一步。",
  "attribution": "LifeOS 的使用前提"
}
```

`attribution` 可省略。

### callout

```json
{
  "type": "callout",
  "tone": "warning",
  "title": "关于隐私",
  "text": "提醒内容。"
}
```

- `tone` 可为 `warning`（陶土色）或 `note`（苔绿色），默认 `note`。
- `title` 可省略。

### image

```json
{
  "type": "image",
  "src": "/about/system-loop.svg",
  "alt": "图片替代文字",
  "caption": "图片下方说明",
  "display": "diagram"
}
```

- 图片放在 `public/about/`，`src` 写 `/about/文件名`。
- 支持 SVG、PNG、JPG、WebP。建议宽度不超过 1600px。
- `display` 可为 `diagram`（完整显示，适合流程图/示意图）或 `photo`（裁切到最大高度，适合照片）。
- `alt` 应该描述图片内容，不要留空。
- `caption` 可省略。

## 修改与部署

1. 编辑 `src/content/about.json`，或把图片放进 `public/about/`。
2. 本地预览：`npm run dev`，打开 `/about`。
3. 检查类型和构建：

   ```bash
   npm run typecheck
   npm run build
   ```

4. 部署：

   ```bash
   npm run deploy
   ```

JSON 在构建时读取。JSON 语法错误会导致构建失败，不会影响线上旧版本；新增字段前建议先跑一次 `npm run typecheck`。

## 注意

`src/content/about.json` 会打包进前端静态资源，**浏览器可以直接读到**；这个仓库也是公开仓库。因此：

- 这里适合放设计思路、使用原则、模块说明这类可以公开的内容。
- 不要放日记、每日仪式原文、真实姓名、联系方式等私人内容。私人内容应保存在 D1 里，由 Access 保护。
