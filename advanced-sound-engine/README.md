 +
  # Session Report - Jan 19 & 20, 2026

---

## Track Entity

### Data Type (`src/types/library.ts`)

```typescript
interface LibraryItem {
  id: string;           // UUID v4 - уникальный идентификатор
  url: string;          // Путь к аудио файлу
  name: string;         // Отображаемое имя
  tags: string[];       // Массив тегов (пользовательские, НЕ включают канал)
  group: TrackGroup;    // Канал звука: 'music' | 'ambience' | 'sfx'
  duration: number;     // Длительность в секундах
  favorite: boolean;    // Помечен как избранный
  addedAt: number;      // Timestamp добавления
  updatedAt: number;    // Timestamp последнего изменения
}
```

### UI Layout (Row 1 + Row 2)

| Элемент | Класс CSS | Описание |
|---------|-----------|----------|
| Название | `.ase-track-name` | Название трека, обрезается ellipsis |
| Длительность | `.ase-track-duration` | Формат `M:SS` |
| Кнопки управления | `.ase-track-controls` | Абсолютное позиционирование справа, вертикально по центру |
| Канал (dropdown) | `.ase-channel-select` | Выбор group: music/ambience/sfx |
| Теги | `.ase-track-tags` | Массив `.ase-tag` + кнопка "+" |

### Ключевые методы (`src/library/LibraryManager.ts`)

| Метод | Описание |
|-------|----------|
| `addItem(url, name?, group?)` | Добавить трек в библиотеку |
| `updateItem(id, updates)` | Обновить поля трека (включая `group`, `tags`) |
| `removeItem(id)` | Удалить трек из библиотеки |
| `getItem(id)` | Получить трек по ID |
| `getAllItems()` | Получить все треки |

---

## Tag System

### Глобальные теги vs Теги трека

| Аспект | Глобальные теги | Теги трека |
|--------|-----------------|------------|
| Хранение | `LibraryManager.customTags: Set<string>` | `LibraryItem.tags: string[]` |
| Персистенция | Сохраняются даже без треков | Привязаны к треку |
| UI расположение | Верхняя панель `.ase-tags-inline` | Строка 2 трека `.ase-track-tags` |
| Контекстное меню (ПКМ) | Edit / Delete (глобально) | Remove (только с трека) |

### Ключевые методы (`src/library/LibraryManager.ts`)

| Метод | Описание |
|-------|----------|
| `getAllTags()` | Возвращает объединение `customTags` + теги из всех треков |
| `addCustomTag(tag)` | Добавить тег в глобальный список |
| `addTagToItem(itemId, tag)` | Добавить тег к треку |
| `removeTagFromItem(itemId, tag)` | Удалить тег с трека (НЕ из глобального списка) |
| `deleteTag(tag)` | Удалить тег глобально (из `customTags` + из всех треков) |
| `renameTag(oldTag, newTag)` | Переименовать тег везде |

### Фильтрация по тегам (`src/ui/LocalLibraryApp.ts`)

- **Логика**: AND — показывает треки, у которых есть **ВСЕ** выбранные теги
- **Местоположение**: `applyFilters()` метод

---

## Channel System (TrackGroup)

### Тип данных (`src/types/audio.ts`)

```typescript
type TrackGroup = 'music' | 'ambience' | 'sfx';
```

### Связь с UI

| Элемент | Описание |
|---------|----------|
| Фильтр-кнопки | `.ase-btn-filter[data-channel]` — верхняя панель |
| Dropdown на треке | `.ase-channel-select` — Row 2 трека |
| Микшер (footer) | `.ase-mixer-footer` — каналы громкости |

### Фильтрация по каналам

- **Логика**: OR — показывает треки, чей `group` входит в `selectedChannels`
- **При пустом выборе**: Показывает все треки

---

## Queue System (Очередь воспроизведения)

### Тип данных (`src/types/queue.ts`)

