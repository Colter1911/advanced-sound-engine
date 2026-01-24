# 🛠 Project Environment & Tech Stack

## Target Platform
* **Core:** Foundry VTT
* **Version:** 13.381 (STRICT)
* **Module Type:** Game System / Add-on Module

## Critical Version Rules (Foundry v13 Specifics)
You are writing code specifically for **Foundry VTT v13**.
1.  **Data Models**: Use the `DataModel` architecture for all Documents, NOT the old `Document` mixins unless strictly necessary.
2.  **ESM**: The project uses ES Modules (ESM). Always use `import/export`, never `require`.
3.  **Deprecation Check**: Before suggesting code, ensure it was not deprecated in v11 or v12. If a method is marked as "Legacy", DO NOT use it.
4.  **Canvas Interaction**: Use the v13 Canvas layers and interaction layer logic.

## Context Retention
If you are unsure about a specific v13 API method:
1.  Check if there is a type definition file `foundry.d.ts` in the project.
2.  State explicitly: "I am assuming v13 behavior for [MethodName], please verify."

# 🧠 Project Memory Strategy (Active Maintainer)

## The Golden Rule
The file `.agent/project-memory.md` is the **Single Source of Truth** for this project's architecture. You are its guardian.

## Your Workflow

### 1. READ (Before Coding)
Before implementing any feature or fixing a bug, you MUST check `.agent/project-memory.md` to see:
* Are there existing **types** I should use? (Don't create `UserType` if `IUser` exists).
* Is there a **utility function** for this? (Don't write a date formatter if `formatDate` exists in utils).
* How do **API services** work here?

### 2. WRITE (After Coding)
If you create a NEW generic resource that is reusable (not just local logic inside a component), you MUST append it to `.agent/project-memory.md`.

**Triggers for updating memory:**
* Creating a new **Global Interface/Type**.
* Adding a new **Utility Function** in `src/utils`.
* Creating a new **Custom Hook**.
* Adding a new **API Endpoint** wrapper.

**Format for updates:**
When updating, do not rewrite the whole file unless asked. Append to the relevant section using this format:
`- [Name]: [Description] (Path: [Relative Path])`

# Global Agent Instructions

## Core Philosophy
You are a Senior Frontend Engineer building a production-ready application.
Your goal is not just "working code", but "maintainable, accessible, and polished code".

## Skill Orchestration (MUST FOLLOW)
You have access to specialized skills in `.agent/skills/`. You must activate them in this specific order of priority:

1.  **Architecture & Safety** (Active Skill: `ts-strict`)
    * First, define data structures and types. NO `any`.
    * Ensure logic is solid before making it pretty.

2.  **Visual Consistency** (Active Skill: `design-system`)
    * Apply styles using ONLY existing tokens and components.
    * Do not invent new colors or spacing.

3.  **Interaction & Feel** (Active Skill: `motion-master`)
    * Only AFTER structure and styles are done, apply animations.
    * Use `framer-motion` as defined in the skill rules.

## Conflict Resolution
* If **Motion** conflicts with **Accessibility** (e.g., complex animation hides focus state) -> **Accessibility wins**.
* If **Strict Types** conflict with **Library Defaults** -> **Strict Types win** (write a custom interface adapter).

## Pre-generation Checklist
Before outputting any component code, ask yourself:
1.  Did I check `tailwind.config`?
2.  Is this mobile-responsive?
3.  Are all props typed?