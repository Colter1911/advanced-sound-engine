import { AudioEngine } from '@core/AudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { GlobalStorage } from '@storage/GlobalStorage';
import type { EffectType, EffectParam, EffectPreset } from '@t/effects';
import { BUILTIN_PRESETS } from '@core/effects/presets';
import type { TrackGroup } from '@t/audio';
import { Logger } from '@utils/logger';

const MODULE_ID = 'advanced-sound-engine';

// ─── View Data Types ───────────────────────────────────────────

interface ParamViewData {
    id: string;
    name: string;
    type: 'float' | 'boolean' | 'select';
    value: number | boolean | string;
    displayValue: string;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    options?: { label: string; value: string }[];
}

interface PedalViewData {
    type: EffectType;
    enabled: boolean;
    mix: number;
    mixPercent: number;
    mixRotation: number;
    chainIndex: number;
    selected: boolean;
    params: ParamViewData[];
}

interface EffectsViewData {
    activeChannel: TrackGroup;
    pedals: PedalViewData[];
    selectedEffect: PedalViewData | null;
    musicActiveCount: number;
    ambienceActiveCount: number;
    sfxActiveCount: number;
    builtinPresets: EffectPreset[];
    customPresets: EffectPreset[];
}

// ─── Controller ────────────────────────────────────────────────

export class SoundEffectsApp {
    private engine: AudioEngine;
    private socket: SocketManager;
    private html: JQuery | null = null;
    private renderParent: (() => void) | null = null;

    private activeChannel: TrackGroup = 'music';
    private selectedEffectType: EffectType | null = null;

    constructor(engine: AudioEngine, socket: SocketManager) {
        this.engine = engine;
        this.socket = socket;
    }

    setRenderCallback(callback: () => void): void {
        this.renderParent = callback;
    }

    // ─────────────────────────────────────────────────────────────
    // Data Provider
    // ─────────────────────────────────────────────────────────────

    async getData(): Promise<EffectsViewData> {
        try {
            const chain = this.engine.getChain(this.activeChannel);
            const effects = chain.getEffects();

            const pedals: PedalViewData[] = effects.map((effect, index) => {
                const state = effect.getChainState();
                const mixPercent = Math.round(state.mix * 100);
                const mixRotation = (state.mix * 270) - 135;

                const params: ParamViewData[] = [];
                for (const [key, param] of effect.getAllParams()) {
                    if (key === 'level') continue;
                    params.push({
                        id: param.id,
                        name: param.name,
                        type: param.type,
                        value: param.value,
                        displayValue: this.formatParamValue(param),
                        min: param.min,
                        max: param.max,
                        step: param.step,
                        suffix: param.suffix,
                        options: param.options,
                    });
                }

                return {
                    type: state.type,
                    enabled: state.enabled,
                    mix: state.mix,
                    mixPercent,
                    mixRotation,
                    chainIndex: index,
                    selected: state.type === this.selectedEffectType,
                    params,
                };
            });

            // Load presets
            const allPresets = await GlobalStorage.loadPresets();
            const builtinPresets = allPresets.filter(p => p.builtIn);
            const customPresets = allPresets.filter(p => !p.builtIn);

            return {
                activeChannel: this.activeChannel,
                pedals,
                selectedEffect: pedals.find(p => p.selected) || null,
                musicActiveCount: this.engine.getChain('music').getActiveCount(),
                ambienceActiveCount: this.engine.getChain('ambience').getActiveCount(),
                sfxActiveCount: this.engine.getChain('sfx').getActiveCount(),
                builtinPresets,
                customPresets,
            };
        } catch (error) {
            Logger.error('SoundEffectsApp getData failed:', error);
            return {
                activeChannel: this.activeChannel,
                pedals: [],
                selectedEffect: null,
                musicActiveCount: 0,
                ambienceActiveCount: 0,
                sfxActiveCount: 0,
                builtinPresets: [...BUILTIN_PRESETS],
                customPresets: [],
            };
        }
    }

