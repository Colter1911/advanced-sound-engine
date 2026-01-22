import type { TrackGroup } from '@t/audio';
import { AudioEngine } from '@core/AudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { StreamingPlayer } from '@core/StreamingPlayer';
import { Logger } from '@utils/logger';
import { formatTime } from '@utils/time';
import { throttle } from '@utils/throttle';
import { generateUUID } from '@utils/uuid';

const MODULE_ID = 'advanced-sound-engine';

function getMaxSimultaneous(): number {
  return (game.settings.get(MODULE_ID, 'maxSimultaneousTracks') as number) || 8;
}

interface MixerData {
  tracks: TrackViewData[];
  volumes: {
    master: number;
    music: number;
    ambience: number;
    sfx: number;
  };
  playingCount: number;
  maxSimultaneous: number;
  syncEnabled: boolean; // Reverted the CSS variable insertion here to maintain valid TypeScript syntax
}

interface TrackViewData {
  id: string;
  name: string;
  group: TrackGroup;
  isPlaying: boolean;
  isPaused: boolean;
  isStopped: boolean;
  isLoading: boolean;
  volume: number;
  volumePercent: number;
  loop: boolean;
  currentTime: number;
  currentTimeFormatted: string;
  duration: number;
  durationFormatted: string;
  progress: number;
}

