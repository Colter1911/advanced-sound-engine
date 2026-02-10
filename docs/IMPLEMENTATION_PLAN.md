# Implementation Plan: Effects Chain (Pedalboard) Pattern

## Overview

Replace the current parallel send/aux effects architecture with a serial chain (pedalboard) pattern. Each of the 3 audio channels (music, ambience, sfx) gets its own independent effects chain with drag-and-drop reordering, per-effect dry/wet mix, and true bypass.

---

## Phase 1: Data Model & Types

### 1.1 New Types (`src/types/effects.ts`)

**Changes:**
- Add `mix` parameter to `EffectParam` defaults (dry/wet control, 0.0-1.0)
- Replace `routing` field in `EffectState` with `order` (position index in chain)
- Add `mix` to `EffectState.params`
- Create new `ChannelChain` interface
- Update `EffectPreset` to store chains instead of flat effect list

```
// New interfaces

interface ChainEffectState {
  type: EffectType;           // 'reverb', 'delay', etc.
  enabled: boolean;           // true = processing, false = true bypass
  mix: number;                // 0.0 = fully dry, 1.0 = fully wet
  params: Record<string, number | boolean | string>;
}

interface ChannelChain {
  channel: TrackGroup;                // 'music' | 'ambience' | 'sfx'
  effects: ChainEffectState[];        // ordered array, index = position in chain
}

interface EffectPreset {
  id: string;
  name: string;
  description?: string;
  chains: ChannelChain[];             // 3 chains (one per channel)
}
```

### 1.2 Update `MixerState` and Sync types (`src/types/audio.ts`)

**Changes:**
- Replace `effects: EffectState[]` with `chains: ChannelChain[]` in `MixerState`
- Replace `effects: EffectState[]` with `chains: ChannelChain[]` in `SyncStatePayload`
- Add new socket message types: `'chain-reorder'`, `'chain-update'`
- Add `ChainReorderPayload` and `ChainUpdatePayload` interfaces

---

## Phase 2: AudioEffect Base Class Rework

### 2.1 Dry/Wet Mix (`src/core/effects/AudioEffect.ts`)

**Current problem:** `dryNode.gain` is hardcoded to 0 (line 135). The `setDryWet()` method is a no-op stub (line 143).

**Changes:**
- Implement real `setMix(mix: number)` method:
  - `dryNode.gain = 1.0 - mix` (dry portion)
  - `wetNode.gain = mix` (wet portion)
  - Use `setTargetAtTime` for smooth transitions
- Add `mix` as a built-in parameter (like `level`), default values:
  - Filter, Compressor, Distortion: `mix = 1.0` (100% wet — full signal replacement)
  - Reverb: `mix = 0.35` (35% wet)
  - Delay: `mix = 0.30` (30% wet)
- Rework `setEnabled()`:
  - `enabled = true`: Apply current dry/wet mix values
  - `enabled = false`: **True bypass** — `dryNode.gain = 1.0`, `wetNode.gain = 0.0` (signal passes through untouched)

### 2.2 Chain-Compatible Connection API

**Add methods to AudioEffect:**
- `connectToNext(nextEffect: AudioEffect)`: `this.outputNode.connect(nextEffect.inputNode)`
- `disconnectOutput()`: `this.outputNode.disconnect()`
- These allow the chain manager to dynamically wire effects in sequence

---

## Phase 3: EffectChain Manager (NEW)

### 3.1 New class: `src/core/effects/EffectChain.ts`

Central class that manages one channel's effect chain.

**Responsibilities:**
- Holds an ordered array of `AudioEffect` instances
- Wires them sequentially: `input → [effect1] → [effect2] → ... → output`
- Handles reordering (disconnect all, reconnect in new order)
- Handles adding/removing effects from the chain
- Handles bypass (disabled effect passes signal through via dry node)

**Key methods:**
```
class EffectChain {
  private ctx: AudioContext;
  private channel: TrackGroup;
  private effects: AudioEffect[] = [];        // ordered chain

  public inputNode: GainNode;                  // chain entry point
  public outputNode: GainNode;                 // chain exit point

  constructor(ctx: AudioContext, channel: TrackGroup);

  // Chain management
  buildChain(effectTypes: EffectType[]): void;  // Create effects in order
  rebuildConnections(): void;                    // Reconnect all in current order
  reorder(fromIndex: number, toIndex: number): void;  // Move effect position

  // Effect control
  setEffectEnabled(type: EffectType, enabled: boolean): void;
  setEffectParam(type: EffectType, param: string, value: any): void;
  setEffectMix(type: EffectType, mix: number): void;

  // State
  getState(): ChannelChain;
  restoreState(state: ChannelChain): void;

  // Cleanup
  dispose(): void;
}
```

