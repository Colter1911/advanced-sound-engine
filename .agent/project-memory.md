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
- **LocalLibraryApp** (`src/ui/LocalLibraryApp.ts`): Library tab controller. Manage tracks, tags, playlists, and file uploads.
- **SoundMixerApp** (`src/ui/SoundMixerApp.ts`): Mixer tab controller. Manage active playback, volume channels, and syncing.
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
  - `playTrack()`, `stopTrack()`, `setChannelVolume()`.
  - **Effects System (Type-Based IDs)**:
    - Effects identified by `type` ('reverb', 'delay', 'filter', 'compressor', 'distortion')
    - **Insert Effects**: Filter, Distortion, Compressor (mutes dry signal when active + routed)
    - **Send Effects**: Reverb, Delay (mixes with dry signal)
    - Effect routing per channel (music/ambience/sfx)
    - Effect state synchronized to players via socket
  - **Known Issues**:
    - `stopAll()` doesn't broadcast to players
    - Track limit enforcement doesn't prevent player-side playback
    - Can freeze with 7-8+ simultaneous tracks
- **PlayerAudioEngine** (`src/core/PlayerAudioEngine.ts`):
  - Player-side audio controller (receive-only).
  - Mirrors GM state based on socket messages.
  - **Periodic Sync Verification** (5 seconds):
    - Checks if local state matches last received GM state
    - Automatically requests re-sync on mismatch
    - **Known Issue**: Can enter infinite re-sync loop if `syncState()` doesn't fix mismatch
  - **Effects System**: 
    - Identical routing to GM (type-based IDs)
    - Receives effect param/routing/enabled updates via socket
- **PlaybackQueueManager** (`src/queue/PlaybackQueueManager.ts`):
  - Manages the list of active/queued tracks.
- **SocketManager** (`src/sync/SocketManager.ts`):
  - Handles real-time state synchronization between GM and players.
  - **Message Types**: 
    - `sync-start/stop/state`: Full state sync
    - `track-play/pause/stop/seek/volume/loop`: Individual track controls
    - `channel-volume`, `master-volume`: Mix controls
    - `effect-param/routing/enabled`: Effect state
    - `sync-request`: Player → GM request for full re-sync
  - **Known Issues**:
    - `stopAll` broadcast exists but not called by `AudioEngine.stopAll()`
    - No rate limiting on broadcasts (can flood network)

## 5. Key Architecture Dependencies
- **Core Flow**: `main.ts` initializes `AudioEngine`, `LibraryManager`, and `SocketManager`.
- **UI Architecture**: `AdvancedSoundEngineApp` is a shell that renders `LocalLibraryApp` or `SoundMixerApp` based on the active tab.
- **Persistence**: `LibraryManager` -> `GlobalStorage` -> `FilePicker` (JSON file).
- **Audio**: `UI` -> `AudioEngine` (logic) -> `Howler.js` (underlying audio).

## 6. Foundry VTT Specifics
- **Global Context**: `window.ASE` exposes `engine`, `library`, `queue`, `socket`.
- **Hooks Registered**:
  - `init`: Register settings & Handlebars helpers.
  - `ready`: Initialize Managers & Socket.
  - `getSceneControlButtons`: Add "Sound Engine" button to left sidebar.
  - `renderSceneControls`: Bind click listeners (v13 compat).
  - `closeGame`: Cleanup.
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