export class SoundMixerApp extends Application {
  private engine: AudioEngine;
  private socket: SocketManager;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'ase-sound-mixer',
      title: 'Sound Mixer (GM)',
      template: `modules/${MODULE_ID}/templates/mixer.hbs`,
      classes: ['ase-mixer'],
      width: 550,
      height: 'auto',
      resizable: true,
      minimizable: true,
      popOut: true
    }) as ApplicationOptions;
  }

  constructor(engine: AudioEngine, socket: SocketManager, options?: Partial<ApplicationOptions>) {
    super(options);
    this.engine = engine;
    this.socket = socket;
  }

  override getData(): MixerData {
    const tracks = this.engine.getAllTracks().map(player => this.getTrackViewData(player));
    const volumes = this.engine.volumes;
    const playingCount = tracks.filter(t => t.isPlaying).length;

    return {
      tracks,
      volumes: {
        master: Math.round(volumes.master * 100),
        music: Math.round(volumes.music * 100),
        ambience: Math.round(volumes.ambience * 100),
        sfx: Math.round(volumes.sfx * 100)
      },
      playingCount,
      maxSimultaneous: getMaxSimultaneous(),
      syncEnabled: this.socket.syncEnabled
    };
  }

  private getTrackViewData(player: StreamingPlayer): TrackViewData {
    const state = player.getState();
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();

    return {
      id: state.id,
      name: this.extractFileName(state.url),
      group: state.group,
      isPlaying: state.playbackState === 'playing',
      isPaused: state.playbackState === 'paused',
      isStopped: state.playbackState === 'stopped',
      isLoading: state.playbackState === 'loading',
      volume: state.volume,
      volumePercent: Math.round(state.volume * 100),
      loop: state.loop,
      currentTime,
      currentTimeFormatted: formatTime(currentTime),
      duration,
      durationFormatted: formatTime(duration),
      progress: duration > 0 ? (currentTime / duration) * 100 : 0
    };
  }

  private extractFileName(url: string): string {
    if (!url) return 'Unknown';
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      const fileName = parts[parts.length - 1];
      return fileName.replace(/\.[^.]+$/, '');
    } catch {
      const parts = url.split('/');
      const fileName = parts[parts.length - 1];
      return fileName.replace(/\.[^.]+$/, '');
    }
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Sync toggle
    html.find('#ase-sync-toggle').on('change', (event) => {
      const enabled = (event.target as HTMLInputElement).checked;
      this.socket.setSyncEnabled(enabled);
      this.updateSyncIndicator(html, enabled);
    });

    // Channel volume sliders
    const throttledChannelBroadcast = throttle((channel: string, value: number) => {
      if (channel === 'master') {
        this.socket.broadcastChannelVolume('master', value);
      } else {
        this.socket.broadcastChannelVolume(channel as TrackGroup, value);
      }
    }, 50);

    html.find('.ase-channel-slider').on('input', (event) => {
      const channel = $(event.currentTarget).data('channel') as string;
      const value = parseFloat((event.target as HTMLInputElement).value) / 100;

      // Update local engine immediately to prevent UI jitter/reset on re-render
      if (channel === 'master') {
        this.engine.setMasterVolume(value);
      } else {
        this.engine.setChannelVolume(channel as TrackGroup, value);
      }

      throttledChannelBroadcast(channel, value);
      $(event.currentTarget).siblings('.ase-channel-value').text(`${Math.round(value * 100)}%`);
    });

    // Add track
    html.find('#ase-add-track').on('click', () => this.onAddTrack());

    // Track controls
    const tracks = html.find('.ase-tracks');

    tracks.on('click', '.ase-btn-play', (event) => {
      const trackId = $(event.currentTarget).closest('.ase-track').data('track-id');
      this.onPlayTrack(trackId);
    });

    tracks.on('click', '.ase-btn-pause', (event) => {
      const trackId = $(event.currentTarget).closest('.ase-track').data('track-id');
      this.onPauseTrack(trackId);
    });

    tracks.on('click', '.ase-btn-stop', (event) => {
      const trackId = $(event.currentTarget).closest('.ase-track').data('track-id');
      this.onStopTrack(trackId);
    });

    tracks.on('click', '.ase-btn-remove', (event) => {
      const trackId = $(event.currentTarget).closest('.ase-track').data('track-id');
      this.onRemoveTrack(trackId);
    });

    tracks.on('change', '.ase-loop-toggle', (event) => {
      const trackId = $(event.currentTarget).closest('.ase-track').data('track-id');
      const loop = (event.target as HTMLInputElement).checked;
      this.engine.setTrackLoop(trackId, loop);
      this.socket.broadcastTrackLoop(trackId, loop);
    });

    tracks.on('change', '.ase-channel-select', (event) => {
      const trackId = $(event.currentTarget).data('track-id') as string;
      const channel = (event.target as HTMLSelectElement).value as TrackGroup;
      this.engine.setTrackChannel(trackId, channel);
    });

    // Volume slider
    const throttledVolumeBroadcast = throttle((trackId: string, value: number) => {
      this.socket.broadcastTrackVolume(trackId, value);
    }, 50);

    tracks.on('input', '.ase-volume-slider', (event) => {
      const trackId = $(event.currentTarget).closest('.ase-track').data('track-id');
      const value = parseFloat((event.target as HTMLInputElement).value) / 100;

      this.engine.setTrackVolume(trackId, value); // Decoupled engine update from throttle
      throttledVolumeBroadcast(trackId, value);

      $(event.currentTarget).siblings('.ase-volume-value').text(`${Math.round(value * 100)}%`);
    });

    // Seek slider
    const throttledSeek = throttle((trackId: string, time: number) => {
      const player = this.engine.getTrack(trackId);
      const isPlaying = player?.state === 'playing';
      this.engine.seekTrack(trackId, time);
      this.socket.broadcastTrackSeek(trackId, time, isPlaying ?? false);
    }, 100);

    tracks.on('input', '.ase-seek-slider', (event) => {
      const trackId = $(event.currentTarget).closest('.ase-track').data('track-id');
      const player = this.engine.getTrack(trackId);
      if (player) {
        const percent = parseFloat((event.target as HTMLInputElement).value);
        const time = (percent / 100) * player.getDuration();
        throttledSeek(trackId, time);
      }
    });

    // Stop all
    html.find('#ase-stop-all').on('click', () => {
      this.engine.stopAll();
      this.socket.broadcastStopAll();
      this.render();
    });

    this.startUpdates();
  }

  private updateSyncIndicator(html: JQuery, enabled: boolean): void {
    const indicator = html.find('.ase-sync-status');
    indicator.toggleClass('is-active', enabled);
    indicator.find('span').text(enabled ? 'SYNC ON' : 'SYNC OFF');
  }

  private startUpdates(): void {
    this.stopUpdates();
    this.updateInterval = setInterval(() => {
      this.updateTrackDisplays();
    }, 250);
  }

  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateTrackDisplays(): void {
    const html = this.element;
    if (!html || !html.length) return;

    let playingCount = 0;

    for (const player of this.engine.getAllTracks()) {
      const trackEl = html.find(`.ase-track[data-track-id="${player.id}"]`);
      if (!trackEl.length) continue;

      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
      const state = player.state;

      if (state === 'playing') playingCount++;

      trackEl.find('.ase-time-current').text(formatTime(currentTime));

      const seekSlider = trackEl.find('.ase-seek-slider');
      if (!seekSlider.is(':active')) {
        seekSlider.val(progress);
      }

      trackEl.removeClass('is-playing is-paused is-stopped is-loading');
      trackEl.addClass(`is-${state}`);

      trackEl.find('.ase-btn-play').prop('disabled', state === 'playing' || state === 'loading');
      trackEl.find('.ase-btn-pause').prop('disabled', state !== 'playing');
      trackEl.find('.ase-btn-stop').prop('disabled', state === 'stopped');
    }

    const totalTracks = this.engine.getAllTracks().length;
    html.find('.ase-track-count').text(`${playingCount}/${totalTracks} playing`);
  }

  private async onAddTrack(): Promise<void> {
    const fp = new FilePicker({
      type: 'audio',
      current: '',
      callback: async (path: string) => {
        await this.addTrackFromPath(path);
      }
    });
    fp.render(true);
  }

  async addTrackFromPath(path: string, group: TrackGroup = 'music'): Promise<void> {
    const trackId = generateUUID();

    try {
      await this.engine.createTrack({
        id: trackId,
        url: path,
        group,
        volume: 1,
        loop: false
      });

      this.render();
      ui.notifications?.info(`Added: ${this.extractFileName(path)}`);

    } catch (error) {
      Logger.error('Failed to add track:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to load: ${errorMessage}`);
    }
  }

  private async onPlayTrack(trackId: string): Promise<void> {
    const player = this.engine.getTrack(trackId);
    if (!player) return;

    const offset = player.state === 'paused' ? player.getCurrentTime() : 0;
    await this.engine.playTrack(trackId, offset);
    this.socket.broadcastTrackPlay(trackId, offset);
  }

  private onPauseTrack(trackId: string): void {
    const player = this.engine.getTrack(trackId);
    if (!player) return;

    const pausedAt = player.getCurrentTime();
    this.engine.pauseTrack(trackId);
    this.socket.broadcastTrackPause(trackId, pausedAt);
  }

  private onStopTrack(trackId: string): void {
    this.engine.stopTrack(trackId);
    this.socket.broadcastTrackStop(trackId);
  }

  private onRemoveTrack(trackId: string): void {
    this.engine.removeTrack(trackId);
    this.render();
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    this.stopUpdates();
    return super.close(options);
  }
}