### 3.2 Signal Flow

```
channelGain[group] → chain.inputNode → [Effect1.in → Effect1.out] → [Effect2.in → Effect2.out] → ... → chain.outputNode → masterGain
```

When an effect is bypassed (disabled):
```
... → [EffectN.in → dryNode(gain=1) → EffectN.out] → ...
        (wetNode gain=0, processing skipped)
```

### 3.3 Rebuild Logic

When the chain order changes (drag-and-drop reorder):
1. Disconnect all effect outputs (`effect.disconnectOutput()` for each)
2. Disconnect `chain.inputNode`
3. Reconnect in new order:
   - `chain.inputNode → effects[0].inputNode`
   - `effects[0].outputNode → effects[1].inputNode`
   - `...`
   - `effects[N-1].outputNode → chain.outputNode`
4. Use a brief crossfade (10-20ms) to avoid clicks during reconnection

---

## Phase 4: AudioEngine Refactor

### 4.1 Replace Send Architecture (`src/core/AudioEngine.ts`)

**Remove:**
- `sends` record (lines 88-96) — no longer needed
- `directGains` record (lines 98, 130-134) — chain handles signal flow
- `initializeEffects()` method (lines 152-183) — replaced by chain init
- `updateDryLevel()` method (lines 465-490) — no longer relevant
- Individual `setEffectRouting()` method (lines 442-458) — routing is implicit (effects in chain = routed)

**Add:**
- `chains: Record<TrackGroup, EffectChain>` — one chain per channel
- `initializeChains()` — creates 3 EffectChain instances with default order
- New signal path:
  ```
  channelGain[group] → chains[group].inputNode → ... → chains[group].outputNode → masterGain
  ```

### 4.2 Update API Methods

**Replace:**
```
// OLD
setEffectRouting(effectId, channel, enabled)
// NEW — no equivalent needed, effects are always in the chain, use enable/disable

// OLD
setEffectEnabled(effectId, enabled)
// NEW
setChainEffectEnabled(channel: TrackGroup, effectType: EffectType, enabled: boolean)

// OLD
setEffectParam(effectId, paramId, value)
// NEW
setChainEffectParam(channel: TrackGroup, effectType: EffectType, paramId: string, value: any)
```

**Add:**
```
reorderChainEffect(channel: TrackGroup, fromIndex: number, toIndex: number): void
getChainState(channel: TrackGroup): ChannelChain
getAllChainsState(): ChannelChain[]
setChainEffectMix(channel: TrackGroup, effectType: EffectType, mix: number): void
```

### 4.3 State Persistence

**Update `getState()`** (lines 512-527):
- Replace `effects: EffectState[]` with `chains: ChannelChain[]`
- Each chain stores ordered effects with their params and mix values

**Update `restoreState()`** (lines 529-586):
- Iterate over `state.chains`, restore each channel's chain order and parameters

**Backwards compatibility:**
- If loaded state has old `effects[]` format (no `chains`), migrate:
  - Create 3 identical chains with default order
  - Apply old effect params to all chains
  - Log migration notice

---

## Phase 5: PlayerAudioEngine Refactor

### 5.1 Mirror Chain Architecture (`src/core/PlayerAudioEngine.ts`)

Same changes as AudioEngine but for the player side:
- Replace send architecture with 3 EffectChain instances
- Chain output connects to `gmGain` instead of `masterGain`
- Update `syncState()` to accept `chains: ChannelChain[]` instead of `effects: EffectState[]`

### 5.2 Sync Protocol

The GM broadcasts full chain state. The player reconstructs:
1. For each channel, compare current chain order with received state
2. If order differs, rebuild chain connections
3. Apply all params, enabled flags, and mix values

---

## Phase 6: Socket / Sync Layer

### 6.1 New Message Types (`src/types/audio.ts`)

