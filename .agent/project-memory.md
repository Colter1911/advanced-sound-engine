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
- **PlaybackQueueManager** (`src/queue/PlaybackQueueManager.ts`):
  - Manages the list of active/queued tracks.
- **SocketManager** (`src/sync/SocketManager.ts`):
  - Handles real-time state synchronization between GM and players.

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
