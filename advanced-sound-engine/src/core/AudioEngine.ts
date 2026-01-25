import type { TrackConfig, TrackState, MixerState, TrackGroup, ChannelVolumes } from '@t/audio';
import { StreamingPlayer } from './StreamingPlayer';
import { Logger } from '@utils/logger';
import { getServerTime } from '@utils/time';
import { generateUUID } from '@utils/uuid';
import { validateAudioFile } from '@utils/audio-validation';

const MODULE_ID = 'advanced-sound-engine';

function getMaxSimultaneous(): number {
  return ((game.settings as any).get(MODULE_ID, 'maxSimultaneousTracks') as number) || 8;
}

export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private channelGains: Record<TrackGroup, GainNode>;
  private players: Map<string, StreamingPlayer> = new Map();

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

    this.channelGains.music.connect(this.masterGain);
    this.channelGains.ambience.connect(this.masterGain);
    this.channelGains.sfx.connect(this.masterGain);

    Logger.info('AudioEngine initialized');
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
    this.ctx.close();
    Logger.info('AudioEngine disposed');
  }
}