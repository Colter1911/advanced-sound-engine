import type { LibraryItem, Playlist } from '@t/library';
import type { TrackGroup } from '@t/audio';
import { LibraryManager } from '@lib/LibraryManager';
import { Logger } from '@utils/logger';
import { formatTime } from '@utils/time';

const MODULE_ID = 'advanced-sound-engine';

interface FilterState {
  searchQuery: string;
  selectedChannel: 'all' | TrackGroup;
  selectedPlaylistId: string | null;
  selectedTags: Set<string>;
  sortBy: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'duration-asc' | 'duration-desc';
}

interface LibraryData {
  items: LibraryItemViewData[];
  playlists: PlaylistViewData[];
  favorites: FavoriteViewData[];
  tags: TagViewData[];
  stats: {
    totalItems: number;
    favoriteItems: number;
    playlists: number;
    tagCount: number;
  };
  searchQuery: string;
  selectedChannel: 'all' | TrackGroup;
  selectedPlaylistId: string | null;
  sortBy: string;
  hasActiveFilters: boolean;
}

interface TagViewData {
  name: string;
  selected: boolean;
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
  private filterState: FilterState;

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
    this.filterState = {
      searchQuery: '',
      selectedChannel: 'all',
      selectedPlaylistId: null,
      selectedTags: new Set(),
      sortBy: 'date-desc'
    };
  }

  override getData(): LibraryData {
    let items = this.library.getAllItems();
    const playlists = this.library.playlists.getAllPlaylists();
    const allTags = this.library.getAllTags();
    const stats = this.library.getStats();

    // Apply filters
    items = this.applyFilters(items);

    // Apply sorting
    items = this.applySorting(items);

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

    // Build tags list with selection state
    const tags: TagViewData[] = allTags.map(tag => ({
      name: tag,
      selected: this.filterState.selectedTags.has(tag)
    }));

    // Build playlists with selection state
    const playlistsViewData = playlists.map(p => ({
      ...this.getPlaylistViewData(p),
      selected: p.id === this.filterState.selectedPlaylistId
    }));

    // Check if any filters are active
    const hasActiveFilters = !!(
      this.filterState.searchQuery ||
      this.filterState.selectedChannel !== 'all' ||
      this.filterState.selectedPlaylistId ||
      this.filterState.selectedTags.size > 0
    );

    return {
      items: items.map(item => this.getItemViewData(item)),
      playlists: playlistsViewData,
      favorites,
      tags,
      stats: {
        totalItems: stats.totalItems,
        favoriteItems: stats.favoriteItems,
        playlists: stats.playlists,
        tagCount: stats.tagCount
      },
      // Filter state for UI
      searchQuery: this.filterState.searchQuery,
      selectedChannel: this.filterState.selectedChannel,
      selectedPlaylistId: this.filterState.selectedPlaylistId,
      sortBy: this.filterState.sortBy,
      hasActiveFilters
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

  // ─────────────────────────────────────────────────────────────
  // Filtering & Sorting
  // ─────────────────────────────────────────────────────────────

  private applyFilters(items: LibraryItem[]): LibraryItem[] {
    let filtered = items;

    // Search filter
    if (this.filterState.searchQuery) {
      const query = this.filterState.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Channel filter
    if (this.filterState.selectedChannel !== 'all') {
      filtered = filtered.filter(item => {
        const group = this.inferGroupFromTags(item.tags);
        return group === this.filterState.selectedChannel;
      });
    }

    // Playlist filter
    if (this.filterState.selectedPlaylistId) {
      const playlist = this.library.playlists.getPlaylist(this.filterState.selectedPlaylistId);
      if (playlist) {
        const playlistItemIds = new Set(playlist.items.map(i => i.libraryItemId));
        filtered = filtered.filter(item => playlistItemIds.has(item.id));
      }
    }

    // Tags filter (OR logic - show items with ANY of the selected tags)
    if (this.filterState.selectedTags.size > 0) {
      filtered = filtered.filter(item =>
        item.tags.some(tag => this.filterState.selectedTags.has(tag))
      );
    }

    return filtered;
  }

  private applySorting(items: LibraryItem[]): LibraryItem[] {
    const sorted = [...items];

    switch (this.filterState.sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'date-asc':
        sorted.sort((a, b) => a.addedAt - b.addedAt);
        break;
      case 'date-desc':
        sorted.sort((a, b) => b.addedAt - a.addedAt);
        break;
      case 'duration-asc':
        sorted.sort((a, b) => a.duration - b.duration);
        break;
      case 'duration-desc':
        sorted.sort((a, b) => b.duration - a.duration);
        break;
    }

    return sorted;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Toolbar actions
    html.find('[data-action="add-track"]').on('click', this.onAddTrack.bind(this));
    html.find('[data-action="search"]').on('input', this.onSearch.bind(this));
    html.find('[data-action="filter-channel"]').on('click', this.onFilterChannel.bind(this));
    html.find('[data-action="change-sort"]').on('change', this.onChangeSort.bind(this));
    html.find('[data-action="clear-filters"]').on('click', this.onClearFilters.bind(this));

    // Tag actions
    html.find('[data-action="toggle-tag"]').on('click', this.onToggleTag.bind(this));
    html.find('[data-action="add-tag"]').on('click', this.onAddTag.bind(this));

    // Track actions
    html.find('[data-action="play-track"]').on('click', this.onPlayTrack.bind(this));
    html.find('[data-action="stop-track"]').on('click', this.onStopTrack.bind(this));
    html.find('[data-action="toggle-favorite"]').on('click', this.onToggleFavorite.bind(this));
    html.find('[data-action="add-to-playlist"]').on('click', this.onAddToPlaylist.bind(this));
    html.find('[data-action="track-menu"]').on('click', this.onTrackMenu.bind(this));

    // Playlist actions
    html.find('[data-action="select-playlist"]').on('click', this.onSelectPlaylist.bind(this));
    html.find('[data-action="create-playlist"]').on('click', this.onCreatePlaylist.bind(this));
    html.find('[data-action="toggle-playlist-favorite"]').on('click', this.onTogglePlaylistFavorite.bind(this));
    html.find('[data-action="playlist-menu"]').on('click', this.onPlaylistMenu.bind(this));

    // Favorite actions
    html.find('[data-action="remove-from-favorites"]').on('click', this.onRemoveFromFavorites.bind(this));

    // Drag and drop
    this.setupDragAndDrop(html);

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
  // Toolbar Event Handlers
  // ─────────────────────────────────────────────────────────────

  private onSearch(event: JQuery.TriggeredEvent): void {
    const query = ($(event.currentTarget).val() as string || '').trim();
    this.filterState.searchQuery = query;
    this.render();
    Logger.debug('Search:', query);
  }

  private onFilterChannel(event: JQuery.ClickEvent): void {
    event.preventDefault();
    const channel = $(event.currentTarget).data('channel') as ('all' | TrackGroup);

    this.filterState.selectedChannel = channel;
    this.render();
    Logger.debug('Filter channel:', channel);
  }

  private onChangeSort(event: JQuery.ChangeEvent): void {
    const sortValue = $(event.currentTarget).val() as FilterState['sortBy'];
    this.filterState.sortBy = sortValue;
    this.render();
    Logger.debug('Sort changed:', sortValue);
  }

  private onClearFilters(event: JQuery.ClickEvent): void {
    event.preventDefault();

    // Reset all filters except sortBy
    this.filterState.searchQuery = '';
    this.filterState.selectedChannel = 'all';
    this.filterState.selectedPlaylistId = null;
    this.filterState.selectedTags.clear();

    this.render();
    ui.notifications?.info('Filters cleared');
  }

  // ─────────────────────────────────────────────────────────────
  // Tag Event Handlers
  // ─────────────────────────────────────────────────────────────

  private onToggleTag(event: JQuery.ClickEvent): void {
    event.preventDefault();
    const tag = $(event.currentTarget).data('tag') as string;

    if (this.filterState.selectedTags.has(tag)) {
      this.filterState.selectedTags.delete(tag);
    } else {
      this.filterState.selectedTags.add(tag);
    }

    this.render();
    Logger.debug('Toggle tag:', tag, 'Selected tags:', Array.from(this.filterState.selectedTags));
  }

  private async onAddTag(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();

    const tagName = await this.promptTagName();
    if (!tagName) return;

    // Tags are automatically created when added to tracks
    // This is just a placeholder for future tag management
    Logger.debug('Add tag:', tagName);
    ui.notifications?.info(`Tag "${tagName}" will be available once assigned to tracks`);
  }

  // ─────────────────────────────────────────────────────────────
  // Track Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────

  private onPlayTrack(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;

    Logger.debug('Play track:', itemId);
    // TODO: Integrate with AudioEngine to play track
    ui.notifications?.info('Play functionality coming soon');
  }

  private onStopTrack(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;

    Logger.debug('Stop track:', itemId);
    // TODO: Integrate with AudioEngine to stop track
  }

  private async onAddToPlaylist(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;
    const item = this.library.getItem(itemId);

    if (!item) {
      ui.notifications?.error('Track not found');
      return;
    }

    const playlists = this.library.playlists.getAllPlaylists();
    if (playlists.length === 0) {
      ui.notifications?.warn('No playlists available. Create one first.');
      return;
    }

    // Show playlist selection dialog
    const selectedPlaylistId = await this.promptPlaylistSelection(playlists);
    if (!selectedPlaylistId) return;

    try {
      const group = this.inferGroupFromTags(item.tags) as TrackGroup;
      this.library.playlists.addTrackToPlaylist(selectedPlaylistId, itemId, group);
      this.render();
      ui.notifications?.info(`Added "${item.name}" to playlist`);
    } catch (error) {
      Logger.error('Failed to add track to playlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to add to playlist: ${errorMessage}`);
    }
  }

  private onTrackMenu(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;

    Logger.debug('Track menu:', itemId);
    // TODO: Implement context menu
    ui.notifications?.info('Context menu coming soon');
  }

  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────

  private onSelectPlaylist(event: JQuery.ClickEvent): void {
    event.preventDefault();
    const playlistId = $(event.currentTarget).data('playlist-id') as string;

    // Toggle playlist filter
    if (this.filterState.selectedPlaylistId === playlistId) {
      // Deselect if clicking the same playlist
      this.filterState.selectedPlaylistId = null;
    } else {
      this.filterState.selectedPlaylistId = playlistId;
    }

    this.render();
    Logger.debug('Select playlist:', playlistId);
  }

  private onPlaylistMenu(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const playlistId = $(event.currentTarget).data('playlist-id') as string;

    Logger.debug('Playlist menu:', playlistId);
    // TODO: Implement context menu
    ui.notifications?.info('Context menu coming soon');
  }

  // ─────────────────────────────────────────────────────────────
  // Drag and Drop
  // ─────────────────────────────────────────────────────────────

  private setupDragAndDrop(html: JQuery): void {
    // Drag start
    html.find('.track-item[draggable="true"]').on('dragstart', (event: JQuery.DragStartEvent) => {
      const itemId = $(event.currentTarget).data('item-id') as string;
      event.originalEvent!.dataTransfer!.effectAllowed = 'copy';
      event.originalEvent!.dataTransfer!.setData('text/plain', itemId);
      $(event.currentTarget).addClass('dragging');
    });

    // Drag end
    html.find('.track-item[draggable="true"]').on('dragend', (event: JQuery.DragEndEvent) => {
      $(event.currentTarget).removeClass('dragging');
    });

    // Drop zones (playlists)
    html.find('.playlist-item').on('dragover', (event: JQuery.DragOverEvent) => {
      event.preventDefault();
      event.originalEvent!.dataTransfer!.dropEffect = 'copy';
      $(event.currentTarget).addClass('drag-over');
    });

    html.find('.playlist-item').on('dragleave', (event: JQuery.DragLeaveEvent) => {
      $(event.currentTarget).removeClass('drag-over');
    });

    html.find('.playlist-item').on('drop', async (event: JQuery.DropEvent) => {
      event.preventDefault();
      const itemId = event.originalEvent!.dataTransfer!.getData('text/plain');
      const playlistId = $(event.currentTarget).data('playlist-id') as string;
      $(event.currentTarget).removeClass('drag-over');

      await this.handleDropTrackToPlaylist(itemId, playlistId);
    });
  }

  private async handleDropTrackToPlaylist(itemId: string, playlistId: string): Promise<void> {
    const item = this.library.getItem(itemId);
    const playlist = this.library.playlists.getPlaylist(playlistId);

    if (!item || !playlist) {
      ui.notifications?.error('Track or playlist not found');
      return;
    }

    try {
      const group = this.inferGroupFromTags(item.tags) as TrackGroup;
      this.library.playlists.addTrackToPlaylist(playlistId, itemId, group);
      this.render();
      ui.notifications?.info(`Added "${item.name}" to "${playlist.name}"`);
    } catch (error) {
      Logger.error('Failed to add track to playlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to add to playlist: ${errorMessage}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────

  private async promptTagName(): Promise<string | null> {
    return new Promise((resolve) => {
      new Dialog({
        title: 'Add Tag',
        content: `
          <form>
            <div class="form-group">
              <label>Tag Name:</label>
              <input type="text" name="tag-name" placeholder="#Dramatic" autofocus />
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Add',
            callback: (html: JQuery) => {
              let name = (html.find('[name="tag-name"]').val() as string || '').trim();
              // Remove # prefix if present
              if (name.startsWith('#')) {
                name = name.substring(1);
              }
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

  private async promptPlaylistSelection(playlists: Playlist[]): Promise<string | null> {
    const options = playlists.map(p =>
      `<option value="${p.id}">${p.name} (${p.items.length} tracks)</option>`
    ).join('');

    return new Promise((resolve) => {
      new Dialog({
        title: 'Add to Playlist',
        content: `
          <form>
            <div class="form-group">
              <label>Select Playlist:</label>
              <select name="playlist-id">
                ${options}
              </select>
            </div>
          </form>
        `,
        buttons: {
          add: {
            icon: '<i class="fas fa-plus"></i>',
            label: 'Add',
            callback: (html: JQuery) => {
              const playlistId = html.find('[name="playlist-id"]').val() as string;
              resolve(playlistId || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'add'
      }).render(true);
    });
  }

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
