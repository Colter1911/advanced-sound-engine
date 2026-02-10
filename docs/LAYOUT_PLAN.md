# CSS/HTML Layout Plan: Pedalboard Effects Chain UI

> Reference: дизайн-мокап утверждён. Этот документ описывает как реализовать его в вёрстке (Handlebars + CSS).

---

## Overall Layout Structure

Вся вкладка effects — это flex-column контейнер с 4 секциями фиксированной высоты:

```
.ase-effects-layout (flex column, height: 100%)
├── .ase-channel-tabs          (flex row, height: 44px, fixed)
├── .ase-pedalboard            (flex row, flex: 1, overflow-x: auto)
│   ├── .ase-chain-terminal.input
│   ├── .ase-cable
│   ├── .ase-pedal-card        (repeated, draggable)
│   ├── .ase-cable
│   ├── .ase-drop-zone.ghost   (shown during drag only)
│   ├── ...
│   ├── .ase-chain-terminal.output
│   └── .ase-chain-add-btn     (if <5 effects)
├── .ase-detail-panel          (height: ~200px, fixed, collapsible)
│   ├── .ase-detail-header
│   ├── .ase-detail-content
│   │   ├── .ase-detail-knob   (left: big Mix knob)
│   │   └── .ase-detail-params (right: parameter grid)
└── .ase-effects-footer        (height: 48px, fixed)
```

---

## 1. Channel Tabs (`.ase-channel-tabs`)

### HTML (Handlebars)
```html
<div class="ase-channel-tabs">
  <div class="ase-channel-tab {{#if (eq activeChannel 'music')}}active{{/if}}"
       data-channel="music">
    MUSIC
    {{#if musicActiveCount}}
      <span class="ase-tab-badge">{{musicActiveCount}}</span>
    {{/if}}
  </div>
  <div class="ase-channel-tab {{#if (eq activeChannel 'ambience')}}active{{/if}}"
       data-channel="ambience">
    AMBIENCE
    {{#if ambienceActiveCount}}
      <span class="ase-tab-badge">{{ambienceActiveCount}}</span>
    {{/if}}
  </div>
  <div class="ase-channel-tab {{#if (eq activeChannel 'sfx')}}active{{/if}}"
       data-channel="sfx">
    SFX
    {{#if sfxActiveCount}}
      <span class="ase-tab-badge">{{sfxActiveCount}}</span>
    {{/if}}
  </div>
</div>
```

### CSS
```css
.ase-channel-tabs {
  display: flex;
  height: 44px;
  background: #1a1a1a;
  border-bottom: 2px solid #2a2a2a;
  padding: 0 1rem;
  gap: 0;
}

.ase-channel-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--ase-font-header);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ase-text-muted);          /* #7a7971 dimmed */
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.ase-channel-tab:hover {
  color: var(--ase-text-body);           /* #cec4b0 */
}

.ase-channel-tab.active {
  color: var(--ase-text-header);         /* #f0f0e0 white */
}

/* Orange underline on active tab */
.ase-channel-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;                          /* overlap parent border */
  left: 10%;
  width: 80%;
  height: 3px;
  background: var(--ase-accent-main);    /* #ff6400 */
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 8px rgba(255, 100, 0, 0.4);
}

/* Active count badge */
.ase-tab-badge {
  background: var(--ase-accent-main);
  color: #000;
  font-size: 0.65rem;
  font-weight: 800;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
```

---

## 2. Pedalboard Area (`.ase-pedalboard`)