```
// Add to SocketMessageType:
| 'chain-reorder'      // GM reordered effects in a channel's chain
| 'chain-effect-mix'   // GM changed dry/wet mix on an effect

// New payloads:
interface ChainReorderPayload {
  channel: TrackGroup;
  order: EffectType[];        // new order as array of types
}

interface ChainEffectMixPayload {
  channel: TrackGroup;
  effectType: EffectType;
  mix: number;
}
```

### 6.2 SocketManager Updates

- Add broadcast methods for new message types
- `broadcastChainReorder(channel, order)`
- `broadcastChainEffectMix(channel, effectType, mix)`
- Existing `broadcastEffectParam` and `broadcastEffectEnabled` get `channel` parameter added

### 6.3 Full State Sync

`sync-state` message payload changes:
```
// Old
{ tracks, channelVolumes, effects: EffectState[] }

// New
{ tracks, channelVolumes, chains: ChannelChain[] }
```

---

## Phase 7: UI — Template & Styles

### 7.1 New Template: `templates/effects.hbs`

Replace grid layout with chain layout:
```html
<div class="ase-effects-layout">
  <!-- Channel Tabs -->
  <div class="ase-channel-tabs">
    <div class="ase-channel-tab" data-channel="music">MUSIC</div>
    <div class="ase-channel-tab" data-channel="ambience">AMBIENCE</div>
    <div class="ase-channel-tab" data-channel="sfx">SFX</div>
  </div>

  <!-- Pedalboard Chain -->
  <div class="ase-pedalboard">
    <div class="ase-chain-input">INPUT</div>
    <!-- Pedal cards rendered here, connected by cables -->
    {{#each chainEffects}}
      <div class="ase-cable"></div>
      <div class="ase-pedal-card" draggable="true" data-effect-type="..." data-index="...">
        ...
      </div>
    {{/each}}
    <div class="ase-cable"></div>
    <div class="ase-chain-output">OUTPUT</div>
  </div>

  <!-- Detail Panel -->
  <div class="ase-detail-panel">
    <!-- Parameters for selected pedal -->
  </div>

  <!-- Footer -->
  <div class="ase-effects-footer">
    <!-- Preset controls -->
  </div>
</div>
```

### 7.2 New Partial: `templates/partials/pedal-card.hbs`

Replace `effect-card.hbs` with compact pedal card:
- Effect name (header)
- Main Mix knob (circular)
- Footswitch (enable/disable toggle)
- LED indicator
- Drag handle (implicit — whole card)

### 7.3 Styles: `dist/styles/effects.css`

Complete rework:
- `.ase-channel-tabs` — horizontal tab bar with orange active underline
- `.ase-pedalboard` — horizontal flex container, overflow-x: auto
- `.ase-pedal-card` — compact 160-180px wide stompbox card
- `.ase-cable` — SVG/CSS line connecting pedals
- `.ase-detail-panel` — parameter editor below chain
- Drag-and-drop states: ghost, placeholder, drop zone highlights

---

## Phase 8: UI — SoundEffectsApp Controller

### 8.1 Rework `SoundEffectsApp.ts`

**State:**
- `activeChannel: TrackGroup` — which channel's chain is displayed
- `selectedEffect: EffectType | null` — which pedal is selected for detail view

**getData():**
- Return chain for active channel (ordered effects array)
- Return params for selected effect
- Return presets

**New event handlers:**
- `onChannelTabClick(channel)` — switch active channel, re-render chain
- `onPedalClick(effectType)` — select pedal, show detail panel
- `onFootswitchClick(effectType)` — toggle effect enabled/bypass
- `onMixKnobDrag(effectType, mix)` — adjust dry/wet mix
- `onParamChange(effectType, paramId, value)` — adjust effect parameter
- `onDragStart/onDragOver/onDrop` — reorder effects in chain

### 8.2 Drag and Drop

Use HTML5 Drag and Drop API:
1. `dragstart` on pedal card — store dragged index in `dataTransfer`
2. `dragover` on other pedals/drop zones — show insertion indicator
3. `drop` — compute new index, call `engine.reorderChainEffect(channel, from, to)`
4. Re-render chain after reorder
5. Broadcast reorder to players

---

## Phase 9: Presets & Constructor

### 9.1 Default Chain Presets

Built-in presets shipped with the module:

```
"Standard": {
  // Same for all 3 channels:
  order: [Filter, Compressor, Distortion, Delay, Reverb]
  // All disabled by default, standard mix values
}

"Dark Dungeon": {
  music:    [Filter(lowpass 800Hz), Reverb(decay 4s, mix 40%)]
  ambience: [Filter(lowpass 600Hz), Delay(time 0.8s, feedback 0.5, mix 25%), Reverb(decay 6s, mix 50%)]
  sfx:      [Compressor, Reverb(decay 3s, mix 30%)]
}

"Open Field": {
  music:    [Compressor, Delay(time 0.15s, mix 15%), Reverb(decay 1.5s, mix 20%)]
  ambience: [Filter(highpass 200Hz), Reverb(decay 2s, mix 25%)]
  sfx:      [Compressor]
}

"Tavern": {
  music:    [Filter(lowpass 3000Hz), Compressor, Distortion(drive 10%, mix 80%), Reverb(decay 1s, mix 20%)]
  ambience: [Filter(bandpass 800Hz, Q 2), Reverb(decay 0.8s, mix 15%)]
  sfx:      [Reverb(decay 0.5s, mix 15%)]
}

"Combat": {
  music:    [Compressor(threshold -30, ratio 8), Distortion(drive 15%, mix 70%)]
  ambience: [Filter(highpass 150Hz), Compressor]
  sfx:      [Compressor(threshold -20, ratio 6), Delay(time 0.05s, feedback 0.2, mix 20%)]
}
```

### 9.2 Custom Preset Save/Load

- Save captures all 3 channel chains (order + params + enabled + mix)
- Load restores everything, rebuilds all 3 chains
- Store in `GlobalStorage` (same as current presets)
- Migration: old presets (flat `effects[]`) are auto-converted on load

---

## Execution Order & Dependencies

```
Phase 1 (Types)           ← no dependencies, start here
    ↓
Phase 2 (AudioEffect)     ← depends on Phase 1 types
    ↓
Phase 3 (EffectChain)     ← depends on Phase 2 (uses AudioEffect API)
    ↓
Phase 4 (AudioEngine)     ← depends on Phase 3 (uses EffectChain)
Phase 5 (PlayerAudioEngine) ← depends on Phase 3 (parallel with Phase 4)
    ↓
Phase 6 (Socket/Sync)     ← depends on Phase 4+5 (new API methods)
    ↓
Phase 7 (Templates/CSS)   ← depends on Phase 1 (data model for templates)
Phase 8 (UI Controller)   ← depends on Phase 4+7 (engine API + templates)
    ↓
Phase 9 (Presets)          ← depends on Phase 8 (UI for preset management)
```

**Parallel work possible:**
- Phase 7 (templates) can start alongside Phase 2-3 (backend)
- Phase 4 and Phase 5 can be done in parallel

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Audio clicks during chain rebuild | Medium | Use 10-20ms crossfade during reconnection |
| Old saved states incompatible | Low | Migration logic in `restoreState()` |
| Old presets incompatible | Low | Migration logic on preset load |
| 15 effect instances (3×5) CPU overhead | Low | Web Audio API nodes are lightweight; ConvolverNode is heaviest but fine ×3 |
| Drag-and-drop in Foundry VTT | Medium | Foundry may intercept drag events; use `stopPropagation` and test in Foundry context |
| Sync latency for chain reorder | Low | Chain order rarely changes mid-session; full state sync handles edge cases |

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/effects.ts` | Modify | New interfaces: ChainEffectState, ChannelChain; update EffectPreset |
| `src/types/audio.ts` | Modify | Update MixerState, SyncStatePayload, add new socket types |
| `src/core/effects/AudioEffect.ts` | Modify | Implement setMix(), true bypass, connection API |
| `src/core/effects/EffectChain.ts` | **Create** | New chain manager class |
| `src/core/effects/index.ts` | Modify | Export EffectChain |
| `src/core/AudioEngine.ts` | Modify | Replace sends with chains, new API methods |
| `src/core/PlayerAudioEngine.ts` | Modify | Mirror chain architecture |
| `src/sync/SocketManager.ts` | Modify | New broadcast methods, updated payloads |
| `templates/effects.hbs` | Rewrite | Chain layout with channel tabs |
| `templates/partials/effect-card.hbs` | Replace → `pedal-card.hbs` | Compact pedal card |
| `dist/styles/effects.css` | Rewrite | Pedalboard chain styles |
| `src/ui/SoundEffectsApp.ts` | Rewrite | Chain controller with drag-and-drop |
| `src/main.ts` | Modify | Register new partial, update preset migration |
