import { AudioEngine } from '@core/AudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { LibraryManager } from '@lib/LibraryManager';
import { PlaybackQueueManager } from '@queue/PlaybackQueueManager';
import { LocalLibraryApp } from './LocalLibraryApp';
import { SoundMixerApp } from './SoundMixerApp';
import { SoundEffectsApp } from './SoundEffectsApp';
import { Logger } from '@utils/logger';

const MODULE_ID = 'advanced-sound-engine';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface AppState {
    activeTab: 'mixer' | 'library' | 'online' | 'sfx';
    syncEnabled: boolean;
}

export class AdvancedSoundEngineApp extends HandlebarsApplicationMixin(ApplicationV2) {
    private engine: AudioEngine;
    private socket: SocketManager;
    private libraryManager: LibraryManager;
    private queueManager: PlaybackQueueManager;

    // Sub-apps (Controllers)
    private libraryApp: LocalLibraryApp;
    private mixerApp: SoundMixerApp;
    private effectsApp: SoundEffectsApp;

    public state: AppState = {
        activeTab: 'library', // Default to library as per user focus
        syncEnabled: false
    };

    /**
     * Define the templates used by this application.
     * In V2, we define parts rather than a single template.
     */
    static override PARTS = {
        main: {
            template: `modules/${MODULE_ID}/templates/main-app.hbs`,
            scrollable: ['.ase-content-body']
        }
    };

    static override DEFAULT_OPTIONS = {
        id: 'advanced-sound-engine-app',
        tag: 'form',
        window: {
            title: 'Advanced Sound Engine',
            icon: 'fas fa-music',
            resizable: true,
            controls: []
        },
        position: {
            width: 1440,
            height: 1050
        },
        classes: ['ase-window-layout']
    };

    constructor(engine: AudioEngine, socket: SocketManager, libraryManager: LibraryManager, queueManager: PlaybackQueueManager, options: any = {}) {
        super(options);
        this.engine = engine;
        this.socket = socket;
        this.libraryManager = libraryManager;
        this.queueManager = queueManager;

        // Initialize sub-controllers
        this.libraryApp = new LocalLibraryApp(this.libraryManager, this);
        this.mixerApp = new SoundMixerApp(this.engine, this.socket, this.libraryManager, this.queueManager);
        this.effectsApp = new SoundEffectsApp(this.engine, this.socket, this.libraryManager.storage);

        // Set render callback for mixer to trigger parent re-render
        this.mixerApp.setRenderCallback(() => {
            if (this.state.activeTab === 'mixer') {
                this.render({ parts: ['main'] });
            }
        });

        this.effectsApp.setRenderCallback(() => {
            if (this.state.activeTab === 'sfx') {
                this.render({ parts: ['main'] });
            }
        });

        // Subscribe to queue changes for UI updates
        this.queueManager.on('change', () => {
            if (this.state.activeTab === 'mixer') {
                this.render({ parts: ['main'] });
            }
        });
    }