```typescript
interface QueueItem {
  id: string;           // UUID очереди (НЕ libraryItemId)
  libraryItemId: string; // Ссылка на трек в библиотеке
  group: TrackGroup;    // Канал
  state: 'playing' | 'paused' | 'stopped';
  volume: number;
  loop: boolean;
}
```

### Ключевые методы (`src/queue/PlaybackQueueManager.ts`)

| Метод | Описание |
|-------|----------|
| `addItem(libraryItemId, options)` | Добавить трек в очередь |
| `removeItem(queueItemId)` | Удалить по ID очереди |
| `removeByLibraryItemId(libraryItemId)` | Удалить по ID трека |
| `hasItem(libraryItemId)` | Проверить, есть ли трек в очереди |

### Глобальный доступ

```typescript
window.ASE.queue  // PlaybackQueueManager instance
```

---

##  Completed Work (Jan 20)
1.  **Search Bar Refinement**:
    *   **Visibility**: Fixed CSS `display: none` that hid the "X" button.
    *   **Always Visible**: Made the "X" (clear) button always visible to serve as a persistent reset button.
    *   **Auto-Reset**: Search now automatically resets and re-renders if the input field is cleared manually.
    *   **Code Cleanup**: Removed duplicate `onSearchInput` implementations.

2.  **Tag System Architecture**:
    *   **Normalization**: All tags are now trimmed and stripped of `#` prefixes upon creation and storage.
    *   **Numeric Tags Fix**: Fixed a critical bug where numeric-only tags (e.g., "8888") were treated as Numbers by jQuery/DOM, breaking selection. Used `String()` coercion.
    *   **Delete Re-render**: Fixed `deleteTag` to always re-render the UI, ensuring "empty" custom tags disappear immediately.
    *   **Legacy Cleanup**: Added logic to handle and normalize old tags potentially stored with `#`.

## Completed Work (Jan 19)
1.  **UI & Layout**:
    *   Refined Library Header: Consolidated filters and search bar.
    *   Fixed "Add Track" button styling and flex-positioning.
    *   Fixed Z-Index clipping for Context Menus by implementing a custom body-appended menu.

2.  **Persistence**:
    *   Implemented `customTags` in `LibraryManager` to allow tags to exist without track assignments.

## Known Issues
- All reported bugs from Jan 19/20 have been addressed. Ready for further testing in live environment.

## Completed Work (Jan 21)
1.  **Track Item Layout Refactor**:
    *   **2-Row Layout**: Re-organized track item content into two rows.
        *   Row 1: Title, Duration, Compact Controls.
        *   Row 2: Tags and Channel Dropdown.
    *   **Cover Art**: Added layout support (Left-aligned) for track cover art (placeholder currently active).
    *   **Visuals**: Verified styles to ensure tags are clean (no borders) and layout is responsive.

2.  **Channel Selection Logic**:
    *   **Refactor**: Removed redundant hidden `select` element from the template which conflicted with the custom UI.
    *   **Implementation**: Channel selection now relies exclusively on the custom JS-driven context menu implementation (`onChannelDropdown`), resolving the "double dropdown" bug.

3.  **Functionality Fixes**:
    *   **Tag Actions**: Corrected `data-action` attributes in template (`add-tag-item` → `add-tag-to-track`) to match TypeScript listeners.
4.  **UI Layout & Styling Refactor**:
    *   **Full-Height Sidebar**: Removed top separate toolbar. Sidebar now extends to the full height of the workspace.
    *   **Centered Search Bar**:
        *   Moved Search Input to the Content Header (center column).
        *   Implemented **CSS Grid** (`1fr 350px 1fr`) to ensure strict centering and fixed width (350px) regardless of adjacent buttons.
    *   **Filters Panel**: Moved Channel Filters and Tags into a dedicated `.ase-filters-bar` at the top of the content area.
    *   **Visual Consistency**:
        *   Updated active Filter Button color from Green (`#22c55e`) to **Cyan** (`var(--accent-cyan)`) to match the global theme.
        *   **Dynamic Track Icons**: Track placeholders now display context-aware icons (`fa-music`, `fa-cloud`, `fa-bolt`) based on the assigned channel group.

