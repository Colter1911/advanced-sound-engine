import { Logger } from '@utils/logger';
import { AudioEngine } from './AudioEngine';
import { LibraryManager } from '../library/LibraryManager';
import { PlaybackMode } from '@t/library';
import type { PlaybackQueueManager } from '../queue/PlaybackQueueManager';
// Define a local type alias if import fails or just use string literal union if types are tricky to resolve in this hybrid env
type PlaylistPlaybackMode = 'linear' | 'loop' | 'random';

export interface PlaybackContext {
    type: 'playlist' | 'track' | 'queue';
    id?: string; // Playlist ID or specific context ID
    playbackMode?: PlaybackMode | PlaylistPlaybackMode;
}

export class PlaybackScheduler {
    private engine: AudioEngine;
    private library: LibraryManager;
    private queue: PlaybackQueueManager;
    private currentContext: PlaybackContext | null = null;
    private _stopped: boolean = false;

    constructor(engine: AudioEngine, library: LibraryManager, queue: PlaybackQueueManager) {
        this.engine = engine;
        this.library = library;
        this.queue = queue;
        this.setupListeners();
    }

    private setupListeners(): void {
        // We need AudioEngine to emit 'trackEnded'. 
        // Since AudioEngine extends EventTarget or similar, we'll hook into it.
        // For now, assuming AudioEngine has an event emitter or we inject this listener.
        // If AudioEngine doesn't support events yet, we will need to modify it.

        // Placeholder for event subscription
        // this.engine.on('trackEnded', this.handleTrackEnded.bind(this));
        this.engine.on('trackEnded', (trackId: string) => {
            this.handleTrackEnded(trackId);
        });

        this.engine.on('contextChanged', (context: PlaybackContext) => {
            this.setContext(context);
        });
    }

    /**
     * Set the current playback context (e.g., user clicked "Play" on a playlist)
     */
    setContext(context: PlaybackContext): void {
        this.currentContext = context;
        this._stopped = false;
        Logger.debug('Playback Context set:', context);
    }

    /**
     * Clear the playback context and stop scheduling.
     * Called by AudioEngine.stopAll() to prevent race conditions
     * where an 'ended' event fires after stopAll and Scheduler starts the next track.
     */
    clearContext(): void {
        this.currentContext = null;
        this._stopped = true;
        Logger.debug('Playback Context cleared (stopAll)');
    }

    /**
     * Handle track ending
     */
    async handleTrackEnded(trackId: string): Promise<void> {
        Logger.info(`[PlaybackScheduler] Track ended: ${trackId}`);

        // Guard: if stopAll() was called, ignore any late 'ended' events
        if (this._stopped) {
            Logger.debug(`[PlaybackScheduler] Ignoring ended event after stopAll for: ${trackId}`);
            return;
        }

        Logger.info(`[PlaybackScheduler] Current context:`, this.currentContext);

        if (!this.currentContext) {
            Logger.warn('[PlaybackScheduler] No playback context available - auto-progression disabled');
            return;
        }

        const { type, id } = this.currentContext;
        Logger.info(`[PlaybackScheduler] Context type: ${type}, id: ${id || 'none'}, mode: ${this.currentContext.playbackMode}`);

        if (type === 'playlist' && id) {
            Logger.info(`[PlaybackScheduler] Handling playlist context: ${id}`);
            await this.handlePlaylistContext(id, trackId);
        } else if (type === 'track') {
            Logger.info(`[PlaybackScheduler] Handling track context`);
            await this.handleTrackContext(trackId);
        }
    }


