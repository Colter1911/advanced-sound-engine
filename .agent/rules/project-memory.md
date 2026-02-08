---
trigger: always_on
---

# Project Codebase Memory

## 1. Global Types & Domain Models
- **LibraryItem** (`src/types/library.ts`): Represents a sound file in the library.
  - Key fields: `id`, `url`, `name`, `tags`, `group`, `duration`, `favorite`.
- **Playlist** (`src/types/library.ts`): Collection of ordered tracks.
  - Key fields: `id`, `name`, `items` (PlaylistItem[]), `favorite`.
- **TrackGroup** (`src/types/audio.ts`): Audio channel union type.
  - Values: `'music' | 'ambience' | 'sfx'`.
- **QueueItem** (`src/types/queue.ts`): Item in the active playback queue.
  - Key fields: `id`, `libraryItemId`, `state` (playing/paused/stopped), `volume`, `loop`.
- **PlaybackMode**: `'single' | 'linear' | 'loop' | 'random' | 'inherit'`.
  - **Context Rules**:
    - **Playlist Context**: Enforces playlist mode (Loop/Linear/Random).
    - **Track Context**: Enforces track mode.
    - **Inherit**: Track uses playlist mode if active, else Loop.

## 2. Shared Utilities & Helpers
- **Logger** (`src/utils/logger.ts`):
  - `info/warn/error(message, ...args)`: Standardized logging with module prefix.
- **UUID** (`src/utils/uuid.ts`):
  - `generateUUID()`: Returns v4 UUID string.
- **Audio Validation** (`src/utils/audio-validation.ts`):
  - `validateAudioFile(url)`: Checks extension and format validity.
- **Throttle** (`src/utils/throttle.ts`):
  - `debounce(fn, ms)`: Prevents excessive function calls (used for saving).

## 3. UI Components & Apps (Foundry VTT)
- **AdvancedSoundEngineApp** (`src/ui/AdvancedSoundEngineApp.ts`): Main application frame / window manager.
  - **`_onClose()`**: Disposes all sub-apps (mixerApp, effectsApp, libraryApp) and removes queueManager subscription.
- **LocalLibraryApp** (`src/ui/LocalLibraryApp.ts`):
  - Library tab controller. Manage tracks, tags, playlists, and file uploads.
  - **Render Delegation**: Delegates `render()` to `window.ASE.openPanel` to maintain unified app state.
  - **Bypass**: Uses `render(false, { renderContext: 'queue-update' })` for background UI updates (e.g. queue glow).
  - **🚨 CRITICAL Event Listener Patterns**:
    - **Namespaced Events**: All listeners use `.ase-library` namespace for proper cleanup (`html.off('.ase-library')`)
    - **Global Delegated Handlers**: Register ONCE via `_listenersInitialized` flag on `document` level, NOT on `html`
    - **Queue Listener**: Registered in `activateListeners()` with 50ms debounce, **NEVER in `getData()`**
    - **⛔ ANTI-PATTERN**: Registering event listeners in `getData()` causes exponential listener accumulation
  - **Cleanup**: `close()` method must clear: queue listeners, debounce timers, and global delegated handlers
- **SoundMixerApp** (`src/ui/SoundMixerApp.ts`): Mixer tab controller. Manage active playback, volume channels, and syncing.
  - **`dispose()`**: Full cleanup — stops update interval, clears seek/volume throttle timers, removes queueManager/engine event subscriptions and Foundry hooks (`ase.favoritesChanged`, `ase.trackAutoSwitched`).
- **PlayerVolumePanel** (`src/ui/PlayerVolumePanel.ts`): Simple volume control for non-GM players.

## 4. API & Services
- **LibraryManager** (`src/library/LibraryManager.ts`):
  - Manages in-memory state of tracks and playlists.
  - `addItem(url, ...)`: process and add file.
  - `updateItem()`, `remoteItem()`, `getItem()`.
  - `addCustomTag()`, `deleteTag()`.
  - Handles persistence via `GlobalStorage` or `settings`.
- **GlobalStorage** (`src/storage/GlobalStorage.ts`):
  - Manages cross-world persistence via `Data/ase_library/library.json`.
  - `load()`, `save()`.
  - `deletePhysicalFile()`: Helper to delete files from disk.
