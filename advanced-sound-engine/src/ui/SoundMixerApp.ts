import type { TrackGroup } from '@t/audio';
import type { QueueItem } from '@t/queue';
import type { LibraryItem, Playlist } from '@t/library';
import { AudioEngine } from '@core/AudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { LibraryManager } from '@lib/LibraryManager';
import { PlaybackQueueManager } from '@queue/PlaybackQueueManager';
import { Logger } from '@utils/logger';
import { formatTime } from '@utils/time';

const MODULE_ID = 'advanced-sound-engine';

// ─────────────────────────────────────────────────────────────
// Types for Mixer View Data
// ─────────────────────────────────────────────────────────────

interface MixerViewData {
  favorites: FavoriteViewData[];
  queuePlaylists: QueuePlaylistViewData[];
  effects: EffectViewData[];
}

interface FavoriteViewData {
  id: string;
  name: string;
  type: 'track' | 'playlist';
  group?: TrackGroup;
  isPlaying: boolean;
  isPaused: boolean;
  inQueue: boolean;
}

interface EffectViewData {
  id: string;
  name: string;
  enabled: boolean;
}

interface QueuePlaylistViewData {
  id: string | null;
  name: string;
  collapsed: boolean;
  tracks: QueueTrackViewData[];
}

interface QueueTrackViewData {
  queueId: string;
  libraryItemId: string;
  name: string;
  group: TrackGroup;
  tags: string[];
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

// ─────────────────────────────────────────────────────────────
// SoundMixerApp - Mixer Tab Controller
// ─────────────────────────────────────────────────────────────

export class SoundMixerApp {
  private engine: AudioEngine;
  private socket: SocketManager;
  private libraryManager: LibraryManager;
  private queueManager: PlaybackQueueManager;
  private collapsedPlaylists: Set<string> = new Set();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private html: JQuery | null = null;
  private renderParent: (() => void) | null = null;

  // Throttle for socket broadcasts
  private seekThrottleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private volumeThrottleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private static THROTTLE_MS = 200;

  constructor(
    engine: AudioEngine,
    socket: SocketManager,
    libraryManager: LibraryManager,
    queueManager: PlaybackQueueManager
  ) {
    this.engine = engine;
    this.socket = socket;
    this.libraryManager = libraryManager;
    this.queueManager = queueManager;

    // Subscribe to queue changes for real-time updates
    this.queueManager.on('change', () => this.onQueueChange());

    // Listen for external favorite changes (Global Hook)
    Hooks.on('ase.favoritesChanged' as any, () => {
      this.requestRender();
    });
  }

  // Set callback for requesting parent render
  setRenderCallback(callback: () => void): void {
    this.renderParent = callback;
  }

  // ─────────────────────────────────────────────────────────────
  // Data Provider
  // ─────────────────────────────────────────────────────────────

  getData(): MixerViewData {
    // Get ordered favorites from library (includes both tracks and playlists)
    const orderedFavorites = this.libraryManager.getOrderedFavorites();
    const favorites: FavoriteViewData[] = [];

    for (const fav of orderedFavorites) {
      // Check if item is in queue (same pattern as LocalLibraryApp.ts:153-155)
      const inQueue = fav.type === 'track'
        ? (window.ASE?.queue?.hasItem(fav.id) ?? false)
        : (window.ASE?.queue?.getItems().some((q) => q.playlistId === fav.id) ?? false);

      if (fav.type === 'track') {
        const item = this.libraryManager.getItem(fav.id);
        if (item) {
          const player = this.engine.getTrack(item.id);
          favorites.push({
            id: item.id,
            name: item.name,
            type: 'track',
            group: item.group,
            isPlaying: player?.state === 'playing',
            isPaused: player?.state === 'paused',
            inQueue,
          });
        }
      } else if (fav.type === 'playlist') {
        const playlist = this.libraryManager.playlists.getPlaylist(fav.id);
        if (playlist) {
          favorites.push({
            id: playlist.id,
            name: playlist.name,
            type: 'playlist',
            group: undefined,
            isPlaying: false, // Playlists don't have individual play state
            isPaused: false,
            inQueue,
          });
        }
      }
    }

    // Get queue items grouped by playlist
    const queueItems = this.queueManager.getItems();
    const queuePlaylists = this.groupQueueByPlaylist(queueItems);

    // Get all effects from engine
    const effects: EffectViewData[] = this.engine.getAllEffects().map((effect) => ({
      id: effect.id,
      name: effect.type,
      enabled: effect.enabled,
    }));

    return {
      favorites,
      queuePlaylists,
      effects,
    };
  }

