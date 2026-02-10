import type { TrackGroup, ChannelVolumes, SyncTrackState, TrackPlayPayload } from '@t/audio';
import type { EffectType, ChannelChain, EffectState } from '@t/effects';
import { DEFAULT_CHAIN_ORDER, DEFAULT_MIX } from '@t/effects';
import { StreamingPlayer } from './StreamingPlayer';
import { EffectChain } from './effects/EffectChain';
import { Logger } from '@utils/logger';
import { getServerTime } from '@utils/time';

/**
 * Упрощенный движок для игроков — только получает команды от GM
 */
export class PlayerAudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private gmGain: GainNode;
  private channelGains: Record<TrackGroup, GainNode>;
  private players: Map<string, StreamingPlayer> = new Map();

  // ─── Effects Chain System ───────────────────────────────────
  private chains: Record<TrackGroup, EffectChain>;

  private _localVolume: number = 1;
  private _gmVolumes: ChannelVolumes = {
    master: 1,
    music: 1,
    ambience: 1,
    sfx: 1
  };

  // Periodic sync verification
  private lastSyncState: SyncTrackState[] = [];
  private syncCheckInterval: number | null = null;
  private socketManager: any;
  private lastSyncRequestTime: number = 0;
  private readonly SYNC_REQUEST_COOLDOWN = 10000; // 10 seconds
  private syncRequestFailCount: number = 0;
  private readonly MAX_SYNC_RETRIES = 3;

  constructor(socketManager?: any) {
    this.ctx = new AudioContext();
    this.socketManager = socketManager;

    this.startSyncVerification();

    // Chain: tracks -> channels -> [chain effects] -> gmGain -> masterGain -> destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.gmGain = this.ctx.createGain();
    this.gmGain.connect(this.masterGain);

    this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    };

    // ─── Initialize Chains ────────────────────────────────────
    // Signal flow per channel:
    //   channelGain → chain.inputNode → [effects...] → chain.outputNode → gmGain

    this.chains = {
      music: new EffectChain(this.ctx, 'music'),
      ambience: new EffectChain(this.ctx, 'ambience'),
      sfx: new EffectChain(this.ctx, 'sfx')
    };

    for (const group of ['music', 'ambience', 'sfx'] as TrackGroup[]) {
      this.channelGains[group].connect(this.chains[group].inputNode);
      this.chains[group].outputNode.connect(this.gmGain);
      this.chains[group].buildDefault();
    }

    Logger.info('PlayerAudioEngine initialized (chain architecture)');
  }

  private startSyncVerification(): void {
    this.syncCheckInterval = window.setInterval(() => {
      this.verifySyncState();
    }, 5000);
  }

  private verifySyncState(): void {
    let needsResync = false;

    // If sync state is empty, check if we have active (non-stopped) players
    if (this.lastSyncState.length === 0) {
      const hasActivePlayers = Array.from(this.players.values()).some(
        p => p.state === 'playing' || p.state === 'paused'
      );
      if (hasActivePlayers) {
        Logger.warn('Sync verification: Active players exist but sync state is empty');
        needsResync = true;
      } else {
        // All players stopped + empty sync state = consistent, no resync needed
        return;
      }
    }

    if (!needsResync) {
      // Check each expected track
      for (const expectedTrack of this.lastSyncState) {
        const player = this.players.get(expectedTrack.id);

        if (!player) {
          if (expectedTrack.isPlaying) {
            Logger.warn(`Sync verification: Expected playing track not found: ${expectedTrack.id}`);
            needsResync = true;
            break;
          }
          continue;
        }

        const actuallyPlaying = player.state === 'playing';

        if (expectedTrack.isPlaying && !actuallyPlaying) {
          Logger.warn(`Sync verification: Track should be playing but is ${player.state}: ${expectedTrack.id}`);
          needsResync = true;
          break;
        }

        if (!expectedTrack.isPlaying && actuallyPlaying) {
          Logger.warn(`Sync verification: Track should be stopped but is playing: ${expectedTrack.id}`);
          needsResync = true;
          break;
        }
      }
    }

    // Check for unexpected tracks not in sync state
    if (!needsResync && this.lastSyncState.length > 0) {
      const expectedIds = new Set(this.lastSyncState.map(t => t.id));
      for (const [id, player] of this.players) {
        if (!expectedIds.has(id) && player.state === 'playing') {
          Logger.warn(`Sync verification: Unexpected playing track: ${id}`);
          needsResync = true;
          break;
        }
      }
    }

    if (needsResync) {
      // Cooldown check
      const now = Date.now();
      if (now - this.lastSyncRequestTime < this.SYNC_REQUEST_COOLDOWN) {
        return;
      }

      // Retry limit — stop requesting after MAX_SYNC_RETRIES consecutive failures
      this.syncRequestFailCount++;
      if (this.syncRequestFailCount > this.MAX_SYNC_RETRIES) {
        Logger.warn(`Sync verification: Exceeded ${this.MAX_SYNC_RETRIES} retries, stopping requests`);
        return;
      }

      Logger.info(`Sync verification failed — requesting full sync (attempt ${this.syncRequestFailCount}/${this.MAX_SYNC_RETRIES})`);
      this.lastSyncRequestTime = now;

      if (this.socketManager) {
        this.socketManager.requestFullSync();
      } else {
        Logger.warn('Cannot request sync: socketManager not set');
      }
    } else {
      // Reset fail counter on successful verification
      this.syncRequestFailCount = 0;
    }
  }

  dispose(): void {
    if (this.syncCheckInterval !== null) {
      window.clearInterval(this.syncCheckInterval);
      this.syncCheckInterval = null;
    }

    this.clearAll();

    for (const chain of Object.values(this.chains)) {
      chain.dispose();
    }

    this.ctx.close();
    Logger.info('PlayerAudioEngine disposed');
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
  // Effects Chain Management (Called via Socket)
  // ─────────────────────────────────────────────────────────────

  setChainEffectParam(channel: TrackGroup, effectType: EffectType, paramId: string, value: any): void {
    this.chains[channel].setEffectParam(effectType, paramId, value);
  }

  setChainEffectEnabled(channel: TrackGroup, effectType: EffectType, enabled: boolean): void {
    this.chains[channel].setEffectEnabled(effectType, enabled);
  }

  setChainEffectMix(channel: TrackGroup, effectType: EffectType, mix: number): void {
    this.chains[channel].setEffectMix(effectType, mix);
  }

  reorderChainByTypes(channel: TrackGroup, order: EffectType[]): void {
    this.chains[channel].reorderByTypes(order);
  }

  /** Restore all chains from sync state */
  syncChains(chainsState: ChannelChain[]): void {
    for (const chainState of chainsState) {
      const chain = this.chains[chainState.channel];
      if (chain) {
        chain.restoreState(chainState);
      }
    }
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

    if (player && player.url !== payload.url) {
      player.stop();
      player.dispose();
      this.players.delete(payload.trackId);
      player = undefined;
    }

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

    const elapsed = (getServerTime() - payload.startTimestamp) / 1000;
    const adjustedOffset = Math.max(0, payload.offset + elapsed);

    await player.play(adjustedOffset);
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

  // ─────────────────────────────────────────────────────────────
  // Sync State (full state from GM)
  // ─────────────────────────────────────────────────────────────

  async syncState(tracks: SyncTrackState[], volumes: ChannelVolumes, effectsState: EffectState[] = []): Promise<void> {
    Logger.debug(`Player: Sync State Received. Tracks=${tracks.length}, Effects=${effectsState?.length || 0}`);

    // Store last sync state and reset retry counter (GM responded)
    this.lastSyncState = tracks;
    this.syncRequestFailCount = 0;

    this.setAllGMVolumes(volumes);

    // Sync chains
    if (chainsState && chainsState.length > 0) {
      this.syncChains(chainsState);
    }

    // Handle tracks
    const newTrackIds = new Set(tracks.map(t => t.id));

    for (const [id, player] of this.players) {
      if (!newTrackIds.has(id)) {
        player.dispose();
        this.players.delete(id);
      }
    }

    for (const trackState of tracks) {
      let player = this.players.get(trackState.id);

      if (player && !trackState.isPlaying && player.state === 'playing') {
        Logger.debug('Player: Stopping track that should not be playing:', trackState.id);
        player.stop();
        continue;
      }

      if (!player) {
        if (trackState.isPlaying) {
          await this.handlePlay({
            trackId: trackState.id,
            url: trackState.url,
            group: trackState.group,
            volume: trackState.volume,
            offset: trackState.currentTime,
            startTimestamp: trackState.startTimestamp
          });
        }
        continue;
      }

      player.setVolume(trackState.volume);

      if (trackState.isPlaying) {
        const elapsed = (getServerTime() - trackState.startTimestamp) / 1000;
        const adjustedTime = trackState.currentTime + elapsed;

        // Skip re-play if track is already playing at approximately the right position.
        // This avoids audible glitches from restarting audio that's already correct.
        if (player.state === 'playing') {
          const drift = Math.abs(player.getCurrentTime() - adjustedTime);
          if (drift < 2.0) {
            Logger.debug(`Player: Track ${trackState.id} already playing, drift=${drift.toFixed(2)}s — skipping re-play`);
            continue;
          }
          Logger.debug(`Player: Track ${trackState.id} drift=${drift.toFixed(2)}s — re-syncing`);
        }

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

  // Stop all tracks — full cleanup to prevent phantom sound and sync loops
  stopAll(): void {
    Logger.info('Player: Stopping all tracks');
    for (const player of this.players.values()) {
      player.stop();
      player.dispose();
    }
    this.players.clear();
    this.lastSyncState = [];
    this.syncRequestFailCount = 0;
    Logger.info('Player: All tracks stopped and cleared');
  }

  // Clear all tracks (stop + dispose) — used on sync-stop
  clearAll(): void {
    for (const player of this.players.values()) {
      player.stop();
      player.dispose();
    }
    this.players.clear();
    this.lastSyncState = [];
    this.syncRequestFailCount = 0;
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