### CSS
```css
.ase-pedalboard {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0;                                /* cables handle spacing */
  padding: 1.5rem 1rem;
  overflow-x: auto;
  overflow-y: hidden;

  /* Dark textured pedalboard surface */
  background:
    radial-gradient(ellipse at 50% 0%, rgba(40,40,40,0.5) 0%, transparent 70%),
    linear-gradient(180deg, #181818 0%, #111 100%);

  /* Hide scrollbar but allow scroll */
  scrollbar-width: thin;
  scrollbar-color: #333 transparent;
}

/* Fade hints on edges when scrollable */
.ase-pedalboard::before,
.ase-pedalboard::after {
  content: '';
  position: sticky;
  min-width: 30px;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}
.ase-pedalboard::before {
  left: 0;
  background: linear-gradient(to right, #111 0%, transparent 100%);
}
.ase-pedalboard::after {
  right: 0;
  background: linear-gradient(to left, #111 0%, transparent 100%);
}
```

---

## 3. Chain Terminals — INPUT / OUTPUT

### HTML
```html
<div class="ase-chain-terminal input">
  <div class="ase-terminal-icon">
    <i class="fa-solid fa-plug"></i>
  </div>
  <span class="ase-terminal-label">INPUT</span>
</div>
```

Design reference: In the mockup, INPUT shows an audio jack icon, OUTPUT shows a connector icon. Both are small dark boxes (~60x80px) with an icon and label.

### CSS
```css
.ase-chain-terminal {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 64px;
  height: 90px;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 8px;
  flex-shrink: 0;
}

.ase-terminal-icon {
  font-size: 1.5rem;
  color: var(--ase-text-muted);
}

.ase-terminal-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ase-text-muted);
}
```

---

## 4. Cables (`.ase-cable`)

Cables connect terminals to pedals and pedals to each other. Two approaches:

### Approach A: Pure CSS (simpler, recommended)

Each `.ase-cable` is a flex item between pedals — a horizontal line with decorative curves.

```css
.ase-cable {
  width: 40px;
  min-width: 30px;
  flex-shrink: 0;
  height: 4px;
  align-self: center;
  position: relative;
}

/* The wire itself */
.ase-cable::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 3px;
  background: #2a2a2a;
  border-radius: 2px;
  transform: translateY(-50%);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.03),
    0 -1px 0 rgba(0,0,0,0.5);
}

/* Active cable glow when signal is flowing */
.ase-cable.active::before {
  background: #3a2a1a;
  box-shadow:
    0 0 4px rgba(255, 100, 0, 0.15),
    0 1px 0 rgba(255,255,255,0.03);
}

/* Jack connectors at cable ends */
.ase-cable::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: #444;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
```

### Approach B: SVG overlay (future enhancement)

For curved cables like in the mockup, an SVG overlay on `.ase-pedalboard` draws bezier paths between pedal anchor points. This requires JS to compute positions. Can be added later as a visual polish layer.

**Recommendation:** Start with Approach A (CSS lines), upgrade to SVG later if needed.

---

## 5. Pedal Card (`.ase-pedal-card`) — Core Component

### HTML (Handlebars partial: `pedal-card.hbs`)
```html
<div class="ase-pedal-card {{#if effect.enabled}}active{{/if}} {{#if effect.selected}}selected{{/if}}"
     draggable="true"
     data-effect-type="{{effect.type}}"
     data-chain-index="{{effect.chainIndex}}">

  <!-- Effect Name (top) -->
  <div class="ase-pedal-name-top">{{effect.type}}</div>

  <!-- Main Knob -->
  <div class="ase-pedal-knob-area">
    <div class="ase-pedal-knob" style="--knob-rotation: {{effect.mixRotation}}deg">
      <div class="ase-knob-indicator"></div>
    </div>
    <div class="ase-pedal-mix-value">{{effect.mixDisplay}}%</div>
  </div>

  <!-- Footswitch -->
  <div class="ase-pedal-footer">
    <div class="ase-pedal-led {{#if effect.enabled}}on{{/if}}"></div>
    <button class="ase-pedal-footswitch {{#if effect.enabled}}engaged{{/if}}"
            data-action="toggle-bypass">
    </button>
    <div class="ase-pedal-name-bottom">{{effect.type}}</div>
  </div>
</div>
```

### Dimensions (from mockup analysis)
- Card: **160px × 230px**
- Knob: **70px × 70px** (center of card)
- Footswitch: **32px × 32px** (bottom center)
- LED: **6px × 6px** (above footswitch)