  private groupQueueByPlaylist(queueItems: QueueItem[]): QueuePlaylistViewData[] {
    const groups = new Map<string | null, QueueItem[]>();

    // Group by playlistId (null for un-grouped tracks)
    for (const item of queueItems) {
      const key = item.playlistId ?? null;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    const playlists: QueuePlaylistViewData[] = [];

    for (const [playlistId, items] of groups) {
      // Get playlist name
      let name = 'Ungrouped';
      if (playlistId) {
        const playlist = this.libraryManager.playlists.getPlaylist(playlistId);
        name = playlist?.name ?? 'Unknown Playlist';
      }

      const tracks = items.map(queueItem => this.getQueueTrackViewData(queueItem));

      playlists.push({
        id: playlistId,
        name,
        collapsed: playlistId ? this.collapsedPlaylists.has(playlistId) : false,
        tracks,
      });
    }

    return playlists;
  }

  private getQueueTrackViewData(queueItem: QueueItem): QueueTrackViewData {
    const libraryItem = this.libraryManager.getItem(queueItem.libraryItemId);
    const player = this.engine.getTrack(queueItem.libraryItemId);

    const currentTime = player?.getCurrentTime() ?? 0;
    const duration = libraryItem?.duration ?? player?.getDuration() ?? 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Get volume and loop from player if available (persisted state), fallback to queueItem
    const volume = player?.volume ?? queueItem.volume;
    const loop = player?.loop ?? queueItem.loop;

    return {
      queueId: queueItem.id,
      libraryItemId: queueItem.libraryItemId,
      name: libraryItem?.name ?? 'Unknown Track',
      group: queueItem.group,
      tags: libraryItem?.tags ?? [],
      isPlaying: player?.state === 'playing',
      isPaused: player?.state === 'paused',
      isStopped: !player || player.state === 'stopped',
      isLoading: player?.state === 'loading',
      volume,
      volumePercent: Math.round(volume * 100),
      loop,
      currentTime,
      currentTimeFormatted: formatTime(currentTime),
      duration,
      durationFormatted: formatTime(duration),
      progress,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Event Listeners
  // ─────────────────────────────────────────────────────────────

  activateListeners(html: JQuery): void {
    this.html = html;
    this.startUpdates();

    // Favorites controls
    html.find('[data-action="play-favorite"]').on('click', (e) => this.onPlayFavorite(e));
    html.find('[data-action="pause-favorite"]').on('click', (e) => this.onPauseFavorite(e));
    html.find('[data-action="stop-favorite"]').on('click', (e) => this.onStopFavorite(e));
    html.find('[data-action="add-to-queue-from-favorite"]').on('click', (e) => this.onAddToQueueFromFavorite(e));

    // Queue controls
    html.find('[data-action="play-queue"]').on('click', (e) => this.onPlayQueueItem(e));
    html.find('[data-action="pause-queue"]').on('click', (e) => this.onPauseQueueItem(e));
    html.find('[data-action="stop-queue"]').on('click', (e) => this.onStopQueueItem(e));
    html.find('[data-action="remove-queue"]').on('click', (e) => this.onRemoveQueueItem(e));
    html.find('[data-action="loop-queue"]').on('click', (e) => this.onLoopQueueItem(e));

    // Playlist collapse/expand
    html.find('[data-action="toggle-playlist"]').on('click', (e) => this.onTogglePlaylist(e));

    // Track controls
    html.find('[data-action="seek"]').on('input', (e) => this.onSeek(e));
    html.find('[data-action="volume"]').on('input', (e) => this.onVolumeChange(e));

    // Effects controls
    html.find('[data-action="toggle-effect"]').on('change', (e) => this.onToggleEffect(e));
  }

  // ─────────────────────────────────────────────────────────────
  // Favorites Handlers
  // ─────────────────────────────────────────────────────────────

  private async onPlayFavorite(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const $el = $(event.currentTarget);
    const id = $el.data('favorite-id') as string;
    const type = $el.data('favorite-type') as 'track' | 'playlist';

    if (type === 'track') {
      // Add track to queue if not already there
      const libraryItem = this.libraryManager.getItem(id);
      if (libraryItem) {
        const queueItems = this.queueManager.getItems();
        const existingQueueItem = queueItems.find(
          (item) => item.libraryItemId === id && !item.playlistId
        );

        if (!existingQueueItem) {
          this.queueManager.addItem(id, { group: libraryItem.group });
        }

        // Play the track
        await this.playTrack(id);
      }
    } else {
      // Add entire playlist to queue if not already there
      const playlist = this.libraryManager.playlists.getPlaylist(id);
      if (playlist) {
        const queueItems = this.queueManager.getItems();
        const existingPlaylistItems = queueItems.filter(
          (item) => item.playlistId === id
        );

        if (existingPlaylistItems.length === 0) {
          const tracks = this.libraryManager.playlists.getPlaylistTracks(id);
          const playlistItems = tracks.map((t) => {
            const item = this.libraryManager.getItem(t.libraryItemId);
            return {
              libraryItemId: t.libraryItemId,
              group: item?.group || ('music' as const),
            };
          });
          this.queueManager.addPlaylist(id, playlistItems as any);
        }

        // Play first track from playlist
        await this.playPlaylist(id);
      }
    }
    this.requestRender();
  }

  private onPauseFavorite(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const $el = $(event.currentTarget);
    const id = $el.data('favorite-id') as string;
    const type = $el.data('favorite-type') as string;

    if (type === 'track') {
      this.pauseTrack(id);
    }
    this.requestRender();
  }

  private onStopFavorite(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const $el = $(event.currentTarget);
    const id = $el.data('favorite-id') as string;
    const type = $el.data('favorite-type') as string;

    if (type === 'track') {
      this.stopTrack(id);
    } else {
      // Stop all tracks in playlist
      this.stopPlaylist(id);
    }
    this.requestRender();
  }

  // ─────────────────────────────────────────────────────────────
  // Queue Item Handlers
  // ─────────────────────────────────────────────────────────────

  private async onPlayQueueItem(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const $track = $(event.currentTarget).closest('.ase-queue-track');
    const itemId = $track.data('item-id') as string;
    await this.playTrack(itemId);
    this.requestRender();
  }

  private onPauseQueueItem(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const $track = $(event.currentTarget).closest('.ase-queue-track');
    const itemId = $track.data('item-id') as string;
    this.pauseTrack(itemId);
    this.requestRender();
  }

  private onStopQueueItem(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const $track = $(event.currentTarget).closest('.ase-queue-track');
    const itemId = $track.data('item-id') as string;
    this.stopTrack(itemId);
    this.requestRender();
  }

  private onRemoveQueueItem(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const $track = $(event.currentTarget).closest('.ase-queue-track');
    const queueId = $track.data('queue-id') as string;
    const itemId = $track.data('item-id') as string;

    // Stop the track first
    this.stopTrack(itemId);
    // Remove from queue
    this.queueManager.removeItem(queueId);
    this.requestRender();
  }

  private onLoopQueueItem(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const $track = $(event.currentTarget).closest('.ase-queue-track');
    const itemId = $track.data('item-id') as string;
    const $icon = $(event.currentTarget);

    const currentLoop = $icon.hasClass('active');
    const newLoop = !currentLoop;

    this.engine.setTrackLoop(itemId, newLoop);

    // Trigger save to persist loop state
    (this.engine as any).scheduleSave?.();

    if (newLoop) {
      $icon.addClass('active').css('color', 'var(--accent-cyan)');
    } else {
      $icon.removeClass('active').css('color', '');
    }
  }

  private async onAddToQueueFromFavorite(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const $el = $(event.currentTarget);
    const id = $el.data('favorite-id') as string;
    const type = $el.data('favorite-type') as 'track' | 'playlist';

    if (type === 'track') {
      const libraryItem = this.libraryManager.getItem(id);
      if (libraryItem) {
        this.queueManager.addItem(id, { group: libraryItem.group });
        Logger.info('Added track to queue:', libraryItem.name);
      }
    } else {
      // Add entire playlist to queue
      const playlist = this.libraryManager.playlists.getPlaylist(id);
      if (playlist) {
        const tracks = this.libraryManager.playlists.getPlaylistTracks(id);
        const playlistItems = tracks.map(t => {
          const item = this.libraryManager.getItem(t.libraryItemId);
          return {
            libraryItemId: t.libraryItemId,
            group: item?.group || 'music' as const,
          };
        });
        this.queueManager.addPlaylist(id, playlistItems as any);
        Logger.info('Added playlist to queue:', playlist.name);
      }
    }
    this.requestRender();
  }

  // ─────────────────────────────────────────────────────────────
  // Playlist Toggle
  // ─────────────────────────────────────────────────────────────

  private onTogglePlaylist(event: JQuery.ClickEvent): void {
    const $playlist = $(event.currentTarget).closest('.ase-queue-playlist');
    const playlistId = $playlist.data('playlist-id') as string;

    if (!playlistId) return;

    if (this.collapsedPlaylists.has(playlistId)) {
      this.collapsedPlaylists.delete(playlistId);
      $playlist.removeClass('is-collapsed');
      // Show all tracks
      $playlist.find('.ase-queue-track').show();
    } else {
      this.collapsedPlaylists.add(playlistId);
      $playlist.addClass('is-collapsed');
      // Hide non-playing/paused tracks
      $playlist.find('.ase-queue-track').each((_, el) => {
        const $el = $(el);
        if (!$el.hasClass('is-playing') && !$el.hasClass('is-paused')) {
          $el.hide();
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Track Controls
  // ─────────────────────────────────────────────────────────────

  private onSeek(event: JQuery.TriggeredEvent): void {
    const $track = $(event.currentTarget).closest('.ase-queue-track');
    const itemId = $track.data('item-id') as string;
    const value = parseFloat($(event.currentTarget).val() as string);

    const player = this.engine.getTrack(itemId);
    if (player) {
      const seekTime = (value / 100) * player.getDuration();
      this.engine.seekTrack(itemId, seekTime);

      // Throttled sync for socket
      if (this.socket.syncEnabled) {
        if (!this.seekThrottleTimers.has(itemId)) {
          this.seekThrottleTimers.set(itemId, setTimeout(() => {
            this.seekThrottleTimers.delete(itemId);
            const currentPlayer = this.engine.getTrack(itemId);
            if (currentPlayer) {
              this.socket.broadcastTrackSeek(itemId, currentPlayer.getCurrentTime(), currentPlayer.state === 'playing');
            }
          }, SoundMixerApp.THROTTLE_MS));
        }
      }
    }
  }

  private onVolumeChange(event: JQuery.TriggeredEvent): void {
    const $track = $(event.currentTarget).closest('.ase-queue-track');
    const itemId = $track.data('item-id') as string;
    const value = parseInt($(event.currentTarget).val() as string, 10);
    const volume = value / 100;

    // Update engine volume
    this.engine.setTrackVolume(itemId, volume);

    // Throttled sync for socket
    if (this.socket.syncEnabled) {
      if (!this.volumeThrottleTimers.has(itemId)) {
        this.volumeThrottleTimers.set(itemId, setTimeout(() => {
          this.volumeThrottleTimers.delete(itemId);
          const currentPlayer = this.engine.getTrack(itemId);
          if (currentPlayer) {
            this.socket.broadcastTrackVolume(itemId, currentPlayer.volume);
          }
        }, SoundMixerApp.THROTTLE_MS));
      }
    }

    // Update display
    $track.find('.ase-volume-value').text(`${value}%`);
  }

  // ─────────────────────────────────────────────────────────────
  // Playback Core Methods
  // ─────────────────────────────────────────────────────────────

  private async playTrack(itemId: string): Promise<void> {
    const libraryItem = this.libraryManager.getItem(itemId);
    if (!libraryItem) {
      Logger.warn('Track not found in library:', itemId);
      return;
    }

    let player = this.engine.getTrack(itemId);

    // If player exists and is paused, resume from current position
    if (player && player.state === 'paused') {
      const offset = player.getCurrentTime();
      await this.engine.playTrack(itemId, offset);

      if (this.socket.syncEnabled) {
        this.socket.broadcastTrackPlay(itemId, offset);
      }
      return;
    }

    // Create track if not exists
    if (!player) {
      player = await this.engine.createTrack({
        id: itemId,
        url: libraryItem.url,
        group: libraryItem.group,
        volume: 1,
        loop: false,
      });
    }

    await this.engine.playTrack(itemId);

    // Sync if enabled
    if (this.socket.syncEnabled) {
      this.socket.broadcastTrackPlay(itemId, 0);
    }
  }

  private pauseTrack(itemId: string): void {
    const player = this.engine.getTrack(itemId);
    this.engine.pauseTrack(itemId);

    if (this.socket.syncEnabled && player) {
      this.socket.broadcastTrackPause(itemId, player.getCurrentTime());
    }
  }

  private stopTrack(itemId: string): void {
    this.engine.stopTrack(itemId);

    if (this.socket.syncEnabled) {
      this.socket.broadcastTrackStop(itemId);
    }
  }

  private async playPlaylist(playlistId: string): Promise<void> {
    const tracks = this.libraryManager.playlists.getPlaylistTracks(playlistId);
    if (!tracks.length) return;

    // Play first track
    const firstTrack = tracks[0];
    await this.playTrack(firstTrack.libraryItemId);
  }

  private stopPlaylist(playlistId: string): void {
    const tracks = this.libraryManager.playlists.getPlaylistTracks(playlistId);
    for (const track of tracks) {
      this.stopTrack(track.libraryItemId);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Real-time Updates
  // ─────────────────────────────────────────────────────────────

  private startUpdates(): void {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => this.updateTrackDisplays(), 100);
  }

  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateTrackDisplays(): void {
    if (!this.html) return;

    this.html.find('.ase-queue-track').each((_, el) => {
      const $track = $(el);
      const itemId = $track.data('item-id') as string;
      const player = this.engine.getTrack(itemId);

      if (player) {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        $track.find('.ase-time-current').text(formatTime(currentTime));
        $track.find('.ase-seek-slider').val(progress);

        // Update state classes
        $track.removeClass('is-playing is-paused');
        if (player.state === 'playing') {
          $track.addClass('is-playing');
        } else if (player.state === 'paused') {
          $track.addClass('is-paused');
        }
      }
    });
  }

  private onQueueChange(): void {
    Logger.debug('Queue changed, mixer should refresh');
    this.requestRender();
  }

  private requestRender(): void {
    if (this.renderParent) {
      this.renderParent();
    }
  }

  private onToggleEffect(event: JQuery.ChangeEvent): void {
    const $checkbox = $(event.currentTarget) as JQuery<HTMLInputElement>;
    const effectId = $checkbox.data('effect-id') as string;
    const enabled = $checkbox.is(':checked');

    this.engine.setEffectEnabled(effectId, enabled);
    Logger.info(`Effect ${effectId} ${enabled ? 'enabled' : 'disabled'}`);
  }
}