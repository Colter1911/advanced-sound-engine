import type {
  SocketMessage,
  SocketMessageType,
  SyncStatePayload,
  SyncTrackState,
  TrackPlayPayload,
  TrackPausePayload,
  TrackStopPayload,
  TrackSeekPayload,
  TrackVolumePayload,
  ChannelVolumePayload,
  TrackGroup,
  ChannelVolumes,
  EffectParamPayload,
  EffectEnabledPayload,
  ChainReorderPayload,
  ChainEffectMixPayload,
} from '@t/audio';
import type { EffectType } from '@t/effects';
import { AudioEngine } from '@core/AudioEngine';
import { PlayerAudioEngine } from '@core/PlayerAudioEngine';
import { Logger } from '@utils/logger';
import { getServerTime } from '@utils/time';

const MODULE_ID = 'advanced-sound-engine';
const SOCKET_NAME = `module.${MODULE_ID}`;

export class SocketManager {
  private gmEngine: AudioEngine | null = null;
  private playerEngine: PlayerAudioEngine | null = null;
  private socket: any = null;
  private _syncEnabled: boolean = false;
  private isGM: boolean = false;

  // Protocol version — bump when message format changes
  static readonly PROTOCOL_VERSION = 1;

  // Rate limiting for high-frequency broadcasts
  private static THROTTLE_MS = 150;
  private throttleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private throttlePending: Map<string, () => void> = new Map();

  constructor() { }

  initializeAsGM(engine: AudioEngine): void {
    this.isGM = true;
    this.gmEngine = engine;
    this.socket = game.socket;

    this.socket?.on(SOCKET_NAME, (message: SocketMessage) => {
      this.handleGMMessage(message);
    });

    Logger.info('SocketManager initialized as GM');
  }

  initializeAsPlayer(engine: PlayerAudioEngine): void {
    this.isGM = false;
    this.playerEngine = engine;
    this.socket = game.socket;

    this.socket?.on(SOCKET_NAME, (message: SocketMessage) => {
      this.handlePlayerMessage(message);
    });

    // Request current state on join
    setTimeout(() => {
      this.send('player-ready', {});
    }, 1000);

    Logger.info('SocketManager initialized as Player');
  }

  // ─────────────────────────────────────────────────────────────
  // Sync Mode (GM)
  // ─────────────────────────────────────────────────────────────

  get syncEnabled(): boolean {
    return this._syncEnabled;
  }

