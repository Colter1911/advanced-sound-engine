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
  EffectRoutingPayload
} from '@t/audio';
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

    if (message.type === 'player-ready' && this._syncEnabled) {
      // Send current state to newly joined player
      this.sendStateTo(message.senderId);
    }

    if (message.type === 'sync-request' && this._syncEnabled) {
      // Player is requesting full sync (likely due to detected mismatch)
      console.log('[ASE GM] Received sync request from player:', message.senderId);
      this.sendStateTo(message.senderId);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Player Message Handling
  // ─────────────────────────────────────────────────────────────

  private async handlePlayerMessage(message: SocketMessage): Promise<void> {
    if (message.senderId === game.user?.id) return;
    if (!this.playerEngine) return;

    Logger.debug(`Player received: ${message.type}`, message.payload);

    switch (message.type) {
      case 'sync-start':
        const startPayload = message.payload as SyncStatePayload;
        await this.playerEngine.syncState(startPayload.tracks, startPayload.channelVolumes, startPayload.effects);
        break;

      case 'sync-stop':
        this.playerEngine.clearAll();
        break;

      case 'sync-state':
        const statePayload = message.payload as SyncStatePayload;
        await this.playerEngine.syncState(statePayload.tracks, statePayload.channelVolumes, statePayload.effects);
        break;

      case 'track-play':
        const playPayload = message.payload as TrackPlayPayload;
        await this.playerEngine.handlePlay(playPayload);
        break;

      case 'track-pause':
        const pausePayload = message.payload as TrackPausePayload;
        this.playerEngine.handlePause(pausePayload.trackId);
        break;

      case 'track-stop':
        const stopPayload = message.payload as TrackStopPayload;
        this.playerEngine.handleStop(stopPayload.trackId);
        break;

      case 'track-seek':
        const seekPayload = message.payload as TrackSeekPayload;
        this.playerEngine.handleSeek(
          seekPayload.trackId,
          seekPayload.time,
          seekPayload.isPlaying,
          seekPayload.seekTimestamp
        );
        break;

      case 'track-volume':
        const volPayload = message.payload as TrackVolumePayload;
        this.playerEngine.handleTrackVolume(volPayload.trackId, volPayload.volume);
        break;



      case 'channel-volume':
        const chVolPayload = message.payload as ChannelVolumePayload;
        this.playerEngine.setGMVolume(chVolPayload.channel, chVolPayload.volume);
        break;

      case 'stop-all':
        this.playerEngine.stopAll();
        break;

      case 'effect-param':
        const paramPayload = message.payload as EffectParamPayload;
        (this.playerEngine as any).setEffectParam(paramPayload.effectId, paramPayload.paramId, paramPayload.value);
        break;

      case 'effect-routing':
        const routingPayload = message.payload as EffectRoutingPayload;
        (this.playerEngine as any).setEffectRouting(routingPayload.effectId, routingPayload.channel, routingPayload.active);
        break;

      case 'effect-enabled':
        const enabledPayload = message.payload as any; // EffectEnabledPayload
        (this.playerEngine as any).setEffectEnabled(enabledPayload.effectId, enabledPayload.enabled);
        break;
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
      timestamp: getServerTime()
    };

    if (targetUserId) {
      this.socket.emit(SOCKET_NAME, message, { recipients: [targetUserId] });
    } else {
      this.socket.emit(SOCKET_NAME, message);
    }

    Logger.debug(`Sent: ${type}`, payload);
  }

  private getCurrentSyncState(): SyncStatePayload {
    if (!this.gmEngine) {
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 }, effects: [] };
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
      effects: this.gmEngine.getAllEffects().map(e => this.gmEngine!.getEffectState(e.id)!)
    };
  }

  public broadcastFullState(): void {
    if (!this._syncEnabled) return;
    this.broadcastSyncStart(); // Re-uses sync-start or sync-state logic
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
    this.send('track-seek', payload);
  }

  broadcastTrackVolume(trackId: string, volume: number): void {
    if (!this._syncEnabled) return;

    const payload: TrackVolumePayload = { trackId, volume };
    this.send('track-volume', payload);
  }



  broadcastChannelVolume(channel: TrackGroup | 'master', volume: number): void {
    if (!this._syncEnabled) return;

    const payload: ChannelVolumePayload = { channel, volume };
    this.send('channel-volume', payload);
  }

  broadcastStopAll(): void {
    if (!this._syncEnabled) return;
    this.send('stop-all', {});
  }

  dispose(): void {
    this.socket?.off(SOCKET_NAME);
  }

  // Effects

  broadcastEffectParam(effectId: string, paramId: string, value: any): void {
    if (!this._syncEnabled) return;
    console.log('[ASE GM] Broadcasting effect param:', effectId, paramId, value);
    this.send('effect-param', { effectId, paramId, value } as EffectParamPayload);
  }

  broadcastEffectRouting(effectId: string, channel: TrackGroup, active: boolean): void {
    if (!this._syncEnabled) return;
    console.log('[ASE GM] Broadcasting effect routing:', effectId, channel, active);
    this.send('effect-routing', { effectId, channel, active } as EffectRoutingPayload);
  }

  broadcastEffectEnabled(effectId: string, enabled: boolean): void {
    if (!this._syncEnabled) return;
    console.log('[ASE GM] Broadcasting effect enabled:', effectId, enabled);
    this.send('effect-enabled', { effectId, enabled } as any);
  }
  // ─────────────────────────────────────────────────────────────
  // Player Methods (request sync from GM)
  // ─────────────────────────────────────────────────────────────

  requestFullSync(): void {
    console.log('[ASE PLAYER] Requesting full sync from GM');
    this.send('sync-request', {});
  }
}