# План работ — Advanced Sound Engine

Создан: Февраль 2026
Детальный анализ багов: `bugs-analysis.md`
Источник архитектуры: `.agent/rules/project-memory.md` (Single Source of Truth)

---

## Важные уточнения по project-memory.md

1. **project-memory.md:103** указывает `Howler.js (underlying audio)`, но реальный код использует `HTMLAudioElement` + `MediaElementAudioSourceNode` (Web Audio API) напрямую через `StreamingPlayer.ts`. Howler.js **НЕ используется**. Это расхождение в документации.
2. **project-memory.md:96-97** — `stopAll broadcast exists but not called by AudioEngine.stopAll()` — подтверждено анализом кода. Broadcast вызывается только из UI-слоя (`AdvancedSoundEngineApp.onGlobalStop()`).
3. **project-memory.md:77** — `Can enter infinite re-sync loop` — подтверждено. Корневая причина: `stopAll()` очищает `lastSyncState`, но не удаляет плееры из Map.

---

## Фаза 1: Фантомный звук (КРИТИЧНО — блокирует MVP)

**Цель:** Полностью устранить ситуацию, когда у игрока продолжает играть звук после того, как ДМ всё остановил.

**Причинная цепочка (все звенья нужно исправить):**
```
stopAll() не очищает контекст Scheduler
  → race condition ended event → Scheduler стартует новый трек
    → play()/stop() race в StreamingPlayer → state = 'playing' на остановленном
      → verifySyncState() видит mismatch → запрашивает resync
        → syncState() перезапускает трек → фантомный звук
```

### Задача 1.1: Атомарный stopAll()
**Файлы:** `src/core/AudioEngine.ts`, `src/core/PlaybackScheduler.ts`, `src/sync/SocketManager.ts`
**Что делать:**
1. `AudioEngine.stopAll()` должен:
   - Очищать `_activeContext` в PlaybackScheduler (добавить метод `scheduler.clearContext()`)
   - Вызывать `scheduleSave()` после остановки
   - Самостоятельно вызывать socket broadcast (не полагаться на UI-слой)
2. `SocketManager.broadcastStopAll()` — убрать guard по `syncEnabled`. Stop-all ВСЕГДА должен доходить до игроков, даже если общая синхронизация выключена
3. `PlaybackScheduler` — добавить флаг `_stopped` проверяемый в `handleTrackEnded()` до любой логики

### Задача 1.2: Race condition play()/stop() в StreamingPlayer
**Файл:** `src/core/StreamingPlayer.ts`
**Что делать:**
1. Добавить приватный флаг `_stopRequested = false`
2. В `stop()`: установить `_stopRequested = true` ДО `audio.pause()`
3. В `play()`: после `await audio.play()` проверить `if (this._stopRequested) return` перед `_state = 'playing'`
4. В `play()`: сбрасывать `_stopRequested = false` В НАЧАЛЕ метода

### Задача 1.3: Исправить periodic sync verification
**Файл:** `src/core/PlayerAudioEngine.ts`
**Что делать:**
1. В `stopAll()`: после `player.stop()` вызывать `player.dispose()` и удалять из `this.players` Map — полная очистка
2. В `verifySyncState()`: проверять не `players.size > 0`, а наличие хотя бы одного плеера с `state !== 'stopped'`
3. Добавить guard: если `lastSyncState` пуст И все плееры stopped/удалены → не запрашивать resync
4. Если GM не отвечает на sync-request 3 раза подряд → прекратить попытки, залогировать warning через Logger.warn()

### Задача 1.4: syncState() не должен перезапускать играющие треки
**Файл:** `src/core/PlayerAudioEngine.ts`
**Что делать:**
1. Перед `player.play(adjustedTime)`:
   - Если плеер уже `playing` И `Math.abs(player.getCurrentTime() - adjustedTime) < 1.0` → пропустить play()
   - Это избежит аудио-glitch и лишних перезапусков

---

## Фаза 2: Стабильность синхронизации

