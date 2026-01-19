var O = Object.defineProperty;
var U = (l, t, e) => t in l ? O(l, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : l[t] = e;
var d = (l, t, e) => U(l, typeof t != "symbol" ? t + "" : t, e);
const S = "ASE", o = {
  info: (l, ...t) => {
    console.log(`${S} | ${l}`, ...t);
  },
  warn: (l, ...t) => {
    console.warn(`${S} | ${l}`, ...t);
  },
  error: (l, ...t) => {
    console.error(`${S} | ${l}`, ...t);
  },
  debug: (l, ...t) => {
    var e;
    (e = CONFIG == null ? void 0 : CONFIG.debug) != null && e.audio && console.debug(`${S} | ${l}`, ...t);
  }
};
class I {
  constructor(t, e, a, s = "music") {
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
    this.id = t, this.ctx = e, this._group = s, this.audio = new Audio(), this.audio.crossOrigin = "anonymous", this.audio.preload = "auto", this.gainNode = e.createGain(), this.outputNode = e.createGain(), this.gainNode.connect(this.outputNode), this.outputNode.connect(a), this.setupAudioEvents();
  }
  setupAudioEvents() {
    this.audio.addEventListener("canplay", () => {
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), o.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", o.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (t) => {
      o.error(`Track ${this.id} error:`, this.audio.error), this._state = "stopped";
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
  async load(t) {
    return this._state = "loading", this._url = t, this._ready = !1, new Promise((e, a) => {
      const s = () => {
        this.audio.removeEventListener("canplay", s), this.audio.removeEventListener("error", i), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", o.debug(`Track loaded: ${this.id}`), e();
      }, i = () => {
        this.audio.removeEventListener("canplay", s), this.audio.removeEventListener("error", i), this._state = "stopped", a(new Error(`Failed to load: ${t}`));
      };
      this.audio.addEventListener("canplay", s, { once: !0 }), this.audio.addEventListener("error", i, { once: !0 }), this.audio.src = t, this.audio.load();
    });
  }
  async play(t = 0) {
    if (!this._ready) {
      o.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(t, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", o.debug(`Track ${this.id} playing from ${t.toFixed(2)}s`);
    } catch (e) {
      o.error(`Failed to play ${this.id}:`, e);
    }
  }
  pause() {
    this._state === "playing" && (this.audio.pause(), this._state = "paused", o.debug(`Track ${this.id} paused at ${this.audio.currentTime.toFixed(2)}s`));
  }
  stop() {
    this.audio.pause(), this.audio.currentTime = 0, this._state = "stopped", o.debug(`Track ${this.id} stopped`);
  }
  seek(t) {
    const e = Math.max(0, Math.min(t, this.audio.duration || 0));
    this.audio.currentTime = e;
  }
  setVolume(t) {
    this._volume = Math.max(0, Math.min(1, t)), this.gainNode.gain.setValueAtTime(this._volume, this.ctx.currentTime);
  }
  setLoop(t) {
    this._loop = t, this.audio.loop = t;
  }
  setChannel(t, e) {
    this._group = t, this.outputNode.disconnect(), this.outputNode.connect(e);
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
    var t;
    this.audio.pause(), this.audio.src = "", (t = this.sourceNode) == null || t.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), o.debug(`Track ${this.id} disposed`);
  }
}
function k() {
  return Date.now();
}
function P(l) {
  if (!isFinite(l) || l < 0) return "0:00";
  const t = Math.floor(l / 60), e = Math.floor(l % 60);
  return `${t}:${e.toString().padStart(2, "0")}`;
}
function x() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (l) => {
    const t = Math.random() * 16 | 0;
    return (l === "x" ? t : t & 3 | 8).toString(16);
  });
}
const L = [
  ".mp3",
  ".ogg",
  ".wav",
  ".webm",
  ".m4a",
  ".aac",
  ".flac",
  ".opus"
], R = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/opus"
};
function z(l) {
  const t = C(l);
  return L.includes(t);
}
function C(l) {
  try {
    const a = decodeURIComponent(l).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return a ? `.${a[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function B(l) {
  const t = C(l);
  return R[t] || null;
}
function F(l) {
  if (!l || typeof l != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const t = C(l);
  if (!t)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!z(l))
    return {
      valid: !1,
      error: `Unsupported audio format: ${t}. Supported formats: ${L.join(", ")}`,
      extension: t
    };
  const e = B(l);
  return {
    valid: !0,
    extension: t,
    mimeType: e || void 0
  };
}
const V = "advanced-sound-engine";
function j() {
  return game.settings.get(V, "maxSimultaneousTracks") || 8;
}
class H {
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
    }, this.channelGains.music.connect(this.masterGain), this.channelGains.ambience.connect(this.masterGain), this.channelGains.sfx.connect(this.masterGain), o.info("AudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence (GM only)
  // ─────────────────────────────────────────────────────────────
  scheduleSave() {
    var t;
    (t = game.user) != null && t.isGM && (this.saveTimeout && clearTimeout(this.saveTimeout), this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 500));
  }
  async saveState() {
    var e;
    if (!game.ready || !((e = game.user) != null && e.isGM)) return;
    const t = this.getState();
    try {
      await game.settings.set(V, "mixerState", JSON.stringify(t)), o.debug("Mixer state saved");
    } catch (a) {
      o.error("Failed to save mixer state:", a);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const t = game.settings.get(V, "mixerState");
        if (!t) return;
        const e = JSON.parse(t);
        await this.restoreState(e), o.info("Mixer state restored");
      } catch (t) {
        o.error("Failed to load mixer state:", t);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(t) {
    const e = t.id || x();
    if (this.players.has(e))
      return this.players.get(e);
    const a = F(t.url);
    if (!a.valid) {
      const r = new Error(a.error || "Invalid audio file");
      throw o.error(`Track validation failed: ${a.error}`), r;
    }
    const s = this.channelGains[t.group], i = new I(
      e,
      this.ctx,
      s,
      t.group
    );
    return t.volume !== void 0 && i.setVolume(t.volume), t.loop !== void 0 && i.setLoop(t.loop), await i.load(t.url), this.players.set(e, i), this.scheduleSave(), o.info(`Track created: ${e} (${a.extension})`), i;
  }
  getTrack(t) {
    return this.players.get(t);
  }
  removeTrack(t) {
    const e = this.players.get(t);
    return e ? (e.dispose(), this.players.delete(t), this.scheduleSave(), o.info(`Track removed: ${t}`), !0) : !1;
  }
  getAllTracks() {
    return Array.from(this.players.values());
  }
  getTracksByGroup(t) {
    return this.getAllTracks().filter((e) => e.group === t);
  }
  setTrackChannel(t, e) {
    const a = this.players.get(t);
    a && (a.setChannel(e, this.channelGains[e]), this.scheduleSave());
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────
  async playTrack(t, e = 0) {
    var n;
    const a = this.players.get(t);
    if (!a) {
      o.warn(`Track not found: ${t}`);
      return;
    }
    const s = j(), i = this.getAllTracks().filter((c) => c.state === "playing").length;
    if (!(a.state === "playing") && i >= s) {
      o.warn(`Maximum simultaneous tracks (${s}) reached`), (n = ui.notifications) == null || n.warn(`Cannot play more than ${s} tracks simultaneously`);
      return;
    }
    await a.play(e);
  }
  pauseTrack(t) {
    var e;
    (e = this.players.get(t)) == null || e.pause();
  }
  stopTrack(t) {
    var e;
    (e = this.players.get(t)) == null || e.stop();
  }
  seekTrack(t, e) {
    var a;
    (a = this.players.get(t)) == null || a.seek(e);
  }
  setTrackVolume(t, e) {
    var a;
    (a = this.players.get(t)) == null || a.setVolume(e), this.scheduleSave();
  }
  setTrackLoop(t, e) {
    var a;
    (a = this.players.get(t)) == null || a.setLoop(e), this.scheduleSave();
  }
  stopAll() {
    for (const t of this.players.values())
      t.stop();
  }
  // ─────────────────────────────────────────────────────────────
  // Volume Control
  // ─────────────────────────────────────────────────────────────
  get volumes() {
    return { ...this._volumes };
  }
  setMasterVolume(t) {
    this._volumes.master = Math.max(0, Math.min(1, t)), this.masterGain.gain.linearRampToValueAtTime(
      this._volumes.master,
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  setChannelVolume(t, e) {
    this._volumes[t] = Math.max(0, Math.min(1, e)), this.channelGains[t].gain.linearRampToValueAtTime(
      this._volumes[t],
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  getChannelVolume(t) {
    return this._volumes[t];
  }
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  getState() {
    const t = [];
    for (const e of this.players.values())
      t.push(e.getState());
    return {
      masterVolume: this._volumes.master,
      channelVolumes: { ...this._volumes },
      tracks: t,
      timestamp: k(),
      syncEnabled: !1
    };
  }
  async restoreState(t) {
    if (this._volumes.master = t.masterVolume, this.masterGain.gain.setValueAtTime(this._volumes.master, this.ctx.currentTime), t.channelVolumes)
      for (const a of ["music", "ambience", "sfx"])
        this._volumes[a] = t.channelVolumes[a], this.channelGains[a].gain.setValueAtTime(this._volumes[a], this.ctx.currentTime);
    for (const a of t.tracks)
      if (!this.players.has(a.id))
        try {
          await this.createTrack({
            id: a.id,
            url: a.url,
            group: a.group,
            volume: a.volume,
            loop: a.loop
          });
        } catch (s) {
          o.error(`Failed to restore track ${a.id}:`, s);
        }
    const e = new Set(t.tracks.map((a) => a.id));
    for (const [a] of this.players)
      e.has(a) || this.removeTrack(a);
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), o.info("AudioContext resumed"));
  }
  get contextState() {
    return this.ctx.state;
  }
  // ─────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────
  dispose() {
    this.saveTimeout && clearTimeout(this.saveTimeout);
    for (const t of this.players.values())
      t.dispose();
    this.players.clear(), this.ctx.close(), o.info("AudioEngine disposed");
  }
}
class J {
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
    }, this.channelGains.music.connect(this.gmGain), this.channelGains.ambience.connect(this.gmGain), this.channelGains.sfx.connect(this.gmGain), o.info("PlayerAudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Local Volume (Player's personal control)
  // ─────────────────────────────────────────────────────────────
  get localVolume() {
    return this._localVolume;
  }
  setLocalVolume(t) {
    this._localVolume = Math.max(0, Math.min(1, t)), this.masterGain.gain.linearRampToValueAtTime(
      this._localVolume,
      this.ctx.currentTime + 0.01
    );
  }
  // ─────────────────────────────────────────────────────────────
  // GM Volume (from sync)
  // ─────────────────────────────────────────────────────────────
  setGMVolume(t, e) {
    const a = Math.max(0, Math.min(1, e));
    t === "master" ? (this._gmVolumes.master = a, this.gmGain.gain.linearRampToValueAtTime(a, this.ctx.currentTime + 0.01)) : (this._gmVolumes[t] = a, this.channelGains[t].gain.linearRampToValueAtTime(a, this.ctx.currentTime + 0.01));
  }
  setAllGMVolumes(t) {
    this._gmVolumes = { ...t }, this.gmGain.gain.setValueAtTime(t.master, this.ctx.currentTime), this.channelGains.music.gain.setValueAtTime(t.music, this.ctx.currentTime), this.channelGains.ambience.gain.setValueAtTime(t.ambience, this.ctx.currentTime), this.channelGains.sfx.gain.setValueAtTime(t.sfx, this.ctx.currentTime);
  }
  // ─────────────────────────────────────────────────────────────
  // Track Commands (from GM via socket)
  // ─────────────────────────────────────────────────────────────
  async handlePlay(t) {
    let e = this.players.get(t.trackId);
    e || (e = new I(
      t.trackId,
      this.ctx,
      this.channelGains[t.group],
      t.group
    ), await e.load(t.url), this.players.set(t.trackId, e)), e.setVolume(t.volume), e.setLoop(t.loop);
    const a = (k() - t.startTimestamp) / 1e3, s = Math.max(0, t.offset + a);
    await e.play(s), o.debug(`Player: track ${t.trackId} playing at ${s.toFixed(2)}s`);
  }
  handlePause(t) {
    var e;
    (e = this.players.get(t)) == null || e.pause();
  }
  handleStop(t) {
    var e;
    (e = this.players.get(t)) == null || e.stop();
  }
  handleSeek(t, e, a, s) {
    const i = this.players.get(t);
    if (i)
      if (a) {
        const r = (k() - s) / 1e3;
        i.seek(e + r);
      } else
        i.seek(e);
  }
  handleTrackVolume(t, e) {
    var a;
    (a = this.players.get(t)) == null || a.setVolume(e);
  }
  handleTrackLoop(t, e) {
    var a;
    (a = this.players.get(t)) == null || a.setLoop(e);
  }
  // ─────────────────────────────────────────────────────────────
  // Sync State (full state from GM)
  // ─────────────────────────────────────────────────────────────
  async syncState(t, e) {
    this.setAllGMVolumes(e);
    const a = new Set(t.map((s) => s.id));
    for (const [s, i] of this.players)
      a.has(s) || (i.dispose(), this.players.delete(s));
    for (const s of t) {
      let i = this.players.get(s.id);
      if (i || (i = new I(
        s.id,
        this.ctx,
        this.channelGains[s.group],
        s.group
      ), await i.load(s.url), this.players.set(s.id, i)), i.setVolume(s.volume), i.setLoop(s.loop), s.isPlaying) {
        const r = (k() - s.startTimestamp) / 1e3, n = s.currentTime + r;
        await i.play(n);
      } else
        i.stop();
    }
    o.info("Player: synced state from GM");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Off
  // ─────────────────────────────────────────────────────────────
  stopAll() {
    for (const t of this.players.values())
      t.stop();
  }
  clearAll() {
    for (const t of this.players.values())
      t.dispose();
    this.players.clear(), o.info("Player: all tracks cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), o.info("PlayerAudioEngine: AudioContext resumed"));
  }
  dispose() {
    this.clearAll(), this.ctx.close(), o.info("PlayerAudioEngine disposed");
  }
}
const Y = "advanced-sound-engine", w = `module.${Y}`;
class q {
  constructor() {
    d(this, "gmEngine", null);
    d(this, "playerEngine", null);
    d(this, "socket", null);
    d(this, "_syncEnabled", !1);
    d(this, "isGM", !1);
  }
  initializeAsGM(t) {
    var e;
    this.isGM = !0, this.gmEngine = t, this.socket = game.socket, (e = this.socket) == null || e.on(w, (a) => {
      this.handleGMMessage(a);
    }), o.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(t) {
    var e;
    this.isGM = !1, this.playerEngine = t, this.socket = game.socket, (e = this.socket) == null || e.on(w, (a) => {
      this.handlePlayerMessage(a);
    }), setTimeout(() => {
      this.send("player-ready", {});
    }, 1e3), o.info("SocketManager initialized as Player");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Mode (GM)
  // ─────────────────────────────────────────────────────────────
  get syncEnabled() {
    return this._syncEnabled;
  }
  setSyncEnabled(t) {
    this.isGM && (this._syncEnabled = t, t ? this.broadcastSyncStart() : this.broadcastSyncStop(), o.info(`Sync mode: ${t ? "ON" : "OFF"}`));
  }
  // ─────────────────────────────────────────────────────────────
  // GM Message Handling
  // ─────────────────────────────────────────────────────────────
  handleGMMessage(t) {
    var e;
    t.senderId !== ((e = game.user) == null ? void 0 : e.id) && t.type === "player-ready" && this._syncEnabled && this.sendStateTo(t.senderId);
  }
  // ─────────────────────────────────────────────────────────────
  // Player Message Handling
  // ─────────────────────────────────────────────────────────────
  async handlePlayerMessage(t) {
    var e;
    if (t.senderId !== ((e = game.user) == null ? void 0 : e.id) && this.playerEngine)
      switch (o.debug(`Player received: ${t.type}`, t.payload), t.type) {
        case "sync-start":
          const a = t.payload;
          await this.playerEngine.syncState(a.tracks, a.channelVolumes);
          break;
        case "sync-stop":
          this.playerEngine.clearAll();
          break;
        case "sync-state":
          const s = t.payload;
          await this.playerEngine.syncState(s.tracks, s.channelVolumes);
          break;
        case "track-play":
          const i = t.payload;
          await this.playerEngine.handlePlay(i);
          break;
        case "track-pause":
          const r = t.payload;
          this.playerEngine.handlePause(r.trackId);
          break;
        case "track-stop":
          const n = t.payload;
          this.playerEngine.handleStop(n.trackId);
          break;
        case "track-seek":
          const c = t.payload;
          this.playerEngine.handleSeek(
            c.trackId,
            c.time,
            c.isPlaying,
            c.seekTimestamp
          );
          break;
        case "track-volume":
          const u = t.payload;
          this.playerEngine.handleTrackVolume(u.trackId, u.volume);
          break;
        case "track-loop":
          const h = t.payload;
          this.playerEngine.handleTrackLoop(h.trackId, h.loop);
          break;
        case "channel-volume":
          const T = t.payload;
          this.playerEngine.setGMVolume(T.channel, T.volume);
          break;
        case "stop-all":
          this.playerEngine.stopAll();
          break;
      }
  }
  // ─────────────────────────────────────────────────────────────
  // GM Broadcast Methods
  // ─────────────────────────────────────────────────────────────
  send(t, e, a) {
    var i;
    if (!this.socket) return;
    const s = {
      type: t,
      payload: e,
      senderId: ((i = game.user) == null ? void 0 : i.id) ?? "",
      timestamp: k()
    };
    a ? this.socket.emit(w, s, { recipients: [a] }) : this.socket.emit(w, s), o.debug(`Sent: ${t}`, e);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const t = k(), e = [];
    for (const a of this.gmEngine.getAllTracks()) {
      const s = a.getState();
      e.push({
        id: s.id,
        url: s.url,
        group: s.group,
        volume: s.volume,
        loop: s.loop,
        isPlaying: s.playbackState === "playing",
        currentTime: a.getCurrentTime(),
        startTimestamp: t
      });
    }
    return {
      tracks: e,
      channelVolumes: this.gmEngine.volumes
    };
  }
  broadcastSyncStart() {
    const t = this.getCurrentSyncState();
    this.send("sync-start", t);
  }
  broadcastSyncStop() {
    this.send("sync-stop", {});
  }
  sendStateTo(t) {
    const e = this.getCurrentSyncState();
    this.send("sync-state", e, t);
  }
  // ─────────────────────────────────────────────────────────────
  // GM Actions (called when GM interacts with mixer)
  // ─────────────────────────────────────────────────────────────
  broadcastTrackPlay(t, e) {
    if (!this._syncEnabled || !this.gmEngine) return;
    const a = this.gmEngine.getTrack(t);
    if (!a) return;
    const s = {
      trackId: t,
      url: a.url,
      group: a.group,
      volume: a.volume,
      loop: a.loop,
      offset: e,
      startTimestamp: k()
    };
    this.send("track-play", s);
  }
  broadcastTrackPause(t, e) {
    if (!this._syncEnabled) return;
    const a = { trackId: t, pausedAt: e };
    this.send("track-pause", a);
  }
  broadcastTrackStop(t) {
    if (!this._syncEnabled) return;
    const e = { trackId: t };
    this.send("track-stop", e);
  }
  broadcastTrackSeek(t, e, a) {
    if (!this._syncEnabled) return;
    const s = {
      trackId: t,
      time: e,
      isPlaying: a,
      seekTimestamp: k()
    };
    this.send("track-seek", s);
  }
  broadcastTrackVolume(t, e) {
    if (!this._syncEnabled) return;
    const a = { trackId: t, volume: e };
    this.send("track-volume", a);
  }
  broadcastTrackLoop(t, e) {
    if (!this._syncEnabled) return;
    const a = { trackId: t, loop: e };
    this.send("track-loop", a);
  }
  broadcastChannelVolume(t, e) {
    if (!this._syncEnabled) return;
    const a = { channel: t, volume: e };
    this.send("channel-volume", a);
  }
  broadcastStopAll() {
    this._syncEnabled && this.send("stop-all", {});
  }
  dispose() {
    var t;
    (t = this.socket) == null || t.off(w);
  }
}
function A(l, t) {
  let e = 0, a = null;
  return function(...s) {
    const i = Date.now(), r = t - (i - e);
    r <= 0 ? (a && (clearTimeout(a), a = null), e = i, l.apply(this, s)) : a || (a = setTimeout(() => {
      e = Date.now(), a = null, l.apply(this, s);
    }, r));
  };
}
function K(l, t) {
  let e = null;
  return function(...a) {
    e && clearTimeout(e), e = setTimeout(() => {
      l.apply(this, a);
    }, t);
  };
}
const D = "advanced-sound-engine";
function Q() {
  return game.settings.get(D, "maxSimultaneousTracks") || 8;
}
class X extends Application {
  constructor(e, a, s) {
    super(s);
    d(this, "engine");
    d(this, "socket");
    d(this, "updateInterval", null);
    this.engine = e, this.socket = a;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-sound-mixer",
      title: "Sound Mixer (GM)",
      template: `modules/${D}/templates/mixer.hbs`,
      classes: ["ase-mixer"],
      width: 550,
      height: "auto",
      resizable: !0,
      minimizable: !0,
      popOut: !0
    });
  }
  getData() {
    const e = this.engine.getAllTracks().map((i) => this.getTrackViewData(i)), a = this.engine.volumes, s = e.filter((i) => i.isPlaying).length;
    return {
      tracks: e,
      volumes: {
        master: Math.round(a.master * 100),
        music: Math.round(a.music * 100),
        ambience: Math.round(a.ambience * 100),
        sfx: Math.round(a.sfx * 100)
      },
      playingCount: s,
      maxSimultaneous: Q(),
      syncEnabled: this.socket.syncEnabled
    };
  }
  getTrackViewData(e) {
    const a = e.getState(), s = e.getCurrentTime(), i = e.getDuration();
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
      currentTime: s,
      currentTimeFormatted: P(s),
      duration: i,
      durationFormatted: P(i),
      progress: i > 0 ? s / i * 100 : 0
    };
  }
  extractFileName(e) {
    if (!e) return "Unknown";
    try {
      const s = decodeURIComponent(e).split("/");
      return s[s.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      const a = e.split("/");
      return a[a.length - 1].replace(/\.[^.]+$/, "");
    }
  }
  activateListeners(e) {
    super.activateListeners(e), e.find("#ase-sync-toggle").on("change", (n) => {
      const c = n.target.checked;
      this.socket.setSyncEnabled(c), this.updateSyncIndicator(e, c);
    });
    const a = A((n, c) => {
      n === "master" ? (this.engine.setMasterVolume(c), this.socket.broadcastChannelVolume("master", c)) : (this.engine.setChannelVolume(n, c), this.socket.broadcastChannelVolume(n, c));
    }, 50);
    e.find(".ase-channel-slider").on("input", (n) => {
      const c = $(n.currentTarget).data("channel"), u = parseFloat(n.target.value) / 100;
      a(c, u), $(n.currentTarget).siblings(".ase-channel-value").text(`${Math.round(u * 100)}%`);
    }), e.find("#ase-add-track").on("click", () => this.onAddTrack());
    const s = e.find(".ase-tracks");
    s.on("click", ".ase-btn-play", (n) => {
      const c = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(c);
    }), s.on("click", ".ase-btn-pause", (n) => {
      const c = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(c);
    }), s.on("click", ".ase-btn-stop", (n) => {
      const c = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(c);
    }), s.on("click", ".ase-btn-remove", (n) => {
      const c = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(c);
    }), s.on("change", ".ase-loop-toggle", (n) => {
      const c = $(n.currentTarget).closest(".ase-track").data("track-id"), u = n.target.checked;
      this.engine.setTrackLoop(c, u), this.socket.broadcastTrackLoop(c, u);
    }), s.on("change", ".ase-channel-select", (n) => {
      const c = $(n.currentTarget).data("track-id"), u = n.target.value;
      this.engine.setTrackChannel(c, u);
    });
    const i = A((n, c) => {
      this.engine.setTrackVolume(n, c), this.socket.broadcastTrackVolume(n, c);
    }, 50);
    s.on("input", ".ase-volume-slider", (n) => {
      const c = $(n.currentTarget).closest(".ase-track").data("track-id"), u = parseFloat(n.target.value) / 100;
      i(c, u), $(n.currentTarget).siblings(".ase-volume-value").text(`${Math.round(u * 100)}%`);
    });
    const r = A((n, c) => {
      const u = this.engine.getTrack(n), h = (u == null ? void 0 : u.state) === "playing";
      this.engine.seekTrack(n, c), this.socket.broadcastTrackSeek(n, c, h ?? !1);
    }, 100);
    s.on("input", ".ase-seek-slider", (n) => {
      const c = $(n.currentTarget).closest(".ase-track").data("track-id"), u = this.engine.getTrack(c);
      if (u) {
        const T = parseFloat(n.target.value) / 100 * u.getDuration();
        r(c, T);
      }
    }), e.find("#ase-stop-all").on("click", () => {
      this.engine.stopAll(), this.socket.broadcastStopAll(), this.render();
    }), this.startUpdates();
  }
  updateSyncIndicator(e, a) {
    const s = e.find(".ase-sync-status");
    s.toggleClass("is-active", a), s.find("span").text(a ? "SYNC ON" : "SYNC OFF");
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
    const e = this.element;
    if (!e || !e.length) return;
    let a = 0;
    for (const i of this.engine.getAllTracks()) {
      const r = e.find(`.ase-track[data-track-id="${i.id}"]`);
      if (!r.length) continue;
      const n = i.getCurrentTime(), c = i.getDuration(), u = c > 0 ? n / c * 100 : 0, h = i.state;
      h === "playing" && a++, r.find(".ase-time-current").text(P(n));
      const T = r.find(".ase-seek-slider");
      T.is(":active") || T.val(u), r.removeClass("is-playing is-paused is-stopped is-loading"), r.addClass(`is-${h}`), r.find(".ase-btn-play").prop("disabled", h === "playing" || h === "loading"), r.find(".ase-btn-pause").prop("disabled", h !== "playing"), r.find(".ase-btn-stop").prop("disabled", h === "stopped");
    }
    const s = this.engine.getAllTracks().length;
    e.find(".ase-track-count").text(`${a}/${s} playing`);
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
  async addTrackFromPath(e, a = "music") {
    var i, r;
    const s = x();
    try {
      await this.engine.createTrack({
        id: s,
        url: e,
        group: a,
        volume: 1,
        loop: !1
      }), this.render(), (i = ui.notifications) == null || i.info(`Added: ${this.extractFileName(e)}`);
    } catch (n) {
      o.error("Failed to add track:", n);
      const c = n instanceof Error ? n.message : "Unknown error";
      (r = ui.notifications) == null || r.error(`Failed to load: ${c}`);
    }
  }
  async onPlayTrack(e) {
    const a = this.engine.getTrack(e);
    if (!a) return;
    const s = a.state === "paused" ? a.getCurrentTime() : 0;
    await this.engine.playTrack(e, s), this.socket.broadcastTrackPlay(e, s);
  }
  onPauseTrack(e) {
    const a = this.engine.getTrack(e);
    if (!a) return;
    const s = a.getCurrentTime();
    this.engine.pauseTrack(e), this.socket.broadcastTrackPause(e, s);
  }
  onStopTrack(e) {
    this.engine.stopTrack(e), this.socket.broadcastTrackStop(e);
  }
  onRemoveTrack(e) {
    this.engine.removeTrack(e), this.render();
  }
  close(e) {
    return this.stopUpdates(), super.close(e);
  }
}
const E = "advanced-sound-engine";
class N extends Application {
  constructor(e, a) {
    super(a);
    d(this, "engine");
    this.engine = e;
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
  activateListeners(e) {
    super.activateListeners(e), e.find(".ase-volume-slider").on("input", (a) => {
      const s = parseFloat(a.target.value) / 100;
      this.engine.setLocalVolume(s), e.find(".ase-volume-value").text(`${Math.round(s * 100)}%`), this.saveVolume(s);
    });
  }
  saveVolume(e) {
    localStorage.setItem(`${E}-player-volume`, String(e));
  }
  static loadSavedVolume() {
    const e = localStorage.getItem(`${E}-player-volume`);
    return e ? parseFloat(e) : 1;
  }
}
class W extends Application {
  constructor(e, a = {}) {
    super(a);
    d(this, "library");
    this.library = e;
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
    const e = this.library.getAllItems(), a = this.library.playlists.getAllPlaylists(), s = this.library.getStats(), i = this.library.getFavorites(), r = this.library.playlists.getFavoritePlaylists(), n = [
      ...i.map((c) => ({
        id: c.id,
        name: c.name,
        type: "track"
      })),
      ...r.map((c) => ({
        id: c.id,
        name: c.name,
        type: "playlist"
      }))
    ];
    return {
      items: e.map((c) => this.getItemViewData(c)),
      playlists: a.map((c) => this.getPlaylistViewData(c)),
      favorites: n,
      stats: {
        total: s.totalItems,
        favorites: s.favoriteItems,
        playlists: s.playlists
      }
    };
  }
  getPlaylistViewData(e) {
    return {
      id: e.id,
      name: e.name,
      itemCount: e.items.length,
      favorite: e.favorite,
      selected: !1
    };
  }
  getItemViewData(e) {
    return {
      id: e.id,
      name: e.name,
      url: e.url,
      duration: P(e.duration),
      durationSeconds: e.duration,
      tags: e.tags,
      favorite: e.favorite,
      group: this.inferGroupFromTags(e.tags)
    };
  }
  inferGroupFromTags(e) {
    const a = e.map((s) => s.toLowerCase());
    return a.some((s) => s.includes("music")) ? "music" : a.some((s) => s.includes("ambient") || s.includes("ambience")) ? "ambience" : a.some((s) => s.includes("sfx") || s.includes("effect")) ? "sfx" : "music";
  }
  activateListeners(e) {
    super.activateListeners(e), e.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), e.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), e.find('[data-action="delete-track"]').on("click", this.onDeleteTrack.bind(this)), e.find('[data-action="create-playlist"]').on("click", this.onCreatePlaylist.bind(this)), e.find('[data-action="toggle-playlist-favorite"]').on("click", this.onTogglePlaylistFavorite.bind(this)), e.find('[data-action="remove-from-favorites"]').on("click", this.onRemoveFromFavorites.bind(this)), o.debug("LocalLibraryApp listeners activated");
  }
  // ─────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onAddTrack(e) {
    e.preventDefault(), new FilePicker({
      type: "audio",
      callback: async (s) => {
        await this.addTrackFromPath(s);
      }
    }).render(!0);
  }
  async addTrackFromPath(e, a = "music") {
    var s, i;
    try {
      const r = await this.library.addItem(e, void 0, a);
      this.render(), (s = ui.notifications) == null || s.info(`Added to library: ${r.name}`);
    } catch (r) {
      o.error("Failed to add track to library:", r);
      const n = r instanceof Error ? r.message : "Unknown error";
      (i = ui.notifications) == null || i.error(`Failed to add track: ${n}`);
    }
  }
  async onToggleFavorite(e) {
    var s, i;
    e.preventDefault();
    const a = $(e.currentTarget).closest("[data-item-id]").data("item-id");
    try {
      const r = this.library.toggleFavorite(a);
      this.render(), (s = ui.notifications) == null || s.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      o.error("Failed to toggle favorite:", r), (i = ui.notifications) == null || i.error("Failed to update favorite status");
    }
  }
  async onDeleteTrack(e) {
    var r, n, c;
    e.preventDefault();
    const a = $(e.currentTarget).closest("[data-item-id]").data("item-id"), s = this.library.getItem(a);
    if (!s) {
      (r = ui.notifications) == null || r.error("Track not found");
      return;
    }
    if (await Dialog.confirm({
      title: "Delete Track",
      content: `<p>Are you sure you want to delete <strong>${s.name}</strong> from the library?</p>
                <p class="notification warning">This will remove it from all playlists and favorites.</p>`,
      yes: () => !0,
      no: () => !1,
      defaultYes: !1
    }))
      try {
        this.library.removeItem(a), this.render(), (n = ui.notifications) == null || n.info(`Deleted: ${s.name}`);
      } catch (u) {
        o.error("Failed to delete track:", u), (c = ui.notifications) == null || c.error("Failed to delete track");
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onCreatePlaylist(e) {
    var s, i;
    e.preventDefault();
    const a = await this.promptPlaylistName();
    if (a)
      try {
        const r = this.library.playlists.createPlaylist(a);
        this.render(), (s = ui.notifications) == null || s.info(`Created playlist: ${r.name}`);
      } catch (r) {
        o.error("Failed to create playlist:", r);
        const n = r instanceof Error ? r.message : "Unknown error";
        (i = ui.notifications) == null || i.error(`Failed to create playlist: ${n}`);
      }
  }
  async onTogglePlaylistFavorite(e) {
    var s, i;
    e.preventDefault(), e.stopPropagation();
    const a = $(e.currentTarget).closest("[data-playlist-id]").data("playlist-id");
    try {
      const r = this.library.playlists.togglePlaylistFavorite(a);
      this.render(), (s = ui.notifications) == null || s.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      o.error("Failed to toggle playlist favorite:", r), (i = ui.notifications) == null || i.error("Failed to update favorite status");
    }
  }
  async onRemoveFromFavorites(e) {
    var i, r;
    e.preventDefault(), e.stopPropagation();
    const a = $(e.currentTarget).closest("[data-favorite-id]").data("favorite-id"), s = $(e.currentTarget).closest("[data-favorite-type]").data("favorite-type");
    try {
      s === "track" ? this.library.toggleFavorite(a) : s === "playlist" && this.library.playlists.togglePlaylistFavorite(a), this.render(), (i = ui.notifications) == null || i.info("Removed from favorites");
    } catch (n) {
      o.error("Failed to remove from favorites:", n), (r = ui.notifications) == null || r.error("Failed to remove from favorites");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  async promptPlaylistName() {
    return new Promise((e) => {
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
              const s = (a.find('[name="playlist-name"]').val() || "").trim();
              e(s || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => e(null)
          }
        },
        default: "create"
      }).render(!0);
    });
  }
}
class Z {
  constructor(t) {
    d(this, "playlists", /* @__PURE__ */ new Map());
    d(this, "onChangeCallback");
    this.onChangeCallback = t;
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
  createPlaylist(t, e) {
    if (this.findByName(t))
      throw new Error(`Playlist with name "${t}" already exists`);
    const s = Date.now(), i = {
      id: x(),
      name: t,
      description: e,
      items: [],
      createdAt: s,
      updatedAt: s,
      favorite: !1
    };
    return this.playlists.set(i.id, i), this.notifyChange(), o.info(`Playlist created: ${i.name} (${i.id})`), i;
  }
  /**
   * Update playlist metadata
   */
  updatePlaylist(t, e) {
    const a = this.playlists.get(t);
    if (!a)
      throw new Error(`Playlist not found: ${t}`);
    if (e.name && e.name !== a.name) {
      const i = this.findByName(e.name);
      if (i && i.id !== t)
        throw new Error(`Playlist with name "${e.name}" already exists`);
    }
    const s = {
      ...a,
      ...e,
      updatedAt: Date.now()
    };
    return this.playlists.set(t, s), this.notifyChange(), o.info(`Playlist updated: ${s.name}`), s;
  }
  /**
   * Delete playlist
   */
  deletePlaylist(t) {
    const e = this.playlists.get(t);
    if (!e)
      throw new Error(`Playlist not found: ${t}`);
    this.playlists.delete(t), this.notifyChange(), o.info(`Playlist deleted: ${e.name}`);
  }
  /**
   * Get playlist by ID
   */
  getPlaylist(t) {
    return this.playlists.get(t);
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
  findByName(t) {
    return Array.from(this.playlists.values()).find((e) => e.name === t);
  }
  /**
   * Get favorite playlists
   */
  getFavoritePlaylists() {
    return this.getAllPlaylists().filter((t) => t.favorite);
  }
  /**
   * Toggle playlist favorite status
   */
  togglePlaylistFavorite(t) {
    const e = this.getPlaylist(t);
    if (!e)
      throw new Error(`Playlist not found: ${t}`);
    return e.favorite = !e.favorite, e.updatedAt = Date.now(), this.notifyChange(), e.favorite;
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations - Playlist Items
  // ─────────────────────────────────────────────────────────────
  /**
   * Add track to playlist
   */
  addTrackToPlaylist(t, e, a, s) {
    const i = this.getPlaylist(t);
    if (!i)
      throw new Error(`Playlist not found: ${t}`);
    if (i.items.find((c) => c.libraryItemId === e))
      throw new Error("Track already exists in this playlist");
    const n = {
      id: x(),
      libraryItemId: e,
      group: a,
      volume: (s == null ? void 0 : s.volume) ?? 1,
      loop: (s == null ? void 0 : s.loop) ?? !1,
      order: i.items.length,
      fadeIn: s == null ? void 0 : s.fadeIn,
      fadeOut: s == null ? void 0 : s.fadeOut
    };
    return i.items.push(n), i.updatedAt = Date.now(), this.notifyChange(), o.debug(`Track added to playlist ${i.name}: ${e}`), n;
  }
  /**
   * Remove track from playlist
   */
  removeTrackFromPlaylist(t, e) {
    const a = this.getPlaylist(t);
    if (!a)
      throw new Error(`Playlist not found: ${t}`);
    const s = a.items.findIndex((i) => i.id === e);
    if (s === -1)
      throw new Error(`Playlist item not found: ${e}`);
    a.items.splice(s, 1), this.reorderPlaylistItems(a), a.updatedAt = Date.now(), this.notifyChange(), o.debug(`Track removed from playlist ${a.name}`);
  }
  /**
   * Remove all tracks with specific library item ID from playlist
   */
  removeLibraryItemFromPlaylist(t, e) {
    const a = this.getPlaylist(t);
    if (!a)
      throw new Error(`Playlist not found: ${t}`);
    const s = a.items.length;
    a.items = a.items.filter((r) => r.libraryItemId !== e);
    const i = s - a.items.length;
    return i > 0 && (this.reorderPlaylistItems(a), a.updatedAt = Date.now(), this.notifyChange(), o.debug(`Removed ${i} instances of library item ${e} from playlist ${a.name}`)), i;
  }
  /**
   * Remove library item from all playlists
   */
  removeLibraryItemFromAllPlaylists(t) {
    let e = 0;
    return this.playlists.forEach((a) => {
      const s = a.items.length;
      a.items = a.items.filter((r) => r.libraryItemId !== t);
      const i = s - a.items.length;
      i > 0 && (this.reorderPlaylistItems(a), a.updatedAt = Date.now(), e += i);
    }), e > 0 && (this.notifyChange(), o.info(`Removed library item ${t} from ${e} playlist(s)`)), e;
  }
  /**
   * Update playlist item
   */
  updatePlaylistItem(t, e, a) {
    const s = this.getPlaylist(t);
    if (!s)
      throw new Error(`Playlist not found: ${t}`);
    const i = s.items.find((r) => r.id === e);
    if (!i)
      throw new Error(`Playlist item not found: ${e}`);
    return Object.assign(i, a), s.updatedAt = Date.now(), this.notifyChange(), o.debug(`Playlist item updated in ${s.name}`), i;
  }
  /**
   * Reorder track in playlist
   */
  reorderTrack(t, e, a) {
    const s = this.getPlaylist(t);
    if (!s)
      throw new Error(`Playlist not found: ${t}`);
    const i = s.items.findIndex((n) => n.id === e);
    if (i === -1)
      throw new Error(`Playlist item not found: ${e}`);
    if (a < 0 || a >= s.items.length)
      throw new Error(`Invalid order: ${a}`);
    const [r] = s.items.splice(i, 1);
    s.items.splice(a, 0, r), this.reorderPlaylistItems(s), s.updatedAt = Date.now(), this.notifyChange(), o.debug(`Track reordered in playlist ${s.name}`);
  }
  /**
   * Get tracks in playlist
   */
  getPlaylistTracks(t) {
    const e = this.getPlaylist(t);
    if (!e)
      throw new Error(`Playlist not found: ${t}`);
    return [...e.items].sort((a, s) => a.order - s.order);
  }
  /**
   * Get playlists containing a specific library item
   */
  getPlaylistsContainingItem(t) {
    return this.getAllPlaylists().filter(
      (e) => e.items.some((a) => a.libraryItemId === t)
    );
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  /**
   * Load playlists from state object
   */
  load(t) {
    this.playlists.clear(), Object.values(t).forEach((e) => {
      e.items.sort((a, s) => a.order - s.order), this.playlists.set(e.id, e);
    }), o.info(`PlaylistManager loaded: ${this.playlists.size} playlists`);
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
  reorderPlaylistItems(t) {
    t.items.forEach((e, a) => {
      e.order = a;
    });
  }
  /**
   * Get statistics
   */
  getStats() {
    const t = this.getAllPlaylists();
    return {
      totalPlaylists: t.length,
      favoritePlaylists: t.filter((e) => e.favorite).length,
      totalTracks: t.reduce((e, a) => e + a.items.length, 0),
      averageTracksPerPlaylist: t.length > 0 ? Math.round(t.reduce((e, a) => e + a.items.length, 0) / t.length) : 0
    };
  }
  /**
   * Clear all playlists
   */
  clear() {
    this.playlists.clear(), o.warn("All playlists cleared");
  }
}
const G = "advanced-sound-engine", M = 1;
class ee {
  constructor() {
    d(this, "items", /* @__PURE__ */ new Map());
    d(this, "saveScheduled", !1);
    d(this, "playlists");
    d(this, "debouncedSave", K(() => {
      this.saveToSettings();
    }, 500));
    this.playlists = new Z(() => this.scheduleSave()), this.loadFromSettings();
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add new item to library
   */
  async addItem(t, e, a = "music") {
    const s = F(t);
    if (!s.valid)
      throw new Error(s.error || "Invalid audio file");
    const i = e || this.extractNameFromUrl(t), r = this.findByUrl(t);
    if (r)
      throw new Error(`Track with this URL already exists: ${r.name}`);
    if (this.findByName(i))
      throw new Error(`Track with name "${i}" already exists in library`);
    const c = Date.now(), u = {
      id: x(),
      url: t,
      name: i,
      tags: [],
      duration: 0,
      favorite: !1,
      addedAt: c,
      updatedAt: c
    };
    return this.items.set(u.id, u), this.scheduleSave(), o.info(`Library item added: ${u.name} (${u.id})`), u;
  }
  /**
   * Update existing item
   */
  updateItem(t, e) {
    const a = this.items.get(t);
    if (!a)
      throw new Error(`Library item not found: ${t}`);
    if (e.name && e.name !== a.name) {
      const i = this.findByName(e.name);
      if (i && i.id !== t)
        throw new Error(`Track with name "${e.name}" already exists`);
    }
    if (e.url && e.url !== a.url) {
      const i = F(e.url);
      if (!i.valid)
        throw new Error(i.error || "Invalid audio file");
      const r = this.findByUrl(e.url);
      if (r && r.id !== t)
        throw new Error(`Track with this URL already exists: ${r.name}`);
    }
    delete e.id;
    const s = {
      ...a,
      ...e,
      updatedAt: Date.now()
    };
    return this.items.set(t, s), this.scheduleSave(), o.info(`Library item updated: ${s.name}`), s;
  }
  /**
   * Remove item from library
   */
  removeItem(t) {
    const e = this.items.get(t);
    if (!e)
      throw new Error(`Library item not found: ${t}`);
    this.playlists.removeLibraryItemFromAllPlaylists(t), this.items.delete(t), this.scheduleSave(), o.info(`Library item removed: ${e.name}`);
  }
  /**
   * Get item by ID
   */
  getItem(t) {
    return this.items.get(t);
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
  findByUrl(t) {
    return Array.from(this.items.values()).find((e) => e.url === t);
  }
  /**
   * Find item by name
   */
  findByName(t) {
    return Array.from(this.items.values()).find((e) => e.name === t);
  }
  /**
   * Search items by query
   */
  searchByName(t) {
    const e = t.toLowerCase();
    return this.getAllItems().filter(
      (a) => a.name.toLowerCase().includes(e)
    );
  }
  /**
   * Filter items by tags (OR logic)
   */
  filterByTags(t) {
    return t.length === 0 ? this.getAllItems() : this.getAllItems().filter(
      (e) => e.tags.some((a) => t.includes(a))
    );
  }
  /**
   * Get favorite items
   */
  getFavorites() {
    return this.getAllItems().filter((t) => t.favorite);
  }
  // ─────────────────────────────────────────────────────────────
  // Tags Management
  // ─────────────────────────────────────────────────────────────
  /**
   * Get all unique tags
   */
  getAllTags() {
    const t = /* @__PURE__ */ new Set();
    return this.items.forEach((e) => {
      e.tags.forEach((a) => t.add(a));
    }), Array.from(t).sort();
  }
  /**
   * Add tag to item
   */
  addTagToItem(t, e) {
    const a = this.getItem(t);
    if (!a)
      throw new Error(`Library item not found: ${t}`);
    a.tags.includes(e) || (a.tags.push(e), a.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Remove tag from item
   */
  removeTagFromItem(t, e) {
    const a = this.getItem(t);
    if (!a)
      throw new Error(`Library item not found: ${t}`);
    const s = a.tags.indexOf(e);
    s !== -1 && (a.tags.splice(s, 1), a.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Rename tag globally
   */
  renameTag(t, e) {
    let a = 0;
    return this.items.forEach((s) => {
      const i = s.tags.indexOf(t);
      i !== -1 && (s.tags[i] = e, s.updatedAt = Date.now(), a++);
    }), a > 0 && (this.scheduleSave(), o.info(`Tag renamed: "${t}" → "${e}" (${a} items)`)), a;
  }
  /**
   * Delete tag globally
   */
  deleteTag(t) {
    let e = 0;
    return this.items.forEach((a) => {
      const s = a.tags.indexOf(t);
      s !== -1 && (a.tags.splice(s, 1), a.updatedAt = Date.now(), e++);
    }), e > 0 && (this.scheduleSave(), o.info(`Tag deleted: "${t}" (${e} items)`)), e;
  }
  // ─────────────────────────────────────────────────────────────
  // Favorites
  // ─────────────────────────────────────────────────────────────
  /**
   * Toggle favorite status
   */
  toggleFavorite(t) {
    const e = this.getItem(t);
    if (!e)
      throw new Error(`Library item not found: ${t}`);
    return e.favorite = !e.favorite, e.updatedAt = Date.now(), this.scheduleSave(), e.favorite;
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  loadFromSettings() {
    try {
      const t = game.settings.get(G, "libraryState");
      if (!t) {
        o.info("No saved library state, starting fresh");
        return;
      }
      const e = JSON.parse(t);
      e.version !== M && o.warn(`Library version mismatch: ${e.version} → ${M}`), this.items.clear(), Object.values(e.items).forEach((a) => {
        this.items.set(a.id, a);
      }), this.playlists.load(e.playlists || {}), o.info(`Library loaded: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (t) {
      o.error("Failed to load library state:", t);
    }
  }
  saveToSettings() {
    try {
      const t = {
        items: Object.fromEntries(this.items),
        playlists: this.playlists.export(),
        version: M,
        lastModified: Date.now()
      };
      game.settings.set(G, "libraryState", JSON.stringify(t)), this.saveScheduled = !1, o.debug(`Library saved: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (t) {
      o.error("Failed to save library state:", t);
    }
  }
  scheduleSave() {
    this.debouncedSave();
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  extractNameFromUrl(t) {
    try {
      const a = decodeURIComponent(t).split("/");
      return a[a.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      return "Unknown Track";
    }
  }
  /**
   * Get library statistics
   */
  getStats() {
    const t = this.getAllItems(), e = this.playlists.getStats();
    return {
      totalItems: t.length,
      favoriteItems: t.filter((a) => a.favorite).length,
      totalDuration: t.reduce((a, s) => a + s.duration, 0),
      tagCount: this.getAllTags().length,
      playlists: e.totalPlaylists
    };
  }
  /**
   * Clear all library data
   */
  clear() {
    this.items.clear(), this.playlists.clear(), this.scheduleSave(), o.warn("Library cleared");
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.saveScheduled && this.saveToSettings();
  }
}
const _ = "advanced-sound-engine";
let m = null, g = null, f = null, b = null, p = null, v = null, y = null;
Hooks.on("getSceneControlButtons", (l) => {
  var a;
  console.log("ASE: Hook fired", l);
  const t = ((a = game.user) == null ? void 0 : a.isGM) ?? !1, e = {
    "open-panel": {
      name: "open-panel",
      title: t ? "Sound Mixer" : "Sound Volume",
      icon: t ? "fas fa-sliders-h" : "fas fa-volume-up",
      button: !0,
      onClick: () => {
        var s;
        return (s = window.ASE) == null ? void 0 : s.openPanel();
      }
    }
  };
  t && (e["open-library"] = {
    name: "open-library",
    title: "Sound Library",
    icon: "fas fa-book",
    button: !0,
    onClick: () => {
      var s, i;
      return (i = (s = window.ASE) == null ? void 0 : s.openLibrary) == null ? void 0 : i.call(s);
    }
  }), l["advanced-sound-engine"] = {
    name: "advanced-sound-engine",
    title: t ? "Advanced Sound Engine" : "Sound Volume",
    icon: t ? "fas fa-sliders-h" : "fas fa-volume-up",
    visible: !0,
    tools: e
  };
});
Hooks.once("init", () => {
  o.info("Initializing Advanced Sound Engine..."), oe();
});
Hooks.once("ready", async () => {
  var t;
  const l = ((t = game.user) == null ? void 0 : t.isGM) ?? !1;
  o.info(`Starting Advanced Sound Engine (${l ? "GM" : "Player"})...`), y = new q(), l ? await te() : await ae(), window.ASE = {
    isGM: l,
    openPanel: l ? se : ie,
    openLibrary: l ? re : void 0,
    engine: l ? m ?? void 0 : p ?? void 0,
    socket: y ?? void 0,
    library: l ? b ?? void 0 : void 0
  }, ne(), o.info("Advanced Sound Engine ready");
});
async function te() {
  b = new ee(), m = new H(), y.initializeAsGM(m), await m.loadSavedState();
}
async function ae() {
  p = new J(), y.initializeAsPlayer(p);
  const l = N.loadSavedVolume();
  p.setLocalVolume(l);
}
function se() {
  !m || !y || (g && g.rendered ? g.bringToTop() : (g = new X(m, y), g.render(!0)));
}
function ie() {
  p && (v && v.rendered ? v.bringToTop() : (v = new N(p), v.render(!0)));
}
function re() {
  b && (f && f.rendered ? f.bringToTop() : (f = new W(b), f.render(!0)));
}
function ne() {
  const l = () => {
    m == null || m.resume(), p == null || p.resume();
  };
  document.addEventListener("click", l, { once: !0 }), document.addEventListener("keydown", l, { once: !0 }), Hooks.once("canvasReady", l);
}
function oe() {
  game.settings.register(_, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  }), game.settings.register(_, "maxSimultaneousTracks", {
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
  }), game.settings.register(_, "libraryState", {
    name: "Library State",
    hint: "Internal storage for library items and playlists",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  g == null || g.close(), f == null || f.close(), v == null || v.close(), y == null || y.dispose(), m == null || m.dispose(), p == null || p.dispose(), b == null || b.dispose();
});
//# sourceMappingURL=module.js.map
