import type { EffectPreset, ChannelChain, ChainEffectState } from '@t/effects';
import { DEFAULT_MIX } from '@t/effects';

/**
 * Helper: create a ChainEffectState with defaults
 */
function fx(
    type: ChainEffectState['type'],
    enabled: boolean,
    params: Record<string, any> = {},
    mix?: number
): ChainEffectState {
    return {
        type,
        enabled,
        mix: mix ?? DEFAULT_MIX[type] ?? 1.0,
        params: { level: 1.0, ...params },
    };
}

/**
 * Helper: create 3 channel chains (music, ambience, sfx)
 */
function chains(
    music: ChainEffectState[],
    ambience: ChainEffectState[],
    sfx: ChainEffectState[]
): ChannelChain[] {
    return [
        { channel: 'music', effects: music },
        { channel: 'ambience', effects: ambience },
        { channel: 'sfx', effects: sfx },
    ];
}

// ─── Built-in Presets ───────────────────────────────────────────

export const BUILTIN_PRESETS: EffectPreset[] = [
    {
        id: 'builtin-standard',
        name: 'Standard',
        description: 'Default chain order, all effects disabled. Clean starting point.',
        builtIn: true,
        chains: chains(
            [fx('filter', false), fx('compressor', false), fx('distortion', false), fx('delay', false), fx('reverb', false)],
            [fx('filter', false), fx('compressor', false), fx('distortion', false), fx('delay', false), fx('reverb', false)],
            [fx('filter', false), fx('compressor', false), fx('distortion', false), fx('delay', false), fx('reverb', false)]
        ),
    },
    {
        id: 'builtin-dark-dungeon',
        name: 'Dark Dungeon',
        description: 'Low rumble, long reverb tails, muffled echoes.',
        builtIn: true,
        chains: chains(
            // Music: lowpass filter + long reverb
            [
                fx('filter', true, { type: 'lowpass', frequency: 800, Q: 1 }),
                fx('reverb', true, { decay: 4.0, size: 2.0, tone: 'dark' }, 0.40),
            ],
            // Ambience: lowpass + delay + very long reverb
            [
                fx('filter', true, { type: 'lowpass', frequency: 600, Q: 0.8 }),
                fx('delay', true, { time: 0.8, feedback: 0.5 }, 0.25),
                fx('reverb', true, { decay: 6.0, size: 2.5, tone: 'dark' }, 0.50),
            ],
            // SFX: compressor + medium reverb
            [
                fx('compressor', true, { threshold: -24, ratio: 8 }),
                fx('reverb', true, { decay: 3.0, size: 1.5, tone: 'dark' }, 0.30),
            ]
        ),
    },
    {
        id: 'builtin-cave-echo',
        name: 'Cave Echo',
        description: 'Hard reflections, prominent delay, natural cave feel.',
        builtIn: true,
        chains: chains(
            // Music: mild filter + short delay + medium reverb
            [
                fx('filter', true, { type: 'lowpass', frequency: 3000, Q: 0.5 }),
                fx('delay', true, { time: 0.15, feedback: 0.6 }, 0.25),
                fx('reverb', true, { decay: 2.5, size: 1.8, tone: 'default' }, 0.35),
            ],
            // Ambience: prominent delay + reverb
            [
                fx('delay', true, { time: 0.25, feedback: 0.5 }, 0.30),
                fx('reverb', true, { decay: 3.5, size: 2.0, tone: 'default' }, 0.40),
            ],
            // SFX: heavy delay + reverb for dramatic echoes
            [
                fx('delay', true, { time: 0.12, feedback: 0.7 }, 0.35),
                fx('reverb', true, { decay: 2.0, size: 1.5, tone: 'default' }, 0.25),
            ]
        ),
    },
    {
        id: 'builtin-open-field',
        name: 'Open Field',
        description: 'Wide open space, subtle reverb, natural clarity.',
        builtIn: true,
        chains: chains(
            // Music: light compressor + subtle delay + short reverb
            [
                fx('compressor', true, { threshold: -20, ratio: 4 }),
                fx('delay', true, { time: 0.15, feedback: 0.2 }, 0.15),
                fx('reverb', true, { decay: 1.5, size: 1.0, tone: 'bright' }, 0.20),
            ],
            // Ambience: highpass (remove rumble) + gentle reverb
            [
                fx('filter', true, { type: 'highpass', frequency: 200, Q: 0.7 }),
                fx('reverb', true, { decay: 2.0, size: 1.2, tone: 'bright' }, 0.25),
            ],
            // SFX: just compressor for punch
            [
                fx('compressor', true, { threshold: -18, ratio: 6 }),
            ]
        ),
    },
    {
        id: 'builtin-tavern',
        name: 'Tavern',
        description: 'Warm, close-quarters sound with slight crunch.',
        builtIn: true,
        chains: chains(
            // Music: lowpass (warmth) + compressor + light distortion + short reverb
            [
                fx('filter', true, { type: 'lowpass', frequency: 3000, Q: 0.8 }),
                fx('compressor', true, { threshold: -20, ratio: 6 }),
                fx('distortion', true, { drive: 10 }, 0.80),
                fx('reverb', true, { decay: 1.0, size: 0.5, tone: 'dark' }, 0.20),
            ],
            // Ambience: bandpass (narrow room) + short reverb
            [
                fx('filter', true, { type: 'bandpass', frequency: 800, Q: 2 }),
                fx('reverb', true, { decay: 0.8, size: 0.4, tone: 'default' }, 0.15),
            ],
            // SFX: short reverb only
            [
                fx('reverb', true, { decay: 0.5, size: 0.3, tone: 'default' }, 0.15),
            ]
        ),
    },
    {
        id: 'builtin-combat',
        name: 'Combat',
        description: 'Punchy, aggressive. Heavy compression, tight sound.',
        builtIn: true,
        chains: chains(
            // Music: heavy compressor + light distortion for energy
            [
                fx('compressor', true, { threshold: -30, ratio: 8 }),
                fx('distortion', true, { drive: 15 }, 0.70),
            ],
            // Ambience: highpass (cut mud) + compressor
            [
                fx('filter', true, { type: 'highpass', frequency: 150, Q: 0.7 }),
                fx('compressor', true, { threshold: -24, ratio: 6 }),
            ],
            // SFX: compressor for impact + very short delay for punch
            [
                fx('compressor', true, { threshold: -20, ratio: 6 }),
                fx('delay', true, { time: 0.05, feedback: 0.2 }, 0.20),
            ]
        ),
    },
    {
        id: 'builtin-underwater',
        name: 'Underwater',
        description: 'Heavy lowpass, slow modulated feel, muffled world.',
        builtIn: true,
        chains: chains(
            // Music: aggressive lowpass + reverb
            [
                fx('filter', true, { type: 'lowpass', frequency: 400, Q: 2 }),
                fx('reverb', true, { decay: 3.0, size: 2.0, tone: 'dark' }, 0.45),
            ],
            // Ambience: same treatment
            [
                fx('filter', true, { type: 'lowpass', frequency: 350, Q: 2.5 }),
                fx('delay', true, { time: 0.4, feedback: 0.4 }, 0.20),
                fx('reverb', true, { decay: 4.0, size: 2.5, tone: 'dark' }, 0.50),
            ],
            // SFX: lowpass + reverb
            [
                fx('filter', true, { type: 'lowpass', frequency: 500, Q: 1.5 }),
                fx('reverb', true, { decay: 2.0, size: 1.5, tone: 'dark' }, 0.35),
            ]
        ),
    },
    {
        id: 'builtin-old-radio',
        name: 'Old Radio',
        description: 'Bandpass filter + distortion for vintage radio effect.',
        builtIn: true,
        chains: chains(
            [
                fx('filter', true, { type: 'bandpass', frequency: 2000, Q: 3 }),
                fx('compressor', true, { threshold: -30, ratio: 12 }),
                fx('distortion', true, { drive: 25 }, 0.85),
            ],
            [
                fx('filter', true, { type: 'bandpass', frequency: 2000, Q: 3 }),
                fx('distortion', true, { drive: 20 }, 0.85),
            ],
            [
                fx('filter', true, { type: 'bandpass', frequency: 2000, Q: 3 }),
                fx('distortion', true, { drive: 20 }, 0.85),
            ]
        ),
    },
];

/** Get a built-in preset by id */
export function getBuiltinPreset(id: string): EffectPreset | undefined {
    return BUILTIN_PRESETS.find(p => p.id === id);
}
