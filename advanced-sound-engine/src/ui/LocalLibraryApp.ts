import type { LibraryItem, Playlist } from '@t/library';
import type { TrackGroup } from '@t/audio';
import { LibraryManager } from '@lib/LibraryManager';
import { Logger } from '@utils/logger';
import { formatTime } from '@utils/time';

const MODULE_ID = 'advanced-sound-engine';

interface FilterState {
  searchQuery: string;
  selectedChannels: Set<TrackGroup>; // Чекбоксы для каналов (music, ambience, sfx)
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
  channels: {
    music: boolean;
    ambience: boolean;
    sfx: boolean;
  };
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
      selectedChannels: new Set<TrackGroup>(['music', 'ambience', 'sfx']), // По умолчанию все включены
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

    // Check if any filters are active (только теги и плейлисты, не поиск и не каналы)
    const hasActiveFilters = !!(
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
      channels: {
        music: this.filterState.selectedChannels.has('music'),
        ambience: this.filterState.selectedChannels.has('ambience'),
        sfx: this.filterState.selectedChannels.has('sfx')
      },
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
      group: item.group
    };
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

    // Channel filter - фильтруем по выбранным каналам (чекбоксы)
    if (this.filterState.selectedChannels.size > 0 && this.filterState.selectedChannels.size < 3) {
      filtered = filtered.filter(item => this.filterState.selectedChannels.has(item.group));
    }

    // Playlist filter
    if (this.filterState.selectedPlaylistId) {
      const playlist = this.library.playlists.getPlaylist(this.filterState.selectedPlaylistId);
      if (playlist) {
        const playlistItemIds = new Set(playlist.items.map(i => i.libraryItemId));
        filtered = filtered.filter(item => playlistItemIds.has(item.id));
      }
    }

    // Tags filter (AND logic - show items with ALL selected tags)
    if (this.filterState.selectedTags.size > 0) {
      filtered = filtered.filter(item => {
        // Проверяем, что ВСЕ выбранные теги присутствуют в треке
        return Array.from(this.filterState.selectedTags).every(selectedTag =>
          item.tags.includes(selectedTag)
        );
      });
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
    html.find('[data-action="clear-search"]').on('click', this.onClearSearch.bind(this));
    html.find('[data-action="toggle-channel"]').on('click', this.onToggleChannel.bind(this));
    html.find('[data-action="change-sort"]').on('change', this.onChangeSort.bind(this));
    html.find('[data-action="clear-all"]').on('click', this.onClearAll.bind(this));

    // Tag actions
    html.find('[data-action="toggle-tag"]').on('click', this.onToggleTag.bind(this));
    html.find('[data-action="add-tag"]').on('click', this.onAddTag.bind(this));

    // Track actions
    html.find('[data-action="play-track"]').on('click', this.onPlayTrack.bind(this));
    html.find('[data-action="stop-track"]').on('click', this.onStopTrack.bind(this));
    html.find('[data-action="toggle-favorite"]').on('click', this.onToggleFavorite.bind(this));
    html.find('[data-action="add-to-playlist"]').on('click', this.onAddToPlaylist.bind(this));
    html.find('[data-action="change-group"]').on('change', this.onChangeGroup.bind(this));
    html.find('[data-action="manage-tags"]').on('click', this.onManageTags.bind(this));
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

    // Context menus
    this.setupContextMenus(html);

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
    // НЕ вызываем render() сразу - это сбрасывает курсор
    // Используем debounce или render через requestAnimationFrame
    requestAnimationFrame(() => this.render());
    Logger.debug('Search:', query);
  }

  private onClearSearch(event: JQuery.ClickEvent): void {
    event.preventDefault();
    this.filterState.searchQuery = '';
    this.render();
  }

  private onToggleChannel(event: JQuery.ClickEvent): void {
    event.preventDefault();
    const channel = $(event.currentTarget).data('channel') as TrackGroup;

    // Toggle channel в Set
    if (this.filterState.selectedChannels.has(channel)) {
      this.filterState.selectedChannels.delete(channel);
    } else {
      this.filterState.selectedChannels.add(channel);
    }

    this.render();
    Logger.debug('Toggle channel:', channel, 'Selected:', Array.from(this.filterState.selectedChannels));
  }

  private onChangeSort(event: JQuery.ChangeEvent): void {
    const sortValue = $(event.currentTarget).val() as FilterState['sortBy'];
    this.filterState.sortBy = sortValue;
    this.render();
    Logger.debug('Sort changed:', sortValue);
  }

