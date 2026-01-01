import type { TrackGroup, ChannelVolumes, SyncTrackState, TrackPlayPayload } from '@t/audio';
import { StreamingPlayer } from './StreamingPlayer';
import { Logger } from '@utils/logger';
import { getServerTime } from '@utils/time';

/**
 * Упрощенный движок для игроков — только получает команды
 */
export class PlayerAudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private gmGain: GainNode; // Громкость от GM
  private channelGains: Record<TrackGroup, GainNode>;
  private players: Map<string, StreamingPlayer> = new Map();
  
  private _localVolume: number = 1; // Личная громкость игрока
  private _gmVolumes: ChannelVolumes = {
    master: 1,
    music: 1,
    ambience: 1,
    sfx: 1
  };

  constructor() {
    this.ctx = new AudioContext();
    
    // Chain: tracks -> channels -> gmGain -> masterGain -> destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    this.gmGain = this.ctx.createGain();
    this.gmGain.connect(this.masterGain);
    
    this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    };
    
    this.channelGains.music.connect(this.gmGain);
    this.channelGains.ambience.connect(this.gmGain);
    this.channelGains.sfx.connect(this.gmGain);
    
    Logger.info('PlayerAudioEngine initialized');
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
  // Track Commands (from GM via socket)
  // ─────────────────────────────────────────────────────────────

  async handlePlay(payload: TrackPlayPayload): Promise<void> {
    let player = this.players.get(payload.trackId);
    
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

  async syncState(tracks: SyncTrackState[], volumes: ChannelVolumes): Promise<void> {
    // Set volumes
    this.setAllGMVolumes(volumes);
    
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

  dispose(): void {
    this.clearAll();
    this.ctx.close();
    Logger.info('PlayerAudioEngine disposed');
  }
}