- **AudioEngine** (`src/core/AudioEngine.ts`):
  - GM-side audio controller.
  - `playTrack()`, `stopTrack()`, `setChannelVolume()`, `stopAll()`.
  - `setScheduler()`, `setSocketManager()`: Wired post-construction from `main.ts` to avoid circular deps.
  - **stopAll()** is atomic: clears PlaybackScheduler context → stops all players → broadcasts stop-all to players → saves state.
  - **Effects System (Type-Based IDs)**:
    - Effects identified by `type` ('reverb', 'delay', 'filter', 'compressor', 'distortion')
    - **Insert Effects**: Filter, Distortion, Compressor (mutes dry signal when active + routed)
    - **Send Effects**: Reverb, Delay (mixes with dry signal)
    - Effect routing per channel (music/ambience/sfx)
    - Effect state synchronized to players via socket
  - **Known Issues**:
    - Track limit enforcement doesn't prevent player-side playback
    - Can freeze with 7-8+ simultaneous tracks (browser HTMLAudioElement limit)
- **PlayerAudioEngine** (`src/core/PlayerAudioEngine.ts`):
  - Player-side audio controller (receive-only).
  - Mirrors GM state based on socket messages.
  - **stopAll()**: Fully disposes and clears all players from Map (prevents phantom sound + sync loops).
  - **syncState()**: Skips re-play for tracks already playing at correct position (drift < 2s).
  - **Periodic Sync Verification** (5 seconds):
    - Checks if local state matches last received GM state
    - Only flags mismatch for *active* (playing/paused) players, ignores stopped ones
    - Max 3 retry attempts before giving up (resets on successful sync)
    - 10s cooldown between requests
  - **Effects System**:
    - Identical routing to GM (type-based IDs)
    - Receives effect param/routing/enabled updates via socket
- **PlaybackQueueManager** (`src/queue/PlaybackQueueManager.ts`):
  - Manages the list of active/queued tracks (Session-level, non-persisted).
  - `addItem(libId, opts)`, `addPlaylist(id, items)`.
  - `removeItem(id)`, `clearQueue()`.
  - `hasItem(libId)`: Checks presence for UI glow.
  - Events: `add`, `remove`, `change`, `active`.
  - **`dispose()`**: Clears pending save timer and all event listeners.
- **SocketManager** (`src/sync/SocketManager.ts`):
  - Handles real-time state synchronization between GM and players.
  - **Message Types**: 
    - `sync-start/stop/state`: Full state sync
    - `track-play/pause/stop/seek/volume/loop`: Individual track controls
    - `channel-volume`, `master-volume`: Mix controls
    - `effect-param/routing/enabled`: Effect state
    - `sync-request`: Player → GM request for full re-sync
  - **broadcastStopAll()**: No syncEnabled guard — stop-all ALWAYS reaches players.
  - **Rate Limiting**: `throttledSend()` (150ms) applied to high-frequency broadcasts: seek, trackVolume, channelVolume, effectParam. First call sends immediately, subsequent calls within cooldown are batched (last value wins).
  - **Protocol Versioning**: `PROTOCOL_VERSION = 1` — included in every message, receivers log warning on mismatch.
  - **`dispose()`**: Clears throttle timers and socket listener.

- **PlaybackScheduler** (`src/core/PlaybackScheduler.ts`):
  - Listens to `trackEnded` / `contextChanged` events from AudioEngine.
  - Determines next track based on PlaybackContext (playlist/track/queue).
  - `clearContext()`: Called by `AudioEngine.stopAll()` — sets `_stopped` flag to ignore late 'ended' events.
  - `setContext()`: Resets `_stopped` flag.
  - **`dispose()`**: Removes `trackEnded`/`contextChanged` listeners from AudioEngine.
- **StreamingPlayer** (`src/core/StreamingPlayer.ts`):
  - Individual track player wrapping `HTMLAudioElement` + `MediaElementAudioSourceNode` (Web Audio API).
  - `_stopRequested` flag prevents race condition where `play()` promise resolves after `stop()` was called.
  - `dispose()` clears `onEnded` callback to prevent late event emissions.

## 5. Key Architecture Dependencies
- **Core Flow**: `main.ts` initializes `AudioEngine`, `LibraryManager`, `SocketManager`, and `PlaybackScheduler`.
  - `AudioEngine.setScheduler()` / `setSocketManager()` wires references post-construction (avoids circular deps).
- **UI Architecture**: `AdvancedSoundEngineApp` is a shell that renders `LocalLibraryApp` or `SoundMixerApp` based on the active tab.
- **Persistence**: `LibraryManager` -> `GlobalStorage` -> `FilePicker` (JSON file).
- **Audio**: `UI` -> `AudioEngine` (logic) -> `StreamingPlayer` -> `HTMLAudioElement` + `MediaElementAudioSourceNode` (Web Audio API).
  - **Note**: Howler.js is NOT used. All audio playback is via native browser APIs.