### CSS — Card Base
```css
.ase-pedal-card {
  width: 160px;
  min-width: 160px;
  height: 230px;
  flex-shrink: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 12px;

  /* Dark metallic body */
  background:
    linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #222 100%);
  border: 1px solid #3a3a3a;
  border-radius: 10px;

  /* Beveled/raised look */
  box-shadow:
    0 4px 8px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.05),
    inset 0 -1px 0 rgba(0,0,0,0.3);

  cursor: grab;
  transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s, transform 0.2s;
  position: relative;
}

/* Hover */
.ase-pedal-card:hover {
  border-color: #555;
  box-shadow:
    0 6px 12px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.05);
}

/* Selected (clicked, detail panel open) */
.ase-pedal-card.selected {
  border-color: var(--ase-accent-main);
  box-shadow:
    0 0 15px rgba(255, 100, 0, 0.3),
    0 4px 8px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(255,255,255,0.05);
}

/* Bypassed (disabled) */
.ase-pedal-card:not(.active) {
  opacity: 0.5;
  filter: saturate(0.3);
}

/* Dragging */
.ase-pedal-card.dragging {
  opacity: 0.7;
  transform: rotate(2deg) scale(1.05);
  box-shadow: 0 12px 24px rgba(0,0,0,0.7);
  cursor: grabbing;
  z-index: 100;
}
```

### CSS — Pedal Name
```css
.ase-pedal-name-top {
  font-family: var(--ase-font-header);
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--ase-text-muted);
  margin-bottom: 4px;
}

.ase-pedal-name-bottom {
  font-family: var(--ase-font-header);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ase-text-body);
}
```

### CSS — Knob (Metallic Chrome)
```css
.ase-pedal-knob-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.ase-pedal-knob {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  position: relative;
  cursor: pointer;

  /* Metallic chrome gradient (matching mockup) */
  background:
    radial-gradient(circle at 35% 30%,
      #8a8a8a 0%,
      #555 25%,
      #333 50%,
      #444 75%,
      #3a3a3a 100%
    );

  /* Outer ring shadow */
  box-shadow:
    0 2px 6px rgba(0,0,0,0.6),
    inset 0 1px 2px rgba(255,255,255,0.15),
    inset 0 -1px 2px rgba(0,0,0,0.4),
    0 0 0 3px #222,                       /* dark ring */
    0 0 0 4px #3a3a3a;                    /* outer edge */
}

/* Position indicator line */
.ase-knob-indicator {
  position: absolute;
  top: 4px;
  left: 50%;
  width: 3px;
  height: 16px;
  background: var(--ase-text-header);
  border-radius: 2px;
  transform-origin: bottom center;
  transform: translateX(-50%) rotate(var(--knob-rotation, 0deg));
  box-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
}

.ase-pedal-mix-value {
  font-family: var(--ase-font-mono);
  font-size: 0.8rem;
  color: var(--ase-text-body);
  letter-spacing: 0.05em;
}
```

Knob rotation mapping:
- `--knob-rotation`: `-135deg` (min/0%) to `+135deg` (max/100%)
- Formula: `rotation = (mix * 270) - 135`

### CSS — Footswitch (Copper/Bronze Button)
```css
.ase-pedal-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: auto;
}

.ase-pedal-footswitch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  position: relative;

  /* Copper/bronze gradient */
  background:
    radial-gradient(circle at 40% 35%,
      #c4956a 0%,
      #8b6842 40%,
      #6b4c30 70%,
      #5a3d25 100%
    );

  box-shadow:
    0 2px 4px rgba(0,0,0,0.5),
    inset 0 1px 2px rgba(255,255,255,0.2),
    0 0 0 2px #333;

  transition: box-shadow 0.15s, transform 0.1s;
}

.ase-pedal-footswitch:hover {
  box-shadow:
    0 2px 4px rgba(0,0,0,0.5),
    inset 0 1px 2px rgba(255,255,255,0.2),
    0 0 0 2px #555;
}

.ase-pedal-footswitch:active {
  transform: scale(0.95);
}

/* Engaged (effect active) — brighter copper */
.ase-pedal-footswitch.engaged {
  background:
    radial-gradient(circle at 40% 35%,
      #d4a57a 0%,
      #9b7852 40%,
      #7b5c40 70%,
      #6a4d35 100%
    );
  box-shadow:
    0 2px 4px rgba(0,0,0,0.5),
    inset 0 1px 2px rgba(255,255,255,0.3),
    0 0 8px rgba(255, 140, 50, 0.2),
    0 0 0 2px #555;
}
```