  setSyncEnabled(enabled: boolean): void {
    if (!this.isGM) return;

    this._syncEnabled = enabled;

    if (enabled) {
      this.broadcastSyncStart();
    } else {
      this.broadcastSyncStop();
    }

    Logger.info(`Sync mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  // ─────────────────────────────────────────────────────────────
  // GM Message Handling
  // ─────────────────────────────────────────────────────────────

  private handleGMMessage(message: SocketMessage): void {
    if (message.senderId === game.user?.id) return;

    if (message.version && message.version !== SocketManager.PROTOCOL_VERSION) {
      Logger.warn(`Protocol mismatch: received v${message.version}, expected v${SocketManager.PROTOCOL_VERSION}. Player may need to refresh.`);
    }

    if (message.type === 'player-ready' && this._syncEnabled) {
      this.sendStateTo(message.senderId);
    }

    if (message.type === 'sync-request' && this._syncEnabled) {
      // Player is requesting full sync (likely due to detected mismatch)
      Logger.debug('Received sync request from player:', message.senderId);
      this.sendStateTo(message.senderId);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Player Message Handling
  // ─────────────────────────────────────────────────────────────

  private async handlePlayerMessage(message: SocketMessage): Promise<void> {
    if (message.senderId === game.user?.id) return;
    if (!this.playerEngine) return;

    if (message.version && message.version !== SocketManager.PROTOCOL_VERSION) {
      Logger.warn(`Protocol mismatch: received v${message.version}, expected v${SocketManager.PROTOCOL_VERSION}. Try refreshing the page.`);
    }

    Logger.debug(`Player received: ${message.type}`, message.payload);

    switch (message.type) {
      case 'sync-start': {
        const payload = message.payload as SyncStatePayload;
        await this.playerEngine.syncState(payload.tracks, payload.channelVolumes, payload.chains);
        break;
      }

      case 'sync-stop':
        this.playerEngine.clearAll();
        break;

      case 'sync-state': {
        const payload = message.payload as SyncStatePayload;
        await this.playerEngine.syncState(payload.tracks, payload.channelVolumes, payload.chains);
        break;
      }

      case 'track-play': {
        const payload = message.payload as TrackPlayPayload;
        await this.playerEngine.handlePlay(payload);
        break;
      }

      case 'track-pause': {
        const payload = message.payload as TrackPausePayload;
        this.playerEngine.handlePause(payload.trackId);
        break;
      }

      case 'track-stop': {
        const payload = message.payload as TrackStopPayload;
        this.playerEngine.handleStop(payload.trackId);
        break;
      }

      case 'track-seek': {
        const payload = message.payload as TrackSeekPayload;
        this.playerEngine.handleSeek(
          payload.trackId,
          payload.time,
          payload.isPlaying,
          payload.seekTimestamp
        );
        break;
      }

      case 'track-volume': {
        const payload = message.payload as TrackVolumePayload;
        this.playerEngine.handleTrackVolume(payload.trackId, payload.volume);
        break;
      }

      case 'channel-volume': {
        const payload = message.payload as ChannelVolumePayload;
        this.playerEngine.setGMVolume(payload.channel, payload.volume);
        break;
      }

      case 'stop-all':
        this.playerEngine.stopAll();
        break;

      // ─── Chain Effect Messages ──────────────────────────────
      case 'effect-param': {
        const payload = message.payload as EffectParamPayload;
        this.playerEngine.setChainEffectParam(payload.channel, payload.effectType, payload.paramId, payload.value);
        break;
      }

      case 'effect-enabled': {
        const payload = message.payload as EffectEnabledPayload;
        this.playerEngine.setChainEffectEnabled(payload.channel, payload.effectType, payload.enabled);
        break;
      }

      case 'chain-reorder': {
        const payload = message.payload as ChainReorderPayload;
        this.playerEngine.reorderChainByTypes(payload.channel, payload.order);
        break;
      }

      case 'chain-effect-mix': {
        const payload = message.payload as ChainEffectMixPayload;
        this.playerEngine.setChainEffectMix(payload.channel, payload.effectType, payload.mix);
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GM Broadcast Methods
  // ─────────────────────────────────────────────────────────────

  private send(type: SocketMessageType, payload: unknown, targetUserId?: string): void {
    if (!this.socket) return;

    const message: SocketMessage = {
      type,
      payload,
      senderId: game.user?.id ?? '',
      timestamp: getServerTime(),
      version: SocketManager.PROTOCOL_VERSION
    };

    if (targetUserId) {
      this.socket.emit(SOCKET_NAME, message, { recipients: [targetUserId] });
    } else {
      this.socket.emit(SOCKET_NAME, message);
    }

    Logger.debug(`Sent: ${type}`, payload);
  }

  /**
   * Throttle a send by key — ensures high-frequency broadcasts (seek, volume, effect params)
   * don't flood the socket. The last value always gets sent.
   */
  private throttledSend(key: string, type: SocketMessageType, payload: unknown): void {
    // Store the latest payload to send
    this.throttlePending.set(key, () => this.send(type, payload));

    // If already waiting, skip (the pending fn will fire with latest value)
    if (this.throttleTimers.has(key)) return;

    // Send immediately on first call
    this.send(type, payload);
    this.throttlePending.delete(key);

    // Set cooldown timer
    this.throttleTimers.set(key, setTimeout(() => {
      this.throttleTimers.delete(key);
      // If there's a pending update, send it now
      const pending = this.throttlePending.get(key);
      if (pending) {
        this.throttlePending.delete(key);
        pending();
      }
    }, SocketManager.THROTTLE_MS));
  }

  private getCurrentSyncState(): SyncStatePayload {
    if (!this.gmEngine) {
      return {
        tracks: [],
        channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 },
        chains: []
      };
    }

    const now = getServerTime();
    const tracks: SyncTrackState[] = [];

    for (const player of this.gmEngine.getAllTracks()) {
      const state = player.getState();
      tracks.push({
        id: state.id,
        url: state.url,
        group: state.group,
        volume: state.volume,
        isPlaying: state.playbackState === 'playing',
        currentTime: player.getCurrentTime(),
        startTimestamp: now
      });
    }

    return {
      tracks,
      channelVolumes: this.gmEngine.volumes,
      chains: this.gmEngine.getAllChainsState()
    };
  }

  public broadcastFullState(): void {
    if (!this._syncEnabled) return;
    this.broadcastSyncStart();
  }

  private broadcastSyncStart(): void {
    const state = this.getCurrentSyncState();
    this.send('sync-start', state);
  }

  private broadcastSyncStop(): void {
    this.send('sync-stop', {});
  }

  private sendStateTo(userId: string): void {
    const state = this.getCurrentSyncState();
    this.send('sync-state', state, userId);
  }

  // ─────────────────────────────────────────────────────────────
  // GM Actions (called when GM interacts with mixer)
  // ─────────────────────────────────────────────────────────────

  broadcastTrackPlay(trackId: string, offset: number): void {
    if (!this._syncEnabled || !this.gmEngine) return;

    const player = this.gmEngine.getTrack(trackId);
    if (!player) return;

    const payload: TrackPlayPayload = {
      trackId,
      url: player.url,
      group: player.group,
      volume: player.volume,
      offset,
      startTimestamp: getServerTime()
    };

    this.send('track-play', payload);
  }

  broadcastTrackPause(trackId: string, pausedAt: number): void {
    if (!this._syncEnabled) return;

    const payload: TrackPausePayload = { trackId, pausedAt };
    this.send('track-pause', payload);
  }

  broadcastTrackStop(trackId: string): void {
    if (!this._syncEnabled) return;

    const payload: TrackStopPayload = { trackId };
    this.send('track-stop', payload);
  }

  broadcastTrackSeek(trackId: string, time: number, isPlaying: boolean): void {
    if (!this._syncEnabled) return;

    const payload: TrackSeekPayload = {
      trackId,
      time,
      isPlaying,
      seekTimestamp: getServerTime()
    };
    this.throttledSend(`seek:${trackId}`, 'track-seek', payload);
  }

  broadcastTrackVolume(trackId: string, volume: number): void {
    if (!this._syncEnabled) return;

    const payload: TrackVolumePayload = { trackId, volume };
    this.throttledSend(`vol:${trackId}`, 'track-volume', payload);
  }

  broadcastChannelVolume(channel: TrackGroup | 'master', volume: number): void {
    if (!this._syncEnabled) return;

    const payload: ChannelVolumePayload = { channel, volume };
    this.throttledSend(`chvol:${channel}`, 'channel-volume', payload);
  }

  broadcastStopAll(): void {
    // No syncEnabled guard — stop-all MUST always reach players,
    // even if sync was just toggled off. This prevents phantom sound.
    this.send('stop-all', {});
  }

  dispose(): void {
    // Clear all throttle timers
    for (const timer of this.throttleTimers.values()) {
      clearTimeout(timer);
    }
    this.throttleTimers.clear();
    this.throttlePending.clear();

    this.socket?.off(SOCKET_NAME);
  }

  // ─────────────────────────────────────────────────────────────
  // Chain Effect Broadcasts (GM → Players)
  // ─────────────────────────────────────────────────────────────

  broadcastEffectParam(channel: TrackGroup, effectType: EffectType, paramId: string, value: any): void {
    if (!this._syncEnabled) return;
    this.throttledSend(`fx:${effectId}:${paramId}`, 'effect-param', { effectId, paramId, value } as EffectParamPayload);
  }

  broadcastEffectEnabled(channel: TrackGroup, effectType: EffectType, enabled: boolean): void {
    if (!this._syncEnabled) return;
    this.send('effect-routing', { effectId, channel, active } as EffectRoutingPayload);
  }

  broadcastChainReorder(channel: TrackGroup, order: EffectType[]): void {
    if (!this._syncEnabled) return;
    this.send('effect-enabled', { effectId, enabled } as any);
  }

  broadcastChainEffectMix(channel: TrackGroup, effectType: EffectType, mix: number): void {
    if (!this._syncEnabled) return;
    const payload: ChainEffectMixPayload = { channel, effectType, mix };
    this.send('chain-effect-mix', payload);
  }

  // ─────────────────────────────────────────────────────────────
  // Player Methods (request sync from GM)
  // ─────────────────────────────────────────────────────────────

  requestFullSync(): void {
    Logger.debug('Requesting full sync from GM');
    this.send('sync-request', {});
  }
}
