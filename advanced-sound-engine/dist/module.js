var H = Object.defineProperty;
var Y = (d, a, t) => a in d ? H(d, a, { enumerable: !0, configurable: !0, writable: !0, value: t }) : d[a] = t;
var h = (d, a, t) => Y(d, typeof a != "symbol" ? a + "" : a, t);
const F = "ASE", o = {
  info: (d, ...a) => {
    console.log(`${F} | ${d}`, ...a);
  },
  warn: (d, ...a) => {
    console.warn(`${F} | ${d}`, ...a);
  },
  error: (d, ...a) => {
    console.error(`${F} | ${d}`, ...a);
  },
  debug: (d, ...a) => {
    var t;
    (t = CONFIG == null ? void 0 : CONFIG.debug) != null && t.audio && console.debug(`${F} | ${d}`, ...a);
  }
};
class O {
  constructor(a, t, e, i = "music") {
    h(this, "id");
    h(this, "ctx");
    h(this, "_group");
    h(this, "_url", "");
    h(this, "audio");
    h(this, "sourceNode", null);
    h(this, "gainNode");
    h(this, "outputNode");
    h(this, "_state", "stopped");
    h(this, "_volume", 1);
    h(this, "_loop", !1);
    h(this, "_ready", !1);
    this.id = a, this.ctx = t, this._group = i, this.audio = new Audio(), this.audio.crossOrigin = "anonymous", this.audio.preload = "auto", this.gainNode = t.createGain(), this.outputNode = t.createGain(), this.gainNode.connect(this.outputNode), this.outputNode.connect(e), this.setupAudioEvents();
  }
  setupAudioEvents() {
    this.audio.addEventListener("canplay", () => {
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), o.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", o.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (a) => {
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
  async load(a) {
    return this._state = "loading", this._url = a, this._ready = !1, new Promise((t, e) => {
      const i = () => {
        this.audio.removeEventListener("canplay", i), this.audio.removeEventListener("error", s), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", o.debug(`Track loaded: ${this.id}`), t();
      }, s = () => {
        this.audio.removeEventListener("canplay", i), this.audio.removeEventListener("error", s), this._state = "stopped", e(new Error(`Failed to load: ${a}`));
      };
      this.audio.addEventListener("canplay", i, { once: !0 }), this.audio.addEventListener("error", s, { once: !0 }), this.audio.src = a, this.audio.load();
    });
  }
  async play(a = 0) {
    if (!this._ready) {
      o.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(a, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", o.debug(`Track ${this.id} playing from ${a.toFixed(2)}s`);
    } catch (t) {
      o.error(`Failed to play ${this.id}:`, t);
    }
  }
  pause() {
    this._state === "playing" && (this.audio.pause(), this._state = "paused", o.debug(`Track ${this.id} paused at ${this.audio.currentTime.toFixed(2)}s`));
  }
  stop() {
    this.audio.pause(), this.audio.currentTime = 0, this._state = "stopped", o.debug(`Track ${this.id} stopped`);
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
    this.audio.pause(), this.audio.src = "", (a = this.sourceNode) == null || a.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), o.debug(`Track ${this.id} disposed`);
  }
}
function A() {
  return Date.now();
}
function M(d) {
  if (!isFinite(d) || d < 0) return "0:00";
  const a = Math.floor(d / 60), t = Math.floor(d % 60);
  return `${a}:${t.toString().padStart(2, "0")}`;
}
function L() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (d) => {
    const a = Math.random() * 16 | 0;
    return (d === "x" ? a : a & 3 | 8).toString(16);
  });
}
const B = [
  ".mp3",
  ".ogg",
  ".wav",
  ".webm",
  ".m4a",
  ".aac",
  ".flac",
  ".opus"
], K = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/opus"
};
function W(d) {
  const a = U(d);
  return B.includes(a);
}
function U(d) {
  try {
    const e = decodeURIComponent(d).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return e ? `.${e[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function X(d) {
  const a = U(d);
  return K[a] || null;
}
function V(d) {
  if (!d || typeof d != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const a = U(d);
  if (!a)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!W(d))
    return {
      valid: !1,
      error: `Unsupported audio format: ${a}. Supported formats: ${B.join(", ")}`,
      extension: a
    };
  const t = X(d);
  return {
    valid: !0,
    extension: a,
    mimeType: t || void 0
  };
}
const q = "advanced-sound-engine";
function J() {
  return game.settings.get(q, "maxSimultaneousTracks") || 8;
}
class Z {
  constructor() {
    h(this, "ctx");
    h(this, "masterGain");
    h(this, "channelGains");
    h(this, "players", /* @__PURE__ */ new Map());
    h(this, "_volumes", {
      master: 1,
      music: 1,
      ambience: 1,
      sfx: 1
    });
    h(this, "saveTimeout", null);
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
      await game.settings.set(q, "mixerState", JSON.stringify(a)), o.debug("Mixer state saved");
    } catch (e) {
      o.error("Failed to save mixer state:", e);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const a = game.settings.get(q, "mixerState");
        if (!a) return;
        const t = JSON.parse(a);
        await this.restoreState(t), o.info("Mixer state restored");
      } catch (a) {
        o.error("Failed to load mixer state:", a);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(a) {
    const t = a.id || L();
    if (this.players.has(t))
      return this.players.get(t);
    const e = V(a.url);
    if (!e.valid) {
      const r = new Error(e.error || "Invalid audio file");
      throw o.error(`Track validation failed: ${e.error}`), r;
    }
    const i = this.channelGains[a.group], s = new O(
      t,
      this.ctx,
      i,
      a.group
    );
    return a.volume !== void 0 && s.setVolume(a.volume), a.loop !== void 0 && s.setLoop(a.loop), await s.load(a.url), this.players.set(t, s), this.scheduleSave(), o.info(`Track created: ${t} (${e.extension})`), s;
  }
  getTrack(a) {
    return this.players.get(a);
  }
  removeTrack(a) {
    const t = this.players.get(a);
    return t ? (t.dispose(), this.players.delete(a), this.scheduleSave(), o.info(`Track removed: ${a}`), !0) : !1;
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
      o.warn(`Track not found: ${a}`);
      return;
    }
    const i = J(), s = this.getAllTracks().filter((l) => l.state === "playing").length;
    if (!(e.state === "playing") && s >= i) {
      o.warn(`Maximum simultaneous tracks (${i}) reached`), (n = ui.notifications) == null || n.warn(`Cannot play more than ${i} tracks simultaneously`);
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
      timestamp: A(),
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
          o.error(`Failed to restore track ${e.id}:`, i);
        }
    const t = new Set(a.tracks.map((e) => e.id));
    for (const [e] of this.players)
      t.has(e) || this.removeTrack(e);
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
    for (const a of this.players.values())
      a.dispose();
    this.players.clear(), this.ctx.close(), o.info("AudioEngine disposed");
  }
}
class tt {
  constructor() {
    h(this, "ctx");
    h(this, "masterGain");
    h(this, "gmGain");
    // Громкость от GM
    h(this, "channelGains");
    h(this, "players", /* @__PURE__ */ new Map());
    h(this, "_localVolume", 1);
    // Личная громкость игрока
    h(this, "_gmVolumes", {
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
    e ? await e.play(t) : o.warn(`PlayerAudioEngine: Track ${a} not found locally.`);
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
    t || (t = new O(
      a.trackId,
      this.ctx,
      this.channelGains[a.group],
      a.group
    ), await t.load(a.url), this.players.set(a.trackId, t)), t.setVolume(a.volume), t.setLoop(a.loop);
    const e = (A() - a.startTimestamp) / 1e3, i = Math.max(0, a.offset + e);
    await t.play(i), o.debug(`Player: track ${a.trackId} playing at ${i.toFixed(2)}s`);
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
        const r = (A() - i) / 1e3;
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
      if (s || (s = new O(
        i.id,
        this.ctx,
        this.channelGains[i.group],
        i.group
      ), await s.load(i.url), this.players.set(i.id, s)), s.setVolume(i.volume), s.setLoop(i.loop), i.isPlaying) {
        const r = (A() - i.startTimestamp) / 1e3, n = i.currentTime + r;
        await s.play(n);
      } else
        s.stop();
    }
    o.info("Player: synced state from GM");
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
const et = "advanced-sound-engine", D = `module.${et}`;
class at {
  constructor() {
    h(this, "gmEngine", null);
    h(this, "playerEngine", null);
    h(this, "socket", null);
    h(this, "_syncEnabled", !1);
    h(this, "isGM", !1);
  }
  initializeAsGM(a) {
    var t;
    this.isGM = !0, this.gmEngine = a, this.socket = game.socket, (t = this.socket) == null || t.on(D, (e) => {
      this.handleGMMessage(e);
    }), o.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(a) {
    var t;
    this.isGM = !1, this.playerEngine = a, this.socket = game.socket, (t = this.socket) == null || t.on(D, (e) => {
      this.handlePlayerMessage(e);
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
  setSyncEnabled(a) {
    this.isGM && (this._syncEnabled = a, a ? this.broadcastSyncStart() : this.broadcastSyncStop(), o.info(`Sync mode: ${a ? "ON" : "OFF"}`));
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
      switch (o.debug(`Player received: ${a.type}`, a.payload), a.type) {
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
          const l = a.payload;
          this.playerEngine.handleSeek(
            l.trackId,
            l.time,
            l.isPlaying,
            l.seekTimestamp
          );
          break;
        case "track-volume":
          const c = a.payload;
          this.playerEngine.handleTrackVolume(c.trackId, c.volume);
          break;
        case "track-loop":
          const u = a.payload;
          this.playerEngine.handleTrackLoop(u.trackId, u.loop);
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
      timestamp: A()
    };
    e ? this.socket.emit(D, i, { recipients: [e] }) : this.socket.emit(D, i), o.debug(`Sent: ${a}`, t);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const a = A(), t = [];
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
      startTimestamp: A()
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
      seekTimestamp: A()
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
    (a = this.socket) == null || a.off(D);
  }
}
const _ = "advanced-sound-engine";
class j extends Application {
  constructor(t, e) {
    super(e);
    h(this, "engine");
    this.engine = t;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-player-volume",
      title: "Sound Volume",
      template: `modules/${_}/templates/player-volume.hbs`,
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
    localStorage.setItem(`${_}-player-volume`, String(t));
  }
  static loadSavedVolume() {
    const t = localStorage.getItem(`${_}-player-volume`);
    return t ? parseFloat(t) : 1;
  }
}
class it extends Application {
  // Using any to avoid circular import issues for now, or use interface
  constructor(t, e, i = {}) {
    super(i);
    h(this, "library");
    h(this, "filterState");
    h(this, "parentApp");
    this.library = t, this.parentApp = e, this.filterState = {
      searchQuery: "",
      selectedChannels: /* @__PURE__ */ new Set(["music", "ambience", "sfx"]),
      selectedPlaylistId: null,
      selectedTags: /* @__PURE__ */ new Set(),
      // Default sort
      sortBy: "date-desc"
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
  // Helper to request scroll persistence
  persistScroll() {
    this.parentApp && (this.parentApp.persistScrollOnce = !0);
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
    this.library.scanMissingDurations().then(() => {
    }), t = this.applyFilters(t), t = this.applySorting(t);
    const n = this.library.getOrderedFavorites().map((f) => {
      var y, T, v, I;
      const g = f.type === "track" ? ((T = (y = window.ASE) == null ? void 0 : y.queue) == null ? void 0 : T.hasItem(f.id)) ?? !1 : ((I = (v = window.ASE) == null ? void 0 : v.queue) == null ? void 0 : I.getItems().some((b) => b.playlistId === f.id)) ?? !1;
      if (f.type === "track") {
        const b = this.library.getItem(f.id);
        return b ? {
          id: b.id,
          name: b.name,
          type: "track",
          group: this.inferGroupFromTags(b.tags),
          inQueue: g
        } : null;
      } else {
        const b = this.library.playlists.getPlaylist(f.id);
        return b ? {
          id: b.id,
          name: b.name,
          type: "playlist",
          inQueue: g
        } : null;
      }
    }).filter((f) => f !== null), l = new Set(i);
    this.filterState.selectedTags.forEach((f) => l.add(f));
    const c = Array.from(l).sort().map((f) => {
      const g = f.startsWith("#") ? f.substring(1) : f, y = this.filterState.selectedTags.has(f) || this.filterState.selectedTags.has(g);
      return {
        name: g,
        // Display name (without #)
        value: g,
        // Data value (also normalized for consistency)
        selected: y
      };
    }), u = e.map((f) => ({
      ...this.getPlaylistViewData(f),
      selected: f.id === this.filterState.selectedPlaylistId
    })), m = this.filterState.selectedChannels.size === 3, p = !!(this.filterState.searchQuery || !m || this.filterState.selectedPlaylistId || this.filterState.selectedTags.size > 0);
    return {
      items: t.map((f) => this.getItemViewData(f)),
      playlists: u,
      favorites: n,
      tags: c,
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
      hasActiveFilters: p
    };
  }
  getPlaylistViewData(t) {
    var i, s;
    const e = ((s = (i = window.ASE) == null ? void 0 : i.queue) == null ? void 0 : s.getItems().some(
      (r) => r.playlistId === t.id
    )) ?? !1;
    return {
      id: t.id,
      name: t.name,
      itemCount: t.items.length,
      trackCount: t.items.length,
      // Alias for template
      favorite: t.favorite,
      inQueue: e,
      selected: !1
    };
  }
  getItemViewData(t) {
    var l, c, u, m, p;
    const e = ((c = (l = window.ASE) == null ? void 0 : l.queue) == null ? void 0 : c.hasItem(t.id)) ?? !1, i = M(t.duration), s = (p = (m = (u = window.ASE) == null ? void 0 : u.engine) == null ? void 0 : m.getTrack) == null ? void 0 : p.call(m, t.id), r = (s == null ? void 0 : s.state) === "playing", n = (s == null ? void 0 : s.state) === "paused";
    return {
      id: t.id,
      name: t.name,
      url: t.url,
      duration: i,
      durationFormatted: i,
      durationSeconds: t.duration,
      tags: t.tags,
      favorite: t.favorite,
      group: t.group || "music",
      inQueue: e,
      isPlaying: r,
      isPaused: n
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
    if (this.filterState.selectedChannels.size > 0 && (e = e.filter((i) => {
      const s = i.group || "music";
      return this.filterState.selectedChannels.has(s);
    })), this.filterState.selectedPlaylistId) {
      const i = this.library.playlists.getPlaylist(this.filterState.selectedPlaylistId);
      if (i) {
        const s = new Set(i.items.map((r) => r.libraryItemId));
        e = e.filter((r) => s.has(r.id));
      }
    }
    if (this.filterState.selectedTags.size > 0) {
      const i = Array.from(this.filterState.selectedTags);
      e = e.filter(
        (s) => i.every((r) => s.tags.includes(r))
      );
    }
    return e;
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
    super.activateListeners(t), t.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), t.find(".ase-search-input").on("keydown", this.onSearchKeydown.bind(this)), t.find(".ase-search-input").on("input", this.onSearchInput.bind(this)), t.find(".ase-search-clear").on("click", this.onClearSearch.bind(this)), t.find('[data-action="filter-channel"]').on("click", this._onFilterChannel.bind(this)), t.find('[data-action="sort-change"]').on("change", this.onChangeSort.bind(this)), t.find('[data-action="clear-filters"]').on("click", this.onClearFilters.bind(this)), t.find('[data-action="toggle-tag"]').on("click", this.onToggleTag.bind(this)), t.find('[data-action="add-tag"]').on("click", this.onAddTag.bind(this)), t.find('[data-action="play-track"]').on("click", this.onPlayTrack.bind(this)), t.find('[data-action="pause-track"]').on("click", this.onPauseTrack.bind(this)), t.find('[data-action="stop-track"]').on("click", this.onStopTrack.bind(this)), t.find('[data-action="add-to-queue"]').on("click", this.onAddToQueue.bind(this)), t.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), t.find('[data-action="add-to-playlist"]').on("click", this.onAddToPlaylist.bind(this)), t.find('[data-action="track-menu"]').on("click", this.onTrackMenu.bind(this)), t.find('[data-action="add-tag-to-track"]').on("click", this.onAddTagToTrack.bind(this)), t.find('[data-action="channel-dropdown"]').on("click", this.onChannelDropdown.bind(this)), t.find('[data-action="delete-track"]').on("click", this.onDeleteTrack.bind(this)), t.find(".ase-track-player-item").on("contextmenu", this.onTrackContext.bind(this)), t.find(".ase-track-tags .ase-tag").on("contextmenu", this.onTrackTagContext.bind(this)), t.find('[data-action="select-playlist"]').on("click", this.onSelectPlaylist.bind(this)), t.find('[data-action="create-playlist"]').on("click", this.onCreatePlaylist.bind(this)), t.find('[data-action="toggle-playlist-favorite"]').on("click", this.onTogglePlaylistFavorite.bind(this)), t.find('[data-action="toggle-playlist-queue"]').on("click", this.onTogglePlaylistQueue.bind(this)), t.find('[data-action="playlist-menu"]').on("click", this.onPlaylistMenu.bind(this)), t.find(".ase-list-item[data-playlist-id]").on("contextmenu", this.onPlaylistContext.bind(this)), t.find('[data-action="remove-from-favorites"]').on("click", this.onRemoveFromFavorites.bind(this)), t.find('[data-action="toggle-favorite-queue"]').on("click", this.onToggleFavoriteQueue.bind(this)), this.setupDragAndDrop(t), this.setupFoundryDragDrop(t), t.find(".ase-track-player-item").on("mouseenter", (e) => {
      const i = $(e.currentTarget).data("item-id");
      i && this.highlightPlaylistsContainingTrack(i);
    }), t.find(".ase-track-player-item").on("mouseleave", () => {
      this.clearPlaylistHighlights();
    }), t.find(".ase-tags-inline .ase-tag").on("contextmenu", this.onTagContext.bind(this)), o.debug("LocalLibraryApp listeners activated");
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
      const r = Array.from(this.filterState.selectedTags), n = await this.library.addItem(t, void 0, e, r);
      this.persistScroll(), this.render(), (i = ui.notifications) == null || i.info(`Added to library: ${n.name}`);
    } catch (r) {
      o.error("Failed to add track to library:", r);
      const n = r instanceof Error ? r.message : "Unknown error";
      (s = ui.notifications) == null || s.error(`Failed to add track: ${n}`);
    }
  }
  async onToggleFavorite(t) {
    var i, s;
    t.preventDefault();
    const e = $(t.currentTarget).closest("[data-item-id]").data("item-id");
    try {
      this.persistScroll();
      const r = this.library.toggleFavorite(e);
      this.render(), (i = ui.notifications) == null || i.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      o.error("Failed to toggle favorite:", r), (s = ui.notifications) == null || s.error("Failed to update favorite status");
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
        this.persistScroll(), this.render(), (i = ui.notifications) == null || i.info(`Created playlist: ${r.name}`);
      } catch (r) {
        o.error("Failed to create playlist:", r);
        const n = r instanceof Error ? r.message : "Unknown error";
        (s = ui.notifications) == null || s.error(`Failed to create playlist: ${n}`);
      }
  }
  async onTogglePlaylistFavorite(t) {
    var i, s;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).closest("[data-playlist-id]").data("playlist-id");
    try {
      this.persistScroll();
      const r = this.library.playlists.togglePlaylistFavorite(e);
      this.render(), (i = ui.notifications) == null || i.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      o.error("Failed to toggle playlist favorite:", r), (s = ui.notifications) == null || s.error("Failed to update favorite status");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Toolbar Event Handlers
  // ─────────────────────────────────────────────────────────────
  onSearchInput(t) {
    !($(t.currentTarget).val() || "").trim() && this.filterState.searchQuery && (this.filterState.searchQuery = "", this.render());
  }
  onSearchKeydown(t) {
    if (t.key === "Enter") {
      t.preventDefault();
      const e = ($(t.currentTarget).val() || "").trim().toLowerCase();
      this.filterState.searchQuery !== e && (this.filterState.searchQuery = e, this.render());
    }
  }
  onClearSearch(t) {
    t.preventDefault(), this.filterState.searchQuery = "", $(t.currentTarget).closest(".ase-search-input-wrapper").find(".ase-search-input").val(""), this.render();
  }
  _onFilterChannel(t) {
    t.preventDefault();
    const e = $(t.currentTarget), i = e.data("channel");
    this.filterState.selectedChannels.has(i) ? (this.filterState.selectedChannels.delete(i), e.removeClass("active")) : (this.filterState.selectedChannels.add(i), e.addClass("active")), this.render(), o.debug("Filter channel toggled:", i, this.filterState.selectedChannels);
  }
  onChangeSort(t) {
    const e = $(t.currentTarget).val();
    this.filterState.sortBy = e, this.render(), o.debug("Sort changed:", e);
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
    const e = String($(t.currentTarget).data("tag"));
    console.log("[ASE] onToggleTag called with tag:", e), console.log("[ASE] Current selectedTags:", Array.from(this.filterState.selectedTags)), this.filterState.selectedTags.has(e) ? (this.filterState.selectedTags.delete(e), console.log("[ASE] Tag deselected")) : (this.filterState.selectedTags.add(e), console.log("[ASE] Tag selected")), this.render();
  }
  onTagContext(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("tag")), i = `
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
    var s;
    t.preventDefault();
    const e = await this.promptTagName();
    if (!e) return;
    const i = e.trim().replace(/^#/, "");
    i && (console.log("[ASE] onAddTag: normalized tagName =", i), this.filterState.selectedTags.add(i), this.library.addCustomTag(i), console.log("[ASE] onAddTag: selectedTags now =", Array.from(this.filterState.selectedTags)), console.log("[ASE] onAddTag: allTags from library =", this.library.getAllTags()), this.render(), (s = ui.notifications) == null || s.info(`Tag "${i}" added.`));
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
    this.filterState.selectedTags.has(t) && (this.filterState.selectedTags.delete(t), this.filterState.selectedTags.add(e)), i > 0 && (this.persistScroll(), this.render(), (s = ui.notifications) == null || s.info(`Renamed tag "${t}" to "${e}" on ${i} tracks.`));
  }
  async deleteTag(t) {
    var r;
    const e = String(t);
    if (console.log("[ASE] deleteTag called for:", e), !await Dialog.confirm({
      title: "Delete Tag",
      content: `Are you sure you want to delete tag "${e}" from all tracks?`
    })) return;
    const s = this.library.deleteTag(e);
    this.filterState.selectedTags.delete(e), this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(s > 0 ? `Deleted tag "${e}" from ${s} tracks.` : `Deleted custom tag "${e}".`);
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
  async onPlayTrack(t) {
    var c, u, m, p, f;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    o.debug("Play track:", e);
    const i = this.library.getItem(e);
    if (!i) {
      o.warn("Track not found:", e);
      return;
    }
    const s = (c = window.ASE) == null ? void 0 : c.engine, r = (u = window.ASE) == null ? void 0 : u.queue;
    if (!s) {
      o.warn("Audio engine not available");
      return;
    }
    r && !r.hasItem(e) && r.addItem(e, {
      group: i.group,
      volume: 1,
      loop: !1
    });
    let n = (m = s.getTrack) == null ? void 0 : m.call(s, e);
    n || (n = await ((p = s.createTrack) == null ? void 0 : p.call(s, {
      id: e,
      url: i.url,
      group: i.group,
      volume: 1,
      loop: !1
    })));
    let l = 0;
    n && n.state === "paused" && (l = n.getCurrentTime()), await ((f = s.playTrack) == null ? void 0 : f.call(s, e, l)), this.persistScroll(), this.render();
  }
  onStopTrack(t) {
    var i, s;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    o.debug("Stop track:", e), (i = window.ASE.engine) == null || i.stopTrack(e), (s = window.ASE) != null && s.queue && window.ASE.queue.removeByLibraryItemId(e), this.persistScroll(), this.render();
  }
  onPauseTrack(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    o.debug("Pause track:", e), (i = window.ASE.engine) == null || i.pauseTrack(e), this.persistScroll(), this.render();
  }
  onAddToQueue(t) {
    var s, r, n;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("item-id"));
    if (!((s = window.ASE) != null && s.queue)) {
      o.warn("Queue manager not available");
      return;
    }
    const i = this.library.getItem(e);
    if (!i) {
      o.warn("Item not found:", e);
      return;
    }
    window.ASE.queue.hasItem(e) ? (window.ASE.queue.removeByLibraryItemId(e), o.debug("Removed from queue:", e), (r = ui.notifications) == null || r.info(`"${i.name}" removed from queue`)) : (window.ASE.queue.addItem(e, {
      group: i.group || "music",
      volume: 1,
      loop: !1
    }), o.debug("Added to queue:", e), (n = ui.notifications) == null || n.info(`"${i.name}" added to queue`)), this.persistScroll(), this.render();
  }
  async onAddTagToTrack(t) {
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    o.debug("Add tag to track:", e), this.showTagEditor(e);
  }
  async onAddToPlaylist(t) {
    var n, l, c, u;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id"), i = this.library.getItem(e);
    if (!i) {
      (n = ui.notifications) == null || n.error("Track not found");
      return;
    }
    const s = this.library.playlists.getAllPlaylists();
    if (s.length === 0) {
      (l = ui.notifications) == null || l.warn("No playlists available. Create one first.");
      return;
    }
    const r = await this.promptPlaylistSelection(s);
    if (r)
      try {
        const m = this.inferGroupFromTags(i.tags);
        this.library.playlists.addTrackToPlaylist(r, e, m), this.render(), (c = ui.notifications) == null || c.info(`Added "${i.name}" to playlist`);
      } catch (m) {
        o.error("Failed to add track to playlist:", m);
        const p = m instanceof Error ? m.message : "Unknown error";
        (u = ui.notifications) == null || u.error(`Failed to add to playlist: ${p}`);
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
  // Favorites Event Handlers
  // ─────────────────────────────────────────────────────────────
  onRemoveFromFavorites(t) {
    var s, r;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("favorite-id")), i = String($(t.currentTarget).data("favorite-type"));
    if (o.debug("Remove from favorites:", e, i), i === "playlist") {
      const n = this.library.playlists.getPlaylist(e);
      n && (this.library.playlists.updatePlaylist(e, { favorite: !1 }), (s = ui.notifications) == null || s.info(`Removed "${n.name}" from favorites`));
    } else {
      const n = this.library.getItem(e);
      n && (this.library.toggleFavorite(e), (r = ui.notifications) == null || r.info(`Removed "${n.name}" from favorites`));
    }
    this.persistScroll(), this.render();
  }
  onToggleFavoriteQueue(t) {
    var s, r, n, l, c;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("favorite-id")), i = String($(t.currentTarget).data("favorite-type"));
    if (!((s = window.ASE) != null && s.queue)) {
      o.warn("Queue manager not available");
      return;
    }
    if (i === "playlist") {
      const u = this.library.playlists.getPlaylist(e);
      if (!u) return;
      if (window.ASE.queue.getItems().some((p) => p.playlistId === e))
        window.ASE.queue.getItems().filter((f) => f.playlistId === e).forEach((f) => window.ASE.queue.removeItem(f.id)), (r = ui.notifications) == null || r.info(`Removed "${u.name}" from queue`);
      else {
        const p = u.items.map((f) => ({
          libraryItemId: f.libraryItemId,
          group: f.group || "music",
          volume: f.volume,
          loop: f.loop
        }));
        window.ASE.queue.addPlaylist(e, p), (n = ui.notifications) == null || n.info(`Added "${u.name}" to queue`);
      }
    } else {
      const u = this.library.getItem(e);
      if (!u) return;
      window.ASE.queue.hasItem(e) ? (window.ASE.queue.getItems().filter((f) => f.libraryItemId === e).forEach((f) => window.ASE.queue.removeItem(f.id)), (l = ui.notifications) == null || l.info(`Removed "${u.name}" from queue`)) : (window.ASE.queue.addItem(e, {
        group: this.inferGroupFromTags(u.tags),
        volume: 1,
        loop: !1
      }), (c = ui.notifications) == null || c.info(`Added "${u.name}" to queue`));
    }
    this.persistScroll(), this.render();
  }
  // ─────────────────────────────────────────────────────────────
  // Track Control Handlers
  // ─────────────────────────────────────────────────────────────
  onChannelDropdown(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("item-id")), i = this.library.getItem(e);
    if (!i) return;
    const s = i.group || "music", r = ["music", "ambience", "sfx"], n = $(`
      <div class="ase-dropdown-menu" style="position: fixed; z-index: 9999; background: #1e283d; border: 1px solid #334155; border-radius: 4px; min-width: 100px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        ${r.map((c) => `
          <div class="ase-dropdown-item" data-channel="${c}" style="padding: 8px 12px; cursor: pointer; color: ${c === s ? "var(--accent-cyan)" : "#94a3b8"}; font-size: 12px;">
            ${c.charAt(0).toUpperCase() + c.slice(1)}
          </div>
        `).join("")}
      </div>
    `), l = t.currentTarget.getBoundingClientRect();
    n.css({ top: l.bottom + 2, left: l.left }), $("body").append(n), n.find(".ase-dropdown-item").on("click", (c) => {
      const u = $(c.currentTarget).data("channel");
      this.updateTrackChannel(e, u), n.remove();
    }), setTimeout(() => {
      $(document).one("click", () => n.remove());
    }, 10);
  }
  updateTrackChannel(t, e) {
    var s;
    this.library.getItem(t) && (this.library.updateItem(t, { group: e }), this.persistScroll(), this.render(), (s = ui.notifications) == null || s.info(`Channel set to ${e}`));
  }
  onDeleteTrack(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("item-id")), i = this.library.getItem(e);
    if (!i) return;
    const s = !!this.filterState.selectedPlaylistId, r = {
      title: s ? "Manage Track" : "Delete Track",
      content: `<p>${s ? `What would you like to do with "${i.name}"?` : `Are you sure you want to delete "${i.name}"?`}</p>`,
      buttons: {},
      default: "cancel"
    };
    s && (r.buttons.removeFromPlaylist = {
      icon: '<i class="fas fa-minus-circle"></i>',
      label: "Remove from Playlist",
      callback: () => {
        this.filterState.selectedPlaylistId && this.removeTrackFromPlaylist(this.filterState.selectedPlaylistId, e);
      }
    }), r.buttons.delete = {
      icon: '<i class="fas fa-trash"></i>',
      label: s ? "Delete Track (Global)" : "Delete",
      callback: () => {
        var n;
        this.library.removeItem(e), this.render(), (n = ui.notifications) == null || n.info(`Deleted "${i.name}"`);
      }
    }, r.buttons.cancel = {
      icon: '<i class="fas fa-times"></i>',
      label: "Cancel"
    }, new Dialog(r).render(!0);
  }
  onTrackContext(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("item-id"));
    if (!this.library.getItem(e)) return;
    $(".ase-context-menu").remove();
    const s = !!this.filterState.selectedPlaylistId, r = "Delete Track";
    let n = `
      <div class="ase-context-menu" style="position: fixed; z-index: 9999; background: #1e283d; border: 1px solid #334155; border-radius: 4px; min-width: 150px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
        <div class="ase-menu-item" data-action="rename" style="padding: 8px 12px; cursor: pointer; color: #e5e5e5; font-size: 12px;">
          <i class="fa-solid fa-pen" style="width: 16px;"></i> Rename
        </div>
        <div class="ase-menu-item" data-action="add-to-playlist" style="padding: 8px 12px; cursor: pointer; color: #e5e5e5; font-size: 12px;">
          <i class="fa-solid fa-list" style="width: 16px;"></i> Add to Playlist
        </div>`;
    s && (n += `
        <div class="ase-menu-item" data-action="remove-from-playlist" style="padding: 8px 12px; cursor: pointer; color: #e5e5e5; font-size: 12px;">
          <i class="fa-solid fa-minus-circle" style="width: 16px;"></i> Remove from Playlist
        </div>`), n += `
        <div class="ase-menu-item" data-action="edit-tags" style="padding: 8px 12px; cursor: pointer; color: #e5e5e5; font-size: 12px;">
          <i class="fa-solid fa-tags" style="width: 16px;"></i> Edit Tags
        </div>
        <div style="border-top: 1px solid #334155; margin: 4px 0;"></div>
        <div class="ase-menu-item" data-action="delete" style="padding: 8px 12px; cursor: pointer; color: #f87171; font-size: 12px;">
          <i class="fa-solid fa-trash" style="width: 16px;"></i> ${r}
        </div>
      </div>
    `;
    const l = $(n);
    l.css({ top: t.clientY, left: t.clientX }), $("body").append(l), l.find(".ase-menu-item").on("mouseenter", (c) => $(c.currentTarget).css("background", "#2d3a52")), l.find(".ase-menu-item").on("mouseleave", (c) => $(c.currentTarget).css("background", "transparent")), l.find('[data-action="rename"]').on("click", async () => {
      l.remove(), await this.renameTrack(e);
    }), l.find('[data-action="add-to-playlist"]').on("click", async () => {
      l.remove(), await this.addTrackToPlaylistDialog(e);
    }), s && l.find('[data-action="remove-from-playlist"]').on("click", async () => {
      l.remove(), this.filterState.selectedPlaylistId && await this.removeTrackFromPlaylist(this.filterState.selectedPlaylistId, e);
    }), l.find('[data-action="edit-tags"]').on("click", () => {
      l.remove(), this.showTagEditor(e);
    }), l.find('[data-action="delete"]').on("click", () => {
      l.remove(), this.onDeleteTrack({ preventDefault: () => {
      }, stopPropagation: () => {
      }, currentTarget: $(`<div data-item-id="${e}">`)[0] });
    }), setTimeout(() => {
      $(document).one("click", () => l.remove());
    }, 10);
  }
  onTrackTagContext(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("tag")), i = String($(t.currentTarget).data("item-id"));
    $(".ase-context-menu").remove();
    const s = $(`
      <div class="ase-context-menu" style="position: fixed; z-index: 9999; background: #1e283d; border: 1px solid #334155; border-radius: 4px; min-width: 120px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
        <div class="ase-menu-item" data-action="remove-tag" style="padding: 8px 12px; cursor: pointer; color: #f87171; font-size: 12px;">
          <i class="fa-solid fa-times" style="width: 16px;"></i> Remove Tag
        </div>
      </div>
    `);
    s.css({ top: t.clientY, left: t.clientX }), $("body").append(s), s.find(".ase-menu-item").on("mouseenter", (r) => $(r.currentTarget).css("background", "#2d3a52")), s.find(".ase-menu-item").on("mouseleave", (r) => $(r.currentTarget).css("background", "transparent")), s.find('[data-action="remove-tag"]').on("click", () => {
      var r;
      s.remove(), this.library.removeTagFromItem(i, e), this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(`Removed tag "${e}"`);
    }), setTimeout(() => {
      $(document).one("click", () => s.remove());
    }, 10);
  }
  async renameTrack(t) {
    var s;
    const e = this.library.getItem(t);
    if (!e) return;
    const i = await this.promptInput("Rename Track", "Track Name:", e.name);
    i && i !== e.name && (this.library.updateItem(t, { name: i }), this.render(), (s = ui.notifications) == null || s.info(`Renamed to "${i}"`));
  }
  async addTrackToPlaylistDialog(t) {
    var n, l;
    const e = this.library.playlists.getAllPlaylists();
    if (e.length === 0) {
      (n = ui.notifications) == null || n.warn("No playlists available. Create one first.");
      return;
    }
    const i = await this.promptPlaylistSelection(e);
    if (!i) return;
    const s = this.library.getItem(t);
    if (!s) return;
    const r = this.inferGroupFromTags(s.tags);
    this.library.playlists.addTrackToPlaylist(i, t, r), this.render(), (l = ui.notifications) == null || l.info(`Added "${s.name}" to playlist`);
  }
  showTagEditor(t) {
    const e = this.library.getItem(t);
    if (!e) return;
    const i = this.library.getAllTags(), s = new Set(e.tags), r = `
      <form>
        <div style="max-height: 300px; overflow-y: auto;">
          ${i.map((n) => `
            <div class="form-group" style="margin: 5px 0;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" name="tag" value="${n}" ${s.has(n) ? "checked" : ""}>
                <span>#${n}</span>
              </label>
            </div>
          `).join("")}
        </div>
        <div class="form-group" style="margin-top: 10px;">
          <input type="text" name="newTag" placeholder="Add new tag..." style="width: 100%;">
        </div>
      </form>
    `;
    new Dialog({
      title: `Edit Tags: ${e.name}`,
      content: r,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "Save",
          callback: (n) => {
            var u;
            const l = [];
            n.find('input[name="tag"]:checked').each((m, p) => {
              l.push($(p).val());
            });
            const c = (u = n.find('input[name="newTag"]').val()) == null ? void 0 : u.trim();
            c && (l.push(c), this.library.addCustomTag(c)), this.library.updateItem(t, { tags: l }), this.persistScroll(), this.render();
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      default: "save"
    }).render(!0);
  }
  async promptInput(t, e, i = "") {
    return new Promise((s) => {
      new Dialog({
        title: t,
        content: `
          <form>
            <div class="form-group">
              <label>${e}</label>
              <input type="text" name="input" value="${i}" autofocus style="width: 100%;">
            </div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "OK",
            callback: (r) => {
              const n = r.find('input[name="input"]').val();
              s((n == null ? void 0 : n.trim()) || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => s(null)
          }
        },
        default: "ok"
      }).render(!0);
    });
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onSelectPlaylist(t) {
    t.preventDefault();
    const e = $(t.currentTarget).data("playlist-id");
    this.filterState.selectedPlaylistId === e ? this.filterState.selectedPlaylistId = null : this.filterState.selectedPlaylistId = e, this.render(), o.debug("Select playlist:", e);
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
  onTogglePlaylistQueue(t) {
    var r, n, l;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("playlist-id")), i = this.library.playlists.getPlaylist(e);
    if (!i || !((r = window.ASE) != null && r.queue)) {
      o.warn("Cannot toggle playlist queue: playlist or queue not available");
      return;
    }
    if (window.ASE.queue.getItems().some((c) => c.playlistId === e))
      window.ASE.queue.getItems().filter((u) => u.playlistId === e).forEach((u) => window.ASE.queue.removeItem(u.id)), (n = ui.notifications) == null || n.info(`Removed "${i.name}" from queue`);
    else {
      const c = i.items.map((u) => (this.library.getItem(u.libraryItemId), {
        libraryItemId: u.libraryItemId,
        group: u.group || "music",
        volume: u.volume,
        loop: u.loop
      })).filter((u) => u.libraryItemId);
      window.ASE.queue.addPlaylist(e, c), (l = ui.notifications) == null || l.info(`Added "${i.name}" (${i.items.length} tracks) to queue`);
    }
    this.render();
  }
  onPlaylistContext(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("playlist-id"));
    if (!this.library.playlists.getPlaylist(e)) return;
    const s = `
      <div id="ase-custom-context-menu" style="position: fixed; z-index: 10000; background: #222; border: 1px solid #444; border-radius: 4px; padding: 5px 0;">
        <div class="ase-ctx-item" data-action="edit" style="padding: 5px 15px; cursor: pointer; color: white;">
            <i class="fas fa-edit" style="margin-right: 5px;"></i> Rename
        </div>
        <div class="ase-ctx-item" data-action="delete" style="padding: 5px 15px; cursor: pointer; color: #ff6666;">
            <i class="fas fa-trash" style="margin-right: 5px;"></i> Delete
        </div>
      </div>
    `;
    $("#ase-custom-context-menu").remove();
    const r = $(s);
    $("body").append(r), r.css({
      top: t.clientY,
      left: t.clientX
    }), r.find(".ase-ctx-item").on("mouseenter", function() {
      $(this).css("background-color", "#333");
    }).on("mouseleave", function() {
      $(this).css("background-color", "transparent");
    }), r.find('[data-action="edit"]').on("click", () => {
      r.remove(), this.renamePlaylist(e);
    }), r.find('[data-action="delete"]').on("click", () => {
      r.remove(), this.deletePlaylist(e);
    }), setTimeout(() => {
      $(document).one("click", () => r.remove());
    }, 50);
  }
  async renamePlaylist(t) {
    var s;
    const e = this.library.playlists.getPlaylist(t);
    if (!e) return;
    const i = await this.promptPlaylistName(e.name);
    !i || i === e.name || (this.library.playlists.updatePlaylist(t, { name: i }), this.persistScroll(), this.render(), (s = ui.notifications) == null || s.info(`Renamed playlist to "${i}"`));
  }
  async deletePlaylist(t) {
    var s;
    const e = this.library.playlists.getPlaylist(t);
    !e || !await Dialog.confirm({
      title: "Delete Playlist",
      content: `Are you sure you want to delete playlist "${e.name}"?`
    }) || (this.library.playlists.deletePlaylist(t), this.filterState.selectedPlaylistId === t && (this.filterState.selectedPlaylistId = null), this.render(), (s = ui.notifications) == null || s.info(`Deleted playlist "${e.name}"`));
  }
  async promptPlaylistName(t = "") {
    return new Promise((e) => {
      new Dialog({
        title: t ? "Rename Playlist" : "New Playlist",
        content: `
          <form>
            <div class="form-group">
              <label>Playlist Name:</label>
              <input type="text" name="playlistName" value="${t}" autofocus style="width: 100%;">
            </div>
          </form>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "OK",
            callback: (i) => {
              const s = i.find('[name="playlistName"]').val();
              e((s == null ? void 0 : s.trim()) || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => e(null)
          }
        },
        default: "ok"
      }).render(!0);
    });
  }
  // ─────────────────────────────────────────────────────────────
  // Drag and Drop
  // ─────────────────────────────────────────────────────────────
  setupDragAndDrop(t) {
    t.find('.ase-track-player-item[draggable="true"]').on("dragstart", (e) => {
      $(e.currentTarget).find("[data-item-id]").data("item-id") || $(e.currentTarget).data("item-id");
      const i = $(e.currentTarget).find("[data-item-id]").first().data("item-id");
      e.originalEvent.dataTransfer.effectAllowed = "copy", e.originalEvent.dataTransfer.setData("text/plain", i), e.originalEvent.dataTransfer.setData("application/x-ase-internal", "true"), $(e.currentTarget).addClass("dragging");
    }), t.find('.ase-track-player-item[draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragover", (e) => {
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "copy", e.originalEvent.dataTransfer.types.includes("application/x-ase-internal") && $(e.currentTarget).addClass("drag-over");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragleave", (e) => {
      $(e.currentTarget).removeClass("drag-over");
    }), t.find(".ase-list-item[data-playlist-id]").on("drop", async (e) => {
      e.preventDefault();
      const i = e.originalEvent.dataTransfer.getData("text/plain"), s = $(e.currentTarget).data("playlist-id");
      $(e.currentTarget).removeClass("drag-over");
      const r = e.originalEvent.dataTransfer.getData("application/x-playlist-id");
      if (r && r !== s) {
        await this.handlePlaylistReorder(r, s);
        return;
      }
      await this.handleDropTrackToPlaylist(i, s);
    }), t.find('.ase-list-item[data-playlist-id][draggable="true"]').on("dragstart", (e) => {
      const i = String($(e.currentTarget).data("playlist-id"));
      e.originalEvent.dataTransfer.effectAllowed = "move", e.originalEvent.dataTransfer.setData("application/x-playlist-id", i), $(e.currentTarget).addClass("dragging");
    }), t.find('.ase-list-item[data-playlist-id][draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging"), t.find(".ase-list-item").removeClass("drag-over drag-above drag-below");
    }), t.find('.ase-favorite-item[draggable="true"]').on("dragstart", (e) => {
      const i = String($(e.currentTarget).data("favorite-id")), s = String($(e.currentTarget).data("favorite-type"));
      e.originalEvent.dataTransfer.effectAllowed = "move", e.originalEvent.dataTransfer.setData("application/x-favorite-id", i), e.originalEvent.dataTransfer.setData("application/x-favorite-type", s), $(e.currentTarget).addClass("dragging");
    }), t.find('.ase-favorite-item[draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging"), t.find(".ase-favorite-item").removeClass("drag-over drag-above drag-below");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragover", (e) => {
      if (!e.originalEvent.dataTransfer.types.includes("application/x-playlist-id")) return;
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "move";
      const s = e.currentTarget.getBoundingClientRect(), r = s.top + s.height / 2, n = e.clientY < r;
      t.find(".ase-list-item[data-playlist-id]").removeClass("drag-above drag-below drag-over"), $(e.currentTarget).addClass(n ? "drag-above" : "drag-below");
    }), t.find(".ase-favorite-item").on("dragover", (e) => {
      if (!e.originalEvent.dataTransfer.types.includes("application/x-favorite-id")) return;
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "move";
      const s = e.currentTarget.getBoundingClientRect(), r = s.top + s.height / 2, n = e.clientY < r;
      t.find(".ase-favorite-item").removeClass("drag-above drag-below drag-over"), $(e.currentTarget).addClass(n ? "drag-above" : "drag-below");
    }), t.find(".ase-favorite-item").on("drop", async (e) => {
      e.preventDefault();
      const i = String($(e.currentTarget).data("favorite-id")), s = String($(e.currentTarget).data("favorite-type"));
      $(e.currentTarget).removeClass("drag-above drag-below dragging");
      const r = e.originalEvent.dataTransfer.getData("application/x-favorite-id"), n = e.originalEvent.dataTransfer.getData("application/x-favorite-type");
      r && n && (r !== i || n !== s) && await this.handleFavoriteReorder(r, n, i, s);
    }), t.find(".ase-content-area").on("dragover", (e) => {
      e.preventDefault(), $(e.currentTarget).addClass("drag-over-import");
    }), t.find(".ase-content-area").on("dragleave", (e) => {
      $(e.currentTarget).removeClass("drag-over-import");
    }), t.find(".ase-content-area").on("drop", async (e) => {
      var s, r, n, l;
      e.preventDefault(), $(e.currentTarget).removeClass("drag-over-import");
      const i = (r = (s = e.originalEvent) == null ? void 0 : s.dataTransfer) == null ? void 0 : r.files;
      if (i && i.length > 0) {
        if (o.debug(`Dropped ${i.length} files from OS`), ((l = (n = e.originalEvent) == null ? void 0 : n.dataTransfer) == null ? void 0 : l.getData("text/plain")) && !i.length)
          return;
        await this.handleFileUpload(i);
      }
    });
  }
  async handlePlaylistReorder(t, e) {
    const i = this.library.playlists.getAllPlaylists(), s = i.findIndex((l) => l.id === t), r = i.findIndex((l) => l.id === e);
    if (s === -1 || r === -1) return;
    const [n] = i.splice(s, 1);
    i.splice(r, 0, n), this.library.playlists.reorderPlaylists(i.map((l) => l.id)), this.render(), o.debug(`Reordered playlist ${t} to position ${r}`);
  }
  async handleFavoriteReorder(t, e, i, s) {
    const r = this.library.getOrderedFavorites(), n = r.findIndex((u) => u.id === t && u.type === e), l = r.findIndex((u) => u.id === i && u.type === s);
    if (n === -1 || l === -1) return;
    const [c] = r.splice(n, 1);
    r.splice(l, 0, c), this.library.reorderFavorites(r), this.render(), o.debug(`Reordered favorite ${t} to position ${l}`);
  }
  async handleFileUpload(t) {
    var l, c, u, m, p;
    if (!((l = game.user) != null && l.isGM)) {
      (c = ui.notifications) == null || c.warn("Only GM can upload files.");
      return;
    }
    const e = Array.from(t).filter((f) => {
      var y;
      const g = (y = f.name.split(".").pop()) == null ? void 0 : y.toLowerCase();
      return ["mp3", "ogg", "wav", "flac", "webm", "m4a", "aac"].includes(g || "");
    });
    if (e.length === 0) {
      (u = ui.notifications) == null || u.warn("No valid audio files found. Supported formats: mp3, ogg, wav, flac, webm, m4a, aac");
      return;
    }
    const i = "data", s = "ase_audio";
    try {
      await FilePicker.createDirectory(i, s, {});
    } catch (f) {
      o.debug("Directory creation skipped (might already exist):", f);
    }
    let r = 0, n = 0;
    for (const f of e)
      try {
        const g = await FilePicker.upload(i, s, f, {});
        if (g.path) {
          const y = this.detectChannelFromFilename(f.name), T = Array.from(this.filterState.selectedTags), v = await this.library.addItem(
            g.path,
            f.name.split(".")[0],
            // Remove extension
            y,
            T
          );
          if (this.filterState.selectedPlaylistId)
            try {
              this.library.playlists.addTrackToPlaylist(
                this.filterState.selectedPlaylistId,
                v.id,
                y
              );
            } catch {
            }
          r++;
        }
      } catch (g) {
        o.error(`Failed to upload ${f.name}:`, g), n++;
      }
    if (r > 0) {
      const f = this.filterState.selectedPlaylistId ? " and added to active playlist" : "";
      (m = ui.notifications) == null || m.info(`Imported ${r} file(s)${f}`), this.render();
    }
    n > 0 && ((p = ui.notifications) == null || p.warn(`Failed to import ${n} file(s)`));
  }
  /**
   * Smart channel detection based on filename keywords
   */
  detectChannelFromFilename(t) {
    const e = t.toLowerCase();
    return ["music", "song", "theme", "bgm", "soundtrack", "score", "melody", "музык"].some((n) => e.includes(n)) ? "music" : ["ambient", "ambience", "atmosphere", "environment", "background", "nature", "wind", "rain", "forest", "cave", "амбиент", "окружен"].some((n) => e.includes(n)) ? "ambience" : ["sfx", "sound", "effect", "fx", "hit", "impact", "explosion", "spell", "attack", "footstep", "door", "sword", "интерфейс", "эффект"].some((n) => e.includes(n)) ? "sfx" : "music";
  }
  async handleDropTrackToPlaylist(t, e) {
    var r, n, l;
    const i = this.library.getItem(t), s = this.library.playlists.getPlaylist(e);
    if (!i || !s) {
      (r = ui.notifications) == null || r.error("Track or playlist not found");
      return;
    }
    try {
      const c = this.inferGroupFromTags(i.tags);
      this.library.playlists.addTrackToPlaylist(e, t, c), this.render(), (n = ui.notifications) == null || n.info(`Added "${i.name}" to "${s.name}"`);
    } catch (c) {
      o.error("Failed to add track to playlist:", c);
      const u = c instanceof Error ? c.message : "Unknown error";
      (l = ui.notifications) == null || l.error(`Failed to add to playlist: ${u}`);
    }
  }
  /**
   * Setup drag-and-drop handler for Foundry native playlists
   * Allows dragging PlaylistSound items into ASE library
   */
  setupFoundryDragDrop(t) {
    const e = t.find(".ase-track-player-list");
    e.length && (e.on("dragover", (i) => {
      i.preventDefault(), i.originalEvent.dataTransfer.dropEffect = "copy", i.originalEvent.dataTransfer.types.includes("application/x-ase-internal") || e.addClass("drag-over");
    }), e.on("dragleave", (i) => {
      i.currentTarget === i.target && e.removeClass("drag-over");
    }), e.on("drop", async (i) => {
      i.preventDefault(), e.removeClass("drag-over"), await this.handleFoundryPlaylistDrop(i.originalEvent);
    }));
  }
  /**
   * Handle drop event from Foundry playlist
   * Routes to appropriate handler based on type (single track vs full playlist)
   */
  async handleFoundryPlaylistDrop(t) {
    var e;
    try {
      const i = TextEditor.getDragEventData(t);
      if (!i) {
        o.debug("No drag data found, ignoring");
        return;
      }
      o.debug("Foundry drop detected:", i.type), i.type === "PlaylistSound" ? await this.handlePlaylistSoundImport(i) : i.type === "Playlist" ? await this.handlePlaylistImport(i) : o.debug(`Unsupported drop type: ${i.type}`);
    } catch (i) {
      o.error("Failed to handle Foundry playlist drop:", i), (e = ui.notifications) == null || e.error("Failed to import track from playlist");
    }
  }
  /**
   * Import single PlaylistSound track
   */
  async handlePlaylistSoundImport(t) {
    var u, m, p, f, g, y, T;
    const e = await fromUuid(t.uuid);
    if (!e) {
      (u = ui.notifications) == null || u.error("Failed to resolve playlist sound");
      return;
    }
    const i = e.path || ((m = e.sound) == null ? void 0 : m.path), s = e.name;
    if (!i) {
      (p = ui.notifications) == null || p.error("Playlist sound has no audio file path");
      return;
    }
    if (this.library.findByUrl(i)) {
      (f = ui.notifications) == null || f.warn(`Track "${s}" already exists in library`);
      return;
    }
    const n = this.mapFoundryChannelToASE(e.channel), l = Array.from(this.filterState.selectedTags), c = await this.library.addItem(i, s, n, l);
    if (this.filterState.selectedPlaylistId)
      try {
        this.library.playlists.addTrackToPlaylist(
          this.filterState.selectedPlaylistId,
          c.id,
          n
        );
        const v = this.library.playlists.getPlaylist(this.filterState.selectedPlaylistId);
        (g = ui.notifications) == null || g.info(`Added "${s}" to library and playlist "${v == null ? void 0 : v.name}"`);
      } catch {
        (y = ui.notifications) == null || y.info(`Added "${s}" to library`);
      }
    else
      (T = ui.notifications) == null || T.info(`Added "${s}" to library`);
    this.render();
  }
  /**
   * Import entire Playlist with all tracks
   */
  async handlePlaylistImport(t) {
    var e, i, s, r, n;
    try {
      const l = await fromUuid(t.uuid);
      if (!l) {
        (e = ui.notifications) == null || e.error("Failed to resolve Foundry playlist");
        return;
      }
      o.info(`Importing Foundry playlist: ${l.name} (${l.sounds.size} tracks)`);
      const c = this.generateUniquePlaylistName(l.name), u = this.library.playlists.createPlaylist(c);
      let m = 0, p = 0;
      for (const g of l.sounds) {
        const y = g.path || ((i = g.sound) == null ? void 0 : i.path);
        if (!y) {
          o.warn(`Skipping sound "${g.name}" - no path`);
          continue;
        }
        const T = g.channel || l.channel;
        let v = "music";
        T === "environment" ? v = "ambience" : T === "interface" ? v = "sfx" : (T === "music" || !T) && (v = "music");
        let I = (s = this.library.findByUrl(y)) == null ? void 0 : s.id;
        if (I)
          p++;
        else
          try {
            const b = Array.from(this.filterState.selectedTags);
            I = (await this.library.addItem(y, g.name, v, b)).id, m++;
          } catch (b) {
            o.error(`Failed to add track "${g.name}":`, b);
            continue;
          }
        this.library.playlists.addTrackToPlaylist(u.id, I, v);
      }
      const f = `Imported playlist "${c}": ${m} new tracks${p > 0 ? `, ${p} already in library` : ""}`;
      (r = ui.notifications) == null || r.info(f), this.render();
    } catch (l) {
      o.error("Failed to import Foundry playlist:", l), (n = ui.notifications) == null || n.error("Failed to import playlist");
    }
  }
  resolveFoundryChannel(t, e) {
    var s;
    const i = t.channel || ((s = t.fadeIn) == null ? void 0 : s.type) || e.channel || e.mode;
    return this.mapFoundryChannelToASE(i);
  }
  mapFoundryChannelToASE(t) {
    if (!t && t !== 0) return "music";
    const e = String(t).toLowerCase();
    return {
      0: "music",
      1: "ambience",
      2: "sfx",
      music: "music",
      environment: "ambience",
      interface: "sfx"
    }[e] || "music";
  }
  generateUniquePlaylistName(t) {
    const e = this.library.playlists.getAllPlaylists(), i = new Set(e.map((r) => r.name));
    if (!i.has(t)) return t;
    let s = 2;
    for (; i.has(`${t} (${s})`); )
      s++;
    return `${t} (${s})`;
  }
  async removeTrackFromPlaylist(t, e) {
    var i, s;
    try {
      this.library.playlists.removeLibraryItemFromPlaylist(t, e), this.render(), (i = ui.notifications) == null || i.info("Removed track from playlist");
    } catch (r) {
      o.error("Failed to remove track from playlist:", r), (s = ui.notifications) == null || s.error("Failed to remove track from playlist");
    }
  }
  /**
   * Highlight playlists in sidebar that contain the specified track
   */
  highlightPlaylistsContainingTrack(t) {
    this.library.playlists.getAllPlaylists().filter(
      (s) => s.items.some((r) => r.libraryItemId === t)
    ).forEach((s) => {
      $(`[data-playlist-id="${s.id}"]`).addClass("highlight-contains-track");
    });
  }
  /**
   * Clear all playlist highlights
   */
  clearPlaylistHighlights() {
    $(".highlight-contains-track").removeClass("highlight-contains-track");
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
            const l = this.library.toggleFavorite(s);
            this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(l ? "Added to favorites" : "Removed from favorites");
          } catch (l) {
            o.error("Failed to toggle favorite:", l), (n = ui.notifications) == null || n.error("Failed to update favorite status");
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
        this.library.updateItem(t, { name: i }), this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(`Renamed to: ${i}`);
      } catch (l) {
        o.error("Failed to rename track:", l), (n = ui.notifications) == null || n.error("Failed to rename track");
      }
  }
  async onEditTrackTags(t) {
    var r, n, l;
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
    const s = i.split(",").map((c) => c.trim()).filter((c) => c.length > 0);
    try {
      this.library.updateItem(t, { tags: s }), this.persistScroll(), this.render(), (n = ui.notifications) == null || n.info("Tags updated");
    } catch (c) {
      o.error("Failed to update tags:", c), (l = ui.notifications) == null || l.error("Failed to update tags");
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
        this.library.removeItem(t), this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(`Deleted: ${e.name}`);
      } catch (l) {
        o.error("Failed to delete track:", l), (n = ui.notifications) == null || n.error("Failed to delete track");
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
      } catch (l) {
        o.error("Failed to rename playlist:", l);
        const c = l instanceof Error ? l.message : "Unknown error";
        (n = ui.notifications) == null || n.error(`Failed to rename playlist: ${c}`);
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
      } catch (l) {
        o.error("Failed to update description:", l), (n = ui.notifications) == null || n.error("Failed to update description");
      }
  }
  async onViewPlaylistContents(t) {
    var r;
    const e = this.library.playlists.getPlaylist(t);
    if (!e) {
      (r = ui.notifications) == null || r.error("Playlist not found");
      return;
    }
    const i = e.items.sort((n, l) => n.order - l.order).map((n, l) => {
      const c = this.library.getItem(n.libraryItemId), u = (c == null ? void 0 : c.name) || "Unknown";
      return `<li><strong>${l + 1}.</strong> ${u}</li>`;
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
    var s, r, n, l;
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
        [...e.items.map((u) => u.id)].forEach((u) => {
          try {
            this.library.playlists.removeTrackFromPlaylist(t, u);
          } catch (m) {
            o.error("Failed to remove item:", m);
          }
        }), this.render(), (n = ui.notifications) == null || n.info(`Cleared playlist: ${e.name}`);
      } catch (c) {
        o.error("Failed to clear playlist:", c), (l = ui.notifications) == null || l.error("Failed to clear playlist");
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
      } catch (l) {
        o.error("Failed to delete playlist:", l), (n = ui.notifications) == null || n.error("Failed to delete playlist");
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
          const l = n.tags.map((c) => c === t ? e : c);
          this.library.updateItem(n.id, { tags: l });
        }), this.filterState.selectedTags.has(t) && (this.filterState.selectedTags.delete(t), this.filterState.selectedTags.add(e)), this.render(), (i = ui.notifications) == null || i.info(`Renamed tag "${t}" to "${e}" in ${r.length} track(s)`);
      } catch (r) {
        o.error("Failed to rename tag:", r), (s = ui.notifications) == null || s.error("Failed to rename tag");
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
          const l = n.tags.filter((c) => c !== t);
          this.library.updateItem(n.id, { tags: l });
        }), this.filterState.selectedTags.delete(t), this.render(), (s = ui.notifications) == null || s.info(`Deleted tag "${t}" from ${e.length} track(s)`);
      } catch (n) {
        o.error("Failed to delete tag:", n), (r = ui.notifications) == null || r.error("Failed to delete tag");
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
    var r, n, l;
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
        const c = this.inferGroupFromTags(e.tags);
        this.library.playlists.addTrackToPlaylist(s, t, c), this.render(), (n = ui.notifications) == null || n.info(`Added "${e.name}" to playlist`);
      } catch (c) {
        o.error("Failed to add track to playlist:", c);
        const u = c instanceof Error ? c.message : "Unknown error";
        (l = ui.notifications) == null || l.error(`Failed to add to playlist: ${u}`);
      }
  }
}
class st {
  constructor(a, t, e, i) {
    h(this, "engine");
    h(this, "socket");
    h(this, "libraryManager");
    h(this, "queueManager");
    h(this, "collapsedPlaylists", /* @__PURE__ */ new Set());
    h(this, "updateInterval", null);
    h(this, "html", null);
    h(this, "renderParent", null);
    this.engine = a, this.socket = t, this.libraryManager = e, this.queueManager = i, this.queueManager.on("change", () => this.onQueueChange());
  }
  // Set callback for requesting parent render
  setRenderCallback(a) {
    this.renderParent = a;
  }
  // ─────────────────────────────────────────────────────────────
  // Data Provider
  // ─────────────────────────────────────────────────────────────
  getData() {
    const a = this.libraryManager.getOrderedFavorites(), t = [];
    for (const s of a)
      if (s.type === "track") {
        const r = this.libraryManager.getItem(s.id);
        if (r) {
          const n = this.engine.getTrack(r.id);
          t.push({
            id: r.id,
            name: r.name,
            type: "track",
            group: r.group,
            isPlaying: (n == null ? void 0 : n.state) === "playing",
            isPaused: (n == null ? void 0 : n.state) === "paused"
          });
        }
      } else if (s.type === "playlist") {
        const r = this.libraryManager.playlists.getPlaylist(s.id);
        r && t.push({
          id: r.id,
          name: r.name,
          type: "playlist",
          group: void 0,
          isPlaying: !1,
          // Playlists don't have individual play state
          isPaused: !1
        });
      }
    const e = this.queueManager.getItems(), i = this.groupQueueByPlaylist(e);
    return {
      favorites: t,
      queuePlaylists: i
    };
  }
  groupQueueByPlaylist(a) {
    const t = /* @__PURE__ */ new Map();
    for (const i of a) {
      const s = i.playlistId ?? null;
      t.has(s) || t.set(s, []), t.get(s).push(i);
    }
    const e = [];
    for (const [i, s] of t) {
      let r = "Ungrouped";
      if (i) {
        const l = this.libraryManager.playlists.getPlaylist(i);
        r = (l == null ? void 0 : l.name) ?? "Unknown Playlist";
      }
      const n = s.map((l) => this.getQueueTrackViewData(l));
      e.push({
        id: i,
        name: r,
        collapsed: i ? this.collapsedPlaylists.has(i) : !1,
        tracks: n
      });
    }
    return e;
  }
  getQueueTrackViewData(a) {
    const t = this.libraryManager.getItem(a.libraryItemId), e = this.engine.getTrack(a.libraryItemId), i = (e == null ? void 0 : e.getCurrentTime()) ?? 0, s = (t == null ? void 0 : t.duration) ?? (e == null ? void 0 : e.getDuration()) ?? 0, r = s > 0 ? i / s * 100 : 0;
    return {
      queueId: a.id,
      libraryItemId: a.libraryItemId,
      name: (t == null ? void 0 : t.name) ?? "Unknown Track",
      group: a.group,
      tags: (t == null ? void 0 : t.tags) ?? [],
      isPlaying: (e == null ? void 0 : e.state) === "playing",
      isPaused: (e == null ? void 0 : e.state) === "paused",
      isStopped: !e || e.state === "stopped",
      isLoading: (e == null ? void 0 : e.state) === "loading",
      volume: a.volume,
      volumePercent: Math.round(a.volume * 100),
      loop: a.loop,
      currentTime: i,
      currentTimeFormatted: M(i),
      duration: s,
      durationFormatted: M(s),
      progress: r
    };
  }
  // ─────────────────────────────────────────────────────────────
  // Event Listeners
  // ─────────────────────────────────────────────────────────────
  activateListeners(a) {
    this.html = a, this.startUpdates(), a.find('[data-action="play-favorite"]').on("click", (t) => this.onPlayFavorite(t)), a.find('[data-action="pause-favorite"]').on("click", (t) => this.onPauseFavorite(t)), a.find('[data-action="stop-favorite"]').on("click", (t) => this.onStopFavorite(t)), a.find('[data-action="play-queue"]').on("click", (t) => this.onPlayQueueItem(t)), a.find('[data-action="pause-queue"]').on("click", (t) => this.onPauseQueueItem(t)), a.find('[data-action="stop-queue"]').on("click", (t) => this.onStopQueueItem(t)), a.find('[data-action="remove-queue"]').on("click", (t) => this.onRemoveQueueItem(t)), a.find('[data-action="loop-queue"]').on("click", (t) => this.onLoopQueueItem(t)), a.find('[data-action="toggle-playlist"]').on("click", (t) => this.onTogglePlaylist(t)), a.find('[data-action="seek"]').on("input", (t) => this.onSeek(t)), a.find('[data-action="volume"]').on("input", (t) => this.onVolumeChange(t));
  }
  // ─────────────────────────────────────────────────────────────
  // Favorites Handlers
  // ─────────────────────────────────────────────────────────────
  async onPlayFavorite(a) {
    a.preventDefault(), a.stopPropagation();
    const t = $(a.currentTarget), e = t.data("favorite-id");
    t.data("favorite-type") === "track" ? await this.playTrack(e) : await this.playPlaylist(e), this.requestRender();
  }
  onPauseFavorite(a) {
    a.preventDefault(), a.stopPropagation();
    const t = $(a.currentTarget), e = t.data("favorite-id");
    t.data("favorite-type") === "track" && this.pauseTrack(e), this.requestRender();
  }
  onStopFavorite(a) {
    a.preventDefault(), a.stopPropagation();
    const t = $(a.currentTarget), e = t.data("favorite-id");
    t.data("favorite-type") === "track" ? this.stopTrack(e) : this.stopPlaylist(e), this.requestRender();
  }
  // ─────────────────────────────────────────────────────────────
  // Queue Item Handlers
  // ─────────────────────────────────────────────────────────────
  async onPlayQueueItem(a) {
    a.preventDefault(), a.stopPropagation();
    const e = $(a.currentTarget).closest(".ase-queue-track").data("item-id");
    await this.playTrack(e), this.requestRender();
  }
  onPauseQueueItem(a) {
    a.preventDefault(), a.stopPropagation();
    const e = $(a.currentTarget).closest(".ase-queue-track").data("item-id");
    this.pauseTrack(e), this.requestRender();
  }
  onStopQueueItem(a) {
    a.preventDefault(), a.stopPropagation();
    const e = $(a.currentTarget).closest(".ase-queue-track").data("item-id");
    this.stopTrack(e), this.requestRender();
  }
  onRemoveQueueItem(a) {
    a.preventDefault(), a.stopPropagation();
    const t = $(a.currentTarget).closest(".ase-queue-track"), e = t.data("queue-id"), i = t.data("item-id");
    this.stopTrack(i), this.queueManager.removeItem(e), this.requestRender();
  }
  onLoopQueueItem(a) {
    a.preventDefault(), a.stopPropagation();
    const e = $(a.currentTarget).closest(".ase-queue-track").data("item-id"), i = $(a.currentTarget), r = !i.hasClass("active");
    this.engine.setTrackLoop(e, r), r ? i.addClass("active").css("color", "var(--accent-cyan)") : i.removeClass("active").css("color", "");
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Toggle
  // ─────────────────────────────────────────────────────────────
  onTogglePlaylist(a) {
    const t = $(a.currentTarget).closest(".ase-queue-playlist"), e = t.data("playlist-id");
    e && (this.collapsedPlaylists.has(e) ? (this.collapsedPlaylists.delete(e), t.removeClass("is-collapsed"), t.find(".ase-queue-track").show()) : (this.collapsedPlaylists.add(e), t.addClass("is-collapsed"), t.find(".ase-queue-track").each((i, s) => {
      const r = $(s);
      !r.hasClass("is-playing") && !r.hasClass("is-paused") && r.hide();
    })));
  }
  // ─────────────────────────────────────────────────────────────
  // Track Controls
  // ─────────────────────────────────────────────────────────────
  onSeek(a) {
    const e = $(a.currentTarget).closest(".ase-queue-track").data("item-id"), i = parseFloat($(a.currentTarget).val()), s = this.engine.getTrack(e);
    if (s) {
      const r = i / 100 * s.getDuration();
      this.engine.seekTrack(e, r), this.socket.syncEnabled && this.socket.broadcastTrackSeek(e, r, s.state === "playing");
    }
  }
  onVolumeChange(a) {
    const t = $(a.currentTarget).closest(".ase-queue-track"), e = t.data("item-id"), i = parseInt($(a.currentTarget).val(), 10), s = i / 100;
    this.engine.setTrackVolume(e, s), this.socket.syncEnabled && this.socket.broadcastTrackVolume(e, s), t.find(".ase-volume-value").text(`${i}%`);
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Core Methods
  // ─────────────────────────────────────────────────────────────
  async playTrack(a) {
    const t = this.libraryManager.getItem(a);
    if (!t) {
      o.warn("Track not found in library:", a);
      return;
    }
    let e = this.engine.getTrack(a);
    if (e && e.state === "paused") {
      const i = e.getCurrentTime();
      await this.engine.playTrack(a, i), this.socket.syncEnabled && this.socket.broadcastTrackPlay(a, i);
      return;
    }
    e || (e = await this.engine.createTrack({
      id: a,
      url: t.url,
      group: t.group,
      volume: 1,
      loop: !1
    })), await this.engine.playTrack(a), this.socket.syncEnabled && this.socket.broadcastTrackPlay(a, 0);
  }
  pauseTrack(a) {
    const t = this.engine.getTrack(a);
    this.engine.pauseTrack(a), this.socket.syncEnabled && t && this.socket.broadcastTrackPause(a, t.getCurrentTime());
  }
  stopTrack(a) {
    this.engine.stopTrack(a), this.socket.syncEnabled && this.socket.broadcastTrackStop(a);
  }
  async playPlaylist(a) {
    const t = this.libraryManager.playlists.getPlaylistTracks(a);
    if (!t.length) return;
    const e = t[0];
    await this.playTrack(e.libraryItemId);
  }
  stopPlaylist(a) {
    const t = this.libraryManager.playlists.getPlaylistTracks(a);
    for (const e of t)
      this.stopTrack(e.libraryItemId);
  }
  // ─────────────────────────────────────────────────────────────
  // Real-time Updates
  // ─────────────────────────────────────────────────────────────
  startUpdates() {
    this.updateInterval || (this.updateInterval = setInterval(() => this.updateTrackDisplays(), 100));
  }
  stopUpdates() {
    this.updateInterval && (clearInterval(this.updateInterval), this.updateInterval = null);
  }
  updateTrackDisplays() {
    this.html && this.html.find(".ase-queue-track").each((a, t) => {
      const e = $(t), i = e.data("item-id"), s = this.engine.getTrack(i);
      if (s) {
        const r = s.getCurrentTime(), n = s.getDuration(), l = n > 0 ? r / n * 100 : 0;
        e.find(".ase-time-current").text(M(r)), e.find(".ase-seek-slider").val(l), e.removeClass("is-playing is-paused"), s.state === "playing" ? e.addClass("is-playing") : s.state === "paused" && e.addClass("is-paused");
      }
    });
  }
  onQueueChange() {
    o.debug("Queue changed, mixer should refresh"), this.requestRender();
  }
  requestRender() {
    this.renderParent && this.renderParent();
  }
}
const Q = "advanced-sound-engine";
class rt extends Application {
  constructor(t, e, i, s, r = {}) {
    super(r);
    h(this, "engine");
    h(this, "socket");
    h(this, "libraryManager");
    h(this, "queueManager");
    // Sub-apps (Controllers)
    h(this, "libraryApp");
    h(this, "mixerApp");
    h(this, "state", {
      activeTab: "library",
      // Default to library as per user focus
      syncEnabled: !1
    });
    h(this, "persistScrollOnce", !1);
    h(this, "_scrollLibrary", { tracks: 0, playlists: 0, favorites: 0 });
    this.engine = t, this.socket = e, this.libraryManager = i, this.queueManager = s, this.libraryApp = new it(this.libraryManager, this), this.mixerApp = new st(this.engine, this.socket, this.libraryManager, this.queueManager), this.mixerApp.setRenderCallback(() => {
      this.state.activeTab === "mixer" && this.render(!1);
    }), this.queueManager.on("change", () => {
      this.state.activeTab === "mixer" && this.render(!1);
    });
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "advanced-sound-engine-app",
      title: "Advanced Sound Engine",
      template: `modules/${Q}/templates/main-app.hbs`,
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
      const l = n.some((u) => u.state === "playing"), c = n.some((u) => u.state === "paused");
      return { playing: l, paused: c && !l };
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
      s = await renderTemplate(`modules/${Q}/templates/mixer.hbs`, r);
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
  async _render(t, e) {
    if (this.state.activeTab === "library" && this.persistScrollOnce && this.element && this.element.length) {
      const i = this.element.find(".ase-track-player-list").scrollTop() || 0;
      i > 0 && (this._scrollLibrary.tracks = i), this._scrollLibrary.playlists = this.element.find(".ase-list-group").first().scrollTop() || 0, this._scrollLibrary.favorites = this.element.find(".ase-favorites-section .ase-list-group").scrollTop() || 0;
    }
    if (await super._render(t, e), this.state.activeTab === "library") {
      const i = this.element;
      i && i.length && (this.persistScrollOnce ? (i.find(".ase-track-player-list").scrollTop(this._scrollLibrary.tracks), i.find(".ase-list-group").first().scrollTop(this._scrollLibrary.playlists), i.find(".ase-favorites-section .ase-list-group").scrollTop(this._scrollLibrary.favorites), this.persistScrollOnce = !1) : (i.find(".ase-track-player-list").scrollTop(0), i.find(".ase-list-group").first().scrollTop(0), i.find(".ase-favorites-section .ase-list-group").scrollTop(0)));
    }
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
  async onGlobalPlay() {
    this.engine.resume();
    const t = this.engine.getAllTracks();
    for (const e of t)
      if (e.state === "paused") {
        const i = e.getCurrentTime();
        await e.play(i);
      }
    o.debug("Global Play/Resume Clicked"), this.render();
  }
  onGlobalPause() {
    const t = this.engine.getAllTracks();
    for (const e of t)
      e.state === "playing" && e.pause();
    o.debug("Global Pause Clicked"), this.render();
  }
  onGlobalStop() {
    this.engine.stopAll(), this.socket.syncEnabled && this.socket.broadcastStopAll(), this.render();
  }
  onVolumeInput(t) {
    const e = t.currentTarget, i = parseFloat(e.value) / 100, s = $(e).data("channel");
    s ? (this.engine.setChannelVolume(s, i), this.socket.broadcastChannelVolume(s, i)) : (this.engine.setMasterVolume(i), this.socket.broadcastChannelVolume("master", i)), $(e).siblings(".ase-percentage").text(`${Math.round(i * 100)}%`), $(e).siblings(".ase-master-perc").text(`${Math.round(i * 100)}%`);
  }
}
function nt(d, a) {
  let t = null;
  return function(...e) {
    t && clearTimeout(t), t = setTimeout(() => {
      d.apply(this, e);
    }, a);
  };
}
class ot {
  constructor(a) {
    h(this, "playlists", /* @__PURE__ */ new Map());
    h(this, "onChangeCallback");
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
      id: L(),
      name: a,
      description: t,
      items: [],
      createdAt: i,
      updatedAt: i,
      favorite: !1
    };
    return this.playlists.set(s.id, s), this.notifyChange(), o.info(`Playlist created: ${s.name} (${s.id})`), s;
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
    return this.playlists.set(a, i), this.notifyChange(), o.info(`Playlist updated: ${i.name}`), i;
  }
  /**
   * Delete playlist
   */
  deletePlaylist(a) {
    const t = this.playlists.get(a);
    if (!t)
      throw new Error(`Playlist not found: ${a}`);
    this.playlists.delete(a), this.notifyChange(), o.info(`Playlist deleted: ${t.name}`);
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
   * Reorder playlists based on new order array of IDs
   */
  reorderPlaylists(a) {
    const t = /* @__PURE__ */ new Map();
    a.forEach((e) => {
      const i = this.playlists.get(e);
      i && t.set(e, i);
    }), this.playlists.forEach((e, i) => {
      t.has(i) || t.set(i, e);
    }), this.playlists = t, this.notifyChange(), o.info("Playlists reordered");
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
    if (s.items.find((l) => l.libraryItemId === t))
      throw new Error("Track already exists in this playlist");
    const n = {
      id: L(),
      libraryItemId: t,
      group: e,
      volume: (i == null ? void 0 : i.volume) ?? 1,
      loop: (i == null ? void 0 : i.loop) ?? !1,
      order: s.items.length,
      fadeIn: i == null ? void 0 : i.fadeIn,
      fadeOut: i == null ? void 0 : i.fadeOut
    };
    return s.items.push(n), s.updatedAt = Date.now(), this.notifyChange(), o.debug(`Track added to playlist ${s.name}: ${t}`), n;
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
    e.items.splice(i, 1), this.reorderPlaylistItems(e), e.updatedAt = Date.now(), this.notifyChange(), o.debug(`Track removed from playlist ${e.name}`);
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
    return s > 0 && (this.reorderPlaylistItems(e), e.updatedAt = Date.now(), this.notifyChange(), o.debug(`Removed ${s} instances of library item ${t} from playlist ${e.name}`)), s;
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
    }), t > 0 && (this.notifyChange(), o.info(`Removed library item ${a} from ${t} playlist(s)`)), t;
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
    return Object.assign(s, e), i.updatedAt = Date.now(), this.notifyChange(), o.debug(`Playlist item updated in ${i.name}`), s;
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
    i.items.splice(e, 0, r), this.reorderPlaylistItems(i), i.updatedAt = Date.now(), this.notifyChange(), o.debug(`Track reordered in playlist ${i.name}`);
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
    this.playlists.clear(), o.warn("All playlists cleared");
  }
}
const lt = "advanced-sound-engine";
class C {
  /**
   * Load library state from global JSON file
   */
  static async load() {
    try {
      const a = await fetch(`${this.FILE_PATH}?t=${Date.now()}`);
      if (!a.ok)
        return o.info("No existing library file found"), null;
      const t = await a.json();
      return o.info("Loaded library from global storage"), t;
    } catch (a) {
      return o.warn("Failed to load global library:", a), null;
    }
  }
  /**
   * Save library state to global JSON file
   */
  static async save(a) {
    var t;
    try {
      await this.ensureDirectory();
      const e = JSON.stringify(a, null, 2), i = new Blob([e], { type: "application/json" }), s = new File([i], "library.json", { type: "application/json" }), r = (t = ui.notifications) == null ? void 0 : t.info;
      ui.notifications && (ui.notifications.info = () => {
      });
      try {
        await FilePicker.upload(
          this.FILE_SOURCE,
          this.DIRECTORY,
          s,
          {}
        );
      } finally {
        ui.notifications && r && (ui.notifications.info = r);
      }
      o.info("Saved library to global storage");
    } catch (e) {
      throw o.error("Failed to save library to global storage:", e), e;
    }
  }
  /**
   * Ensure the module directory exists
   */
  static async ensureDirectory() {
    try {
      await FilePicker.createDirectory(this.FILE_SOURCE, this.DIRECTORY, {});
    } catch {
      o.debug("Directory creation skipped (may already exist)");
    }
  }
  /**
   * Migrate data from world-scoped game.settings to global storage
   */
  static async migrateFromWorldSettings() {
    var a, t;
    try {
      const e = await this.load(), i = e != null && e.items ? Array.isArray(e.items) ? e.items.length : Object.keys(e.items).length : 0;
      if (e && e.items && i > 0)
        return o.info("Global storage already populated, skipping migration"), !1;
      const s = await ((a = game.settings) == null ? void 0 : a.get(lt, "libraryState"));
      if (!s || s === "")
        return o.info("No world-scoped data to migrate"), !1;
      const r = JSON.parse(s);
      if (!r.items || (Array.isArray(r.items) ? r.items.length === 0 : Object.keys(r.items).length === 0))
        return o.info("World-scoped data is empty, skipping migration"), !1;
      await this.save(r);
      const n = Array.isArray(r.items) ? r.items.length : Object.keys(r.items).length;
      return o.info(`Migrated ${n} items from world settings to global storage`), (t = ui.notifications) == null || t.info(`ASE: Library migrated to global storage (${n} tracks)`), !0;
    } catch (e) {
      return o.error("Migration from world settings failed:", e), !1;
    }
  }
  /**
   * Delete a physical file from disk
   * Shows manual deletion instructions since automatic deletion is unreliable
   */
  static async deletePhysicalFile(a) {
    var i, s;
    if (!this.isOurFile(a))
      return o.warn("Cannot delete file not in ase_audio folder:", a), !1;
    if (!((i = game.user) != null && i.isGM))
      return (s = ui.notifications) == null || s.warn("Only GM can delete files"), !1;
    let t = a.replace(/\\/g, "/");
    t = t.replace(/^\/*/, ""), t = t.replace(/^Data\//i, "");
    const e = `
            <div style="padding: 10px;">
                <p>Automatic file deletion is not available in this Foundry configuration.</p>
                <p style="margin-top: 10px;"><strong>To manually delete this file:</strong></p>
                <ol style="margin-left: 20px; margin-top: 10px;">
                    <li>Navigate to your Foundry <code>Data</code> folder</li>
                    <li>Find and delete: <code style="background: #1e293b; padding: 2px 6px; border-radius: 3px; color: #22d3ee;">${t}</code></li>
                </ol>
                <p style="margin-top: 10px; color: #94a3b8; font-size: 12px;">The track will be removed from the library now, but the file will remain on disk until manually deleted.</p>
            </div>
        `;
    return await Dialog.prompt({
      title: "Manual File Deletion Required",
      content: e,
      callback: () => {
      },
      options: { width: 500 }
    }), !0;
  }
  /**
   * Check if file URL belongs to our module storage
   * Handles various URL formats from different Foundry versions and platforms
   */
  static isOurFile(a) {
    const t = a.replace(/\\/g, "/").toLowerCase();
    return t.includes("ase_audio/") || t.includes("/ase_audio/") || t.endsWith("ase_audio");
  }
}
h(C, "FILE_PATH", "ase_library/library.json"), h(C, "FILE_SOURCE", "data"), h(C, "DIRECTORY", "ase_library");
const G = 1;
class ct {
  constructor() {
    h(this, "items", /* @__PURE__ */ new Map());
    h(this, "customTags", /* @__PURE__ */ new Set());
    h(this, "favoritesOrder", []);
    h(this, "saveScheduled", !1);
    h(this, "playlists");
    // New property to track if we've initiated a scan this session
    h(this, "hasScannedDurations", !1);
    h(this, "debouncedSave", nt(() => {
      this.saveToSettings();
    }, 500));
    this.playlists = new ot(() => this.scheduleSave()), this.loadFromSettings().catch((a) => o.error("Failed initial load:", a));
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add new item to library
   */
  async addItem(a, t, e = "music", i = []) {
    const s = V(a);
    if (!s.valid)
      throw new Error(s.error || "Invalid audio file");
    const r = t || this.extractNameFromUrl(a), n = this.findByUrl(a);
    if (n)
      throw new Error(`Track with this URL already exists: ${n.name}`);
    if (this.findByName(r))
      throw new Error(`Track with name "${r}" already exists in library`);
    const c = Date.now(), u = {
      id: L(),
      url: a,
      name: r,
      tags: i,
      group: e,
      duration: 0,
      favorite: !1,
      addedAt: c,
      updatedAt: c
    }, m = new Audio(a);
    return m.addEventListener("loadedmetadata", () => {
      m.duration && isFinite(m.duration) && (u.duration = Math.round(m.duration), this.scheduleSave(), o.info(`Updated duration for ${u.name}: ${u.duration}s`));
    }), m.addEventListener("error", (p) => {
      o.warn(`Failed to extract duration for ${u.name}:`, p);
    }), this.items.set(u.id, u), this.scheduleSave(), o.info(`Library item added: ${u.name} (${u.id})`), u;
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
      const s = V(t.url);
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
    return this.items.set(a, i), this.scheduleSave(), o.info(`Library item updated: ${i.name}`), i;
  }
  /**
   * Remove item from library
   */
  removeItem(a) {
    const t = this.items.get(a);
    if (!t)
      throw new Error(`Library item not found: ${a}`);
    this.playlists.removeLibraryItemFromAllPlaylists(a), this.items.delete(a), this.scheduleSave(), o.info(`Library item removed: ${t.name}`);
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
   * Get favorite items (sorted by favoritesOrder)
   */
  getFavorites() {
    return this.getAllItems().filter((a) => a.favorite);
  }
  /**
   * Get ordered favorites list (tracks + playlists)
   */
  getOrderedFavorites() {
    const a = [];
    for (const e of this.favoritesOrder)
      if (e.type === "track") {
        const i = this.items.get(e.id);
        i && i.favorite && a.push(e);
      } else {
        const i = this.playlists.getPlaylist(e.id);
        i && i.favorite && a.push(e);
      }
    const t = new Set(a.map((e) => `${e.type}:${e.id}`));
    for (const e of this.getAllItems())
      e.favorite && !t.has(`track:${e.id}`) && a.unshift({ id: e.id, type: "track", addedAt: Date.now() });
    for (const e of this.playlists.getFavoritePlaylists())
      t.has(`playlist:${e.id}`) || a.unshift({ id: e.id, type: "playlist", addedAt: Date.now() });
    return this.favoritesOrder = a, a;
  }
  /**
   * Reorder favorites based on new order array
   */
  reorderFavorites(a) {
    const t = Date.now();
    this.favoritesOrder = a.map((e) => {
      var i;
      return {
        id: e.id,
        type: e.type,
        addedAt: ((i = this.favoritesOrder.find((s) => s.id === e.id && s.type === e.type)) == null ? void 0 : i.addedAt) ?? t
      };
    }), this.scheduleSave(), o.info("Favorites reordered");
  }
  /**
   * Add item to favorites order (at the beginning = newest)
   */
  addToFavoritesOrder(a, t) {
    this.favoritesOrder = this.favoritesOrder.filter((e) => !(e.id === a && e.type === t)), this.favoritesOrder.unshift({ id: a, type: t, addedAt: Date.now() }), this.scheduleSave();
  }
  /**
   * Remove item from favorites order
   */
  removeFromFavoritesOrder(a, t) {
    this.favoritesOrder = this.favoritesOrder.filter((e) => !(e.id === a && e.type === t)), this.scheduleSave();
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
    const t = a.trim().replace(/^#/, "");
    t && !this.customTags.has(t) && (this.customTags.add(t), this.scheduleSave());
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
    }), e > 0 ? (this.customTags.has(a) && (this.customTags.delete(a), this.customTags.add(t)), this.scheduleSave(), o.info(`Tag renamed: "${a}" → "${t}" (${e} items)`)) : this.customTags.has(a) && (this.customTags.delete(a), this.customTags.add(t), this.scheduleSave(), o.info(`Custom tag renamed: "${a}" → "${t}"`)), e;
  }
  /**
   * Delete tag globally
   */
  deleteTag(a) {
    let t = 0;
    return this.items.forEach((e) => {
      const i = e.tags.indexOf(a);
      i !== -1 && (e.tags.splice(i, 1), e.updatedAt = Date.now(), t++);
    }), t > 0 ? (this.customTags.has(a) && this.customTags.delete(a), this.scheduleSave(), o.info(`Tag deleted: "${a}" (${t} items)`)) : this.customTags.has(a) && (this.customTags.delete(a), this.scheduleSave(), o.info(`Custom tag deleted: "${a}"`)), t;
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
    return t.favorite = !t.favorite, t.updatedAt = Date.now(), t.favorite ? this.addToFavoritesOrder(a, "track") : this.removeFromFavoritesOrder(a, "track"), this.scheduleSave(), t.favorite;
  }
  /**
   * Scan library for items with missing duration (0) and try to extract it.
   * Run this once per session or on demand.
   */
  async scanMissingDurations() {
    if (this.hasScannedDurations) return;
    this.hasScannedDurations = !0;
    const a = Array.from(this.items.values()).filter((i) => !i.duration || i.duration === 0);
    if (a.length === 0) return;
    o.info(`Scanning ${a.length} items for missing duration...`);
    let t = 0;
    const e = 5;
    for (let i = 0; i < a.length; i += e) {
      const s = a.slice(i, i + e);
      await Promise.all(s.map((r) => new Promise((n) => {
        const l = new Audio(r.url), c = () => {
          l.onloadedmetadata = null, l.onerror = null, n();
        };
        l.onloadedmetadata = () => {
          l.duration && isFinite(l.duration) && (r.duration = Math.round(l.duration), t++), c();
        }, l.onerror = () => {
          c();
        }, setTimeout(c, 5e3);
      })));
    }
    t > 0 && (o.info(`Updated duration for ${t} items.`), this.scheduleSave());
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  async loadFromSettings() {
    try {
      await C.migrateFromWorldSettings();
      const a = await C.load();
      if (!a) {
        o.info("No saved library state, starting fresh");
        return;
      }
      a.version !== G && o.warn(`Library version mismatch: ${a.version} → ${G}`), this.items.clear(), Object.values(a.items).forEach((t) => {
        this.items.set(t.id, t);
      }), this.customTags = new Set(a.customTags || []), this.playlists.load(a.playlists || {}), this.favoritesOrder = a.favoritesOrder || [], o.info(`Library loaded: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists, ${this.customTags.size} custom tags`);
    } catch (a) {
      o.error("Failed to load library state:", a);
    }
  }
  async saveToSettings() {
    try {
      const a = {
        items: Object.fromEntries(this.items),
        playlists: this.playlists.export(),
        customTags: Array.from(this.customTags),
        favoritesOrder: this.favoritesOrder,
        version: G,
        lastModified: Date.now()
      };
      await C.save(a), this.saveScheduled = !1, o.debug(`Library saved: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (a) {
      o.error("Failed to save library state:", a);
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
    this.items.clear(), this.playlists.clear(), this.scheduleSave(), o.warn("Library cleared");
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.saveScheduled && this.saveToSettings();
  }
}
class dt {
  constructor() {
    h(this, "items", []);
    h(this, "activeItemId", null);
    h(this, "eventListeners", /* @__PURE__ */ new Map());
    o.info("PlaybackQueueManager initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Core Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add a library item to the queue
   */
  addItem(a, t) {
    const e = {
      id: foundry.utils.randomID(),
      libraryItemId: a,
      group: (t == null ? void 0 : t.group) ?? "music",
      addedAt: Date.now(),
      state: "stopped",
      volume: (t == null ? void 0 : t.volume) ?? 1,
      loop: (t == null ? void 0 : t.loop) ?? !1,
      playlistId: t == null ? void 0 : t.playlistId
    };
    return this.items.push(e), this.emit("add", { item: e }), this.emit("change", { items: this.items }), o.debug("Added to queue:", e.id, a), e;
  }
  /**
   * Add all items from a playlist to the queue
   */
  addPlaylist(a, t) {
    const e = [];
    for (const i of t) {
      const s = this.addItem(i.libraryItemId, {
        playlistId: a,
        group: i.group,
        volume: i.volume,
        loop: i.loop
      });
      e.push(s);
    }
    return e;
  }
  /**
   * Remove an item from the queue
   */
  removeItem(a) {
    const t = this.items.findIndex((i) => i.id === a);
    if (t === -1) return !1;
    const [e] = this.items.splice(t, 1);
    return this.activeItemId === a && (this.activeItemId = null, this.emit("active", { item: void 0 })), this.emit("remove", { item: e }), this.emit("change", { items: this.items }), o.debug("Removed from queue:", a), !0;
  }
  /**
   * Clear all items from the queue
   */
  clearQueue() {
    this.items = [], this.activeItemId = null, this.emit("change", { items: [] }), this.emit("active", { item: void 0 }), o.debug("Queue cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────
  /**
   * Set the currently active (playing) item
   */
  setActive(a) {
    if (a && !this.items.find((e) => e.id === a)) {
      o.warn("Cannot set active: item not in queue", a);
      return;
    }
    this.activeItemId = a;
    const t = this.getActive();
    this.emit("active", { item: t ?? void 0 }), o.debug("Active item set:", a);
  }
  /**
   * Get the currently active item
   */
  getActive() {
    return this.activeItemId ? this.items.find((a) => a.id === this.activeItemId) ?? null : null;
  }
  /**
   * Get the next item in the queue (after active)
   */
  getNext() {
    if (!this.activeItemId) return this.items[0] ?? null;
    const a = this.items.findIndex((t) => t.id === this.activeItemId);
    return a === -1 || a >= this.items.length - 1 ? null : this.items[a + 1];
  }
  /**
   * Get the previous item in the queue (before active)
   */
  getPrevious() {
    if (!this.activeItemId) return null;
    const a = this.items.findIndex((t) => t.id === this.activeItemId);
    return a <= 0 ? null : this.items[a - 1];
  }
  /**
   * Update the state of a queue item
   */
  updateItemState(a, t) {
    const e = this.items.find((i) => i.id === a);
    e && (e.state = t, this.emit("change", { items: this.items }));
  }
  // ─────────────────────────────────────────────────────────────
  // State Access
  // ─────────────────────────────────────────────────────────────
  /**
   * Get all items in the queue
   */
  getItems() {
    return [...this.items];
  }
  /**
   * Get full queue state
   */
  getState() {
    return {
      items: [...this.items],
      activeItemId: this.activeItemId
    };
  }
  /**
   * Check if an item is in the queue
   */
  hasItem(a) {
    return this.items.some((t) => t.libraryItemId === a);
  }
  /**
   * Remove all queue items that reference a specific library item
   */
  removeByLibraryItemId(a) {
    const t = this.items.filter((e) => e.libraryItemId === a);
    if (t.length === 0) return !1;
    for (const e of t)
      this.removeItem(e.id);
    return !0;
  }
  // ─────────────────────────────────────────────────────────────
  // Event System
  // ─────────────────────────────────────────────────────────────
  on(a, t) {
    this.eventListeners.has(a) || this.eventListeners.set(a, /* @__PURE__ */ new Set()), this.eventListeners.get(a).add(t);
  }
  off(a, t) {
    var e;
    (e = this.eventListeners.get(a)) == null || e.delete(t);
  }
  emit(a, t) {
    var e;
    (e = this.eventListeners.get(a)) == null || e.forEach((i) => i(t));
  }
}
const R = "advanced-sound-engine";
let w = null, k = null, E = null, N = null, S = null, x = null, P = null;
Hooks.on("getSceneControlButtons", (d) => {
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
    }), console.log("ASE | getSceneControlButtons called with:", d), !Array.isArray(d) && typeof d == "object" && d !== null) {
      console.log("ASE | Detected non-array controls structure (V13?)");
      const i = d.sounds;
      i && Array.isArray(i.tools) ? (i.tools.push(...e), console.log('ASE | Added tools to "sounds" layer (V13 Object Mode)')) : (d["advanced-sound-engine"] = {
        name: "advanced-sound-engine",
        title: "Advanced Sound Engine",
        icon: "fas fa-music",
        visible: !0,
        tools: e
      }, console.log("ASE | Created dedicated control group (V13 Object Mode)"));
      return;
    }
    if (Array.isArray(d)) {
      const i = d.find((s) => s.name === "sounds");
      i ? (i.tools.push(...e), console.log('ASE | Added tools to "sounds" layer')) : (d.push({
        name: "advanced-sound-engine",
        title: "Advanced Sound Engine",
        icon: "fas fa-music",
        visible: !0,
        tools: e
      }), console.log("ASE | Created dedicated control group"));
    } else
      console.warn("ASE | Unknown controls structure:", d);
  } catch (t) {
    console.error("ASE | Failed to initialize scene controls:", t);
  }
});
Hooks.on("renderSceneControls", (d, a) => {
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
function ut() {
  Handlebars.registerHelper("formatDuration", (d) => {
    if (!d || d <= 0) return "--:--";
    const a = Math.floor(d / 60), t = Math.floor(d % 60);
    return `${a}:${t.toString().padStart(2, "0")}`;
  }), Handlebars.registerHelper("eq", (d, a) => d === a);
}
Hooks.once("init", () => {
  o.info("Initializing Advanced Sound Engine..."), gt(), ut();
});
Hooks.once("ready", async () => {
  var a;
  const d = ((a = game.user) == null ? void 0 : a.isGM) ?? !1;
  o.info(`Starting Advanced Sound Engine (${d ? "GM" : "Player"})...`), P = new at(), d ? await ht() : await ft(), N = new dt(), window.ASE = {
    isGM: d,
    openPanel: d ? z : mt,
    openLibrary: () => d && z("library"),
    engine: d ? w ?? void 0 : S ?? void 0,
    socket: P ?? void 0,
    library: d ? E ?? void 0 : void 0,
    queue: N
  }, pt(), o.info("Advanced Sound Engine ready");
});
async function ht() {
  E = new ct(), w = new Z(), P.initializeAsGM(w), await w.loadSavedState();
}
async function ft() {
  S = new tt(), P.initializeAsPlayer(S);
  const d = j.loadSavedVolume();
  S.setLocalVolume(d);
}
function z(d, a = !1) {
  !w || !P || !E || (k && k.rendered ? (d && k.state.activeTab !== d && (k.state.activeTab = d, a = !0), a ? k.render(!1) : k.bringToTop()) : (k = new rt(w, P, E, N), d && (k.state.activeTab = d), k.render(!0)));
}
function mt() {
  S && (x && x.rendered ? x.bringToTop() : (x = new j(S), x.render(!0)));
}
function pt() {
  const d = () => {
    w == null || w.resume(), S == null || S.resume();
  };
  document.addEventListener("click", d, { once: !0 }), document.addEventListener("keydown", d, { once: !0 }), Hooks.once("canvasReady", d);
}
function gt() {
  game.settings.register(R, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  }), game.settings.register(R, "maxSimultaneousTracks", {
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
  }), game.settings.register(R, "libraryState", {
    name: "Library State",
    hint: "Internal storage for library items and playlists",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  k == null || k.close(), x == null || x.close(), P == null || P.dispose(), w == null || w.dispose(), S == null || S.dispose(), E == null || E.dispose();
});
//# sourceMappingURL=module.js.map
