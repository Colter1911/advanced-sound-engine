import type { TrackGroup } from './audio';

export type EffectType = 'reverb' | 'delay' | 'filter' | 'compressor' | 'distortion' | 'modulation';

export interface EffectParam {
    id: string;
    name: string;
    type: 'float' | 'boolean' | 'select';
    value: number | boolean | string;
    defaultValue: number | boolean | string;
    min?: number;
    max?: number;
    step?: number;
    options?: { label: string; value: string }[]; // For select type
    suffix?: string; // e.g. "ms", "%", "Hz"
}

export interface EffectState {
    id: string;
    type: EffectType;
    enabled: boolean;
    params: Record<string, number | boolean | string>; // key -> value
    routing: {
        [key in TrackGroup]: boolean; // Which channels send to this effect
    };
}

export interface EffectPreset {
    id: string;
    name: string;
    description?: string;
    effects: EffectState[]; // Full state of the rack
}
