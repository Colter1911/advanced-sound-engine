console.log("ADVANCED SOUND ENGINE: Entry point loaded");
import '../styles/sound-engine.scss';
import { AudioEngine } from '@core/AudioEngine';
import { PlayerAudioEngine } from '@core/PlayerAudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { SoundMixerApp } from '@ui/SoundMixerApp';
import { PlayerVolumePanel } from '@ui/PlayerVolumePanel';
import { LocalLibraryApp } from '@ui/LocalLibraryApp';
import { AdvancedSoundEngineApp } from '@ui/AdvancedSoundEngineApp';
import { LibraryManager } from '@lib/LibraryManager';
import { PlaybackQueueManager } from './queue/PlaybackQueueManager';
import { Logger } from '@utils/logger';
import { PlaybackScheduler } from '@core/PlaybackScheduler';

const MODULE_ID = 'advanced-sound-engine';

// GM
let gmEngine: AudioEngine | null = null;
let mainApp: AdvancedSoundEngineApp | null = null;
let libraryManager: LibraryManager | null = null;
let queueManager: PlaybackQueueManager | null = null;
let playbackScheduler: PlaybackScheduler | null = null;

// Player
let playerEngine: PlayerAudioEngine | null = null;
let volumePanel: PlayerVolumePanel | null = null;

// Shared
let socketManager: SocketManager | null = null;

declare global {
  interface Window {
    ASE: {
      isGM: boolean;
      openPanel: (tab?: string, forceRender?: boolean) => void;
      openLibrary?: () => void;
      engine?: AudioEngine | PlayerAudioEngine;
      socket?: SocketManager;
      library?: LibraryManager;
      queue?: PlaybackQueueManager;
    };
  }
}



// Add button to scene controls
// Add button to scene controls
// Add button to scene controls
Hooks.on('getSceneControlButtons', (controls: SceneControl[]) => {
  try {
    const isGM = game.user?.isGM ?? false;

    const aseTools: SceneControlTool[] = [
      {
        name: 'ase-open-mixer',
        title: isGM ? 'Open Sound Mixer' : 'Open Sound Volume',
        icon: isGM ? 'fas fa-sliders-h' : 'fas fa-volume-up',
        button: true,
        onClick: () => {
          Logger.debug('Button clicked: Open Mixer/Volume');
          if (window.ASE) {
            window.ASE.openPanel();
          } else {
            Logger.error('Window.ASE is undefined!');
          }
        }
      }
    ];

    if (isGM) {
      aseTools.push({
        name: 'ase-open-library',
        title: 'Open Sound Library',
        icon: 'fas fa-book-open',
        button: true,
        onClick: () => {
          Logger.debug('Button clicked: Open Library');
          if (window.ASE && window.ASE.openLibrary) {
            window.ASE.openLibrary();
          } else {
            Logger.error('Window.ASE or openLibrary undefined');
          }
        }
      });
    }

    // V13+ Compatibility: controls might be an object/record instead of an array
    if (!Array.isArray(controls) && typeof controls === 'object' && controls !== null) {
      Logger.info('Detected non-array controls structure (V13?)');

      // Check if "sounds" exists as a property
      const soundsLayer = (controls as any).sounds;

      if (soundsLayer && Array.isArray(soundsLayer.tools)) {
        soundsLayer.tools.push(...aseTools);
        Logger.info('Added tools to "sounds" layer (V13 Object Mode)');
      } else {
        // Fallback: Add as a new property
        (controls as any)['advanced-sound-engine'] = {
          name: 'advanced-sound-engine',
          title: 'Advanced Sound Engine',
          icon: 'fas fa-music',
          visible: true,
          tools: aseTools
        };
        Logger.info('Created dedicated control group (V13 Object Mode)');
      }
      return;
    }

    // V10-V12 Compatibility: controls is an array
    if (Array.isArray(controls)) {
      // Try to find the "sounds" layer control group
      const soundsLayer = controls.find((c: SceneControl) => c.name === 'sounds');

      if (soundsLayer) {
        // Add our tools to the existing sounds layer
        soundsLayer.tools.push(...aseTools);
      } else {
        // Fallback: Create a dedicated group if "sounds" layer is missing
        controls.push({
          name: 'advanced-sound-engine',
          title: 'Advanced Sound Engine',
          icon: 'fas fa-music',
          visible: true,
          tools: aseTools
        });
      }
    } else {
      Logger.warn('Unknown controls structure:', controls);
    }

  } catch (error) {
    Logger.error('Failed to initialize scene controls:', error);
  }
});

// Manually bind click listeners in case standard onClick fails (V13 compat)
Hooks.on('renderSceneControls', (controls: any, html: JQuery) => {
  try {
    // Detect if html is jQuery or native Element
    const findElement = (selector: string): HTMLElement | null => {
      // Foundry often passes jQuery objects
      if (typeof (html as any).find === 'function') {
        const el = (html as any).find(selector);
        return el.length ? el[0] : null;
      }
      // Native HTMLElement
      else if (html instanceof HTMLElement) {
        return html.querySelector(selector);
      }
      return null;
    };

    const mixerBtn = findElement('[data-tool="ase-open-mixer"]');
    if (mixerBtn) {
      mixerBtn.onclick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        Logger.debug('Manual click handler (native): Open Mixer');
        window.ASE?.openPanel();
      };
    }

    const libraryBtn = findElement('[data-tool="ase-open-library"]');
    if (libraryBtn) {
      libraryBtn.onclick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        Logger.debug('Manual click handler (native): Open Library');
        window.ASE?.openLibrary?.();
      };
    }
  } catch (error) {
    Logger.warn('Failed to bind manual click listeners:', error);
  }
});
// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Handlebars Helpers
// ─────────────────────────────────────────────────────────────

