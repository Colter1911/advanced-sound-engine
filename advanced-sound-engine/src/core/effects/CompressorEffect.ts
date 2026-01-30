import { AudioEffect } from './AudioEffect';

export class CompressorEffect extends AudioEffect {
    private compressorNode: DynamicsCompressorNode;
    private makeupNode: GainNode;

    constructor(ctx: AudioContext, id?: string) {
        super(ctx, 'compressor', id);
        this.compressorNode = ctx.createDynamicsCompressor();
        this.makeupNode = ctx.createGain();

        this.addParam({
            id: 'threshold',
            name: 'Threshold',
            type: 'float',
            value: -24,
            defaultValue: -24,
            min: -100,
            max: 0,
            step: 1,
            suffix: 'dB'
        });

        this.addParam({
            id: 'ratio',
            name: 'Ratio',
            type: 'float',
            value: 12,
            defaultValue: 12,
            min: 1,
            max: 20,
            step: 0.5,
            suffix: ''
        });

        this.buildGraph();
        this.applyParam('threshold', -24);
        this.applyParam('ratio', 12);
    }

    protected buildGraph(): void {
        this.inputNode.connect(this.compressorNode);
        this.compressorNode.connect(this.makeupNode);
        this.makeupNode.connect(this.wetNode);
    }

    protected applyParam(key: string, value: any): void {
        switch (key) {
            case 'threshold':
                this.compressorNode.threshold.setTargetAtTime(value as number, this.ctx.currentTime, 0.05);
                this.updateMakeupGain();
                break;
            case 'ratio':
                this.compressorNode.ratio.setTargetAtTime(value as number, this.ctx.currentTime, 0.05);
                this.updateMakeupGain();
                break;
        }
    }

    private updateMakeupGain(): void {
        // Simple auto-makeup gain logic
        // Approximate gain reduction compensation
        const threshold = this.compressorNode.threshold.value;
        const ratio = this.compressorNode.ratio.value;

        // If threshold is 0, no compression, gain should be 1.
        // As threshold drops, we expect volume loss.
        // We compensate roughly half of the potential reduction to be safe.
        // Formula: Gain(dB) = -Threshold * 0.6 (tuned by ear usually)

        let makeupDb = 0;
        if (threshold < 0) {
            makeupDb = -threshold * 0.5;
        }

        // Convert dB to linear gain: 10^(dB/20)
        const makeupGain = Math.pow(10, makeupDb / 20);

        this.makeupNode.gain.setTargetAtTime(makeupGain, this.ctx.currentTime, 0.05);
    }
}
