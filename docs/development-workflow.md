# 开发流程与测试现状

记录当前 LifeOS 的开发、验证和发布方式，以及自动化测试的缺口。

- 记录时间：2026-10-31
- 适用范围：当前仓库的日常前端 / Worker / D1 改动
- 结论：开发流程以快速迭代和人工验证为主，**尚无自动化测试和 CI**

## 当前开发流程

| 阶段 | 做法 | 自动化程度 |
| --- | --- | --- |
| 修改代码 | 先读相关页面、类型和数据结构，再做最小改动 | 人工 |
| 静态检查 | `npm run typecheck` 检查 app / worker / node 三套 TS 配置 | 自动 |
| 构建 | `npm run build`，包含 typecheck + Vite 生产构建 | 自动 |
| 功能验证 | 本地 `npm run dev`；API 用 `curl` 冒烟；UI 用无头 Chrome 截图检查桌面和移动端 | 半人工 |
| 提交发布 | `git commit` → `git push` → `npm run deploy` → 通过 Cloudflare API 确认部署版本 | 半自动 |
| 回归保护 | 无 | 无 |

### 常用命令

```bash
npm run dev              # 本地开发
npm run typecheck        # 三套 TypeScript 配置
npm run build            # typecheck + 生产构建
npm run deploy           # build + wrangler deploy
npm run db:migrate:local # 本地 D1
npm run db:migrate:remote
npm run cf:tail          # 线上日志
```

## 自动化测试现状

仓库目前没有：

- `test` / `vitest` / `playwright` 脚本
- 单元测试、组件测试、API 测试或 E2E 测试文件
- `.github/workflows` CI
- ESLint / Prettier 检查

`npm run build` 是部署前唯一的质量门。它能拦住类型错误和构建错误，但拦不住行为错误。

## 已经做过的验证

这些验证都是一次性的，没有沉淀成可重复执行的测试：

- 本地 API：health、bootstrap、打卡 upsert、文档保存、清单增删改、导出、参数校验 400
- 页面：SPA 深链接、桌面端和移动端布局
- 「关于」页：JSON 语法校验、SVG 校验、无头 Chrome 渲染检查
- 部署：通过 Cloudflare API 确认最新 Worker 版本为 100% 流量

## 主要风险

1. 改样式、路由或数据结构后，只能靠人工发现回归。
2. 鉴权逻辑没有测试覆盖。截至 2026-10-31，Cloudflare Access Applications 复查结果仍为 0 个，站点实际上没有 Access 保护；这类问题测试也很难自动发现。
3. 静态内容（如 `src/content/daily.ts`、`src/content/about.json`）写错时，通常要到运行时才暴露。
4. 没有 CI，推送后不会自动跑检查。

## 建议补的测试

按投入产出排序：

1. **Worker API 集成测试**
   - 使用 `@cloudflare/vitest-pool-workers` + 本地 D1
   - 覆盖 401 / 403、打卡 upsert、文档保存、清单 CRUD、导出
2. **前端单元 / 组件测试**
   - 使用 Vitest + Testing Library
   - 覆盖 `stats.ts`、日期工具、每日仪式表单、关于页各内容块渲染
3. **Playwright 冒烟测试**
   - 3–5 条关键路径：保存打卡后刷新仍在、页面导航、移动端无横向溢出
4. **GitHub Actions**
   - `npm ci` → `typecheck` → `test` → `build`
   - 通过后再部署
5. **静态内容校验**
   - 用 Zod 校验 `about.json` 等 JSON 内容，避免结构写错后静默失效

建议先从第 1、2 项和 CI 开始，建立最小安全网。

## 后续更新

补上测试或 CI 后，记得同步更新本文档中的「自动化测试现状」和「主要风险」两部分。
