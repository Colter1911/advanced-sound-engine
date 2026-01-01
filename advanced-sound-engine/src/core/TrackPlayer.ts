import type { TrackGroup, TrackState, PlaybackState } from '@t/audio';
import { Logger } from '@utils/logger';

export class TrackPlayer {
  readonly id: string;
  private ctx: AudioContext;
  private _group: TrackGroup;
  private _url: string = '';
  
  private buffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private outputNode: GainNode;
  
  private _state: PlaybackState = 'stopped';
  private _volume: number = 1;
  private _loop: boolean = false;
  
  private startTime: number = 0;
  private pausedAt: number = 0;
  private startOffset: number = 0;

  constructor(
    id: string,
    ctx: AudioContext,
    channelOutput: GainNode,
    group: TrackGroup = 'music'
  ) {
    this.id = id;
    this.ctx = ctx;
    this._group = group;
    
    this.gainNode = ctx.createGain();
    this.outputNode = ctx.createGain();
    
    this.gainNode.connect(this.outputNode);
    this.outputNode.connect(channelOutput);
  }

  get state(): PlaybackState {
    return this._state;
  }

  get group(): TrackGroup {
    return this._group;
  }

  get url(): string {
    return this._url;
  }

  get volume(): number {
    return this._volume;
  }

  get loop(): boolean {
    return this._loop;
  }

  async load(url: string): Promise<void> {
    this._state = 'loading';
    this._url = url;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this._state = 'stopped';
      
      Logger.debug(`Track loaded: ${this.id}, duration: ${this.buffer.duration}s`);
    } catch (error) {
      this._state = 'stopped';
      Logger.error(`Failed to load track ${this.id}:`, error);
      throw error;
    }
  }

  play(offset: number = 0): void {
    if (!this.buffer) {
      Logger.warn(`Cannot play track ${this.id}: no buffer loaded`);
      return;
    }

    this.stopSource();

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.loop = this._loop;
    this.sourceNode.connect(this.gainNode);

    this.sourceNode.onended = () => {
      if (this._state === 'playing') {
        this._state = 'stopped';
        this.pausedAt = 0;
        this.startOffset = 0;
      }
    };

    const safeOffset = Math.max(0, Math.min(offset, this.buffer.duration - 0.01));
    
    this.startTime = this.ctx.currentTime;
    this.startOffset = safeOffset;
    this.sourceNode.start(0, safeOffset);
    this._state = 'playing';
    
    Logger.debug(`Track ${this.id} playing from ${safeOffset.toFixed(2)}s`);
  }

  pause(): void {
    if (this._state !== 'playing') return;

    this.pausedAt = this.getCurrentTime();
    this.stopSource();
    this._state = 'paused';
    
    Logger.debug(`Track ${this.id} paused at ${this.pausedAt.toFixed(2)}s`);
  }

  stop(): void {
    this.stopSource();
    this._state = 'stopped';
    this.pausedAt = 0;
    this.startOffset = 0;
    
    Logger.debug(`Track ${this.id} stopped`);
  }

  seek(time: number): void {
    if (!this.buffer) return;

    const wasPlaying = this._state === 'playing';
    const safeTime = Math.max(0, Math.min(time, this.buffer.duration - 0.01));

    if (wasPlaying) {
      this.play(safeTime);
    } else {
      this.pausedAt = safeTime;
      this._state = 'paused';
    }
  }

  setVolume(value: number): void {
    this._volume = Math.max(0, Math.min(1, value));
    this.gainNode.gain.setValueAtTime(this._volume, this.ctx.currentTime);
  }

  setLoop(value: boolean): void {
    this._loop = value;
    if (this.sourceNode) {
      this.sourceNode.loop = value;
    }
  }

  setChannel(newGroup: TrackGroup, newOutput: GainNode): void {
    this._group = newGroup;
    this.outputNode.disconnect();
    this.outputNode.connect(newOutput);
  }

  getCurrentTime(): number {
    if (this._state === 'playing') {
      const elapsed = this.ctx.currentTime - this.startTime;
      let currentTime = this.startOffset + elapsed;
      
      if (this._loop && this.buffer) {
        currentTime = currentTime % this.buffer.duration;
      }
      
      return currentTime;
    }
    return this.pausedAt;
  }

  getDuration(): number {
    return this.buffer?.duration ?? 0;
  }

  getState(): TrackState {
    return {
      id: this.id,
      url: this._url,
      group: this._group,
      playbackState: this._state,
      volume: this._volume,
      loop: this._loop,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      pausedAt: this.pausedAt
    };
  }

  private stopSource(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.onended = null;
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Ignore
      }
      this.sourceNode = null;
    }
  }

  dispose(): void {
    this.stopSource();
    this.gainNode.disconnect();
    this.outputNode.disconnect();
    this.buffer = null;
    Logger.debug(`Track ${this.id} disposed`);
  }
}