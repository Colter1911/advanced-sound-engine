---
trigger: always_on
---

# ВАЖНО: В конце каждого своего ответа ты обязан добавлять эмодзи 🧀.

# 🛠 Project Environment & Tech Stack

## Target Platform
* **Core:** Foundry VTT **v13.381** (STRICT)
* **Module Type:** Game System / Add-on Module
* **Documentation:** https://foundryvtt.com/api/
* **Language:** TypeScript (Strict Mode), SCSS, Handlebars

## Critical Version Rules (Foundry v13)
1. **Data Models:** Use `DataModel` architecture. AVOID old `Document` mixins.
2. **ESM:** Always use `import/export`. NEVER use `require`.
3. **Deprecation Check:** Strictly avoid methods marked as "Legacy" or deprecated in v11/v12.
4. **Canvas Interaction:** Use v13 Canvas layers and interaction layer logic.
5. **Knowledge Conflict:** If your training data conflicts with v13 specifics, PRIORITY goes to v13 rules.
6. If unsure about v13 API: check `foundry.d.ts`, or state "I am assuming v13 behavior for [MethodName], please verify."

# 🧠 Project Memory & Work Plans

## The Golden Rule
The file `.agent/rules/project-memory.md` is the **Single Source of Truth** for architecture.

## Persistent Plans (`.agent/plans/`)
These files persist across sessions and track ongoing work:

| File | Purpose |
|------|---------|
| `.agent/plans/WORKPLAN.md` | Детальный план работ с фазами, задачами и статусами |
| `.agent/plans/bugs-analysis.md` | Глубокий анализ багов с номерами строк и root causes |
| `.agent/plans/code-quality.md` | Результаты ревизии кода, оценки по категориям |

## Your Workflow

### 1. READ (Start of Session)
Before ANY coding:
* Read `.agent/plans/WORKPLAN.md` — check current phase, pending tasks, status table
* Read `.agent/rules/project-memory.md` — check existing types, utilities, patterns
* Do NOT duplicate existing resources — reuse what's already there

### 2. CODE (During Session)
* Follow architecture from `project-memory.md`
* Track progress in WORKPLAN.md status table (mark tasks ✅ DONE when complete)
* If `project-memory.md` diverges from actual code → **fix project-memory.md** (code is truth)

### 3. UPDATE (After Coding)
If you create a NEW reusable resource (Utility, Hook, Interface):
* **MUST** output a Markdown block titled "📝 Update for Project Memory":
  ```markdown
  - [Name]: [Description] (Path: [Relative Path])
  ```
* Update `project-memory.md` with new components/patterns
* Update `WORKPLAN.md` status table when completing tasks