Связано с: `SocketManager` (project-memory.md §4), message types (§4 sync-start/stop/state, track-play/pause/stop)

### Задача 2.1: Cleanup ресурсов при закрытии
**Файлы:** `src/ui/AdvancedSoundEngineApp.ts`, `src/ui/SoundMixerApp.ts`, `src/main.ts`
**Что делать:**
1. `AdvancedSoundEngineApp._onClose()` → вызвать `this.mixerApp.stopUpdates()`
2. `SoundMixerApp` — добавить `stopUpdates()`: clearInterval для 100ms update loop + очистить throttle timers
3. `main.ts` hook `closeGame` → dispose `playbackScheduler` и `queueManager` (project-memory.md §5)
4. `StreamingPlayer.dispose()` → `removeEventListener` для 'ended', 'canplay', 'error'

### Задача 2.2: Rate limiting на socket broadcasts
**Файл:** `src/sync/SocketManager.ts`
**Что делать:**
1. Для volume/seek/effect-param — throttle 100ms (отправлять последнее значение)
2. Для play/stop/pause — без throttle (это команды)
3. Для fullState sync — debounce 250ms
4. Использовать `debounce()` из `src/utils/throttle.ts` (project-memory.md §2)

### Задача 2.3: Версионирование socket-сообщений
**Файл:** `src/sync/SocketManager.ts`
**Что делать:**
1. Добавить `sequenceNumber: number` в каждое сообщение (инкрементный счётчик GM)
2. На стороне игрока: отбрасывать сообщения с `seq < lastProcessedSeq`
3. Это решает race condition: stop-all (seq:5) → track-play (seq:4) = track-play отброшен

### Задача 2.4: Исправить startTimestamp reset при sync
**Файл:** `src/sync/SocketManager.ts` → `getCurrentSyncState()`
**Что делать:**
1. Передавать реальный `startTimestamp` из StreamingPlayer (сохранять при play())
2. Добавить `getStartTimestamp()` в StreamingPlayer
3. На стороне игрока — корректировать offset только на основе реального timestamp

---

## Фаза 3: Модуль не грузится при удалённом подключении через браузер

Связано с: `main.ts` hooks init/ready (project-memory.md §6), window.ASE (project-memory.md §6)

### Задача 3.1: Диагностика загрузки
**Файл:** `src/main.ts`
**Что делать:**
1. Добавить подробное логирование через Logger (project-memory.md §2) в каждый хук:
   - `init`: `game.modules.get('advanced-sound-engine')?.active`
   - `ready`: `game.user?.isGM`, socket connection status
   - `getSceneControlButtons` / `renderSceneControls`: вызваны ли вообще
2. Проверить: может ли `ready` хук срабатывать ДО полной инициализации socket на удалённом сервере (latency > 0)
3. Проверить: `game.user?.isGM` — определяется серверной стороной, должно работать и при удалённом подключении
4. Собрать логи с удалённого сервера → анализировать

### Задача 3.2: Архитектурные изменения (только если 3.1 не решит)
**Что анализировать:**
- Foundry VTT socket (`game.socket`) ВСЕГДА работает через сервер, даже локально
- Модель НЕ нужно менять на "ДМ → Сервер → Пользователи" — Foundry уже так работает
- Проблема скорее в race condition при инициализации или в том, что модуль ожидает локальный AudioEngine когда GM подключён через браузер к удалённому серверу

---

## Фаза 4: Лимит одновременных треков

Связано с: AudioEngine (project-memory.md §4), maxSimultaneousTracks setting (§6)

### Задача 4.1: Надёжный подсчёт одновременных треков
**Файл:** `src/core/AudioEngine.ts`
**Что делать:**
1. Считать по `createTrack()` вызовам, а не по `state === 'playing'` (state устанавливается async)
2. Добавить `_pendingPlayCount` счётчик: +1 при playTrack(), -1 при resolve/reject play()
3. Проверка: `playing + _pendingPlayCount >= max` → отказ
4. Текущий лимит 8 треков — оставить, это разумное значение для браузера