5.  **Foundry Playlist Integration (Drag-and-Drop)**:
    *   **Native Foundry Compatibility**: Library now accepts drag-and-drop from Foundry's native playlists.
    *   **PlaylistSound Import**: Dragging a PlaylistSound from any Foundry playlist into the ASE library area automatically:
        *   Extracts the audio file URL using `TextEditor.getDragEventData()` and `fromUuid()`
        *   Adds track to library with original name
        *   Maps channel from Foundry to ASE (music/environment/interface → music/ambience/sfx)
        *   **Auto-Add to Playlist**: If an ASE playlist is currently selected, the track is automatically added to that playlist
    *   **Visual Feedback**: Drop zone displays cyan dashed border during drag-over
    *   **Duplicate Detection**: Warns if track URL already exists in library

6.  **Full Playlist Import (Drag-and-Drop)**:
    *   **Bulk Import**: Dragging an entire Foundry Playlist imports all tracks and creates corresponding ASE playlist
    *   **Channel Mapping**: Automatically maps Foundry audio channels to ASE channels:
        *   `music` → `music`
        *   `environment` → `ambience`
        *   `interface` → `sfx`
    *   **Channel Inheritance**: Tracks inherit playlist channel if not explicitly set
    *   **Smart Naming**: Auto-generates unique playlist names with numeric suffixes if conflicts exist
    *   **Deduplication**: Skips adding duplicate tracks to library but still adds them to playlist
    *   **Progress Reporting**: Final notification shows "X new tracks, Y already in library"

7.  **Bug Fixes (Jan 22)**:
    *   **Channel Assignment Bug**: Fixed critical bug in `LibraryManager.addItem` where the `group` parameter was hardcoded to `'music'`, causing all imported tracks to ignore their intended channel. Now correctly uses the passed `group` parameter.
    *   **Channel Mapping**: Foundry channel values are now properly mapped using string comparison (music/environment/interface).

8.  **File System Drag-and-Drop (Jan 22)**:
    *   **Local File Import**: Drag audio files from Windows Explorer (or any file manager) directly into ASE library
    *   **Smart Channel Detection**: Automatically detects channel based on filename keywords:
        *   Music: "music", "song", "theme", "bgm", "soundtrack", "score", "melody", "музык"
        *   Ambience: "ambient", "ambience", "atmosphere", "environment", "background", "nature", "wind", "rain", "forest", "cave", "амбиент", "окружен"
        *   SFX: "sfx", "sound", "effect", "fx", "hit", "impact", "explosion", "spell", "attack", "footstep", "door", "sword", "интерфейс", "эффект"
    *   **File Storage**: Files are uploaded to `Data/ase_audio/` folder
        *   Separate from worlds (no impact on world load times)
        *   Separate from modules (safe from module updates)
        *   Directory auto-created on first file upload
    *   **File Validation**: Supports mp3, ogg, wav, flac, webm, m4a, aac formats
    *   **Auto-Add to Playlist**: Automatically adds files to currently selected playlist
    *   **Batch Import**: Upload multiple files at once with summary notification
    *   **Requires GM**: Only GM users can upload files to server

9.  **Smart Scroll Position**:
    *   **Conditional Persistence**: Scroll position is preserved *only* when interacting with tracks (Playback, Queue, Favorites, Context Menu).
    *   **Auto-Reset**: Scroll automatically resets to top when changing filters, sorting, or playlists (explicit reset logic enforced).
    *   **Zero Jitter**: Removed restoration delays for instant, smooth scrolling.