### CSS — LED Indicator
```css
.ase-pedal-led {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #222;
  border: 1px solid #333;
  transition: all 0.2s;
}

.ase-pedal-led.on {
  background: var(--ase-accent-main);
  border-color: var(--ase-accent-main);
  box-shadow: 0 0 6px rgba(255, 100, 0, 0.6);
}
```

---

## 6. Ghost / Drop Zone

During drag-and-drop, a ghost placeholder appears where the pedal can be dropped.

### HTML (injected dynamically during drag, or always present but hidden)
```html
<div class="ase-drop-zone">
  <div class="ase-drop-zone-indicator"></div>
</div>
```

### CSS
```css
/* Invisible drop zones between each pedal (always in DOM) */
.ase-drop-zone {
  width: 12px;
  min-width: 12px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: width 0.2s, min-width 0.2s;
}

/* Expanded state during drag-over */
.ase-drop-zone.drag-over {
  width: 170px;
  min-width: 170px;
}

.ase-drop-zone.drag-over .ase-drop-zone-indicator {
  display: block;
}

.ase-drop-zone-indicator {
  display: none;
  width: 150px;
  height: 220px;
  border: 2px dashed var(--ase-accent-main);
  border-radius: 10px;
  opacity: 0.6;

  /* "ghost" label centered */
  &::after {
    content: 'ghost';                   /* or empty, per mockup */
    color: var(--ase-accent-main);
    font-size: 0.75rem;
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    opacity: 0.5;
  }
}
```

---

## 7. Detail Panel (`.ase-detail-panel`)

### HTML
```html
<div class="ase-detail-panel {{#unless selectedEffect}}collapsed{{/unless}}">
  {{#if selectedEffect}}
  <div class="ase-detail-header">
    <h3>{{selectedEffect.type}} PARAMETERS</h3>
  </div>
  <div class="ase-detail-content">
    <!-- Left: Large Mix Knob -->
    <div class="ase-detail-knob-section">
      <div class="ase-detail-knob" style="--knob-rotation: {{selectedEffect.mixRotation}}deg">
        <div class="ase-knob-indicator"></div>
      </div>
      <div class="ase-detail-knob-label">Mix</div>
    </div>

    <!-- Right: Parameters Grid -->
    <div class="ase-detail-params">
      {{#each selectedEffect.params}}
      <div class="ase-detail-param-row">
        <span class="ase-detail-param-label">{{this.name}}:</span>
        <span class="ase-detail-param-value">{{this.displayValue}}</span>
        {{#if (eq this.type "select")}}
          <div class="ase-detail-param-segmented">
            {{#each this.options}}
            <button class="ase-seg-btn {{#if (eq this.value ../this.value)}}active{{/if}}"
                    data-param-id="{{../this.id}}" data-value="{{this.value}}">
              {{this.label}}
            </button>
            {{/each}}
          </div>
        {{else}}
          <input type="range" class="ase-detail-slider"
                 data-param-id="{{this.id}}"
                 min="{{this.min}}" max="{{this.max}}"
                 step="{{this.step}}" value="{{this.value}}">
        {{/if}}
      </div>
      {{/each}}
    </div>
  </div>
  {{else}}
  <div class="ase-detail-empty">Select a pedal to edit parameters</div>
  {{/if}}
</div>
```

