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

## Next Session
- Continue verifying UI interactions.
- Proceed with detailed playback queue integration.