10. **Playback Queue Architecture**:
    *   Implemented `PlaybackQueueManager` for managing playback sequence.
    *   Integrated Queue logic into Library App:
        *   Add/Remove Grid Tracks.
        *   Add/Remove entire Playlists.
        *   Toggle Queue status via Context Menu.

11. **UI Polish & Unified App**:
    *   **Blue Scrollbars**: Enforced global blue scrollbar styling via aggressive CSS wildcard selectors.
    *   **Unified Architecture**: Library App is now properly instantiated as a child of the main `AdvancedSoundEngineApp`, enabling better state communication (like scroll persistence).

12. **Cross-World Library Storage (Jan 22 Evening)**:
    *   **Global JSON Storage**: Library now persists to `Data/modules/advanced-sound-engine/library.json` instead of world-scoped game settings
    *   **Cross-World Persistence**: Library content is now available across all Foundry worlds
    *   **Automatic Migration**: Existing world-scoped data is automatically migrated on first load
    *   **`GlobalStorage` Service**: New storage abstraction layer for cross-world file operations

13. **Enhanced File Deletion (Jan 22 Evening)**:
    *   **Three-Option Deletion Dialog**:
        *   **Remove from Playlist**: When in playlist view, option to remove track from current playlist only
        *   **Remove from Library**: Remove track from ASE library but keep audio file on disk
        *   **Delete File from Disk**: Permanently delete the audio file from server storage (only for files in `ase_audio/` folder)
    *   **Smart File Detection**: Automatically detects whether file can be safely deleted (imported vs uploaded)
    *   **Enhanced UX**: Styled radio button dialogs with color-coded danger warnings
    *   **Consistent Dialogs**: Both context menu deletion and trash icon deletion use the same enhanced dialog

## Next Session
- **Refining File Deletion**: Improve UX and safety for deleting files from disk.
- Continue verifying UI interactions.
- Proceed with detailed playback queue integration.

---

## Completed Work (Jan 23, 2026)

### 1. Cross-World Library Storage - Path Fix
*   **Storage Path Change**: Moved library storage from `Data/modules/advanced-sound-engine/` to `Data/ase_library/`
    *   **Reason**: Module folder is overwritten on updates, causing data loss
    *   **New Path**: `Data/ase_library/library.json`
    *   **Benefit**: Library survives module updates
    *   **Auto-Creation**: Directory created automatically on first save

### 2. Notification Suppression
*   **Issue**: "library.json saved to ase_library" notification appeared on every library change
*   **Solution**: Temporarily override `ui.notifications.info` during `FilePicker.upload()` call
*   **Result**: Silent saves without spamming notifications

### 3. Scroll Position Persistence for Tags
*   **Issue**: Scroll position reset when adding/removing tags on tracks
*   **Fixed Methods**:
    *   `showTagEditor` - tag dialog save callback
    *   `onTrackTagContext` - context menu tag removal
*   **Solution**: Added `persistScroll()` calls before `render()`

