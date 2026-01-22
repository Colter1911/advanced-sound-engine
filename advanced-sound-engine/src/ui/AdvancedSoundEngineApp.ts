import { AudioEngine } from '@core/AudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { LibraryManager } from '@lib/LibraryManager';
import { LocalLibraryApp } from './LocalLibraryApp';
import { SoundMixerApp } from './SoundMixerApp';
import { Logger } from '@utils/logger';

const MODULE_ID = 'advanced-sound-engine';

interface AppState {
    activeTab: 'mixer' | 'library' | 'online' | 'sfx';
    syncEnabled: boolean;
}

export class AdvancedSoundEngineApp extends Application {
    private engine: AudioEngine;
    private socket: SocketManager;
    private libraryManager: LibraryManager;

    // Sub-apps (Controllers)
    private libraryApp: LocalLibraryApp;
    private mixerApp: SoundMixerApp; // We might need to refactor this later, but for now we'll wrap it

    public state: AppState = {
        activeTab: 'library', // Default to library as per user focus
        syncEnabled: false
    };

    constructor(engine: AudioEngine, socket: SocketManager, libraryManager: LibraryManager, options: any = {}) {
        super(options);
        this.engine = engine;
        this.socket = socket;
        this.libraryManager = libraryManager;

        // Initialize sub-controllers
        // Note: We pass this app instance or handle delegation
        this.libraryApp = new LocalLibraryApp(this.libraryManager, this);
        this.mixerApp = new SoundMixerApp(this.engine, this.socket);
    }

    static override get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'advanced-sound-engine-app',
            title: 'Advanced Sound Engine',
            template: `modules/${MODULE_ID}/templates/main-app.hbs`,
            width: 1200, // Wider for the concepts
            height: 800,
            classes: ['ase-window-layout'],
            resizable: true,
            popOut: true,
            tabs: [] // We handle tabs manually
        }) as any;
    }

    override async getData(): Promise<any> {
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

        // Get content for the active tab
        let tabContent = '';
        if (this.state.activeTab === 'library') {
            const libData = await this.libraryApp.getData();
            tabContent = await renderTemplate('modules/advanced-sound-engine/templates/library.hbs', libData as any);
        } else if (this.state.activeTab === 'mixer') {
            const mixerData = await this.mixerApp.getData();
            tabContent = await renderTemplate(`modules/${MODULE_ID}/templates/mixer.hbs`, mixerData as any);
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
            syncEnabled: this.socket.syncEnabled
        };
    }

    public persistScrollOnce = false;
    private _scrollLibrary = { tracks: 0, playlists: 0, favorites: 0 };

    protected override async _render(force?: boolean, options?: any): Promise<void> {
        // Save Scroll (only if explicitly requested via flag)
        if (this.state.activeTab === 'library' && this.persistScrollOnce && this.element && this.element.length) {
            const trackScroll = this.element.find('.ase-track-player-list').scrollTop() || 0;
            if (trackScroll > 0) this._scrollLibrary.tracks = trackScroll;

            this._scrollLibrary.playlists = this.element.find('.ase-list-group').first().scrollTop() || 0;
            this._scrollLibrary.favorites = this.element.find('.ase-favorites-section .ase-list-group').scrollTop() || 0;
        }

        await super._render(force, options);

        // Restore or Reset Scroll
        if (this.state.activeTab === 'library') {
            const el = this.element;
            if (el && el.length) {
                if (this.persistScrollOnce) {
                    el.find('.ase-track-player-list').scrollTop(this._scrollLibrary.tracks);
                    el.find('.ase-list-group').first().scrollTop(this._scrollLibrary.playlists);
                    el.find('.ase-favorites-section .ase-list-group').scrollTop(this._scrollLibrary.favorites);
                    this.persistScrollOnce = false;
                } else {
                    // Explicit reset to 0
                    el.find('.ase-track-player-list').scrollTop(0);
                    el.find('.ase-list-group').first().scrollTop(0);
                    el.find('.ase-favorites-section .ase-list-group').scrollTop(0);
                }
            }
        }
    }

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

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
        }
    }

    private async onTabSwitch(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();
        const tabName = $(event.currentTarget).data('tab');
        if (this.state.activeTab === tabName) return;

        this.state.activeTab = tabName;
        this.render(true);
    }

    // Footer Actions
    private onToggleSync(event: JQuery.ClickEvent): void {
        const enabled = !this.socket.syncEnabled;
        this.socket.setSyncEnabled(enabled);
        this.state.syncEnabled = enabled;

        // Update UI
        this.render(); // Re-render to ensure all sync indicators update (button + toggle)
    }

    private onGlobalPlay(): void {
        this.engine.resume();
        // Resume all paused tracks
        // TODO: This logic probably belongs in AudioEngine as resumeAll()
        const tracks = this.engine.getAllTracks();
        for (const track of tracks) {
            if (track.state === 'paused') {
                track.play();
            }
        }
        Logger.debug('Global Play/Resume Clicked');
        this.render();
    }

    private onGlobalPause(): void {
        // Pause all playing tracks
        const tracks = this.engine.getAllTracks();
        for (const track of tracks) {
            if (track.state === 'playing') {
                track.pause();
            }
        }
        Logger.debug('Global Pause Clicked');
        this.render();
    }

    private onGlobalStop(): void {
        this.engine.stopAll();
        // this.socket.broadcastStopAll(); // Logic handled in SoundMixerApp usually
        this.render(); // Update UI
    }

    private onVolumeInput(event: JQuery.TriggeredEvent): void {
        const input = event.currentTarget as HTMLInputElement;
        const value = parseFloat(input.value) / 100;
        const channel = $(input).data('channel') as 'music' | 'ambience' | 'sfx' | undefined;

        if (channel) {
            this.engine.setChannelVolume(channel, value);
            this.socket.broadcastChannelVolume(channel, value);
        } else {
            // Master
            this.engine.setMasterVolume(value);
            this.socket.broadcastChannelVolume('master', value);
        }

        // Update text locally for responsiveness
        $(input).siblings('.ase-percentage').text(`${Math.round(value * 100)}%`);
        $(input).siblings('.ase-master-perc').text(`${Math.round(value * 100)}%`);
    }
}