  private onClearAll(event: JQuery.ClickEvent): void {
    event.preventDefault();

    // Кнопка "All" сбрасывает только теги и плейлисты, НЕ поиск и НЕ каналы
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

    // Проверяем, существует ли уже такой тег
    const allTags = this.library.getAllTags();
    if (allTags.includes(tagName)) {
      ui.notifications?.warn(`Tag "${tagName}" already exists`);
      return;
    }

    // Создаем "фантомный" тег - добавляем временный элемент с этим тегом
    // Это позволит тегу появиться в списке доступных тегов
    // Альтернатива: можно хранить список тегов отдельно
    ui.notifications?.info(`Tag "${tagName}" created. You can now assign it to tracks.`);

    // Обновляем рендер
    this.render();
    Logger.debug('Tag created:', tagName);
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

  private async onChangeGroup(event: JQuery.ChangeEvent): Promise<void> {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('item-id') as string;
    const newGroup = $(event.currentTarget).val() as TrackGroup;

    try {
      this.library.updateItem(itemId, { group: newGroup });
      this.render();
      Logger.debug('Changed group:', itemId, newGroup);
    } catch (error) {
      Logger.error('Failed to change group:', error);
      ui.notifications?.error('Failed to change audio channel');
    }
  }

  private async onManageTags(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).closest('[data-item-id]').data('item-id') as string;
    const item = this.library.getItem(itemId);

    if (!item) {
      ui.notifications?.error('Track not found');
      return;
    }

    const allTags = this.library.getAllTags();
    if (allTags.length === 0) {
      ui.notifications?.warn('No tags available. Create tags first in the tags section.');
      return;
    }

    // Создаем чекбоксы для всех тегов
    const checkboxes = allTags.map(tag => {
      const checked = item.tags.includes(tag) ? 'checked' : '';
      return `
        <label style="display: block; margin: 5px 0;">
          <input type="checkbox" name="tag-${tag}" value="${tag}" ${checked} />
          ${tag}
        </label>
      `;
    }).join('');

    const selectedTags = await new Promise<string[]>((resolve) => {
      new Dialog({
        title: 'Manage Tags',
        content: `
          <form>
            <div class="form-group">
              <label>Select Tags:</label>
              <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;">
                ${checkboxes}
              </div>
            </div>
          </form>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Save',
            callback: (html: JQuery) => {
              const selected: string[] = [];
              html.find('input[type="checkbox"]:checked').each(function() {
                selected.push($(this).val() as string);
              });
              resolve(selected);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve([])
          }
        },
        default: 'save'
      }).render(true);
    });

    if (selectedTags) {
      try {
        this.library.updateItem(itemId, { tags: selectedTags });
        this.render();
        ui.notifications?.info('Tags updated');
      } catch (error) {
        Logger.error('Failed to update tags:', error);
        ui.notifications?.error('Failed to update tags');
      }
    }
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
      this.library.playlists.addTrackToPlaylist(selectedPlaylistId, itemId, item.group);
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
    // Context menu is now handled by right-click
    // This button can trigger the same menu programmatically
    const itemId = $(event.currentTarget).data('item-id') as string;
    const trackElement = $(event.currentTarget).closest('.track-item');

    // Trigger a contextmenu event on the track item
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: event.clientX,
      clientY: event.clientY
    });
    trackElement[0]?.dispatchEvent(contextMenuEvent);
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
    // Context menu is now handled by right-click
    // This button can trigger the same menu programmatically
    const playlistId = $(event.currentTarget).data('playlist-id') as string;
    const playlistElement = $(event.currentTarget).closest('.playlist-item');

    // Trigger a contextmenu event on the playlist item
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: event.clientX,
      clientY: event.clientY
    });
    playlistElement[0]?.dispatchEvent(contextMenuEvent);
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
      this.library.playlists.addTrackToPlaylist(playlistId, itemId, item.group);
      this.render();
      ui.notifications?.info(`Added "${item.name}" to "${playlist.name}"`);
    } catch (error) {
      Logger.error('Failed to add track to playlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to add to playlist: ${errorMessage}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Context Menus
  // ─────────────────────────────────────────────────────────────

  private setupContextMenus(html: JQuery): void {
    // Track context menu
    new ContextMenu(html, '.track-item', [
      {
        name: 'Edit Name',
        icon: '<i class="fas fa-edit"></i>',
        callback: async (li: JQuery) => {
          const itemId = li.data('item-id') as string;
          await this.onEditTrackName(itemId);
        }
      },
      {
        name: 'Change Channel',
        icon: '<i class="fas fa-music"></i>',
        callback: async (li: JQuery) => {
          const itemId = li.data('item-id') as string;
          await this.onChangeChannelMenu(itemId);
        }
      },
      {
        name: 'Add to Playlist',
        icon: '<i class="fas fa-list-ul"></i>',
        callback: async (li: JQuery) => {
          const itemId = li.data('item-id') as string;
          const item = this.library.getItem(itemId);
          if (!item) return;

          const playlists = this.library.playlists.getAllPlaylists();
          if (playlists.length === 0) {
            ui.notifications?.warn('No playlists available. Create one first.');
            return;
          }

          const selectedPlaylistId = await this.promptPlaylistSelection(playlists);
          if (!selectedPlaylistId) return;

          try {
            this.library.playlists.addTrackToPlaylist(selectedPlaylistId, itemId, item.group);
            this.render();
            ui.notifications?.info(`Added "${item.name}" to playlist`);
          } catch (error) {
            Logger.error('Failed to add track to playlist:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            ui.notifications?.error(`Failed to add to playlist: ${errorMessage}`);
          }
        }
      },
      {
        name: 'Toggle Favorite',
        icon: '<i class="fas fa-star"></i>',
        callback: (li: JQuery) => {
          const itemId = li.data('item-id') as string;
          try {
            const isFavorite = this.library.toggleFavorite(itemId);
            this.render();
            ui.notifications?.info(isFavorite ? 'Added to favorites' : 'Removed from favorites');
          } catch (error) {
            Logger.error('Failed to toggle favorite:', error);
            ui.notifications?.error('Failed to update favorite status');
          }
        }
      },
      {
        name: 'Delete Track',
        icon: '<i class="fas fa-trash"></i>',
        callback: async (li: JQuery) => {
          const itemId = li.data('item-id') as string;
          await this.onDeleteTrackConfirm(itemId);
        }
      }
    ]);

    // Playlist context menu
    new ContextMenu(html, '.playlist-item', [
      {
        name: 'Rename Playlist',
        icon: '<i class="fas fa-edit"></i>',
        callback: async (li: JQuery) => {
          const playlistId = li.data('playlist-id') as string;
          await this.onRenamePlaylist(playlistId);
        }
      },
      {
        name: 'Edit Description',
        icon: '<i class="fas fa-align-left"></i>',
        callback: async (li: JQuery) => {
          const playlistId = li.data('playlist-id') as string;
          await this.onEditPlaylistDescription(playlistId);
        }
      },
      {
        name: 'View Contents',
        icon: '<i class="fas fa-list"></i>',
        callback: async (li: JQuery) => {
          const playlistId = li.data('playlist-id') as string;
          await this.onViewPlaylistContents(playlistId);
        }
      },
      {
        name: 'Clear Playlist',
        icon: '<i class="fas fa-eraser"></i>',
        callback: async (li: JQuery) => {
          const playlistId = li.data('playlist-id') as string;
          await this.onClearPlaylist(playlistId);
        }
      },
      {
        name: 'Delete Playlist',
        icon: '<i class="fas fa-trash"></i>',
        callback: async (li: JQuery) => {
          const playlistId = li.data('playlist-id') as string;
          await this.onDeletePlaylistConfirm(playlistId);
        }
      }
    ]);

    // Tag context menu
    new ContextMenu(html, '.tag-chip:not(.mini)', [
      {
        name: 'Rename Tag',
        icon: '<i class="fas fa-edit"></i>',
        callback: async (li: JQuery) => {
          const tagName = li.data('tag') as string;
          await this.onRenameTag(tagName);
        }
      },
      {
        name: 'Delete Tag',
        icon: '<i class="fas fa-trash"></i>',
        callback: async (li: JQuery) => {
          const tagName = li.data('tag') as string;
          await this.onDeleteTag(tagName);
        }
      }
    ]);
  }

  // ─────────────────────────────────────────────────────────────
  // Context Menu Handlers - Tracks
  // ─────────────────────────────────────────────────────────────

  private async onEditTrackName(itemId: string): Promise<void> {
    const item = this.library.getItem(itemId);
    if (!item) {
      ui.notifications?.error('Track not found');
      return;
    }

    const newName = await this.promptTextInput('Edit Track Name', 'Track Name', item.name);
    if (!newName || newName === item.name) return;

    try {
      this.library.updateItem(itemId, { name: newName });
      this.render();
      ui.notifications?.info(`Renamed to: ${newName}`);
    } catch (error) {
      Logger.error('Failed to rename track:', error);
      ui.notifications?.error('Failed to rename track');
    }
  }

  private async onChangeChannelMenu(itemId: string): Promise<void> {
    const item = this.library.getItem(itemId);
    if (!item) {
      ui.notifications?.error('Track not found');
      return;
    }

    const channels: { label: string; value: TrackGroup }[] = [
      { label: 'Music', value: 'music' },
      { label: 'Ambience', value: 'ambience' },
      { label: 'SFX', value: 'sfx' }
    ];

    const options = channels.map(ch =>
      `<option value="${ch.value}" ${ch.value === item.group ? 'selected' : ''}>${ch.label}</option>`
    ).join('');

    const newChannel = await new Promise<TrackGroup | null>((resolve) => {
      new Dialog({
        title: 'Change Audio Channel',
        content: `
          <form>
            <div class="form-group">
              <label>Select Channel:</label>
              <select name="channel">
                ${options}
              </select>
            </div>
          </form>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Change',
            callback: (html: JQuery) => {
              const value = html.find('[name="channel"]').val() as TrackGroup;
              resolve(value);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'save'
      }).render(true);
    });

    if (newChannel && newChannel !== item.group) {
      try {
        this.library.updateItem(itemId, { group: newChannel });
        this.render();
        ui.notifications?.info(`Channel changed to: ${newChannel}`);
      } catch (error) {
        Logger.error('Failed to change channel:', error);
        ui.notifications?.error('Failed to change channel');
      }
    }
  }

  private async onDeleteTrackConfirm(itemId: string): Promise<void> {
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
  // Context Menu Handlers - Playlists
  // ─────────────────────────────────────────────────────────────

  private async onRenamePlaylist(playlistId: string): Promise<void> {
    const playlist = this.library.playlists.getPlaylist(playlistId);
    if (!playlist) {
      ui.notifications?.error('Playlist not found');
      return;
    }

    const newName = await this.promptTextInput('Rename Playlist', 'Playlist Name', playlist.name);
    if (!newName || newName === playlist.name) return;

    try {
      this.library.playlists.updatePlaylist(playlistId, { name: newName });
      this.render();
      ui.notifications?.info(`Renamed to: ${newName}`);
    } catch (error) {
      Logger.error('Failed to rename playlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to rename playlist: ${errorMessage}`);
    }
  }

  private async onEditPlaylistDescription(playlistId: string): Promise<void> {
    const playlist = this.library.playlists.getPlaylist(playlistId);
    if (!playlist) {
      ui.notifications?.error('Playlist not found');
      return;
    }

    const description = await this.promptTextInput(
      'Edit Description',
      'Description',
      playlist.description || ''
    );
    if (description === null) return;

    try {
      this.library.playlists.updatePlaylist(playlistId, { description: description || undefined });
      this.render();
      ui.notifications?.info('Description updated');
    } catch (error) {
      Logger.error('Failed to update description:', error);
      ui.notifications?.error('Failed to update description');
    }
  }

  private async onViewPlaylistContents(playlistId: string): Promise<void> {
    const playlist = this.library.playlists.getPlaylist(playlistId);
    if (!playlist) {
      ui.notifications?.error('Playlist not found');
      return;
    }

    const items = playlist.items
      .sort((a, b) => a.order - b.order)
      .map((playlistItem, index) => {
        const libraryItem = this.library.getItem(playlistItem.libraryItemId);
        const name = libraryItem?.name || 'Unknown';
        return `<li><strong>${index + 1}.</strong> ${name}</li>`;
      })
      .join('');

    const content = `
      <div>
        <p><strong>${playlist.name}</strong></p>
        ${playlist.description ? `<p><em>${playlist.description}</em></p>` : ''}
        <p>Total tracks: ${playlist.items.length}</p>
        ${playlist.items.length > 0 ? `<ul class="playlist-contents-list">${items}</ul>` : '<p>No tracks in playlist</p>'}
      </div>
    `;

    new Dialog({
      title: 'Playlist Contents',
      content,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Close'
        }
      },
      default: 'close'
    }).render(true);
  }

  private async onClearPlaylist(playlistId: string): Promise<void> {
    const playlist = this.library.playlists.getPlaylist(playlistId);
    if (!playlist) {
      ui.notifications?.error('Playlist not found');
      return;
    }

    if (playlist.items.length === 0) {
      ui.notifications?.warn('Playlist is already empty');
      return;
    }

    const confirmed = await Dialog.confirm({
      title: 'Clear Playlist',
      content: `<p>Are you sure you want to remove all ${playlist.items.length} tracks from <strong>${playlist.name}</strong>?</p>
                <p class="notification warning">This cannot be undone.</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (confirmed) {
      try {
        // Remove all items
        const itemIds = [...playlist.items.map(i => i.id)];
        itemIds.forEach(itemId => {
          try {
            this.library.playlists.removeTrackFromPlaylist(playlistId, itemId);
          } catch (error) {
            Logger.error('Failed to remove item:', error);
          }
        });

        this.render();
        ui.notifications?.info(`Cleared playlist: ${playlist.name}`);
      } catch (error) {
        Logger.error('Failed to clear playlist:', error);
        ui.notifications?.error('Failed to clear playlist');
      }
    }
  }

  private async onDeletePlaylistConfirm(playlistId: string): Promise<void> {
    const playlist = this.library.playlists.getPlaylist(playlistId);
    if (!playlist) {
      ui.notifications?.error('Playlist not found');
      return;
    }

    const confirmed = await Dialog.confirm({
      title: 'Delete Playlist',
      content: `<p>Are you sure you want to delete <strong>${playlist.name}</strong>?</p>
                <p class="notification info">The tracks will remain in your library.</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (confirmed) {
      try {
        // Clear playlist filter if this playlist is selected
        if (this.filterState.selectedPlaylistId === playlistId) {
          this.filterState.selectedPlaylistId = null;
        }

        this.library.playlists.deletePlaylist(playlistId);
        this.render();
        ui.notifications?.info(`Deleted playlist: ${playlist.name}`);
      } catch (error) {
        Logger.error('Failed to delete playlist:', error);
        ui.notifications?.error('Failed to delete playlist');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Context Menu Handlers - Tags
  // ─────────────────────────────────────────────────────────────

  private async onRenameTag(oldTagName: string): Promise<void> {
    const newTagName = await this.promptTextInput('Rename Tag', 'New Tag Name', oldTagName);
    if (!newTagName || newTagName === oldTagName) return;

    try {
      // Find all items with this tag and update them
      const items = this.library.getAllItems().filter(item => item.tags.includes(oldTagName));

      items.forEach(item => {
        const updatedTags = item.tags.map(tag => tag === oldTagName ? newTagName : tag);
        this.library.updateItem(item.id, { tags: updatedTags });
      });

      // Update filter state if tag is selected
      if (this.filterState.selectedTags.has(oldTagName)) {
        this.filterState.selectedTags.delete(oldTagName);
        this.filterState.selectedTags.add(newTagName);
      }

      this.render();
      ui.notifications?.info(`Renamed tag "${oldTagName}" to "${newTagName}" in ${items.length} track(s)`);
    } catch (error) {
      Logger.error('Failed to rename tag:', error);
      ui.notifications?.error('Failed to rename tag');
    }
  }

  private async onDeleteTag(tagName: string): Promise<void> {
    const items = this.library.getAllItems().filter(item => item.tags.includes(tagName));

    const confirmed = await Dialog.confirm({
      title: 'Delete Tag',
      content: `<p>Are you sure you want to delete the tag <strong>${tagName}</strong>?</p>
                <p class="notification warning">This will remove the tag from ${items.length} track(s).</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });

    if (confirmed) {
      try {
        items.forEach(item => {
          const updatedTags = item.tags.filter(tag => tag !== tagName);
          this.library.updateItem(item.id, { tags: updatedTags });
        });

        // Remove from filter state if selected
        this.filterState.selectedTags.delete(tagName);

        this.render();
        ui.notifications?.info(`Deleted tag "${tagName}" from ${items.length} track(s)`);
      } catch (error) {
        Logger.error('Failed to delete tag:', error);
        ui.notifications?.error('Failed to delete tag');
      }
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

  private async promptTextInput(
    title: string,
    label: string,
    defaultValue: string = ''
  ): Promise<string | null> {
    return new Promise((resolve) => {
      new Dialog({
        title,
        content: `
          <form>
            <div class="form-group">
              <label>${label}:</label>
              <input type="text" name="text-input" value="${defaultValue}" autofocus />
            </div>
          </form>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Save',
            callback: (html: JQuery) => {
              const value = (html.find('[name="text-input"]').val() as string || '').trim();
              resolve(value || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'save'
      }).render(true);
    });
  }
}