    /**
     * V2 Context Preparation (replaces getData)
     */
    protected override async _prepareContext(options: any): Promise<any> {
        const volumes = this.engine.volumes;

        // Helper to check channel status
        const getChannelStatus = (group: 'music' | 'ambience' | 'sfx') => {
            const tracks = this.engine.getTracksByGroup(group);
            if (tracks.length === 0) return { playing: false, paused: false };

            const isPlaying = tracks.some(t => t.state === 'playing');
            const isPaused = tracks.some(t => t.state === 'paused');

            return { playing: isPlaying, paused: isPaused && !isPlaying };
        };

        const status = {
            music: getChannelStatus('music'),
            ambience: getChannelStatus('ambience'),
            sfx: getChannelStatus('sfx')
        };

        // Get content for the active tab manually (legacy support for sub-apps returning data)
        const renderTemplate = foundry.applications.handlebars.renderTemplate; // V13 Compatibility

        let tabContent = '';
        if (this.state.activeTab === 'library') {
            const libData = await this.libraryApp.getData();
            tabContent = await renderTemplate('modules/advanced-sound-engine/templates/library.hbs', libData as any);
        } else if (this.state.activeTab === 'mixer') {
            const mixerData = await this.mixerApp.getData();
            tabContent = await renderTemplate(`modules/${MODULE_ID}/templates/mixer.hbs`, mixerData as any);
        } else if (this.state.activeTab === 'sfx') {
            Logger.info(`[AdvancedSoundEngineApp] Rendering SFX tab...`);
            const effectsData = await this.effectsApp.getData();
            tabContent = await renderTemplate(`modules/${MODULE_ID}/templates/effects.hbs`, effectsData as any);
        }

        return {
            activeTab: this.state.activeTab,
            tabContent,
            status,
            volumes: {
                master: Math.round(volumes.master * 100),
                music: Math.round(volumes.music * 100),
                ambience: Math.round(volumes.ambience * 100),
                sfx: Math.round(volumes.sfx * 100)
            },
            syncEnabled: this.socket.syncEnabled,
            // Pass state for Handlebars if needed
            tabs: [
                { id: 'library', label: 'Library', icon: 'fas fa-book-open', active: this.state.activeTab === 'library' },
                { id: 'mixer', label: 'Mixer', icon: 'fas fa-sliders-h', active: this.state.activeTab === 'mixer' },
                { id: 'sfx', label: 'Effects', icon: 'fas fa-wave-square', active: this.state.activeTab === 'sfx' },
                { id: 'online', label: 'Online', icon: 'fas fa-globe', active: this.state.activeTab === 'online' }
            ]
        };
    }

    /**
     * V2 Render Hook (replaces activateListeners)
     * Note: In V2, `this.element` is the HTML element itself, not a jQuery object.
     * However, we wrap it in jQuery for compatibility with existing listener logic if preferred, 
     * or use vanilla JS. Sticking to jQuery for now to minimize logic rewrite risks.
     */
    protected override _onRender(context: any, options: any): void {
        Logger.info(`[AdvancedSoundEngineApp] _onRender called. Active Tab: ${this.state.activeTab}`);
        super._onRender(context, options);

        // Wrap native element in jQuery for legacy compatibility
        const html = $(this.element);

        // Tab Navigation
        html.find('.ase-tab').on('click', this.onTabSwitch.bind(this));

        // Footer Controls (A7)
        html.find('[data-action="toggle-sync"]').on('click', this.onToggleSync.bind(this));
        html.find('[data-action="global-play"]').on('click', this.onGlobalPlay.bind(this));
        html.find('[data-action="global-pause"]').on('click', this.onGlobalPause.bind(this));
        html.find('[data-action="global-stop"]').on('click', this.onGlobalStop.bind(this));

        // Mixer Sliders (Inputs)
        html.find('.ase-volume-slider').on('input', this.onVolumeInput.bind(this));

        // Delegate listeners to sub-apps
        if (this.state.activeTab === 'library') {
            this.libraryApp.activateListeners(html);
        } else if (this.state.activeTab === 'mixer') {
            this.mixerApp.activateListeners(html);
        } else if (this.state.activeTab === 'sfx') {
            Logger.info('[AdvancedSoundEngineApp] Delegating to effectsApp.activateListeners');
            this.effectsApp.activateListeners(html);
        }

        // Restore Scroll 
        // V2 has native `scrollable` support in `PARTS`, but for complex intra-tab scrolling we might still need this manual handling
        if (this.state.activeTab === 'library') {
            if (this.persistScrollOnce) {
                const scrollState = { ...this._scrollLibrary };
                this.persistScrollOnce = false;

                // Use setTimeout to ensure DOM is fully painted/layout is calculated
                setTimeout(() => {
                    const tracksList = html.find('.ase-track-player-list');
                    const playlistList = html.find('.ase-list-group').first();
                    const favList = html.find('.ase-favorites-section .ase-list-group');

                    if (tracksList.length) tracksList.scrollTop(scrollState.tracks);
                    if (playlistList.length) playlistList.scrollTop(scrollState.playlists);
                    if (favList.length) favList.scrollTop(scrollState.favorites);

                    Logger.info(`[SmartScroll] Restored scroll (delayed): Tracks=${scrollState.tracks}`);
                }, 1);
            }
        }
    }

