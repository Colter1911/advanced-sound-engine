---
trigger: always_on
---

# Project Codebase Memory

## 1. Global Types & Domain Models
- **LibraryItem** (`src/types/library.ts`): Sound file. Fields: `id`, `url`, `name`, `tags`, `group`, `duration`, `favorite`.
- **Playlist** (`src/types/library.ts`): Ordered tracks. Fields: `id`, `name`, `items` (PlaylistItem[]), `favorite`.
- **TrackGroup** (`src/types/audio.ts`): `'music' | 'ambience' | 'sfx'`.
- **QueueItem** (`src/types/queue.ts`): Queue entry. Fields: `id`, `libraryItemId`, `state`, `volume`, `loop`.
- **PlaybackMode**: `'single' | 'linear' | 'loop' | 'random' | 'inherit'`.
  - Playlist Context → enforces playlist mode; Track Context → track mode; Inherit → uses playlist mode or Loop.

## 2. Shared Utilities
- **Logger** (`src/utils/logger.ts`): `info/warn/error/debug(message, ...args)` with module prefix.
- **UUID** (`src/utils/uuid.ts`): `generateUUID()` → v4 UUID string.
- **Audio Validation** (`src/utils/audio-validation.ts`): `validateAudioFile(url)`.
- **Throttle** (`src/utils/throttle.ts`): `debounce(fn, ms)`.

## 3. UI Components & Apps
- **AdvancedSoundEngineApp** (`src/ui/AdvancedSoundEngineApp.ts`): Main window/shell. Renders LocalLibraryApp or SoundMixerApp by active tab.
  - `_onClose()`: Disposes all sub-apps and removes queueManager subscription.
- **LocalLibraryApp** (`src/ui/LocalLibraryApp.ts`): Library tab. Tracks, tags, playlists, uploads.
  - Render Delegation: `window.ASE.openPanel` for unified state. Bypass via `render(false, { renderContext: 'queue-update' })`.
  - **Event Listener Rules**: Namespaced `.ase-library`; global handlers register ONCE via `_listenersInitialized`; queue listener in `activateListeners()` with 50ms debounce, NEVER in `getData()`.
  - `close()` clears: queue listeners, debounce timers, global handlers.
- **SoundMixerApp** (`src/ui/SoundMixerApp.ts`): Mixer tab. Playback, volume, sync.
  - `dispose()`: Clears interval, throttle timers, queueManager/engine subscriptions, Foundry hooks.
- **PlayerVolumePanel** (`src/ui/PlayerVolumePanel.ts`): Non-GM volume control.

## 4. API & Services
- **LibraryManager** (`src/library/LibraryManager.ts`): In-memory tracks/playlists state. `addItem()`, `updateItem()`, `getItem()`, `addCustomTag()`, `deleteTag()`. Persists via GlobalStorage.
- **GlobalStorage** (`src/storage/GlobalStorage.ts`): Cross-world persistence via `Data/ase_library/library.json`. `load()`, `save()`, `deletePhysicalFile()`.
- **AudioEngine** (`src/core/AudioEngine.ts`): GM-side audio controller.
  - `playTrack()`, `stopTrack()`, `setChannelVolume()`, `stopAll()`.
  - `setScheduler()` / `setSocketManager()`: Post-construction wiring (avoids circular deps).
  - **stopAll()** is atomic: clears Scheduler context → stops players → broadcasts stop-all → saves.
  - **Effects**: Type-based IDs ('reverb','delay','filter','compressor','distortion'). Insert (Filter/Distortion/Compressor) mute dry; Send (Reverb/Delay) mix with dry. Per-channel routing. Synced via socket.
  - **Known Issues**: Track limit not enforced player-side; freezes at 7-8+ HTMLAudioElements.
- **PlayerAudioEngine** (`src/core/PlayerAudioEngine.ts`): Player-side (receive-only). Mirrors GM state via socket.
  - `stopAll()`: Fully disposes + clears all players (prevents phantom sound).
  - `syncState()`: Skips re-play for drift < 2s. Effects routing identical to GM.
  - Periodic Sync (5s): Checks active players vs last GM state. Max 3 retries, 10s cooldown.
