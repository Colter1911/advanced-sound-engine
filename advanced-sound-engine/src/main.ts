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

const MODULE_ID = 'advanced-sound-engine';

// GM
// GM
let gmEngine: AudioEngine | null = null;
let mainApp: AdvancedSoundEngineApp | null = null;
let libraryManager: LibraryManager | null = null;

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
Hooks.on('getSceneControlButtons' as any, (controls: any[]) => {
  try {
    const isGM = game.user?.isGM ?? false;

    const aseTools: any[] = [
      {
        name: 'ase-open-mixer',
        title: isGM ? 'Open Sound Mixer' : 'Open Sound Volume',
        icon: isGM ? 'fas fa-sliders-h' : 'fas fa-volume-up',
        button: true,
        onClick: () => {
          console.log('ASE | Button clicked: Open Mixer/Volume');
          if (window.ASE) {
            console.log('ASE | Window.ASE exists', window.ASE);
            window.ASE.openPanel();
          } else {
            console.error('ASE | Window.ASE is undefined!');
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
          console.log('ASE | Button clicked: Open Library');
          if (window.ASE && window.ASE.openLibrary) {
            window.ASE.openLibrary();
          } else {
            console.error('ASE | Window.ASE or openLibrary undefined');
          }
        }
      });
    }

    // Debug what we received
    console.log('ASE | getSceneControlButtons called with:', controls);

    // V13+ Compatibility: controls might be an object/record instead of an array
    if (!Array.isArray(controls) && typeof controls === 'object' && controls !== null) {
      console.log('ASE | Detected non-array controls structure (V13?)');

      // Check if "sounds" exists as a property
      const soundsLayer = (controls as any).sounds;

      if (soundsLayer && Array.isArray(soundsLayer.tools)) {
        soundsLayer.tools.push(...aseTools);
        console.log('ASE | Added tools to "sounds" layer (V13 Object Mode)');
      } else {
        // Fallback: Add as a new property
        (controls as any)['advanced-sound-engine'] = {
          name: 'advanced-sound-engine',
          title: 'Advanced Sound Engine',
          icon: 'fas fa-music',
          visible: true,
          tools: aseTools
        };
        console.log('ASE | Created dedicated control group (V13 Object Mode)');
      }
      return;
    }

    // V10-V12 Compatibility: controls is an array
    if (Array.isArray(controls)) {
      // Try to find the "sounds" layer control group
      const soundsLayer = controls.find(c => c.name === 'sounds');

      if (soundsLayer) {
        // Add our tools to the existing sounds layer
        soundsLayer.tools.push(...aseTools);
        console.log('ASE | Added tools to "sounds" layer');
      } else {
        // Fallback: Create a dedicated group if "sounds" layer is missing
        controls.push({
          name: 'advanced-sound-engine',
          title: 'Advanced Sound Engine',
          icon: 'fas fa-music',
          visible: true,
          tools: aseTools
        });
        console.log('ASE | Created dedicated control group');
      }
    } else {
      console.warn('ASE | Unknown controls structure:', controls);
    }

  } catch (error) {
    console.error('ASE | Failed to initialize scene controls:', error);
  }
});

// Manually bind click listeners in case standard onClick fails (V13 compat)
Hooks.on('renderSceneControls', (controls: any, html: any) => {
  try {
    // Detect if html is jQuery or native Element
    // In V13+, hooks might return native HTMLElements.
    // jQuery objects have a .jquery property or .find method.

    const findElement = (selector: string): HTMLElement | null => {
      if (typeof html.find === 'function') {
        const el = html.find(selector);
        return el.length ? el[0] : null;
      } else if (html instanceof HTMLElement) {
        return html.querySelector(selector);
      } else if (html.length && html[0] instanceof HTMLElement) {
        // Maybe an array of elements or jQuery-like structure without .find?
        // Unlikely for renderSceneControls which usually passes the container, but possible.
        return (html[0] as HTMLElement).querySelector(selector) ?? null;
      }
      return null;
    };

    const mixerBtn = findElement('[data-tool="ase-open-mixer"]');
    if (mixerBtn) {
      // Use native events for maximum compatibility
      mixerBtn.onclick = (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('ASE | Manual click handler (native): Open Mixer');
        window.ASE?.openPanel();
      };
      console.log('ASE | Bound manual click listener to mixer button');
    }

    const libraryBtn = findElement('[data-tool="ase-open-library"]');
    if (libraryBtn) {
      // Use native events for maximum compatibility
      libraryBtn.onclick = (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('ASE | Manual click handler (native): Open Library');
        window.ASE?.openLibrary?.();
      };
      console.log('ASE | Bound manual click listener to library button');
    }
  } catch (error) {
    console.warn('ASE | Failed to bind manual click listeners:', error);
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
}

// ─────────────────────────────────────────────────────────────
// Init Hooks
// ─────────────────────────────────────────────────────────────

Hooks.once('init', () => {
  Logger.info('Initializing Advanced Sound Engine...');
  registerSettings();
  registerHandlebarsHelpers();
});

Hooks.once('ready', async () => {
  const isGM = game.user?.isGM ?? false;
  Logger.info(`Starting Advanced Sound Engine (${isGM ? 'GM' : 'Player'})...`);

  socketManager = new SocketManager();

  if (isGM) {
    await initializeGM();
  } else {
    await initializePlayer();
  }

  // Initialize queue manager (runtime, no persistence)
  const queueManager = new PlaybackQueueManager();

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
}

async function initializePlayer(): Promise<void> {
  playerEngine = new PlayerAudioEngine();
  socketManager!.initializeAsPlayer(playerEngine);

  // Restore saved local volume
  const savedVolume = PlayerVolumePanel.loadSavedVolume();
  playerEngine.setLocalVolume(savedVolume);
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
    mainApp = new AdvancedSoundEngineApp(gmEngine, socketManager, libraryManager);
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
  game.settings!.register(MODULE_ID as any, 'mixerState' as any, {
    name: 'Mixer State',
    hint: 'Internal storage for mixer state',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  } as any);

  game.settings!.register(MODULE_ID as any, 'maxSimultaneousTracks' as any, {
    name: 'Maximum Simultaneous Tracks',
    hint: 'Maximum number of tracks that can play simultaneously (1-32)',
    scope: 'world',
    config: true,
    type: Number,
    default: 16,
    range: {
      min: 1,
      max: 32,
      step: 1
    }
  } as any);

  game.settings!.register(MODULE_ID as any, 'libraryState' as any, {
    name: 'Library State',
    hint: 'Internal storage for library items and playlists',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  } as any);
}

// ─────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────

Hooks.once('closeGame' as any, () => {
  mainApp?.close();
  volumePanel?.close();
  socketManager?.dispose();
  gmEngine?.dispose();
  playerEngine?.dispose();
  libraryManager?.dispose();
});