## 6. Foundry VTT Specifics
- **Global Context**: `window.ASE` exposes `engine`, `library`, `queue`, `socket`.
- **Hooks Registered**:
  - `init`: Register settings & Handlebars helpers.
  - `ready`: Initialize Managers & Socket.
  - `getSceneControlButtons`: Add "Sound Engine" button to left sidebar.
  - `renderSceneControls`: Bind click listeners (v13 compat).
  - `closeGame`: Full cleanup — disposes `playbackScheduler`, `socketManager`, `gmEngine`/`playerEngine`, `queueManager`, `libraryManager`.
- **Settings Registered**:
  - `mixerState` (world scope): Internal state.
  - `libraryState` (world scope): Legacy/Fallback storage.
  - `maxSimultaneousTracks` (world scope): Configurable limit (1-32).

## 7. Visual Style Standards (Foundry V13)
> **Reference Point**: Use this section as the single source of truth for all UI/UX decisions.

### 🪟 Window Layout
- **Dimensions**: Default `1440x1050` (fixed aspect ratio for generic screens).
- **Structure**:
  - **Sidebar**: Left column for navigation/lists (Favorites, Playlists).
  - **Main**: Right column for content/details.
  - **Footer**: Bottom generic section for controls.

### 🎨 Colors & Themes
- **Palette** (Dark/Gold Theme):
  - **Background**: `var(--bg-app)` / `#111111` (Deep dark).
  - **Panels**: `var(--bg-panel)` / `rgba(0, 0, 0, 0.4)` (Semi-transparent).
  - **Borders**: **Gold/Bronze** (`#bd8e34` / `var(--ase-border-gold)`).
  - **Accents**: Cyan (`#22d3ee`) for active states, Red (`#ef4444`) for danger.
  - **Shadows**: `box-shadow: 0 0 10px rgba(0, 0, 0, 0.5)` for depth.

### 🖼 Borders & Frames
- **Sidebar Blocks** (`.ase-sidebar-section`):
  - **Style**: Explicit 1px solid Gold border.
  - **Radius**: `4px` rounded corners.
  - **Effect**: Inner black glow + Outer drop shadow.
- **Mixer Groups** (`.ase-mixer-group`):
  - Same Gold border style to unify "zones".

### 🔤 Typography
- **Families**:
  - Headers: `Modesto Condensed` (Foundry Default) or `Signika`.
  - Body: `Signika`, `Roboto`.
- **Sizes**:
  - Headers: `13-14px`, Uppercase, Bold/600.
  - Controls: `11-12px`.

### 🧩 UI Elements
- **Dropdowns**: Dark background (`#000`), Gold border, White text.
- **Buttons**:
  - **Icons**: Ghost style (transparent bg) -> Hover fill.
  - **Primary**: Gold border, localized glow.

## 8. Playback Modes Implementation
### Track Modes
Defined in `LocalLibraryApp.onTrackModeClick` and stored in `LibraryItem.playbackMode`.
- **Inherit (Default)** (`inherit`): Uses the playback mode of the playlist it belongs to, or "single" if played individually.
- **Loop** (`loop`): Repeats the track indefinitely.
- **Single** (`single`): Plays once and stops.
- **Linear** (`linear`): (Conceptually for multi-file tracks, acts as Single for simple files).
- **Random** (`random`): (Conceptually for multi-file tracks).

#### Внутренняя реализация
- **SoundMixerApp**: Передаёт `PlaybackContext` в `AudioEngine.playTrack()` при запуске треков/плейлистов
- **AudioEngine**: Эмитит событие `contextChanged` и сохраняет контекст
- **PlaybackScheduler**:
  - Слушает событие `trackEnded` от AudioEngine
  - Определяет следующий трек на основе контекста
  - Создаёт треки через `createTrack()` перед воспроизведением
  - Очищает контекст после завершения Linear плейлистов или Single треков
  - `clearContext()` + `_stopped` флаг: вызывается из `AudioEngine.stopAll()`, блокирует обработку поздних `ended` событий

### Playlist Modes
Defined in `LocalLibraryApp.onPlaylistModeClick` and stored in `Playlist.playbackMode`.
- **Loop (Default)** (`loop`): Plays through the playlist and restarts from the beginning.
- **Linear** (`linear`): Plays through the playlist once and stops.
- **Random** (`random`): Shuffles the playlist order.

### UI Integration (`LocalLibraryApp.ts`)
- **Events**: Delegated click listeners on `[data-action="track-mode-dropdown"]` and `[data-action="playlist-mode-dropdown"]`.
- **View Data**: `getItemViewData` and `getPlaylistViewData` **MUST** explicitly map `playbackMode` to the view object for the Handlebars template to render the correct icon.
- **Icons**: FontAwesome icons are dynamically selected in `library.hbs` based on the mode value.

