import type { EffectState } from './effects';

export type TrackGroup = 'music' | 'ambience' | 'sfx';
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'loading';

export interface TrackConfig {
  id?: string;                   // UUID v4 (генерируется автоматически, если не указан)
  url: string;
  group: TrackGroup;
  volume?: number;
  libraryItemId?: string;        // UUID ссылка на LibraryItem (для будущего использования)
}

export interface TrackState {
  id: string;
  url: string;
  group: TrackGroup;
  playbackState: PlaybackState;
  volume: number;
  currentTime: number;
  duration: number;
}

export interface ChannelVolumes {
  master: number;
  music: number;
  ambience: number;
  sfx: number;
}

export interface MixerState {
  masterVolume: number;
  channelVolumes: ChannelVolumes;
  tracks: TrackState[];
  effects: EffectState[]; // [NEW] Added for effects system
  timestamp: number;
  syncEnabled: boolean;
}

// Socket
export type SocketMessageType =
  | 'sync-start'
  | 'sync-stop'
  | 'sync-state'
  | 'player-ready'
  | 'sync-request'  // Player requesting full sync from GM
  | 'track-play'
  | 'track-pause'
  | 'track-stop'
  | 'track-volume'
  | 'track-seek'
  | 'master-volume'
  | 'channel-volume'
  | 'stop-all'
  | 'effect-param'
  | 'effect-routing'
  | 'effect-enabled';

export interface SocketMessage {
  type: SocketMessageType;
  payload: unknown;
  senderId: string;
  timestamp: number;
  version?: number; // Protocol version for compatibility checks
}

export interface SyncStatePayload {
  tracks: SyncTrackState[];
  channelVolumes: ChannelVolumes;
  effects: EffectState[]; // Added effects sync
}

export interface SyncTrackState {
  id: string;
  url: string;
  group: TrackGroup;
  volume: number;
  isPlaying: boolean;
  currentTime: number;
  startTimestamp: number;
}

export interface TrackPlayPayload {
  trackId: string;
  url: string;
  group: TrackGroup;
  volume: number;
  offset: number;
  startTimestamp: number;
}

export interface TrackPausePayload {
  trackId: string;
  pausedAt: number;
}

export interface TrackStopPayload {
  trackId: string;
}

export interface TrackSeekPayload {
  trackId: string;
  time: number;
  isPlaying: boolean;
  seekTimestamp: number;
}

export interface TrackVolumePayload {
  trackId: string;
  volume: number;
}

export interface EffectParamPayload {
  effectId: string;
  paramId: string;
  value: any;
}

export interface EffectRoutingPayload {
  effectId: string;
  channel: TrackGroup;
  active: boolean;
}

export interface EffectEnabledPayload {
  effectId: string;
  enabled: boolean;
}

export interface ChannelVolumePayload {
  channel: TrackGroup | 'master';
  volume: number;
}