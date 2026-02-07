# Анализ багов — Advanced Sound Engine

Дата анализа: Февраль 2026
Источник архитектуры: `.agent/rules/project-memory.md`

---

## Корневые причины фантомного звука

### Причина 1: stopAll() не очищает контекст PlaybackScheduler
- **AudioEngine.ts:356-360** — `stopAll()` останавливает локальные плееры, но НЕ:
  - Очищает `_activeContext` в PlaybackScheduler
  - Вызывает `scheduleSave()`
  - Транслирует broadcast игрокам (трансляция — обязанность UI-слоя в `AdvancedSoundEngineApp.onGlobalStop()`)
- **PlaybackScheduler.ts:36-38, 56-75** — если трек завершается естественно в момент вызова stopAll() (race condition с событием `ended` от HTMLAudioElement), PlaybackScheduler видит валидный `_activeContext` и ЗАПУСКАЕТ следующий трек
- **Связь с project-memory.md §8**: PlaybackScheduler слушает `trackEnded`, определяет следующий трек на основе контекста. Очистка контекста описана только для Linear/Single, но не для stopAll()

### Причина 2: Race condition play() vs stop() в StreamingPlayer
- **StreamingPlayer.ts:126-142, 152-157** — `play()` вызывает `await audio.play()` (HTMLAudioElement async API). `stop()` ставит `_state = 'stopped'`. Когда promise от `play()` резолвится ПОСЛЕ `stop()`, state перезаписывается на `'playing'`
- Sync verification видит `state === 'playing'` при реально остановленном аудио → запрашивает пересинхронизацию → перезапускает play()
- **Примечание**: project-memory.md §5 указывает `Howler.js` как underlying audio, но реальный код использует `HTMLAudioElement` + `MediaElementAudioSourceNode` (Web Audio API) напрямую

### Причина 3: Periodic sync verification запускает цикл пересинхронизации
- **PlayerAudioEngine.ts:100-178** — после `stopAll()` плееры остаются в Map (только `stop()`, не `dispose()` / `delete()`), но `lastSyncState` очищается
- Через 5 сек verifySyncState видит: `players.size > 0`, `lastSyncState.length === 0` → `needsResync = true`
- Если у GM `syncEnabled = false`, запрос `sync-request` молча отбрасывается (SocketManager.ts:97). Игрок запрашивает sync каждые 10 сек бесконечно
- **Связь с project-memory.md §4**: PlayerAudioEngine описан как "receive-only", Known Issue о бесконечном re-sync loop подтверждён

### Причина 4: broadcastStopAll() заблокирован syncEnabled
- **SocketManager.ts:321-324** — `broadcastStopAll()` имеет guard `if (!this._syncEnabled) return`
- **AdvancedSoundEngineApp.ts:349-353** — UI дополнительно проверяет `if (this.socket.syncEnabled)` — двойной guard
- Если sync выключен — игроки НИКОГДА не получат stop-all
- **Связь с project-memory.md §4**: SocketManager Known Issues подтверждают что `stopAll broadcast exists but not called by AudioEngine.stopAll()`

### Причина 5: syncState() перезапускает треки
- **PlayerAudioEngine.ts:509-515** — при полной пересинхронизации для КАЖДОГО трека вызывается `player.play(adjustedTime)`, даже если он уже играет на правильной позиции. Это создаёт glitch и может заново запустить трек, который должен быть остановлен

---

## Проблема 8+ одновременных треков

- **AudioEngine.ts:321-329** — проверка max tracks считает только `state === 'playing'`, но state устанавливается async после `HTMLAudioElement.play()`. Два быстрых `playTrack()` могут обойти проверку
- Каждый трек = `HTMLAudioElement` + `MediaElementAudioSourceNode` (НЕ Howler.js как указано в project-memory.md). Браузеры лимитируют ~6-16 параллельных media elements
- `HTMLAudioElement.play()` promises могут молча зависнуть, `AudioContext` переходит в `suspended`
- **Связь с project-memory.md §6**: `maxSimultaneousTracks` setting (1-32), но реальный лимит браузера ~8-12

---

## Проблема с удалённым сервером

- **main.ts** — `game.user?.isGM` определяется серверной стороной Foundry VTT, не клиентом
- Foundry socket (`game.socket`) работает через сервер ВСЕГДА — и при локальном, и при удалённом запуске
- Вероятная причина: race condition в порядке инициализации хуков при повышенной latency удалённого сервера
- **Связь с project-memory.md §6**: Hooks `init` → `ready` — между ними на удалённом сервере может быть значительная задержка

---

## Полный список найденных багов

| # | Файл:строки | Описание | Связь с PM |
|---|---|---|---|
| B1 | AudioEngine.ts:356-360 | stopAll() не вызывает scheduleSave() | §4 Known Issues |
| B2 | AudioEngine.ts:356-360 | stopAll() не очищает контекст Scheduler | §8 Playback Modes |
| B3 | AudioEngine.ts:475 | updateDryLevel threshold check хрупкий при transitions | §4 Effects System |
| B4 | PlayerAudioEngine.ts:56 | startSyncVerification() до создания аудио-графа | §4 Periodic Sync |
| B5 | PlayerAudioEngine.ts:364-399 | handlePlay() плееры не удаляются → memory leak | §4 PlayerAudioEngine |
| B6 | PlayerAudioEngine.ts:512 | syncState() всегда вызывает play() (glitch) | §4 Known Issues |
| B7 | StreamingPlayer.ts:126-142, 152-157 | play()/stop() race condition | — (нет в PM) |
| B8 | StreamingPlayer.ts:196-203 | dispose() не убирает event listeners | — (нет в PM) |
| B9 | SocketManager.ts:227 | startTimestamp сбрасывается при каждом sync | §4 Message Types |
| B10 | SocketManager.ts (все broadcast) | Нет rate limiting | §4 Known Issues |
| B11 | AdvancedSoundEngineApp.ts | _onClose не очищает mixer interval | §3 Cleanup |
| B12 | AdvancedSoundEngineApp.ts | Volume broadcasts игнорируют syncEnabled | §4 SocketManager |
| B13 | AdvancedSoundEngineApp.ts | onGlobalPlay шлёт N сообщений вместо одного | §4 SocketManager |
| B14 | SoundMixerApp.ts | updateInterval никогда не очищается | §3 SoundMixerApp |
| B15 | SoundMixerApp.ts | Двойная подписка → двойной рендер | §3 Event Patterns |
| B16 | main.ts | playbackScheduler и queueManager не disposing | §5 Core Flow |
| B17 | main.ts | queueManager создаётся для игроков (не нужен) | §4 PlaybackQueueManager |

### Расхождения в project-memory.md
| Место | Текущее значение | Реальность |
|---|---|---|
| §5, строка 103 | `Howler.js (underlying audio)` | `HTMLAudioElement` + `MediaElementAudioSourceNode` (Web Audio API) |
| §4, AudioEngine | Не упомянут PlaybackScheduler | PlaybackScheduler — ключевой компонент playback logic |
| §6, maxSimultaneousTracks | Диапазон 1-32 | Реальный лимит браузера ~8-12, настройка до 32 бесполезна |
