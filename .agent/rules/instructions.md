---
trigger: always_on
---

# ВАЖНО: В конце каждого своего ответа ты обязан добавлять эмодзи 🧀.

# 🛠 Project Environment & Tech Stack

## Target Platform
* **Core:** Foundry VTT
* **Version:** 13.381 (STRICT)
* **Module Type:** Game System / Add-on Module
* **Documentation:** https://foundryvtt.com/api/
* **Language:** TypeScript (Strict Mode)

## Critical Version Rules (Foundry v13 Specifics)
You are writing code specifically for **Foundry VTT v13**.
1. **Data Models:** Use the `DataModel` architecture for all Documents. AVOID old `Document` mixins.
2. **ESM:** Always use `import/export`. NEVER use `require`.
3. **Deprecation Check:** Strictly avoid methods marked as "Legacy" or deprecated in v11/v12.
4. **Canvas Interaction:** Use v13 Canvas layers and interaction layer logic.
5. **Knowledge Conflict:** If your training data conflicts with v13 specifics described here or in context, PRIORITY goes to v13 rules.

## Context Retention
If you are unsure about a specific v13 API method:
1. Check `foundry.d.ts` if available.
2. State explicitly: "I am assuming v13 behavior for [MethodName], please verify."

# 🧠 Project Memory Strategy (Active Maintainer)

## The Golden Rule
The file `.agent/rules/project-memory.md` is the **Single Source of Truth** for architecture.

## Your Workflow

### 1. READ (Before Coding)
Before implementing features, check `.agent/rules/project-memory.md` for:
* Existing **Interfaces/Types** (Reuse `IUser`, don't create `UserType`).
* **Utility functions** in `src/utils`.
* **API Service** patterns.

### 2. PROPOSE UPDATE (After Coding)
You cannot edit files silently. If you create a NEW reusable resource (Utility, Hook, Global Interface):
* **Do not** just say "I updated the memory".
* **MUST** output a Markdown block at the end of your message titled "📝 Update for Project Memory":
  ```markdown
  - [Name]: [Description] (Path: [Relative Path])