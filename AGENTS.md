<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## 项目文档入口

开始工作前，先读这几份文档：

- `docs/project-overview.md` — 项目总览：目录结构、技术架构、业务功能、数据模型、当前边界
- `.trellis/spec/frontend/directory-structure.md` — 前端目录、路由、状态管理与命名约定
- `.trellis/spec/backend/directory-structure.md` — Worker 目录、模块组织、数据访问与迁移约定
- `docs/development-workflow.md` — 开发流程、自动化测试现状与主要风险