### Задача 4.2: Применять лимит на стороне игрока
**Файл:** `src/core/PlayerAudioEngine.ts`
**Что делать:**
1. В `handlePlay()` и `syncState()` — проверять количество активных плееров
2. Если лимит превышен → останавливать самый старый трек

---

## Фаза 5: Качество кода (по мере сил, между фазами)

### Задача 5.1: Убрать console.log DEBUG
**Файлы:** Все `src/ui/*.ts`, `src/core/*.ts`
- Заменить `console.log('[ASE DEBUG]...')` на `Logger.debug()` (project-memory.md §2)

### Задача 5.2: Устранить двойной рендер
**Файлы:** `src/ui/AdvancedSoundEngineApp.ts`, `src/ui/SoundMixerApp.ts`
- Двойная подписка на `queueManager.on('change')` → убрать одну
- Учитывать паттерны из project-memory.md §3 (Render Delegation, queue listener debounce 50ms)

### Задача 5.3: Volume broadcasts должны проверять syncEnabled
**Файл:** `src/ui/AdvancedSoundEngineApp.ts`
- Обернуть channel/master volume broadcasts в `if (this.socket.syncEnabled)`

### Задача 5.4: Убрать `any`
**Файлы:** По результатам grep на `any`
- Заменить на конкретные типы или `unknown` + type guards
- Особенно: `parentApp: any`, `(controls as any).sounds`

### Задача 5.5: Обновить project-memory.md
**Файл:** `.agent/rules/project-memory.md`
- Исправить §5: `Howler.js (underlying audio)` → `HTMLAudioElement + Web Audio API (StreamingPlayer.ts)`
- Добавить информацию о PlaybackScheduler в §4 (его нет в project-memory)
- Обновить Known Issues после исправления багов

---

## Порядок выполнения

```
Фаза 1 (Фантомный звук)     → ПЕРВЫЙ ПРИОРИТЕТ (блокирует MVP)
  1.1 → 1.2 → 1.3 → 1.4      (последовательно, каждый fix тестируем)

Фаза 2 (Стабильность sync)  → ВТОРОЙ ПРИОРИТЕТ
  2.1 → 2.2 → 2.3 → 2.4      (от простого к сложному)

Фаза 3 (Удалённый сервер)   → ТРЕТИЙ (нужна диагностика на реальном сервере)
  3.1 → потом решаем 3.2

Фаза 4 (Лимит треков)       → ЧЕТВЁРТЫЙ (ограничение в 8 уже работает)
  4.1 → 4.2

Фаза 5 (Качество)           → ПЯТЫЙ (по мере сил, между фазами)
  5.1 → 5.2 → 5.3 → 5.4 → 5.5
```

---

## Статус выполнения

| Задача | Статус | Дата | Комментарий |
|--------|--------|------|-------------|
| 1.1 | ✅ DONE | Feb 2026 | Атомарный stopAll |
| 1.2 | ✅ DONE | Feb 2026 | Race condition StreamingPlayer |
| 1.3 | ✅ DONE | Feb 2026 | Periodic sync verification |
| 1.4 | ✅ DONE | Feb 2026 | syncState() re-play guard |
| 2.1 | ⬜ TODO | — | Cleanup ресурсов |
| 2.2 | ⬜ TODO | — | Rate limiting |
| 2.3 | ⬜ TODO | — | Версионирование сообщений |
| 2.4 | ⬜ TODO | — | startTimestamp fix |
| 3.1 | ⬜ TODO | — | Диагностика загрузки |
| 3.2 | ⬜ TODO | — | Архитектурные изменения |
| 4.1 | ⬜ TODO | — | Подсчёт треков |
| 4.2 | ⬜ TODO | — | Лимит на стороне игрока |
| 5.1 | ⬜ TODO | — | console.log → Logger |
| 5.2 | ⬜ TODO | — | Двойной рендер |
| 5.3 | ⬜ TODO | — | Volume sync guard |
| 5.4 | ⬜ TODO | — | Убрать any |
| 5.5 | ⬜ TODO | — | Обновить project-memory.md |
