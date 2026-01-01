import '../styles/sound-engine.scss';
import { AudioEngine } from '@core/AudioEngine';
import { PlayerAudioEngine } from '@core/PlayerAudioEngine';
import { SocketManager } from '@sync/SocketManager';
import { SoundMixerApp } from '@ui/SoundMixerApp';
import { PlayerVolumePanel } from '@ui/PlayerVolumePanel';
import { Logger } from '@utils/logger';

const MODULE_ID = 'advanced-sound-engine';

// GM
let gmEngine: AudioEngine | null = null;
let mixerApp: SoundMixerApp | null = null;

// Player
let playerEngine: PlayerAudioEngine | null = null;
let volumePanel: PlayerVolumePanel | null = null;

// Shared
let socketManager: SocketManager | null = null;

declare global {
  interface Window {
    ASE: {
      isGM: boolean;
      openPanel: () => void;
      engine?: AudioEngine | PlayerAudioEngine;
      socket?: SocketManager;
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

Hooks.once('init', () => {
  Logger.info('Initializing Advanced Sound Engine...');
  registerSettings();
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
    openPanel: isGM ? openMixer : openVolumePanel,
    engine: isGM ? gmEngine ?? undefined : playerEngine ?? undefined,
    socket: socketManager ?? undefined
  };
  
  setupAutoplayHandler();
  addControlButton();
  
  Logger.info('Advanced Sound Engine ready');
});

async function initializeGM(): Promise<void> {
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

function openMixer(): void {
  if (!gmEngine || !socketManager) return;
  
  if (mixerApp && mixerApp.rendered) {
    mixerApp.bringToTop();
  } else {
    mixerApp = new SoundMixerApp(gmEngine, socketManager);
    mixerApp.render(true);
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

// ─────────────────────────────────────────────────────────────
// Control Button
// ─────────────────────────────────────────────────────────────

function addControlButton(): void {
  Hooks.on('renderSceneControls', () => {
    // Проверяем, не добавлена ли уже кнопка
    if (document.getElementById('ase-control-btn')) return;
    
    const controls = document.querySelector('#controls');
    if (!controls) return;
    
    const isGM = game.user?.isGM ?? false;
    
    const btn = document.createElement('li');
    btn.id = 'ase-control-btn';
    btn.className = 'scene-control';
    btn.dataset.tooltip = isGM ? 'Sound Mixer' : 'Sound Volume';
    btn.innerHTML = `<i class="fas ${isGM ? 'fa-sliders-h' : 'fa-volume-up'}"></i>`;
    btn.style.cursor = 'pointer';
    
    btn.addEventListener('click', () => {
      if (isGM) {
        openMixer();
      } else {
        openVolumePanel();
      }
    });
    
    controls.appendChild(btn);
  });
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
}

// ─────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────

Hooks.once('closeGame', () => {
  mixerApp?.close();
  volumePanel?.close();
  socketManager?.dispose();
  gmEngine?.dispose();
  playerEngine?.dispose();
});