    public persistScrollOnce = false;
    private _scrollLibrary = { tracks: 0, playlists: 0, favorites: 0 };

    /**
     * V2 Close Hook
     */
    protected override _onClose(options: any): void {
        super._onClose(options);
        // Any cleanup if needed
    }

    // ─────────────────────────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────────────────────────

    private async onTabSwitch(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();
        const tabName = $(event.currentTarget).data('tab');
        if (this.state.activeTab === tabName) return;

        // Before switching, save scroll if leaving library (optional, or just reset)
        if (this.state.activeTab === 'library') {
            const html = $(this.element);
            this._scrollLibrary.tracks = html.find('.ase-track-player-list').scrollTop() || 0;
            this._scrollLibrary.playlists = html.find('.ase-list-group').first().scrollTop() || 0;
        }

        this.state.activeTab = tabName;
        this.render({ parts: ['main'] });
    }

    /**
     * Captures the current scroll positions of the library tab.
     * Call this before triggering a re-render if you want to restore scroll afterwards.
     * Sets persistScrollOnce to true automatically.
     */
    public captureLibraryScroll(): void {
        if (this.state.activeTab !== 'library') return;

        const html = $(this.element);
        this._scrollLibrary.tracks = html.find('.ase-track-player-list').scrollTop() || 0;
        this._scrollLibrary.playlists = html.find('.ase-list-group').first().scrollTop() || 0;
        this._scrollLibrary.favorites = html.find('.ase-favorites-section .ase-list-group').scrollTop() || 0;

        Logger.info(`[SmartScroll] Captured scroll: Tracks=${this._scrollLibrary.tracks}`);
        this.persistScrollOnce = true;
    }

    private onToggleSync(event: JQuery.ClickEvent): void {
        const enabled = !this.socket.syncEnabled;
        this.socket.setSyncEnabled(enabled);
        this.state.syncEnabled = enabled;
        this.render();
    }

    private async onGlobalPlay(): Promise<void> {
        this.engine.resume();
        const tracks = this.engine.getAllTracks();

        console.log('[ASE DEBUG] Global Play clicked, found', tracks.length, 'tracks');

        for (const track of tracks) {
            if (track.state === 'paused') {
                const offset = track.getCurrentTime();
                console.log('[ASE DEBUG] Resuming paused track:', track.id, 'at offset:', offset);
                await track.play(offset);

                // Broadcast to players
                if (this.socket.syncEnabled) {
                    console.log('[ASE DEBUG] Broadcasting track play for:', track.id);
                    this.socket.broadcastTrackPlay(track.id, offset);
                }
            }
        }

        Logger.debug('Global Play/Resume Clicked');
        this.render();
    }

    private onGlobalPause(): void {
        console.log('[ASE DEBUG] Global Pause clicked');
        const tracks = this.engine.getAllTracks();
        for (const track of tracks) {
            if (track.state === 'playing') {
                const currentTime = track.getCurrentTime();
                track.pause();
                // Sync if enabled
                if (this.socket.syncEnabled) {
                    console.log('[ASE DEBUG] Global Pause broadcasting for track:', track.id, 'at', currentTime);
                    this.socket.broadcastTrackPause(track.id, currentTime);
                }
            }
        }
        Logger.debug('Global Pause Clicked');
        this.render();
    }

    private onGlobalStop(): void {
        this.engine.stopAll();
        if (this.socket.syncEnabled) {
            this.socket.broadcastStopAll();
        }
        this.render();
    }

    private onVolumeInput(event: JQuery.TriggeredEvent): void {
        const input = event.currentTarget as HTMLInputElement;
        const value = parseFloat(input.value) / 100;
        const channel = $(input).data('channel') as 'music' | 'ambience' | 'sfx' | undefined;

        if (channel) {
            this.engine.setChannelVolume(channel, value);
            this.socket.broadcastChannelVolume(channel, value);
        } else {
            this.engine.setMasterVolume(value);
            this.socket.broadcastChannelVolume('master', value);
        }

        $(input).siblings('.ase-percentage').text(`${Math.round(value * 100)}%`);
        $(input).siblings('.ase-master-perc').text(`${Math.round(value * 100)}%`);
    }
}
