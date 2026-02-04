import type { TrackGroup } from '@t/audio';
import type { QueueItem } from '@t/queue';
import type { LibraryItem, Playlist } from '@t/library';
import { AudioEngine } from '@core/AudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { LibraryManager } from '@lib/LibraryManager';
import { PlaybackQueueManager } from '@queue/PlaybackQueueManager';
import { Logger } from '@utils/logger';
import { formatTime } from '@utils/time';
import type { PlaybackContext } from '@core/PlaybackScheduler';

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
  loop: boolean; // Legacy, will be removed
  playbackMode: string; // New playback mode system
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
      playbackMode: libraryItem?.playbackMode || 'inherit', // Add playbackMode
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
    // Removed old loop button handler
    html.find('[data-action="track-mode-dropdown"]').on('click', (e) => this.onTrackModeClick(e));

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

        // Play the track with single track context
        const context: PlaybackContext = {
          type: 'track',
          playbackMode: libraryItem.playbackMode
        };
        await this.playTrack(id, context);
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
    const playlistId = $track.closest('.ase-queue-playlist').data('playlist-id') as string | undefined;

    // Определить контекст из данных очереди
    const queueItem = this.queueManager.getItems().find(q => q.libraryItemId === itemId);
    let context: PlaybackContext | undefined;

    if (playlistId && queueItem?.playlistId === playlistId) {
      // Трек из плейлиста
      const playlist = this.libraryManager.playlists.getPlaylist(playlistId);
      context = {
        type: 'playlist',
        id: playlistId,
        playbackMode: playlist?.playbackMode || 'loop'
      };
    } else {
      // Отдельный трек
      const libraryItem = this.libraryManager.getItem(itemId);
      context = {
        type: 'track',
        playbackMode: libraryItem?.playbackMode || 'inherit'
      };
    }

    await this.playTrack(itemId, context);
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

  /**
   * Handle playback mode dropdown click
   */
  private onTrackModeClick(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const btn = $(event.currentTarget);
    // Support both direct data on icon
    let itemId = btn.data('item-id') as string;
    if (!itemId) {
      itemId = btn.closest('[data-item-id]').data('item-id') as string;
    }

    const item = this.libraryManager.getItem(itemId);
    if (!item) {
      Logger.warn(`Track Mode Clicked: Item not found for ID ${itemId}`);
      return;
    }

    const modes: { label: string, value: string, icon: string }[] = [
      { label: 'Inherit (Default)', value: 'inherit', icon: 'fa-arrow-turn-down' },
      { label: 'Loop', value: 'loop', icon: 'fa-repeat' },
      { label: 'Single', value: 'single', icon: 'fa-stop' },
      { label: 'Linear', value: 'linear', icon: 'fa-arrow-right' },
      { label: 'Random', value: 'random', icon: 'fa-shuffle' }
    ];

    this.showModeContextMenu(event, modes, (mode) => {
      this.libraryManager.updateItem(itemId, { playbackMode: mode as any });
      this.requestRender();
    });
  }

  /**
   * Show context menu for mode selection
   */
  private showModeContextMenu(event: JQuery.ClickEvent, modes: any[], callback: (mode: string) => void): void {
    const menuHtml = `
      <div id="ase-mode-menu" style="position: fixed; z-index: 10000; background: #110f1c; border: 1px solid #363249; border-radius: 4px; padding: 5px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        ${modes.map(m => `
          <div class="ase-ctx-item" data-value="${m.value}" style="padding: 8px 15px; cursor: pointer; color: #eee; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid ${m.icon}" style="width: 16px; text-align: center; color: #cca477;"></i> 
              <span>${m.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    $('#ase-mode-menu').remove();
    const menu = $(menuHtml);
    $('body').append(menu);

    menu.css({ top: event.clientY, left: event.clientX });

    menu.find('.ase-ctx-item').hover(
      function () { $(this).css('background', '#363249'); },
      function () { $(this).css('background', 'transparent'); }
    );

    menu.find('.ase-ctx-item').on('click', (e) => {
      e.stopPropagation();
      const val = $(e.currentTarget).data('value');
      Logger.debug(`Mode Selected: ${val}`);
      callback(val);
      menu.remove();
    });

    // Close on click outside
    setTimeout(() => {
      $('body').one('click', () => {
        menu.remove();
      });
    }, 10);
  }

  private async onAddToQueueFromFavorite(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const $el = $(event.currentTarget);
    const id = $el.data('favorite-id') as string;
    const type = $el.data('favorite-type') as 'track' | 'playlist';

    if (type === 'track') {
      const libraryItem = this.libraryManager.getItem(id);
      if (!libraryItem) return;

      // Toggle: if already in queue, remove it
      if (this.queueManager.hasItem(id)) {
        this.queueManager.removeByLibraryItemId(id);
        Logger.info('Removed track from queue:', libraryItem.name);
        ui.notifications?.info(`Removed from queue: ${libraryItem.name}`);
      } else {
        this.queueManager.addItem(id, { group: libraryItem.group });
        Logger.info('Added track to queue:', libraryItem.name);
        ui.notifications?.info(`Added to queue: ${libraryItem.name}`);
      }
    } else {
      // Add entire playlist to queue
      const playlist = this.libraryManager.playlists.getPlaylist(id);
      if (!playlist) return;

      const tracks = this.libraryManager.playlists.getPlaylistTracks(id);

      // Check if ALL tracks from playlist are in queue
      const allInQueue = tracks.every(t => this.queueManager.hasItem(t.libraryItemId));

      if (allInQueue) {
        // Remove all tracks from this playlist
        for (const track of tracks) {
          this.queueManager.removeByLibraryItemId(track.libraryItemId);
        }
        Logger.info('Removed playlist from queue:', playlist.name);
        ui.notifications?.info(`Removed from queue: ${playlist.name}`);
      } else {
        // Add playlist tracks
        const playlistItems = tracks.map(t => {
          const item = this.libraryManager.getItem(t.libraryItemId);
          return {
            libraryItemId: t.libraryItemId,
            group: item?.group || 'music' as const,
          };
        });
        this.queueManager.addPlaylist(id, playlistItems as any);
        Logger.info('Added playlist to queue:', playlist.name);
        ui.notifications?.info(`Added to queue: ${playlist.name}`);
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

  /**
   * Воспроизвести трек с опциональным контекстом
   * @param itemId - ID трека из библиотеки
   * @param context - Контекст воспроизведения (playlist, track, queue)
   */
  private async playTrack(itemId: string, context?: PlaybackContext): Promise<void> {
    const libraryItem = this.libraryManager.getItem(itemId);
    if (!libraryItem) {
      Logger.warn('Track not found in library:', itemId);
      return;
    }

    let player = this.engine.getTrack(itemId);

    // If player exists and is paused, resume from current position
    if (player && player.state === 'paused') {
      const offset = player.getCurrentTime();
      await this.engine.playTrack(itemId, offset, context);

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

    // Создать контекст, если не передан
    const playbackContext: PlaybackContext = context || {
      type: 'track',
      playbackMode: libraryItem.playbackMode
    };

    await this.engine.playTrack(itemId, 0, playbackContext);

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

  /**
   * Воспроизвести плейлист (запускает первый трек с контекстом плейлиста)
   * @param playlistId - ID плейлиста
   */
  private async playPlaylist(playlistId: string): Promise<void> {
    const playlist = this.libraryManager.playlists.getPlaylist(playlistId);
    if (!playlist) {
      Logger.warn('Playlist not found:', playlistId);
      return;
    }

    const tracks = this.libraryManager.playlists.getPlaylistTracks(playlistId);
    if (!tracks.length) {
      Logger.warn('Playlist is empty:', playlist.name);
      return;
    }

    // Создать контекст плейлиста
    const context: PlaybackContext = {
      type: 'playlist',
      id: playlistId,
      playbackMode: playlist.playbackMode
    };

    // Play first track with playlist context
    const firstTrack = tracks[0];
    await this.playTrack(firstTrack.libraryItemId, context);
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