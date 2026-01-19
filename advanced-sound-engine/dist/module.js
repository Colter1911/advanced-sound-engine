var O = Object.defineProperty;
var R = (l, e, t) => e in l ? O(l, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : l[e] = t;
var d = (l, e, t) => R(l, typeof e != "symbol" ? e + "" : e, t);
const x = "ASE", r = {
  info: (l, ...e) => {
    console.log(`${x} | ${l}`, ...e);
  },
  warn: (l, ...e) => {
    console.warn(`${x} | ${l}`, ...e);
  },
  error: (l, ...e) => {
    console.error(`${x} | ${l}`, ...e);
  },
  debug: (l, ...e) => {
    var t;
    (t = CONFIG == null ? void 0 : CONFIG.debug) != null && t.audio && console.debug(`${x} | ${l}`, ...e);
  }
};
class I {
  constructor(e, t, a, i = "music") {
    d(this, "id");
    d(this, "ctx");
    d(this, "_group");
    d(this, "_url", "");
    d(this, "audio");
    d(this, "sourceNode", null);
    d(this, "gainNode");
    d(this, "outputNode");
    d(this, "_state", "stopped");
    d(this, "_volume", 1);
    d(this, "_loop", !1);
    d(this, "_ready", !1);
    this.id = e, this.ctx = t, this._group = i, this.audio = new Audio(), this.audio.crossOrigin = "anonymous", this.audio.preload = "auto", this.gainNode = t.createGain(), this.outputNode = t.createGain(), this.gainNode.connect(this.outputNode), this.outputNode.connect(a), this.setupAudioEvents();
  }
  setupAudioEvents() {
    this.audio.addEventListener("canplay", () => {
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), r.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", r.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (e) => {
      r.error(`Track ${this.id} error:`, this.audio.error), this._state = "stopped";
    });
  }
  get state() {
    return this._state;
  }
  get group() {
    return this._group;
  }
  get url() {
    return this._url;
  }
  get volume() {
    return this._volume;
  }
  get loop() {
    return this._loop;
  }
  get ready() {
    return this._ready;
  }
  async load(e) {
    return this._state = "loading", this._url = e, this._ready = !1, new Promise((t, a) => {
      const i = () => {
        this.audio.removeEventListener("canplay", i), this.audio.removeEventListener("error", s), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", r.debug(`Track loaded: ${this.id}`), t();
      }, s = () => {
        this.audio.removeEventListener("canplay", i), this.audio.removeEventListener("error", s), this._state = "stopped", a(new Error(`Failed to load: ${e}`));
      };
      this.audio.addEventListener("canplay", i, { once: !0 }), this.audio.addEventListener("error", s, { once: !0 }), this.audio.src = e, this.audio.load();
    });
  }
  async play(e = 0) {
    if (!this._ready) {
      r.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(e, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", r.debug(`Track ${this.id} playing from ${e.toFixed(2)}s`);
    } catch (t) {
      r.error(`Failed to play ${this.id}:`, t);
    }
  }
  pause() {
    this._state === "playing" && (this.audio.pause(), this._state = "paused", r.debug(`Track ${this.id} paused at ${this.audio.currentTime.toFixed(2)}s`));
  }
  stop() {
    this.audio.pause(), this.audio.currentTime = 0, this._state = "stopped", r.debug(`Track ${this.id} stopped`);
  }
  seek(e) {
    const t = Math.max(0, Math.min(e, this.audio.duration || 0));
    this.audio.currentTime = t;
  }
  setVolume(e) {
    this._volume = Math.max(0, Math.min(1, e)), this.gainNode.gain.setValueAtTime(this._volume, this.ctx.currentTime);
  }
  setLoop(e) {
    this._loop = e, this.audio.loop = e;
  }
  setChannel(e, t) {
    this._group = e, this.outputNode.disconnect(), this.outputNode.connect(t);
  }
  getCurrentTime() {
    return this.audio.currentTime;
  }
  getDuration() {
    return this.audio.duration || 0;
  }
  getState() {
    return {
      id: this.id,
      url: this._url,
      group: this._group,
      playbackState: this._state,
      volume: this._volume,
      loop: this._loop,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration()
    };
  }
  dispose() {
    var e;
    this.audio.pause(), this.audio.src = "", (e = this.sourceNode) == null || e.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), r.debug(`Track ${this.id} disposed`);
  }
}
function T() {
  return Date.now();
}
function P(l) {
  if (!isFinite(l) || l < 0) return "0:00";
  const e = Math.floor(l / 60), t = Math.floor(l % 60);
  return `${e}:${t.toString().padStart(2, "0")}`;
}
function S() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (l) => {
    const e = Math.random() * 16 | 0;
    return (l === "x" ? e : e & 3 | 8).toString(16);
  });
}
const V = [
  ".mp3",
  ".ogg",
  ".wav",
  ".webm",
  ".m4a",
  ".aac",
  ".flac",
  ".opus"
], z = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/opus"
};
function B(l) {
  const e = _(l);
  return V.includes(e);
}
function _(l) {
  try {
    const a = decodeURIComponent(l).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return a ? `.${a[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function H(l) {
  const e = _(l);
  return z[e] || null;
}
function F(l) {
  if (!l || typeof l != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const e = _(l);
  if (!e)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!B(l))
    return {
      valid: !1,
      error: `Unsupported audio format: ${e}. Supported formats: ${V.join(", ")}`,
      extension: e
    };
  const t = H(l);
  return {
    valid: !0,
    extension: e,
    mimeType: t || void 0
  };
}
const D = "advanced-sound-engine";
function j() {
  return game.settings.get(D, "maxSimultaneousTracks") || 8;
}
class J {
  constructor() {
    d(this, "ctx");
    d(this, "masterGain");
    d(this, "channelGains");
    d(this, "players", /* @__PURE__ */ new Map());
    d(this, "_volumes", {
      master: 1,
      music: 1,
      ambience: 1,
      sfx: 1
    });
    d(this, "saveTimeout", null);
    this.ctx = new AudioContext(), this.masterGain = this.ctx.createGain(), this.masterGain.connect(this.ctx.destination), this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    }, this.channelGains.music.connect(this.masterGain), this.channelGains.ambience.connect(this.masterGain), this.channelGains.sfx.connect(this.masterGain), r.info("AudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence (GM only)
  // ─────────────────────────────────────────────────────────────
  scheduleSave() {
    var e;
    (e = game.user) != null && e.isGM && (this.saveTimeout && clearTimeout(this.saveTimeout), this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 500));
  }
  async saveState() {
    var t;
    if (!game.ready || !((t = game.user) != null && t.isGM)) return;
    const e = this.getState();
    try {
      await game.settings.set(D, "mixerState", JSON.stringify(e)), r.debug("Mixer state saved");
    } catch (a) {
      r.error("Failed to save mixer state:", a);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const e = game.settings.get(D, "mixerState");
        if (!e) return;
        const t = JSON.parse(e);
        await this.restoreState(t), r.info("Mixer state restored");
      } catch (e) {
        r.error("Failed to load mixer state:", e);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(e) {
    const t = e.id || S();
    if (this.players.has(t))
      return this.players.get(t);
    const a = F(e.url);
    if (!a.valid) {
      const n = new Error(a.error || "Invalid audio file");
      throw r.error(`Track validation failed: ${a.error}`), n;
    }
    const i = this.channelGains[e.group], s = new I(
      t,
      this.ctx,
      i,
      e.group
    );
    return e.volume !== void 0 && s.setVolume(e.volume), e.loop !== void 0 && s.setLoop(e.loop), await s.load(e.url), this.players.set(t, s), this.scheduleSave(), r.info(`Track created: ${t} (${a.extension})`), s;
  }
  getTrack(e) {
    return this.players.get(e);
  }
  removeTrack(e) {
    const t = this.players.get(e);
    return t ? (t.dispose(), this.players.delete(e), this.scheduleSave(), r.info(`Track removed: ${e}`), !0) : !1;
  }
  getAllTracks() {
    return Array.from(this.players.values());
  }
  getTracksByGroup(e) {
    return this.getAllTracks().filter((t) => t.group === e);
  }
  setTrackChannel(e, t) {
    const a = this.players.get(e);
    a && (a.setChannel(t, this.channelGains[t]), this.scheduleSave());
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────
  async playTrack(e, t = 0) {
    var o;
    const a = this.players.get(e);
    if (!a) {
      r.warn(`Track not found: ${e}`);
      return;
    }
    const i = j(), s = this.getAllTracks().filter((c) => c.state === "playing").length;
    if (!(a.state === "playing") && s >= i) {
      r.warn(`Maximum simultaneous tracks (${i}) reached`), (o = ui.notifications) == null || o.warn(`Cannot play more than ${i} tracks simultaneously`);
      return;
    }
    await a.play(t);
  }
  pauseTrack(e) {
    var t;
    (t = this.players.get(e)) == null || t.pause();
  }
  stopTrack(e) {
    var t;
    (t = this.players.get(e)) == null || t.stop();
  }
  seekTrack(e, t) {
    var a;
    (a = this.players.get(e)) == null || a.seek(t);
  }
  setTrackVolume(e, t) {
    var a;
    (a = this.players.get(e)) == null || a.setVolume(t), this.scheduleSave();
  }
  setTrackLoop(e, t) {
    var a;
    (a = this.players.get(e)) == null || a.setLoop(t), this.scheduleSave();
  }
  stopAll() {
    for (const e of this.players.values())
      e.stop();
  }
  // ─────────────────────────────────────────────────────────────
  // Volume Control
  // ─────────────────────────────────────────────────────────────
  get volumes() {
    return { ...this._volumes };
  }
  setMasterVolume(e) {
    this._volumes.master = Math.max(0, Math.min(1, e)), this.masterGain.gain.linearRampToValueAtTime(
      this._volumes.master,
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  setChannelVolume(e, t) {
    this._volumes[e] = Math.max(0, Math.min(1, t)), this.channelGains[e].gain.linearRampToValueAtTime(
      this._volumes[e],
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  getChannelVolume(e) {
    return this._volumes[e];
  }
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  getState() {
    const e = [];
    for (const t of this.players.values())
      e.push(t.getState());
    return {
      masterVolume: this._volumes.master,
      channelVolumes: { ...this._volumes },
      tracks: e,
      timestamp: T(),
      syncEnabled: !1
    };
  }
  async restoreState(e) {
    if (this._volumes.master = e.masterVolume, this.masterGain.gain.setValueAtTime(this._volumes.master, this.ctx.currentTime), e.channelVolumes)
      for (const a of ["music", "ambience", "sfx"])
        this._volumes[a] = e.channelVolumes[a], this.channelGains[a].gain.setValueAtTime(this._volumes[a], this.ctx.currentTime);
    for (const a of e.tracks)
      if (!this.players.has(a.id))
        try {
          await this.createTrack({
            id: a.id,
            url: a.url,
            group: a.group,
            volume: a.volume,
            loop: a.loop
          });
        } catch (i) {
          r.error(`Failed to restore track ${a.id}:`, i);
        }
    const t = new Set(e.tracks.map((a) => a.id));
    for (const [a] of this.players)
      t.has(a) || this.removeTrack(a);
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), r.info("AudioContext resumed"));
  }
  get contextState() {
    return this.ctx.state;
  }
  // ─────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────
  dispose() {
    this.saveTimeout && clearTimeout(this.saveTimeout);
    for (const e of this.players.values())
      e.dispose();
    this.players.clear(), this.ctx.close(), r.info("AudioEngine disposed");
  }
}
class Y {
  constructor() {
    d(this, "ctx");
    d(this, "masterGain");
    d(this, "gmGain");
    // Громкость от GM
    d(this, "channelGains");
    d(this, "players", /* @__PURE__ */ new Map());
    d(this, "_localVolume", 1);
    // Личная громкость игрока
    d(this, "_gmVolumes", {
      master: 1,
      music: 1,
      ambience: 1,
      sfx: 1
    });
    this.ctx = new AudioContext(), this.masterGain = this.ctx.createGain(), this.masterGain.connect(this.ctx.destination), this.gmGain = this.ctx.createGain(), this.gmGain.connect(this.masterGain), this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    }, this.channelGains.music.connect(this.gmGain), this.channelGains.ambience.connect(this.gmGain), this.channelGains.sfx.connect(this.gmGain), r.info("PlayerAudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Local Volume (Player's personal control)
  // ─────────────────────────────────────────────────────────────
  get localVolume() {
    return this._localVolume;
  }
  setLocalVolume(e) {
    this._localVolume = Math.max(0, Math.min(1, e)), this.masterGain.gain.linearRampToValueAtTime(
      this._localVolume,
      this.ctx.currentTime + 0.01
    );
  }
  // ─────────────────────────────────────────────────────────────
  // GM Volume (from sync)
  // ─────────────────────────────────────────────────────────────
  setGMVolume(e, t) {
    const a = Math.max(0, Math.min(1, t));
    e === "master" ? (this._gmVolumes.master = a, this.gmGain.gain.linearRampToValueAtTime(a, this.ctx.currentTime + 0.01)) : (this._gmVolumes[e] = a, this.channelGains[e].gain.linearRampToValueAtTime(a, this.ctx.currentTime + 0.01));
  }
  setAllGMVolumes(e) {
    this._gmVolumes = { ...e }, this.gmGain.gain.setValueAtTime(e.master, this.ctx.currentTime), this.channelGains.music.gain.setValueAtTime(e.music, this.ctx.currentTime), this.channelGains.ambience.gain.setValueAtTime(e.ambience, this.ctx.currentTime), this.channelGains.sfx.gain.setValueAtTime(e.sfx, this.ctx.currentTime);
  }
  // ─────────────────────────────────────────────────────────────
  // Track Commands (from GM via socket)
  // ─────────────────────────────────────────────────────────────
  async handlePlay(e) {
    let t = this.players.get(e.trackId);
    t || (t = new I(
      e.trackId,
      this.ctx,
      this.channelGains[e.group],
      e.group
    ), await t.load(e.url), this.players.set(e.trackId, t)), t.setVolume(e.volume), t.setLoop(e.loop);
    const a = (T() - e.startTimestamp) / 1e3, i = Math.max(0, e.offset + a);
    await t.play(i), r.debug(`Player: track ${e.trackId} playing at ${i.toFixed(2)}s`);
  }
  handlePause(e) {
    var t;
    (t = this.players.get(e)) == null || t.pause();
  }
  handleStop(e) {
    var t;
    (t = this.players.get(e)) == null || t.stop();
  }
  handleSeek(e, t, a, i) {
    const s = this.players.get(e);
    if (s)
      if (a) {
        const n = (T() - i) / 1e3;
        s.seek(t + n);
      } else
        s.seek(t);
  }
  handleTrackVolume(e, t) {
    var a;
    (a = this.players.get(e)) == null || a.setVolume(t);
  }
  handleTrackLoop(e, t) {
    var a;
    (a = this.players.get(e)) == null || a.setLoop(t);
  }
  // ─────────────────────────────────────────────────────────────
  // Sync State (full state from GM)
  // ─────────────────────────────────────────────────────────────
  async syncState(e, t) {
    this.setAllGMVolumes(t);
    const a = new Set(e.map((i) => i.id));
    for (const [i, s] of this.players)
      a.has(i) || (s.dispose(), this.players.delete(i));
    for (const i of e) {
      let s = this.players.get(i.id);
      if (s || (s = new I(
        i.id,
        this.ctx,
        this.channelGains[i.group],
        i.group
      ), await s.load(i.url), this.players.set(i.id, s)), s.setVolume(i.volume), s.setLoop(i.loop), i.isPlaying) {
        const n = (T() - i.startTimestamp) / 1e3, o = i.currentTime + n;
        await s.play(o);
      } else
        s.stop();
    }
    r.info("Player: synced state from GM");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Off
  // ─────────────────────────────────────────────────────────────
  stopAll() {
    for (const e of this.players.values())
      e.stop();
  }
  clearAll() {
    for (const e of this.players.values())
      e.dispose();
    this.players.clear(), r.info("Player: all tracks cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), r.info("PlayerAudioEngine: AudioContext resumed"));
  }
  dispose() {
    this.clearAll(), this.ctx.close(), r.info("PlayerAudioEngine disposed");
  }
}
const q = "advanced-sound-engine", w = `module.${q}`;
class K {
  constructor() {
    d(this, "gmEngine", null);
    d(this, "playerEngine", null);
    d(this, "socket", null);
    d(this, "_syncEnabled", !1);
    d(this, "isGM", !1);
  }
  initializeAsGM(e) {
    var t;
    this.isGM = !0, this.gmEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(w, (a) => {
      this.handleGMMessage(a);
    }), r.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(e) {
    var t;
    this.isGM = !1, this.playerEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(w, (a) => {
      this.handlePlayerMessage(a);
    }), setTimeout(() => {
      this.send("player-ready", {});
    }, 1e3), r.info("SocketManager initialized as Player");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Mode (GM)
  // ─────────────────────────────────────────────────────────────
  get syncEnabled() {
    return this._syncEnabled;
  }
  setSyncEnabled(e) {
    this.isGM && (this._syncEnabled = e, e ? this.broadcastSyncStart() : this.broadcastSyncStop(), r.info(`Sync mode: ${e ? "ON" : "OFF"}`));
  }
  // ─────────────────────────────────────────────────────────────
  // GM Message Handling
  // ─────────────────────────────────────────────────────────────
  handleGMMessage(e) {
    var t;
    e.senderId !== ((t = game.user) == null ? void 0 : t.id) && e.type === "player-ready" && this._syncEnabled && this.sendStateTo(e.senderId);
  }
  // ─────────────────────────────────────────────────────────────
  // Player Message Handling
  // ─────────────────────────────────────────────────────────────
  async handlePlayerMessage(e) {
    var t;
    if (e.senderId !== ((t = game.user) == null ? void 0 : t.id) && this.playerEngine)
      switch (r.debug(`Player received: ${e.type}`, e.payload), e.type) {
        case "sync-start":
          const a = e.payload;
          await this.playerEngine.syncState(a.tracks, a.channelVolumes);
          break;
        case "sync-stop":
          this.playerEngine.clearAll();
          break;
        case "sync-state":
          const i = e.payload;
          await this.playerEngine.syncState(i.tracks, i.channelVolumes);
          break;
        case "track-play":
          const s = e.payload;
          await this.playerEngine.handlePlay(s);
          break;
        case "track-pause":
          const n = e.payload;
          this.playerEngine.handlePause(n.trackId);
          break;
        case "track-stop":
          const o = e.payload;
          this.playerEngine.handleStop(o.trackId);
          break;
        case "track-seek":
          const c = e.payload;
          this.playerEngine.handleSeek(
            c.trackId,
            c.time,
            c.isPlaying,
            c.seekTimestamp
          );
          break;
        case "track-volume":
          const u = e.payload;
          this.playerEngine.handleTrackVolume(u.trackId, u.volume);
          break;
        case "track-loop":
          const h = e.payload;
          this.playerEngine.handleTrackLoop(h.trackId, h.loop);
          break;
        case "channel-volume":
          const m = e.payload;
          this.playerEngine.setGMVolume(m.channel, m.volume);
          break;
        case "stop-all":
          this.playerEngine.stopAll();
          break;
      }
  }
  // ─────────────────────────────────────────────────────────────
  // GM Broadcast Methods
  // ─────────────────────────────────────────────────────────────
  send(e, t, a) {
    var s;
    if (!this.socket) return;
    const i = {
      type: e,
      payload: t,
      senderId: ((s = game.user) == null ? void 0 : s.id) ?? "",
      timestamp: T()
    };
    a ? this.socket.emit(w, i, { recipients: [a] }) : this.socket.emit(w, i), r.debug(`Sent: ${e}`, t);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const e = T(), t = [];
    for (const a of this.gmEngine.getAllTracks()) {
      const i = a.getState();
      t.push({
        id: i.id,
        url: i.url,
        group: i.group,
        volume: i.volume,
        loop: i.loop,
        isPlaying: i.playbackState === "playing",
        currentTime: a.getCurrentTime(),
        startTimestamp: e
      });
    }
    return {
      tracks: t,
      channelVolumes: this.gmEngine.volumes
    };
  }
  broadcastSyncStart() {
    const e = this.getCurrentSyncState();
    this.send("sync-start", e);
  }
  broadcastSyncStop() {
    this.send("sync-stop", {});
  }
  sendStateTo(e) {
    const t = this.getCurrentSyncState();
    this.send("sync-state", t, e);
  }
  // ─────────────────────────────────────────────────────────────
  // GM Actions (called when GM interacts with mixer)
  // ─────────────────────────────────────────────────────────────
  broadcastTrackPlay(e, t) {
    if (!this._syncEnabled || !this.gmEngine) return;
    const a = this.gmEngine.getTrack(e);
    if (!a) return;
    const i = {
      trackId: e,
      url: a.url,
      group: a.group,
      volume: a.volume,
      loop: a.loop,
      offset: t,
      startTimestamp: T()
    };
    this.send("track-play", i);
  }
  broadcastTrackPause(e, t) {
    if (!this._syncEnabled) return;
    const a = { trackId: e, pausedAt: t };
    this.send("track-pause", a);
  }
  broadcastTrackStop(e) {
    if (!this._syncEnabled) return;
    const t = { trackId: e };
    this.send("track-stop", t);
  }
  broadcastTrackSeek(e, t, a) {
    if (!this._syncEnabled) return;
    const i = {
      trackId: e,
      time: t,
      isPlaying: a,
      seekTimestamp: T()
    };
    this.send("track-seek", i);
  }
  broadcastTrackVolume(e, t) {
    if (!this._syncEnabled) return;
    const a = { trackId: e, volume: t };
    this.send("track-volume", a);
  }
  broadcastTrackLoop(e, t) {
    if (!this._syncEnabled) return;
    const a = { trackId: e, loop: t };
    this.send("track-loop", a);
  }
  broadcastChannelVolume(e, t) {
    if (!this._syncEnabled) return;
    const a = { channel: e, volume: t };
    this.send("channel-volume", a);
  }
  broadcastStopAll() {
    this._syncEnabled && this.send("stop-all", {});
  }
  dispose() {
    var e;
    (e = this.socket) == null || e.off(w);
  }
}
function A(l, e) {
  let t = 0, a = null;
  return function(...i) {
    const s = Date.now(), n = e - (s - t);
    n <= 0 ? (a && (clearTimeout(a), a = null), t = s, l.apply(this, i)) : a || (a = setTimeout(() => {
      t = Date.now(), a = null, l.apply(this, i);
    }, n));
  };
}
function Q(l, e) {
  let t = null;
  return function(...a) {
    t && clearTimeout(t), t = setTimeout(() => {
      l.apply(this, a);
    }, e);
  };
}
const L = "advanced-sound-engine";
function W() {
  return game.settings.get(L, "maxSimultaneousTracks") || 8;
}
class X extends Application {
  constructor(t, a, i) {
    super(i);
    d(this, "engine");
    d(this, "socket");
    d(this, "updateInterval", null);
    this.engine = t, this.socket = a;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-sound-mixer",
      title: "Sound Mixer (GM)",
      template: `modules/${L}/templates/mixer.hbs`,
      classes: ["ase-mixer"],
      width: 550,
      height: "auto",
      resizable: !0,
      minimizable: !0,
      popOut: !0
    });
  }
  getData() {
    const t = this.engine.getAllTracks().map((s) => this.getTrackViewData(s)), a = this.engine.volumes, i = t.filter((s) => s.isPlaying).length;
    return {
      tracks: t,
      volumes: {
        master: Math.round(a.master * 100),
        music: Math.round(a.music * 100),
        ambience: Math.round(a.ambience * 100),
        sfx: Math.round(a.sfx * 100)
      },
      playingCount: i,
      maxSimultaneous: W(),
      syncEnabled: this.socket.syncEnabled
    };
  }
  getTrackViewData(t) {
    const a = t.getState(), i = t.getCurrentTime(), s = t.getDuration();
    return {
      id: a.id,
      name: this.extractFileName(a.url),
      group: a.group,
      isPlaying: a.playbackState === "playing",
      isPaused: a.playbackState === "paused",
      isStopped: a.playbackState === "stopped",
      isLoading: a.playbackState === "loading",
      volume: a.volume,
      volumePercent: Math.round(a.volume * 100),
      loop: a.loop,
      currentTime: i,
      currentTimeFormatted: P(i),
      duration: s,
      durationFormatted: P(s),
      progress: s > 0 ? i / s * 100 : 0
    };
  }
  extractFileName(t) {
    if (!t) return "Unknown";
    try {
      const i = decodeURIComponent(t).split("/");
      return i[i.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      const a = t.split("/");
      return a[a.length - 1].replace(/\.[^.]+$/, "");
    }
  }
  activateListeners(t) {
    super.activateListeners(t), t.find("#ase-sync-toggle").on("change", (o) => {
      const c = o.target.checked;
      this.socket.setSyncEnabled(c), this.updateSyncIndicator(t, c);
    });
    const a = A((o, c) => {
      o === "master" ? (this.engine.setMasterVolume(c), this.socket.broadcastChannelVolume("master", c)) : (this.engine.setChannelVolume(o, c), this.socket.broadcastChannelVolume(o, c));
    }, 50);
    t.find(".ase-channel-slider").on("input", (o) => {
      const c = $(o.currentTarget).data("channel"), u = parseFloat(o.target.value) / 100;
      a(c, u), $(o.currentTarget).siblings(".ase-channel-value").text(`${Math.round(u * 100)}%`);
    }), t.find("#ase-add-track").on("click", () => this.onAddTrack());
    const i = t.find(".ase-tracks");
    i.on("click", ".ase-btn-play", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(c);
    }), i.on("click", ".ase-btn-pause", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(c);
    }), i.on("click", ".ase-btn-stop", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(c);
    }), i.on("click", ".ase-btn-remove", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(c);
    }), i.on("change", ".ase-loop-toggle", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id"), u = o.target.checked;
      this.engine.setTrackLoop(c, u), this.socket.broadcastTrackLoop(c, u);
    }), i.on("change", ".ase-channel-select", (o) => {
      const c = $(o.currentTarget).data("track-id"), u = o.target.value;
      this.engine.setTrackChannel(c, u);
    });
    const s = A((o, c) => {
      this.engine.setTrackVolume(o, c), this.socket.broadcastTrackVolume(o, c);
    }, 50);
    i.on("input", ".ase-volume-slider", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id"), u = parseFloat(o.target.value) / 100;
      s(c, u), $(o.currentTarget).siblings(".ase-volume-value").text(`${Math.round(u * 100)}%`);
    });
    const n = A((o, c) => {
      const u = this.engine.getTrack(o), h = (u == null ? void 0 : u.state) === "playing";
      this.engine.seekTrack(o, c), this.socket.broadcastTrackSeek(o, c, h ?? !1);
    }, 100);
    i.on("input", ".ase-seek-slider", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id"), u = this.engine.getTrack(c);
      if (u) {
        const m = parseFloat(o.target.value) / 100 * u.getDuration();
        n(c, m);
      }
    }), t.find("#ase-stop-all").on("click", () => {
      this.engine.stopAll(), this.socket.broadcastStopAll(), this.render();
    }), this.startUpdates();
  }
  updateSyncIndicator(t, a) {
    const i = t.find(".ase-sync-status");
    i.toggleClass("is-active", a), i.find("span").text(a ? "SYNC ON" : "SYNC OFF");
  }
  startUpdates() {
    this.stopUpdates(), this.updateInterval = setInterval(() => {
      this.updateTrackDisplays();
    }, 250);
  }
  stopUpdates() {
    this.updateInterval && (clearInterval(this.updateInterval), this.updateInterval = null);
  }
  updateTrackDisplays() {
    const t = this.element;
    if (!t || !t.length) return;
    let a = 0;
    for (const s of this.engine.getAllTracks()) {
      const n = t.find(`.ase-track[data-track-id="${s.id}"]`);
      if (!n.length) continue;
      const o = s.getCurrentTime(), c = s.getDuration(), u = c > 0 ? o / c * 100 : 0, h = s.state;
      h === "playing" && a++, n.find(".ase-time-current").text(P(o));
      const m = n.find(".ase-seek-slider");
      m.is(":active") || m.val(u), n.removeClass("is-playing is-paused is-stopped is-loading"), n.addClass(`is-${h}`), n.find(".ase-btn-play").prop("disabled", h === "playing" || h === "loading"), n.find(".ase-btn-pause").prop("disabled", h !== "playing"), n.find(".ase-btn-stop").prop("disabled", h === "stopped");
    }
    const i = this.engine.getAllTracks().length;
    t.find(".ase-track-count").text(`${a}/${i} playing`);
  }
  async onAddTrack() {
    new FilePicker({
      type: "audio",
      current: "",
      callback: async (a) => {
        await this.addTrackFromPath(a);
      }
    }).render(!0);
  }
  async addTrackFromPath(t, a = "music") {
    var s, n;
    const i = S();
    try {
      await this.engine.createTrack({
        id: i,
        url: t,
        group: a,
        volume: 1,
        loop: !1
      }), this.render(), (s = ui.notifications) == null || s.info(`Added: ${this.extractFileName(t)}`);
    } catch (o) {
      r.error("Failed to add track:", o);
      const c = o instanceof Error ? o.message : "Unknown error";
      (n = ui.notifications) == null || n.error(`Failed to load: ${c}`);
    }
  }
  async onPlayTrack(t) {
    const a = this.engine.getTrack(t);
    if (!a) return;
    const i = a.state === "paused" ? a.getCurrentTime() : 0;
    await this.engine.playTrack(t, i), this.socket.broadcastTrackPlay(t, i);
  }
  onPauseTrack(t) {
    const a = this.engine.getTrack(t);
    if (!a) return;
    const i = a.getCurrentTime();
    this.engine.pauseTrack(t), this.socket.broadcastTrackPause(t, i);
  }
  onStopTrack(t) {
    this.engine.stopTrack(t), this.socket.broadcastTrackStop(t);
  }
  onRemoveTrack(t) {
    this.engine.removeTrack(t), this.render();
  }
  close(t) {
    return this.stopUpdates(), super.close(t);
  }
}
const E = "advanced-sound-engine";
class N extends Application {
  constructor(t, a) {
    super(a);
    d(this, "engine");
    this.engine = t;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-player-volume",
      title: "Sound Volume",
      template: `modules/${E}/templates/player-volume.hbs`,
      classes: ["ase-player-panel"],
      width: 200,
      height: "auto",
      resizable: !1,
      minimizable: !0,
      popOut: !0
    });
  }
  getData() {
    return {
      volume: Math.round(this.engine.localVolume * 100)
    };
  }
  activateListeners(t) {
    super.activateListeners(t), t.find(".ase-volume-slider").on("input", (a) => {
      const i = parseFloat(a.target.value) / 100;
      this.engine.setLocalVolume(i), t.find(".ase-volume-value").text(`${Math.round(i * 100)}%`), this.saveVolume(i);
    });
  }
  saveVolume(t) {
    localStorage.setItem(`${E}-player-volume`, String(t));
  }
  static loadSavedVolume() {
    const t = localStorage.getItem(`${E}-player-volume`);
    return t ? parseFloat(t) : 1;
  }
}
class Z extends Application {
  constructor(t, a = {}) {
    super(a);
    d(this, "library");
    this.library = t;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "local-library",
      template: "modules/advanced-sound-engine/templates/library.hbs",
      title: "Sound Library",
      width: 1100,
      height: 700,
      classes: ["advanced-sound-engine", "library"],
      resizable: !0,
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "library" }]
    });
  }
  getData() {
    const t = this.library.getAllItems(), a = this.library.playlists.getAllPlaylists(), i = this.library.getAllTags(), s = this.library.getStats(), n = this.library.getFavorites(), o = this.library.playlists.getFavoritePlaylists(), c = [
      ...n.map((h) => ({
        id: h.id,
        name: h.name,
        type: "track"
      })),
      ...o.map((h) => ({
        id: h.id,
        name: h.name,
        type: "playlist"
      }))
    ], u = i.map((h) => ({
      name: h,
      selected: !1
      // TODO: implement filter state management
    }));
    return {
      items: t.map((h) => this.getItemViewData(h)),
      playlists: a.map((h) => this.getPlaylistViewData(h)),
      favorites: c,
      tags: u,
      stats: {
        totalItems: s.totalItems,
        favoriteItems: s.favoriteItems,
        playlists: s.playlists,
        tagCount: s.tagCount
      }
    };
  }
  getPlaylistViewData(t) {
    return {
      id: t.id,
      name: t.name,
      itemCount: t.items.length,
      favorite: t.favorite,
      selected: !1
    };
  }
  getItemViewData(t) {
    return {
      id: t.id,
      name: t.name,
      url: t.url,
      duration: P(t.duration),
      durationSeconds: t.duration,
      tags: t.tags,
      favorite: t.favorite,
      group: this.inferGroupFromTags(t.tags)
    };
  }
  inferGroupFromTags(t) {
    const a = t.map((i) => i.toLowerCase());
    return a.some((i) => i.includes("music")) ? "music" : a.some((i) => i.includes("ambient") || i.includes("ambience")) ? "ambience" : a.some((i) => i.includes("sfx") || i.includes("effect")) ? "sfx" : "music";
  }
  activateListeners(t) {
    super.activateListeners(t), t.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), t.find('[data-action="search"]').on("input", this.onSearch.bind(this)), t.find('[data-action="filter-channel"]').on("click", this.onFilterChannel.bind(this)), t.find('[data-action="change-sort"]').on("change", this.onChangeSort.bind(this)), t.find('[data-action="toggle-tag"]').on("click", this.onToggleTag.bind(this)), t.find('[data-action="add-tag"]').on("click", this.onAddTag.bind(this)), t.find('[data-action="play-track"]').on("click", this.onPlayTrack.bind(this)), t.find('[data-action="stop-track"]').on("click", this.onStopTrack.bind(this)), t.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), t.find('[data-action="add-to-playlist"]').on("click", this.onAddToPlaylist.bind(this)), t.find('[data-action="track-menu"]').on("click", this.onTrackMenu.bind(this)), t.find('[data-action="select-playlist"]').on("click", this.onSelectPlaylist.bind(this)), t.find('[data-action="create-playlist"]').on("click", this.onCreatePlaylist.bind(this)), t.find('[data-action="toggle-playlist-favorite"]').on("click", this.onTogglePlaylistFavorite.bind(this)), t.find('[data-action="playlist-menu"]').on("click", this.onPlaylistMenu.bind(this)), t.find('[data-action="remove-from-favorites"]').on("click", this.onRemoveFromFavorites.bind(this)), this.setupDragAndDrop(t), r.debug("LocalLibraryApp listeners activated");
  }
  // ─────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onAddTrack(t) {
    t.preventDefault(), new FilePicker({
      type: "audio",
      callback: async (i) => {
        await this.addTrackFromPath(i);
      }
    }).render(!0);
  }
  async addTrackFromPath(t, a = "music") {
    var i, s;
    try {
      const n = await this.library.addItem(t, void 0, a);
      this.render(), (i = ui.notifications) == null || i.info(`Added to library: ${n.name}`);
    } catch (n) {
      r.error("Failed to add track to library:", n);
      const o = n instanceof Error ? n.message : "Unknown error";
      (s = ui.notifications) == null || s.error(`Failed to add track: ${o}`);
    }
  }
  async onToggleFavorite(t) {
    var i, s;
    t.preventDefault();
    const a = $(t.currentTarget).closest("[data-item-id]").data("item-id");
    try {
      const n = this.library.toggleFavorite(a);
      this.render(), (i = ui.notifications) == null || i.info(n ? "Added to favorites" : "Removed from favorites");
    } catch (n) {
      r.error("Failed to toggle favorite:", n), (s = ui.notifications) == null || s.error("Failed to update favorite status");
    }
  }
  async onDeleteTrack(t) {
    var n, o, c;
    t.preventDefault();
    const a = $(t.currentTarget).closest("[data-item-id]").data("item-id"), i = this.library.getItem(a);
    if (!i) {
      (n = ui.notifications) == null || n.error("Track not found");
      return;
    }
    if (await Dialog.confirm({
      title: "Delete Track",
      content: `<p>Are you sure you want to delete <strong>${i.name}</strong> from the library?</p>
                <p class="notification warning">This will remove it from all playlists and favorites.</p>`,
      yes: () => !0,
      no: () => !1,
      defaultYes: !1
    }))
      try {
        this.library.removeItem(a), this.render(), (o = ui.notifications) == null || o.info(`Deleted: ${i.name}`);
      } catch (u) {
        r.error("Failed to delete track:", u), (c = ui.notifications) == null || c.error("Failed to delete track");
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onCreatePlaylist(t) {
    var i, s;
    t.preventDefault();
    const a = await this.promptPlaylistName();
    if (a)
      try {
        const n = this.library.playlists.createPlaylist(a);
        this.render(), (i = ui.notifications) == null || i.info(`Created playlist: ${n.name}`);
      } catch (n) {
        r.error("Failed to create playlist:", n);
        const o = n instanceof Error ? n.message : "Unknown error";
        (s = ui.notifications) == null || s.error(`Failed to create playlist: ${o}`);
      }
  }
  async onTogglePlaylistFavorite(t) {
    var i, s;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).closest("[data-playlist-id]").data("playlist-id");
    try {
      const n = this.library.playlists.togglePlaylistFavorite(a);
      this.render(), (i = ui.notifications) == null || i.info(n ? "Added to favorites" : "Removed from favorites");
    } catch (n) {
      r.error("Failed to toggle playlist favorite:", n), (s = ui.notifications) == null || s.error("Failed to update favorite status");
    }
  }
  async onRemoveFromFavorites(t) {
    var s, n;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).closest("[data-favorite-id]").data("favorite-id"), i = $(t.currentTarget).closest("[data-favorite-type]").data("favorite-type");
    try {
      i === "track" ? this.library.toggleFavorite(a) : i === "playlist" && this.library.playlists.togglePlaylistFavorite(a), this.render(), (s = ui.notifications) == null || s.info("Removed from favorites");
    } catch (o) {
      r.error("Failed to remove from favorites:", o), (n = ui.notifications) == null || n.error("Failed to remove from favorites");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Toolbar Event Handlers
  // ─────────────────────────────────────────────────────────────
  onSearch(t) {
    const a = ($(t.currentTarget).val() || "").trim();
    r.debug("Search:", a);
  }
  onFilterChannel(t) {
    t.preventDefault();
    const a = $(t.currentTarget).data("channel");
    $(t.currentTarget).siblings().removeClass("active"), $(t.currentTarget).addClass("active"), r.debug("Filter channel:", a);
  }
  onChangeSort(t) {
    const a = $(t.currentTarget).val();
    r.debug("Sort changed:", a);
  }
  // ─────────────────────────────────────────────────────────────
  // Tag Event Handlers
  // ─────────────────────────────────────────────────────────────
  onToggleTag(t) {
    t.preventDefault();
    const a = $(t.currentTarget).data("tag");
    $(t.currentTarget).toggleClass("selected"), r.debug("Toggle tag:", a);
  }
  async onAddTag(t) {
    var i;
    t.preventDefault();
    const a = await this.promptTagName();
    a && (r.debug("Add tag:", a), (i = ui.notifications) == null || i.info(`Tag "${a}" created`));
  }
  // ─────────────────────────────────────────────────────────────
  // Track Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onPlayTrack(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id");
    r.debug("Play track:", a), (i = ui.notifications) == null || i.info("Play functionality coming soon");
  }
  onStopTrack(t) {
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id");
    r.debug("Stop track:", a);
  }
  async onAddToPlaylist(t) {
    var o, c, u, h;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id"), i = this.library.getItem(a);
    if (!i) {
      (o = ui.notifications) == null || o.error("Track not found");
      return;
    }
    const s = this.library.playlists.getAllPlaylists();
    if (s.length === 0) {
      (c = ui.notifications) == null || c.warn("No playlists available. Create one first.");
      return;
    }
    const n = await this.promptPlaylistSelection(s);
    if (n)
      try {
        const m = this.inferGroupFromTags(i.tags);
        this.library.playlists.addTrackToPlaylist(n, a, m), this.render(), (u = ui.notifications) == null || u.info(`Added "${i.name}" to playlist`);
      } catch (m) {
        r.error("Failed to add track to playlist:", m);
        const U = m instanceof Error ? m.message : "Unknown error";
        (h = ui.notifications) == null || h.error(`Failed to add to playlist: ${U}`);
      }
  }
  onTrackMenu(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id");
    r.debug("Track menu:", a), (i = ui.notifications) == null || i.info("Context menu coming soon");
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onSelectPlaylist(t) {
    t.preventDefault();
    const a = $(t.currentTarget).data("playlist-id");
    $(t.currentTarget).siblings().removeClass("selected"), $(t.currentTarget).addClass("selected"), r.debug("Select playlist:", a);
  }
  onPlaylistMenu(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("playlist-id");
    r.debug("Playlist menu:", a), (i = ui.notifications) == null || i.info("Context menu coming soon");
  }
  // ─────────────────────────────────────────────────────────────
  // Drag and Drop
  // ─────────────────────────────────────────────────────────────
  setupDragAndDrop(t) {
    t.find('.track-item[draggable="true"]').on("dragstart", (a) => {
      const i = $(a.currentTarget).data("item-id");
      a.originalEvent.dataTransfer.effectAllowed = "copy", a.originalEvent.dataTransfer.setData("text/plain", i), $(a.currentTarget).addClass("dragging");
    }), t.find('.track-item[draggable="true"]').on("dragend", (a) => {
      $(a.currentTarget).removeClass("dragging");
    }), t.find(".playlist-item").on("dragover", (a) => {
      a.preventDefault(), a.originalEvent.dataTransfer.dropEffect = "copy", $(a.currentTarget).addClass("drag-over");
    }), t.find(".playlist-item").on("dragleave", (a) => {
      $(a.currentTarget).removeClass("drag-over");
    }), t.find(".playlist-item").on("drop", async (a) => {
      a.preventDefault();
      const i = a.originalEvent.dataTransfer.getData("text/plain"), s = $(a.currentTarget).data("playlist-id");
      $(a.currentTarget).removeClass("drag-over"), await this.handleDropTrackToPlaylist(i, s);
    });
  }
  async handleDropTrackToPlaylist(t, a) {
    var n, o, c;
    const i = this.library.getItem(t), s = this.library.playlists.getPlaylist(a);
    if (!i || !s) {
      (n = ui.notifications) == null || n.error("Track or playlist not found");
      return;
    }
    try {
      const u = this.inferGroupFromTags(i.tags);
      this.library.playlists.addTrackToPlaylist(a, t, u), this.render(), (o = ui.notifications) == null || o.info(`Added "${i.name}" to "${s.name}"`);
    } catch (u) {
      r.error("Failed to add track to playlist:", u);
      const h = u instanceof Error ? u.message : "Unknown error";
      (c = ui.notifications) == null || c.error(`Failed to add to playlist: ${h}`);
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  async promptTagName() {
    return new Promise((t) => {
      new Dialog({
        title: "Add Tag",
        content: `
          <form>
            <div class="form-group">
              <label>Tag Name:</label>
              <input type="text" name="tag-name" placeholder="#Dramatic" autofocus />
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Add",
            callback: (a) => {
              let i = (a.find('[name="tag-name"]').val() || "").trim();
              i.startsWith("#") && (i = i.substring(1)), t(i || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => t(null)
          }
        },
        default: "create"
      }).render(!0);
    });
  }
  async promptPlaylistSelection(t) {
    const a = t.map(
      (i) => `<option value="${i.id}">${i.name} (${i.items.length} tracks)</option>`
    ).join("");
    return new Promise((i) => {
      new Dialog({
        title: "Add to Playlist",
        content: `
          <form>
            <div class="form-group">
              <label>Select Playlist:</label>
              <select name="playlist-id">
                ${a}
              </select>
            </div>
          </form>
        `,
        buttons: {
          add: {
            icon: '<i class="fas fa-plus"></i>',
            label: "Add",
            callback: (s) => {
              const n = s.find('[name="playlist-id"]').val();
              i(n || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => i(null)
          }
        },
        default: "add"
      }).render(!0);
    });
  }
  async promptPlaylistName() {
    return new Promise((t) => {
      new Dialog({
        title: "Create Playlist",
        content: `
          <form>
            <div class="form-group">
              <label>Playlist Name:</label>
              <input type="text" name="playlist-name" autofocus />
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create",
            callback: (a) => {
              const i = (a.find('[name="playlist-name"]').val() || "").trim();
              t(i || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => t(null)
          }
        },
        default: "create"
      }).render(!0);
    });
  }
}
class tt {
  constructor(e) {
    d(this, "playlists", /* @__PURE__ */ new Map());
    d(this, "onChangeCallback");
    this.onChangeCallback = e;
  }
  /**
   * Notify about changes (triggers save)
   */
  notifyChange() {
    this.onChangeCallback && this.onChangeCallback();
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations - Playlists
  // ─────────────────────────────────────────────────────────────
  /**
   * Create new playlist
   */
  createPlaylist(e, t) {
    if (this.findByName(e))
      throw new Error(`Playlist with name "${e}" already exists`);
    const i = Date.now(), s = {
      id: S(),
      name: e,
      description: t,
      items: [],
      createdAt: i,
      updatedAt: i,
      favorite: !1
    };
    return this.playlists.set(s.id, s), this.notifyChange(), r.info(`Playlist created: ${s.name} (${s.id})`), s;
  }
  /**
   * Update playlist metadata
   */
  updatePlaylist(e, t) {
    const a = this.playlists.get(e);
    if (!a)
      throw new Error(`Playlist not found: ${e}`);
    if (t.name && t.name !== a.name) {
      const s = this.findByName(t.name);
      if (s && s.id !== e)
        throw new Error(`Playlist with name "${t.name}" already exists`);
    }
    const i = {
      ...a,
      ...t,
      updatedAt: Date.now()
    };
    return this.playlists.set(e, i), this.notifyChange(), r.info(`Playlist updated: ${i.name}`), i;
  }
  /**
   * Delete playlist
   */
  deletePlaylist(e) {
    const t = this.playlists.get(e);
    if (!t)
      throw new Error(`Playlist not found: ${e}`);
    this.playlists.delete(e), this.notifyChange(), r.info(`Playlist deleted: ${t.name}`);
  }
  /**
   * Get playlist by ID
   */
  getPlaylist(e) {
    return this.playlists.get(e);
  }
  /**
   * Get all playlists
   */
  getAllPlaylists() {
    return Array.from(this.playlists.values());
  }
  /**
   * Find playlist by name
   */
  findByName(e) {
    return Array.from(this.playlists.values()).find((t) => t.name === e);
  }
  /**
   * Get favorite playlists
   */
  getFavoritePlaylists() {
    return this.getAllPlaylists().filter((e) => e.favorite);
  }
  /**
   * Toggle playlist favorite status
   */
  togglePlaylistFavorite(e) {
    const t = this.getPlaylist(e);
    if (!t)
      throw new Error(`Playlist not found: ${e}`);
    return t.favorite = !t.favorite, t.updatedAt = Date.now(), this.notifyChange(), t.favorite;
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations - Playlist Items
  // ─────────────────────────────────────────────────────────────
  /**
   * Add track to playlist
   */
  addTrackToPlaylist(e, t, a, i) {
    const s = this.getPlaylist(e);
    if (!s)
      throw new Error(`Playlist not found: ${e}`);
    if (s.items.find((c) => c.libraryItemId === t))
      throw new Error("Track already exists in this playlist");
    const o = {
      id: S(),
      libraryItemId: t,
      group: a,
      volume: (i == null ? void 0 : i.volume) ?? 1,
      loop: (i == null ? void 0 : i.loop) ?? !1,
      order: s.items.length,
      fadeIn: i == null ? void 0 : i.fadeIn,
      fadeOut: i == null ? void 0 : i.fadeOut
    };
    return s.items.push(o), s.updatedAt = Date.now(), this.notifyChange(), r.debug(`Track added to playlist ${s.name}: ${t}`), o;
  }
  /**
   * Remove track from playlist
   */
  removeTrackFromPlaylist(e, t) {
    const a = this.getPlaylist(e);
    if (!a)
      throw new Error(`Playlist not found: ${e}`);
    const i = a.items.findIndex((s) => s.id === t);
    if (i === -1)
      throw new Error(`Playlist item not found: ${t}`);
    a.items.splice(i, 1), this.reorderPlaylistItems(a), a.updatedAt = Date.now(), this.notifyChange(), r.debug(`Track removed from playlist ${a.name}`);
  }
  /**
   * Remove all tracks with specific library item ID from playlist
   */
  removeLibraryItemFromPlaylist(e, t) {
    const a = this.getPlaylist(e);
    if (!a)
      throw new Error(`Playlist not found: ${e}`);
    const i = a.items.length;
    a.items = a.items.filter((n) => n.libraryItemId !== t);
    const s = i - a.items.length;
    return s > 0 && (this.reorderPlaylistItems(a), a.updatedAt = Date.now(), this.notifyChange(), r.debug(`Removed ${s} instances of library item ${t} from playlist ${a.name}`)), s;
  }
  /**
   * Remove library item from all playlists
   */
  removeLibraryItemFromAllPlaylists(e) {
    let t = 0;
    return this.playlists.forEach((a) => {
      const i = a.items.length;
      a.items = a.items.filter((n) => n.libraryItemId !== e);
      const s = i - a.items.length;
      s > 0 && (this.reorderPlaylistItems(a), a.updatedAt = Date.now(), t += s);
    }), t > 0 && (this.notifyChange(), r.info(`Removed library item ${e} from ${t} playlist(s)`)), t;
  }
  /**
   * Update playlist item
   */
  updatePlaylistItem(e, t, a) {
    const i = this.getPlaylist(e);
    if (!i)
      throw new Error(`Playlist not found: ${e}`);
    const s = i.items.find((n) => n.id === t);
    if (!s)
      throw new Error(`Playlist item not found: ${t}`);
    return Object.assign(s, a), i.updatedAt = Date.now(), this.notifyChange(), r.debug(`Playlist item updated in ${i.name}`), s;
  }
  /**
   * Reorder track in playlist
   */
  reorderTrack(e, t, a) {
    const i = this.getPlaylist(e);
    if (!i)
      throw new Error(`Playlist not found: ${e}`);
    const s = i.items.findIndex((o) => o.id === t);
    if (s === -1)
      throw new Error(`Playlist item not found: ${t}`);
    if (a < 0 || a >= i.items.length)
      throw new Error(`Invalid order: ${a}`);
    const [n] = i.items.splice(s, 1);
    i.items.splice(a, 0, n), this.reorderPlaylistItems(i), i.updatedAt = Date.now(), this.notifyChange(), r.debug(`Track reordered in playlist ${i.name}`);
  }
  /**
   * Get tracks in playlist
   */
  getPlaylistTracks(e) {
    const t = this.getPlaylist(e);
    if (!t)
      throw new Error(`Playlist not found: ${e}`);
    return [...t.items].sort((a, i) => a.order - i.order);
  }
  /**
   * Get playlists containing a specific library item
   */
  getPlaylistsContainingItem(e) {
    return this.getAllPlaylists().filter(
      (t) => t.items.some((a) => a.libraryItemId === e)
    );
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  /**
   * Load playlists from state object
   */
  load(e) {
    this.playlists.clear(), Object.values(e).forEach((t) => {
      t.items.sort((a, i) => a.order - i.order), this.playlists.set(t.id, t);
    }), r.info(`PlaylistManager loaded: ${this.playlists.size} playlists`);
  }
  /**
   * Export playlists to state object
   */
  export() {
    return Object.fromEntries(this.playlists);
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  /**
   * Reorder playlist items to ensure consecutive order values
   */
  reorderPlaylistItems(e) {
    e.items.forEach((t, a) => {
      t.order = a;
    });
  }
  /**
   * Get statistics
   */
  getStats() {
    const e = this.getAllPlaylists();
    return {
      totalPlaylists: e.length,
      favoritePlaylists: e.filter((t) => t.favorite).length,
      totalTracks: e.reduce((t, a) => t + a.items.length, 0),
      averageTracksPerPlaylist: e.length > 0 ? Math.round(e.reduce((t, a) => t + a.items.length, 0) / e.length) : 0
    };
  }
  /**
   * Clear all playlists
   */
  clear() {
    this.playlists.clear(), r.warn("All playlists cleared");
  }
}
const G = "advanced-sound-engine", M = 1;
class et {
  constructor() {
    d(this, "items", /* @__PURE__ */ new Map());
    d(this, "saveScheduled", !1);
    d(this, "playlists");
    d(this, "debouncedSave", Q(() => {
      this.saveToSettings();
    }, 500));
    this.playlists = new tt(() => this.scheduleSave()), this.loadFromSettings();
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add new item to library
   */
  async addItem(e, t, a = "music") {
    const i = F(e);
    if (!i.valid)
      throw new Error(i.error || "Invalid audio file");
    const s = t || this.extractNameFromUrl(e), n = this.findByUrl(e);
    if (n)
      throw new Error(`Track with this URL already exists: ${n.name}`);
    if (this.findByName(s))
      throw new Error(`Track with name "${s}" already exists in library`);
    const c = Date.now(), u = {
      id: S(),
      url: e,
      name: s,
      tags: [],
      duration: 0,
      favorite: !1,
      addedAt: c,
      updatedAt: c
    };
    return this.items.set(u.id, u), this.scheduleSave(), r.info(`Library item added: ${u.name} (${u.id})`), u;
  }
  /**
   * Update existing item
   */
  updateItem(e, t) {
    const a = this.items.get(e);
    if (!a)
      throw new Error(`Library item not found: ${e}`);
    if (t.name && t.name !== a.name) {
      const s = this.findByName(t.name);
      if (s && s.id !== e)
        throw new Error(`Track with name "${t.name}" already exists`);
    }
    if (t.url && t.url !== a.url) {
      const s = F(t.url);
      if (!s.valid)
        throw new Error(s.error || "Invalid audio file");
      const n = this.findByUrl(t.url);
      if (n && n.id !== e)
        throw new Error(`Track with this URL already exists: ${n.name}`);
    }
    delete t.id;
    const i = {
      ...a,
      ...t,
      updatedAt: Date.now()
    };
    return this.items.set(e, i), this.scheduleSave(), r.info(`Library item updated: ${i.name}`), i;
  }
  /**
   * Remove item from library
   */
  removeItem(e) {
    const t = this.items.get(e);
    if (!t)
      throw new Error(`Library item not found: ${e}`);
    this.playlists.removeLibraryItemFromAllPlaylists(e), this.items.delete(e), this.scheduleSave(), r.info(`Library item removed: ${t.name}`);
  }
  /**
   * Get item by ID
   */
  getItem(e) {
    return this.items.get(e);
  }
  /**
   * Get all items
   */
  getAllItems() {
    return Array.from(this.items.values());
  }
  // ─────────────────────────────────────────────────────────────
  // Search & Filter
  // ─────────────────────────────────────────────────────────────
  /**
   * Find item by URL
   */
  findByUrl(e) {
    return Array.from(this.items.values()).find((t) => t.url === e);
  }
  /**
   * Find item by name
   */
  findByName(e) {
    return Array.from(this.items.values()).find((t) => t.name === e);
  }
  /**
   * Search items by query
   */
  searchByName(e) {
    const t = e.toLowerCase();
    return this.getAllItems().filter(
      (a) => a.name.toLowerCase().includes(t)
    );
  }
  /**
   * Filter items by tags (OR logic)
   */
  filterByTags(e) {
    return e.length === 0 ? this.getAllItems() : this.getAllItems().filter(
      (t) => t.tags.some((a) => e.includes(a))
    );
  }
  /**
   * Get favorite items
   */
  getFavorites() {
    return this.getAllItems().filter((e) => e.favorite);
  }
  // ─────────────────────────────────────────────────────────────
  // Tags Management
  // ─────────────────────────────────────────────────────────────
  /**
   * Get all unique tags
   */
  getAllTags() {
    const e = /* @__PURE__ */ new Set();
    return this.items.forEach((t) => {
      t.tags.forEach((a) => e.add(a));
    }), Array.from(e).sort();
  }
  /**
   * Add tag to item
   */
  addTagToItem(e, t) {
    const a = this.getItem(e);
    if (!a)
      throw new Error(`Library item not found: ${e}`);
    a.tags.includes(t) || (a.tags.push(t), a.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Remove tag from item
   */
  removeTagFromItem(e, t) {
    const a = this.getItem(e);
    if (!a)
      throw new Error(`Library item not found: ${e}`);
    const i = a.tags.indexOf(t);
    i !== -1 && (a.tags.splice(i, 1), a.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Rename tag globally
   */
  renameTag(e, t) {
    let a = 0;
    return this.items.forEach((i) => {
      const s = i.tags.indexOf(e);
      s !== -1 && (i.tags[s] = t, i.updatedAt = Date.now(), a++);
    }), a > 0 && (this.scheduleSave(), r.info(`Tag renamed: "${e}" → "${t}" (${a} items)`)), a;
  }
  /**
   * Delete tag globally
   */
  deleteTag(e) {
    let t = 0;
    return this.items.forEach((a) => {
      const i = a.tags.indexOf(e);
      i !== -1 && (a.tags.splice(i, 1), a.updatedAt = Date.now(), t++);
    }), t > 0 && (this.scheduleSave(), r.info(`Tag deleted: "${e}" (${t} items)`)), t;
  }
  // ─────────────────────────────────────────────────────────────
  // Favorites
  // ─────────────────────────────────────────────────────────────
  /**
   * Toggle favorite status
   */
  toggleFavorite(e) {
    const t = this.getItem(e);
    if (!t)
      throw new Error(`Library item not found: ${e}`);
    return t.favorite = !t.favorite, t.updatedAt = Date.now(), this.scheduleSave(), t.favorite;
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  loadFromSettings() {
    try {
      const e = game.settings.get(G, "libraryState");
      if (!e) {
        r.info("No saved library state, starting fresh");
        return;
      }
      const t = JSON.parse(e);
      t.version !== M && r.warn(`Library version mismatch: ${t.version} → ${M}`), this.items.clear(), Object.values(t.items).forEach((a) => {
        this.items.set(a.id, a);
      }), this.playlists.load(t.playlists || {}), r.info(`Library loaded: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (e) {
      r.error("Failed to load library state:", e);
    }
  }
  saveToSettings() {
    try {
      const e = {
        items: Object.fromEntries(this.items),
        playlists: this.playlists.export(),
        version: M,
        lastModified: Date.now()
      };
      game.settings.set(G, "libraryState", JSON.stringify(e)), this.saveScheduled = !1, r.debug(`Library saved: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (e) {
      r.error("Failed to save library state:", e);
    }
  }
  scheduleSave() {
    this.debouncedSave();
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  extractNameFromUrl(e) {
    try {
      const a = decodeURIComponent(e).split("/");
      return a[a.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      return "Unknown Track";
    }
  }
  /**
   * Get library statistics
   */
  getStats() {
    const e = this.getAllItems(), t = this.playlists.getStats();
    return {
      totalItems: e.length,
      favoriteItems: e.filter((a) => a.favorite).length,
      totalDuration: e.reduce((a, i) => a + i.duration, 0),
      tagCount: this.getAllTags().length,
      playlists: t.totalPlaylists
    };
  }
  /**
   * Clear all library data
   */
  clear() {
    this.items.clear(), this.playlists.clear(), this.scheduleSave(), r.warn("Library cleared");
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.saveScheduled && this.saveToSettings();
  }
}
const C = "advanced-sound-engine";
let g = null, y = null, k = null, b = null, p = null, v = null, f = null;
Hooks.on("getSceneControlButtons", (l) => {
  var a;
  console.log("ASE: Hook fired", l);
  const e = ((a = game.user) == null ? void 0 : a.isGM) ?? !1, t = {
    "open-panel": {
      name: "open-panel",
      title: e ? "Sound Mixer" : "Sound Volume",
      icon: e ? "fas fa-sliders-h" : "fas fa-volume-up",
      button: !0,
      onClick: () => {
        var i;
        return (i = window.ASE) == null ? void 0 : i.openPanel();
      }
    }
  };
  e && (t["open-library"] = {
    name: "open-library",
    title: "Sound Library",
    icon: "fas fa-book",
    button: !0,
    onClick: () => {
      var i, s;
      return (s = (i = window.ASE) == null ? void 0 : i.openLibrary) == null ? void 0 : s.call(i);
    }
  }), l["advanced-sound-engine"] = {
    name: "advanced-sound-engine",
    title: e ? "Advanced Sound Engine" : "Sound Volume",
    icon: e ? "fas fa-sliders-h" : "fas fa-volume-up",
    visible: !0,
    tools: t
  };
});
function at() {
  Handlebars.registerHelper("formatDuration", (l) => {
    if (!l || l <= 0) return "--:--";
    const e = Math.floor(l / 60), t = Math.floor(l % 60);
    return `${e}:${t.toString().padStart(2, "0")}`;
  }), Handlebars.registerHelper("eq", (l, e) => l === e);
}
Hooks.once("init", () => {
  r.info("Initializing Advanced Sound Engine..."), ct(), at();
});
Hooks.once("ready", async () => {
  var e;
  const l = ((e = game.user) == null ? void 0 : e.isGM) ?? !1;
  r.info(`Starting Advanced Sound Engine (${l ? "GM" : "Player"})...`), f = new K(), l ? await it() : await st(), window.ASE = {
    isGM: l,
    openPanel: l ? rt : nt,
    openLibrary: l ? ot : void 0,
    engine: l ? g ?? void 0 : p ?? void 0,
    socket: f ?? void 0,
    library: l ? b ?? void 0 : void 0
  }, lt(), r.info("Advanced Sound Engine ready");
});
async function it() {
  b = new et(), g = new J(), f.initializeAsGM(g), await g.loadSavedState();
}
async function st() {
  p = new Y(), f.initializeAsPlayer(p);
  const l = N.loadSavedVolume();
  p.setLocalVolume(l);
}
function rt() {
  !g || !f || (y && y.rendered ? y.bringToTop() : (y = new X(g, f), y.render(!0)));
}
function nt() {
  p && (v && v.rendered ? v.bringToTop() : (v = new N(p), v.render(!0)));
}
function ot() {
  b && (k && k.rendered ? k.bringToTop() : (k = new Z(b), k.render(!0)));
}
function lt() {
  const l = () => {
    g == null || g.resume(), p == null || p.resume();
  };
  document.addEventListener("click", l, { once: !0 }), document.addEventListener("keydown", l, { once: !0 }), Hooks.once("canvasReady", l);
}
function ct() {
  game.settings.register(C, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  }), game.settings.register(C, "maxSimultaneousTracks", {
    name: "Maximum Simultaneous Tracks",
    hint: "Maximum number of tracks that can play simultaneously (1-32)",
    scope: "world",
    config: !0,
    type: Number,
    default: 16,
    range: {
      min: 1,
      max: 32,
      step: 1
    }
  }), game.settings.register(C, "libraryState", {
    name: "Library State",
    hint: "Internal storage for library items and playlists",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  y == null || y.close(), k == null || k.close(), v == null || v.close(), f == null || f.dispose(), g == null || g.dispose(), p == null || p.dispose(), b == null || b.dispose();
});
//# sourceMappingURL=module.js.map