    private async handlePlaylistContext(playlistId: string, endedTrackId: string): Promise<void> {
        const playlist = this.library.playlists.getPlaylist(playlistId);
        if (!playlist) {
            Logger.warn(`Playlist ${playlistId} not found`);
            return;
        }

        // Ensure items are sorted
        const tracks = [...playlist.items].sort((a, b) => a.order - b.order);
        if (tracks.length === 0) {
            Logger.warn(`Playlist ${playlist.name} is empty`);
            return;
        }

        // Find current track by libraryItemId (AudioEngine uses libraryItemId as track ID)
        const currentIndex = tracks.findIndex(t => t.libraryItemId === endedTrackId);

        if (currentIndex === -1) {
            Logger.warn(`Ended track ${endedTrackId} not found in playlist ${playlist.name}`);
            return;
        }

        // Проверить индивидуальный режим трека
        const track = this.library.getItem(endedTrackId);
        if (!track) {
            Logger.warn(`Track ${endedTrackId} not found in library`);
            return;
        }

        // Если у трека свой режим (не inherit), обработать его индивидуально
        if (track.playbackMode && track.playbackMode !== 'inherit') {
            Logger.info(`Track ${track.name} has individual mode: ${track.playbackMode}`);
            await this.handleIndividualTrackMode(endedTrackId, track.playbackMode as PlaybackMode, playlistId);
            return; // Не продолжать логику плейлиста
        }

        // Трек наследует режим плейлиста
        Logger.debug(`Track ${track.name} inherits playlist mode`);
        const mode = (playlist.playbackMode || 'loop') as PlaylistPlaybackMode;
        Logger.debug(`Playlist mode: ${mode}, current index: ${currentIndex}/${tracks.length}`);

        switch (mode) {
            case 'linear':
                if (currentIndex < tracks.length - 1) {
                    const nextItem = tracks[currentIndex + 1];
                    // Остановить текущий трек перед запуском следующего
                    await this.engine.stopTrack(endedTrackId);
                    await this.playPlaylistItem(nextItem, playlistId, playlist.playbackMode);
                } else {
                    Logger.debug('Playlist linear playback finished.');
                    // Очистить контекст после завершения
                    await this.engine.stopTrack(endedTrackId);
                    this.currentContext = null;
                }
                break;
            case 'loop':
                let nextIndex = currentIndex + 1;
                if (nextIndex >= tracks.length) {
                    nextIndex = 0; // Loop back to start
                }
                // Остановить текущий трек перед запуском следующего
                await this.engine.stopTrack(endedTrackId);
                await this.playPlaylistItem(tracks[nextIndex], playlistId, playlist.playbackMode);
                break;
            case 'random':
                // Остановить текущий трек перед запуском следующего
                await this.engine.stopTrack(endedTrackId);

                // Simple random: pick any other track. 
                if (tracks.length > 1) {
                    let randomIndex;
                    do {
                        randomIndex = Math.floor(Math.random() * tracks.length);
                    } while (randomIndex === currentIndex && tracks.length > 1); // Avoid repeat if possible
                    await this.playPlaylistItem(tracks[randomIndex], playlistId, playlist.playbackMode);
                } else {
                    // If only 1 track, repeat it
                    await this.playPlaylistItem(tracks[0], playlistId, playlist.playbackMode);
                }
                break;
        }
    }

    /**
     * Воспроизвести элемент плейлиста
     * @param item - Элемент плейлиста
     * @param playlistId - ID плейлиста
     * @param playlistMode - Режим воспроизведения плейлиста
     */
    private async playPlaylistItem(item: any, playlistId: string, playlistMode: string): Promise<void> {
        const track = this.library.getItem(item.libraryItemId);
        if (!track) {
            Logger.warn(`Track ${item.libraryItemId} not found in library`);
            return;
        }

        Logger.debug(`Playing playlist item: ${track.name}`);

        // Проверить, существует ли трек в AudioEngine
        let player = this.engine.getTrack(track.id);

        // Создать трек, если не существует
        if (!player) {
            player = await this.engine.createTrack({
                id: track.id,
                url: track.url,
                group: track.group,
                volume: item.volume !== undefined ? item.volume : 1
            });
        }

        // Создать контекст плейлиста
        const context: PlaybackContext = {
            type: 'playlist',
            id: playlistId,
            playbackMode: playlistMode as PlaylistPlaybackMode
        };

        // Воспроизвести трек с контекстом плейлиста
        await this.engine.playTrack(track.id, 0, context);

        // Notify UI about track change
        Hooks.call('ase.trackAutoSwitched' as any);
    }

    /**
     * Обработать завершение отдельного трека (не из плейлиста)
     * @param trackId - ID завершившегося трека
     */
    private async handleTrackContext(trackId: string): Promise<void> {
        const track = this.library.getItem(trackId);
        if (!track) {
            Logger.warn(`Track ${trackId} not found in library`);
            return;
        }

        let mode = track.playbackMode as PlaybackMode;

        // Если режим inherit, используем single как fallback (для одиночных треков)
        if (mode === 'inherit') {
            Logger.debug(`Track ${track.name} has inherit mode, using single as fallback`);
            mode = 'single';
        }

        Logger.debug(`Track ${track.name} playback mode: ${mode}`);

        switch (mode) {
            case 'loop':
                // Повторить тот же трек
                Logger.debug(`Looping track: ${track.name}`);
                const context: PlaybackContext = {
                    type: 'track',
                    playbackMode: 'loop'
                };
                await this.engine.playTrack(trackId, 0, context);
                break;

            case 'single':
                // Воспроизвести один раз и остановить (полный сброс)
                Logger.debug(`Track ${track.name} finished (single mode) - stopping`);
                await this.engine.stopTrack(trackId);
                this.currentContext = null;
                break;

            case 'random':
            case 'linear':
                // Для отдельных треков используем Ungrouped как виртуальный плейлист
                await this.handleUngroupedQueueContext(trackId, mode);
                break;
        }
    }

