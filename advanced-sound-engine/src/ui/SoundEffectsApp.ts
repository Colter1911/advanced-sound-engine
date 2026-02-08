import { AudioEngine } from '@core/AudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { GlobalStorage } from '@storage/GlobalStorage';
import type { EffectType, EffectState, EffectParam } from '@t/effects';
import type { TrackGroup } from '@t/audio';
import { Logger } from '@utils/logger';

const MODULE_ID = 'advanced-sound-engine';

export class SoundEffectsApp {
    private engine: AudioEngine;
    private socket: SocketManager;
    private storage: GlobalStorage;
    private html: JQuery | null = null;
    private renderParent: (() => void) | null = null;
    private updateInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        engine: AudioEngine,
        socket: SocketManager,
        storage: GlobalStorage
    ) {
        this.engine = engine;
        this.socket = socket;
        this.storage = storage;
    }

    setRenderCallback(callback: () => void): void {
        this.renderParent = callback;
    }

    async getData() {
        try {
            // Load presets
            const presets = await GlobalStorage.loadPresets();

            // Transform effects into view data
            const effects = this.engine.getAllEffects().map(effect => {
                const state = this.engine.getEffectState(effect.type)!;

                // Calculate Main Knob Rotation (Level)
                // Range 0 to 2.0 -> -135deg to +135deg
                const levelVal = (state.params['level'] as number) || 1.0;
                const rotation = (levelVal / 2.0) * 270 - 135;

                return {
                    ...state,
                    // Helper for template to render specific controls if needed
                    isReverb: state.type === 'reverb',
                    isDelay: state.type === 'delay',
                    mainValue: levelVal.toFixed(2), // Display value
                    mainParamRotation: rotation,
                    // Add metadata for params (min, max, etc) which are not in state
                    params: Object.entries(state.params).map(([key, value]) => {
                        const paramConfig = (effect as any).params.get(key) as EffectParam;
                        // Skip 'level' from the list if we treat it as the main knob only?
                        // Or keep it as a slider too for precision? Let's keep it for now or hide it via CSS if needed.
                        // Actually, let's filter it out from the list if it's the main knob to avoid duplication? 
                        // No, let's keep it in the list for now, user might want fine control.
                        return {
                            ...paramConfig,
                            value: value
                        };
                    }).filter(p => p.id !== 'level') // Filter out level from the slider list to avoid clutter
                };
            });

            // Sort order: Reverb, Filter, Delay, Compressor, Distortion
            const sortOrder: EffectType[] = ['reverb', 'filter', 'delay', 'compressor', 'distortion'];
            effects.sort((a, b) => sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type));

            return {
                effects,
                presets
            };
        } catch (error) {
            Logger.error('Failed to get data for SoundEffectsApp:', error);
            // Return safe default data to allow render
            return {
                effects: [],
                presets: []
            };
        }
    }

    activateListeners(html: JQuery): void {
        this.html = html;

        Logger.debug('SoundEffectsApp: View Loaded');

        // Event Delegation for Enable Toggle
        // IMPORTANT: Unbind first to prevent conflicting multiple listeners on root element re-renders
        html.off('click', '.ase-effect-toggle').on('click', '.ase-effect-toggle', (e) => this.onToggleEnable(e));

        // Routing Buttons
        html.off('click', '[data-action="toggle-route"]').on('click', '[data-action="toggle-route"]', (e) => this.onToggleRoute(e));

        // Knobs / Sliders
        // These are direct binds to new elements (found via find), so no accumulation issue, 
        // but ensuring cleanliness is good practice if elements weren't replaced. 
        // Since re-render replaces content, direct binds are fine.
        html.find('.ase-param-slider').on('input', (e) => this.onParamChange(e));
        html.find('.ase-param-input').on('change', (e) => this.onParamChange(e));

        // Circular Knob Interaction
        html.find('.ase-knob-circle').on('mousedown', (e) => this.onKnobCheck(e));

        // Presets
        html.find('[data-action="save-preset"]').on('click', (e) => this.onSavePreset(e));
        html.find('#ase-preset-select').on('change', (e) => this.onLoadPreset(e));
    }

    private onKnobCheck(event: JQuery.TriggeredEvent): void {
        const $knob = $(event.currentTarget);
        const $card = $knob.closest('.ase-effect-card');
        const effectId = $card.data('effect-id') as string;

        const startY = (event as any).pageY;
        // We need to know current value to offset
        // But since we are directly manipulating styling/value, we can read from engine or DOM
        // Simpler: just use delta to inc/dec
        const state = this.engine.getEffectState(effectId)!;
        let currentValue = (state.params['level'] as number) || 1.0;

        const onMouseMove = (moveEvent: JQuery.TriggeredEvent) => {
            const pageY = (moveEvent as any).pageY || (moveEvent.originalEvent as MouseEvent).pageY;
            const deltaY = startY - pageY; // Up is positive
            const sensitivity = 0.01;
            let newValue = currentValue + (deltaY * sensitivity);

            // Clamp 0 to 2.0
            newValue = Math.max(0, Math.min(2.0, newValue));

            // Update UI immediately
            const rotation = (newValue / 2.0) * 270 - 135;
            $knob.css('--knob-rotation', `${rotation}deg`);
            $knob.find('.ase-knob-value').text(newValue.toFixed(2));

            // Update Engine
            this.engine.setEffectParam(effectId, 'level', newValue);
            this.socket.broadcastEffectParam(effectId, 'level', newValue);
        };

        const onMouseUp = () => {
            $(document).off('mousemove', onMouseMove as any);
            $(document).off('mouseup', onMouseUp as any);
        };

        $(document).on('mousemove', onMouseMove as any);
        $(document).on('mouseup', onMouseUp as any);
    }

    private onToggleEnable(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const $toggle = $(event.currentTarget);
        const $card = $toggle.closest('.ase-effect-card');
        const effectId = $card.data('effect-id') as string;

        const wasEnabled = $card.hasClass('enabled');
        const newState = !wasEnabled;

        this.engine.setEffectEnabled(effectId, newState);
        this.socket.broadcastEffectEnabled(effectId, newState);

        // UI Update
        if (newState) {
            $card.addClass('enabled');
        } else {
            $card.removeClass('enabled');
        }
    }

    private onToggleRoute(event: JQuery.ClickEvent): void {
        event.preventDefault();
        const $btn = $(event.currentTarget);
        const $card = $btn.closest('.ase-effect-card');
        const effectId = $card.data('effect-id') as string;
        const channel = $btn.data('channel') as TrackGroup;

        const isActive = $btn.hasClass('active');
        const newState = !isActive;

        this.engine.setEffectRouting(effectId, channel, newState);
        this.socket.broadcastEffectRouting(effectId, channel, newState);

        // UI Update immediately for responsiveness
        if (newState) $btn.addClass('active');
        else $btn.removeClass('active');
    }

    private onParamChange(event: JQuery.TriggeredEvent): void {
        const $input = $(event.currentTarget);
        const $card = $input.closest('.ase-effect-card');
        const effectId = $card.data('effect-id') as string;
        const paramId = $input.data('param-id') as string;

        let value: string | number | boolean = $input.val() as string;

        // Check type of param
        if ($input.attr('type') === 'range') {
            value = parseFloat(value);
            // Update display value
            $card.find(`.ase-param-control:has([data-param-id="${paramId}"]) .ase-param-val`).text(value); // Hacky selector
            // Better:
            $input.siblings('.ase-param-val').text(value);
        }

        this.engine.setEffectParam(effectId, paramId, value);
        this.socket.broadcastEffectParam(effectId, paramId, value);
    }


    private async onSavePreset(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();

        // Get preset name
        const content = `
            <div class="form-group">
                <label>Preset Name</label>
                <input type="text" name="name" placeholder="My Cool Preset"/>
            </div>
        `;

        new Dialog({
            title: "Save Effect Preset",
            content: content,
            buttons: {
                save: {
                    label: "Save",
                    callback: async (html: JQuery) => {
                        const name = html.find('input[name="name"]').val() as string;
                        if (!name) return;

                        await this.savePreset(name);
                    }
                }
            }
        }).render(true);
    }

    private async savePreset(name: string): Promise<void> {
        // Collect state
        const effects = this.engine.getAllEffects().map(e => this.engine.getEffectState(e.id)!);

        const newPreset = {
            id: generateUUID(), // We need a UUID helper or just Math.random
            name,
            effects
        };

        // Load existing, append, save
        const presets = await GlobalStorage.loadPresets();
        presets.push(newPreset);
        await GlobalStorage.savePresets(presets);

        ui.notifications?.info(`Saved preset: ${name}`);
        this.renderParent?.();
    }

    private async onLoadPreset(event: JQuery.ChangeEvent): Promise<void> {
        const presetId = $(event.currentTarget).val() as string;
        if (!presetId) return;

        const presets = await GlobalStorage.loadPresets();
        const preset = presets.find((p: any) => p.id === presetId);

        if (preset) {
            // Apply all effects
            for (const effectState of preset.effects) {
                // Determine if we match by ID or Type
                // Since Effect IDs might change or be fixed, matching by Type is safer for a Rack
                // But if we support multiple instances of same type, we need index or ID
                // For now, Single Rack (one of each type)

                const existingEffect = this.engine.getAllEffects().find(e => e.type === effectState.type);
                if (existingEffect) {
                    // Apply PArsims
                    for (const [key, value] of Object.entries(effectState.params)) {
                        this.engine.setEffectParam(existingEffect.id, key, value);
                    }

                    // Apply Routing
                    if (effectState.routing) {
                        // engine.setRouting? engine.setEffectRouting
                        for (const [group, active] of Object.entries(effectState.routing)) {
                            this.engine.setEffectRouting(existingEffect.id, group as any, active as boolean);
                        }
                    }

                    // Apply Enabled?
                    // engine.setEffectEnabled?
                }
            }
            ui.notifications?.info(`Loaded preset: ${preset.name}`);
            this.renderParent?.();

            // Broadcast full state to sync all clients
            this.socket.broadcastFullState();
        }
    }

    destroy(): void {
        this.html = null;
    }
}

// Helper if not imported
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
