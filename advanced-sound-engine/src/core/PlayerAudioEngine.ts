import type { TrackGroup, ChannelVolumes, SyncTrackState, TrackPlayPayload } from '@t/audio';
import type { EffectState, EffectType, EffectParam } from '@t/effects';
import { StreamingPlayer } from './StreamingPlayer';
import { Logger } from '@utils/logger';
import { getServerTime } from '@utils/time';

// Effects
import { AudioEffect } from './effects/AudioEffect';
import { ReverbEffect } from './effects/ReverbEffect';
import { DelayEffect } from './effects/DelayEffect';
import { FilterEffect } from './effects/FilterEffect';
import { CompressorEffect } from './effects/CompressorEffect';
import { DistortionEffect } from './effects/DistortionEffect';

/**
 * Упрощенный движок для игроков — только получает команды
 */
export class PlayerAudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private gmGain: GainNode; // Громкость от GM
  private channelGains: Record<TrackGroup, GainNode>;
  private players: Map<string, StreamingPlayer> = new Map();

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

  private _localVolume: number = 1; // Личная громкость игрока
  private _gmVolumes: ChannelVolumes = {
    master: 1,
    music: 1,
    ambience: 1,
    sfx: 1
  };

  // Periodic sync verification
  private lastSyncState: SyncTrackState[] = [];
  private syncCheckInterval: number | null = null;
  private socketManager: any; // Reference to SocketManager for requesting sync

  constructor(socketManager?: any) {
    this.ctx = new AudioContext();
    this.socketManager = socketManager;

    // Start periodic sync verification (5 seconds)
    this.startSyncVerification();

    // Chain: tracks -> channels -> [direct/sends] -> gmGain -> masterGain -> destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.gmGain = this.ctx.createGain();
    this.gmGain.connect(this.masterGain);

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

    // Connect Channel -> DirectGain -> GMGain
    this.channelGains.music.connect(this.directGains.music);
    this.directGains.music.connect(this.gmGain);

    this.channelGains.ambience.connect(this.directGains.ambience);
    this.directGains.ambience.connect(this.gmGain);

    this.channelGains.sfx.connect(this.directGains.sfx);
    this.directGains.sfx.connect(this.gmGain);

    this.initializeEffects();

    Logger.info('PlayerAudioEngine initialized');
    console.log("%c ASE PLAYER ENGINE V3 (FIXED) LOADED ", "background: #222; color: #bada55; font-size: 20px; font-weight: bold;");
  }

  private startSyncVerification(): void {
    this.syncCheckInterval = window.setInterval(() => {
      this.verifySyncState();
    }, 5000); // Check every 5 seconds
  }

  private verifySyncState(): void {
    // Only check if we have received sync state before
    if (this.lastSyncState.length === 0) return;

    let needsResync = false;

    for (const expectedTrack of this.lastSyncState) {
      const player = this.players.get(expectedTrack.id);

      // Track should exist but doesn't
      if (!player && expectedTrack.isPlaying) {
        console.warn('[ASE PLAYER] Sync verification: Track missing', expectedTrack.id);
        needsResync = true;
        break;
      }

      if (player) {
        const actuallyPlaying = player.state === 'playing';

        // Should be playing but isn't
        if (expectedTrack.isPlaying && !actuallyPlaying) {
          console.warn('[ASE PLAYER] Sync verification: Track should be playing but is', player.state, expectedTrack.id);
          needsResync = true;
          break;
        }

        // Shouldn't be playing but is
        if (!expectedTrack.isPlaying && actuallyPlaying) {
          console.warn('[ASE PLAYER] Sync verification: Track should be stopped but is playing', expectedTrack.id);
          needsResync = true;
          break;
        }
      }
    }

    if (needsResync) {
      console.log('[ASE PLAYER] Sync verification failed - requesting full sync from GM');
      // Trigger a full state request from GM
      if (this.socketManager) {
        this.socketManager.requestFullSync();
      } else {
        console.warn('[ASE PLAYER] Cannot request sync: socketManager not set');
      }
    } else {
      console.log('[ASE PLAYER] Sync verification OK');
    }
  }

  dispose(): void {
    // Clear interval on cleanup
    if (this.syncCheckInterval !== null) {
      window.clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }

    // Dispose all players
    this.clearAll();

    // Dispose effects
    for (const effect of this.effects.values()) {
      effect.dispose();
    }
    this.effects.clear();

    // Close audio context
    this.ctx.close();
    Logger.info('PlayerAudioEngine disposed');
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
      this.effects.set(effect.id, effect);

      // Connect Effect Output to GM Gain (so it's controlled by GM master volume)
      effect.outputNode.connect(this.gmGain);

      // Create Send Gains for each channel
      (['music', 'ambience', 'sfx'] as TrackGroup[]).forEach(group => {
        const sendGain = this.ctx.createGain();
        sendGain.gain.value = 0; // Default off

        // Connect Channel -> SendGain -> Effect Input
        this.channelGains[group].connect(sendGain);
        sendGain.connect(effect.inputNode);

        this.sends[group].set(effect.id, sendGain);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Local Volume (Player's personal control)
  // ─────────────────────────────────────────────────────────────

  get localVolume(): number {
    return this._localVolume;
  }

  setLocalVolume(value: number): void {
    this._localVolume = Math.max(0, Math.min(1, value));
    this.masterGain.gain.linearRampToValueAtTime(
      this._localVolume,
      this.ctx.currentTime + 0.01
    );
  }

  // ─────────────────────────────────────────────────────────────
  // GM Volume (from sync)
  // ─────────────────────────────────────────────────────────────

  setGMVolume(channel: TrackGroup | 'master', value: number): void {
    const safeValue = Math.max(0, Math.min(1, value));

    if (channel === 'master') {
      this._gmVolumes.master = safeValue;
      this.gmGain.gain.linearRampToValueAtTime(safeValue, this.ctx.currentTime + 0.01);
    } else {
      this._gmVolumes[channel] = safeValue;
      this.channelGains[channel].gain.linearRampToValueAtTime(safeValue, this.ctx.currentTime + 0.01);
    }
  }

  setAllGMVolumes(volumes: ChannelVolumes): void {
    this._gmVolumes = { ...volumes };

    this.gmGain.gain.setValueAtTime(volumes.master, this.ctx.currentTime);
    this.channelGains.music.gain.setValueAtTime(volumes.music, this.ctx.currentTime);
    this.channelGains.ambience.gain.setValueAtTime(volumes.ambience, this.ctx.currentTime);
    this.channelGains.sfx.gain.setValueAtTime(volumes.sfx, this.ctx.currentTime);
  }

  // ─────────────────────────────────────────────────────────────
  // Effects Management (Called via Socket)
  // ─────────────────────────────────────────────────────────────

  setEffectParam(effectId: string, paramId: string, value: any): void {
    console.log('[ASE PLAYER] setEffectParam received:', effectId, paramId, value);
    const effect = this.effects.get(effectId);
    if (!effect) {
      console.warn('[ASE PLAYER] Effect not found:', effectId);
      return;
    }
    effect.setParam(paramId, value);
    console.log('[ASE PLAYER] Effect param set successfully');
  }

  setEffectEnabled(effectId: string, enabled: boolean): void {
    console.log('[ASE PLAYER] setEffectEnabled received:', effectId, enabled);
    const effect = this.effects.get(effectId);
    if (!effect) {
      console.warn('[ASE PLAYER] Effect not found:', effectId);
      return;
    }

    effect.setEnabled(enabled);
    console.log('[ASE PLAYER] Effect enabled set to:', enabled);

    // Update dry levels
    (['music', 'ambience', 'sfx'] as TrackGroup[]).forEach(group => {
      this.updateDryLevel(group);
    });
  }

  setEffectRouting(effectId: string, channel: TrackGroup, active: boolean): void {
    console.log('[ASE PLAYER] setEffectRouting received:', effectId, channel, active);
    const channelSends = this.sends[channel];
    const sendNode = channelSends.get(effectId);

    if (sendNode) {
      sendNode.gain.setTargetAtTime(active ? 1 : 0, this.ctx.currentTime, 0.05);
      this.updateDryLevel(channel);
      console.log('[ASE PLAYER] Effect routing set successfully');
    } else {
      console.warn('[ASE PLAYER] Send node not found for:', effectId, channel);
    }
  }

  private updateDryLevel(channel: TrackGroup): void {
    let isInsertActive = false;
    const insertTypes: EffectType[] = ['filter', 'distortion', 'compressor'];

    for (const effect of this.effects.values()) {
      if (!effect.enabled) continue;

      const sendNode = this.sends[channel].get(effect.id);
      const isRouted = (sendNode?.gain.value || 0) > 0.5;

      if (isRouted && insertTypes.includes(effect.type)) {
        isInsertActive = true;
        break;
      }
    }

    const targetGain = isInsertActive ? 0 : 1;
    this.directGains[channel].gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  // ─────────────────────────────────────────────────────────────
  // Local Playback Control (Interface Compliance)
  // ─────────────────────────────────────────────────────────────

  async playTrack(id: string, offset: number = 0): Promise<void> {
    const player = this.players.get(id);
    if (player) {
      await player.play(offset);
    } else {
      Logger.warn(`PlayerAudioEngine: Track ${id} not found locally.`);
    }
  }

  pauseTrack(id: string): void {
    this.players.get(id)?.pause();
  }

  stopTrack(id: string): void {
    this.players.get(id)?.stop();
  }

  // ─────────────────────────────────────────────────────────────
  // Track Commands (from GM via socket)
  // ─────────────────────────────────────────────────────────────

  async handlePlay(payload: TrackPlayPayload): Promise<void> {
    let player = this.players.get(payload.trackId);

    // If player exists with different URL, dispose it first
    if (player && player.url !== payload.url) {
      Logger.debug(`Player: Disposing existing track ${payload.trackId} (URL changed)`);
      player.stop();
      player.dispose();
      this.players.delete(payload.trackId);
      player = undefined;
    }

    // Create if doesn't exist
    if (!player) {
      player = new StreamingPlayer(
        payload.trackId,
        this.ctx,
        this.channelGains[payload.group],
        payload.group
      );

      await player.load(payload.url);
      this.players.set(payload.trackId, player);
    }

    player.setVolume(payload.volume);
    player.setLoop(payload.loop);

    // Calculate offset based on time elapsed since GM started
    const elapsed = (getServerTime() - payload.startTimestamp) / 1000;
    const adjustedOffset = Math.max(0, payload.offset + elapsed);

    Logger.debug(`Player: Handling Play. TrackId=${payload.trackId}, Vol=${payload.volume}, Offset=${adjustedOffset}s`);

    await player.play(adjustedOffset);
    Logger.debug(`Player: track ${payload.trackId} playing at ${adjustedOffset.toFixed(2)}s`);
  }

  handlePause(trackId: string): void {
    this.players.get(trackId)?.pause();
  }

  handleStop(trackId: string): void {
    this.players.get(trackId)?.stop();
  }

  handleSeek(trackId: string, time: number, isPlaying: boolean, seekTimestamp: number): void {
    const player = this.players.get(trackId);
    if (!player) return;

    if (isPlaying) {
      const elapsed = (getServerTime() - seekTimestamp) / 1000;
      player.seek(time + elapsed);
    } else {
      player.seek(time);
    }
  }

  handleTrackVolume(trackId: string, volume: number): void {
    this.players.get(trackId)?.setVolume(volume);
  }

  handleTrackLoop(trackId: string, loop: boolean): void {
    this.players.get(trackId)?.setLoop(loop);
  }

  // ─────────────────────────────────────────────────────────────
  // Sync State (full state from GM)
  // ─────────────────────────────────────────────────────────────

  async syncState(tracks: SyncTrackState[], volumes: ChannelVolumes, effectsState: EffectState[] = []): Promise<void> {
    Logger.debug(`Player: Sync State Received. Tracks=${tracks.length}, Effects=${effectsState?.length || 0}`);
    Logger.debug('Player: Volumes', volumes);

    // Store last sync state for periodic verification
    this.lastSyncState = tracks;

    // Set volumes
    this.setAllGMVolumes(volumes);

    // Check GM Gain after setting
    Logger.debug(`Player: GM Gain set to ${this.gmGain.gain.value}`);

    // Sync Effect States
    if (effectsState && effectsState.length > 0) {
      for (const effectState of effectsState) {
        const effect = this.effects.get(effectState.id);
        if (!effect) {
          console.warn('[ASE PLAYER] Effect not found during sync:', effectState.id);
          continue;
        }

        // Apply enabled state
        this.setEffectEnabled(effectState.id, effectState.enabled);

        // Apply routing
        (['music', 'ambience', 'sfx'] as TrackGroup[]).forEach(group => {
          const active = effectState.routing[group] || false;
          this.setEffectRouting(effectState.id, group, active);
        });

        // Apply params
        Object.entries(effectState.params).forEach(([paramId, value]) => {
          this.setEffectParam(effectState.id, paramId, value);
        });

        Logger.debug(`Player: synced ${effect.type} state from GM`);
      }
    }

    // Handle tracks
    const newTrackIds = new Set(tracks.map(t => t.id));

    // Remove tracks not in sync
    for (const [id, player] of this.players) {
      if (!newTrackIds.has(id)) {
        player.dispose();
        this.players.delete(id);
      }
    }

    // Add/update tracks
    for (const trackState of tracks) {
      let player = this.players.get(trackState.id);

      if (!player) {
        player = new StreamingPlayer(
          trackState.id,
          this.ctx,
          this.channelGains[trackState.group],
          trackState.group
        );

        await player.load(trackState.url);
        this.players.set(trackState.id, player);
      }

      player.setVolume(trackState.volume);
      player.setLoop(trackState.loop);

      if (trackState.isPlaying) {
        const elapsed = (getServerTime() - trackState.startTimestamp) / 1000;
        const adjustedTime = trackState.currentTime + elapsed;
        await player.play(adjustedTime);
      } else {
        player.stop();
      }
    }

    Logger.info('Player: synced state from GM');
  }

  // ─────────────────────────────────────────────────────────────
  // Sync Off
  // ─────────────────────────────────────────────────────────────

  stopAll(): void {
    for (const player of this.players.values()) {
      player.stop();
    }
  }

  clearAll(): void {
    for (const player of this.players.values()) {
      player.dispose();
    }
    this.players.clear();
    Logger.info('Player: all tracks cleared');
  }

  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
      Logger.info('PlayerAudioEngine: AudioContext resumed');
    }
  }
}