    private formatParamValue(param: EffectParam): string {
        if (param.type === 'select') return String(param.value);
        if (param.type === 'boolean') return param.value ? 'ON' : 'OFF';
        const num = Number(param.value);
        const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(2);
        return param.suffix ? `${formatted}${param.suffix}` : formatted;
    }

    // ─────────────────────────────────────────────────────────────
    // Event Listeners
    // ─────────────────────────────────────────────────────────────

    activateListeners(html: JQuery): void {
        this.html = html;

        Logger.debug('SoundEffectsApp: View Loaded');

        // Pedal card click → select
        html.off('click', '.ase-pedal-card').on('click', '.ase-pedal-card', (e) => this.onPedalSelect(e));

        // Footswitch → toggle bypass (stop propagation to avoid select)
        html.off('click', '.ase-pedal-footswitch').on('click', '.ase-pedal-footswitch', (e) => {
            e.stopPropagation();
            this.onToggleBypass(e);
        });

        // Pedal knob drag (mix on card)
        html.find('.ase-pedal-knob').on('mousedown', (e) => {
            e.stopPropagation();
            this.onKnobDrag(e, 'pedal');
        });

        // Detail panel mix knob drag
        html.find('.ase-detail-knob').on('mousedown', (e) => this.onKnobDrag(e, 'detail'));

        // Detail panel sliders
        html.find('.ase-detail-slider').on('input', (e) => this.onDetailParamSlider(e));

        // Detail panel segmented buttons
        html.off('click', '.ase-seg-btn').on('click', '.ase-seg-btn', (e) => this.onDetailParamSelect(e));

        // Presets
        html.find('#ase-preset-select').on('change', (e) => this.onLoadPreset(e));
        html.off('click', '[data-action="save-preset"]').on('click', '[data-action="save-preset"]', (e) => this.onSavePreset(e));
        html.off('click', '[data-action="reset-chain"]').on('click', '[data-action="reset-chain"]', (e) => this.onResetChain(e));

        // Drag-and-drop
        this.initDragAndDrop(html);
    }

    // ─────────────────────────────────────────────────────────────
    // Channel Switch
    // ─────────────────────────────────────────────────────────────

    private onChannelSwitch(event: JQuery.ClickEvent): void {
        event.preventDefault();
        const channel = $(event.currentTarget).data('channel') as TrackGroup;
        if (channel === this.activeChannel) return;

        this.activeChannel = channel;
        this.selectedEffectType = null;
        this.renderParent?.();
    }

    // ─────────────────────────────────────────────────────────────
    // Pedal Select
    // ─────────────────────────────────────────────────────────────

    private onPedalSelect(event: JQuery.ClickEvent): void {
        const effectType = $(event.currentTarget).data('effect-type') as EffectType;

        if (this.selectedEffectType === effectType) {
            this.selectedEffectType = null;
        } else {
            this.selectedEffectType = effectType;
        }

        this.renderParent?.();
    }

    // ─────────────────────────────────────────────────────────────
    // Footswitch (Bypass Toggle)
    // ─────────────────────────────────────────────────────────────

    private onToggleBypass(event: JQuery.ClickEvent): void {
        const $card = $(event.currentTarget).closest('.ase-pedal-card');
        const effectType = $card.data('effect-type') as EffectType;
        const wasActive = $card.hasClass('active');
        const newEnabled = !wasActive;

        this.engine.setChainEffectEnabled(this.activeChannel, effectType, newEnabled);
        this.socket.broadcastEffectEnabled(this.activeChannel, effectType, newEnabled);

        // Optimistic UI update
        $card.toggleClass('active', newEnabled);
        $card.find('.ase-pedal-led').toggleClass('on', newEnabled);
        $card.find('.ase-pedal-footswitch').toggleClass('engaged', newEnabled);
    }

    // ─────────────────────────────────────────────────────────────
    // Knob Drag (shared for pedal & detail mix knobs)
    // ─────────────────────────────────────────────────────────────