### CSS
```css
.ase-detail-panel {
  height: 200px;
  min-height: 200px;
  background:
    linear-gradient(180deg, #1a1a1a 0%, #151515 100%);
  border-top: 2px solid #2a2a2a;
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: height 0.3s, min-height 0.3s, padding 0.3s;
}

.ase-detail-panel.collapsed {
  height: 50px;
  min-height: 50px;
  padding: 0.8rem 1.5rem;
}

.ase-detail-header h3 {
  font-family: var(--ase-font-header);
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--ase-text-header);
  margin: 0 0 0.8rem 0;
  text-align: center;
}

.ase-detail-content {
  display: flex;
  gap: 2rem;
  flex: 1;
  align-items: center;
}

/* Big Mix Knob (left side) */
.ase-detail-knob-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.ase-detail-knob {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  /* Same metallic gradient as pedal knob, but larger */
  background:
    radial-gradient(circle at 35% 30%,
      #7a7a7a 0%, #4a4a4a 30%, #2a2a2a 60%, #333 100%);
  box-shadow:
    0 3px 8px rgba(0,0,0,0.6),
    inset 0 1px 3px rgba(255,255,255,0.12),
    0 0 0 4px #1a1a1a,
    0 0 0 5px #3a3a3a;
  position: relative;
  cursor: pointer;
}

.ase-detail-knob-label {
  font-family: var(--ase-font-header);
  font-size: 0.85rem;
  color: var(--ase-text-body);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Parameter rows (right side) — 2 columns */
.ase-detail-params {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem 2rem;
  align-content: center;
}

.ase-detail-param-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ase-detail-param-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ase-text-muted);
  min-width: 55px;
  white-space: nowrap;
}

.ase-detail-param-value {
  font-family: var(--ase-font-mono);
  font-size: 0.8rem;
  color: var(--ase-text-body);
  min-width: 45px;
}

/* Orange range slider */
.ase-detail-slider {
  flex: 1;
  height: 6px;
  appearance: none;
  background: #333;
  border-radius: 3px;
  outline: none;
}

.ase-detail-slider::-webkit-slider-runnable-track {
  height: 6px;
  background: linear-gradient(to right,
    var(--ase-accent-main) 0%,
    var(--ase-accent-main) var(--slider-fill, 50%),
    #333 var(--slider-fill, 50%),
    #333 100%);
  border-radius: 3px;
}

.ase-detail-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #eee 0%, #999 100%);
  border-radius: 50%;
  border: 2px solid #555;
  cursor: pointer;
  margin-top: -5px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

/* Segmented control for Tone selector: [Dark | Default | Bright] */
.ase-detail-param-segmented {
  display: flex;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
}

.ase-seg-btn {
  background: #1e1e1e;
  border: none;
  border-right: 1px solid #444;
  color: var(--ase-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.ase-seg-btn:last-child {
  border-right: none;
}

.ase-seg-btn.active {
  background: rgba(255, 100, 0, 0.15);
  color: var(--ase-text-header);
  font-weight: 700;
}

.ase-seg-btn:hover:not(.active) {
  background: #2a2a2a;
  color: var(--ase-text-body);
}

/* Empty state */
.ase-detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ase-text-muted);
  font-style: italic;
  font-size: 0.9rem;
}
```

---

## 8. Footer (`.ase-effects-footer`)

### HTML
```html
<div class="ase-effects-footer">
  <div class="ase-preset-section">
    <span class="ase-preset-label">Preset:</span>
    <select id="ase-preset-select" class="ase-preset-select">
      <option value="">Load Preset...</option>
      <optgroup label="Built-in">
        {{#each builtinPresets}}
        <option value="{{this.id}}">{{this.name}}</option>
        {{/each}}
      </optgroup>
      {{#if customPresets.length}}
      <optgroup label="Custom">
        {{#each customPresets}}
        <option value="{{this.id}}">{{this.name}}</option>
        {{/each}}
      </optgroup>
      {{/if}}
    </select>
  </div>

  <button class="ase-footer-btn" data-action="save-preset">
    <i class="fa-solid fa-save"></i> Save Preset
  </button>

  <button class="ase-footer-btn secondary" data-action="reset-chain">
    <i class="fa-solid fa-rotate-left"></i> Reset Chain
  </button>
</div>
```

