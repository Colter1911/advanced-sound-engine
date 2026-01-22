var H = Object.defineProperty;
var K = (d, i, t) => i in d ? H(d, i, { enumerable: !0, configurable: !0, writable: !0, value: t }) : d[i] = t;
var h = (d, i, t) => K(d, typeof i != "symbol" ? i + "" : i, t);
const M = "ASE", l = {
  info: (d, ...i) => {
    console.log(`${M} | ${d}`, ...i);
  },
  warn: (d, ...i) => {
    console.warn(`${M} | ${d}`, ...i);
  },
  error: (d, ...i) => {
    console.error(`${M} | ${d}`, ...i);
  },
  debug: (d, ...i) => {
    var t;
    (t = CONFIG == null ? void 0 : CONFIG.debug) != null && t.audio && console.debug(`${M} | ${d}`, ...i);
  }
};
class N {
  constructor(i, t, e, a = "music") {
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
    this.id = i, this.ctx = t, this._group = a, this.audio = new Audio(), this.audio.crossOrigin = "anonymous", this.audio.preload = "auto", this.gainNode = t.createGain(), this.outputNode = t.createGain(), this.gainNode.connect(this.outputNode), this.outputNode.connect(e), this.setupAudioEvents();
  }
  setupAudioEvents() {
    this.audio.addEventListener("canplay", () => {
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), l.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", l.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (i) => {
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
  async load(i) {
    return this._state = "loading", this._url = i, this._ready = !1, new Promise((t, e) => {
      const a = () => {
        this.audio.removeEventListener("canplay", a), this.audio.removeEventListener("error", s), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", l.debug(`Track loaded: ${this.id}`), t();
      }, s = () => {
        this.audio.removeEventListener("canplay", a), this.audio.removeEventListener("error", s), this._state = "stopped", e(new Error(`Failed to load: ${i}`));
      };
      this.audio.addEventListener("canplay", a, { once: !0 }), this.audio.addEventListener("error", s, { once: !0 }), this.audio.src = i, this.audio.load();
    });
  }
  async play(i = 0) {
    if (!this._ready) {
      l.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(i, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", l.debug(`Track ${this.id} playing from ${i.toFixed(2)}s`);
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
  seek(i) {
    const t = Math.max(0, Math.min(i, this.audio.duration || 0));
    this.audio.currentTime = t;
  }
  setVolume(i) {
    this._volume = Math.max(0, Math.min(1, i)), this.gainNode.gain.setValueAtTime(this._volume, this.ctx.currentTime);
  }
  setLoop(i) {
    this._loop = i, this.audio.loop = i;
  }
  setChannel(i, t) {
    this._group = i, this.outputNode.disconnect(), this.outputNode.connect(t);
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
    var i;
    this.audio.pause(), this.audio.src = "", (i = this.sourceNode) == null || i.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), l.debug(`Track ${this.id} disposed`);
  }
}
function A() {
  return Date.now();
}
function L(d) {
  if (!isFinite(d) || d < 0) return "0:00";
  const i = Math.floor(d / 60), t = Math.floor(d % 60);
  return `${i}:${t.toString().padStart(2, "0")}`;
}
function F() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (d) => {
    const i = Math.random() * 16 | 0;
    return (d === "x" ? i : i & 3 | 8).toString(16);
  });
}
const Q = [
  ".mp3",
  ".ogg",
  ".wav",
  ".webm",
  ".m4a",
  ".aac",
  ".flac",
  ".opus"
], W = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/opus"
};
function X(d) {
  const i = q(d);
  return Q.includes(i);
}
function q(d) {
  try {
    const e = decodeURIComponent(d).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return e ? `.${e[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function J(d) {
  const i = q(d);
  return W[i] || null;
}
function R(d) {
  if (!d || typeof d != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const i = q(d);
  if (!i)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!X(d))
    return {
      valid: !1,
      error: `Unsupported audio format: ${i}. Supported formats: ${Q.join(", ")}`,
      extension: i
    };
  const t = J(d);
  return {
    valid: !0,
    extension: i,
    mimeType: t || void 0
  };
}
const U = "advanced-sound-engine";
function Z() {
  return game.settings.get(U, "maxSimultaneousTracks") || 8;
}
class tt {
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
    }, this.channelGains.music.connect(this.masterGain), this.channelGains.ambience.connect(this.masterGain), this.channelGains.sfx.connect(this.masterGain), l.info("AudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence (GM only)
  // ─────────────────────────────────────────────────────────────
  scheduleSave() {
    var i;
    (i = game.user) != null && i.isGM && (this.saveTimeout && clearTimeout(this.saveTimeout), this.saveTimeout = setTimeout(() => {
      this.saveState();
    }, 500));
  }
  async saveState() {
    var t;
    if (!game.ready || !((t = game.user) != null && t.isGM)) return;
    const i = this.getState();
    try {
      await game.settings.set(U, "mixerState", JSON.stringify(i)), l.debug("Mixer state saved");
    } catch (e) {
      l.error("Failed to save mixer state:", e);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const i = game.settings.get(U, "mixerState");
        if (!i) return;
        const t = JSON.parse(i);
        await this.restoreState(t), l.info("Mixer state restored");
      } catch (i) {
        l.error("Failed to load mixer state:", i);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(i) {
    const t = i.id || F();
    if (this.players.has(t))
      return this.players.get(t);
    const e = R(i.url);
    if (!e.valid) {
      const r = new Error(e.error || "Invalid audio file");
      throw l.error(`Track validation failed: ${e.error}`), r;
    }
    const a = this.channelGains[i.group], s = new N(
      t,
      this.ctx,
      a,
      i.group
    );
    return i.volume !== void 0 && s.setVolume(i.volume), i.loop !== void 0 && s.setLoop(i.loop), await s.load(i.url), this.players.set(t, s), this.scheduleSave(), l.info(`Track created: ${t} (${e.extension})`), s;
  }
  getTrack(i) {
    return this.players.get(i);
  }
  removeTrack(i) {
    const t = this.players.get(i);
    return t ? (t.dispose(), this.players.delete(i), this.scheduleSave(), l.info(`Track removed: ${i}`), !0) : !1;
  }
  getAllTracks() {
    return Array.from(this.players.values());
  }
  getTracksByGroup(i) {
    return this.getAllTracks().filter((t) => t.group === i);
  }
  setTrackChannel(i, t) {
    const e = this.players.get(i);
    e && (e.setChannel(t, this.channelGains[t]), this.scheduleSave());
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────
  async playTrack(i, t = 0) {
    var n;
    const e = this.players.get(i);
    if (!e) {
      l.warn(`Track not found: ${i}`);
      return;
    }
    const a = Z(), s = this.getAllTracks().filter((o) => o.state === "playing").length;
    if (!(e.state === "playing") && s >= a) {
      l.warn(`Maximum simultaneous tracks (${a}) reached`), (n = ui.notifications) == null || n.warn(`Cannot play more than ${a} tracks simultaneously`);
      return;
    }
    await e.play(t);
  }
  pauseTrack(i) {
    var t;
    (t = this.players.get(i)) == null || t.pause();
  }
  stopTrack(i) {
    var t;
    (t = this.players.get(i)) == null || t.stop();
  }
  seekTrack(i, t) {
    var e;
    (e = this.players.get(i)) == null || e.seek(t);
  }
  setTrackVolume(i, t) {
    var e;
    (e = this.players.get(i)) == null || e.setVolume(t), this.scheduleSave();
  }
  setTrackLoop(i, t) {
    var e;
    (e = this.players.get(i)) == null || e.setLoop(t), this.scheduleSave();
  }
  stopAll() {
    for (const i of this.players.values())
      i.stop();
  }
  // ─────────────────────────────────────────────────────────────
  // Volume Control
  // ─────────────────────────────────────────────────────────────
  get volumes() {
    return { ...this._volumes };
  }
  setMasterVolume(i) {
    this._volumes.master = Math.max(0, Math.min(1, i)), this.masterGain.gain.linearRampToValueAtTime(
      this._volumes.master,
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  setChannelVolume(i, t) {
    this._volumes[i] = Math.max(0, Math.min(1, t)), this.channelGains[i].gain.linearRampToValueAtTime(
      this._volumes[i],
      this.ctx.currentTime + 0.01
    ), this.scheduleSave();
  }
  getChannelVolume(i) {
    return this._volumes[i];
  }
  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  getState() {
    const i = [];
    for (const t of this.players.values())
      i.push(t.getState());
    return {
      masterVolume: this._volumes.master,
      channelVolumes: { ...this._volumes },
      tracks: i,
      timestamp: A(),
      syncEnabled: !1
    };
  }
  async restoreState(i) {
    if (this._volumes.master = i.masterVolume, this.masterGain.gain.setValueAtTime(this._volumes.master, this.ctx.currentTime), i.channelVolumes)
      for (const e of ["music", "ambience", "sfx"])
        this._volumes[e] = i.channelVolumes[e], this.channelGains[e].gain.setValueAtTime(this._volumes[e], this.ctx.currentTime);
    for (const e of i.tracks)
      if (!this.players.has(e.id))
        try {
          await this.createTrack({
            id: e.id,
            url: e.url,
            group: e.group,
            volume: e.volume,
            loop: e.loop
          });
        } catch (a) {
          l.error(`Failed to restore track ${e.id}:`, a);
        }
    const t = new Set(i.tracks.map((e) => e.id));
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
    for (const i of this.players.values())
      i.dispose();
    this.players.clear(), this.ctx.close(), l.info("AudioEngine disposed");
  }
}
class et {
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
    }, this.channelGains.music.connect(this.gmGain), this.channelGains.ambience.connect(this.gmGain), this.channelGains.sfx.connect(this.gmGain), l.info("PlayerAudioEngine initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Local Volume (Player's personal control)
  // ─────────────────────────────────────────────────────────────
  get localVolume() {
    return this._localVolume;
  }
  setLocalVolume(i) {
    this._localVolume = Math.max(0, Math.min(1, i)), this.masterGain.gain.linearRampToValueAtTime(
      this._localVolume,
      this.ctx.currentTime + 0.01
    );
  }
  // ─────────────────────────────────────────────────────────────
  // GM Volume (from sync)
  // ─────────────────────────────────────────────────────────────
  setGMVolume(i, t) {
    const e = Math.max(0, Math.min(1, t));
    i === "master" ? (this._gmVolumes.master = e, this.gmGain.gain.linearRampToValueAtTime(e, this.ctx.currentTime + 0.01)) : (this._gmVolumes[i] = e, this.channelGains[i].gain.linearRampToValueAtTime(e, this.ctx.currentTime + 0.01));
  }
  setAllGMVolumes(i) {
    this._gmVolumes = { ...i }, this.gmGain.gain.setValueAtTime(i.master, this.ctx.currentTime), this.channelGains.music.gain.setValueAtTime(i.music, this.ctx.currentTime), this.channelGains.ambience.gain.setValueAtTime(i.ambience, this.ctx.currentTime), this.channelGains.sfx.gain.setValueAtTime(i.sfx, this.ctx.currentTime);
  }
  // ─────────────────────────────────────────────────────────────
  // Local Playback Control (Interface Compliance)
  // ─────────────────────────────────────────────────────────────
  async playTrack(i, t = 0) {
    const e = this.players.get(i);
    e ? await e.play(t) : l.warn(`PlayerAudioEngine: Track ${i} not found locally.`);
  }
  pauseTrack(i) {
    var t;
    (t = this.players.get(i)) == null || t.pause();
  }
  stopTrack(i) {
    var t;
    (t = this.players.get(i)) == null || t.stop();
  }
  // ─────────────────────────────────────────────────────────────
  // Track Commands (from GM via socket)
  // ─────────────────────────────────────────────────────────────
  async handlePlay(i) {
    let t = this.players.get(i.trackId);
    t || (t = new N(
      i.trackId,
      this.ctx,
      this.channelGains[i.group],
      i.group
    ), await t.load(i.url), this.players.set(i.trackId, t)), t.setVolume(i.volume), t.setLoop(i.loop);
    const e = (A() - i.startTimestamp) / 1e3, a = Math.max(0, i.offset + e);
    await t.play(a), l.debug(`Player: track ${i.trackId} playing at ${a.toFixed(2)}s`);
  }
  handlePause(i) {
    var t;
    (t = this.players.get(i)) == null || t.pause();
  }
  handleStop(i) {
    var t;
    (t = this.players.get(i)) == null || t.stop();
  }
  handleSeek(i, t, e, a) {
    const s = this.players.get(i);
    if (s)
      if (e) {
        const r = (A() - a) / 1e3;
        s.seek(t + r);
      } else
        s.seek(t);
  }
  handleTrackVolume(i, t) {
    var e;
    (e = this.players.get(i)) == null || e.setVolume(t);
  }
  handleTrackLoop(i, t) {
    var e;
    (e = this.players.get(i)) == null || e.setLoop(t);
  }
  // ─────────────────────────────────────────────────────────────
  // Sync State (full state from GM)
  // ─────────────────────────────────────────────────────────────
  async syncState(i, t) {
    this.setAllGMVolumes(t);
    const e = new Set(i.map((a) => a.id));
    for (const [a, s] of this.players)
      e.has(a) || (s.dispose(), this.players.delete(a));
    for (const a of i) {
      let s = this.players.get(a.id);
      if (s || (s = new N(
        a.id,
        this.ctx,
        this.channelGains[a.group],
        a.group
      ), await s.load(a.url), this.players.set(a.id, s)), s.setVolume(a.volume), s.setLoop(a.loop), a.isPlaying) {
        const r = (A() - a.startTimestamp) / 1e3, n = a.currentTime + r;
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
    for (const i of this.players.values())
      i.stop();
  }
  clearAll() {
    for (const i of this.players.values())
      i.dispose();
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
const at = "advanced-sound-engine", D = `module.${at}`;
class it {
  constructor() {
    h(this, "gmEngine", null);
    h(this, "playerEngine", null);
    h(this, "socket", null);
    h(this, "_syncEnabled", !1);
    h(this, "isGM", !1);
  }
  initializeAsGM(i) {
    var t;
    this.isGM = !0, this.gmEngine = i, this.socket = game.socket, (t = this.socket) == null || t.on(D, (e) => {
      this.handleGMMessage(e);
    }), l.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(i) {
    var t;
    this.isGM = !1, this.playerEngine = i, this.socket = game.socket, (t = this.socket) == null || t.on(D, (e) => {
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
  setSyncEnabled(i) {
    this.isGM && (this._syncEnabled = i, i ? this.broadcastSyncStart() : this.broadcastSyncStop(), l.info(`Sync mode: ${i ? "ON" : "OFF"}`));
  }
  // ─────────────────────────────────────────────────────────────
  // GM Message Handling
  // ─────────────────────────────────────────────────────────────
  handleGMMessage(i) {
    var t;
    i.senderId !== ((t = game.user) == null ? void 0 : t.id) && i.type === "player-ready" && this._syncEnabled && this.sendStateTo(i.senderId);
  }
  // ─────────────────────────────────────────────────────────────
  // Player Message Handling
  // ─────────────────────────────────────────────────────────────
  async handlePlayerMessage(i) {
    var t;
    if (i.senderId !== ((t = game.user) == null ? void 0 : t.id) && this.playerEngine)
      switch (l.debug(`Player received: ${i.type}`, i.payload), i.type) {
        case "sync-start":
          const e = i.payload;
          await this.playerEngine.syncState(e.tracks, e.channelVolumes);
          break;
        case "sync-stop":
          this.playerEngine.clearAll();
          break;
        case "sync-state":
          const a = i.payload;
          await this.playerEngine.syncState(a.tracks, a.channelVolumes);
          break;
        case "track-play":
          const s = i.payload;
          await this.playerEngine.handlePlay(s);
          break;
        case "track-pause":
          const r = i.payload;
          this.playerEngine.handlePause(r.trackId);
          break;
        case "track-stop":
          const n = i.payload;
          this.playerEngine.handleStop(n.trackId);
          break;
        case "track-seek":
          const o = i.payload;
          this.playerEngine.handleSeek(
            o.trackId,
            o.time,
            o.isPlaying,
            o.seekTimestamp
          );
          break;
        case "track-volume":
          const c = i.payload;
          this.playerEngine.handleTrackVolume(c.trackId, c.volume);
          break;
        case "track-loop":
          const u = i.payload;
          this.playerEngine.handleTrackLoop(u.trackId, u.loop);
          break;
        case "channel-volume":
          const f = i.payload;
          this.playerEngine.setGMVolume(f.channel, f.volume);
          break;
        case "stop-all":
          this.playerEngine.stopAll();
          break;
      }
  }
  // ─────────────────────────────────────────────────────────────
  // GM Broadcast Methods
  // ─────────────────────────────────────────────────────────────
  send(i, t, e) {
    var s;
    if (!this.socket) return;
    const a = {
      type: i,
      payload: t,
      senderId: ((s = game.user) == null ? void 0 : s.id) ?? "",
      timestamp: A()
    };
    e ? this.socket.emit(D, a, { recipients: [e] }) : this.socket.emit(D, a), l.debug(`Sent: ${i}`, t);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const i = A(), t = [];
    for (const e of this.gmEngine.getAllTracks()) {
      const a = e.getState();
      t.push({
        id: a.id,
        url: a.url,
        group: a.group,
        volume: a.volume,
        loop: a.loop,
        isPlaying: a.playbackState === "playing",
        currentTime: e.getCurrentTime(),
        startTimestamp: i
      });
    }
    return {
      tracks: t,
      channelVolumes: this.gmEngine.volumes
    };
  }
  broadcastSyncStart() {
    const i = this.getCurrentSyncState();
    this.send("sync-start", i);
  }
  broadcastSyncStop() {
    this.send("sync-stop", {});
  }
  sendStateTo(i) {
    const t = this.getCurrentSyncState();
    this.send("sync-state", t, i);
  }
  // ─────────────────────────────────────────────────────────────
  // GM Actions (called when GM interacts with mixer)
  // ─────────────────────────────────────────────────────────────
  broadcastTrackPlay(i, t) {
    if (!this._syncEnabled || !this.gmEngine) return;
    const e = this.gmEngine.getTrack(i);
    if (!e) return;
    const a = {
      trackId: i,
      url: e.url,
      group: e.group,
      volume: e.volume,
      loop: e.loop,
      offset: t,
      startTimestamp: A()
    };
    this.send("track-play", a);
  }
  broadcastTrackPause(i, t) {
    if (!this._syncEnabled) return;
    const e = { trackId: i, pausedAt: t };
    this.send("track-pause", e);
  }
  broadcastTrackStop(i) {
    if (!this._syncEnabled) return;
    const t = { trackId: i };
    this.send("track-stop", t);
  }
  broadcastTrackSeek(i, t, e) {
    if (!this._syncEnabled) return;
    const a = {
      trackId: i,
      time: t,
      isPlaying: e,
      seekTimestamp: A()
    };
    this.send("track-seek", a);
  }
  broadcastTrackVolume(i, t) {
    if (!this._syncEnabled) return;
    const e = { trackId: i, volume: t };
    this.send("track-volume", e);
  }
  broadcastTrackLoop(i, t) {
    if (!this._syncEnabled) return;
    const e = { trackId: i, loop: t };
    this.send("track-loop", e);
  }
  broadcastChannelVolume(i, t) {
    if (!this._syncEnabled) return;
    const e = { channel: i, volume: t };
    this.send("channel-volume", e);
  }
  broadcastStopAll() {
    this._syncEnabled && this.send("stop-all", {});
  }
  dispose() {
    var i;
    (i = this.socket) == null || i.off(D);
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
      const a = parseFloat(e.target.value) / 100;
      this.engine.setLocalVolume(a), t.find(".ase-volume-value").text(`${Math.round(a * 100)}%`), this.saveVolume(a);
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
class st extends Application {
  // Using any to avoid circular import issues for now, or use interface
  constructor(t, e, a = {}) {
    super(a);
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
    var a;
    if ((a = window.ASE) != null && a.openPanel) {
      window.ASE.openPanel("library", !0);
      return;
    }
    return super.render(t, e);
  }
  getData() {
    let t = this.library.getAllItems();
    const e = this.library.playlists.getAllPlaylists(), a = this.library.getAllTags(), s = this.library.getStats();
    this.library.scanMissingDurations().then(() => {
    }), t = this.applyFilters(t), t = this.applySorting(t);
    const n = this.library.getOrderedFavorites().map((m) => {
      var y, T, v, I;
      const g = m.type === "track" ? ((T = (y = window.ASE) == null ? void 0 : y.queue) == null ? void 0 : T.hasItem(m.id)) ?? !1 : ((I = (v = window.ASE) == null ? void 0 : v.queue) == null ? void 0 : I.getItems().some((b) => b.playlistId === m.id)) ?? !1;
      if (m.type === "track") {
        const b = this.library.getItem(m.id);
        return b ? {
          id: b.id,
          name: b.name,
          type: "track",
          group: this.inferGroupFromTags(b.tags),
          inQueue: g
        } : null;
      } else {
        const b = this.library.playlists.getPlaylist(m.id);
        return b ? {
          id: b.id,
          name: b.name,
          type: "playlist",
          inQueue: g
        } : null;
      }
    }).filter((m) => m !== null), o = new Set(a);
    this.filterState.selectedTags.forEach((m) => o.add(m));
    const c = Array.from(o).sort().map((m) => {
      const g = m.startsWith("#") ? m.substring(1) : m, y = this.filterState.selectedTags.has(m) || this.filterState.selectedTags.has(g);
      return {
        name: g,
        // Display name (without #)
        value: g,
        // Data value (also normalized for consistency)
        selected: y
      };
    }), u = e.map((m) => ({
      ...this.getPlaylistViewData(m),
      selected: m.id === this.filterState.selectedPlaylistId
    })), f = this.filterState.selectedChannels.size === 3, p = !!(this.filterState.searchQuery || !f || this.filterState.selectedPlaylistId || this.filterState.selectedTags.size > 0);
    return {
      items: t.map((m) => this.getItemViewData(m)),
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
    var a, s;
    const e = ((s = (a = window.ASE) == null ? void 0 : a.queue) == null ? void 0 : s.getItems().some(
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
    var s, r;
    const e = ((r = (s = window.ASE) == null ? void 0 : s.queue) == null ? void 0 : r.hasItem(t.id)) ?? !1, a = L(t.duration);
    return {
      id: t.id,
      name: t.name,
      url: t.url,
      duration: a,
      durationFormatted: a,
      durationSeconds: t.duration,
      tags: t.tags,
      favorite: t.favorite,
      group: t.group || "music",
      inQueue: e
    };
  }
  inferGroupFromTags(t) {
    const e = t.map((a) => a.toLowerCase());
    return e.some((a) => a.includes("music")) ? "music" : e.some((a) => a.includes("ambient") || a.includes("ambience")) ? "ambience" : e.some((a) => a.includes("sfx") || a.includes("effect")) ? "sfx" : "music";
  }
  // ─────────────────────────────────────────────────────────────
  // Filtering & Sorting
  // ─────────────────────────────────────────────────────────────
  applyFilters(t) {
    let e = t;
    if (this.filterState.searchQuery) {
      const a = this.filterState.searchQuery.toLowerCase();
      e = e.filter(
        (s) => s.name.toLowerCase().includes(a) || s.tags.some((r) => r.toLowerCase().includes(a))
      );
    }
    if (this.filterState.selectedChannels.size > 0 && (e = e.filter((a) => {
      const s = a.group || "music";
      return this.filterState.selectedChannels.has(s);
    })), this.filterState.selectedPlaylistId) {
      const a = this.library.playlists.getPlaylist(this.filterState.selectedPlaylistId);
      if (a) {
        const s = new Set(a.items.map((r) => r.libraryItemId));
        e = e.filter((r) => s.has(r.id));
      }
    }
    if (this.filterState.selectedTags.size > 0) {
      const a = Array.from(this.filterState.selectedTags);
      e = e.filter(
        (s) => a.every((r) => s.tags.includes(r))
      );
    }
    return e;
  }
  applySorting(t) {
    const e = [...t];
    switch (this.filterState.sortBy) {
      case "name-asc":
        e.sort((a, s) => a.name.localeCompare(s.name));
        break;
      case "name-desc":
        e.sort((a, s) => s.name.localeCompare(a.name));
        break;
      case "date-asc":
        e.sort((a, s) => a.addedAt - s.addedAt);
        break;
      case "date-desc":
        e.sort((a, s) => s.addedAt - a.addedAt);
        break;
      case "duration-asc":
        e.sort((a, s) => a.duration - s.duration);
        break;
      case "duration-desc":
        e.sort((a, s) => s.duration - a.duration);
        break;
    }
    return e;
  }
  activateListeners(t) {
    super.activateListeners(t), t.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), t.find(".ase-search-input").on("keydown", this.onSearchKeydown.bind(this)), t.find(".ase-search-input").on("input", this.onSearchInput.bind(this)), t.find(".ase-search-clear").on("click", this.onClearSearch.bind(this)), t.find('[data-action="filter-channel"]').on("click", this._onFilterChannel.bind(this)), t.find('[data-action="sort-change"]').on("change", this.onChangeSort.bind(this)), t.find('[data-action="clear-filters"]').on("click", this.onClearFilters.bind(this)), t.find('[data-action="toggle-tag"]').on("click", this.onToggleTag.bind(this)), t.find('[data-action="add-tag"]').on("click", this.onAddTag.bind(this)), t.find('[data-action="play-track"]').on("click", this.onPlayTrack.bind(this)), t.find('[data-action="pause-track"]').on("click", this.onPauseTrack.bind(this)), t.find('[data-action="stop-track"]').on("click", this.onStopTrack.bind(this)), t.find('[data-action="add-to-queue"]').on("click", this.onAddToQueue.bind(this)), t.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), t.find('[data-action="add-to-playlist"]').on("click", this.onAddToPlaylist.bind(this)), t.find('[data-action="track-menu"]').on("click", this.onTrackMenu.bind(this)), t.find('[data-action="add-tag-to-track"]').on("click", this.onAddTagToTrack.bind(this)), t.find('[data-action="channel-dropdown"]').on("click", this.onChannelDropdown.bind(this)), t.find('[data-action="delete-track"]').on("click", this.onDeleteTrack.bind(this)), t.find(".ase-track-player-item").on("contextmenu", this.onTrackContext.bind(this)), t.find(".ase-track-tags .ase-tag").on("contextmenu", this.onTrackTagContext.bind(this)), t.find('[data-action="select-playlist"]').on("click", this.onSelectPlaylist.bind(this)), t.find('[data-action="create-playlist"]').on("click", this.onCreatePlaylist.bind(this)), t.find('[data-action="toggle-playlist-favorite"]').on("click", this.onTogglePlaylistFavorite.bind(this)), t.find('[data-action="toggle-playlist-queue"]').on("click", this.onTogglePlaylistQueue.bind(this)), t.find('[data-action="playlist-menu"]').on("click", this.onPlaylistMenu.bind(this)), t.find(".ase-list-item[data-playlist-id]").on("contextmenu", this.onPlaylistContext.bind(this)), t.find('[data-action="remove-from-favorites"]').on("click", this.onRemoveFromFavorites.bind(this)), t.find('[data-action="toggle-favorite-queue"]').on("click", this.onToggleFavoriteQueue.bind(this)), this.setupDragAndDrop(t), this.setupFoundryDragDrop(t), t.find(".ase-track-player-item").on("mouseenter", (e) => {
      const a = $(e.currentTarget).data("item-id");
      a && this.highlightPlaylistsContainingTrack(a);
    }), t.find(".ase-track-player-item").on("mouseleave", () => {
      this.clearPlaylistHighlights();
    }), t.find(".ase-tags-inline .ase-tag").on("contextmenu", this.onTagContext.bind(this)), l.debug("LocalLibraryApp listeners activated");
  }
  // ─────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onAddTrack(t) {
    t.preventDefault(), new FilePicker({
      type: "audio",
      callback: async (a) => {
        await this.addTrackFromPath(a);
      }
    }).render(!0);
  }
  async addTrackFromPath(t, e = "music") {
    var a, s;
    try {
      const r = Array.from(this.filterState.selectedTags), n = await this.library.addItem(t, void 0, e, r);
      this.persistScroll(), this.render(), (a = ui.notifications) == null || a.info(`Added to library: ${n.name}`);
    } catch (r) {
      l.error("Failed to add track to library:", r);
      const n = r instanceof Error ? r.message : "Unknown error";
      (s = ui.notifications) == null || s.error(`Failed to add track: ${n}`);
    }
  }
  async onToggleFavorite(t) {
    var a, s;
    t.preventDefault();
    const e = $(t.currentTarget).closest("[data-item-id]").data("item-id");
    try {
      this.persistScroll();
      const r = this.library.toggleFavorite(e);
      this.render(), (a = ui.notifications) == null || a.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      l.error("Failed to toggle favorite:", r), (s = ui.notifications) == null || s.error("Failed to update favorite status");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onCreatePlaylist(t) {
    var a, s;
    t.preventDefault();
    const e = await this.promptPlaylistName();
    if (e)
      try {
        const r = this.library.playlists.createPlaylist(e);
        this.persistScroll(), this.render(), (a = ui.notifications) == null || a.info(`Created playlist: ${r.name}`);
      } catch (r) {
        l.error("Failed to create playlist:", r);
        const n = r instanceof Error ? r.message : "Unknown error";
        (s = ui.notifications) == null || s.error(`Failed to create playlist: ${n}`);
      }
  }
  async onTogglePlaylistFavorite(t) {
    var a, s;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).closest("[data-playlist-id]").data("playlist-id");
    try {
      this.persistScroll();
      const r = this.library.playlists.togglePlaylistFavorite(e);
      this.render(), (a = ui.notifications) == null || a.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      l.error("Failed to toggle playlist favorite:", r), (s = ui.notifications) == null || s.error("Failed to update favorite status");
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
    const e = $(t.currentTarget), a = e.data("channel");
    this.filterState.selectedChannels.has(a) ? (this.filterState.selectedChannels.delete(a), e.removeClass("active")) : (this.filterState.selectedChannels.add(a), e.addClass("active")), this.render(), l.debug("Filter channel toggled:", a, this.filterState.selectedChannels);
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
    const e = String($(t.currentTarget).data("tag"));
    console.log("[ASE] onToggleTag called with tag:", e), console.log("[ASE] Current selectedTags:", Array.from(this.filterState.selectedTags)), this.filterState.selectedTags.has(e) ? (this.filterState.selectedTags.delete(e), console.log("[ASE] Tag deselected")) : (this.filterState.selectedTags.add(e), console.log("[ASE] Tag selected")), this.render();
  }
  onTagContext(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("tag")), a = `
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
    const s = $(a);
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
    const a = e.trim().replace(/^#/, "");
    a && (console.log("[ASE] onAddTag: normalized tagName =", a), this.filterState.selectedTags.add(a), this.library.addCustomTag(a), console.log("[ASE] onAddTag: selectedTags now =", Array.from(this.filterState.selectedTags)), console.log("[ASE] onAddTag: allTags from library =", this.library.getAllTags()), this.render(), (s = ui.notifications) == null || s.info(`Tag "${a}" added.`));
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
    const a = this.library.renameTag(t, e);
    this.filterState.selectedTags.has(t) && (this.filterState.selectedTags.delete(t), this.filterState.selectedTags.add(e)), a > 0 && (this.persistScroll(), this.render(), (s = ui.notifications) == null || s.info(`Renamed tag "${t}" to "${e}" on ${a} tracks.`));
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
            callback: (a) => e(a.find("#tag-name").val())
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
    var a;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Play track:", e), l.debug("Play track:", e), (a = window.ASE.engine) == null || a.playTrack(e), this.persistScroll();
  }
  onStopTrack(t) {
    var a;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Stop track:", e), (a = window.ASE.engine) == null || a.stopTrack(e), this.persistScroll();
  }
  onPauseTrack(t) {
    var a;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Pause track:", e), (a = window.ASE.engine) == null || a.pauseTrack(e), this.persistScroll();
  }
  onAddToQueue(t) {
    var s, r, n;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("item-id"));
    if (!((s = window.ASE) != null && s.queue)) {
      l.warn("Queue manager not available");
      return;
    }
    const a = this.library.getItem(e);
    if (!a) {
      l.warn("Item not found:", e);
      return;
    }
    window.ASE.queue.hasItem(e) ? (window.ASE.queue.removeByLibraryItemId(e), l.debug("Removed from queue:", e), (r = ui.notifications) == null || r.info(`"${a.name}" removed from queue`)) : (window.ASE.queue.addItem(e, {
      group: a.group || "music",
      volume: 1,
      loop: !1
    }), l.debug("Added to queue:", e), (n = ui.notifications) == null || n.info(`"${a.name}" added to queue`)), this.persistScroll(), this.render();
  }
  async onAddTagToTrack(t) {
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    l.debug("Add tag to track:", e), this.showTagEditor(e);
  }
  async onAddToPlaylist(t) {
    var n, o, c, u;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id"), a = this.library.getItem(e);
    if (!a) {
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
        const f = this.inferGroupFromTags(a.tags);
        this.library.playlists.addTrackToPlaylist(r, e, f), this.render(), (c = ui.notifications) == null || c.info(`Added "${a.name}" to playlist`);
      } catch (f) {
        l.error("Failed to add track to playlist:", f);
        const p = f instanceof Error ? f.message : "Unknown error";
        (u = ui.notifications) == null || u.error(`Failed to add to playlist: ${p}`);
      }
  }
  onTrackMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation(), $(t.currentTarget).data("item-id");
    const e = $(t.currentTarget).closest(".ase-track-player-item"), a = new MouseEvent("contextmenu", {
      bubbles: !0,
      cancelable: !0,
      view: window,
      clientX: t.clientX,
      clientY: t.clientY
    });
    (s = e[0]) == null || s.dispatchEvent(a);
  }
  // ─────────────────────────────────────────────────────────────
  // Favorites Event Handlers
  // ─────────────────────────────────────────────────────────────
  onRemoveFromFavorites(t) {
    var s, r;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("favorite-id")), a = String($(t.currentTarget).data("favorite-type"));
    if (l.debug("Remove from favorites:", e, a), a === "playlist") {
      const n = this.library.playlists.getPlaylist(e);
      n && (this.library.playlists.updatePlaylist(e, { favorite: !1 }), (s = ui.notifications) == null || s.info(`Removed "${n.name}" from favorites`));
    } else {
      const n = this.library.getItem(e);
      n && (this.library.toggleFavorite(e), (r = ui.notifications) == null || r.info(`Removed "${n.name}" from favorites`));
    }
    this.persistScroll(), this.render();
  }
  onToggleFavoriteQueue(t) {
    var s, r, n, o, c;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("favorite-id")), a = String($(t.currentTarget).data("favorite-type"));
    if (!((s = window.ASE) != null && s.queue)) {
      l.warn("Queue manager not available");
      return;
    }
    if (a === "playlist") {
      const u = this.library.playlists.getPlaylist(e);
      if (!u) return;
      if (window.ASE.queue.getItems().some((p) => p.playlistId === e))
        window.ASE.queue.getItems().filter((m) => m.playlistId === e).forEach((m) => window.ASE.queue.removeItem(m.id)), (r = ui.notifications) == null || r.info(`Removed "${u.name}" from queue`);
      else {
        const p = u.items.map((m) => ({
          libraryItemId: m.libraryItemId,
          group: m.group || "music",
          volume: m.volume,
          loop: m.loop
        }));
        window.ASE.queue.addPlaylist(e, p), (n = ui.notifications) == null || n.info(`Added "${u.name}" to queue`);
      }
    } else {
      const u = this.library.getItem(e);
      if (!u) return;
      window.ASE.queue.hasItem(e) ? (window.ASE.queue.getItems().filter((m) => m.libraryItemId === e).forEach((m) => window.ASE.queue.removeItem(m.id)), (o = ui.notifications) == null || o.info(`Removed "${u.name}" from queue`)) : (window.ASE.queue.addItem(e, {
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
    const e = String($(t.currentTarget).data("item-id")), a = this.library.getItem(e);
    if (!a) return;
    const s = a.group || "music", r = ["music", "ambience", "sfx"], n = $(`
      <div class="ase-dropdown-menu" style="position: fixed; z-index: 9999; background: #1e283d; border: 1px solid #334155; border-radius: 4px; min-width: 100px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        ${r.map((c) => `
          <div class="ase-dropdown-item" data-channel="${c}" style="padding: 8px 12px; cursor: pointer; color: ${c === s ? "var(--accent-cyan)" : "#94a3b8"}; font-size: 12px;">
            ${c.charAt(0).toUpperCase() + c.slice(1)}
          </div>
        `).join("")}
      </div>
    `), o = t.currentTarget.getBoundingClientRect();
    n.css({ top: o.bottom + 2, left: o.left }), $("body").append(n), n.find(".ase-dropdown-item").on("click", (c) => {
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
    const e = String($(t.currentTarget).data("item-id")), a = this.library.getItem(e);
    if (!a) return;
    const s = !!this.filterState.selectedPlaylistId, r = {
      title: s ? "Manage Track" : "Delete Track",
      content: `<p>${s ? `What would you like to do with "${a.name}"?` : `Are you sure you want to delete "${a.name}"?`}</p>`,
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
        this.library.removeItem(e), this.render(), (n = ui.notifications) == null || n.info(`Deleted "${a.name}"`);
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
    const o = $(n);
    o.css({ top: t.clientY, left: t.clientX }), $("body").append(o), o.find(".ase-menu-item").on("mouseenter", (c) => $(c.currentTarget).css("background", "#2d3a52")), o.find(".ase-menu-item").on("mouseleave", (c) => $(c.currentTarget).css("background", "transparent")), o.find('[data-action="rename"]').on("click", async () => {
      o.remove(), await this.renameTrack(e);
    }), o.find('[data-action="add-to-playlist"]').on("click", async () => {
      o.remove(), await this.addTrackToPlaylistDialog(e);
    }), s && o.find('[data-action="remove-from-playlist"]').on("click", async () => {
      o.remove(), this.filterState.selectedPlaylistId && await this.removeTrackFromPlaylist(this.filterState.selectedPlaylistId, e);
    }), o.find('[data-action="edit-tags"]').on("click", () => {
      o.remove(), this.showTagEditor(e);
    }), o.find('[data-action="delete"]').on("click", () => {
      o.remove(), this.onDeleteTrack({ preventDefault: () => {
      }, stopPropagation: () => {
      }, currentTarget: $(`<div data-item-id="${e}">`)[0] });
    }), setTimeout(() => {
      $(document).one("click", () => o.remove());
    }, 10);
  }
  onTrackTagContext(t) {
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("tag")), a = String($(t.currentTarget).data("item-id"));
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
      s.remove(), this.library.removeTagFromItem(a, e), this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(`Removed tag "${e}"`);
    }), setTimeout(() => {
      $(document).one("click", () => s.remove());
    }, 10);
  }
  async renameTrack(t) {
    var s;
    const e = this.library.getItem(t);
    if (!e) return;
    const a = await this.promptInput("Rename Track", "Track Name:", e.name);
    a && a !== e.name && (this.library.updateItem(t, { name: a }), this.render(), (s = ui.notifications) == null || s.info(`Renamed to "${a}"`));
  }
  async addTrackToPlaylistDialog(t) {
    var n, o;
    const e = this.library.playlists.getAllPlaylists();
    if (e.length === 0) {
      (n = ui.notifications) == null || n.warn("No playlists available. Create one first.");
      return;
    }
    const a = await this.promptPlaylistSelection(e);
    if (!a) return;
    const s = this.library.getItem(t);
    if (!s) return;
    const r = this.inferGroupFromTags(s.tags);
    this.library.playlists.addTrackToPlaylist(a, t, r), this.render(), (o = ui.notifications) == null || o.info(`Added "${s.name}" to playlist`);
  }
  showTagEditor(t) {
    const e = this.library.getItem(t);
    if (!e) return;
    const a = this.library.getAllTags(), s = new Set(e.tags), r = `
      <form>
        <div style="max-height: 300px; overflow-y: auto;">
          ${a.map((n) => `
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
            const o = [];
            n.find('input[name="tag"]:checked').each((f, p) => {
              o.push($(p).val());
            });
            const c = (u = n.find('input[name="newTag"]').val()) == null ? void 0 : u.trim();
            c && (o.push(c), this.library.addCustomTag(c)), this.library.updateItem(t, { tags: o }), this.persistScroll(), this.render();
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
  async promptInput(t, e, a = "") {
    return new Promise((s) => {
      new Dialog({
        title: t,
        content: `
          <form>
            <div class="form-group">
              <label>${e}</label>
              <input type="text" name="input" value="${a}" autofocus style="width: 100%;">
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
    this.filterState.selectedPlaylistId === e ? this.filterState.selectedPlaylistId = null : this.filterState.selectedPlaylistId = e, this.render(), l.debug("Select playlist:", e);
  }
  onPlaylistMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation(), $(t.currentTarget).data("playlist-id");
    const e = $(t.currentTarget).closest(".ase-list-item"), a = new MouseEvent("contextmenu", {
      bubbles: !0,
      cancelable: !0,
      view: window,
      clientX: t.clientX,
      clientY: t.clientY
    });
    (s = e[0]) == null || s.dispatchEvent(a);
  }
  onTogglePlaylistQueue(t) {
    var r, n, o;
    t.preventDefault(), t.stopPropagation();
    const e = String($(t.currentTarget).data("playlist-id")), a = this.library.playlists.getPlaylist(e);
    if (!a || !((r = window.ASE) != null && r.queue)) {
      l.warn("Cannot toggle playlist queue: playlist or queue not available");
      return;
    }
    if (window.ASE.queue.getItems().some((c) => c.playlistId === e))
      window.ASE.queue.getItems().filter((u) => u.playlistId === e).forEach((u) => window.ASE.queue.removeItem(u.id)), (n = ui.notifications) == null || n.info(`Removed "${a.name}" from queue`);
    else {
      const c = a.items.map((u) => (this.library.getItem(u.libraryItemId), {
        libraryItemId: u.libraryItemId,
        group: u.group || "music",
        volume: u.volume,
        loop: u.loop
      })).filter((u) => u.libraryItemId);
      window.ASE.queue.addPlaylist(e, c), (o = ui.notifications) == null || o.info(`Added "${a.name}" (${a.items.length} tracks) to queue`);
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
    const a = await this.promptPlaylistName(e.name);
    !a || a === e.name || (this.library.playlists.updatePlaylist(t, { name: a }), this.persistScroll(), this.render(), (s = ui.notifications) == null || s.info(`Renamed playlist to "${a}"`));
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
            callback: (a) => {
              const s = a.find('[name="playlistName"]').val();
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
      const a = $(e.currentTarget).find("[data-item-id]").first().data("item-id");
      e.originalEvent.dataTransfer.effectAllowed = "copy", e.originalEvent.dataTransfer.setData("text/plain", a), $(e.currentTarget).addClass("dragging");
    }), t.find('.ase-track-player-item[draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragover", (e) => {
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "copy", $(e.currentTarget).addClass("drag-over");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragleave", (e) => {
      $(e.currentTarget).removeClass("drag-over");
    }), t.find(".ase-list-item[data-playlist-id]").on("drop", async (e) => {
      e.preventDefault();
      const a = e.originalEvent.dataTransfer.getData("text/plain"), s = $(e.currentTarget).data("playlist-id");
      $(e.currentTarget).removeClass("drag-over");
      const r = e.originalEvent.dataTransfer.getData("application/x-playlist-id");
      if (r && r !== s) {
        await this.handlePlaylistReorder(r, s);
        return;
      }
      await this.handleDropTrackToPlaylist(a, s);
    }), t.find('.ase-list-item[data-playlist-id][draggable="true"]').on("dragstart", (e) => {
      const a = String($(e.currentTarget).data("playlist-id"));
      e.originalEvent.dataTransfer.effectAllowed = "move", e.originalEvent.dataTransfer.setData("application/x-playlist-id", a), $(e.currentTarget).addClass("dragging");
    }), t.find('.ase-list-item[data-playlist-id][draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging"), t.find(".ase-list-item").removeClass("drag-over drag-above drag-below");
    }), t.find('.ase-favorite-item[draggable="true"]').on("dragstart", (e) => {
      const a = String($(e.currentTarget).data("favorite-id")), s = String($(e.currentTarget).data("favorite-type"));
      e.originalEvent.dataTransfer.effectAllowed = "move", e.originalEvent.dataTransfer.setData("application/x-favorite-id", a), e.originalEvent.dataTransfer.setData("application/x-favorite-type", s), $(e.currentTarget).addClass("dragging");
    }), t.find('.ase-favorite-item[draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging"), t.find(".ase-favorite-item").removeClass("drag-over drag-above drag-below");
    }), t.find(".ase-list-item[data-playlist-id]").on("dragover", (e) => {
      if (!e.originalEvent.dataTransfer.types.includes("application/x-playlist-id")) return;
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "move";
      const s = e.currentTarget.getBoundingClientRect(), r = s.top + s.height / 2, n = e.clientY < r;
      $(e.currentTarget).removeClass("drag-above drag-below"), $(e.currentTarget).addClass(n ? "drag-above" : "drag-below");
    }), t.find(".ase-favorite-item").on("dragover", (e) => {
      if (!e.originalEvent.dataTransfer.types.includes("application/x-favorite-id")) return;
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "move";
      const s = e.currentTarget.getBoundingClientRect(), r = s.top + s.height / 2, n = e.clientY < r;
      $(e.currentTarget).removeClass("drag-above drag-below"), $(e.currentTarget).addClass(n ? "drag-above" : "drag-below");
    }), t.find(".ase-favorite-item").on("drop", async (e) => {
      e.preventDefault();
      const a = String($(e.currentTarget).data("favorite-id")), s = String($(e.currentTarget).data("favorite-type"));
      $(e.currentTarget).removeClass("drag-above drag-below dragging");
      const r = e.originalEvent.dataTransfer.getData("application/x-favorite-id"), n = e.originalEvent.dataTransfer.getData("application/x-favorite-type");
      r && n && (r !== a || n !== s) && await this.handleFavoriteReorder(r, n, a, s);
    }), t.find(".ase-content-area").on("dragover", (e) => {
      e.preventDefault(), $(e.currentTarget).addClass("drag-over-import");
    }), t.find(".ase-content-area").on("dragleave", (e) => {
      $(e.currentTarget).removeClass("drag-over-import");
    }), t.find(".ase-content-area").on("drop", async (e) => {
      var s, r, n, o;
      e.preventDefault(), $(e.currentTarget).removeClass("drag-over-import");
      const a = (r = (s = e.originalEvent) == null ? void 0 : s.dataTransfer) == null ? void 0 : r.files;
      if (a && a.length > 0) {
        if (l.debug(`Dropped ${a.length} files from OS`), ((o = (n = e.originalEvent) == null ? void 0 : n.dataTransfer) == null ? void 0 : o.getData("text/plain")) && !a.length)
          return;
        await this.handleFileUpload(a);
      }
    });
  }
  async handlePlaylistReorder(t, e) {
    const a = this.library.playlists.getAllPlaylists(), s = a.findIndex((o) => o.id === t), r = a.findIndex((o) => o.id === e);
    if (s === -1 || r === -1) return;
    const [n] = a.splice(s, 1);
    a.splice(r, 0, n), this.library.playlists.reorderPlaylists(a.map((o) => o.id)), this.render(), l.debug(`Reordered playlist ${t} to position ${r}`);
  }
  async handleFavoriteReorder(t, e, a, s) {
    const r = this.library.getOrderedFavorites(), n = r.findIndex((u) => u.id === t && u.type === e), o = r.findIndex((u) => u.id === a && u.type === s);
    if (n === -1 || o === -1) return;
    const [c] = r.splice(n, 1);
    r.splice(o, 0, c), this.library.reorderFavorites(r), this.render(), l.debug(`Reordered favorite ${t} to position ${o}`);
  }
  async handleFileUpload(t) {
    var o, c, u, f, p;
    if (!((o = game.user) != null && o.isGM)) {
      (c = ui.notifications) == null || c.warn("Only GM can upload files.");
      return;
    }
    const e = Array.from(t).filter((m) => {
      var y;
      const g = (y = m.name.split(".").pop()) == null ? void 0 : y.toLowerCase();
      return ["mp3", "ogg", "wav", "flac", "webm", "m4a", "aac"].includes(g || "");
    });
    if (e.length === 0) {
      (u = ui.notifications) == null || u.warn("No valid audio files found. Supported formats: mp3, ogg, wav, flac, webm, m4a, aac");
      return;
    }
    const a = "data", s = "ase_audio";
    try {
      await FilePicker.createDirectory(a, s, {});
    } catch (m) {
      l.debug("Directory creation skipped (might already exist):", m);
    }
    let r = 0, n = 0;
    for (const m of e)
      try {
        const g = await FilePicker.upload(a, s, m, {});
        if (g.path) {
          const y = this.detectChannelFromFilename(m.name), T = Array.from(this.filterState.selectedTags), v = await this.library.addItem(
            g.path,
            m.name.split(".")[0],
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
        l.error(`Failed to upload ${m.name}:`, g), n++;
      }
    if (r > 0) {
      const m = this.filterState.selectedPlaylistId ? " and added to active playlist" : "";
      (f = ui.notifications) == null || f.info(`Imported ${r} file(s)${m}`), this.render();
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
    var r, n, o;
    const a = this.library.getItem(t), s = this.library.playlists.getPlaylist(e);
    if (!a || !s) {
      (r = ui.notifications) == null || r.error("Track or playlist not found");
      return;
    }
    try {
      const c = this.inferGroupFromTags(a.tags);
      this.library.playlists.addTrackToPlaylist(e, t, c), this.render(), (n = ui.notifications) == null || n.info(`Added "${a.name}" to "${s.name}"`);
    } catch (c) {
      l.error("Failed to add track to playlist:", c);
      const u = c instanceof Error ? c.message : "Unknown error";
      (o = ui.notifications) == null || o.error(`Failed to add to playlist: ${u}`);
    }
  }
  /**
   * Setup drag-and-drop handler for Foundry native playlists
   * Allows dragging PlaylistSound items into ASE library
   */
  setupFoundryDragDrop(t) {
    const e = t.find(".ase-track-player-list");
    e.length && (e.on("dragover", (a) => {
      a.preventDefault(), a.originalEvent.dataTransfer.dropEffect = "copy", e.addClass("drag-over");
    }), e.on("dragleave", (a) => {
      a.currentTarget === a.target && e.removeClass("drag-over");
    }), e.on("drop", async (a) => {
      a.preventDefault(), e.removeClass("drag-over"), await this.handleFoundryPlaylistDrop(a.originalEvent);
    }));
  }
  /**
   * Handle drop event from Foundry playlist
   * Routes to appropriate handler based on type (single track vs full playlist)
   */
  async handleFoundryPlaylistDrop(t) {
    var e;
    try {
      const a = TextEditor.getDragEventData(t);
      if (!a) {
        l.debug("No drag data found, ignoring");
        return;
      }
      l.debug("Foundry drop detected:", a.type), a.type === "PlaylistSound" ? await this.handlePlaylistSoundImport(a) : a.type === "Playlist" ? await this.handlePlaylistImport(a) : l.debug(`Unsupported drop type: ${a.type}`);
    } catch (a) {
      l.error("Failed to handle Foundry playlist drop:", a), (e = ui.notifications) == null || e.error("Failed to import track from playlist");
    }
  }
  /**
   * Import single PlaylistSound track
   */
  async handlePlaylistSoundImport(t) {
    var u, f, p, m, g, y, T;
    const e = await fromUuid(t.uuid);
    if (!e) {
      (u = ui.notifications) == null || u.error("Failed to resolve playlist sound");
      return;
    }
    const a = e.path || ((f = e.sound) == null ? void 0 : f.path), s = e.name;
    if (!a) {
      (p = ui.notifications) == null || p.error("Playlist sound has no audio file path");
      return;
    }
    if (this.library.findByUrl(a)) {
      (m = ui.notifications) == null || m.warn(`Track "${s}" already exists in library`);
      return;
    }
    const n = this.mapFoundryChannelToASE(e.channel), o = Array.from(this.filterState.selectedTags), c = await this.library.addItem(a, s, n, o);
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
    var e, a, s, r, n;
    try {
      const o = await fromUuid(t.uuid);
      if (!o) {
        (e = ui.notifications) == null || e.error("Failed to resolve Foundry playlist");
        return;
      }
      l.info(`Importing Foundry playlist: ${o.name} (${o.sounds.size} tracks)`);
      const c = this.generateUniquePlaylistName(o.name), u = this.library.playlists.createPlaylist(c);
      let f = 0, p = 0;
      for (const g of o.sounds) {
        const y = g.path || ((a = g.sound) == null ? void 0 : a.path);
        if (!y) {
          l.warn(`Skipping sound "${g.name}" - no path`);
          continue;
        }
        const T = g.channel || o.channel;
        let v = "music";
        T === "environment" ? v = "ambience" : T === "interface" ? v = "sfx" : (T === "music" || !T) && (v = "music");
        let I = (s = this.library.findByUrl(y)) == null ? void 0 : s.id;
        if (I)
          p++;
        else
          try {
            const b = Array.from(this.filterState.selectedTags);
            I = (await this.library.addItem(y, g.name, v, b)).id, f++;
          } catch (b) {
            l.error(`Failed to add track "${g.name}":`, b);
            continue;
          }
        this.library.playlists.addTrackToPlaylist(u.id, I, v);
      }
      const m = `Imported playlist "${c}": ${f} new tracks${p > 0 ? `, ${p} already in library` : ""}`;
      (r = ui.notifications) == null || r.info(m), this.render();
    } catch (o) {
      l.error("Failed to import Foundry playlist:", o), (n = ui.notifications) == null || n.error("Failed to import playlist");
    }
  }
  resolveFoundryChannel(t, e) {
    var s;
    const a = t.channel || ((s = t.fadeIn) == null ? void 0 : s.type) || e.channel || e.mode;
    return this.mapFoundryChannelToASE(a);
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
    const e = this.library.playlists.getAllPlaylists(), a = new Set(e.map((r) => r.name));
    if (!a.has(t)) return t;
    let s = 2;
    for (; a.has(`${t} (${s})`); )
      s++;
    return `${t} (${s})`;
  }
  async removeTrackFromPlaylist(t, e) {
    var a, s;
    try {
      this.library.playlists.removeLibraryItemFromPlaylist(t, e), this.render(), (a = ui.notifications) == null || a.info("Removed track from playlist");
    } catch (r) {
      l.error("Failed to remove track from playlist:", r), (s = ui.notifications) == null || s.error("Failed to remove track from playlist");
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
            const o = this.library.toggleFavorite(s);
            this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(o ? "Added to favorites" : "Removed from favorites");
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
    const a = await this.promptTextInput("Edit Track Name", "Track Name", e.name);
    if (!(!a || a === e.name))
      try {
        this.library.updateItem(t, { name: a }), this.persistScroll(), this.render(), (r = ui.notifications) == null || r.info(`Renamed to: ${a}`);
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
    const a = await this.promptTextInput(
      "Edit Tags",
      "Tags (comma-separated)",
      e.tags.join(", ")
    );
    if (a === null) return;
    const s = a.split(",").map((c) => c.trim()).filter((c) => c.length > 0);
    try {
      this.library.updateItem(t, { tags: s }), this.persistScroll(), this.render(), (n = ui.notifications) == null || n.info("Tags updated");
    } catch (c) {
      l.error("Failed to update tags:", c), (o = ui.notifications) == null || o.error("Failed to update tags");
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
    const a = await this.promptTextInput("Rename Playlist", "Playlist Name", e.name);
    if (!(!a || a === e.name))
      try {
        this.library.playlists.updatePlaylist(t, { name: a }), this.render(), (r = ui.notifications) == null || r.info(`Renamed to: ${a}`);
      } catch (o) {
        l.error("Failed to rename playlist:", o);
        const c = o instanceof Error ? o.message : "Unknown error";
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
    const a = await this.promptTextInput(
      "Edit Description",
      "Description",
      e.description || ""
    );
    if (a !== null)
      try {
        this.library.playlists.updatePlaylist(t, { description: a || void 0 }), this.render(), (r = ui.notifications) == null || r.info("Description updated");
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
    const a = e.items.sort((n, o) => n.order - o.order).map((n, o) => {
      const c = this.library.getItem(n.libraryItemId), u = (c == null ? void 0 : c.name) || "Unknown";
      return `<li><strong>${o + 1}.</strong> ${u}</li>`;
    }).join(""), s = `
      <div>
        <p><strong>${e.name}</strong></p>
        ${e.description ? `<p><em>${e.description}</em></p>` : ""}
        <p>Total tracks: ${e.items.length}</p>
        ${e.items.length > 0 ? `<ul class="playlist-contents-list">${a}</ul>` : "<p>No tracks in playlist</p>"}
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
        [...e.items.map((u) => u.id)].forEach((u) => {
          try {
            this.library.playlists.removeTrackFromPlaylist(t, u);
          } catch (f) {
            l.error("Failed to remove item:", f);
          }
        }), this.render(), (n = ui.notifications) == null || n.info(`Cleared playlist: ${e.name}`);
      } catch (c) {
        l.error("Failed to clear playlist:", c), (o = ui.notifications) == null || o.error("Failed to clear playlist");
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
    var a, s;
    const e = await this.promptTextInput("Rename Tag", "New Tag Name", t);
    if (!(!e || e === t))
      try {
        const r = this.library.getAllItems().filter((n) => n.tags.includes(t));
        r.forEach((n) => {
          const o = n.tags.map((c) => c === t ? e : c);
          this.library.updateItem(n.id, { tags: o });
        }), this.filterState.selectedTags.has(t) && (this.filterState.selectedTags.delete(t), this.filterState.selectedTags.add(e)), this.render(), (a = ui.notifications) == null || a.info(`Renamed tag "${t}" to "${e}" in ${r.length} track(s)`);
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
          const o = n.tags.filter((c) => c !== t);
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
      (a) => `<option value="${a.id}">${a.name} (${a.items.length} tracks)</option>`
    ).join("");
    return new Promise((a) => {
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
              a(r || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => a(null)
          }
        },
        default: "add"
      }).render(!0);
    });
  }
  async promptTextInput(t, e, a = "") {
    return new Promise((s) => {
      new Dialog({
        title: t,
        content: `
          <form>
            <div class="form-group">
              <label>${e}:</label>
              <input type="text" name="text-input" value="${a}" autofocus />
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
    const a = this.library.playlists.getAllPlaylists();
    if (a.length === 0) {
      (r = ui.notifications) == null || r.warn("No playlists available. Create one first.");
      return;
    }
    const s = await this.promptPlaylistSelection(a);
    if (s)
      try {
        const c = this.inferGroupFromTags(e.tags);
        this.library.playlists.addTrackToPlaylist(s, t, c), this.render(), (n = ui.notifications) == null || n.info(`Added "${e.name}" to playlist`);
      } catch (c) {
        l.error("Failed to add track to playlist:", c);
        const u = c instanceof Error ? c.message : "Unknown error";
        (o = ui.notifications) == null || o.error(`Failed to add to playlist: ${u}`);
      }
  }
}
function O(d, i) {
  let t = 0, e = null;
  return function(...a) {
    const s = Date.now(), r = i - (s - t);
    r <= 0 ? (e && (clearTimeout(e), e = null), t = s, d.apply(this, a)) : e || (e = setTimeout(() => {
      t = Date.now(), e = null, d.apply(this, a);
    }, r));
  };
}
function rt(d, i) {
  let t = null;
  return function(...e) {
    t && clearTimeout(t), t = setTimeout(() => {
      d.apply(this, e);
    }, i);
  };
}
const Y = "advanced-sound-engine";
function nt() {
  var d;
  return ((d = game.settings) == null ? void 0 : d.get(Y, "maxSimultaneousTracks")) || 8;
}
class ot extends Application {
  constructor(t, e, a) {
    super(a);
    h(this, "engine");
    h(this, "socket");
    h(this, "updateInterval", null);
    this.engine = t, this.socket = e;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-sound-mixer",
      title: "Sound Mixer (GM)",
      template: `modules/${Y}/templates/mixer.hbs`,
      classes: ["ase-mixer"],
      width: 550,
      height: "auto",
      resizable: !0,
      minimizable: !0,
      popOut: !0
    });
  }
  getData() {
    const t = this.engine.getAllTracks().map((s) => this.getTrackViewData(s)), e = this.engine.volumes, a = t.filter((s) => s.isPlaying).length;
    return {
      tracks: t,
      volumes: {
        master: Math.round(e.master * 100),
        music: Math.round(e.music * 100),
        ambience: Math.round(e.ambience * 100),
        sfx: Math.round(e.sfx * 100)
      },
      playingCount: a,
      maxSimultaneous: nt(),
      syncEnabled: this.socket.syncEnabled
    };
  }
  getTrackViewData(t) {
    const e = t.getState(), a = t.getCurrentTime(), s = t.getDuration();
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
      currentTime: a,
      currentTimeFormatted: L(a),
      duration: s,
      durationFormatted: L(s),
      progress: s > 0 ? a / s * 100 : 0
    };
  }
  extractFileName(t) {
    if (!t) return "Unknown";
    try {
      const a = decodeURIComponent(t).split("/");
      return a[a.length - 1].replace(/\.[^.]+$/, "");
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
    const e = O((n, o) => {
      n === "master" ? this.socket.broadcastChannelVolume("master", o) : this.socket.broadcastChannelVolume(n, o);
    }, 50);
    t.find(".ase-channel-slider").on("input", (n) => {
      const o = $(n.currentTarget).data("channel"), c = parseFloat(n.target.value) / 100;
      o === "master" ? this.engine.setMasterVolume(c) : this.engine.setChannelVolume(o, c), e(o, c), $(n.currentTarget).siblings(".ase-channel-value").text(`${Math.round(c * 100)}%`);
    }), t.find("#ase-add-track").on("click", () => this.onAddTrack());
    const a = t.find(".ase-tracks");
    a.on("click", ".ase-btn-play", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(o);
    }), a.on("click", ".ase-btn-pause", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(o);
    }), a.on("click", ".ase-btn-stop", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(o);
    }), a.on("click", ".ase-btn-remove", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(o);
    }), a.on("change", ".ase-loop-toggle", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id"), c = n.target.checked;
      this.engine.setTrackLoop(o, c), this.socket.broadcastTrackLoop(o, c);
    }), a.on("change", ".ase-channel-select", (n) => {
      const o = $(n.currentTarget).data("track-id"), c = n.target.value;
      this.engine.setTrackChannel(o, c);
    });
    const s = O((n, o) => {
      this.socket.broadcastTrackVolume(n, o);
    }, 50);
    a.on("input", ".ase-volume-slider", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id"), c = parseFloat(n.target.value) / 100;
      this.engine.setTrackVolume(o, c), s(o, c), $(n.currentTarget).siblings(".ase-volume-value").text(`${Math.round(c * 100)}%`);
    });
    const r = O((n, o) => {
      const c = this.engine.getTrack(n), u = (c == null ? void 0 : c.state) === "playing";
      this.engine.seekTrack(n, o), this.socket.broadcastTrackSeek(n, o, u ?? !1);
    }, 100);
    a.on("input", ".ase-seek-slider", (n) => {
      const o = $(n.currentTarget).closest(".ase-track").data("track-id"), c = this.engine.getTrack(o);
      if (c) {
        const f = parseFloat(n.target.value) / 100 * c.getDuration();
        r(o, f);
      }
    }), t.find("#ase-stop-all").on("click", () => {
      this.engine.stopAll(), this.socket.broadcastStopAll(), this.render();
    }), this.startUpdates();
  }
  updateSyncIndicator(t, e) {
    const a = t.find(".ase-sync-status");
    a.toggleClass("is-active", e), a.find("span").text(e ? "SYNC ON" : "SYNC OFF");
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
      const n = s.getCurrentTime(), o = s.getDuration(), c = o > 0 ? n / o * 100 : 0, u = s.state;
      u === "playing" && e++, r.find(".ase-time-current").text(L(n));
      const f = r.find(".ase-seek-slider");
      f.is(":active") || f.val(c), r.removeClass("is-playing is-paused is-stopped is-loading"), r.addClass(`is-${u}`), r.find(".ase-btn-play").prop("disabled", u === "playing" || u === "loading"), r.find(".ase-btn-pause").prop("disabled", u !== "playing"), r.find(".ase-btn-stop").prop("disabled", u === "stopped");
    }
    const a = this.engine.getAllTracks().length;
    t.find(".ase-track-count").text(`${e}/${a} playing`);
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
    const a = F();
    try {
      await this.engine.createTrack({
        id: a,
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
    const a = e.state === "paused" ? e.getCurrentTime() : 0;
    await this.engine.playTrack(t, a), this.socket.broadcastTrackPlay(t, a);
  }
  onPauseTrack(t) {
    const e = this.engine.getTrack(t);
    if (!e) return;
    const a = e.getCurrentTime();
    this.engine.pauseTrack(t), this.socket.broadcastTrackPause(t, a);
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
const z = "advanced-sound-engine";
class lt extends Application {
  constructor(t, e, a, s = {}) {
    super(s);
    h(this, "engine");
    h(this, "socket");
    h(this, "libraryManager");
    // Sub-apps (Controllers)
    h(this, "libraryApp");
    h(this, "mixerApp");
    // We might need to refactor this later, but for now we'll wrap it
    h(this, "state", {
      activeTab: "library",
      // Default to library as per user focus
      syncEnabled: !1
    });
    h(this, "persistScrollOnce", !1);
    h(this, "_scrollLibrary", { tracks: 0, playlists: 0, favorites: 0 });
    this.engine = t, this.socket = e, this.libraryManager = a, this.libraryApp = new st(this.libraryManager, this), this.mixerApp = new ot(this.engine, this.socket);
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "advanced-sound-engine-app",
      title: "Advanced Sound Engine",
      template: `modules/${z}/templates/main-app.hbs`,
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
      const o = n.some((u) => u.state === "playing"), c = n.some((u) => u.state === "paused");
      return { playing: o, paused: c && !o };
    }, a = {
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
      s = await renderTemplate(`modules/${z}/templates/mixer.hbs`, r);
    }
    return {
      activeTab: this.state.activeTab,
      tabContent: s,
      status: a,
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
      const a = this.element.find(".ase-track-player-list").scrollTop() || 0;
      a > 0 && (this._scrollLibrary.tracks = a), this._scrollLibrary.playlists = this.element.find(".ase-list-group").first().scrollTop() || 0, this._scrollLibrary.favorites = this.element.find(".ase-favorites-section .ase-list-group").scrollTop() || 0;
    }
    if (await super._render(t, e), this.state.activeTab === "library") {
      const a = this.element;
      a && a.length && (this.persistScrollOnce ? (a.find(".ase-track-player-list").scrollTop(this._scrollLibrary.tracks), a.find(".ase-list-group").first().scrollTop(this._scrollLibrary.playlists), a.find(".ase-favorites-section .ase-list-group").scrollTop(this._scrollLibrary.favorites), this.persistScrollOnce = !1) : (a.find(".ase-track-player-list").scrollTop(0), a.find(".ase-list-group").first().scrollTop(0), a.find(".ase-favorites-section .ase-list-group").scrollTop(0)));
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
    const e = t.currentTarget, a = parseFloat(e.value) / 100, s = $(e).data("channel");
    s ? (this.engine.setChannelVolume(s, a), this.socket.broadcastChannelVolume(s, a)) : (this.engine.setMasterVolume(a), this.socket.broadcastChannelVolume("master", a)), $(e).siblings(".ase-percentage").text(`${Math.round(a * 100)}%`), $(e).siblings(".ase-master-perc").text(`${Math.round(a * 100)}%`);
  }
}
class ct {
  constructor(i) {
    h(this, "playlists", /* @__PURE__ */ new Map());
    h(this, "onChangeCallback");
    this.onChangeCallback = i;
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
  createPlaylist(i, t) {
    if (this.findByName(i))
      throw new Error(`Playlist with name "${i}" already exists`);
    const a = Date.now(), s = {
      id: F(),
      name: i,
      description: t,
      items: [],
      createdAt: a,
      updatedAt: a,
      favorite: !1
    };
    return this.playlists.set(s.id, s), this.notifyChange(), l.info(`Playlist created: ${s.name} (${s.id})`), s;
  }
  /**
   * Update playlist metadata
   */
  updatePlaylist(i, t) {
    const e = this.playlists.get(i);
    if (!e)
      throw new Error(`Playlist not found: ${i}`);
    if (t.name && t.name !== e.name) {
      const s = this.findByName(t.name);
      if (s && s.id !== i)
        throw new Error(`Playlist with name "${t.name}" already exists`);
    }
    const a = {
      ...e,
      ...t,
      updatedAt: Date.now()
    };
    return this.playlists.set(i, a), this.notifyChange(), l.info(`Playlist updated: ${a.name}`), a;
  }
  /**
   * Delete playlist
   */
  deletePlaylist(i) {
    const t = this.playlists.get(i);
    if (!t)
      throw new Error(`Playlist not found: ${i}`);
    this.playlists.delete(i), this.notifyChange(), l.info(`Playlist deleted: ${t.name}`);
  }
  /**
   * Get playlist by ID
   */
  getPlaylist(i) {
    return this.playlists.get(i);
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
  findByName(i) {
    return Array.from(this.playlists.values()).find((t) => t.name === i);
  }
  /**
   * Get favorite playlists
   */
  getFavoritePlaylists() {
    return this.getAllPlaylists().filter((i) => i.favorite);
  }
  /**
   * Reorder playlists based on new order array of IDs
   */
  reorderPlaylists(i) {
    const t = /* @__PURE__ */ new Map();
    i.forEach((e) => {
      const a = this.playlists.get(e);
      a && t.set(e, a);
    }), this.playlists.forEach((e, a) => {
      t.has(a) || t.set(a, e);
    }), this.playlists = t, this.notifyChange(), l.info("Playlists reordered");
  }
  /**
   * Toggle playlist favorite status
   */
  togglePlaylistFavorite(i) {
    const t = this.getPlaylist(i);
    if (!t)
      throw new Error(`Playlist not found: ${i}`);
    return t.favorite = !t.favorite, t.updatedAt = Date.now(), this.notifyChange(), t.favorite;
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations - Playlist Items
  // ─────────────────────────────────────────────────────────────
  /**
   * Add track to playlist
   */
  addTrackToPlaylist(i, t, e, a) {
    const s = this.getPlaylist(i);
    if (!s)
      throw new Error(`Playlist not found: ${i}`);
    if (s.items.find((o) => o.libraryItemId === t))
      throw new Error("Track already exists in this playlist");
    const n = {
      id: F(),
      libraryItemId: t,
      group: e,
      volume: (a == null ? void 0 : a.volume) ?? 1,
      loop: (a == null ? void 0 : a.loop) ?? !1,
      order: s.items.length,
      fadeIn: a == null ? void 0 : a.fadeIn,
      fadeOut: a == null ? void 0 : a.fadeOut
    };
    return s.items.push(n), s.updatedAt = Date.now(), this.notifyChange(), l.debug(`Track added to playlist ${s.name}: ${t}`), n;
  }
  /**
   * Remove track from playlist
   */
  removeTrackFromPlaylist(i, t) {
    const e = this.getPlaylist(i);
    if (!e)
      throw new Error(`Playlist not found: ${i}`);
    const a = e.items.findIndex((s) => s.id === t);
    if (a === -1)
      throw new Error(`Playlist item not found: ${t}`);
    e.items.splice(a, 1), this.reorderPlaylistItems(e), e.updatedAt = Date.now(), this.notifyChange(), l.debug(`Track removed from playlist ${e.name}`);
  }
  /**
   * Remove all tracks with specific library item ID from playlist
   */
  removeLibraryItemFromPlaylist(i, t) {
    const e = this.getPlaylist(i);
    if (!e)
      throw new Error(`Playlist not found: ${i}`);
    const a = e.items.length;
    e.items = e.items.filter((r) => r.libraryItemId !== t);
    const s = a - e.items.length;
    return s > 0 && (this.reorderPlaylistItems(e), e.updatedAt = Date.now(), this.notifyChange(), l.debug(`Removed ${s} instances of library item ${t} from playlist ${e.name}`)), s;
  }
  /**
   * Remove library item from all playlists
   */
  removeLibraryItemFromAllPlaylists(i) {
    let t = 0;
    return this.playlists.forEach((e) => {
      const a = e.items.length;
      e.items = e.items.filter((r) => r.libraryItemId !== i);
      const s = a - e.items.length;
      s > 0 && (this.reorderPlaylistItems(e), e.updatedAt = Date.now(), t += s);
    }), t > 0 && (this.notifyChange(), l.info(`Removed library item ${i} from ${t} playlist(s)`)), t;
  }
  /**
   * Update playlist item
   */
  updatePlaylistItem(i, t, e) {
    const a = this.getPlaylist(i);
    if (!a)
      throw new Error(`Playlist not found: ${i}`);
    const s = a.items.find((r) => r.id === t);
    if (!s)
      throw new Error(`Playlist item not found: ${t}`);
    return Object.assign(s, e), a.updatedAt = Date.now(), this.notifyChange(), l.debug(`Playlist item updated in ${a.name}`), s;
  }
  /**
   * Reorder track in playlist
   */
  reorderTrack(i, t, e) {
    const a = this.getPlaylist(i);
    if (!a)
      throw new Error(`Playlist not found: ${i}`);
    const s = a.items.findIndex((n) => n.id === t);
    if (s === -1)
      throw new Error(`Playlist item not found: ${t}`);
    if (e < 0 || e >= a.items.length)
      throw new Error(`Invalid order: ${e}`);
    const [r] = a.items.splice(s, 1);
    a.items.splice(e, 0, r), this.reorderPlaylistItems(a), a.updatedAt = Date.now(), this.notifyChange(), l.debug(`Track reordered in playlist ${a.name}`);
  }
  /**
   * Get tracks in playlist
   */
  getPlaylistTracks(i) {
    const t = this.getPlaylist(i);
    if (!t)
      throw new Error(`Playlist not found: ${i}`);
    return [...t.items].sort((e, a) => e.order - a.order);
  }
  /**
   * Get playlists containing a specific library item
   */
  getPlaylistsContainingItem(i) {
    return this.getAllPlaylists().filter(
      (t) => t.items.some((e) => e.libraryItemId === i)
    );
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  /**
   * Load playlists from state object
   */
  load(i) {
    this.playlists.clear(), Object.values(i).forEach((t) => {
      t.items.sort((e, a) => e.order - a.order), this.playlists.set(t.id, t);
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
  reorderPlaylistItems(i) {
    i.items.forEach((t, e) => {
      t.order = e;
    });
  }
  /**
   * Get statistics
   */
  getStats() {
    const i = this.getAllPlaylists();
    return {
      totalPlaylists: i.length,
      favoritePlaylists: i.filter((t) => t.favorite).length,
      totalTracks: i.reduce((t, e) => t + e.items.length, 0),
      averageTracksPerPlaylist: i.length > 0 ? Math.round(i.reduce((t, e) => t + e.items.length, 0) / i.length) : 0
    };
  }
  /**
   * Clear all playlists
   */
  clear() {
    this.playlists.clear(), l.warn("All playlists cleared");
  }
}
const dt = "advanced-sound-engine";
class C {
  /**
   * Load library state from global JSON file
   */
  static async load() {
    try {
      const i = await fetch(`${this.FILE_PATH}?t=${Date.now()}`);
      if (!i.ok)
        return l.info("No existing library file found"), null;
      const t = await i.json();
      return l.info("Loaded library from global storage"), t;
    } catch (i) {
      return l.warn("Failed to load global library:", i), null;
    }
  }
  /**
   * Save library state to global JSON file
   */
  static async save(i) {
    var t;
    try {
      await this.ensureDirectory();
      const e = JSON.stringify(i, null, 2), a = new Blob([e], { type: "application/json" }), s = new File([a], "library.json", { type: "application/json" }), r = (t = ui.notifications) == null ? void 0 : t.info;
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
      l.info("Saved library to global storage");
    } catch (e) {
      throw l.error("Failed to save library to global storage:", e), e;
    }
  }
  /**
   * Ensure the module directory exists
   */
  static async ensureDirectory() {
    try {
      await FilePicker.createDirectory(this.FILE_SOURCE, this.DIRECTORY, {});
    } catch {
      l.debug("Directory creation skipped (may already exist)");
    }
  }
  /**
   * Migrate data from world-scoped game.settings to global storage
   */
  static async migrateFromWorldSettings() {
    var i, t;
    try {
      const e = await this.load(), a = e != null && e.items ? Array.isArray(e.items) ? e.items.length : Object.keys(e.items).length : 0;
      if (e && e.items && a > 0)
        return l.info("Global storage already populated, skipping migration"), !1;
      const s = await ((i = game.settings) == null ? void 0 : i.get(dt, "libraryState"));
      if (!s || s === "")
        return l.info("No world-scoped data to migrate"), !1;
      const r = JSON.parse(s);
      if (!r.items || (Array.isArray(r.items) ? r.items.length === 0 : Object.keys(r.items).length === 0))
        return l.info("World-scoped data is empty, skipping migration"), !1;
      await this.save(r);
      const n = Array.isArray(r.items) ? r.items.length : Object.keys(r.items).length;
      return l.info(`Migrated ${n} items from world settings to global storage`), (t = ui.notifications) == null || t.info(`ASE: Library migrated to global storage (${n} tracks)`), !0;
    } catch (e) {
      return l.error("Migration from world settings failed:", e), !1;
    }
  }
  /**
   * Delete a physical file from disk
   * Shows manual deletion instructions since automatic deletion is unreliable
   */
  static async deletePhysicalFile(i) {
    var a, s;
    if (!this.isOurFile(i))
      return l.warn("Cannot delete file not in ase_audio folder:", i), !1;
    if (!((a = game.user) != null && a.isGM))
      return (s = ui.notifications) == null || s.warn("Only GM can delete files"), !1;
    let t = i.replace(/\\/g, "/");
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
  static isOurFile(i) {
    const t = i.replace(/\\/g, "/").toLowerCase();
    return t.includes("ase_audio/") || t.includes("/ase_audio/") || t.endsWith("ase_audio");
  }
}
h(C, "FILE_PATH", "ase_library/library.json"), h(C, "FILE_SOURCE", "data"), h(C, "DIRECTORY", "ase_library");
const G = 1;
class ut {
  constructor() {
    h(this, "items", /* @__PURE__ */ new Map());
    h(this, "customTags", /* @__PURE__ */ new Set());
    h(this, "favoritesOrder", []);
    h(this, "saveScheduled", !1);
    h(this, "playlists");
    // New property to track if we've initiated a scan this session
    h(this, "hasScannedDurations", !1);
    h(this, "debouncedSave", rt(() => {
      this.saveToSettings();
    }, 500));
    this.playlists = new ct(() => this.scheduleSave()), this.loadFromSettings().catch((i) => l.error("Failed initial load:", i));
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add new item to library
   */
  async addItem(i, t, e = "music", a = []) {
    const s = R(i);
    if (!s.valid)
      throw new Error(s.error || "Invalid audio file");
    const r = t || this.extractNameFromUrl(i), n = this.findByUrl(i);
    if (n)
      throw new Error(`Track with this URL already exists: ${n.name}`);
    if (this.findByName(r))
      throw new Error(`Track with name "${r}" already exists in library`);
    const c = Date.now(), u = {
      id: F(),
      url: i,
      name: r,
      tags: a,
      group: e,
      duration: 0,
      favorite: !1,
      addedAt: c,
      updatedAt: c
    }, f = new Audio(i);
    return f.addEventListener("loadedmetadata", () => {
      f.duration && isFinite(f.duration) && (u.duration = Math.round(f.duration), this.scheduleSave(), l.info(`Updated duration for ${u.name}: ${u.duration}s`));
    }), f.addEventListener("error", (p) => {
      l.warn(`Failed to extract duration for ${u.name}:`, p);
    }), this.items.set(u.id, u), this.scheduleSave(), l.info(`Library item added: ${u.name} (${u.id})`), u;
  }
  /**
   * Update existing item
   */
  updateItem(i, t) {
    const e = this.items.get(i);
    if (!e)
      throw new Error(`Library item not found: ${i}`);
    if (t.name && t.name !== e.name) {
      const s = this.findByName(t.name);
      if (s && s.id !== i)
        throw new Error(`Track with name "${t.name}" already exists`);
    }
    if (t.url && t.url !== e.url) {
      const s = R(t.url);
      if (!s.valid)
        throw new Error(s.error || "Invalid audio file");
      const r = this.findByUrl(t.url);
      if (r && r.id !== i)
        throw new Error(`Track with this URL already exists: ${r.name}`);
    }
    delete t.id;
    const a = {
      ...e,
      ...t,
      updatedAt: Date.now()
    };
    return this.items.set(i, a), this.scheduleSave(), l.info(`Library item updated: ${a.name}`), a;
  }
  /**
   * Remove item from library
   */
  removeItem(i) {
    const t = this.items.get(i);
    if (!t)
      throw new Error(`Library item not found: ${i}`);
    this.playlists.removeLibraryItemFromAllPlaylists(i), this.items.delete(i), this.scheduleSave(), l.info(`Library item removed: ${t.name}`);
  }
  /**
   * Get item by ID
   */
  getItem(i) {
    return this.items.get(i);
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
  findByUrl(i) {
    return Array.from(this.items.values()).find((t) => t.url === i);
  }
  /**
   * Find item by name
   */
  findByName(i) {
    return Array.from(this.items.values()).find((t) => t.name === i);
  }
  /**
   * Search items by query
   */
  searchByName(i) {
    const t = i.toLowerCase();
    return this.getAllItems().filter(
      (e) => e.name.toLowerCase().includes(t)
    );
  }
  /**
   * Filter items by tags (OR logic)
   */
  filterByTags(i) {
    return i.length === 0 ? this.getAllItems() : this.getAllItems().filter(
      (t) => t.tags.some((e) => i.includes(e))
    );
  }
  /**
   * Get favorite items (sorted by favoritesOrder)
   */
  getFavorites() {
    return this.getAllItems().filter((i) => i.favorite);
  }
  /**
   * Get ordered favorites list (tracks + playlists)
   */
  getOrderedFavorites() {
    const i = [];
    for (const e of this.favoritesOrder)
      if (e.type === "track") {
        const a = this.items.get(e.id);
        a && a.favorite && i.push(e);
      } else {
        const a = this.playlists.getPlaylist(e.id);
        a && a.favorite && i.push(e);
      }
    const t = new Set(i.map((e) => `${e.type}:${e.id}`));
    for (const e of this.getAllItems())
      e.favorite && !t.has(`track:${e.id}`) && i.unshift({ id: e.id, type: "track", addedAt: Date.now() });
    for (const e of this.playlists.getFavoritePlaylists())
      t.has(`playlist:${e.id}`) || i.unshift({ id: e.id, type: "playlist", addedAt: Date.now() });
    return this.favoritesOrder = i, i;
  }
  /**
   * Reorder favorites based on new order array
   */
  reorderFavorites(i) {
    const t = Date.now();
    this.favoritesOrder = i.map((e) => {
      var a;
      return {
        id: e.id,
        type: e.type,
        addedAt: ((a = this.favoritesOrder.find((s) => s.id === e.id && s.type === e.type)) == null ? void 0 : a.addedAt) ?? t
      };
    }), this.scheduleSave(), l.info("Favorites reordered");
  }
  /**
   * Add item to favorites order (at the beginning = newest)
   */
  addToFavoritesOrder(i, t) {
    this.favoritesOrder = this.favoritesOrder.filter((e) => !(e.id === i && e.type === t)), this.favoritesOrder.unshift({ id: i, type: t, addedAt: Date.now() }), this.scheduleSave();
  }
  /**
   * Remove item from favorites order
   */
  removeFromFavoritesOrder(i, t) {
    this.favoritesOrder = this.favoritesOrder.filter((e) => !(e.id === i && e.type === t)), this.scheduleSave();
  }
  // ─────────────────────────────────────────────────────────────
  // Tags Management
  // ─────────────────────────────────────────────────────────────
  /**
   * Get all unique tags
   */
  getAllTags() {
    const i = new Set(this.customTags);
    return this.items.forEach((t) => {
      t.tags.forEach((e) => i.add(e));
    }), Array.from(i).sort();
  }
  /**
   * Add a custom tag explicitly (even if not used on any track)
   */
  addCustomTag(i) {
    const t = i.trim().replace(/^#/, "");
    t && !this.customTags.has(t) && (this.customTags.add(t), this.scheduleSave());
  }
  /**
   * Add tag to item
   */
  addTagToItem(i, t) {
    const e = this.getItem(i);
    if (!e)
      throw new Error(`Library item not found: ${i}`);
    e.tags.includes(t) || (e.tags.push(t), e.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Remove tag from item
   */
  removeTagFromItem(i, t) {
    const e = this.getItem(i);
    if (!e)
      throw new Error(`Library item not found: ${i}`);
    const a = e.tags.indexOf(t);
    a !== -1 && (e.tags.splice(a, 1), e.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Rename tag globally
   */
  renameTag(i, t) {
    let e = 0;
    return this.items.forEach((a) => {
      const s = a.tags.indexOf(i);
      s !== -1 && (a.tags[s] = t, a.updatedAt = Date.now(), e++);
    }), e > 0 ? (this.customTags.has(i) && (this.customTags.delete(i), this.customTags.add(t)), this.scheduleSave(), l.info(`Tag renamed: "${i}" → "${t}" (${e} items)`)) : this.customTags.has(i) && (this.customTags.delete(i), this.customTags.add(t), this.scheduleSave(), l.info(`Custom tag renamed: "${i}" → "${t}"`)), e;
  }
  /**
   * Delete tag globally
   */
  deleteTag(i) {
    let t = 0;
    return this.items.forEach((e) => {
      const a = e.tags.indexOf(i);
      a !== -1 && (e.tags.splice(a, 1), e.updatedAt = Date.now(), t++);
    }), t > 0 ? (this.customTags.has(i) && this.customTags.delete(i), this.scheduleSave(), l.info(`Tag deleted: "${i}" (${t} items)`)) : this.customTags.has(i) && (this.customTags.delete(i), this.scheduleSave(), l.info(`Custom tag deleted: "${i}"`)), t;
  }
  // ─────────────────────────────────────────────────────────────
  // Favorites
  // ─────────────────────────────────────────────────────────────
  /**
   * Toggle favorite status
   */
  toggleFavorite(i) {
    const t = this.getItem(i);
    if (!t)
      throw new Error(`Library item not found: ${i}`);
    return t.favorite = !t.favorite, t.updatedAt = Date.now(), t.favorite ? this.addToFavoritesOrder(i, "track") : this.removeFromFavoritesOrder(i, "track"), this.scheduleSave(), t.favorite;
  }
  /**
   * Scan library for items with missing duration (0) and try to extract it.
   * Run this once per session or on demand.
   */
  async scanMissingDurations() {
    if (this.hasScannedDurations) return;
    this.hasScannedDurations = !0;
    const i = Array.from(this.items.values()).filter((a) => !a.duration || a.duration === 0);
    if (i.length === 0) return;
    l.info(`Scanning ${i.length} items for missing duration...`);
    let t = 0;
    const e = 5;
    for (let a = 0; a < i.length; a += e) {
      const s = i.slice(a, a + e);
      await Promise.all(s.map((r) => new Promise((n) => {
        const o = new Audio(r.url), c = () => {
          o.onloadedmetadata = null, o.onerror = null, n();
        };
        o.onloadedmetadata = () => {
          o.duration && isFinite(o.duration) && (r.duration = Math.round(o.duration), t++), c();
        }, o.onerror = () => {
          c();
        }, setTimeout(c, 5e3);
      })));
    }
    t > 0 && (l.info(`Updated duration for ${t} items.`), this.scheduleSave());
  }
  // ─────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────
  async loadFromSettings() {
    try {
      await C.migrateFromWorldSettings();
      const i = await C.load();
      if (!i) {
        l.info("No saved library state, starting fresh");
        return;
      }
      i.version !== G && l.warn(`Library version mismatch: ${i.version} → ${G}`), this.items.clear(), Object.values(i.items).forEach((t) => {
        this.items.set(t.id, t);
      }), this.customTags = new Set(i.customTags || []), this.playlists.load(i.playlists || {}), this.favoritesOrder = i.favoritesOrder || [], l.info(`Library loaded: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists, ${this.customTags.size} custom tags`);
    } catch (i) {
      l.error("Failed to load library state:", i);
    }
  }
  async saveToSettings() {
    try {
      const i = {
        items: Object.fromEntries(this.items),
        playlists: this.playlists.export(),
        customTags: Array.from(this.customTags),
        favoritesOrder: this.favoritesOrder,
        version: G,
        lastModified: Date.now()
      };
      await C.save(i), this.saveScheduled = !1, l.debug(`Library saved: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (i) {
      l.error("Failed to save library state:", i);
    }
  }
  scheduleSave() {
    this.debouncedSave();
  }
  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────
  extractNameFromUrl(i) {
    try {
      const e = decodeURIComponent(i).split("/");
      return e[e.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      return "Unknown Track";
    }
  }
  /**
   * Get library statistics
   */
  getStats() {
    const i = this.getAllItems(), t = this.playlists.getStats();
    return {
      totalItems: i.length,
      favoriteItems: i.filter((e) => e.favorite).length,
      totalDuration: i.reduce((e, a) => e + a.duration, 0),
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
class ht {
  constructor() {
    h(this, "items", []);
    h(this, "activeItemId", null);
    h(this, "eventListeners", /* @__PURE__ */ new Map());
    l.info("PlaybackQueueManager initialized");
  }
  // ─────────────────────────────────────────────────────────────
  // Core Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add a library item to the queue
   */
  addItem(i, t) {
    const e = {
      id: foundry.utils.randomID(),
      libraryItemId: i,
      group: (t == null ? void 0 : t.group) ?? "music",
      addedAt: Date.now(),
      state: "stopped",
      volume: (t == null ? void 0 : t.volume) ?? 1,
      loop: (t == null ? void 0 : t.loop) ?? !1,
      playlistId: t == null ? void 0 : t.playlistId
    };
    return this.items.push(e), this.emit("add", { item: e }), this.emit("change", { items: this.items }), l.debug("Added to queue:", e.id, i), e;
  }
  /**
   * Add all items from a playlist to the queue
   */
  addPlaylist(i, t) {
    const e = [];
    for (const a of t) {
      const s = this.addItem(a.libraryItemId, {
        playlistId: i,
        group: a.group,
        volume: a.volume,
        loop: a.loop
      });
      e.push(s);
    }
    return e;
  }
  /**
   * Remove an item from the queue
   */
  removeItem(i) {
    const t = this.items.findIndex((a) => a.id === i);
    if (t === -1) return !1;
    const [e] = this.items.splice(t, 1);
    return this.activeItemId === i && (this.activeItemId = null, this.emit("active", { item: void 0 })), this.emit("remove", { item: e }), this.emit("change", { items: this.items }), l.debug("Removed from queue:", i), !0;
  }
  /**
   * Clear all items from the queue
   */
  clearQueue() {
    this.items = [], this.activeItemId = null, this.emit("change", { items: [] }), this.emit("active", { item: void 0 }), l.debug("Queue cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────
  /**
   * Set the currently active (playing) item
   */
  setActive(i) {
    if (i && !this.items.find((e) => e.id === i)) {
      l.warn("Cannot set active: item not in queue", i);
      return;
    }
    this.activeItemId = i;
    const t = this.getActive();
    this.emit("active", { item: t ?? void 0 }), l.debug("Active item set:", i);
  }
  /**
   * Get the currently active item
   */
  getActive() {
    return this.activeItemId ? this.items.find((i) => i.id === this.activeItemId) ?? null : null;
  }
  /**
   * Get the next item in the queue (after active)
   */
  getNext() {
    if (!this.activeItemId) return this.items[0] ?? null;
    const i = this.items.findIndex((t) => t.id === this.activeItemId);
    return i === -1 || i >= this.items.length - 1 ? null : this.items[i + 1];
  }
  /**
   * Get the previous item in the queue (before active)
   */
  getPrevious() {
    if (!this.activeItemId) return null;
    const i = this.items.findIndex((t) => t.id === this.activeItemId);
    return i <= 0 ? null : this.items[i - 1];
  }
  /**
   * Update the state of a queue item
   */
  updateItemState(i, t) {
    const e = this.items.find((a) => a.id === i);
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
  hasItem(i) {
    return this.items.some((t) => t.libraryItemId === i);
  }
  /**
   * Remove all queue items that reference a specific library item
   */
  removeByLibraryItemId(i) {
    const t = this.items.filter((e) => e.libraryItemId === i);
    if (t.length === 0) return !1;
    for (const e of t)
      this.removeItem(e.id);
    return !0;
  }
  // ─────────────────────────────────────────────────────────────
  // Event System
  // ─────────────────────────────────────────────────────────────
  on(i, t) {
    this.eventListeners.has(i) || this.eventListeners.set(i, /* @__PURE__ */ new Set()), this.eventListeners.get(i).add(t);
  }
  off(i, t) {
    var e;
    (e = this.eventListeners.get(i)) == null || e.delete(t);
  }
  emit(i, t) {
    var e;
    (e = this.eventListeners.get(i)) == null || e.forEach((a) => a(t));
  }
}
const V = "advanced-sound-engine";
let w = null, k = null, E = null, S = null, P = null, x = null;
Hooks.on("getSceneControlButtons", (d) => {
  var i;
  try {
    const t = ((i = game.user) == null ? void 0 : i.isGM) ?? !1, e = [
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
      const a = d.sounds;
      a && Array.isArray(a.tools) ? (a.tools.push(...e), console.log('ASE | Added tools to "sounds" layer (V13 Object Mode)')) : (d["advanced-sound-engine"] = {
        name: "advanced-sound-engine",
        title: "Advanced Sound Engine",
        icon: "fas fa-music",
        visible: !0,
        tools: e
      }, console.log("ASE | Created dedicated control group (V13 Object Mode)"));
      return;
    }
    if (Array.isArray(d)) {
      const a = d.find((s) => s.name === "sounds");
      a ? (a.tools.push(...e), console.log('ASE | Added tools to "sounds" layer')) : (d.push({
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
Hooks.on("renderSceneControls", (d, i) => {
  try {
    const t = (s) => {
      if (typeof i.find == "function") {
        const r = i.find(s);
        return r.length ? r[0] : null;
      } else {
        if (i instanceof HTMLElement)
          return i.querySelector(s);
        if (i.length && i[0] instanceof HTMLElement)
          return i[0].querySelector(s) ?? null;
      }
      return null;
    }, e = t('[data-tool="ase-open-mixer"]');
    e && (e.onclick = (s) => {
      var r;
      s.preventDefault(), s.stopPropagation(), console.log("ASE | Manual click handler (native): Open Mixer"), (r = window.ASE) == null || r.openPanel();
    }, console.log("ASE | Bound manual click listener to mixer button"));
    const a = t('[data-tool="ase-open-library"]');
    a && (a.onclick = (s) => {
      var r, n;
      s.preventDefault(), s.stopPropagation(), console.log("ASE | Manual click handler (native): Open Library"), (n = (r = window.ASE) == null ? void 0 : r.openLibrary) == null || n.call(r);
    }, console.log("ASE | Bound manual click listener to library button"));
  } catch (t) {
    console.warn("ASE | Failed to bind manual click listeners:", t);
  }
});
function mt() {
  Handlebars.registerHelper("formatDuration", (d) => {
    if (!d || d <= 0) return "--:--";
    const i = Math.floor(d / 60), t = Math.floor(d % 60);
    return `${i}:${t.toString().padStart(2, "0")}`;
  }), Handlebars.registerHelper("eq", (d, i) => d === i);
}
Hooks.once("init", () => {
  l.info("Initializing Advanced Sound Engine..."), vt(), mt();
});
Hooks.once("ready", async () => {
  var t;
  const d = ((t = game.user) == null ? void 0 : t.isGM) ?? !1;
  l.info(`Starting Advanced Sound Engine (${d ? "GM" : "Player"})...`), x = new it(), d ? await ft() : await pt();
  const i = new ht();
  window.ASE = {
    isGM: d,
    openPanel: d ? B : gt,
    openLibrary: () => d && B("library"),
    engine: d ? w ?? void 0 : S ?? void 0,
    socket: x ?? void 0,
    library: d ? E ?? void 0 : void 0,
    queue: i
  }, yt(), l.info("Advanced Sound Engine ready");
});
async function ft() {
  E = new ut(), w = new tt(), x.initializeAsGM(w), await w.loadSavedState();
}
async function pt() {
  S = new et(), x.initializeAsPlayer(S);
  const d = j.loadSavedVolume();
  S.setLocalVolume(d);
}
function B(d, i = !1) {
  !w || !x || !E || (k && k.rendered ? (d && k.state.activeTab !== d && (k.state.activeTab = d, i = !0), i ? k.render(!1) : k.bringToTop()) : (k = new lt(w, x, E), d && (k.state.activeTab = d), k.render(!0)));
}
function gt() {
  S && (P && P.rendered ? P.bringToTop() : (P = new j(S), P.render(!0)));
}
function yt() {
  const d = () => {
    w == null || w.resume(), S == null || S.resume();
  };
  document.addEventListener("click", d, { once: !0 }), document.addEventListener("keydown", d, { once: !0 }), Hooks.once("canvasReady", d);
}
function vt() {
  game.settings.register(V, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  }), game.settings.register(V, "maxSimultaneousTracks", {
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
  }), game.settings.register(V, "libraryState", {
    name: "Library State",
    hint: "Internal storage for library items and playlists",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  k == null || k.close(), P == null || P.close(), x == null || x.dispose(), w == null || w.dispose(), S == null || S.dispose(), E == null || E.dispose();
});
//# sourceMappingURL=module.js.map
