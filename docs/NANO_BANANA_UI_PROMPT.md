# UI Design Prompt: Effects Chain (Pedalboard) System

## Context

Designing a UI for an audio effects chain system inside a **Foundry VTT module** (tabletop RPG virtual tabletop). The module is called **"Advanced Sound Engine"** and runs inside a desktop web application (Foundry VTT v13). The GM (Game Master) controls sound for all players.

The effects tab is part of a larger application window (1440x1050px) that also contains a Mixer tab and a Library tab. The effects tab occupies the main content area beneath the tab navigation bar (full width, ~900px height).

---

## Design System (Existing, must follow)

- **Theme**: Dark Iron & Gold (Foundry V13 aesthetic)
- **Background**: `#111111` (deepest), `#1a1a1a` (panel), `#252525` (card)
- **Primary accent**: `#ff6400` (Foundry Orange) — active states, highlights, borders
- **Secondary**: `#22d3ee` (cyan, used sparingly)
- **Text**: `#f0f0e0` (headers), `#cec4b0` (body), `#7a7971` (muted)
- **Borders**: `#333` (default), `#9f9275` (gold accent), `#ff6400` (active)
- **Fonts**: "Modesto Condensed" for headers, "Signika" for body, monospace for values
- **Shadows**: `0 4px 6px rgba(0,0,0,0.3)` cards, orange glow `0 0 8px rgba(255,100,0,0.3)` for active
- **Border radius**: 8px cards, 4px buttons/inputs
- **Interactive elements**: Smooth 0.2s transitions, hover borders go orange, active items get orange glow

---

## What Needs to be Designed

### Core Concept

Replace the current flat grid of effect cards with a **pedalboard-style chain constructor**. Three independent audio channels (Music, Ambience, SFX) each have their own effects chain. The GM can enable/disable effects, reorder them via drag-and-drop, adjust parameters, and load/save presets.

### Layout Structure

```
+------------------------------------------------------------------+
|  [TAB: Mixer] [TAB: Library] [TAB: Sound Effects (active)]       |
+------------------------------------------------------------------+
|                                                                    |
|  CHANNEL TABS:  [ MUSIC ]  [ AMBIENCE ]  [ SFX ]                |
|  ---------------------------------------------------------------- |
|                                                                    |
|  PEDALBOARD CHAIN (horizontal, scrollable):                       |
|                                                                    |
|  INPUT ---> [PEDAL] ---> [PEDAL] ---> [PEDAL] ---> OUTPUT        |
|   icon       card         card         card          icon         |
|              drag         drag         drag                       |
|                                                                    |
|  ---------------------------------------------------------------- |
|                                                                    |
|  DETAIL PANEL (below chain, for selected pedal parameters):       |
|  +------------------------------------------------------------+  |
|  | Selected: REVERB                                            |  |
|  | [Mix: ====o========= 35%] [Decay: ====o==== 2.0s]         |  |
|  | [Size: ==o========== 1.0x] [Tone: [Dark|Default|Bright]]  |  |
|  +------------------------------------------------------------+  |
|                                                                    |
|  ---------------------------------------------------------------- |
|  FOOTER: [Preset: ▼ Load Preset...] [Save] [Reset Chain]        |
+------------------------------------------------------------------+
```

### Screen 1: Channel Tabs

- Three tabs at the top of the effects area: **MUSIC**, **AMBIENCE**, **SFX**
- Each tab switches to that channel's independent pedalboard chain
- Active tab is highlighted with the orange accent underline/border
- Optionally show a small status indicator per tab: how many effects are active (e.g., "MUSIC (3)" or a small dot/counter badge)

### Screen 2: Pedalboard Chain (main area)

This is the centerpiece. A **horizontal chain** of effect "pedals" connected by visual "cables" or arrows.

**Chain flow (left to right):**
```
[INPUT] ---cable--- [Pedal 1] ---cable--- [Pedal 2] ---cable--- ... ---cable--- [OUTPUT]
```

**INPUT node**: Small icon/label on the left representing the channel signal source. Non-interactive, just visual anchor.

**OUTPUT node**: Small icon/label on the right representing the master output. Non-interactive.

