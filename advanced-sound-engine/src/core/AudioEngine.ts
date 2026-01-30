import type { TrackConfig, TrackState, MixerState, TrackGroup, ChannelVolumes } from '@t/audio';
import type { EffectState, EffectType, EffectParam } from '@t/effects';
import { StreamingPlayer } from './StreamingPlayer';
import { Logger } from '@utils/logger';
import { getServerTime } from '@utils/time';
import { generateUUID } from '@utils/uuid';
import { validateAudioFile } from '@utils/audio-validation';

// Effects
import { AudioEffect } from './effects/AudioEffect';
import { ReverbEffect } from './effects/ReverbEffect';
import { DelayEffect } from './effects/DelayEffect';
import { FilterEffect } from './effects/FilterEffect';
import { CompressorEffect } from './effects/CompressorEffect';
import { DistortionEffect } from './effects/DistortionEffect';

const MODULE_ID = 'advanced-sound-engine';

function getMaxSimultaneous(): number {
  return ((game.settings as any).get(MODULE_ID, 'maxSimultaneousTracks') as number) || 8;
}

export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private channelGains: Record<TrackGroup, GainNode>;
  private players: Map<string, StreamingPlayer> = new Map();

  // Effects System
  // Effects System
  private effects: Map<string, AudioEffect> = new Map();
  // Sends: Channel -> EffectId -> GainNode
  private sends: Record<TrackGroup, Map<string, GainNode>> = {
    music: new Map(),
    ambience: new Map(),
    sfx: new Map()
  };
  // Direct Gains: Channel -> Master (Control dry level)
  private directGains: Record<TrackGroup, GainNode>;

  private _volumes: ChannelVolumes = {
    master: 1,
    music: 1,
    ambience: 1,
    sfx: 1
  };

  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    };

    // Initialize Direct Gains
    this.directGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    };

    // Connect Channel -> DirectGain -> Master
    // This replaces the direct connection so we can duck the dry signal
    this.channelGains.music.connect(this.directGains.music);
    this.directGains.music.connect(this.masterGain);

    this.channelGains.ambience.connect(this.directGains.ambience);
    this.directGains.ambience.connect(this.masterGain);

    this.channelGains.sfx.connect(this.directGains.sfx);
    this.directGains.sfx.connect(this.masterGain);

    this.initializeEffects();

    Logger.info('AudioEngine initialized');
  }

  private initializeEffects(): void {
    // Create one instance of each effect
    const effectClasses = [
      ReverbEffect,
      FilterEffect,
      DelayEffect,
      CompressorEffect,
      DistortionEffect
    ];

    effectClasses.forEach(EffectClass => {
      const effect = new EffectClass(this.ctx);
      // CRITICAL FIX: Use effect type as ID instead of UUID for sync compatibility with PlayerAudioEngine
      const effectId = effect.type; // 'reverb', 'delay', 'filter', etc.
      this.effects.set(effectId, effect);

      // Connect Effect Output to Master Gain
      effect.outputNode.connect(this.masterGain);

      // Create Send Gains for each channel
      (['music', 'ambience', 'sfx'] as TrackGroup[]).forEach(group => {
        const sendGain = this.ctx.createGain();
        sendGain.gain.value = 0; // Default off

        // Connect Channel -> SendGain -> Effect Input
        this.channelGains[group].connect(sendGain);
        sendGain.connect(effect.inputNode);

        this.sends[group].set(effectId, sendGain);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Persistence (GM only)
  // ─────────────────────────────────────────────────────────────

  private scheduleSave(): void {
    if (!game.user?.isGM) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 500);
  }

  private async saveState(): Promise<void> {
    if (!game.ready || !game.user?.isGM) return;

    const state = this.getState();

    try {
      await (game.settings as any).set(MODULE_ID, 'mixerState', JSON.stringify(state));
      Logger.debug('Mixer state saved');
    } catch (error) {
      Logger.error('Failed to save mixer state:', error);
    }
  }

  async loadSavedState(): Promise<void> {
    if (!game.ready) return;

    try {
      const savedJson = (game.settings as any).get(MODULE_ID, 'mixerState') as string;
      if (!savedJson) return;

      const state = JSON.parse(savedJson) as MixerState;
      await this.restoreState(state);

      Logger.info('Mixer state restored');
    } catch (error) {
      Logger.error('Failed to load mixer state:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────

  async createTrack(config: TrackConfig): Promise<StreamingPlayer> {
    // Generate UUID if not provided
    const trackId = config.id || generateUUID();

    if (this.players.has(trackId)) {
      return this.players.get(trackId)!;
    }

    // Validate audio file format
    const validation = validateAudioFile(config.url);
    if (!validation.valid) {
      const error = new Error(validation.error || 'Invalid audio file');
      Logger.error(`Track validation failed: ${validation.error}`);
      throw error;
    }

    const channelOutput = this.channelGains[config.group];

    const player = new StreamingPlayer(
      trackId,
      this.ctx,
      channelOutput,
      config.group
    );

    if (config.volume !== undefined) {
      player.setVolume(config.volume);
    }
    if (config.loop !== undefined) {
      player.setLoop(config.loop);
    }

    await player.load(config.url);

    this.players.set(trackId, player);
    this.scheduleSave();

    Logger.info(`Track created: ${trackId} (${validation.extension})`);
    return player;
  }

  getTrack(id: string): StreamingPlayer | undefined {
    return this.players.get(id);
  }

  removeTrack(id: string): boolean {
    const player = this.players.get(id);
    if (!player) return false;

    player.dispose();
    this.players.delete(id);
    this.scheduleSave();

    Logger.info(`Track removed: ${id}`);
    return true;
  }

  getAllTracks(): StreamingPlayer[] {
    return Array.from(this.players.values());
  }

  getTracksByGroup(group: TrackGroup): StreamingPlayer[] {
    return this.getAllTracks().filter(t => t.group === group);
  }

  setTrackChannel(id: string, newGroup: TrackGroup): void {
    const player = this.players.get(id);
    if (!player) return;

    player.setChannel(newGroup, this.channelGains[newGroup]);
    this.scheduleSave();
  }

  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────

  async playTrack(id: string, offset: number = 0): Promise<void> {
    const player = this.players.get(id);
    if (!player) {
      Logger.warn(`Track not found: ${id}`);
      return;
    }

    const maxSimultaneous = getMaxSimultaneous();
    const playingCount = this.getAllTracks().filter(t => t.state === 'playing').length;
    const isCurrentlyPlaying = player.state === 'playing';

    if (!isCurrentlyPlaying && playingCount >= maxSimultaneous) {
      Logger.warn(`Maximum simultaneous tracks (${maxSimultaneous}) reached`);
      ui.notifications?.warn(`Cannot play more than ${maxSimultaneous} tracks simultaneously`);
      return;
    }

    await player.play(offset);
  }

  pauseTrack(id: string): void {
    this.players.get(id)?.pause();
  }

  stopTrack(id: string): void {
    this.players.get(id)?.stop();
  }

  seekTrack(id: string, time: number): void {
    this.players.get(id)?.seek(time);
  }

  setTrackVolume(id: string, volume: number): void {
    this.players.get(id)?.setVolume(volume);
    this.scheduleSave();
  }

  setTrackLoop(id: string, loop: boolean): void {
    this.players.get(id)?.setLoop(loop);
    this.scheduleSave();
  }

  stopAll(): void {
    for (const player of this.players.values()) {
      player.stop();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Volume Control
  // ─────────────────────────────────────────────────────────────

  get volumes(): ChannelVolumes {
    return { ...this._volumes };
  }

  setMasterVolume(value: number): void {
    this._volumes.master = Math.max(0, Math.min(1, value));
    this.masterGain.gain.linearRampToValueAtTime(
      this._volumes.master,
      this.ctx.currentTime + 0.01
    );
    this.scheduleSave();
  }

  setChannelVolume(channel: TrackGroup, value: number): void {
    this._volumes[channel] = Math.max(0, Math.min(1, value));
    this.channelGains[channel].gain.linearRampToValueAtTime(
      this._volumes[channel],
      this.ctx.currentTime + 0.01
    );
    this.scheduleSave();
  }

  getChannelVolume(channel: TrackGroup): number {
    return this._volumes[channel];
  }

  // ─────────────────────────────────────────────────────────────
  // Effects Management
  // ─────────────────────────────────────────────────────────────

  getAllEffects(): AudioEffect[] {
    return Array.from(this.effects.values());
  }

  setEffectParam(effectId: string, paramId: string, value: any): void {
    const effect = this.effects.get(effectId);
    if (!effect) return;

    effect.setParam(paramId, value);
    this.scheduleSave();
  }

  setEffectEnabled(effectId: string, enabled: boolean): void {
    const effect = this.effects.get(effectId);
    if (!effect) {
      console.warn('[ASE GM] setEffectEnabled: Effect not found:', effectId);
      return;
    }

    console.log('[ASE GM] setEffectEnabled:', effectId, enabled, 'effect.enabled before:', effect.enabled);
    effect.setEnabled(enabled);
    console.log('[ASE GM] effect.enabled after:', effect.enabled);
    this.scheduleSave();

    // Update dry levels for all channels that use this effect
    (['music', 'ambience', 'sfx'] as TrackGroup[]).forEach(group => {
      this.updateDryLevel(group);
    });
  }

  /**
   * Toggle routing from a channel to an effect
   */
  setEffectRouting(effectId: string, channel: TrackGroup, enabled: boolean): void {
    const channelSends = this.sends[channel];
    const sendNode = channelSends.get(effectId);

    console.log('[ASE GM] setEffectRouting:', effectId, channel, enabled, 'sendNode exists:', !!sendNode);
    if (sendNode) {
      console.log('[ASE GM] Setting send gain from', sendNode.gain.value, 'to', enabled ? 1 : 0);
      // Smooth transition
      sendNode.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.05);
      this.scheduleSave();

      // Update dry level for this channel
      this.updateDryLevel(channel);
    } else {
      console.warn('[ASE GM] Send node not found for:', effectId, channel);
    }
  }

  /**
   * Checks active effects for the channel and adjusts direct (dry) gain.
   * If an INSERT effect (Filter, Distortion, Compressor) is active + routed, 
   * we duck the dry signal to 0.
   */
  private updateDryLevel(channel: TrackGroup): void {
    let isInsertActive = false;
    const insertTypes: EffectType[] = ['filter', 'distortion', 'compressor'];

    for (const effect of this.effects.values()) {
      // Check if effect is enabled globally
      if (!effect.enabled) continue;

      // Check if routed to this channel
      const sendNode = this.sends[channel].get(effect.id);
      const isRouted = (sendNode?.gain.value || 0) > 0.5; // Threshold check

      if (isRouted && insertTypes.includes(effect.type)) {
        isInsertActive = true;
        break; // Found one, that's enough to mute dry
      }
    }

    // If Insert is active, Dry = 0. Else Dry = 1.
    const targetGain = isInsertActive ? 0 : 1;

    // Smooth transition to avoid clicks
    this.directGains[channel].gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);

    Logger.debug(`Channel ${channel} dry level set to ${targetGain} (Insert Active: ${isInsertActive})`);
  }

  getEffectState(effectId: string): EffectState | undefined {
    const effect = this.effects.get(effectId);
    if (!effect) return undefined;

    const state = effect.getState();

    // Inject current routing state
    (['music', 'ambience', 'sfx'] as TrackGroup[]).forEach(group => {
      const sendGain = this.sends[group].get(effectId);
      // We consider it enabled if gain > 0.1
      state.routing[group] = (sendGain?.gain.value || 0) > 0.1;
    });

    return state;
  }

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────

  getState(): MixerState {
    const tracks: TrackState[] = [];

    for (const player of this.players.values()) {
      tracks.push(player.getState());
    }

    return {
      masterVolume: this._volumes.master,
      channelVolumes: { ...this._volumes },
      tracks,
      effects: this.getAllEffects().map(e => this.getEffectState(e.type)!),
      timestamp: getServerTime(),
      syncEnabled: false
    };
  }

  async restoreState(state: MixerState): Promise<void> {
    // Restore volumes
    this._volumes.master = state.masterVolume;
    this.masterGain.gain.setValueAtTime(this._volumes.master, this.ctx.currentTime);

    if (state.channelVolumes) {
      for (const channel of ['music', 'ambience', 'sfx'] as TrackGroup[]) {
        this._volumes[channel] = state.channelVolumes[channel];
        this.channelGains[channel].gain.setValueAtTime(this._volumes[channel], this.ctx.currentTime);
      }
    }

    // Restore Effects
    if (state.effects) {
      for (const fxState of state.effects) {
        // Find by Type since IDs might be regenerated on reload if not persistent?
        // Actually, IDs are persistent in state. But we initialized new effects with random IDs in constructor.
        // We need to match by TYPE because we have exactly 1 of each type.

        const effect = Array.from(this.effects.values()).find(e => e.type === fxState.type);
        if (effect) {
          // Restore Params
          for (const [key, value] of Object.entries(fxState.params)) {
            effect.setParam(key, value);
          }

          // Restore Routing
          for (const [group, enabled] of Object.entries(fxState.routing)) {
            this.setEffectRouting(effect.id, group as TrackGroup, enabled as boolean);
          }
        }
      }
    }

    // Restore tracks (without playing)
    for (const trackState of state.tracks) {
      if (!this.players.has(trackState.id)) {
        try {
          await this.createTrack({
            id: trackState.id,
            url: trackState.url,
            group: trackState.group,
            volume: trackState.volume,
            loop: trackState.loop
          });
        } catch (error) {
          Logger.error(`Failed to restore track ${trackState.id}:`, error);
        }
      }
    }

    // Remove tracks not in state
    const stateTrackIds = new Set(state.tracks.map(t => t.id));
    for (const [id] of this.players) {
      if (!stateTrackIds.has(id)) {
        this.removeTrack(id);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
      Logger.info('AudioContext resumed');
    }
  }

  get contextState(): AudioContextState {
    return this.ctx.state;
  }

  // ─────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────

  dispose(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();

    for (const effect of this.effects.values()) {
      effect.dispose();
    }
    this.effects.clear();

    this.ctx.close();
    Logger.info('AudioEngine disposed');
  }
}