import type { EffectState, EffectType, EffectParam } from '@t/effects';
import { generateUUID } from '@utils/uuid';
import { Logger } from '@utils/logger';

export abstract class AudioEffect {
    public readonly id: string;
    public readonly type: EffectType;
    public enabled: boolean = false;

    protected ctx: AudioContext;
    public inputNode: GainNode;
    public outputNode: GainNode;
    protected wetNode: GainNode;
    protected dryNode: GainNode;

    protected params: Map<string, EffectParam> = new Map();

    constructor(ctx: AudioContext, type: EffectType, id?: string) {
        this.ctx = ctx;
        this.type = type;
        // CRITICAL FIX: Use type as ID by default instead of UUID for sync compatibility
        this.id = id || type;

        // Create nodes
        this.inputNode = ctx.createGain();
        this.outputNode = ctx.createGain();
        this.wetNode = ctx.createGain();
        this.dryNode = ctx.createGain();

        // Default Routing:
        // Input -> Split to Dry/Wet
        // Dry -> Output
        // Wet -> [Effect Processing] -> Output

        this.inputNode.connect(this.dryNode);
        this.dryNode.connect(this.outputNode);

        // CRITICAL FIX: Connect wet to output (was missing!)
        // Subclasses connect: inputNode -> [EffectNodes] -> wetNode
        // Then we route: wetNode -> outputNode -> masterGain
        this.wetNode.connect(this.outputNode);

        // Add generic Output Level parameter
        this.addParam({
            id: 'level',
            name: 'Output Level',
            type: 'float',
            value: 1.0,
            defaultValue: 1.0,
            min: 0,
            max: 2.0,
            step: 0.01,
            suffix: ''
        });

        // Ensure enabled state is applied (sets wetNode gain to 1)
        this.setEnabled(this.enabled);
    }

    /**
     * Set a parameter value
     */
    public setParam(key: string, value: any): void {
        const param = this.params.get(key);
        if (!param) {
            Logger.warn(`Effect ${this.type} has no parameter '${key}'`);
            return;
        }

        Logger.debug(`Effect ${this.type} (${this.id}) setting ${key} to`, value);
        param.value = value;

        // Handle base parameters
        if (key === 'level') {
            this.outputNode.gain.setTargetAtTime(value as number, this.ctx.currentTime, 0.05);
        } else {
            this.applyParam(key, value);
        }
    }

    /**
     * Get current state
     */
    public getState(): EffectState {
        const paramsObj: Record<string, any> = {};
        for (const [key, param] of this.params) {
            paramsObj[key] = param.value;
        }

        return {
            id: this.id,
            type: this.type,
            enabled: this.enabled,
            params: paramsObj,
            routing: {
                music: false,
                ambience: false,
                sfx: false
            } // Routing is managed by AudioEngine, this is just a placeholder or could be updated by engine
        };
    }

    /**
     * Initialize parameters (called by subclass)
     */
    protected addParam(param: EffectParam): void {
        this.params.set(param.id, param);
    }

    /**
     * Apply parameter to internal audio nodes (implemented by subclass)
     */
    protected abstract applyParam(key: string, value: any): void;

    /**
     * Connect internal nodes (implemented by subclass)
     * Should connect this.inputNode -> [Effect] -> this.wetNode
     */
    protected abstract buildGraph(): void;

    /**
     * Enable/Disable effect processing
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        // When disabled, we might want to bypass processing to save CPU
        // For now, we assume implicit bypass 
        if (enabled) {
            this.wetNode.gain.setTargetAtTime(1, this.ctx.currentTime, 0.05);
            // We might want to lower dry signal if it's an insert effect, 
            // but since we are using Send architecture, effects are usually 100% wet
            // and we mix them in. 
            // WAIT! If we use Send architecture (Aux Send), the effect should output ONLY Wet signal.
            // The Dry signal comes from the original channel.
            this.dryNode.gain.value = 0;
        } else {
            // Disabled = Mute effect output
            this.wetNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            this.dryNode.gain.value = 0;
        }
    }

    public setDryWet(mix: number) {
        // only relevant if used as insert
    }

    public dispose(): void {
        this.inputNode.disconnect();
        this.outputNode.disconnect();
        this.wetNode.disconnect();
        this.dryNode.disconnect();
    }
}