- **PlaybackQueueManager** (`src/queue/PlaybackQueueManager.ts`): Active/queued tracks list.
  - `addItem()`, `addPlaylist()`, `removeItem()`, `clearQueue()`, `hasItem()`.
  - Events: `add`, `remove`, `change`, `active`. `dispose()` clears save timer + listeners.
- **SocketManager** (`src/sync/SocketManager.ts`): GM↔Player real-time sync.
  - Messages: `sync-start/stop/state`, `track-play/pause/stop/seek/volume`, `channel-volume`, `stop-all`, `effect-param/routing/enabled`, `sync-request`.
  - `broadcastStopAll()`: No syncEnabled guard — ALWAYS reaches players.
  - Rate Limiting: `throttledSend()` 150ms for seek/volume/channelVol/effectParam (first immediate, then last-value-wins).
  - Protocol: `PROTOCOL_VERSION = 1` in every message, warn on mismatch.
  - `dispose()`: Clears throttle timers + socket listener.
- **PlaybackScheduler** (`src/core/PlaybackScheduler.ts`): Track progression logic.
  - Listens `trackEnded` / `contextChanged` from AudioEngine. Determines next track by PlaybackContext.
  - `clearContext()`: From `stopAll()`, sets `_stopped` flag. `setContext()`: Resets flag.
  - `dispose()`: Removes engine listeners.
- **StreamingPlayer** (`src/core/StreamingPlayer.ts`): HTMLAudioElement + MediaElementAudioSourceNode wrapper.
  - `_stopRequested` flag prevents play()/stop() race condition.
  - `dispose()` clears `onEnded` callback.

## 5. Architecture
- **Core Flow**: `main.ts` → `AudioEngine`, `LibraryManager`, `SocketManager`, `PlaybackScheduler`.
  - `AudioEngine.setScheduler()` / `setSocketManager()` wires post-construction.
- **Persistence**: LibraryManager → GlobalStorage → FilePicker (JSON).
- **Audio**: UI → AudioEngine → StreamingPlayer → HTMLAudioElement + Web Audio API. Howler.js NOT used.

## 6. Foundry VTT Specifics
- **Global**: `window.ASE` exposes `engine`, `library`, `queue`, `socket`.
- **Hooks**: `init` (settings), `ready` (managers/socket), `getSceneControlButtons` / `renderSceneControls` (sidebar button), `closeGame` (full disposal chain).
- **Settings**: `mixerState`, `libraryState` (world), `maxSimultaneousTracks` (1-32).

## 7. Visual Style Standards
- **Layout**: 1440x1050. Sidebar (left, nav/lists) + Main (right, content) + Footer.
- **Colors**: Dark/Gold theme. BG `#111111`, Panels `rgba(0,0,0,0.4)`, Borders Gold `#bd8e34`, Accents Cyan `#22d3ee` / Red `#ef4444`.
- **Borders**: 1px solid Gold, 4px radius, inner glow + drop shadow.
- **Typography**: Headers `Modesto Condensed`/`Signika` 13-14px uppercase. Body `Signika`/`Roboto` 11-12px.
- **Elements**: Dropdowns dark+gold. Buttons ghost→hover fill. Primary gold+glow.

## 8. Playback Modes
### Track Modes (`LibraryItem.playbackMode`)
- **Inherit** (default): Uses playlist mode, or "single" if solo. **Loop**: Repeat. **Single**: Play once, stop. **Linear/Random**: Queue-based.

### Playlist Modes (`Playlist.playbackMode`)
- **Loop** (default): Restart from beginning. **Linear**: Play once, stop. **Random**: Shuffle.

### Implementation Flow
SoundMixerApp → `AudioEngine.playTrack(id, offset, context)` → emits `contextChanged` → PlaybackScheduler listens `trackEnded`, determines next track via context. Creates tracks via `createTrack()`. Clears context after Linear/Single completion.

### UI (`LocalLibraryApp.ts`)
- Delegated clicks on `[data-action="track-mode-dropdown"]` / `[data-action="playlist-mode-dropdown"]`.
- View data MUST map `playbackMode` explicitly for Handlebars icons.