### 4. Track Hover Highlight
*   **Feature**: Subtle visual feedback on track hover
*   **Implementation**: 
    *   `border-top` and `border-bottom` always present (1px solid #333)
    *   On hover: color changes to `rgba(34, 211, 238, 0.5)` (cyan)
    *   No animation (instant), no layout shift

### 5. Drag-and-Drop Visual Feedback Refinement
*   **Internal vs External Drag Detection**: 
    *   Added custom data type `application/x-ase-internal` as internal drag marker
*   **Main Content Area (tracks zone)**:
    *   Dashed border appears only for EXTERNAL drags (Foundry/file system)
    *   No border for internal track drags
*   **Playlist Items**:
    *   Highlight appears only for INTERNAL track drags
    *   Users can see which playlist will receive the track

### 6. Playlist/Favorites Drag Reorder Fix
*   **Issue**: Drag-over styles "stuck" on all playlists during reorder
*   **Solution**: Clear `drag-above/drag-below` classes from ALL items before adding to current target
*   **Applied to**: Both playlists and favorites lists

---

## Mixer UI Development - Task List

### Phase 1: Research & Preparation
- [ ] **1.1** Review all Mixer-related files:
    *   `src/ui/MixerApp.ts` (or similar)
    *   `templates/mixer.hbs`
    *   `styles/sound-engine.scss` (mixer sections)
- [ ] **1.2** Understand sound management architecture:
    *   `PlaybackQueueManager` integration
    *   Channel volume controls
    *   Sound playback methods
- [ ] **1.3** Review `QueueItem` interface and playback state management

### Phase 2: Mixer Cleanup
- [ ] **2.1** Clear existing Mixer-block content (central area on Mixer tab)
    *   Keep: Top navigation tabs
    *   Keep: Bottom mixer panel (SFX/Ambience/Music/Master sliders + SYNC + Play/Pause/Stop)
    *   Remove: All content in central "Mixer-block" area
- [ ] **2.2** Clear obsolete code and cache:
    *   Remove unused Mixer-specific templates/components
    *   Clean up old state management if separate from Library
    *   Remove any standalone Mixer data structures

### Phase 3: Architecture Integration
- [ ] **3.1** Unify Library and Mixer sound control:
    *   Single source of truth for playback state
    *   Shared event system for state changes
    *   Synchronized UI updates across tabs
- [ ] **3.2** Connect both Library and Mixer to existing sound engine methods
- [ ] **3.3** Ensure bottom mixer panel controls work identically from both tabs

### Phase 4: Playlist Queue View (Right Section of Mixer-block)
- [ ] **4.1** Create Playlist Queue component:
    *   Display all tracks currently in playback queue
    *   Group by playlist with collapsible sections
    *   Accordion behavior: collapsed shows only playing/paused tracks
- [ ] **4.2** Implement Mixer Track Item (extended from Library Track):
    *   All Library track buttons: Play, Pause, Stop, Add to Queue, Favorite, Delete
    *   **Additional**: Timeline/Progress bar with seek functionality
    *   **Additional**: Individual volume slider
    *   **Playback State Indicators**:
        *   Playing: Visual highlight (e.g., glow, color)
        *   Paused: Different highlight
        *   Stopped: No highlight
- [ ] **4.3** Implement playlist collapse/expand:
    *   Collapsed: Show only playing/paused tracks
    *   Expanded: Show all tracks in playlist

### Phase 5: Favorites Section (Left Section of Mixer-block)
- [ ] **5.1** Replicate Favorites list from Library:
    *   Same visual appearance
    *   Same functionality (add/remove favorites)
- [ ] **5.2** Add playback controls to each favorite:
    *   Play, Pause, Stop buttons per item
    *   Quick-add to queue functionality

### Phase 6: Sound Engine Integration
- [ ] **6.1** Connect all UI elements to existing sound methods:
    *   Library: Play/Pause/Stop buttons
    *   Mixer: Play/Pause/Stop buttons  
    *   Mixer: Timeline seek
    *   Mixer: Individual volume controls
- [ ] **6.2** Implement sync mode:
    *   Use existing module sync functionality
    *   No new sync methods needed - just connect to existing
- [ ] **6.3** Connect bottom mixer controls:
    *   Channel volume sliders (SFX, Ambience, Music, Master)
    *   Global Play/Pause/Stop
    *   Sync toggle

### Completion Criteria
- [ ] Playlist Queue fully functional in Mixer
- [ ] Mixer and Library synchronized
- [ ] All playback buttons (Play/Pause/Stop) work everywhere
- [ ] Bottom mixer panel controls audio correctly
- [ ] Timeline seek works on Mixer tracks
- [ ] Individual track volume works
- [ ] Playback state visually indicated
- [ ] SYNC mode functions correctly

### Reference Images
*   **Image 1**: Current Mixer state - central area to be cleared
*   **Image 2**: Target track layout with timeline, volume, and playback controls

