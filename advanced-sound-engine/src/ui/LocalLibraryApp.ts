import type { LibraryItem, Playlist } from '@t/library';
import type { TrackGroup } from '@t/audio';
import { LibraryManager } from '@lib/LibraryManager';
import { Logger } from '@utils/logger';
import { formatTime } from '@utils/time';

const MODULE_ID = 'advanced-sound-engine';

interface FilterState {
  searchQuery: string;
  selectedChannels: Set<TrackGroup>;
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
  filters: {
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
  value: string;
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
      selectedChannels: new Set(['music', 'ambience', 'sfx']), // Default all selected? Or none? User said "Green for active". Usually start with all or none. Let's start with all.
      selectedPlaylistId: null,
      selectedTags: new Set(),
      // Default sort
      sortValue: 'date-desc'
    } as any;
  }

  // Override render to delegate to main app
  override render(force?: boolean, options?: any): any {
    // If we are part of the unified app, we just trigger the main app to update
    if (window.ASE?.openPanel) {
      // If we are the active tab, this will re-render the main app
      // If not, it switches to us. 
      // We pass 'library' to ensure we are looking at the library.
      // But if we just want to update data without switching tabs (background update),
      // we might need a more subtle approach. For now, this ensures consistency.
      window.ASE.openPanel('library', true);
      return;
    }
    return super.render(force, options);
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

    // Build tags list with selection state, ensuring selected and recent tags are visible
    const tagSet = new Set(allTags);
    this.filterState.selectedTags.forEach(t => tagSet.add(t));

    const tags: TagViewData[] = Array.from(tagSet).sort().map(tag => {
      // Handle legacy tags that might have '#' stored in DB
      const display = tag.startsWith('#') ? tag.substring(1) : tag;
      return {
        name: display, // This is what is shown after the # in template
        value: tag,    // This is the actual data value
        selected: this.filterState.selectedTags.has(tag)
      };
    });

    // Build playlists with selection state
    const playlistsViewData = playlists.map(p => ({
      ...this.getPlaylistViewData(p),
      selected: p.id === this.filterState.selectedPlaylistId
    }));

    // Check if any filters are active (if NOT all channels are selected, or other filters exist)
    const allChannelsSelected = this.filterState.selectedChannels.size === 3; // Assuming 3 channels
    const hasActiveFilters = !!(
      this.filterState.searchQuery ||
      !allChannelsSelected ||
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
      filters: {
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

    // Channel filter (OR logic: Show item if its group is in selectedChannels)
    if (this.filterState.selectedChannels.size > 0) {
      filtered = filtered.filter(item => {
        const group = this.inferGroupFromTags(item.tags) as TrackGroup;
        return this.filterState.selectedChannels.has(group);
      });
    } else {
      // If no channels selected, strictly show nothing? Or all? 
      // Usually if checkboxes, unchecked means don't show.
      filtered = [];
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
    // Listen for KeyDown (Enter) instead of Input
    html.find('.ase-search-input').on('keydown', this.onSearchKeydown.bind(this));
    html.find('.ase-search-clear').on('click', this.onClearSearch.bind(this));
    html.find('[data-action="filter-channel"]').on('click', this._onFilterChannel.bind(this));
    html.find('[data-action="change-sort"]').on('change', this.onChangeSort.bind(this));
    html.find('[data-action="clear-filters"]').on('click', this.onClearFilters.bind(this));

    // Tag actions
    html.find('[data-action="toggle-tag"]').on('click', this.onToggleTag.bind(this));
    html.find('[data-action="add-tag"]').on('click', this.onAddTag.bind(this));

    // Track actions
    html.find('[data-action="play-track"]').on('click', this.onPlayTrack.bind(this));
    html.find('[data-action="pause-track"]').on('click', this.onPauseTrack.bind(this));
    html.find('[data-action="stop-track"]').on('click', this.onStopTrack.bind(this));
    html.find('[data-action="add-to-queue"]').on('click', this.onAddToQueue.bind(this));
    html.find('[data-action="toggle-favorite"]').on('click', this.onToggleFavorite.bind(this));
    html.find('[data-action="add-to-playlist"]').on('click', this.onAddToPlaylist.bind(this));
    html.find('[data-action="track-menu"]').on('click', this.onTrackMenu.bind(this));

    // In-track tag management
    html.find('[data-action="add-tag-to-track"]').on('click', this.onAddTagToTrack.bind(this));

    // Playlist actions
    html.find('[data-action="select-playlist"]').on('click', this.onSelectPlaylist.bind(this));
    html.find('[data-action="create-playlist"]').on('click', this.onCreatePlaylist.bind(this));
    html.find('[data-action="toggle-playlist-favorite"]').on('click', this.onTogglePlaylistFavorite.bind(this));
    html.find('[data-action="playlist-menu"]').on('click', this.onPlaylistMenu.bind(this));

    // Favorite actions
    html.find('[data-action="remove-from-favorites"]').on('click', this.onRemoveFromFavorites.bind(this));

    // Drag and drop
    this.setupDragAndDrop(html);

    // Custom Context Menu (Manual implementation to avoid clipping)
    html.find('.ase-tag').on('contextmenu', this.onTagContext.bind(this));

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

  private onSearchInput(event: JQuery.TriggeredEvent): void {
    // Only handle ENTER key for search execution
    if (event.type === 'keydown' && (event as any).key !== 'Enter') return;

    const query = ($(event.currentTarget).val() as string || '').trim().toLowerCase();

    // Only re-render if query changed
    if (this.filterState.searchQuery !== query) {
      this.filterState.searchQuery = query;
      this.render(); // Full re-render filters properly
    }
  }

  // Also catch 'input' just for specific UI toggles if needed, but here we do fully via render.
  // Actually, let's decouple: 'input' event just shows/hides X button? 
  // User wants "When pressing Enter". So 'input' should NOT filter.
  // But we need to update the X button visibility? 
  // Let's keep it simple: 'keydown' on Enter -> sets state -> render.
  // On 'input', we just let the value sit in the box. 
  // But wait, the X button logic was in onSearchInput. 
  // Let's make a separate handler for visual updates if needed, OR just rely on render.
  // Render will re-create the X button state based on `searchQuery`? No, templates don't always track input value unless we pass it.
  // We passed `value="{{searchQuery}}"` in template.

  private onSearchKeydown(event: JQuery.KeyDownEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const query = ($(event.currentTarget).val() as string || '').trim().toLowerCase();
      if (this.filterState.searchQuery !== query) {
        this.filterState.searchQuery = query;
        this.render();
      }
    }
  }

  private onClearSearch(event: JQuery.ClickEvent): void {
    this.filterState.searchQuery = '';
    const wrapper = $(event.currentTarget).closest('.ase-search-input-wrapper');
    wrapper.find('.ase-search-input').val('').trigger('focus');
    wrapper.find('.ase-search-clear').hide();
    this.element.find('.ase-track-player-item').show();
  }

  private _onFilterChannel(event: JQuery.ClickEvent): void {
    event.preventDefault();
    const btn = $(event.currentTarget);
    const channel = btn.data('channel') as TrackGroup;

    // Toggle logic: If clicked, toggle it.
    if (this.filterState.selectedChannels.has(channel)) {
      this.filterState.selectedChannels.delete(channel);
      btn.removeClass('active');
    } else {
      this.filterState.selectedChannels.add(channel);
      btn.addClass('active');
    }

    // Pass true to force render because complex logic might need re-evaluation of the list
    // OR implement client-side hiding for this too if feeling brave. 
    // Given 3 checkboxes, re-render is safer to ensure correct combinatorics.
    this.render();
    Logger.debug('Filter channel toggled:', channel, this.filterState.selectedChannels);
  }

  private onChangeSort(event: JQuery.ChangeEvent): void {
    const sortValue = $(event.currentTarget).val() as FilterState['sortBy'];
    this.filterState.sortBy = sortValue;
    this.render();
    Logger.debug('Sort changed:', sortValue);
  }

  private onClearFilters(event: JQuery.ClickEvent): void {
    event.preventDefault();

    // Reset all filters except channels (as requested: "clear button... resets all except sound channels")
    this.filterState.searchQuery = '';
    this.filterState.selectedPlaylistId = null;
    this.filterState.selectedTags.clear();

    // channels remain as is? "Kнопка clear... сбрасывает все фильтры кроме каналов звука"
    // "All Tracks" button usually means SHOW ALL. 
    // IF the button is named "All Tracks" (in template it is "Clear Filters" or similar?), let's verify.
    // Template says: <button ... data-action="clear-filters">All Tracks</button>
    // So YES, it should reset eveything relative to "viewing a slice", but the user EXPLICITLY said:
    // "except sound channels... they work separately".

    // So we DO NOT reset selectedChannels.

    this.render();
    ui.notifications?.info('Filters cleared (Channels preserved)');
  }

  // ─────────────────────────────────────────────────────────────
  // Tag Event Handlers
  // ─────────────────────────────────────────────────────────────

  private onToggleTag(event: JQuery.ClickEvent): void {
    event.preventDefault();
    // Use the right click context menu for edit/delete
    // Left click just toggles filter
    const tag = $(event.currentTarget).data('tag') as string;

    if (this.filterState.selectedTags.has(tag)) {
      this.filterState.selectedTags.delete(tag);
    } else {
      this.filterState.selectedTags.add(tag);
    }

    this.render();
  }

  private onTagContext(event: JQuery.ContextMenuEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const tag = $(event.currentTarget).data('tag') as string;

    // Create a custom context menu appended to body to avoid clipping
    const menuHtml = `
      <div id="ase-custom-context-menu" style="position: fixed; z-index: 10000; background: #222; border: 1px solid #444; border-radius: 4px; padding: 5px 0;">
        <div class="ase-ctx-item" data-action="edit" style="padding: 5px 15px; cursor: pointer; color: white;">
            <i class="fas fa-edit" style="margin-right: 5px;"></i> Edit
        </div>
        <div class="ase-ctx-item" data-action="delete" style="padding: 5px 15px; cursor: pointer; color: #ff6666;">
            <i class="fas fa-trash" style="margin-right: 5px;"></i> Delete
        </div>
      </div>
    `;

    // Remove existing
    $('#ase-custom-context-menu').remove();

    const menu = $(menuHtml);
    $('body').append(menu);

    // Position
    menu.css({
      top: event.clientY,
      left: event.clientX
    });

    // Handlers
    menu.find('[data-action="edit"]').on('click', () => {
      this.renameTag(tag);
      menu.remove();
    });

    menu.find('[data-action="delete"]').on('click', () => {
      this.deleteTag(tag);
      menu.remove();
    });

    // Initial Hover effect
    menu.find('.ase-ctx-item').hover(
      function () { $(this).css('background', '#333'); },
      function () { $(this).css('background', 'transparent'); }
    );

    // Close on click elsewhere
    $(document).one('click', () => {
      menu.remove();
    });

    console.log('Opened context menu for tag:', tag);
  }

  private async onAddTag(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();

    const tagName = await this.promptTagName();
    if (!tagName) return;

    // Use a temporary Set to show the tag immediately even if not attached to tracks yet
    // This gives "visual feedback" that it worked.
    this.filterState.selectedTags.add(tagName);

    // Add to library persistent tags
    this.library.addCustomTag(tagName);

    this.render();
    ui.notifications?.info(`Tag "${tagName}" added to filter list. Assign it to a track to save it permanently.`);
  }

  // Helper for Context Menu Callbacks to ensure `this` binding and argument passing
  private _onRenameTag(header: JQuery): void {
    const tag = header.data('tag');
    this.renameTag(tag);
  }

  private _onDeleteTag(header: JQuery): void {
    const tag = header.data('tag');
    this.deleteTag(tag);
  }

  // Correcting selector/listener activation for Context Menu if needed
  // Foundry ContextMenu usually works fine. If z-index issue, it's CSS.
  // We will force high z-index via CSS injection or ensure fixed position.
  // BUT: user said "Buttons don't work". 
  // This usually means the callback failed or `this` yielded undefined.
  // The inline arrow functions `() => this.renameTag(tag)` in `activateListeners` SHOULD be fine if `this` is correct.
  // Let's verify `activateListeners`.

  // ─────────────────────────────────────────────────────────────
  // Tag Management Logic
  // ─────────────────────────────────────────────────────────────

  private async renameTag(oldTag: string): Promise<void> {
    const newTag = await this.promptTagName(oldTag);
    if (!newTag || newTag === oldTag) return;

    // Use LibraryManager's method
    const count = this.library.renameTag(oldTag, newTag);

    // Also update filter state if selected
    if (this.filterState.selectedTags.has(oldTag)) {
      this.filterState.selectedTags.delete(oldTag);
      this.filterState.selectedTags.add(newTag);
    }

    if (count > 0) {
      this.render();
      ui.notifications?.info(`Renamed tag "${oldTag}" to "${newTag}" on ${count} tracks.`);
    }
  }

  private async deleteTag(tag: string): Promise<void> {
    const confirm = await Dialog.confirm({
      title: "Delete Tag",
      content: `Are you sure you want to delete tag "${tag}" from all tracks?`
    });
    if (!confirm) return;

    // Use LibraryManager's method
    const count = this.library.deleteTag(tag);

    // Remove from filter
    if (this.filterState.selectedTags.has(tag)) {
      this.filterState.selectedTags.delete(tag);
    }

    if (count > 0) {
      this.render();
      ui.notifications?.info(`Deleted tag "${tag}" from ${count} tracks.`);
    }
  }

  private async promptTagName(current: string = ""): Promise<string | null> {
    return new Promise((resolve) => {
      new Dialog({
        title: current ? "Rename Tag" : "New Tag",
        content: `<input type="text" id="tag-name" value="${current}" style="width:100%;box-sizing:border-box;"/>`,
        buttons: {
          ok: {
            label: "OK",
            callback: (html: JQuery) => resolve(html.find('#tag-name').val() as string)
          }
        },
        default: "ok",
        close: () => resolve(null)
      }).render(true);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Track Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────

  private onPlayTrack(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;

    Logger.debug('Play track:', itemId);
    Logger.debug('Play track:', itemId);
    window.ASE.engine?.playTrack(itemId);
    // Also add to queue if needed? 
    // User requested "Play adds to list of reproduction".
    // window.ASE.engine?.addToQueue(itemId); // TODO: Implement Queue
  }

  private onStopTrack(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;

    Logger.debug('Stop track:', itemId);
    window.ASE.engine?.stopTrack(itemId);
  }

  private onPauseTrack(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;
    Logger.debug('Pause track:', itemId);
    window.ASE.engine?.pauseTrack(itemId);
  }

  private onAddToQueue(event: JQuery.ClickEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;
    Logger.debug('Add to queue:', itemId);
    // Implementation depends on Queue manager
    ui.notifications?.info('Added to queue (Simulated)');
  }

  private async onAddTagToTrack(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).data('item-id') as string;
    Logger.debug('Add tag to track:', itemId);

    // Open dialog to select or create tags for this track
    // Implementation placeholder
    ui.notifications?.info('Tag selection dialog coming soon');
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
    // Context menu is now handled by right-click
    // This button can trigger the same menu programmatically
    const itemId = $(event.currentTarget).data('item-id') as string;
    const trackElement = $(event.currentTarget).closest('.ase-track-player-item');

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
    const playlistElement = $(event.currentTarget).closest('.ase-list-item');

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
    html.find('.ase-track-player-item[draggable="true"]').on('dragstart', (event: JQuery.DragStartEvent) => {
      const itemId = $(event.currentTarget).find('[data-item-id]').data('item-id') as string || $(event.currentTarget).data('item-id') as string;
      // Note: Data-item-id might be on the action button/icon, but for the row it should be on the row or accessible.
      // In template: <div class="ase-track-player-item"> doesn't have data-item-id directly? 
      // Let's check template.
      // Template: <div class="ase-track-player-item"> inside each item. 
      // Actually, my template rewrite in 751:
      // {{#each items}} <div class="ase-track-player-item"> ... <div class="ase-track-actions"> <i ... data-item-id="{{this.id}}"> 
      // The row itself DOES NOT have data-item-id in the rewrite! 
      // I NEED TO ADD IT TO THE TEMPLATE OR FIND IT.
      // I will assume I will fix the template to include data-item-id on the row, or find it inside.
      // For now, let's find it inside.
      const id = $(event.currentTarget).find('[data-item-id]').first().data('item-id') as string;

      event.originalEvent!.dataTransfer!.effectAllowed = 'copy';
      event.originalEvent!.dataTransfer!.setData('text/plain', id);
      $(event.currentTarget).addClass('dragging');
    });

    // Drag end
    html.find('.ase-track-player-item[draggable="true"]').on('dragend', (event: JQuery.DragEndEvent) => {
      $(event.currentTarget).removeClass('dragging');
    });

    // Drop zones (playlists)
    html.find('.ase-list-item[data-playlist-id]').on('dragover', (event: JQuery.DragOverEvent) => {
      event.preventDefault();
      event.originalEvent!.dataTransfer!.dropEffect = 'copy';
      $(event.currentTarget).addClass('drag-over');
    });

    html.find('.ase-list-item[data-playlist-id]').on('dragleave', (event: JQuery.DragLeaveEvent) => {
      $(event.currentTarget).removeClass('drag-over');
    });

    html.find('.ase-list-item[data-playlist-id]').on('drop', async (event: JQuery.DropEvent) => {
      event.preventDefault();
      const itemId = event.originalEvent!.dataTransfer!.getData('text/plain');
      const playlistId = $(event.currentTarget).data('playlist-id') as string;
      $(event.currentTarget).removeClass('drag-over');

      await this.handleDropTrackToPlaylist(itemId, playlistId);
    });

    // Drop zone from OS (Main Library Area)
    html.find('.ase-content-area').on('dragover', (event: JQuery.DragOverEvent) => {
      event.preventDefault();
      $(event.currentTarget).addClass('drag-over-import');
    });

    html.find('.ase-content-area').on('dragleave', (event: JQuery.DragLeaveEvent) => {
      $(event.currentTarget).removeClass('drag-over-import');
    });

    html.find('.ase-content-area').on('drop', async (event: JQuery.DropEvent) => {
      event.preventDefault();
      $(event.currentTarget).removeClass('drag-over-import');

      // Handle files from OS
      const files = event.originalEvent?.dataTransfer?.files;
      if (files && files.length > 0) {
        Logger.debug(`Dropped ${files.length} files from OS`);
        // Processing files...
        // Note: Foundry FilePicker/Upload API is needed here.
        // For now, we simulate the drop if it's external, or handle internal drops logic separately.

        // Check if it's an internal drag (track item)
        // If dataTransfer has 'text/plain' equal to item ID, it's internal.
        const internalId = event.originalEvent?.dataTransfer?.getData('text/plain');
        if (internalId && !files.length) {
          // Internal drop on main area -> Maybe remove from current playlist if we are in one? 
          // Currently do nothing.
          return;
        }

        // Real file upload
        await this.handleFileUpload(files);
      }
    });
  }

  private async handleFileUpload(files: FileList): Promise<void> {
    if (!game.user?.isGM) {
      ui.notifications?.warn('Only GM can upload files.');
      return;
    }

    const targetSource = 'data';
    const targetDir = 'modules/advanced-sound-engine/uploaded';

    // Ensure directory exists (optional, FilePicker usually handles specifics or returns error)
    // We'll just try to upload.

    let importedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Upload
        const response = await FilePicker.upload(targetSource, targetDir, file, {}) as any;
        if (response.path) {
          // Add to library
          await this.library.addItem(
            response.path,
            file.name.split('.')[0],
            'sfx' // Default group for dropped files
          );
          importedCount++;
        }
      } catch (err) {
        Logger.error(`Failed to upload ${file.name}:`, err);
      }
    }

    if (importedCount > 0) {
      ui.notifications?.info(`Imported ${importedCount} files.`);
      this.render();
    }
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
  // Context Menus
  // ─────────────────────────────────────────────────────────────

  private setupContextMenus(html: JQuery): void {
    // Track context menu
    new ContextMenu(html, '.track-item', [
      {
        name: 'Edit Name',
        icon: '<i class="fas fa-edit"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const itemId = li.data('item-id') as string;
          this.onEditTrackName(itemId);
        }
      },
      {
        name: 'Edit Tags',
        icon: '<i class="fas fa-tags"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const itemId = li.data('item-id') as string;
          this.onEditTrackTags(itemId);
        }
      },
      {
        name: 'Add to Playlist',
        icon: '<i class="fas fa-list-ul"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const itemId = li.data('item-id') as string;
          this.handleAddToPlaylistFromContext(itemId);
        }
      },
      {
        name: 'Toggle Favorite',
        icon: '<i class="fas fa-star"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
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
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const itemId = li.data('item-id') as string;
          this.onDeleteTrackConfirm(itemId);
        }
      }
    ]);

    // Playlist context menu
    new ContextMenu(html, '.playlist-item', [
      {
        name: 'Rename Playlist',
        icon: '<i class="fas fa-edit"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const playlistId = li.data('playlist-id') as string;
          this.onRenamePlaylist(playlistId);
        }
      },
      {
        name: 'Edit Description',
        icon: '<i class="fas fa-align-left"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const playlistId = li.data('playlist-id') as string;
          this.onEditPlaylistDescription(playlistId);
        }
      },
      {
        name: 'View Contents',
        icon: '<i class="fas fa-list"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const playlistId = li.data('playlist-id') as string;
          this.onViewPlaylistContents(playlistId);
        }
      },
      {
        name: 'Clear Playlist',
        icon: '<i class="fas fa-eraser"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const playlistId = li.data('playlist-id') as string;
          this.onClearPlaylist(playlistId);
        }
      },
      {
        name: 'Delete Playlist',
        icon: '<i class="fas fa-trash"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const playlistId = li.data('playlist-id') as string;
          this.onDeletePlaylistConfirm(playlistId);
        }
      }
    ]);

    // Tag context menu
    new ContextMenu(html, '.tag-chip:not(.mini)', [
      {
        name: 'Rename Tag',
        icon: '<i class="fas fa-edit"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const tagName = li.data('tag') as string;
          this.onRenameTag(tagName);
        }
      },
      {
        name: 'Delete Tag',
        icon: '<i class="fas fa-trash"></i>',
        callback: (target: JQuery | HTMLElement) => {
          const li = $(target);
          const tagName = li.data('tag') as string;
          this.onDeleteTag(tagName);
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

  private async onEditTrackTags(itemId: string): Promise<void> {
    const item = this.library.getItem(itemId);
    if (!item) {
      ui.notifications?.error('Track not found');
      return;
    }

    const tagsString = await this.promptTextInput(
      'Edit Tags',
      'Tags (comma-separated)',
      item.tags.join(', ')
    );
    if (tagsString === null) return;

    // Parse tags
    const newTags = tagsString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      this.library.updateItem(itemId, { tags: newTags });
      this.render();
      ui.notifications?.info('Tags updated');
    } catch (error) {
      Logger.error('Failed to update tags:', error);
      ui.notifications?.error('Failed to update tags');
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

  /**
   * Handle adding track to playlist from context menu
   */
  private async handleAddToPlaylistFromContext(itemId: string): Promise<void> {
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
      const group = this.inferGroupFromTags(item.tags) as any;
      this.library.playlists.addTrackToPlaylist(selectedPlaylistId, itemId, group);
      this.render();
      ui.notifications?.info(`Added "${item.name}" to playlist`);
    } catch (error) {
      Logger.error('Failed to add track to playlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ui.notifications?.error(`Failed to add to playlist: ${errorMessage}`);
    }
  }
}
