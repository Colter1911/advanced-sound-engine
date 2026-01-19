import '../styles/sound-engine.scss';
import { AudioEngine } from '@core/AudioEngine';
import { PlayerAudioEngine } from '@core/PlayerAudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { SoundMixerApp } from '@ui/SoundMixerApp';
import { PlayerVolumePanel } from '@ui/PlayerVolumePanel';
import { LocalLibraryApp } from '@ui/LocalLibraryApp';
import { AdvancedSoundEngineApp } from '@ui/AdvancedSoundEngineApp';
import { LibraryManager } from '@lib/LibraryManager';
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
      openPanel: (tab?: string) => void;
      openLibrary?: () => void;
      engine?: AudioEngine | PlayerAudioEngine;
      socket?: SocketManager;
      library?: LibraryManager;
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Control Button (в начале файла, после импортов)
// ─────────────────────────────────────────────────────────────

Hooks.on('getSceneControlButtons', (controls: Record<string, any>) => {
  console.log('ASE: Hook fired', controls);

  const isGM = game.user?.isGM ?? false;

  const tools: Record<string, any> = {
    'open-panel': {
      name: 'open-panel',
      title: isGM ? 'Sound Mixer' : 'Sound Volume',
      icon: isGM ? 'fas fa-sliders-h' : 'fas fa-volume-up',
      button: true,
      onClick: () => window.ASE?.openPanel()
    }
  };

  // Add library button for GM (Shortcut to Library Tab)
  if (isGM) {
    tools['open-library'] = {
      name: 'open-library',
      title: 'Sound Library',
      icon: 'fas fa-book',
      button: true,
      onClick: () => window.ASE?.openPanel('library')
    };
  }

  controls['advanced-sound-engine'] = {
    name: 'advanced-sound-engine',
    title: isGM ? 'Advanced Sound Engine' : 'Sound Volume',
    icon: isGM ? 'fas fa-sliders-h' : 'fas fa-volume-up',
    visible: true,
    tools
  };
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

  window.ASE = {
    isGM,
    isGM,
    openPanel: isGM ? openMainApp : openVolumePanel,
    openLibrary: () => isGM && openMainApp('library'),
    engine: isGM ? gmEngine ?? undefined : playerEngine ?? undefined,
    socket: socketManager ?? undefined,
    library: isGM ? libraryManager ?? undefined : undefined
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

function openMainApp(tab: 'mixer' | 'library' = 'mixer'): void {
  if (!gmEngine || !socketManager || !libraryManager) return;

  if (mainApp && mainApp.rendered) {
    mainApp.bringToTop();
    // Switch tab if needed (assuming public method or we re-render with state update)
    // For now, simpler to just focus. Ideally mainApp.activateTab(tab)
  } else {
    mainApp = new AdvancedSoundEngineApp(gmEngine, socketManager, libraryManager);
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
  game.settings.register(MODULE_ID, 'mixerState', {
    name: 'Mixer State',
    hint: 'Internal storage for mixer state',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  });

  game.settings.register(MODULE_ID, 'maxSimultaneousTracks', {
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
  });

  game.settings.register(MODULE_ID, 'libraryState', {
    name: 'Library State',
    hint: 'Internal storage for library items and playlists',
    scope: 'world',
    config: false,
    type: String,
    default: ''
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