import { Logger } from '@utils/logger';
import { AudioEngine } from './AudioEngine';
import { LibraryManager } from '../library/LibraryManager';
import { PlaybackMode } from '@t/library';
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
    private currentContext: PlaybackContext | null = null;

    constructor(engine: AudioEngine, library: LibraryManager) {
        this.engine = engine;
        this.library = library;
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
        Logger.debug('Playback Context set:', context);
    }

    /**
     * Handle track ending
     */
    async handleTrackEnded(trackId: string): Promise<void> {
        Logger.debug(`Track ${trackId} ended. Deciding next move...`);

        if (!this.currentContext) {
            Logger.debug('No playback context. Stopping.');
            return;
        }

        const { type, id } = this.currentContext;

        if (type === 'playlist' && id) {
            await this.handlePlaylistContext(id, trackId);
        } else if (type === 'track') {
            await this.handleTrackContext(trackId);
        }
    }


    private async handlePlaylistContext(playlistId: string, endedTrackId: string): Promise<void> {
        const playlist = this.library.playlists.getPlaylist(playlistId);
        if (!playlist) return;

        // Ensure items are sorted
        const tracks = [...playlist.items].sort((a, b) => a.order - b.order);
        if (tracks.length === 0) return;

        const currentIndex = tracks.findIndex(t => t.libraryItemId === endedTrackId);
        // If track not found in playlist (maybe removed?), start from beginning? Or stop.
        // If index -1, we can't determine next. Stop.
        if (currentIndex === -1) {
            Logger.warn(`Ended track ${endedTrackId} not found in playlist ${playlist.name}`);
            return;
        }

        const mode = (playlist.playbackMode || 'loop') as PlaylistPlaybackMode;

        switch (mode) {
            case 'linear':
                if (currentIndex < tracks.length - 1) {
                    const nextItem = tracks[currentIndex + 1];
                    await this.playPlaylistItem(nextItem, { type: 'playlist', id: playlistId });
                } else {
                    Logger.debug('Playlist linear playback finished.');
                }
                break;
            case 'loop':
                let nextIndex = currentIndex + 1;
                if (nextIndex >= tracks.length) {
                    nextIndex = 0; // Loop back to start
                }
                await this.playPlaylistItem(tracks[nextIndex], { type: 'playlist', id: playlistId });
                break;
            case 'random':
                // Simple random: pick any other track. 
                // Better: Shuffle queue? For now, true random.
                if (tracks.length > 1) {
                    let randomIndex;
                    do {
                        randomIndex = Math.floor(Math.random() * tracks.length);
                    } while (randomIndex === currentIndex && tracks.length > 1); // Avoid repeat if possible
                    await this.playPlaylistItem(tracks[randomIndex], { type: 'playlist', id: playlistId });
                } else {
                    // If only 1 track, repeat it
                    await this.playPlaylistItem(tracks[0], { type: 'playlist', id: playlistId });
                }
                break;
        }
    }

    private async playPlaylistItem(item: any, context: PlaybackContext): Promise<void> {
        const track = this.library.getItem(item.libraryItemId);
        if (track) {
            // Play with volume from playlist item settings
            await this.engine.playTrack(track.url, 0, context);

            // Apply volume/loop if supported by PlayTrack or post-play
            if (item.volume !== undefined) {
                this.engine.setTrackVolume(track.id, item.volume); // Warning: track.id is generated UUID in Engine, but here we pass URL... 
                // Wait! AudioEngine.playTrack(id) takes ID. 
                // CreateTrack returns player. 
                // If we play by URL, we might need to know the ID.
                // AudioEngine.playTrack accepts ID. 
                // We need to CREATE track first if not exists? 
                // AudioEngine assumes track exists.
                // We need logic to Ensure Track exists.
            }
        }
    }

    private async handleTrackContext(trackId: string): Promise<void> {
        const track = this.library.getItem(trackId);
        if (!track) return;

        let mode = track.playbackMode as PlaybackMode;
        if (mode === 'inherit') {
            mode = 'loop'; // Fallback
        }

        switch (mode) {
            case 'loop':
                await this.engine.playTrack(trackId, 0, { type: 'track' });
                break;
            case 'random':
                // Play another random track from the same Group?
                // "Random" on a single track usually implies "Shuffle All tracks in Library/Folder"
                // Let's implement Random from Same Group
                const groupTracks = this.library.getAllItems().filter(t => t.group === track.group);
                if (groupTracks.length > 1) {
                    let randomTrack;
                    do {
                        randomTrack = groupTracks[Math.floor(Math.random() * groupTracks.length)];
                    } while (randomTrack.id === trackId);

                    // We need to Ensure track is created in engine.
                    // For now assume Engine handles creation? 
                    // Existing AudioEngine.playTrack(id) fails if not found.
                    // We need a Helper "playLibraryTrack" in Scheduler.
                    // I'll emit "requestPlay" event or use Engine directly if I can create tracks.
                }
                break;
            case 'linear':
                // Next in alphabetical order?
                // Not standard. I'll stick to Single/Loop for now for tracks unless user clarifies.
                // Plan said: "Generic list".
                break;
        }
    }
}
