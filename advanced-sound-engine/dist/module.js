var z = Object.defineProperty;
var j = (c, a, t) => a in c ? z(c, a, { enumerable: !0, configurable: !0, writable: !0, value: t }) : c[a] = t;
var u = (c, a, t) => j(c, typeof a != "symbol" ? a + "" : a, t);
const x = "ASE", l = {
  info: (c, ...a) => {
    console.log(`${x} | ${c}`, ...a);
  },
  warn: (c, ...a) => {
    console.warn(`${x} | ${c}`, ...a);
  },
  error: (c, ...a) => {
    console.error(`${x} | ${c}`, ...a);
  },
  debug: (c, ...a) => {
    var t;
    (t = CONFIG == null ? void 0 : CONFIG.debug) != null && t.audio && console.debug(`${x} | ${c}`, ...a);
  }
};
class F {
  constructor(a, t, e, i = "music") {
    u(this, "id");
    u(this, "ctx");
    u(this, "_group");
    u(this, "_url", "");
    u(this, "audio");
    u(this, "sourceNode", null);
    u(this, "gainNode");
    u(this, "outputNode");
    u(this, "_state", "stopped");
    u(this, "_volume", 1);
    u(this, "_loop", !1);
    u(this, "_ready", !1);
    this.id = a, this.ctx = t, this._group = i, this.audio = new Audio(), this.audio.crossOrigin = "anonymous", this.audio.preload = "auto", this.gainNode = t.createGain(), this.outputNode = t.createGain(), this.gainNode.connect(this.outputNode), this.outputNode.connect(e), this.setupAudioEvents();
  }
  setupAudioEvents() {
    this.audio.addEventListener("canplay", () => {
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), l.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", l.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (a) => {
      l.error(`Track ${this.id} error:`, this.audio.error), this._state = "stopped";
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
  async load(a) {
    return this._state = "loading", this._url = a, this._ready = !1, new Promise((t, e) => {
      const i = () => {
        this.audio.removeEventListener("canplay", i), this.audio.removeEventListener("error", s), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", l.debug(`Track loaded: ${this.id}`), t();
      }, s = () => {
        this.audio.removeEventListener("canplay", i), this.audio.removeEventListener("error", s), this._state = "stopped", e(new Error(`Failed to load: ${a}`));
      };
      this.audio.addEventListener("canplay", i, { once: !0 }), this.audio.addEventListener("error", s, { once: !0 }), this.audio.src = a, this.audio.load();
    });
  }
  async play(a = 0) {
    if (!this._ready) {
      l.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(a, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", l.debug(`Track ${this.id} playing from ${a.toFixed(2)}s`);
    } catch (t) {
      l.error(`Failed to play ${this.id}:`, t);
    }
  }
  pause() {
    this._state === "playing" && (this.audio.pause(), this._state = "paused", l.debug(`Track ${this.id} paused at ${this.audio.currentTime.toFixed(2)}s`));
  }
  stop() {
    this.audio.pause(), this.audio.currentTime = 0, this._state = "stopped", l.debug(`Track ${this.id} stopped`);
  }
  seek(a) {
    const t = Math.max(0, Math.min(a, this.audio.duration || 0));
    this.audio.currentTime = t;
  }
  setVolume(a) {
    this._volume = Math.max(0, Math.min(1, a)), this.gainNode.gain.setValueAtTime(this._volume, this.ctx.currentTime);
  }
  setLoop(a) {
    this._loop = a, this.audio.loop = a;
  }
  setChannel(a, t) {
    this._group = a, this.outputNode.disconnect(), this.outputNode.connect(t);
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
    var a;
    this.audio.pause(), this.audio.src = "", (a = this.sourceNode) == null || a.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), l.debug(`Track ${this.id} disposed`);
  }
}
function b() {
  return Date.now();
}
function P(c) {
  if (!isFinite(c) || c < 0) return "0:00";
  const a = Math.floor(c / 60), t = Math.floor(c % 60);
  return `${a}:${t.toString().padStart(2, "0")}`;
}
function S() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const a = Math.random() * 16 | 0;
    return (c === "x" ? a : a & 3 | 8).toString(16);
  });
}
const O = [
  ".mp3",
  ".ogg",
  ".wav",
  ".webm",
  ".m4a",
  ".aac",
  ".flac",
  ".opus"
], H = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/opus"
};
function Q(c) {
  const a = V(c);
  return O.includes(a);
}
function V(c) {
  try {
    const e = decodeURIComponent(c).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return e ? `.${e[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function Y(c) {
  const a = V(c);
  return H[a] || null;
}
function M(c) {
  if (!c || typeof c != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const a = V(c);
  if (!a)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!Q(c))
    return {
      valid: !1,
      error: `Unsupported audio format: ${a}. Supported formats: ${O.join(", ")}`,
      extension: a
    };
  const t = Y(c);
  return {
    valid: !0,
    extension: a,
    mimeType: t || void 0
  };
}
const L = "advanced-sound-engine";
function q() {
  return game.settings.get(L, "maxSimultaneousTracks") || 8;
}
class X {
  constructor() {
    u(this, "ctx");
    u(this, "masterGain");
    u(this, "channelGains");
    u(this, "players", /* @__PURE__ */ new Map());
    u(this, "_volumes", {
      master: 1,
      music: 1,
      ambience: 1,
      sfx: 1
    });
    u(this, "saveTimeout", null);
    this.ctx = new AudioContext(), this.masterGain = this.ctx.createGain(), this.masterGain.connect(this.ctx.destination), this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    }, this.channelGains.music.connect(this.masterGain), this.channelGains.ambience.connect(this.masterGain), this.channelGains.sfx.connect(this.masterGain), l.info("AudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence (GM only)
  // ─────────────────────────────────────────────────────────────
  scheduleSave() {
    var a;
    (a = game.user) != null && a.isGM && (this.saveTimeout && clearTimeout(this.saveTimeout), this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 500));
  }
  async saveState() {
    var t;
    if (!game.ready || !((t = game.user) != null && t.isGM)) return;
    const a = this.getState();
    try {
      await game.settings.set(L, "mixerState", JSON.stringify(a)), l.debug("Mixer state saved");
    } catch (e) {
      l.error("Failed to save mixer state:", e);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const a = game.settings.get(L, "mixerState");
        if (!a) return;
        const t = JSON.parse(a);
        await this.restoreState(t), l.info("Mixer state restored");
      } catch (a) {
        l.error("Failed to load mixer state:", a);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(a) {
    const t = a.id || S();
    if (this.players.has(t))
      return this.players.get(t);
    const e = M(a.url);
    if (!e.valid) {
      const r = new Error(e.error || "Invalid audio file");
      throw l.error(`Track validation failed: ${e.error}`), r;
    }
    const i = this.channelGains[a.group], s = new F(
      t,
      this.ctx,
      i,
      a.group
    );
    return a.volume !== void 0 && s.setVolume(a.volume), a.loop !== void 0 && s.setLoop(a.loop), await s.load(a.url), this.players.set(t, s), this.scheduleSave(), l.info(`Track created: ${t} (${e.extension})`), s;
  }
  getTrack(a) {
    return this.players.get(a);
  }
  removeTrack(a) {
    const t = this.players.get(a);
    return t ? (t.dispose(), this.players.delete(a), this.scheduleSave(), l.info(`Track removed: ${a}`), !0) : !1;
  }
  getAllTracks() {
    return Array.from(this.players.values());
  }
  getTracksByGroup(a) {
    return this.getAllTracks().filter((t) => t.group === a);
  }
  setTrackChannel(a, t) {
    const e = this.players.get(a);
    e && (e.setChannel(t, this.channelGains[t]), this.scheduleSave());
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────
  async playTrack(a, t = 0) {
    var n;
    const e = this.players.get(a);
    if (!e) {
      l.warn(`Track not found: ${a}`);
      return;
    }
    const i = q(), s = this.getAllTracks().filter((o) => o.state === "playing").length;
    if (!(e.state === "playing") && s >= i) {
      l.warn(`Maximum simultaneous tracks (${i}) reached`), (n = ui.notifications) == null || n.warn(`Cannot play more than ${i} tracks simultaneously`);
      return;
    }
    await e.play(t);
  }
  pauseTrack(a) {
    var t;
    (t = this.players.get(a)) == null || t.pause();
  }
  stopTrack(a) {
    var t;
    (t = this.players.get(a)) == null || t.stop();
  }
  seekTrack(a, t) {
    var e;
    (e = this.players.get(a)) == null || e.seek(t);
  }
  setTrackVolume(a, t) {
    var e;
    (e = this.players.get(a)) == null || e.setVolume(t), this.scheduleSave();
  }
  setTrackLoop(a, t) {
    var e;
    (e = this.players.get(a)) == null || e.setLoop(t), this.scheduleSave();
  }
  stopAll() {
    for (const a of this.players.values())
      a.stop();
  }
  // ─────────────────────────────────────────────────────────────
  // Volume Control
  // ─────────────────────────────────────────────────────────────
  get volumes() {
    return { ...this._volumes };
  }
  setMasterVolume(a) {
    this._volumes.master = Math.max(0, Math.min(1, a)), this.masterGain.gain.linearRampToValueAtTime(
      this._volumes.master,
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  setChannelVolume(a, t) {
    this._volumes[a] = Math.max(0, Math.min(1, t)), this.channelGains[a].gain.linearRampToValueAtTime(
      this._volumes[a],
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  getChannelVolume(a) {
    return this._volumes[a];
  }
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  getState() {
    const a = [];
    for (const t of this.players.values())
      a.push(t.getState());
    return {
      masterVolume: this._volumes.master,
      channelVolumes: { ...this._volumes },
      tracks: a,
      timestamp: b(),
      syncEnabled: !1
    };
  }
  async restoreState(a) {
    if (this._volumes.master = a.masterVolume, this.masterGain.gain.setValueAtTime(this._volumes.master, this.ctx.currentTime), a.channelVolumes)
      for (const e of ["music", "ambience", "sfx"])
        this._volumes[e] = a.channelVolumes[e], this.channelGains[e].gain.setValueAtTime(this._volumes[e], this.ctx.currentTime);
    for (const e of a.tracks)
      if (!this.players.has(e.id))
        try {
          await this.createTrack({
            id: e.id,
            url: e.url,
            group: e.group,
            volume: e.volume,
            loop: e.loop
          });
        } catch (i) {
          l.error(`Failed to restore track ${e.id}:`, i);
        }
    const t = new Set(a.tracks.map((e) => e.id));
    for (const [e] of this.players)
      t.has(e) || this.removeTrack(e);
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), l.info("AudioContext resumed"));
  }
  get contextState() {
    return this.ctx.state;
  }
  // ─────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────
  dispose() {
    this.saveTimeout && clearTimeout(this.saveTimeout);
    for (const a of this.players.values())
      a.dispose();
    this.players.clear(), this.ctx.close(), l.info("AudioEngine disposed");
  }
}
class J {
  constructor() {
    u(this, "ctx");
    u(this, "masterGain");
    u(this, "gmGain");
    // Громкость от GM
    u(this, "channelGains");
    u(this, "players", /* @__PURE__ */ new Map());
    u(this, "_localVolume", 1);
    // Личная громкость игрока
    u(this, "_gmVolumes", {
      master: 1,
      music: 1,
      ambience: 1,
      sfx: 1
    });
    this.ctx = new AudioContext(), this.masterGain = this.ctx.createGain(), this.masterGain.connect(this.ctx.destination), this.gmGain = this.ctx.createGain(), this.gmGain.connect(this.masterGain), this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    }, this.channelGains.music.connect(this.gmGain), this.channelGains.ambience.connect(this.gmGain), this.channelGains.sfx.connect(this.gmGain), l.info("PlayerAudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Local Volume (Player's personal control)
  // ─────────────────────────────────────────────────────────────
  get localVolume() {
    return this._localVolume;
  }
  setLocalVolume(a) {
    this._localVolume = Math.max(0, Math.min(1, a)), this.masterGain.gain.linearRampToValueAtTime(
      this._localVolume,
      this.ctx.currentTime + 0.01
    );
  }
  // ─────────────────────────────────────────────────────────────
  // GM Volume (from sync)
  // ─────────────────────────────────────────────────────────────
  setGMVolume(a, t) {
    const e = Math.max(0, Math.min(1, t));
    a === "master" ? (this._gmVolumes.master = e, this.gmGain.gain.linearRampToValueAtTime(e, this.ctx.currentTime + 0.01)) : (this._gmVolumes[a] = e, this.channelGains[a].gain.linearRampToValueAtTime(e, this.ctx.currentTime + 0.01));
  }
  setAllGMVolumes(a) {
    this._gmVolumes = { ...a }, this.gmGain.gain.setValueAtTime(a.master, this.ctx.currentTime), this.channelGains.music.gain.setValueAtTime(a.music, this.ctx.currentTime), this.channelGains.ambience.gain.setValueAtTime(a.ambience, this.ctx.currentTime), this.channelGains.sfx.gain.setValueAtTime(a.sfx, this.ctx.currentTime);
  }
  // ─────────────────────────────────────────────────────────────
  // Local Playback Control (Interface Compliance)
  // ─────────────────────────────────────────────────────────────
  async playTrack(a, t = 0) {
    const e = this.players.get(a);
    e ? await e.play(t) : l.warn(`PlayerAudioEngine: Track ${a} not found locally.`);
  }
  pauseTrack(a) {
    var t;
    (t = this.players.get(a)) == null || t.pause();
  }
  stopTrack(a) {
    var t;
    (t = this.players.get(a)) == null || t.stop();
  }
  // ─────────────────────────────────────────────────────────────
  // Track Commands (from GM via socket)
  // ─────────────────────────────────────────────────────────────
  async handlePlay(a) {
    let t = this.players.get(a.trackId);
    t || (t = new F(
      a.trackId,
      this.ctx,
      this.channelGains[a.group],
      a.group
    ), await t.load(a.url), this.players.set(a.trackId, t)), t.setVolume(a.volume), t.setLoop(a.loop);
    const e = (b() - a.startTimestamp) / 1e3, i = Math.max(0, a.offset + e);
    await t.play(i), l.debug(`Player: track ${a.trackId} playing at ${i.toFixed(2)}s`);
  }
  handlePause(a) {
    var t;
    (t = this.players.get(a)) == null || t.pause();
  }
  handleStop(a) {
    var t;
    (t = this.players.get(a)) == null || t.stop();
  }
  handleSeek(a, t, e, i) {
    const s = this.players.get(a);
    if (s)
      if (e) {
        const r = (b() - i) / 1e3;
        s.seek(t + r);
      } else
        s.seek(t);
  }
  handleTrackVolume(a, t) {
    var e;
    (e = this.players.get(a)) == null || e.setVolume(t);
  }
  handleTrackLoop(a, t) {
    var e;
    (e = this.players.get(a)) == null || e.setLoop(t);
  }
  // ─────────────────────────────────────────────────────────────
  // Sync State (full state from GM)
  // ─────────────────────────────────────────────────────────────
  async syncState(a, t) {
    this.setAllGMVolumes(t);
    const e = new Set(a.map((i) => i.id));
    for (const [i, s] of this.players)
      e.has(i) || (s.dispose(), this.players.delete(i));
    for (const i of a) {
      let s = this.players.get(i.id);
      if (s || (s = new F(
        i.id,
        this.ctx,
        this.channelGains[i.group],
        i.group
      ), await s.load(i.url), this.players.set(i.id, s)), s.setVolume(i.volume), s.setLoop(i.loop), i.isPlaying) {
        const r = (b() - i.startTimestamp) / 1e3, n = i.currentTime + r;
        await s.play(n);
      } else
        s.stop();
    }
    l.info("Player: synced state from GM");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Off
  // ─────────────────────────────────────────────────────────────
  stopAll() {
    for (const a of this.players.values())
      a.stop();
  }
  clearAll() {
    for (const a of this.players.values())
      a.dispose();
    this.players.clear(), l.info("Player: all tracks cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), l.info("PlayerAudioEngine: AudioContext resumed"));
  }
  dispose() {
    this.clearAll(), this.ctx.close(), l.info("PlayerAudioEngine disposed");
  }
}
const K = "advanced-sound-engine", w = `module.${K}`;
class W {
  constructor() {
    u(this, "gmEngine", null);
    u(this, "playerEngine", null);
    u(this, "socket", null);
    u(this, "_syncEnabled", !1);
    u(this, "isGM", !1);
  }
  initializeAsGM(a) {
    var t;
    this.isGM = !0, this.gmEngine = a, this.socket = game.socket, (t = this.socket) == null || t.on(w, (e) => {
      this.handleGMMessage(e);
    }), l.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(a) {
    var t;
    this.isGM = !1, this.playerEngine = a, this.socket = game.socket, (t = this.socket) == null || t.on(w, (e) => {
      this.handlePlayerMessage(e);
    }), setTimeout(() => {
      this.send("player-ready", {});
    }, 1e3), l.info("SocketManager initialized as Player");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Mode (GM)
  // ─────────────────────────────────────────────────────────────
  get syncEnabled() {
    return this._syncEnabled;
  }
  setSyncEnabled(a) {
    this.isGM && (this._syncEnabled = a, a ? this.broadcastSyncStart() : this.broadcastSyncStop(), l.info(`Sync mode: ${a ? "ON" : "OFF"}`));
  }
  // ─────────────────────────────────────────────────────────────
  // GM Message Handling
  // ─────────────────────────────────────────────────────────────
  handleGMMessage(a) {
    var t;
    a.senderId !== ((t = game.user) == null ? void 0 : t.id) && a.type === "player-ready" && this._syncEnabled && this.sendStateTo(a.senderId);
  }
  // ─────────────────────────────────────────────────────────────
  // Player Message Handling
  // ─────────────────────────────────────────────────────────────
  async handlePlayerMessage(a) {
    var t;
    if (a.senderId !== ((t = game.user) == null ? void 0 : t.id) && this.playerEngine)
      switch (l.debug(`Player received: ${a.type}`, a.payload), a.type) {
        case "sync-start":
          const e = a.payload;
          await this.playerEngine.syncState(e.tracks, e.channelVolumes);
          break;
        case "sync-stop":
          this.playerEngine.clearAll();
          break;
        case "sync-state":
          const i = a.payload;
          await this.playerEngine.syncState(i.tracks, i.channelVolumes);
          break;
        case "track-play":
          const s = a.payload;
          await this.playerEngine.handlePlay(s);
          break;
        case "track-pause":
          const r = a.payload;
          this.playerEngine.handlePause(r.trackId);
          break;
        case "track-stop":
          const n = a.payload;
          this.playerEngine.handleStop(n.trackId);
          break;
        case "track-seek":
          const o = a.payload;
          this.playerEngine.handleSeek(
            o.trackId,
            o.time,
            o.isPlaying,
            o.seekTimestamp
          );
          break;
        case "track-volume":
          const d = a.payload;
          this.playerEngine.handleTrackVolume(d.trackId, d.volume);
          break;
        case "track-loop":
          const h = a.payload;
          this.playerEngine.handleTrackLoop(h.trackId, h.loop);
          break;
        case "channel-volume":
          const m = a.payload;
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
  send(a, t, e) {
    var s;
    if (!this.socket) return;
    const i = {
      type: a,
      payload: t,
      senderId: ((s = game.user) == null ? void 0 : s.id) ?? "",
      timestamp: b()
    };
    e ? this.socket.emit(w, i, { recipients: [e] }) : this.socket.emit(w, i), l.debug(`Sent: ${a}`, t);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const a = b(), t = [];
    for (const e of this.gmEngine.getAllTracks()) {
      const i = e.getState();
      t.push({
        id: i.id,
        url: i.url,
        group: i.group,
        volume: i.volume,
        loop: i.loop,
        isPlaying: i.playbackState === "playing",
        currentTime: e.getCurrentTime(),
        startTimestamp: a
      });
    }
    return {
      tracks: t,
      channelVolumes: this.gmEngine.volumes
    };
  }
  broadcastSyncStart() {
    const a = this.getCurrentSyncState();
    this.send("sync-start", a);
  }
  broadcastSyncStop() {
    this.send("sync-stop", {});
  }
  sendStateTo(a) {
    const t = this.getCurrentSyncState();
    this.send("sync-state", t, a);
  }
  // ─────────────────────────────────────────────────────────────
  // GM Actions (called when GM interacts with mixer)
  // ─────────────────────────────────────────────────────────────
  broadcastTrackPlay(a, t) {
    if (!this._syncEnabled || !this.gmEngine) return;
    const e = this.gmEngine.getTrack(a);
    if (!e) return;
    const i = {
      trackId: a,
      url: e.url,
      group: e.group,
      volume: e.volume,
      loop: e.loop,
      offset: t,
      startTimestamp: b()
    };
    this.send("track-play", i);
  }
  broadcastTrackPause(a, t) {
    if (!this._syncEnabled) return;
    const e = { trackId: a, pausedAt: t };
    this.send("track-pause", e);
  }
  broadcastTrackStop(a) {
    if (!this._syncEnabled) return;
    const t = { trackId: a };
    this.send("track-stop", t);
  }
  broadcastTrackSeek(a, t, e) {
    if (!this._syncEnabled) return;
    const i = {
      trackId: a,
      time: t,
      isPlaying: e,
      seekTimestamp: b()
    };
    this.send("track-seek", i);
  }
  broadcastTrackVolume(a, t) {
    if (!this._syncEnabled) return;
    const e = { trackId: a, volume: t };
    this.send("track-volume", e);
  }
  broadcastTrackLoop(a, t) {
    if (!this._syncEnabled) return;
    const e = { trackId: a, loop: t };
    this.send("track-loop", e);
  }
  broadcastChannelVolume(a, t) {
    if (!this._syncEnabled) return;
    const e = { channel: a, volume: t };
    this.send("channel-volume", e);
  }
  broadcastStopAll() {
    this._syncEnabled && this.send("stop-all", {});
  }
  dispose() {
    var a;
    (a = this.socket) == null || a.off(w);
  }
}
const E = "advanced-sound-engine";
class U extends Application {
  constructor(t, e) {
    super(e);
    u(this, "engine");
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
    super.activateListeners(t), t.find(".ase-volume-slider").on("input", (e) => {
      const i = parseFloat(e.target.value) / 100;
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
  constructor(t, e = {}) {
    super(e);
    u(this, "library");
    u(this, "filterState");
    this.library = t, this.filterState = {
      searchQuery: "",
      selectedChannels: /* @__PURE__ */ new Set(["music", "ambience", "sfx"]),
      // Default all selected? Or none? User said "Green for active". Usually start with all or none. Let's start with all.
      selectedPlaylistId: null,
      selectedTags: /* @__PURE__ */ new Set(),
      // Default sort
      sortValue: "date-desc"
    };
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
  // Override render to delegate to main app
  render(t, e) {
    var i;
    if ((i = window.ASE) != null && i.openPanel) {
      window.ASE.openPanel("library", !0);
      return;
    }
    return super.render(t, e);
  }
  getData() {
    let t = this.library.getAllItems();
    const e = this.library.playlists.getAllPlaylists(), i = this.library.getAllTags(), s = this.library.getStats();
    t = this.applyFilters(t), t = this.applySorting(t);
    const r = this.library.getFavorites(), n = this.library.playlists.getFavoritePlaylists(), o = [
      ...r.map((f) => ({
        id: f.id,
        name: f.name,
        type: "track"
      })),
      ...n.map((f) => ({
        id: f.id,
        name: f.name,
        type: "playlist"
      }))
    ], d = new Set(i);
    this.filterState.selectedTags.forEach((f) => d.add(f));
    const h = Array.from(d).sort().map((f) => ({
      name: f.startsWith("#") ? f.substring(1) : f,
      // This is what is shown after the # in template
      value: f,
      // This is the actual data value
      selected: this.filterState.selectedTags.has(f)
    })), m = e.map((f) => ({
      ...this.getPlaylistViewData(f),
      selected: f.id === this.filterState.selectedPlaylistId
    })), A = this.filterState.selectedChannels.size === 3, B = !!(this.filterState.searchQuery || !A || this.filterState.selectedPlaylistId || this.filterState.selectedTags.size > 0);
    return {
      items: t.map((f) => this.getItemViewData(f)),
      playlists: m,
      favorites: o,
      tags: h,
      stats: {
        totalItems: s.totalItems,
        favoriteItems: s.favoriteItems,
        playlists: s.playlists,
        tagCount: s.tagCount
      },
      // Filter state for UI
      searchQuery: this.filterState.searchQuery,
      filters: {
        music: this.filterState.selectedChannels.has("music"),
        ambience: this.filterState.selectedChannels.has("ambience"),
        sfx: this.filterState.selectedChannels.has("sfx")
      },
      selectedPlaylistId: this.filterState.selectedPlaylistId,
      sortBy: this.filterState.sortBy,
      hasActiveFilters: B
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
    const e = t.map((i) => i.toLowerCase());
    return e.some((i) => i.includes("music")) ? "music" : e.some((i) => i.includes("ambient") || i.includes("ambience")) ? "ambience" : e.some((i) => i.includes("sfx") || i.includes("effect")) ? "sfx" : "music";
  }
  // ─────────────────────────────────────────────────────────────
  // Filtering & Sorting
  // ─────────────────────────────────────────────────────────────
  applyFilters(t) {
    let e = t;
    if (this.filterState.searchQuery) {
      const i = this.filterState.searchQuery.toLowerCase();
      e = e.filter(
        (s) => s.name.toLowerCase().includes(i) || s.tags.some((r) => r.toLowerCase().includes(i))
      );
    }
    if (this.filterState.selectedChannels.size > 0 ? e = e.filter((i) => {
      const s = this.inferGroupFromTags(i.tags);
      return this.filterState.selectedChannels.has(s);
    }) : e = [], this.filterState.selectedPlaylistId) {
      const i = this.library.playlists.getPlaylist(this.filterState.selectedPlaylistId);
      if (i) {
        const s = new Set(i.items.map((r) => r.libraryItemId));
        e = e.filter((r) => s.has(r.id));
      }
    }
    return this.filterState.selectedTags.size > 0 && (e = e.filter(
      (i) => i.tags.some((s) => this.filterState.selectedTags.has(s))
    )), e;
  }
  applySorting(t) {
    const e = [...t];
    switch (this.filterState.sortBy) {
      case "name-asc":
        e.sort((i, s) => i.name.localeCompare(s.name));
        break;
      case "name-desc":
        e.sort((i, s) => s.name.localeCompare(i.name));
        break;
      case "date-asc":
        e.sort((i, s) => i.addedAt - s.addedAt);
        break;
      case "date-desc":
        e.sort((i, s) => s.addedAt - i.addedAt);
        break;
      case "duration-asc":
        e.sort((i, s) => i.duration - s.duration);
        break;
      case "duration-desc":
        e.sort((i, s) => s.duration - i.duration);
        break;
    }
    return e;
  }
  activateListeners(t) {
    super.activateListeners(t), t.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), t.find(".ase-search-input").on("keydown", this.onSearchKeydown.bind(this)), t.find(".ase-search-clear").on("click", this.onClearSearch.bind(this)), t.find('[data-action="filter-channel"]').on("click", this._onFilterChannel.bind(this)), t.find('[data-action="change-sort"]').on("change", this.onChangeSort.bind(this)), t.find('[data-action="clear-filters"]').on("click", this.onClearFilters.bind(this)), t.find('[data-action="toggle-tag"]').on("click", this.onToggleTag.bind(this)), t.find('[data-action="add-tag"]').on("click", this.onAddTag.bind(this)), t.find('[data-action="play-track"]').on("click", this.onPlayTrack.bind(this)), t.find('[data-action="pause-track"]').on("click", this.onPauseTrack.bind(this)), t.find('[data-action="stop-track"]').on("click", this.onStopTrack.bind(this)), t.find('[data-action="add-to-queue"]').on("click", this.onAddToQueue.bind(this)), t.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), t.find('[data-action="add-to-playlist"]').on("click", this.onAddToPlaylist.bind(this)), t.find('[data-action="track-menu"]').on("click", this.onTrackMenu.bind(this)), t.find('[data-action="add-tag-to-track"]').on("click", this.onAddTagToTrack.bind(this)), t.find('[data-action="select-playlist"]').on("click", this.onSelectPlaylist.bind(this)), t.find('[data-action="create-playlist"]').on("click", this.onCreatePlaylist.bind(this)), t.find('[data-action="toggle-playlist-favorite"]').on("click", this.onTogglePlaylistFavorite.bind(this)), t.find('[data-action="playlist-menu"]').on("click", this.onPlaylistMenu.bind(this)), t.find('[data-action="remove-from-favorites"]').on("click", this.onRemoveFromFavorites.bind(this)), this.setupDragAndDrop(t), t.find(".ase-tag").on("contextmenu", this.onTagContext.bind(this)), l.debug("LocalLibraryApp listeners activated");
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
  async addTrackFromPath(t, e = "music") {
    var i, s;
    try {
      const r = await this.library.addItem(t, void 0, e);
      this.render(), (i = ui.notifications) == null || i.info(`Added to library: ${r.name}`);
    } catch (r) {
      l.error("Failed to add track to library:", r);
      const n = r instanceof Error ? r.message : "Unknown error";
      (s = ui.notifications) == null || s.error(`Failed to add track: ${n}`);
    }
  }
  async onToggleFavorite(t) {
    var i, s;
    t.preventDefault();
    const e = $(t.currentTarget).closest("[data-item-id]").data("item-id");
    try {
      const r = this.library.toggleFavorite(e);
      this.render(), (i = ui.notifications) == null || i.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      l.error("Failed to toggle favorite:", r), (s = ui.notifications) == null || s.error("Failed to update favorite status");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onCreatePlaylist(t) {
    var i, s;
    t.preventDefault();
    const e = await this.promptPlaylistName();
    if (e)
      try {
        const r = this.library.playlists.createPlaylist(e);
        this.render(), (i = ui.notifications) == null || i.info(`Created playlist: ${r.name}`);
      } catch (r) {
        l.error("Failed to create playlist:", r);
        const n = r instanceof Error ? r.message : "Unknown error";
        (s = ui.notifications) == null || s.error(`Failed to create playlist: ${n}`);
      }
  }
  async onTogglePlaylistFavorite(t) {
    var i, s;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).closest("[data-playlist-id]").data("playlist-id");
    try {
      const r = this.library.playlists.togglePlaylistFavorite(e);
      this.render(), (i = ui.notifications) == null || i.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      l.error("Failed to toggle playlist favorite:", r), (s = ui.notifications) == null || s.error("Failed to update favorite status");
    }
  }
  async onRemoveFromFavorites(t) {
    var s, r;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).closest("[data-favorite-id]").data("favorite-id"), i = $(t.currentTarget).closest("[data-favorite-type]").data("favorite-type");
    try {
      i === "track" ? this.library.toggleFavorite(e) : i === "playlist" && this.library.playlists.togglePlaylistFavorite(e), this.render(), (s = ui.notifications) == null || s.info("Removed from favorites");
    } catch (n) {
      l.error("Failed to remove from favorites:", n), (r = ui.notifications) == null || r.error("Failed to remove from favorites");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Toolbar Event Handlers
  // ─────────────────────────────────────────────────────────────
  onSearchInput(t) {
    if (t.type === "keydown" && t.key !== "Enter") return;
    const e = ($(t.currentTarget).val() || "").trim().toLowerCase();
    this.filterState.searchQuery !== e && (this.filterState.searchQuery = e, this.render());
  }
  // Also catch 'input' just for specific UI toggles if needed, but here we do fully via render.
  // Actually, let's decouple: 'input' event just shows/hides X button? 
  // User wants "When pressing Enter". So 'input' should NOT filter.
  // But we need to update the X button visibility? 
  // Let's keep it simple: 'keydown' on Enter -> sets state -> render.
  // On 'input', we just let the value sit in the box. 
  // But wait, the X button logic was in onSearchInput. 
  // Let's make a separate handler for visual updates if needed, OR just rely on render.
  // Render will re-create the X button state based on `searchQuery`? No, templates don't always track input value unless we pass it.
  // We passed `value="{{searchQuery}}"` in template.
  onSearchKeydown(t) {
    if (t.key === "Enter") {
      t.preventDefault();
      const e = ($(t.currentTarget).val() || "").trim().toLowerCase();
      this.filterState.searchQuery !== e && (this.filterState.searchQuery = e, this.render());
    }
  }
  onClearSearch(t) {
    this.filterState.searchQuery = "";
    const e = $(t.currentTarget).closest(".ase-search-input-wrapper");
    e.find(".ase-search-input").val("").trigger("focus"), e.find(".ase-search-clear").hide(), this.element.find(".ase-track-player-item").show();
  }
  _onFilterChannel(t) {
    t.preventDefault();
    const e = $(t.currentTarget), i = e.data("channel");
    this.filterState.selectedChannels.has(i) ? (this.filterState.selectedChannels.delete(i), e.removeClass("active")) : (this.filterState.selectedChannels.add(i), e.addClass("active")), this.render(), l.debug("Filter channel toggled:", i, this.filterState.selectedChannels);
  }
  onChangeSort(t) {
    const e = $(t.currentTarget).val();
    this.filterState.sortBy = e, this.render(), l.debug("Sort changed:", e);
  }
  onClearFilters(t) {
    var e;
    t.preventDefault(), this.filterState.searchQuery = "", this.filterState.selectedPlaylistId = null, this.filterState.selectedTags.clear(), this.render(), (e = ui.notifications) == null || e.info("Filters cleared (Channels preserved)");
  }
  // ─────────────────────────────────────────────────────────────
  // Tag Event Handlers
  // ─────────────────────────────────────────────────────────────
  onToggleTag(t) {
    t.preventDefault();
    const e = $(t.currentTarget).data("tag");
    this.filterState.selectedTags.has(e) ? this.filterState.selectedTags.delete(e) : this.filterState.selectedTags.add(e), this.render();
  }
  onTagContext(t) {
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("tag"), i = `
      <div id="ase-custom-context-menu" style="position: fixed; z-index: 10000; background: #222; border: 1px solid #444; border-radius: 4px; padding: 5px 0;">
        <div class="ase-ctx-item" data-action="edit" style="padding: 5px 15px; cursor: pointer; color: white;">
            <i class="fas fa-edit" style="margin-right: 5px;"></i> Edit
        </div>
        <div class="ase-ctx-item" data-action="delete" style="padding: 5px 15px; cursor: pointer; color: #ff6666;">
            <i class="fas fa-trash" style="margin-right: 5px;"></i> Delete
        </div>
      </div>
    `;
    $("#ase-custom-context-menu").remove();
    const s = $(i);
    $("body").append(s), s.css({
      top: t.clientY,
      left: t.clientX
    }), s.find('[data-action="edit"]').on("click", () => {
      this.renameTag(e), s.remove();
    }), s.find('[data-action="delete"]').on("click", () => {
      this.deleteTag(e), s.remove();
    }), s.find(".ase-ctx-item").hover(
      function() {
        $(this).css("background", "#333");
      },
      function() {
        $(this).css("background", "transparent");
      }
    ), $(document).one("click", () => {
      s.remove();
    }), console.log("Opened context menu for tag:", e);
  }
  async onAddTag(t) {
    var i;
    t.preventDefault();
    const e = await this.promptTagName();
    e && (this.filterState.selectedTags.add(e), this.library.addCustomTag(e), this.render(), (i = ui.notifications) == null || i.info(`Tag "${e}" added to filter list. Assign it to a track to save it permanently.`));
  }
  // Helper for Context Menu Callbacks to ensure `this` binding and argument passing
  _onRenameTag(t) {
    const e = t.data("tag");
    this.renameTag(e);
  }
  _onDeleteTag(t) {
    const e = t.data("tag");
    this.deleteTag(e);
  }
  // Correcting selector/listener activation for Context Menu if needed
  // Foundry ContextMenu usually works fine. If z-index issue, it's CSS.
  // We will force high z-index via CSS injection or ensure fixed position.
  // BUT: user said "Buttons don't work". 
  // This usually means the callback failed or `this` yielded undefined.
  // The inline arrow functions `() => this.renameTag(tag)` in `activateListeners` SHOULD be fine if `this` is correct.
  // Let's verify `activateListeners`.
  // ─────────────────────────────────────────────────────────────
  // Tag Management Logic
  // ─────────────────────────────────────────────────────────────
  async renameTag(t) {
    var s;
    const e = await this.promptTagName(t);
    if (!e || e === t) return;
    const i = this.library.renameTag(t, e);
    this.filterState.selectedTags.has(t) && (this.filterState.selectedTags.delete(t), this.filterState.selectedTags.add(e)), i > 0 && (this.render(), (s = ui.notifications) == null || s.info(`Renamed tag "${t}" to "${e}" on ${i} tracks.`));
  }
  async deleteTag(t) {
    var s;
    if (!await Dialog.confirm({
      title: "Delete Tag",
      content: `Are you sure you want to delete tag "${t}" from all tracks?`
    })) return;
    const i = this.library.deleteTag(t);
    this.filterState.selectedTags.has(t) && this.filterState.selectedTags.delete(t), i > 0 && (this.render(), (s = ui.notifications) == null || s.info(`Deleted tag "${t}" from ${i} tracks.`));
  }
  async promptTagName(t = "") {
    return new Promise((e) => {
      new Dialog({
        title: t ? "Rename Tag" : "New Tag",
        content: `<input type="text" id="tag-name" value="${t}" style="width:100%;box-sizing:border-box;"/>`,
        buttons: {
          ok: {
            label: "OK",
            callback: (i) => e(i.find("#tag-name").val())
          }
        },
        default: "ok",
        close: () => e(null)
      }).render(!0);
    });
  }
  // ─────────────────────────────────────────────────────────────
  // Track Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onPlayTrack(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Play track:", e), l.debug("Play track:", e), (i = window.ASE.engine) == null || i.playTrack(e);
  }
  onStopTrack(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Stop track:", e), (i = window.ASE.engine) == null || i.stopTrack(e);
  }
  onPauseTrack(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Pause track:", e), (i = window.ASE.engine) == null || i.pauseTrack(e);
  }
  onAddToQueue(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Add to queue:", e), (i = ui.notifications) == null || i.info("Added to queue (Simulated)");
  }
  async onAddTagToTrack(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Add tag to track:", e), (i = ui.notifications) == null || i.info("Tag selection dialog coming soon");
  }
  async onAddToPlaylist(t) {
    var n, o, d, h;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id"), i = this.library.getItem(e);
    if (!i) {
      (n = ui.notifications) == null || n.error("Track not found");
      return;
    }
    const s = this.library.playlists.getAllPlaylists();
    if (s.length === 0) {
      (o = ui.notifications) == null || o.warn("No playlists available. Create one first.");
      return;
    }
    const r = await this.promptPlaylistSelection(s);
    if (r)
      try {
        const m = this.inferGroupFromTags(i.tags);
        this.library.playlists.addTrackToPlaylist(r, e, m), this.render(), (d = ui.notifications) == null || d.info(`Added "${i.name}" to playlist`);
      } catch (m) {
        l.error("Failed to add track to playlist:", m);
        const A = m instanceof Error ? m.message : "Unknown error";
        (h = ui.notifications) == null || h.error(`Failed to add to playlist: ${A}`);
      }
  }
  onTrackMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation(), $(t.currentTarget).data("item-id");
    const e = $(t.currentTarget).closest(".ase-track-player-item"), i = new MouseEvent("contextmenu", {
      bubbles: !0,
      cancelable: !0,
      view: window,
      clientX: t.clientX,
      clientY: t.clientY
    });
    (s = e[0]) == null || s.dispatchEvent(i);
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onSelectPlaylist(t) {
    t.preventDefault();
    const e = $(t.currentTarget).data("playlist-id");
    this.filterState.selectedPlaylistId === e ? this.filterState.selectedPlaylistId = null : this.filterState.selectedPlaylistId = e, this.render(), l.debug("Select playlist:", e);
  }
  onPlaylistMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation(), $(t.currentTarget).data("playlist-id");
    const e = $(t.currentTarget).closest(".ase-list-item"), i = new MouseEvent("contextmenu", {
      bubbles: !0,
      cancelable: !0,
      view: window,
      clientX: t.clientX,
      clientY: t.clientY
    });
    (s = e[0]) == null || s.dispatchEvent(i);
  }
  // ─────────────────────────────────────────────────────────────
  // Drag and Drop
  // ─────────────────────────────────────────────────────────────
  setupDragAndDrop(t) {
    t.find('.ase-track-player-item[draggable="true"]').on("dragstart", (e) => {
      $(e.currentTarget).find("[data-item-id]").data("item-id") || $(e.currentTarget).data("item-id");
      const i = $(e.currentTarget).find("[data-item-id]").first().data("item-id");
      e.originalEvent.dataTransfer.effectAllowed = "copy", e.originalEvent.dataTransfer.setData("text/plain", i), $(e.currentTarget).addClass("dragging");
    }), t.find('.ase-track-player-item[draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragover", (e) => {
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "copy", $(e.currentTarget).addClass("drag-over");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragleave", (e) => {
      $(e.currentTarget).removeClass("drag-over");
    }), t.find(".ase-list-item[data-playlist-id]").on("drop", async (e) => {
      e.preventDefault();
      const i = e.originalEvent.dataTransfer.getData("text/plain"), s = $(e.currentTarget).data("playlist-id");
      $(e.currentTarget).removeClass("drag-over"), await this.handleDropTrackToPlaylist(i, s);
    }), t.find(".ase-content-area").on("dragover", (e) => {
      e.preventDefault(), $(e.currentTarget).addClass("drag-over-import");
    }), t.find(".ase-content-area").on("dragleave", (e) => {
      $(e.currentTarget).removeClass("drag-over-import");
    }), t.find(".ase-content-area").on("drop", async (e) => {
      var s, r, n, o;
      e.preventDefault(), $(e.currentTarget).removeClass("drag-over-import");
      const i = (r = (s = e.originalEvent) == null ? void 0 : s.dataTransfer) == null ? void 0 : r.files;
      if (i && i.length > 0) {
        if (l.debug(`Dropped ${i.length} files from OS`), ((o = (n = e.originalEvent) == null ? void 0 : n.dataTransfer) == null ? void 0 : o.getData("text/plain")) && !i.length)
          return;
        await this.handleFileUpload(i);
      }
    });
  }
  async handleFileUpload(t) {
    var r, n, o;
    if (!((r = game.user) != null && r.isGM)) {
      (n = ui.notifications) == null || n.warn("Only GM can upload files.");
      return;
    }
    const e = "data", i = "modules/advanced-sound-engine/uploaded";
    let s = 0;
    for (let d = 0; d < t.length; d++) {
      const h = t[d];
      try {
        const m = await FilePicker.upload(e, i, h, {});
        m.path && (await this.library.addItem(
          m.path,
          h.name.split(".")[0],
          "sfx"
          // Default group for dropped files
        ), s++);
      } catch (m) {
        l.error(`Failed to upload ${h.name}:`, m);
      }
    }
    s > 0 && ((o = ui.notifications) == null || o.info(`Imported ${s} files.`), this.render());
  }
  async handleDropTrackToPlaylist(t, e) {
    var r, n, o;
    const i = this.library.getItem(t), s = this.library.playlists.getPlaylist(e);
    if (!i || !s) {
      (r = ui.notifications) == null || r.error("Track or playlist not found");
      return;
    }
    try {
      const d = this.inferGroupFromTags(i.tags);
      this.library.playlists.addTrackToPlaylist(e, t, d), this.render(), (n = ui.notifications) == null || n.info(`Added "${i.name}" to "${s.name}"`);
    } catch (d) {
      l.error("Failed to add track to playlist:", d);
      const h = d instanceof Error ? d.message : "Unknown error";
      (o = ui.notifications) == null || o.error(`Failed to add to playlist: ${h}`);
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Context Menus
  // ─────────────────────────────────────────────────────────────
  setupContextMenus(t) {
    new ContextMenu(t, ".track-item", [
      {
        name: "Edit Name",
        icon: '<i class="fas fa-edit"></i>',
        callback: (e) => {
          const s = $(e).data("item-id");
          this.onEditTrackName(s);
        }
      },
      {
        name: "Edit Tags",
        icon: '<i class="fas fa-tags"></i>',
        callback: (e) => {
          const s = $(e).data("item-id");
          this.onEditTrackTags(s);
        }
      },
      {
        name: "Add to Playlist",
        icon: '<i class="fas fa-list-ul"></i>',
        callback: (e) => {
          const s = $(e).data("item-id");
          this.handleAddToPlaylistFromContext(s);
        }
      },
      {
        name: "Toggle Favorite",
        icon: '<i class="fas fa-star"></i>',
        callback: (e) => {
          var r, n;
          const s = $(e).data("item-id");
          try {
            const o = this.library.toggleFavorite(s);
            this.render(), (r = ui.notifications) == null || r.info(o ? "Added to favorites" : "Removed from favorites");
          } catch (o) {
            l.error("Failed to toggle favorite:", o), (n = ui.notifications) == null || n.error("Failed to update favorite status");
          }
        }
      },
      {
        name: "Delete Track",
        icon: '<i class="fas fa-trash"></i>',
        callback: (e) => {
          const s = $(e).data("item-id");
          this.onDeleteTrackConfirm(s);
        }
      }
    ]), new ContextMenu(t, ".playlist-item", [
      {
        name: "Rename Playlist",
        icon: '<i class="fas fa-edit"></i>',
        callback: (e) => {
          const s = $(e).data("playlist-id");
          this.onRenamePlaylist(s);
        }
      },
      {
        name: "Edit Description",
        icon: '<i class="fas fa-align-left"></i>',
        callback: (e) => {
          const s = $(e).data("playlist-id");
          this.onEditPlaylistDescription(s);
        }
      },
      {
        name: "View Contents",
        icon: '<i class="fas fa-list"></i>',
        callback: (e) => {
          const s = $(e).data("playlist-id");
          this.onViewPlaylistContents(s);
        }
      },
      {
        name: "Clear Playlist",
        icon: '<i class="fas fa-eraser"></i>',
        callback: (e) => {
          const s = $(e).data("playlist-id");
          this.onClearPlaylist(s);
        }
      },
      {
        name: "Delete Playlist",
        icon: '<i class="fas fa-trash"></i>',
        callback: (e) => {
          const s = $(e).data("playlist-id");
          this.onDeletePlaylistConfirm(s);
        }
      }
    ]), new ContextMenu(t, ".tag-chip:not(.mini)", [
      {
        name: "Rename Tag",
        icon: '<i class="fas fa-edit"></i>',
        callback: (e) => {
          const s = $(e).data("tag");
          this.onRenameTag(s);
        }
      },
      {
        name: "Delete Tag",
        icon: '<i class="fas fa-trash"></i>',
        callback: (e) => {
          const s = $(e).data("tag");
          this.onDeleteTag(s);
        }
      }
    ]);
  }
  // ─────────────────────────────────────────────────────────────
  // Context Menu Handlers - Tracks
  // ─────────────────────────────────────────────────────────────
  async onEditTrackName(t) {
    var s, r, n;
    const e = this.library.getItem(t);
    if (!e) {
      (s = ui.notifications) == null || s.error("Track not found");
      return;
    }
    const i = await this.promptTextInput("Edit Track Name", "Track Name", e.name);
    if (!(!i || i === e.name))
      try {
        this.library.updateItem(t, { name: i }), this.render(), (r = ui.notifications) == null || r.info(`Renamed to: ${i}`);
      } catch (o) {
        l.error("Failed to rename track:", o), (n = ui.notifications) == null || n.error("Failed to rename track");
      }
  }
  async onEditTrackTags(t) {
    var r, n, o;
    const e = this.library.getItem(t);
    if (!e) {
      (r = ui.notifications) == null || r.error("Track not found");
      return;
    }
    const i = await this.promptTextInput(
      "Edit Tags",
      "Tags (comma-separated)",
      e.tags.join(", ")
    );
    if (i === null) return;
    const s = i.split(",").map((d) => d.trim()).filter((d) => d.length > 0);
    try {
      this.library.updateItem(t, { tags: s }), this.render(), (n = ui.notifications) == null || n.info("Tags updated");
    } catch (d) {
      l.error("Failed to update tags:", d), (o = ui.notifications) == null || o.error("Failed to update tags");
    }
  }
  async onDeleteTrackConfirm(t) {
    var s, r, n;
    const e = this.library.getItem(t);
    if (!e) {
      (s = ui.notifications) == null || s.error("Track not found");
      return;
    }
    if (await Dialog.confirm({
      title: "Delete Track",
      content: `<p>Are you sure you want to delete <strong>${e.name}</strong> from the library?</p>
                <p class="notification warning">This will remove it from all playlists and favorites.</p>`,
      yes: () => !0,
      no: () => !1,
      defaultYes: !1
    }))
      try {
        this.library.removeItem(t), this.render(), (r = ui.notifications) == null || r.info(`Deleted: ${e.name}`);
      } catch (o) {
        l.error("Failed to delete track:", o), (n = ui.notifications) == null || n.error("Failed to delete track");
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Context Menu Handlers - Playlists
  // ─────────────────────────────────────────────────────────────
  async onRenamePlaylist(t) {
    var s, r, n;
    const e = this.library.playlists.getPlaylist(t);
    if (!e) {
      (s = ui.notifications) == null || s.error("Playlist not found");
      return;
    }
    const i = await this.promptTextInput("Rename Playlist", "Playlist Name", e.name);
    if (!(!i || i === e.name))
      try {
        this.library.playlists.updatePlaylist(t, { name: i }), this.render(), (r = ui.notifications) == null || r.info(`Renamed to: ${i}`);
      } catch (o) {
        l.error("Failed to rename playlist:", o);
        const d = o instanceof Error ? o.message : "Unknown error";
        (n = ui.notifications) == null || n.error(`Failed to rename playlist: ${d}`);
      }
  }
  async onEditPlaylistDescription(t) {
    var s, r, n;
    const e = this.library.playlists.getPlaylist(t);
    if (!e) {
      (s = ui.notifications) == null || s.error("Playlist not found");
      return;
    }
    const i = await this.promptTextInput(
      "Edit Description",
      "Description",
      e.description || ""
    );
    if (i !== null)
      try {
        this.library.playlists.updatePlaylist(t, { description: i || void 0 }), this.render(), (r = ui.notifications) == null || r.info("Description updated");
      } catch (o) {
        l.error("Failed to update description:", o), (n = ui.notifications) == null || n.error("Failed to update description");
      }
  }
  async onViewPlaylistContents(t) {
    var r;
    const e = this.library.playlists.getPlaylist(t);
    if (!e) {
      (r = ui.notifications) == null || r.error("Playlist not found");
      return;
    }
    const i = e.items.sort((n, o) => n.order - o.order).map((n, o) => {
      const d = this.library.getItem(n.libraryItemId), h = (d == null ? void 0 : d.name) || "Unknown";
      return `<li><strong>${o + 1}.</strong> ${h}</li>`;
    }).join(""), s = `
      <div>
        <p><strong>${e.name}</strong></p>
        ${e.description ? `<p><em>${e.description}</em></p>` : ""}
        <p>Total tracks: ${e.items.length}</p>
        ${e.items.length > 0 ? `<ul class="playlist-contents-list">${i}</ul>` : "<p>No tracks in playlist</p>"}
      </div>
    `;
    new Dialog({
      title: "Playlist Contents",
      content: s,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Close"
        }
      },
      default: "close"
    }).render(!0);
  }
  async onClearPlaylist(t) {
    var s, r, n, o;
    const e = this.library.playlists.getPlaylist(t);
    if (!e) {
      (s = ui.notifications) == null || s.error("Playlist not found");
      return;
    }
    if (e.items.length === 0) {
      (r = ui.notifications) == null || r.warn("Playlist is already empty");
      return;
    }
    if (await Dialog.confirm({
      title: "Clear Playlist",
      content: `<p>Are you sure you want to remove all ${e.items.length} tracks from <strong>${e.name}</strong>?</p>
                <p class="notification warning">This cannot be undone.</p>`,
      yes: () => !0,
      no: () => !1,
      defaultYes: !1
    }))
      try {
        [...e.items.map((h) => h.id)].forEach((h) => {
          try {
            this.library.playlists.removeTrackFromPlaylist(t, h);
          } catch (m) {
            l.error("Failed to remove item:", m);
          }
        }), this.render(), (n = ui.notifications) == null || n.info(`Cleared playlist: ${e.name}`);
      } catch (d) {
        l.error("Failed to clear playlist:", d), (o = ui.notifications) == null || o.error("Failed to clear playlist");
      }
  }
  async onDeletePlaylistConfirm(t) {
    var s, r, n;
    const e = this.library.playlists.getPlaylist(t);
    if (!e) {
      (s = ui.notifications) == null || s.error("Playlist not found");
      return;
    }
    if (await Dialog.confirm({
      title: "Delete Playlist",
      content: `<p>Are you sure you want to delete <strong>${e.name}</strong>?</p>
                <p class="notification info">The tracks will remain in your library.</p>`,
      yes: () => !0,
      no: () => !1,
      defaultYes: !1
    }))
      try {
        this.filterState.selectedPlaylistId === t && (this.filterState.selectedPlaylistId = null), this.library.playlists.deletePlaylist(t), this.render(), (r = ui.notifications) == null || r.info(`Deleted playlist: ${e.name}`);
      } catch (o) {
        l.error("Failed to delete playlist:", o), (n = ui.notifications) == null || n.error("Failed to delete playlist");
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Context Menu Handlers - Tags
  // ─────────────────────────────────────────────────────────────
  async onRenameTag(t) {
    var i, s;
    const e = await this.promptTextInput("Rename Tag", "New Tag Name", t);
    if (!(!e || e === t))
      try {
        const r = this.library.getAllItems().filter((n) => n.tags.includes(t));
        r.forEach((n) => {
          const o = n.tags.map((d) => d === t ? e : d);
          this.library.updateItem(n.id, { tags: o });
        }), this.filterState.selectedTags.has(t) && (this.filterState.selectedTags.delete(t), this.filterState.selectedTags.add(e)), this.render(), (i = ui.notifications) == null || i.info(`Renamed tag "${t}" to "${e}" in ${r.length} track(s)`);
      } catch (r) {
        l.error("Failed to rename tag:", r), (s = ui.notifications) == null || s.error("Failed to rename tag");
      }
  }
  async onDeleteTag(t) {
    var s, r;
    const e = this.library.getAllItems().filter((n) => n.tags.includes(t));
    if (await Dialog.confirm({
      title: "Delete Tag",
      content: `<p>Are you sure you want to delete the tag <strong>${t}</strong>?</p>
                <p class="notification warning">This will remove the tag from ${e.length} track(s).</p>`,
      yes: () => !0,
      no: () => !1,
      defaultYes: !1
    }))
      try {
        e.forEach((n) => {
          const o = n.tags.filter((d) => d !== t);
          this.library.updateItem(n.id, { tags: o });
        }), this.filterState.selectedTags.delete(t), this.render(), (s = ui.notifications) == null || s.info(`Deleted tag "${t}" from ${e.length} track(s)`);
      } catch (n) {
        l.error("Failed to delete tag:", n), (r = ui.notifications) == null || r.error("Failed to delete tag");
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  async promptPlaylistSelection(t) {
    const e = t.map(
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
                ${e}
              </select>
            </div>
          </form>
        `,
        buttons: {
          add: {
            icon: '<i class="fas fa-plus"></i>',
            label: "Add",
            callback: (s) => {
              const r = s.find('[name="playlist-id"]').val();
              i(r || null);
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
            callback: (e) => {
              const i = (e.find('[name="playlist-name"]').val() || "").trim();
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
  async promptTextInput(t, e, i = "") {
    return new Promise((s) => {
      new Dialog({
        title: t,
        content: `
          <form>
            <div class="form-group">
              <label>${e}:</label>
              <input type="text" name="text-input" value="${i}" autofocus />
            </div>
          </form>
        `,
        buttons: {
          save: {
            icon: '<i class="fas fa-check"></i>',
            label: "Save",
            callback: (r) => {
              const n = (r.find('[name="text-input"]').val() || "").trim();
              s(n || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => s(null)
          }
        },
        default: "save"
      }).render(!0);
    });
  }
  /**
   * Handle adding track to playlist from context menu
   */
  async handleAddToPlaylistFromContext(t) {
    var r, n, o;
    const e = this.library.getItem(t);
    if (!e) return;
    const i = this.library.playlists.getAllPlaylists();
    if (i.length === 0) {
      (r = ui.notifications) == null || r.warn("No playlists available. Create one first.");
      return;
    }
    const s = await this.promptPlaylistSelection(i);
    if (s)
      try {
        const d = this.inferGroupFromTags(e.tags);
        this.library.playlists.addTrackToPlaylist(s, t, d), this.render(), (n = ui.notifications) == null || n.info(`Added "${e.name}" to playlist`);
      } catch (d) {
        l.error("Failed to add track to playlist:", d);
        const h = d instanceof Error ? d.message : "Unknown error";
        (o = ui.notifications) == null || o.error(`Failed to add to playlist: ${h}`);
      }
  }
}
function C(c, a) {
  let t = 0, e = null;
  return function(...i) {
    const s = Date.now(), r = a - (s - t);
    r <= 0 ? (e && (clearTimeout(e), e = null), t = s, c.apply(this, i)) : e || (e = setTimeout(() => {
      t = Date.now(), e = null, c.apply(this, i);
    }, r));
  };
}
function tt(c, a) {
  let t = null;
  return function(...e) {
    t && clearTimeout(t), t = setTimeout(() => {
      c.apply(this, e);
    }, a);
  };
}
const R = "advanced-sound-engine";
function et() {
  return game.settings.get(R, "maxSimultaneousTracks") || 8;
}
class at extends Application {
  constructor(t, e, i) {
    super(i);
    u(this, "engine");
    u(this, "socket");
    u(this, "updateInterval", null);
    this.engine = t, this.socket = e;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-sound-mixer",
      title: "Sound Mixer (GM)",
      template: `modules/${R}/templates/mixer.hbs`,
      classes: ["ase-mixer"],
      width: 550,
      height: "auto",
      resizable: !0,
      minimizable: !0,
      popOut: !0
    });
  }
  getData() {
    const t = this.engine.getAllTracks().map((s) => this.getTrackViewData(s)), e = this.engine.volumes, i = t.filter((s) => s.isPlaying).length;
    return {
      tracks: t,
      volumes: {
        master: Math.round(e.master * 100),
        music: Math.round(e.music * 100),
        ambience: Math.round(e.ambience * 100),
        sfx: Math.round(e.sfx * 100)
      },
      playingCount: i,
      maxSimultaneous: et(),
      syncEnabled: this.socket.syncEnabled
    };
  }
  getTrackViewData(t) {
    const e = t.getState(), i = t.getCurrentTime(), s = t.getDuration();
    return {
      id: e.id,
      name: this.extractFileName(e.url),
      group: e.group,
      isPlaying: e.playbackState === "playing",
      isPaused: e.playbackState === "paused",
      isStopped: e.playbackState === "stopped",
      isLoading: e.playbackState === "loading",
      volume: e.volume,
      volumePercent: Math.round(e.volume * 100),
      loop: e.loop,
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
      const e = t.split("/");
      return e[e.length - 1].replace(/\.[^.]+$/, "");
    }
  }
  activateListeners(t) {
    super.activateListeners(t), t.find("#ase-sync-toggle").on("change", (n) => {
      const o = n.target.checked;
      this.socket.setSyncEnabled(o), this.updateSyncIndicator(t, o);
    });
    const e = C((n, o) => {
      n === "master" ? (this.engine.setMasterVolume(o), this.socket.broadcastChannelVolume("master", o)) : (this.engine.setChannelVolume(n, o), this.socket.broadcastChannelVolume(n, o));
    }, 50);
    t.find(".ase-channel-slider").on("input", (n) => {
      const o = $(n.currentTarget).data("channel"), d = parseFloat(n.target.value) / 100;
      e(o, d), $(n.currentTarget).siblings(".ase-channel-value").text(`${Math.round(d * 100)}%`);
    }), t.find("#ase-add-track").on("click", () => this.onAddTrack());
    const i = t.find(".ase-tracks");
    i.on("click", ".ase-btn-play", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(o);
    }), i.on("click", ".ase-btn-pause", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(o);
    }), i.on("click", ".ase-btn-stop", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(o);
    }), i.on("click", ".ase-btn-remove", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(o);
    }), i.on("change", ".ase-loop-toggle", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id"), d = n.target.checked;
      this.engine.setTrackLoop(o, d), this.socket.broadcastTrackLoop(o, d);
    }), i.on("change", ".ase-channel-select", (n) => {
      const o = $(n.currentTarget).data("track-id"), d = n.target.value;
      this.engine.setTrackChannel(o, d);
    });
    const s = C((n, o) => {
      this.engine.setTrackVolume(n, o), this.socket.broadcastTrackVolume(n, o);
    }, 50);
    i.on("input", ".ase-volume-slider", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id"), d = parseFloat(n.target.value) / 100;
      s(o, d), $(n.currentTarget).siblings(".ase-volume-value").text(`${Math.round(d * 100)}%`);
    });
    const r = C((n, o) => {
      const d = this.engine.getTrack(n), h = (d == null ? void 0 : d.state) === "playing";
      this.engine.seekTrack(n, o), this.socket.broadcastTrackSeek(n, o, h ?? !1);
    }, 100);
    i.on("input", ".ase-seek-slider", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id"), d = this.engine.getTrack(o);
      if (d) {
        const m = parseFloat(n.target.value) / 100 * d.getDuration();
        r(o, m);
      }
    }), t.find("#ase-stop-all").on("click", () => {
      this.engine.stopAll(), this.socket.broadcastStopAll(), this.render();
    }), this.startUpdates();
  }
  updateSyncIndicator(t, e) {
    const i = t.find(".ase-sync-status");
    i.toggleClass("is-active", e), i.find("span").text(e ? "SYNC ON" : "SYNC OFF");
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
    let e = 0;
    for (const s of this.engine.getAllTracks()) {
      const r = t.find(`.ase-track[data-track-id="${s.id}"]`);
      if (!r.length) continue;
      const n = s.getCurrentTime(), o = s.getDuration(), d = o > 0 ? n / o * 100 : 0, h = s.state;
      h === "playing" && e++, r.find(".ase-time-current").text(P(n));
      const m = r.find(".ase-seek-slider");
      m.is(":active") || m.val(d), r.removeClass("is-playing is-paused is-stopped is-loading"), r.addClass(`is-${h}`), r.find(".ase-btn-play").prop("disabled", h === "playing" || h === "loading"), r.find(".ase-btn-pause").prop("disabled", h !== "playing"), r.find(".ase-btn-stop").prop("disabled", h === "stopped");
    }
    const i = this.engine.getAllTracks().length;
    t.find(".ase-track-count").text(`${e}/${i} playing`);
  }
  async onAddTrack() {
    new FilePicker({
      type: "audio",
      current: "",
      callback: async (e) => {
        await this.addTrackFromPath(e);
      }
    }).render(!0);
  }
  async addTrackFromPath(t, e = "music") {
    var s, r;
    const i = S();
    try {
      await this.engine.createTrack({
        id: i,
        url: t,
        group: e,
        volume: 1,
        loop: !1
      }), this.render(), (s = ui.notifications) == null || s.info(`Added: ${this.extractFileName(t)}`);
    } catch (n) {
      l.error("Failed to add track:", n);
      const o = n instanceof Error ? n.message : "Unknown error";
      (r = ui.notifications) == null || r.error(`Failed to load: ${o}`);
    }
  }
  async onPlayTrack(t) {
    const e = this.engine.getTrack(t);
    if (!e) return;
    const i = e.state === "paused" ? e.getCurrentTime() : 0;
    await this.engine.playTrack(t, i), this.socket.broadcastTrackPlay(t, i);
  }
  onPauseTrack(t) {
    const e = this.engine.getTrack(t);
    if (!e) return;
    const i = e.getCurrentTime();
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
const G = "advanced-sound-engine";
class it extends Application {
  constructor(t, e, i, s) {
    super(s);
    u(this, "engine");
    u(this, "socket");
    u(this, "libraryManager");
    // Sub-apps (Controllers)
    u(this, "libraryApp");
    u(this, "mixerApp");
    // We might need to refactor this later, but for now we'll wrap it
    u(this, "state", {
      activeTab: "library",
      // Default to library as per user focus
      syncEnabled: !1
    });
    this.engine = t, this.socket = e, this.libraryManager = i, this.libraryApp = new Z(this.libraryManager), this.mixerApp = new at(this.engine, this.socket);
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "advanced-sound-engine-app",
      title: "Advanced Sound Engine",
      template: `modules/${G}/templates/main-app.hbs`,
      width: 1200,
      // Wider for the concepts
      height: 800,
      classes: ["ase-window-layout"],
      resizable: !0,
      popOut: !0,
      tabs: []
      // We handle tabs manually
    });
  }
  async getData() {
    const t = this.engine.volumes, e = (r) => {
      const n = this.engine.getTracksByGroup(r);
      if (n.length === 0) return { playing: !1, paused: !1 };
      const o = n.some((h) => h.state === "playing"), d = n.some((h) => h.state === "paused");
      return { playing: o, paused: d && !o };
    }, i = {
      music: e("music"),
      ambience: e("ambience"),
      sfx: e("sfx")
    };
    let s = "";
    if (this.state.activeTab === "library") {
      const r = await this.libraryApp.getData();
      s = await renderTemplate("modules/advanced-sound-engine/templates/library.hbs", r);
    } else if (this.state.activeTab === "mixer") {
      const r = await this.mixerApp.getData();
      s = await renderTemplate(`modules/${G}/templates/mixer.hbs`, r);
    }
    return {
      activeTab: this.state.activeTab,
      tabContent: s,
      status: i,
      volumes: {
        master: Math.round(t.master * 100),
        music: Math.round(t.music * 100),
        ambience: Math.round(t.ambience * 100),
        sfx: Math.round(t.sfx * 100)
      },
      syncEnabled: this.socket.syncEnabled
    };
  }
  activateListeners(t) {
    super.activateListeners(t), t.find(".ase-tab").on("click", this.onTabSwitch.bind(this)), t.find('[data-action="toggle-sync"]').on("click", this.onToggleSync.bind(this)), t.find('[data-action="global-play"]').on("click", this.onGlobalPlay.bind(this)), t.find('[data-action="global-pause"]').on("click", this.onGlobalPause.bind(this)), t.find('[data-action="global-stop"]').on("click", this.onGlobalStop.bind(this)), t.find(".ase-volume-slider").on("input", this.onVolumeInput.bind(this)), this.state.activeTab === "library" ? this.libraryApp.activateListeners(t) : this.state.activeTab === "mixer" && this.mixerApp.activateListeners(t);
  }
  async onTabSwitch(t) {
    t.preventDefault();
    const e = $(t.currentTarget).data("tab");
    this.state.activeTab !== e && (this.state.activeTab = e, this.render(!0));
  }
  // Footer Actions
  onToggleSync(t) {
    const e = !this.socket.syncEnabled;
    this.socket.setSyncEnabled(e), this.state.syncEnabled = e, this.render();
  }
  onGlobalPlay() {
    this.engine.resume();
    const t = this.engine.getAllTracks();
    for (const e of t)
      e.state === "paused" && e.play();
    l.debug("Global Play/Resume Clicked"), this.render();
  }
  onGlobalPause() {
    const t = this.engine.getAllTracks();
    for (const e of t)
      e.state === "playing" && e.pause();
    l.debug("Global Pause Clicked"), this.render();
  }
  onGlobalStop() {
    this.engine.stopAll(), this.render();
  }
  onVolumeInput(t) {
    const e = t.currentTarget, i = parseFloat(e.value) / 100, s = $(e).data("channel");
    s ? (this.engine.setChannelVolume(s, i), this.socket.broadcastChannelVolume(s, i)) : (this.engine.setMasterVolume(i), this.socket.broadcastChannelVolume("master", i)), $(e).siblings(".ase-percentage").text(`${Math.round(i * 100)}%`), $(e).siblings(".ase-master-perc").text(`${Math.round(i * 100)}%`);
  }
}
class st {
  constructor(a) {
    u(this, "playlists", /* @__PURE__ */ new Map());
    u(this, "onChangeCallback");
    this.onChangeCallback = a;
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
  createPlaylist(a, t) {
    if (this.findByName(a))
      throw new Error(`Playlist with name "${a}" already exists`);
    const i = Date.now(), s = {
      id: S(),
      name: a,
      description: t,
      items: [],
      createdAt: i,
      updatedAt: i,
      favorite: !1
    };
    return this.playlists.set(s.id, s), this.notifyChange(), l.info(`Playlist created: ${s.name} (${s.id})`), s;
  }
  /**
   * Update playlist metadata
   */
  updatePlaylist(a, t) {
    const e = this.playlists.get(a);
    if (!e)
      throw new Error(`Playlist not found: ${a}`);
    if (t.name && t.name !== e.name) {
      const s = this.findByName(t.name);
      if (s && s.id !== a)
        throw new Error(`Playlist with name "${t.name}" already exists`);
    }
    const i = {
      ...e,
      ...t,
      updatedAt: Date.now()
    };
    return this.playlists.set(a, i), this.notifyChange(), l.info(`Playlist updated: ${i.name}`), i;
  }
  /**
   * Delete playlist
   */
  deletePlaylist(a) {
    const t = this.playlists.get(a);
    if (!t)
      throw new Error(`Playlist not found: ${a}`);
    this.playlists.delete(a), this.notifyChange(), l.info(`Playlist deleted: ${t.name}`);
  }
  /**
   * Get playlist by ID
   */
  getPlaylist(a) {
    return this.playlists.get(a);
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
  findByName(a) {
    return Array.from(this.playlists.values()).find((t) => t.name === a);
  }
  /**
   * Get favorite playlists
   */
  getFavoritePlaylists() {
    return this.getAllPlaylists().filter((a) => a.favorite);
  }
  /**
   * Toggle playlist favorite status
   */
  togglePlaylistFavorite(a) {
    const t = this.getPlaylist(a);
    if (!t)
      throw new Error(`Playlist not found: ${a}`);
    return t.favorite = !t.favorite, t.updatedAt = Date.now(), this.notifyChange(), t.favorite;
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations - Playlist Items
  // ─────────────────────────────────────────────────────────────
  /**
   * Add track to playlist
   */
  addTrackToPlaylist(a, t, e, i) {
    const s = this.getPlaylist(a);
    if (!s)
      throw new Error(`Playlist not found: ${a}`);
    if (s.items.find((o) => o.libraryItemId === t))
      throw new Error("Track already exists in this playlist");
    const n = {
      id: S(),
      libraryItemId: t,
      group: e,
      volume: (i == null ? void 0 : i.volume) ?? 1,
      loop: (i == null ? void 0 : i.loop) ?? !1,
      order: s.items.length,
      fadeIn: i == null ? void 0 : i.fadeIn,
      fadeOut: i == null ? void 0 : i.fadeOut
    };
    return s.items.push(n), s.updatedAt = Date.now(), this.notifyChange(), l.debug(`Track added to playlist ${s.name}: ${t}`), n;
  }
  /**
   * Remove track from playlist
   */
  removeTrackFromPlaylist(a, t) {
    const e = this.getPlaylist(a);
    if (!e)
      throw new Error(`Playlist not found: ${a}`);
    const i = e.items.findIndex((s) => s.id === t);
    if (i === -1)
      throw new Error(`Playlist item not found: ${t}`);
    e.items.splice(i, 1), this.reorderPlaylistItems(e), e.updatedAt = Date.now(), this.notifyChange(), l.debug(`Track removed from playlist ${e.name}`);
  }
  /**
   * Remove all tracks with specific library item ID from playlist
   */
  removeLibraryItemFromPlaylist(a, t) {
    const e = this.getPlaylist(a);
    if (!e)
      throw new Error(`Playlist not found: ${a}`);
    const i = e.items.length;
    e.items = e.items.filter((r) => r.libraryItemId !== t);
    const s = i - e.items.length;
    return s > 0 && (this.reorderPlaylistItems(e), e.updatedAt = Date.now(), this.notifyChange(), l.debug(`Removed ${s} instances of library item ${t} from playlist ${e.name}`)), s;
  }
  /**
   * Remove library item from all playlists
   */
  removeLibraryItemFromAllPlaylists(a) {
    let t = 0;
    return this.playlists.forEach((e) => {
      const i = e.items.length;
      e.items = e.items.filter((r) => r.libraryItemId !== a);
      const s = i - e.items.length;
      s > 0 && (this.reorderPlaylistItems(e), e.updatedAt = Date.now(), t += s);
    }), t > 0 && (this.notifyChange(), l.info(`Removed library item ${a} from ${t} playlist(s)`)), t;
  }
  /**
   * Update playlist item
   */
  updatePlaylistItem(a, t, e) {
    const i = this.getPlaylist(a);
    if (!i)
      throw new Error(`Playlist not found: ${a}`);
    const s = i.items.find((r) => r.id === t);
    if (!s)
      throw new Error(`Playlist item not found: ${t}`);
    return Object.assign(s, e), i.updatedAt = Date.now(), this.notifyChange(), l.debug(`Playlist item updated in ${i.name}`), s;
  }
  /**
   * Reorder track in playlist
   */
  reorderTrack(a, t, e) {
    const i = this.getPlaylist(a);
    if (!i)
      throw new Error(`Playlist not found: ${a}`);
    const s = i.items.findIndex((n) => n.id === t);
    if (s === -1)
      throw new Error(`Playlist item not found: ${t}`);
    if (e < 0 || e >= i.items.length)
      throw new Error(`Invalid order: ${e}`);
    const [r] = i.items.splice(s, 1);
    i.items.splice(e, 0, r), this.reorderPlaylistItems(i), i.updatedAt = Date.now(), this.notifyChange(), l.debug(`Track reordered in playlist ${i.name}`);
  }
  /**
   * Get tracks in playlist
   */
  getPlaylistTracks(a) {
    const t = this.getPlaylist(a);
    if (!t)
      throw new Error(`Playlist not found: ${a}`);
    return [...t.items].sort((e, i) => e.order - i.order);
  }
  /**
   * Get playlists containing a specific library item
   */
  getPlaylistsContainingItem(a) {
    return this.getAllPlaylists().filter(
      (t) => t.items.some((e) => e.libraryItemId === a)
    );
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  /**
   * Load playlists from state object
   */
  load(a) {
    this.playlists.clear(), Object.values(a).forEach((t) => {
      t.items.sort((e, i) => e.order - i.order), this.playlists.set(t.id, t);
    }), l.info(`PlaylistManager loaded: ${this.playlists.size} playlists`);
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
  reorderPlaylistItems(a) {
    a.items.forEach((t, e) => {
      t.order = e;
    });
  }
  /**
   * Get statistics
   */
  getStats() {
    const a = this.getAllPlaylists();
    return {
      totalPlaylists: a.length,
      favoritePlaylists: a.filter((t) => t.favorite).length,
      totalTracks: a.reduce((t, e) => t + e.items.length, 0),
      averageTracksPerPlaylist: a.length > 0 ? Math.round(a.reduce((t, e) => t + e.items.length, 0) / a.length) : 0
    };
  }
  /**
   * Clear all playlists
   */
  clear() {
    this.playlists.clear(), l.warn("All playlists cleared");
  }
}
const _ = "advanced-sound-engine", I = 1;
class rt {
  constructor() {
    u(this, "items", /* @__PURE__ */ new Map());
    u(this, "customTags", /* @__PURE__ */ new Set());
    u(this, "saveScheduled", !1);
    u(this, "playlists");
    u(this, "debouncedSave", tt(() => {
      this.saveToSettings();
    }, 500));
    this.playlists = new st(() => this.scheduleSave()), this.loadFromSettings();
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add new item to library
   */
  async addItem(a, t, e = "music") {
    const i = M(a);
    if (!i.valid)
      throw new Error(i.error || "Invalid audio file");
    const s = t || this.extractNameFromUrl(a), r = this.findByUrl(a);
    if (r)
      throw new Error(`Track with this URL already exists: ${r.name}`);
    if (this.findByName(s))
      throw new Error(`Track with name "${s}" already exists in library`);
    const o = Date.now(), d = {
      id: S(),
      url: a,
      name: s,
      tags: [],
      duration: 0,
      favorite: !1,
      addedAt: o,
      updatedAt: o
    };
    return this.items.set(d.id, d), this.scheduleSave(), l.info(`Library item added: ${d.name} (${d.id})`), d;
  }
  /**
   * Update existing item
   */
  updateItem(a, t) {
    const e = this.items.get(a);
    if (!e)
      throw new Error(`Library item not found: ${a}`);
    if (t.name && t.name !== e.name) {
      const s = this.findByName(t.name);
      if (s && s.id !== a)
        throw new Error(`Track with name "${t.name}" already exists`);
    }
    if (t.url && t.url !== e.url) {
      const s = M(t.url);
      if (!s.valid)
        throw new Error(s.error || "Invalid audio file");
      const r = this.findByUrl(t.url);
      if (r && r.id !== a)
        throw new Error(`Track with this URL already exists: ${r.name}`);
    }
    delete t.id;
    const i = {
      ...e,
      ...t,
      updatedAt: Date.now()
    };
    return this.items.set(a, i), this.scheduleSave(), l.info(`Library item updated: ${i.name}`), i;
  }
  /**
   * Remove item from library
   */
  removeItem(a) {
    const t = this.items.get(a);
    if (!t)
      throw new Error(`Library item not found: ${a}`);
    this.playlists.removeLibraryItemFromAllPlaylists(a), this.items.delete(a), this.scheduleSave(), l.info(`Library item removed: ${t.name}`);
  }
  /**
   * Get item by ID
   */
  getItem(a) {
    return this.items.get(a);
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
  findByUrl(a) {
    return Array.from(this.items.values()).find((t) => t.url === a);
  }
  /**
   * Find item by name
   */
  findByName(a) {
    return Array.from(this.items.values()).find((t) => t.name === a);
  }
  /**
   * Search items by query
   */
  searchByName(a) {
    const t = a.toLowerCase();
    return this.getAllItems().filter(
      (e) => e.name.toLowerCase().includes(t)
    );
  }
  /**
   * Filter items by tags (OR logic)
   */
  filterByTags(a) {
    return a.length === 0 ? this.getAllItems() : this.getAllItems().filter(
      (t) => t.tags.some((e) => a.includes(e))
    );
  }
  /**
   * Get favorite items
   */
  getFavorites() {
    return this.getAllItems().filter((a) => a.favorite);
  }
  // ─────────────────────────────────────────────────────────────
  // Tags Management
  // ─────────────────────────────────────────────────────────────
  /**
   * Get all unique tags
   */
  getAllTags() {
    const a = new Set(this.customTags);
    return this.items.forEach((t) => {
      t.tags.forEach((e) => a.add(e));
    }), Array.from(a).sort();
  }
  /**
   * Add a custom tag explicitly (even if not used on any track)
   */
  addCustomTag(a) {
    this.customTags.has(a) || (this.customTags.add(a), this.scheduleSave());
  }
  /**
   * Add tag to item
   */
  addTagToItem(a, t) {
    const e = this.getItem(a);
    if (!e)
      throw new Error(`Library item not found: ${a}`);
    e.tags.includes(t) || (e.tags.push(t), e.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Remove tag from item
   */
  removeTagFromItem(a, t) {
    const e = this.getItem(a);
    if (!e)
      throw new Error(`Library item not found: ${a}`);
    const i = e.tags.indexOf(t);
    i !== -1 && (e.tags.splice(i, 1), e.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Rename tag globally
   */
  renameTag(a, t) {
    let e = 0;
    return this.items.forEach((i) => {
      const s = i.tags.indexOf(a);
      s !== -1 && (i.tags[s] = t, i.updatedAt = Date.now(), e++);
    }), e > 0 ? (this.customTags.has(a) && (this.customTags.delete(a), this.customTags.add(t)), this.scheduleSave(), l.info(`Tag renamed: "${a}" → "${t}" (${e} items)`)) : this.customTags.has(a) && (this.customTags.delete(a), this.customTags.add(t), this.scheduleSave(), l.info(`Custom tag renamed: "${a}" → "${t}"`)), e;
  }
  /**
   * Delete tag globally
   */
  deleteTag(a) {
    let t = 0;
    return this.items.forEach((e) => {
      const i = e.tags.indexOf(a);
      i !== -1 && (e.tags.splice(i, 1), e.updatedAt = Date.now(), t++);
    }), t > 0 ? (this.customTags.has(a) && this.customTags.delete(a), this.scheduleSave(), l.info(`Tag deleted: "${a}" (${t} items)`)) : this.customTags.has(a) && (this.customTags.delete(a), this.scheduleSave(), l.info(`Custom tag deleted: "${a}"`)), t;
  }
  // ─────────────────────────────────────────────────────────────
  // Favorites
  // ─────────────────────────────────────────────────────────────
  /**
   * Toggle favorite status
   */
  toggleFavorite(a) {
    const t = this.getItem(a);
    if (!t)
      throw new Error(`Library item not found: ${a}`);
    return t.favorite = !t.favorite, t.updatedAt = Date.now(), this.scheduleSave(), t.favorite;
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  loadFromSettings() {
    try {
      const a = game.settings.get(_, "libraryState");
      if (!a) {
        l.info("No saved library state, starting fresh");
        return;
      }
      const t = JSON.parse(a);
      t.version !== I && l.warn(`Library version mismatch: ${t.version} → ${I}`), this.items.clear(), Object.values(t.items).forEach((e) => {
        this.items.set(e.id, e);
      }), this.customTags = new Set(t.customTags || []), this.playlists.load(t.playlists || {}), l.info(`Library loaded: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists, ${this.customTags.size} custom tags`);
    } catch (a) {
      l.error("Failed to load library state:", a);
    }
  }
  saveToSettings() {
    try {
      const a = {
        items: Object.fromEntries(this.items),
        playlists: this.playlists.export(),
        customTags: Array.from(this.customTags),
        version: I,
        lastModified: Date.now()
      };
      game.settings.set(_, "libraryState", JSON.stringify(a)), this.saveScheduled = !1, l.debug(`Library saved: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (a) {
      l.error("Failed to save library state:", a);
    }
  }
  scheduleSave() {
    this.debouncedSave();
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  extractNameFromUrl(a) {
    try {
      const e = decodeURIComponent(a).split("/");
      return e[e.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      return "Unknown Track";
    }
  }
  /**
   * Get library statistics
   */
  getStats() {
    const a = this.getAllItems(), t = this.playlists.getStats();
    return {
      totalItems: a.length,
      favoriteItems: a.filter((e) => e.favorite).length,
      totalDuration: a.reduce((e, i) => e + i.duration, 0),
      tagCount: this.getAllTags().length,
      playlists: t.totalPlaylists
    };
  }
  /**
   * Clear all library data
   */
  clear() {
    this.items.clear(), this.playlists.clear(), this.scheduleSave(), l.warn("Library cleared");
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.saveScheduled && this.saveToSettings();
  }
}
const D = "advanced-sound-engine";
let g = null, p = null, v = null, y = null, T = null, k = null;
Hooks.on("getSceneControlButtons", (c) => {
  var a;
  try {
    const t = ((a = game.user) == null ? void 0 : a.isGM) ?? !1, e = [
      {
        name: "ase-open-mixer",
        title: t ? "Open Sound Mixer" : "Open Sound Volume",
        icon: t ? "fas fa-sliders-h" : "fas fa-volume-up",
        button: !0,
        onClick: () => {
          console.log("ASE | Button clicked: Open Mixer/Volume"), window.ASE ? (console.log("ASE | Window.ASE exists", window.ASE), window.ASE.openPanel()) : console.error("ASE | Window.ASE is undefined!");
        }
      }
    ];
    if (t && e.push({
      name: "ase-open-library",
      title: "Open Sound Library",
      icon: "fas fa-book-open",
      button: !0,
      onClick: () => {
        console.log("ASE | Button clicked: Open Library"), window.ASE && window.ASE.openLibrary ? window.ASE.openLibrary() : console.error("ASE | Window.ASE or openLibrary undefined");
      }
    }), console.log("ASE | getSceneControlButtons called with:", c), !Array.isArray(c) && typeof c == "object" && c !== null) {
      console.log("ASE | Detected non-array controls structure (V13?)");
      const i = c.sounds;
      i && Array.isArray(i.tools) ? (i.tools.push(...e), console.log('ASE | Added tools to "sounds" layer (V13 Object Mode)')) : (c["advanced-sound-engine"] = {
        name: "advanced-sound-engine",
        title: "Advanced Sound Engine",
        icon: "fas fa-music",
        visible: !0,
        tools: e
      }, console.log("ASE | Created dedicated control group (V13 Object Mode)"));
      return;
    }
    if (Array.isArray(c)) {
      const i = c.find((s) => s.name === "sounds");
      i ? (i.tools.push(...e), console.log('ASE | Added tools to "sounds" layer')) : (c.push({
        name: "advanced-sound-engine",
        title: "Advanced Sound Engine",
        icon: "fas fa-music",
        visible: !0,
        tools: e
      }), console.log("ASE | Created dedicated control group"));
    } else
      console.warn("ASE | Unknown controls structure:", c);
  } catch (t) {
    console.error("ASE | Failed to initialize scene controls:", t);
  }
});
Hooks.on("renderSceneControls", (c, a) => {
  try {
    const t = (s) => {
      if (typeof a.find == "function") {
        const r = a.find(s);
        return r.length ? r[0] : null;
      } else {
        if (a instanceof HTMLElement)
          return a.querySelector(s);
        if (a.length && a[0] instanceof HTMLElement)
          return a[0].querySelector(s) ?? null;
      }
      return null;
    }, e = t('[data-tool="ase-open-mixer"]');
    e && (e.onclick = (s) => {
      var r;
      s.preventDefault(), s.stopPropagation(), console.log("ASE | Manual click handler (native): Open Mixer"), (r = window.ASE) == null || r.openPanel();
    }, console.log("ASE | Bound manual click listener to mixer button"));
    const i = t('[data-tool="ase-open-library"]');
    i && (i.onclick = (s) => {
      var r, n;
      s.preventDefault(), s.stopPropagation(), console.log("ASE | Manual click handler (native): Open Library"), (n = (r = window.ASE) == null ? void 0 : r.openLibrary) == null || n.call(r);
    }, console.log("ASE | Bound manual click listener to library button"));
  } catch (t) {
    console.warn("ASE | Failed to bind manual click listeners:", t);
  }
});
function nt() {
  Handlebars.registerHelper("formatDuration", (c) => {
    if (!c || c <= 0) return "--:--";
    const a = Math.floor(c / 60), t = Math.floor(c % 60);
    return `${a}:${t.toString().padStart(2, "0")}`;
  }), Handlebars.registerHelper("eq", (c, a) => c === a);
}
Hooks.once("init", () => {
  l.info("Initializing Advanced Sound Engine..."), ut(), nt();
});
Hooks.once("ready", async () => {
  var a;
  const c = ((a = game.user) == null ? void 0 : a.isGM) ?? !1;
  l.info(`Starting Advanced Sound Engine (${c ? "GM" : "Player"})...`), k = new W(), c ? await ot() : await lt(), window.ASE = {
    isGM: c,
    openPanel: c ? N : ct,
    openLibrary: () => c && N("library"),
    engine: c ? g ?? void 0 : y ?? void 0,
    socket: k ?? void 0,
    library: c ? v ?? void 0 : void 0
  }, dt(), l.info("Advanced Sound Engine ready");
});
async function ot() {
  v = new rt(), g = new X(), k.initializeAsGM(g), await g.loadSavedState();
}
async function lt() {
  y = new J(), k.initializeAsPlayer(y);
  const c = U.loadSavedVolume();
  y.setLocalVolume(c);
}
function N(c, a = !1) {
  !g || !k || !v || (p && p.rendered ? (c && p.state.activeTab !== c && (p.state.activeTab = c, a = !0), a ? p.render(!1) : p.bringToTop()) : (p = new it(g, k, v), c && (p.state.activeTab = c), p.render(!0)));
}
function ct() {
  y && (T && T.rendered ? T.bringToTop() : (T = new U(y), T.render(!0)));
}
function dt() {
  const c = () => {
    g == null || g.resume(), y == null || y.resume();
  };
  document.addEventListener("click", c, { once: !0 }), document.addEventListener("keydown", c, { once: !0 }), Hooks.once("canvasReady", c);
}
function ut() {
  game.settings.register(D, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  }), game.settings.register(D, "maxSimultaneousTracks", {
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
  }), game.settings.register(D, "libraryState", {
    name: "Library State",
    hint: "Internal storage for library items and playlists",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  p == null || p.close(), T == null || T.close(), k == null || k.dispose(), g == null || g.dispose(), y == null || y.dispose(), v == null || v.dispose();
});
//# sourceMappingURL=module.js.map