    private onKnobDrag(event: JQuery.MouseDownEvent, source: 'pedal' | 'detail'): void {
        const $knob = $(event.currentTarget);
        let effectType: EffectType;

        if (source === 'pedal') {
            effectType = $knob.closest('.ase-pedal-card').data('effect-type') as EffectType;
        } else {
            if (!this.selectedEffectType) return;
            effectType = this.selectedEffectType;
        }

        const chain = this.engine.getChain(this.activeChannel);
        const effect = chain.getEffect(effectType);
        if (!effect) return;

        const startY = event.pageY;
        let currentMix = effect.mix;

        const onMouseMove = (moveEvent: JQuery.TriggeredEvent) => {
            const pageY = (moveEvent as any).pageY || (moveEvent.originalEvent as MouseEvent).pageY;
            const deltaY = startY - pageY;
            const sensitivity = 0.005;
            const newMix = Math.max(0, Math.min(1, currentMix + (deltaY * sensitivity)));

            // Update UI on all matching knobs
            const rotation = (newMix * 270) - 135;
            if (this.html) {
                const $pedalCard = this.html.find(`.ase-pedal-card[data-effect-type="${effectType}"]`);
                $pedalCard.find('.ase-pedal-knob').css('--knob-rotation', `${rotation}deg`);
                $pedalCard.find('.ase-pedal-mix-value').text(`${Math.round(newMix * 100)}%`);

                this.html.find('.ase-detail-knob').css('--knob-rotation', `${rotation}deg`);
                this.html.find('.ase-detail-knob-label').text(`Mix ${Math.round(newMix * 100)}%`);
            }

            this.engine.setChainEffectMix(this.activeChannel, effectType, newMix);
            this.socket.broadcastChainEffectMix(this.activeChannel, effectType, newMix);
        };

        const onMouseUp = () => {
            $(document).off('mousemove', onMouseMove as any);
            $(document).off('mouseup', onMouseUp as any);
        };

        $(document).on('mousemove', onMouseMove as any);
        $(document).on('mouseup', onMouseUp as any);
    }

    // ─────────────────────────────────────────────────────────────
    // Detail Panel: Param Slider
    // ─────────────────────────────────────────────────────────────

    private onDetailParamSlider(event: JQuery.TriggeredEvent): void {
        if (!this.selectedEffectType) return;

        const $input = $(event.currentTarget);
        const paramId = $input.data('param-id') as string;
        const value = parseFloat($input.val() as string);

        this.engine.setChainEffectParam(this.activeChannel, this.selectedEffectType, paramId, value);
        this.socket.broadcastEffectParam(this.activeChannel, this.selectedEffectType, paramId, value);

        // Update display value
        const suffix = $input.data('suffix') || '';
        const $row = $input.closest('.ase-detail-param-row');
        const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
        $row.find('.ase-detail-param-value').text(`${formatted}${suffix}`);

        // Update slider fill
        const min = parseFloat($input.attr('min') || '0');
        const max = parseFloat($input.attr('max') || '1');
        const fill = ((value - min) / (max - min)) * 100;
        $input.css('--slider-fill', `${fill}%`);
    }

    // ─────────────────────────────────────────────────────────────
    // Detail Panel: Select Param (segmented buttons)
    // ─────────────────────────────────────────────────────────────

    private onDetailParamSelect(event: JQuery.ClickEvent): void {
        event.preventDefault();
        if (!this.selectedEffectType) return;

        const $btn = $(event.currentTarget);
        const paramId = $btn.data('param-id') as string;
        const value = $btn.data('value') as string;

        this.engine.setChainEffectParam(this.activeChannel, this.selectedEffectType, paramId, value);
        this.socket.broadcastEffectParam(this.activeChannel, this.selectedEffectType, paramId, value);

        // UI update
        $btn.siblings().removeClass('active');
        $btn.addClass('active');

        const $row = $btn.closest('.ase-detail-param-row');
        $row.find('.ase-detail-param-value').text(value);
    }

    // ─────────────────────────────────────────────────────────────
    // Drag and Drop Reorder
    // ─────────────────────────────────────────────────────────────