function registerHandlebarsHelpers(): void {
  // Format duration from seconds to MM:SS
  Handlebars.registerHelper('formatDuration', (seconds: number): string => {
    if (!seconds || seconds <= 0) return '--:--';

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  });

  // Check equality (for {{#if (eq a b)}})
  Handlebars.registerHelper('eq', (a: any, b: any): boolean => {
    return a === b;
  });

  // OR helper for conditional logic
  Handlebars.registerHelper('or', (...args: any[]): boolean => {
    // Last argument is Handlebars options object, exclude it
    const values = args.slice(0, -1);
    return values.some((val) => !!val);
  });
}

// ─────────────────────────────────────────────────────────────
// Init Hooks
// ─────────────────────────────────────────────────────────────

Hooks.once('init', async () => {
  Logger.info('Initializing Advanced Sound Engine...');
  registerSettings();
  registerHandlebarsHelpers();

  // Preload templates
  await loadTemplates([
    `modules/${MODULE_ID}/templates/partials/effect-card.hbs`
  ]);
});

Hooks.once('ready', async () => {
  const isGM = game.user?.isGM ?? false;
  Logger.info(`Starting Advanced Sound Engine (${isGM ? 'GM' : 'Player'})...`);

  // Initialize queue manager FIRST (needed by PlaybackScheduler)
  queueManager = new PlaybackQueueManager();
  await queueManager.load(); // Load saved queue state

  socketManager = new SocketManager();

  if (isGM) {
    await initializeGM();
  } else {
    await initializePlayer();
  }

  window.ASE = {
    isGM,
    openPanel: isGM ? openMainApp : openVolumePanel,
    openLibrary: () => isGM && openMainApp('library'),
    engine: isGM ? gmEngine ?? undefined : playerEngine ?? undefined,
    socket: socketManager ?? undefined,
    library: isGM ? libraryManager ?? undefined : undefined,
    queue: queueManager
  };

  setupAutoplayHandler();

  Logger.info('Advanced Sound Engine ready');
});

async function initializeGM(): Promise<void> {
  libraryManager = new LibraryManager();
  gmEngine = new AudioEngine();
  socketManager!.initializeAsGM(gmEngine);

  await gmEngine.loadSavedState();

  // Initialize Scheduler
  playbackScheduler = new PlaybackScheduler(gmEngine, libraryManager, queueManager!);
  Logger.info('PlaybackScheduler initialized');
}

async function initializePlayer(): Promise<void> {
  playerEngine = new PlayerAudioEngine(socketManager!);
  socketManager!.initializeAsPlayer(playerEngine);

  // Restore saved local volume
  const savedVolume = PlayerVolumePanel.loadSavedVolume();
  playerEngine!.setLocalVolume(savedVolume);
}

// ─────────────────────────────────────────────────────────────
// Panels
// ─────────────────────────────────────────────────────────────
// Open main app with specific tab
function openMainApp(tab?: string, forceRender: boolean = false): void {
  if (!gmEngine || !socketManager || !libraryManager) return;

  if (mainApp && mainApp.rendered) {
    if (tab && mainApp.state.activeTab !== tab) {
      mainApp.state.activeTab = tab as any;
      forceRender = true;
    }

    if (forceRender) {
      mainApp.render(false); // Re-render content, keep window position
    } else {
      mainApp.bringToTop();
    }
  } else {
    mainApp = new AdvancedSoundEngineApp(gmEngine, socketManager, libraryManager, queueManager!);
    if (tab) mainApp.state.activeTab = tab as any;
    mainApp.render(true);
  }
}

function openVolumePanel(): void {
  if (!playerEngine) return;

  if (volumePanel && volumePanel.rendered) {
    volumePanel.bringToTop();
  } else {
    volumePanel = new PlayerVolumePanel(playerEngine);
    volumePanel.render(true);
  }
}

// Old openLibrary removed/redirected
function openLibrary(): void {
  openMainApp('library');
}



// ─────────────────────────────────────────────────────────────
// Autoplay Policy Handler
// ─────────────────────────────────────────────────────────────

function setupAutoplayHandler(): void {
  const resumeAudio = () => {
    gmEngine?.resume();
    playerEngine?.resume();
  };

  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('keydown', resumeAudio, { once: true });

  Hooks.once('canvasReady', resumeAudio);
}

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────

function registerSettings(): void {
  (game.settings as any).register(MODULE_ID, 'mixerState', {
    name: 'Mixer State',
    hint: 'Internal storage for mixer state',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  (game.settings as any).register(MODULE_ID, 'maxSimultaneousTracks', {
    name: 'Maximum Simultaneous Tracks',
    hint: 'Limit the number of tracks that can play at once (1-32)',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 1, max: 32, step: 1 },
    default: 8
  });

  // Legacy library state fallback (world-scoped, for migration only)
  (game.settings as any).register(MODULE_ID, 'libraryState', {
    name: 'Library State',
    hint: 'Internal storage for library items and playlists',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  // Queue state (world-scoped, session persistence  
  (game.settings as any).register(MODULE_ID, 'queueState', {
    name: 'Queue State',
    hint: 'Playback queue state (persists between sessions)',
    scope: 'world',
    config: false,
    type: Object,
    default: { items: [], activeItemId: null }
  });
}

// ─────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────

Hooks.once('closeGame', () => {
  mainApp?.close();
  volumePanel?.close();
  socketManager?.dispose();
  gmEngine?.dispose();
  playerEngine?.dispose();
  libraryManager?.dispose();
});