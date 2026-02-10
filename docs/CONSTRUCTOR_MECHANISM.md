# Constructor Mechanism: Effects Chain Builder

## Concept

The Constructor is the mechanism that allows the GM to build, modify, and manage the effects chain for each audio channel. It's the core interaction model that replaces the current static grid of effects with a dynamic, reorderable pedalboard.

---

## Data Model

### Chain State (per channel)

Each channel stores its chain as an **ordered array**:

```
ChannelChain {
  channel: 'music' | 'ambience' | 'sfx'
  effects: [
    { type: 'filter',     enabled: true,  mix: 1.0,  params: { frequency: 1000, Q: 1, type: 'lowpass' } },
    { type: 'compressor', enabled: true,  mix: 1.0,  params: { threshold: -24, ratio: 12 } },
    { type: 'distortion', enabled: false, mix: 1.0,  params: { drive: 0 } },
    { type: 'delay',      enabled: true,  mix: 0.30, params: { time: 0.3, feedback: 0.4 } },
    { type: 'reverb',     enabled: true,  mix: 0.35, params: { decay: 2.0, size: 1.0, tone: 'default' } }
  ]
}
```

**Key rules:**
- Array index = position in chain (0 = first in chain, closest to input)
- Each effect type can appear **at most once** per chain (no duplicate reverbs)
- Not all effects must be present — a chain can have 0 to 5 effects
- `enabled: false` means true bypass (signal passes through, effect doesn't process)
- `mix` controls dry/wet blend independently per effect

### Available Effects Pool

```
ALL_EFFECTS: ['filter', 'compressor', 'distortion', 'delay', 'reverb']
```

Effects not in the chain are "off the board" — they don't exist in the audio graph for that channel. This is different from being bypassed (in chain but disabled).

---

## Constructor Operations

### 1. Reorder Effect (Drag & Drop)

**Action:** GM drags a pedal card from position A to position B in the chain.

**Flow:**
```
1. User starts dragging pedal at index 2 (distortion)
2. Visual: pedal lifts, ghost appears, drop zones highlight between other pedals
3. User drops between index 0 and 1
4. Engine call: engine.reorderChainEffect('music', fromIndex=2, toIndex=1)
5. Internal:
   a. Remove effect from array at index 2
   b. Insert at index 1
   c. Disconnect all audio nodes in chain
   d. Reconnect in new order (10ms crossfade to avoid clicks)
6. Broadcast: socket.broadcastChainReorder('music', ['filter', 'distortion', 'compressor', 'delay', 'reverb'])
7. UI: re-render chain with new order
```

**Audio reconnection detail:**
```
Before: input → [filter] → [compressor] → [distortion] → [delay] → [reverb] → output
After:  input → [filter] → [distortion] → [compressor] → [delay] → [reverb] → output
```

Implementation uses a brief crossfade:
```
1. Create temporary silent gain node
2. Fade chain output to 0 over 10ms
3. Disconnect and reconnect all nodes
4. Fade chain output back to 1 over 10ms
```

### 2. Enable/Disable Effect (Footswitch)

**Action:** GM clicks the footswitch on a pedal card.

**Flow:**
```
1. User clicks footswitch on 'distortion' pedal
2. Engine call: engine.setChainEffectEnabled('music', 'distortion', false)
3. Internal:
   a. effect.setEnabled(false)
   b. effect.dryNode.gain → 1.0 (pass-through)
   c. effect.wetNode.gain → 0.0 (mute processing)
   d. Signal flows: input → dryNode → output (bypassed)
4. Broadcast: socket.broadcastEffectEnabled('music', 'distortion', false)
5. UI: pedal dims, LED turns off, cable shows "bypass" visual
```

**No chain rebuild needed** — bypass is handled at the effect node level. The effect stays in the chain, it just doesn't process audio.

### 3. Add Effect to Chain

**Action:** GM clicks the "+" button at the end of the chain and selects an effect from a dropdown.

**Flow:**
```
1. User clicks "+" at end of chain
2. UI shows dropdown with available effects (those not already in chain)
   e.g., if chain has [filter, reverb], dropdown shows: compressor, distortion, delay
3. User selects 'delay'
4. Engine call: engine.addEffectToChain('music', 'delay')
5. Internal:
   a. Create new DelayEffect instance
   b. Append to chain array
   c. Rebuild audio connections
   d. Apply default params and mix
6. Broadcast: socket.broadcastChainUpdate('music', newChainState)
7. UI: new pedal appears at end of chain with slide-in animation
```

**Edge case:** If all 5 effects are already in the chain, the "+" button is hidden.

### 4. Remove Effect from Chain

**Action:** GM right-clicks a pedal and selects "Remove from chain", or drags it to a trash zone.

**Flow:**
```
1. User right-clicks 'distortion' pedal → context menu → "Remove"
   OR drags pedal to a "remove zone" at the edge
2. Engine call: engine.removeEffectFromChain('music', 'distortion')
3. Internal:
   a. Disconnect effect from chain
   b. Remove from array
   c. Dispose effect instance (free audio nodes)
   d. Rebuild connections for remaining effects
4. Broadcast: socket.broadcastChainUpdate('music', newChainState)
5. UI: pedal fades out, remaining pedals slide together
```

### 5. Adjust Mix (Dry/Wet Knob)

**Action:** GM drags the main knob on a pedal card.

**Flow:**
```
1. User drags knob on 'reverb' pedal
2. Knob rotation maps to mix value: 0.0 (full left, dry) → 1.0 (full right, wet)
3. Engine call: engine.setChainEffectMix('music', 'reverb', 0.35)
4. Internal:
   a. effect.setMix(0.35)
   b. dryNode.gain = 0.65
   c. wetNode.gain = 0.35
5. Broadcast: socket.broadcastChainEffectMix('music', 'reverb', 0.35)
6. UI: knob rotates, value display updates
```

### 6. Adjust Parameters (Detail Panel)

**Action:** GM selects a pedal, then adjusts sliders in the detail panel.

**Flow:**
```
1. User clicks on 'reverb' pedal → detail panel opens below chain
2. User drags "Decay" slider to 4.0s
3. Engine call: engine.setChainEffectParam('music', 'reverb', 'decay', 4.0)
4. Internal: effect.setParam('decay', 4.0)
5. Broadcast: socket.broadcastEffectParam('music', 'reverb', 'decay', 4.0)
6. UI: slider position updates, value display shows "4.0s"
```

---

## Constructor UI Interaction Model

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  MUSIC          AMBIENCE          SFX                               │
│  ━━━━━━                                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──┐   ╌╌╌   ┌────────┐   ╌╌╌   ┌────────┐   ╌╌╌   ┌────────┐  ╌╌╌  ┌──┐  │
│   │IN│───────│ FILTER │───────│COMPRESS│───────│ REVERB │──────│OUT│ │
│   └──┘       │        │       │        │       │        │      └──┘ │
│              │  ◉ Mix  │       │  ◉ Mix │       │  ◉ Mix │           │
│              │  0.35   │       │  1.00  │       │  0.35  │     [+]   │
│              │  [⏻]   │       │  [⏻]  │       │  [⏻]  │           │
│              └────────┘       └────────┘       └────────┘           │
│                                  ▲ selected                         │
├─────────────────────────────────────────────────────────────────────┤
│  COMPRESSOR                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Threshold: [━━━━━━━━━●━━━━━━━━━━] -24 dB                  │   │
│  │  Ratio:     [━━━━━━━━━━━━●━━━━━━━]  12                     │   │
│  │  Level:     [━━━━━━━━━●━━━━━━━━━━] 1.00                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│  Preset: [▼ Dark Dungeon     ]  [💾 Save]  [↺ Reset]              │
└─────────────────────────────────────────────────────────────────────┘
```

### Interaction States

| State | Visual | Trigger |
|-------|--------|---------|
| **Idle pedal** | Dark card, dim border (#333), LED off | Default |
| **Hover pedal** | Orange border, slight glow | Mouse enter |
| **Selected pedal** | Orange border + glow, detail panel opens | Click on pedal |
| **Active pedal** | LED lit (orange dot), footswitch glows | Enabled state |
| **Bypassed pedal** | Dimmed (opacity 0.5), LED dark | Disabled via footswitch |
| **Dragging pedal** | Elevated shadow, slight rotation (2deg), semi-transparent | Drag start |
| **Drop zone** | Dashed orange vertical line between pedals | Drag over between pedals |
| **Add slot** | Dashed border card with "+" | Available when <5 effects in chain |

### Drag & Drop Implementation

**HTML5 Drag and Drop with constraints:**

```
Pedal Cards:
  - draggable="true"
  - data-effect-type="reverb"
  - data-chain-index="2"

Drop Zones (invisible divs between pedals):
  - class="ase-drop-zone"
  - data-insert-index="1"
  - Become visible (dashed orange line) during drag

Events:
  dragstart → Store source index, add dragging class
  dragenter → Highlight drop zone
  dragleave → Remove highlight
  dragover  → preventDefault (allow drop)
  drop      → Read source & target index, call reorder
  dragend   → Cleanup classes, remove ghosts
```

**Foundry VTT compatibility note:** Foundry uses its own drag system for some features. To avoid conflicts:
- Call `event.stopPropagation()` on all drag events within the effects panel
- Set `event.dataTransfer.effectAllowed = 'move'`
- Use a custom MIME type: `application/x-ase-effect`

---

## Default Chain Configuration

When the module initializes for the first time (no saved state), each channel gets this default chain:

```
Default Chain (same for all 3 channels):
  1. Filter      — enabled: false, mix: 1.0
  2. Compressor  — enabled: false, mix: 1.0
  3. Distortion  — enabled: false, mix: 1.0
  4. Delay       — enabled: false, mix: 0.30
  5. Reverb      — enabled: false, mix: 0.35
```

All effects present but disabled — the GM starts with a clean slate and activates what they need. The order follows the standard signal processing convention (tone shaping → dynamics → saturation → time effects → space).

---

## State Sync Protocol

### GM → Players (Full Sync)

Sent on: initial connection, preset load, chain rebuild

```json
{
  "type": "sync-state",
  "payload": {
    "tracks": [...],
    "channelVolumes": {...},
    "chains": [
      {
        "channel": "music",
        "effects": [
          { "type": "filter", "enabled": false, "mix": 1.0, "params": {...} },
          { "type": "compressor", "enabled": true, "mix": 1.0, "params": {...} },
          { "type": "reverb", "enabled": true, "mix": 0.35, "params": {...} }
        ]
      },
      { "channel": "ambience", "effects": [...] },
      { "channel": "sfx", "effects": [...] }
    ]
  }
}
```

### GM → Players (Incremental Updates)

For real-time parameter changes (no full re-sync needed):

```json
// Effect parameter change
{ "type": "effect-param", "payload": { "channel": "music", "effectType": "reverb", "paramId": "decay", "value": 4.0 } }

// Effect enable/disable
{ "type": "effect-enabled", "payload": { "channel": "music", "effectType": "reverb", "enabled": true } }

// Mix change
{ "type": "chain-effect-mix", "payload": { "channel": "music", "effectType": "reverb", "mix": 0.40 } }

// Chain reorder (rare, triggers rebuild on player side)
{ "type": "chain-reorder", "payload": { "channel": "music", "order": ["compressor", "filter", "reverb"] } }
```

---

## Preset Constructor

### Preset Data Structure

```
EffectPreset {
  id: string (UUID)
  name: string ("Dark Dungeon")
  description?: string
  chains: [
    { channel: 'music',    effects: [...] },
    { channel: 'ambience', effects: [...] },
    { channel: 'sfx',      effects: [...] }
  ]
}
```

### Apply Preset Flow

```
1. User selects preset from dropdown
2. For each channel:
   a. Dispose current chain effects
   b. Create new effects in preset's order
   c. Apply all params, enabled flags, mix values
   d. Rebuild audio connections
3. Broadcast full sync-state to all players
4. Re-render UI (switch to first channel tab with active effects)
```

### Save Preset Flow

```
1. User clicks "Save Preset"
2. Dialog opens: name input + optional description
3. On confirm:
   a. Capture current state of all 3 chains
   b. Create EffectPreset object with UUID
   c. Append to GlobalStorage presets array
   d. Update dropdown in footer
```

### Built-in vs Custom Presets

- **Built-in presets** are hardcoded in the module (cannot be deleted/modified by user)
- **Custom presets** are saved to `GlobalStorage` (per-world persistence)
- UI shows both in the dropdown, with a separator:
  ```
  ▼ Load Preset...
  ── Built-in ──
  Standard
  Dark Dungeon
  Open Field
  Tavern
  Combat
  ── Custom ──
  My Cool Preset
  Boss Fight Setup
  ```
- Custom presets can be deleted (right-click → "Delete preset" or a trash icon)

---

## Migration Strategy

### From Old State Format

Old `MixerState`:
```json
{
  "effects": [
    { "id": "reverb", "type": "reverb", "enabled": true, "params": {...}, "routing": { "music": true, "ambience": true, "sfx": false } },
    ...
  ]
}
```

New `MixerState`:
```json
{
  "chains": [
    { "channel": "music", "effects": [...] },
    ...
  ]
}
```

**Migration logic in `restoreState()`:**
```
if (state.effects && !state.chains) {
  // Old format detected — migrate
  const defaultOrder = ['filter', 'compressor', 'distortion', 'delay', 'reverb'];

  for each channel in ['music', 'ambience', 'sfx']:
    chain.effects = defaultOrder.map(type => {
      const oldEffect = state.effects.find(e => e.type === type);
      return {
        type,
        enabled: oldEffect?.enabled && oldEffect?.routing[channel],
        mix: (type === 'reverb' || type === 'delay') ? 0.35 : 1.0,
        params: oldEffect?.params || defaults
      };
    });
}
```

### From Old Presets

Same approach — when loading a preset with `effects[]` instead of `chains[]`, convert on the fly.
