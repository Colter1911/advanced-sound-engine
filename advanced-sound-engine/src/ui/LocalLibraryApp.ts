import type { LibraryItem, Playlist } from '@t/library';
import type { TrackGroup } from '@t/audio';
import { LibraryManager } from '@lib/LibraryManager';
import { Logger } from '@utils/logger';
import { formatTime } from '@utils/time';

const MODULE_ID = 'advanced-sound-engine';

interface LibraryData {
  items: LibraryItemViewData[];
  playlists: PlaylistViewData[];
  favorites: FavoriteViewData[];
  stats: {
    total: number;
    favorites: number;
    playlists: number;
  };
}

interface LibraryItemViewData {
  id: string;
  name: string;
  url: string;
  duration: string;
  durationSeconds: number;
  tags: string[];
  favorite: boolean;
  group: string;
}

interface PlaylistViewData {
  id: string;
  name: string;
  itemCount: number;
  favorite: boolean;
  selected?: boolean;
}

interface FavoriteViewData {
  id: string;
  name: string;
  type: 'track' | 'playlist';
}

export class LocalLibraryApp extends Application {
  private library: LibraryManager;

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'local-library',
      template: 'modules/advanced-sound-engine/templates/library.hbs',
      title: 'Sound Library',
      width: 1100,
      height: 700,
      classes: ['advanced-sound-engine', 'library'],
      resizable: true,
      tabs: [{ navSelector: '.tabs', contentSelector: '.content', initial: 'library' }]
    });
  }

  constructor(library: LibraryManager, options = {}) {
    super(options);
    this.library = library;
  }

  override getData(): LibraryData {
    const items = this.library.getAllItems();
    const playlists = this.library.playlists.getAllPlaylists();
    const stats = this.library.getStats();

    // Build favorites list (tracks + playlists)
    const favoriteItems = this.library.getFavorites();
    const favoritePlaylists = this.library.playlists.getFavoritePlaylists();
    const favorites: FavoriteViewData[] = [
      ...favoriteItems.map(item => ({
        id: item.id,
        name: item.name,
        type: 'track' as const
      })),
      ...favoritePlaylists.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        type: 'playlist' as const
      }))
    ];

    return {
      items: items.map(item => this.getItemViewData(item)),
      playlists: playlists.map(p => this.getPlaylistViewData(p)),
      favorites,
      stats: {
        total: stats.totalItems,
        favorites: stats.favoriteItems,
        playlists: stats.playlists
      }
    };
  }

  private getPlaylistViewData(playlist: Playlist): PlaylistViewData {
    return {
      id: playlist.id,
      name: playlist.name,
      itemCount: playlist.items.length,
      favorite: playlist.favorite,
      selected: false
    };
  }

  private getItemViewData(item: LibraryItem): LibraryItemViewData {
    return {
      id: item.id,
      name: item.name,
      url: item.url,
      duration: formatTime(item.duration),
      durationSeconds: item.duration,
      tags: item.tags,
      favorite: item.favorite,
      group: this.inferGroupFromTags(item.tags)
    };
  }

  private inferGroupFromTags(tags: string[]): string {
    // Try to infer group from tags if possible
    const lowerTags = tags.map(t => t.toLowerCase());
    if (lowerTags.some(t => t.includes('music'))) return 'music';
    if (lowerTags.some(t => t.includes('ambient') || t.includes('ambience'))) return 'ambience';
    if (lowerTags.some(t => t.includes('sfx') || t.includes('effect'))) return 'sfx';
    return 'music'; // default
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Add track button
    html.find('[data-action="add-track"]').on('click', this.onAddTrack.bind(this));

    // Track actions
    html.find('[data-action="toggle-favorite"]').on('click', this.onToggleFavorite.bind(this));
    html.find('[data-action="delete-track"]').on('click', this.onDeleteTrack.bind(this));

    // Playlist actions
    html.find('[data-action="create-playlist"]').on('click', this.onCreatePlaylist.bind(this));
    html.find('[data-action="toggle-playlist-favorite"]').on('click', this.onTogglePlaylistFavorite.bind(this));

    // Favorite actions
    html.find('[data-action="remove-from-favorites"]').on('click', this.onRemoveFromFavorites.bind(this));

    Logger.debug('LocalLibraryApp listeners activated');
  }

  // ─────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────

  private async onAddTrack(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();

    const fp = new FilePicker({
      type: 'audio',
      callback: async (path: string) => {
        await this.addTrackFromPath(path);
      }
    });
    fp.render(true);
  }

  private async addTrackFromPath(path: string, group: TrackGroup = 'music'): Promise<void> {
    try {
      const item = await this.library.addItem(path, undefined, group);
      this.render();
      ui.notifications?.info(`Added to library: ${item.name}`);
    } catch (error) {
      Logger.error('Failed to add track to library:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to add track: ${errorMessage}`);
    }
  }

  private async onToggleFavorite(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('item-id') as string;

    try {
      const isFavorite = this.library.toggleFavorite(itemId);
      this.render();
      ui.notifications?.info(isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      Logger.error('Failed to toggle favorite:', error);
      ui.notifications?.error('Failed to update favorite status');
    }
  }

  private async onDeleteTrack(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('item-id') as string;
    const item = this.library.getItem(itemId);

    if (!item) {
      ui.notifications?.error('Track not found');
      return;
    }

    const confirmed = await Dialog.confirm({
      title: 'Delete Track',
      content: `<p>Are you sure you want to delete <strong>${item.name}</strong> from the library?</p>
                <p class="notification warning">This will remove it from all playlists and favorites.</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (confirmed) {
      try {
        this.library.removeItem(itemId);
        this.render();
        ui.notifications?.info(`Deleted: ${item.name}`);
      } catch (error) {
        Logger.error('Failed to delete track:', error);
        ui.notifications?.error('Failed to delete track');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers
  // ─────────────────────────────────────────────────────────────

  private async onCreatePlaylist(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();

    const name = await this.promptPlaylistName();
    if (!name) return;

    try {
      const playlist = this.library.playlists.createPlaylist(name);
      this.render();
      ui.notifications?.info(`Created playlist: ${playlist.name}`);
    } catch (error) {
      Logger.error('Failed to create playlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to create playlist: ${errorMessage}`);
    }
  }

  private async onTogglePlaylistFavorite(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const playlistId = $(event.currentTarget).closest('[data-playlist-id]').data('playlist-id') as string;

    try {
      const isFavorite = this.library.playlists.togglePlaylistFavorite(playlistId);
      this.render();
      ui.notifications?.info(isFavorite ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      Logger.error('Failed to toggle playlist favorite:', error);
      ui.notifications?.error('Failed to update favorite status');
    }
  }

  private async onRemoveFromFavorites(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    const favoriteId = $(event.currentTarget).closest('[data-favorite-id]').data('favorite-id') as string;
    const favoriteType = $(event.currentTarget).closest('[data-favorite-type]').data('favorite-type') as string;

    try {
      if (favoriteType === 'track') {
        this.library.toggleFavorite(favoriteId);
      } else if (favoriteType === 'playlist') {
        this.library.playlists.togglePlaylistFavorite(favoriteId);
      }
      this.render();
      ui.notifications?.info('Removed from favorites');
    } catch (error) {
      Logger.error('Failed to remove from favorites:', error);
      ui.notifications?.error('Failed to remove from favorites');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────

  private async promptPlaylistName(): Promise<string | null> {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Create Playlist',
        content: `
          <form>
            <div class="form-group">
              <label>Playlist Name:</label>
              <input type="text" name="playlist-name" autofocus />
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Create',
            callback: (html: JQuery) => {
              const name = (html.find('[name="playlist-name"]').val() as string || '').trim();
              resolve(name || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create'
      }).render(true);
    });
  }
}