### CSS
```css
.ase-effects-footer {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  gap: 1rem;
  background: #111;
  border-top: 1px solid #2a2a2a;
}

.ase-preset-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ase-preset-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ase-text-muted);
}

.ase-preset-select {
  background: #1e1e1e;
  color: var(--ase-text-body);
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 10px;
  min-width: 200px;
  font-size: 0.8rem;
}

.ase-footer-btn {
  background: var(--ase-accent-main);
  color: #000;
  border: none;
  border-radius: 4px;
  padding: 6px 14px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s;
}

.ase-footer-btn:hover {
  background: #ff8533;
}

.ase-footer-btn.secondary {
  background: transparent;
  color: var(--ase-text-muted);
  border: 1px solid #444;
  margin-left: auto;                   /* push to the right */
}

.ase-footer-btn.secondary:hover {
  color: var(--ase-text-body);
  border-color: #666;
}
```

---

## 9. Implementation Checklist

### Files to create / rewrite:

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `templates/effects.hbs` | **Rewrite** | New layout: tabs + pedalboard + detail + footer |
| 2 | `templates/partials/pedal-card.hbs` | **Create** | New pedal card partial (replaces effect-card.hbs) |
| 3 | `dist/styles/effects.css` | **Rewrite** | All new CSS from this document |
| 4 | `src/ui/SoundEffectsApp.ts` | **Rewrite** | New controller: channel switching, drag-and-drop, detail panel, knob interaction |
| 5 | `templates/partials/effect-card.hbs` | **Delete** | No longer used |

### Implementation order:

```
Step 1: effects.hbs — skeleton layout (tabs + pedalboard + detail + footer)
        Register pedal-card partial in main.ts
Step 2: pedal-card.hbs — pedal card component
Step 3: effects.css — all styles from this document
Step 4: SoundEffectsApp.ts — controller logic:
        a) Channel tab switching (re-render chain for selected channel)
        b) Pedal click → select → show detail panel
        c) Footswitch click → toggle enabled/bypass
        d) Knob drag interaction (mousedown → mousemove)
        e) Detail panel slider/segmented control interaction
        f) Drag-and-drop reorder
Step 5: Visual polish — cable SVG, animations, edge fade
```

### Step 3 needs no backend changes

The CSS/templates can be built against mock data before the engine is refactored. `SoundEffectsApp.getData()` can return hardcoded chain data for UI development, then swap to real engine data in Phase 4 of the implementation plan.

---

## 10. Key CSS Techniques Summary

| Visual Element | CSS Technique |
|---|---|
| Metallic knob | `radial-gradient` with highlight offset at 35% 30% |
| Copper footswitch | `radial-gradient` with warm browns, `inset` shadow |
| Beveled pedal body | Multiple `box-shadow` (drop + inset highlight + inset bottom) |
| Orange glow on selected | `box-shadow: 0 0 15px rgba(255,100,0,0.3)` |
| Dimmed bypass state | `opacity: 0.5; filter: saturate(0.3)` |
| Cable wire | `::before` pseudo-element, positioned absolute |
| LED dot | Tiny circle with `background` + `box-shadow` glow |
| Slider fill progress | CSS variable `--slider-fill` updated via JS on input |
| Drag ghost | `opacity + transform: rotate(2deg) scale(1.05)` |
| Drop zone expand | `width` transition from 12px to 170px |
| Tab underline | `::after` pseudo-element with `background: #ff6400` |
| Active count badge | Circle with flex centering, `font-size: 0.65rem` |
| Pedalboard texture | Layered `radial-gradient` + `linear-gradient` |