    private initDragAndDrop(html: JQuery): void {
        const $pedalboard = html.find('.ase-pedalboard');
        if (!$pedalboard.length) return;

        html.find('.ase-pedal-card').each((_, el) => {
            el.addEventListener('dragstart', (e: DragEvent) => {
                if (!e.dataTransfer) return;
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    effectType: el.dataset.effectType,
                    chainIndex: el.dataset.chainIndex,
                }));
                e.dataTransfer.effectAllowed = 'move';
                $(el).addClass('dragging');
            });

            el.addEventListener('dragend', () => {
                $(el).removeClass('dragging');
                html.find('.ase-drop-zone').removeClass('drag-over');
            });
        });

        html.find('.ase-drop-zone').each((_, zone) => {
            zone.addEventListener('dragover', (e: DragEvent) => {
                e.preventDefault();
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                $(zone).addClass('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                $(zone).removeClass('drag-over');
            });

            zone.addEventListener('drop', (e: DragEvent) => {
                e.preventDefault();
                $(zone).removeClass('drag-over');
                if (!e.dataTransfer) return;

                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const fromIndex = parseInt(data.chainIndex, 10);
                const toIndex = parseInt((zone as HTMLElement).dataset.dropIndex || '0', 10);

                if (fromIndex !== toIndex && fromIndex !== toIndex - 1) {
                    const adjustedTo = fromIndex < toIndex ? toIndex - 1 : toIndex;
                    this.engine.reorderChainEffect(this.activeChannel, fromIndex, adjustedTo);

                    const newOrder = this.engine.getChain(this.activeChannel).getOrder();
                    this.socket.broadcastChainReorder(this.activeChannel, newOrder);
                    this.renderParent?.();
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Presets
    // ─────────────────────────────────────────────────────────────

    private async onLoadPreset(event: JQuery.ChangeEvent): Promise<void> {
        const presetId = $(event.currentTarget).val() as string;
        if (!presetId) return;

        const allPresets = await GlobalStorage.loadPresets();
        const preset = allPresets.find(p => p.id === presetId);
        if (!preset || !preset.chains) return;

        // Apply preset chains to all channels
        for (const chainState of preset.chains) {
            const chain = this.engine.getChain(chainState.channel as TrackGroup);
            if (chain) {
                chain.restoreState(chainState);
            }
        }

        this.socket.broadcastFullState();
        ui.notifications?.info(`Loaded preset: ${preset.name}`);
        this.renderParent?.();

        // Reset select
        $(event.currentTarget).val('');
    }

    private async onSavePreset(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();

        const content = `
            <div class="form-group">
                <label>Preset Name</label>
                <input type="text" name="name" placeholder="My Custom Preset"/>
            </div>
            <div class="form-group">
                <label>Description (optional)</label>
                <input type="text" name="description" placeholder="Short description..."/>
            </div>
        `;

        new Dialog({
            title: "Save Effect Preset",
            content,
            buttons: {
                save: {
                    label: "Save",
                    callback: async (html: JQuery) => {
                        const name = html.find('input[name="name"]').val() as string;
                        if (!name) return;
                        const description = html.find('input[name="description"]').val() as string;

                        const newPreset: EffectPreset = {
                            id: `custom-${Date.now()}`,
                            name,
                            description: description || undefined,
                            builtIn: false,
                            chains: this.engine.getAllChainsState(),
                        };

                        const allPresets = await GlobalStorage.loadPresets();
                        allPresets.push(newPreset);
                        await GlobalStorage.savePresets(allPresets);

                        ui.notifications?.info(`Saved preset: ${name}`);
                        this.renderParent?.();
                    }
                }
            }
        }).render(true);
    }

    private onResetChain(event: JQuery.ClickEvent): void {
        event.preventDefault();

        const chain = this.engine.getChain(this.activeChannel);
        chain.buildDefault();
        this.selectedEffectType = null;

        this.socket.broadcastFullState();
        this.renderParent?.();
    }

    // ─────────────────────────────────────────────────────────────
    // Cleanup
    // ─────────────────────────────────────────────────────────────

    destroy(): void {
        this.html = null;
    }
}
