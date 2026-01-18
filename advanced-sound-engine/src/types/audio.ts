export type TrackGroup = 'music' | 'ambience' | 'sfx';
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'loading';

export interface TrackConfig {
  id?: string;                   // UUID v4 (генерируется автоматически, если не указан)
  url: string;
  group: TrackGroup;
  volume?: number;
  loop?: boolean;
  libraryItemId?: string;        // UUID ссылка на LibraryItem (для будущего использования)
}

export interface TrackState {
  id: string;
  url: string;
  group: TrackGroup;
  playbackState: PlaybackState;
  volume: number;
  loop: boolean;
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
  timestamp: number;
  syncEnabled: boolean;
}

// Socket
export type SocketMessageType = 
  | 'sync-start'
  | 'sync-stop'
  | 'sync-state'
  | 'track-play'
  | 'track-pause'
  | 'track-stop'
  | 'track-seek'
  | 'track-volume'
  | 'track-loop'
  | 'channel-volume'
  | 'stop-all'
  | 'player-ready';

export interface SocketMessage {
  type: SocketMessageType;
  payload: unknown;
  senderId: string;
  timestamp: number;
}

export interface SyncStatePayload {
  tracks: SyncTrackState[];
  channelVolumes: ChannelVolumes;
}

export interface SyncTrackState {
  id: string;
  url: string;
  group: TrackGroup;
  volume: number;
  loop: boolean;
  isPlaying: boolean;
  currentTime: number;
  startTimestamp: number;
}

export interface TrackPlayPayload {
  trackId: string;
  url: string;
  group: TrackGroup;
  volume: number;
  loop: boolean;
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

export interface TrackLoopPayload {
  trackId: string;
  loop: boolean;
}

export interface ChannelVolumePayload {
  channel: TrackGroup | 'master';
  volume: number;
}