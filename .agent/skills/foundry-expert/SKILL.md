---
name: foundry-expert
description: Activates when working with Foundry VTT API, Hooks, or Documents.
---

# Foundry VTT Expert (v13.381)

## Rules
1.  **Hooks**: Always type your hooks. Use `Hooks.on('hookName', (arg: Type) => ...)`
2.  **Localization**: Never hardcode strings. Use `game.i18n.localize('MODULE.Key')`.
3.  **Logging**: Use a custom logger or `console.log` prefixed with `[MyModule]`.
4.  **Manifest**: If you change module settings, remind the user to update `module.json`.