    /**
     * Обработать индивидуальный режим воспроизведения трека в контексте плейлиста
     * @param trackId - ID завершившегося трека
     * @param mode - Индивидуальный режим трека
     * @param playlistId - ID плейлиста (если контекст плейлиста)
     */
    private async handleIndividualTrackMode(trackId: string, mode: PlaybackMode, playlistId?: string): Promise<void> {
        const track = this.library.getItem(trackId);
        if (!track) {
            Logger.warn(`Track ${trackId} not found in library`);
            return;
        }

        Logger.debug(`Handling individual track mode: ${track.name} - ${mode}`);

        switch (mode) {
            case 'loop':
                // Повторить тот же трек (игнорируя логику плейлиста)
                Logger.debug(`Looping track: ${track.name}`);
                const loopContext: PlaybackContext = {
                    type: 'track',
                    playbackMode: 'loop'
                };
                await this.engine.playTrack(trackId, 0, loopContext);
                Hooks.call('ase.trackAutoSwitched' as any);
                break;

            case 'single':
                // Остановить трек полностью (перевести в Stop)
                Logger.debug(`Track ${track.name} finished (single mode) - stopping`);
                await this.engine.stopTrack(trackId);
                this.currentContext = null;
                break;

            case 'random':
                // Random для одного трека = повторить его в random режиме
                Logger.debug(`Random track: ${track.name} - repeating`);
                // Остановить перед повторным запуском (сброс UI)
                await this.engine.stopTrack(trackId);

                const randomContext: PlaybackContext = {
                    type: 'track',
                    playbackMode: 'random'
                };
                await this.engine.playTrack(trackId, 0, randomContext);
                Hooks.call('ase.trackAutoSwitched' as any);
                break;

            case 'linear':
                if (playlistId) {
                    const playlist = this.library.playlists.getPlaylist(playlistId);
                    if (playlist) {
                        const tracks = [...playlist.items].sort((a, b) => a.order - b.order);
                        const currentIndex = tracks.findIndex(t => t.libraryItemId === trackId);

                        if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
                            Logger.debug(`Track ${track.name} (linear) -> launching next track in playlist`);
                            // Остановить текущий трек перед запуском следующего
                            await this.engine.stopTrack(trackId);

                            const nextItem = tracks[currentIndex + 1];
                            await this.playPlaylistItem(nextItem, playlistId, playlist.playbackMode || 'loop');
                            return;
                        }
                    }
                }

                // Linear для одиночного трека (или конец плейлиста) = single (остановить)
                Logger.debug(`Track ${track.name} finished (linear mode) and no next track - stopping`);
                await this.engine.stopTrack(trackId);
                this.currentContext = null;
                break;

            case 'inherit':
                // Не должно попасть сюда (проверено выше)
                Logger.warn(`Unexpected inherit mode in handleIndividualTrackMode`);
                break;
        }
    }

    /**
     * Обработать Random/Linear режимы для треков в Ungrouped очереди
     * @param trackId - ID завершившегося трека
     * @param mode - Режим воспроизведения (random или linear)
     */
    private async handleUngroupedQueueContext(trackId: string, mode: 'random' | 'linear'): Promise<void> {
        // Получить все треки из очереди без playlistId (Ungrouped)
        const ungroupedTracks = this.queue.getItems().filter(item => !item.playlistId);

        if (ungroupedTracks.length === 0) {
            Logger.debug('No ungrouped tracks in queue');
            this.currentContext = null;
            return;
        }

        // Найти индекс текущего трека
        const currentIndex = ungroupedTracks.findIndex(item => item.libraryItemId === trackId);

        if (currentIndex === -1) {
            Logger.warn(`Track ${trackId} not found in ungrouped queue`);
            this.currentContext = null;
            return;
        }

        Logger.debug(`Ungrouped queue mode: ${mode}, current index: ${currentIndex}/${ungroupedTracks.length}`);

        let nextTrack = null;

        if (mode === 'linear') {
            // Следующий трек в порядке очереди
            if (currentIndex < ungroupedTracks.length - 1) {
                nextTrack = ungroupedTracks[currentIndex + 1];
                Logger.debug(`Linear: playing next track in ungrouped queue`);
            } else {
                Logger.debug('Ungrouped linear playback finished');
                this.currentContext = null;
                return;
            }
        } else if (mode === 'random') {
            // Случайный трек из ungrouped очереди
            if (ungroupedTracks.length > 1) {
                let randomIndex;
                do {
                    randomIndex = Math.floor(Math.random() * ungroupedTracks.length);
                } while (randomIndex === currentIndex && ungroupedTracks.length > 1);
                nextTrack = ungroupedTracks[randomIndex];
                Logger.debug(`Random: selected track at index ${randomIndex}`);
            } else {
                // Только один трек - повторить его
                nextTrack = ungroupedTracks[0];
                Logger.debug('Random: only one track, repeating it');
            }
        }

        if (!nextTrack) {
            this.currentContext = null;
            return;
        }

        // Получить данные трека из библиотеки
        const libraryItem = this.library.getItem(nextTrack.libraryItemId);
        if (!libraryItem) {
            Logger.warn(`Track ${nextTrack.libraryItemId} not found in library`);
            this.currentContext = null;
            return;
        }

        // Проверить, существует ли трек в AudioEngine
        let player = this.engine.getTrack(libraryItem.id);

        // Создать трек, если не существует
        if (!player) {
            player = await this.engine.createTrack({
                id: libraryItem.id,
                url: libraryItem.url,
                group: libraryItem.group,
                volume: 1
            });
        }

        // Создать контекст трека
        const context: PlaybackContext = {
            type: 'track',
            playbackMode: mode
        };

        // Воспроизвести следующий трек
        await this.engine.playTrack(libraryItem.id, 0, context);

        // Notify UI about track change
        Hooks.call('ase.trackAutoSwitched' as any);
    }
}