**Cable/connection lines**: Horizontal lines or curved SVG cables connecting pedals. Style: thin line (#333 or #444), with subtle orange glow when signal is active.

**Each Pedal Card (compact):**
- Looks like a **guitar effects pedal / stompbox** in miniature
- Fixed width (~160-180px), fixed height (~200px)
- Contains:
  - **Header**: Effect name (REVERB, DELAY, FILTER, COMPRESSOR, DISTORTION) in uppercase orange text
  - **Main knob**: Circular knob showing the Mix (dry/wet) value. Rotatable via drag. This is the most prominent visual element on each pedal.
  - **Footswitch**: A round "stomp button" at the bottom — click to enable/disable (bypass). Glows orange when active, dark when bypassed.
  - **LED indicator**: Small dot above the footswitch — green/orange when enabled, dark when bypassed.
- When **bypassed** (disabled): The entire pedal card gets dimmed (opacity 0.5 or desaturated), the cable visually "passes through" without entering the pedal (optional visual, just an idea).
- **Drag handle**: The entire pedal card is draggable to reorder in the chain. Show a subtle grab cursor on hover. During drag, show a ghost placeholder where the pedal would drop.

**Empty slot / Add button**: If not all 5 effects are in the chain, show an "+" button or dashed-border empty slot at the end of the chain where the GM can add an effect from a dropdown.

**Scrolling**: If more pedals than fit horizontally, the chain area scrolls horizontally with subtle scroll indicators (arrows or fade gradients on edges).

### Screen 3: Detail Panel (parameter editing)

When a pedal is **clicked/selected** in the chain, the detail panel below expands to show all its parameters.

**Layout:**
- Left side: Effect name + larger representation of the main Mix knob
- Right side: Grid/list of parameters as horizontal sliders with labels and values
- Each parameter row: `[Label 80px] [=========o========= slider] [Value 50px]`

**Parameters per effect type:**

| Effect | Parameters |
|--------|-----------|
| **Reverb** | Mix (dry/wet), Decay (0.1-10s), Size (0.1-3x), Tone (dark/default/bright), Level |
| **Delay** | Mix (dry/wet), Time (0-2s), Feedback (0-0.9), Level |
| **Filter** | Mix (dry/wet), Type (lowpass/highpass/bandpass/peaking), Frequency (20-20000Hz), Q (0.1-10), Level |
| **Compressor** | Mix (dry/wet), Threshold (-100 to 0 dB), Ratio (1-20), Level |
| **Distortion** | Mix (dry/wet), Drive (0-100%), Level |

If no pedal is selected, the detail panel shows a muted hint: "Select a pedal to edit parameters"

### Screen 4: Presets Footer

Bottom bar with:
- **Preset selector**: Dropdown to load a saved preset. Presets contain the full chain state (order, enabled flags, all parameters) for all 3 channels.
- **Save button**: Opens a dialog to name and save the current state as a preset.
- **Reset button**: Resets the current channel's chain to default order and parameters.

### Interaction States to Design

1. **Pedal idle** — Dark card, subtle border, not selected
2. **Pedal hover** — Border goes orange, slight lift shadow
3. **Pedal selected** — Orange border, orange glow, detail panel shows its params
4. **Pedal bypassed (disabled)** — Dimmed/desaturated, LED off, footswitch dark
5. **Pedal dragging** — Slightly rotated, elevated shadow, ghost placeholder in chain
6. **Drop zone active** — Dashed orange border appears between pedals where the dragged item can be placed
7. **Empty chain slot** — Dashed border card with "+" icon, click to add effect

### Mobile/Responsive Notes

Not a mobile app, but the window can be resized. At narrow widths:
- Chain scrolls horizontally (already planned)
- Detail panel collapses to fewer columns
- Min viable width: ~800px

---

## Visual References

The aesthetic should blend:
- **Guitar pedalboard** — compact stompboxes in a row, cables between them, footswitches
- **Modular synth patch bay** — signal flow left to right, clear routing
- **Dark studio mixer** — professional, minimal, functional

But adapted to the Foundry VTT dark iron & gold theme — no bright colors except the orange accent.

---

## Deliverables Expected

1. **Full effects tab layout** with channel tabs, chain, detail panel, and footer
2. **Pedal card component** in all states (idle, hover, selected, bypassed, dragging)
3. **Chain view** showing 3-5 pedals connected with cables, including drag reorder interaction
4. **Detail panel** expanded for one effect type (e.g., Reverb)
5. **Preset controls** in the footer area

---

## Don't Design

- The Mixer tab (already done)
- The Library tab (already done)
- The footer volume sliders (already exist at bottom of the application, outside the effects tab)
- Player-side UI (players don't see effects controls)
