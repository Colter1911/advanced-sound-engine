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

    private state: AppState = {
        activeTab: 'library', // Default to library as per user focus
        syncEnabled: false
    };

    constructor(engine: AudioEngine, socket: SocketManager, libraryManager: LibraryManager, options?: Partial<ApplicationOptions>) {
        super(options);
        this.engine = engine;
        this.socket = socket;
        this.libraryManager = libraryManager;

        // Initialize sub-controllers
        // Note: We pass this app instance or handle delegation
        this.libraryApp = new LocalLibraryApp(this.libraryManager);
        this.mixerApp = new SoundMixerApp(this.engine, this.socket);
    }

    static override get defaultOptions(): ApplicationOptions {
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
        }) as ApplicationOptions;
    }

    override async getData(): Promise<any> {
        const volumes = this.engine.volumes;

        // Get content for the active tab
        // This is a bit tricky with Handlebars. We need to render the sub-template to a string.
        let tabContent = '';

        if (this.state.activeTab === 'library') {
            // We need to get the data from the library app and render its template
            const libData = await this.libraryApp.getData();
            tabContent = await renderTemplate('modules/advanced-sound-engine/templates/library.hbs', libData);
        } else if (this.state.activeTab === 'mixer') {
            const mixerData = await this.mixerApp.getData();
            tabContent = await renderTemplate(`modules/${MODULE_ID}/templates/mixer.hbs`, mixerData);
        }

        return {
            activeTab: this.state.activeTab,
            tabContent,
            volumes: {
                master: Math.round(volumes.master * 100)
            },
            syncEnabled: this.socket.syncEnabled
        };
    }

    override activateListeners(html: JQuery): void {
        super.activateListeners(html);

        // Tab Navigation
        html.find('.ase-nav-tab').on('click', this.onTabSwitch.bind(this));

        // Footer Controls (A7)
        html.find('[data-action="toggle-sync"]').on('click', this.onToggleSync.bind(this));
        html.find('[data-action="global-play"]').on('click', this.onGlobalPlay.bind(this));
        html.find('[data-action="global-pause"]').on('click', this.onGlobalPause.bind(this));
        html.find('[data-action="global-stop"]').on('click', this.onGlobalStop.bind(this));

        // Master Volume
        html.find('.master-slider').on('input', this.onMasterVolumeInput.bind(this));

        // Delegate listeners to sub-apps
        if (this.state.activeTab === 'library') {
            this.libraryApp.activateListeners(html); // CAUTION: This might attach listeners to the whole window.
            // LocalLibraryApp needs to be careful not to rely on `this.element` being the root if it assumes specific scoping.
            // Since we inject the HTML, `html` here covers the whole window. `LocalLibraryApp` selectors should be specific enough.
        } else if (this.state.activeTab === 'mixer') {
            this.mixerApp.activateListeners(html);
        }
    }

    private async onTabSwitch(event: JQuery.ClickEvent): Promise<void> {
        event.preventDefault();
        const tabName = $(event.currentTarget).data('tab');
        if (this.state.activeTab === tabName) return;

        this.state.activeTab = tabName;
        this.render(true); // Re-render the whole app to switch tabs
    }

    // Footer Actions
    private onToggleSync(event: JQuery.ClickEvent): void {
        const enabled = !this.socket.syncEnabled;
        this.socket.setSyncEnabled(enabled);
        this.state.syncEnabled = enabled;

        // Update UI partially if possible, or re-render
        const btn = $(event.currentTarget);
        btn.toggleClass('active', enabled);
        btn.find('.sync-text').text(`SYNC ${enabled ? 'ON' : 'OFF'}`);
    }

    private onGlobalPlay(): void {
        // Resume audio context if needed
        this.engine.resume();
        // For now, this might just unpause the active tracks?
        // Concept: "Play" button in footer usually resumes playback of the active playlist/queue
        // If nothing is playing, it might do nothing.
        // For now, let's treat it as "Resume All"
        // TODO: Implement queue logic
        Logger.debug('Global Play Clicked');
    }

    private onGlobalPause(): void {
        // Pause all
        // this.engine.pauseAll(); // Assuming engine has this?
        Logger.debug('Global Pause Clicked');
    }

    private onGlobalStop(): void {
        this.engine.stopAll();
        // this.socket.broadcastStopAll(); // Logic handled in SoundMixerApp usually
        this.render(); // Update UI
    }

    private onMasterVolumeInput(event: JQuery.TriggeredEvent): void {
        const value = parseFloat((event.target as HTMLInputElement).value) / 100;
        this.engine.setMasterVolume(value);
        this.socket.broadcastChannelVolume('master', value);
        $(event.currentTarget).siblings('.value-text').text(`${Math.round(value * 100)}%`);
    }
}
