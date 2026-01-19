var O = Object.defineProperty;
var R = (c, a, t) => a in c ? O(c, a, { enumerable: !0, configurable: !0, writable: !0, value: t }) : c[a] = t;
var u = (c, a, t) => R(c, typeof a != "symbol" ? a + "" : a, t);
const x = "ASE", o = {
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
class D {
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
function b() {
  return Date.now();
}
function A(c) {
  if (!isFinite(c) || c < 0) return "0:00";
  const a = Math.floor(c / 60), t = Math.floor(c % 60);
  return `${a}:${t.toString().padStart(2, "0")}`;
}
function P() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const a = Math.random() * 16 | 0;
    return (c === "x" ? a : a & 3 | 8).toString(16);
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
], B = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/opus"
};
function z(c) {
  const a = _(c);
  return L.includes(a);
}
function _(c) {
  try {
    const e = decodeURIComponent(c).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return e ? `.${e[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function j(c) {
  const a = _(c);
  return B[a] || null;
}
function M(c) {
  if (!c || typeof c != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const a = _(c);
  if (!a)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!z(c))
    return {
      valid: !1,
      error: `Unsupported audio format: ${a}. Supported formats: ${L.join(", ")}`,
      extension: a
    };
  const t = j(c);
  return {
    valid: !0,
    extension: a,
    mimeType: t || void 0
  };
}
const V = "advanced-sound-engine";
function H() {
  return game.settings.get(V, "maxSimultaneousTracks") || 8;
}
class Y {
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
      await game.settings.set(V, "mixerState", JSON.stringify(a)), o.debug("Mixer state saved");
    } catch (e) {
      o.error("Failed to save mixer state:", e);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const a = game.settings.get(V, "mixerState");
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
    const t = a.id || P();
    if (this.players.has(t))
      return this.players.get(t);
    const e = M(a.url);
    if (!e.valid) {
      const r = new Error(e.error || "Invalid audio file");
      throw o.error(`Track validation failed: ${e.error}`), r;
    }
    const i = this.channelGains[a.group], s = new D(
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
    const i = H(), s = this.getAllTracks().filter((l) => l.state === "playing").length;
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
class Q {
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
  // Track Commands (from GM via socket)
  // ─────────────────────────────────────────────────────────────
  async handlePlay(a) {
    let t = this.players.get(a.trackId);
    t || (t = new D(
      a.trackId,
      this.ctx,
      this.channelGains[a.group],
      a.group
    ), await t.load(a.url), this.players.set(a.trackId, t)), t.setVolume(a.volume), t.setLoop(a.loop);
    const e = (b() - a.startTimestamp) / 1e3, i = Math.max(0, a.offset + e);
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
      if (s || (s = new D(
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
const J = "advanced-sound-engine", S = `module.${J}`;
class X {
  constructor() {
    u(this, "gmEngine", null);
    u(this, "playerEngine", null);
    u(this, "socket", null);
    u(this, "_syncEnabled", !1);
    u(this, "isGM", !1);
  }
  initializeAsGM(a) {
    var t;
    this.isGM = !0, this.gmEngine = a, this.socket = game.socket, (t = this.socket) == null || t.on(S, (e) => {
      this.handleGMMessage(e);
    }), o.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(a) {
    var t;
    this.isGM = !1, this.playerEngine = a, this.socket = game.socket, (t = this.socket) == null || t.on(S, (e) => {
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
    e ? this.socket.emit(S, i, { recipients: [e] }) : this.socket.emit(S, i), o.debug(`Sent: ${a}`, t);
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
    (a = this.socket) == null || a.off(S);
  }
}
function E(c, a) {
  let t = 0, e = null;
  return function(...i) {
    const s = Date.now(), r = a - (s - t);
    r <= 0 ? (e && (clearTimeout(e), e = null), t = s, c.apply(this, i)) : e || (e = setTimeout(() => {
      t = Date.now(), e = null, c.apply(this, i);
    }, r));
  };
}
function q(c, a) {
  let t = null;
  return function(...e) {
    t && clearTimeout(t), t = setTimeout(() => {
      c.apply(this, e);
    }, a);
  };
}
const N = "advanced-sound-engine";
function K() {
  return game.settings.get(N, "maxSimultaneousTracks") || 8;
}
class W extends Application {
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
      template: `modules/${N}/templates/mixer.hbs`,
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
      maxSimultaneous: K(),
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
      currentTimeFormatted: A(i),
      duration: s,
      durationFormatted: A(s),
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
      const l = n.target.checked;
      this.socket.setSyncEnabled(l), this.updateSyncIndicator(t, l);
    });
    const e = E((n, l) => {
      n === "master" ? (this.engine.setMasterVolume(l), this.socket.broadcastChannelVolume("master", l)) : (this.engine.setChannelVolume(n, l), this.socket.broadcastChannelVolume(n, l));
    }, 50);
    t.find(".ase-channel-slider").on("input", (n) => {
      const l = $(n.currentTarget).data("channel"), d = parseFloat(n.target.value) / 100;
      e(l, d), $(n.currentTarget).siblings(".ase-channel-value").text(`${Math.round(d * 100)}%`);
    }), t.find("#ase-add-track").on("click", () => this.onAddTrack());
    const i = t.find(".ase-tracks");
    i.on("click", ".ase-btn-play", (n) => {
      const l = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(l);
    }), i.on("click", ".ase-btn-pause", (n) => {
      const l = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(l);
    }), i.on("click", ".ase-btn-stop", (n) => {
      const l = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(l);
    }), i.on("click", ".ase-btn-remove", (n) => {
      const l = $(n.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(l);
    }), i.on("change", ".ase-loop-toggle", (n) => {
      const l = $(n.currentTarget).closest(".ase-track").data("track-id"), d = n.target.checked;
      this.engine.setTrackLoop(l, d), this.socket.broadcastTrackLoop(l, d);
    }), i.on("change", ".ase-channel-select", (n) => {
      const l = $(n.currentTarget).data("track-id"), d = n.target.value;
      this.engine.setTrackChannel(l, d);
    });
    const s = E((n, l) => {
      this.engine.setTrackVolume(n, l), this.socket.broadcastTrackVolume(n, l);
    }, 50);
    i.on("input", ".ase-volume-slider", (n) => {
      const l = $(n.currentTarget).closest(".ase-track").data("track-id"), d = parseFloat(n.target.value) / 100;
      s(l, d), $(n.currentTarget).siblings(".ase-volume-value").text(`${Math.round(d * 100)}%`);
    });
    const r = E((n, l) => {
      const d = this.engine.getTrack(n), h = (d == null ? void 0 : d.state) === "playing";
      this.engine.seekTrack(n, l), this.socket.broadcastTrackSeek(n, l, h ?? !1);
    }, 100);
    i.on("input", ".ase-seek-slider", (n) => {
      const l = $(n.currentTarget).closest(".ase-track").data("track-id"), d = this.engine.getTrack(l);
      if (d) {
        const m = parseFloat(n.target.value) / 100 * d.getDuration();
        r(l, m);
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
      const n = s.getCurrentTime(), l = s.getDuration(), d = l > 0 ? n / l * 100 : 0, h = s.state;
      h === "playing" && e++, r.find(".ase-time-current").text(A(n));
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
    const i = P();
    try {
      await this.engine.createTrack({
        id: i,
        url: t,
        group: e,
        volume: 1,
        loop: !1
      }), this.render(), (s = ui.notifications) == null || s.info(`Added: ${this.extractFileName(t)}`);
    } catch (n) {
      o.error("Failed to add track:", n);
      const l = n instanceof Error ? n.message : "Unknown error";
      (r = ui.notifications) == null || r.error(`Failed to load: ${l}`);
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
const I = "advanced-sound-engine";
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
      template: `modules/${I}/templates/player-volume.hbs`,
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
    localStorage.setItem(`${I}-player-volume`, String(t));
  }
  static loadSavedVolume() {
    const t = localStorage.getItem(`${I}-player-volume`);
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
      selectedChannel: "all",
      selectedPlaylistId: null,
      selectedTags: /* @__PURE__ */ new Set(),
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
  getData() {
    let t = this.library.getAllItems();
    const e = this.library.playlists.getAllPlaylists(), i = this.library.getAllTags(), s = this.library.getStats();
    t = this.applyFilters(t), t = this.applySorting(t);
    const r = this.library.getFavorites(), n = this.library.playlists.getFavoritePlaylists(), l = [
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
    ], d = i.map((f) => ({
      name: f,
      selected: this.filterState.selectedTags.has(f)
    })), h = e.map((f) => ({
      ...this.getPlaylistViewData(f),
      selected: f.id === this.filterState.selectedPlaylistId
    })), m = !!(this.filterState.searchQuery || this.filterState.selectedChannel !== "all" || this.filterState.selectedPlaylistId || this.filterState.selectedTags.size > 0);
    return {
      items: t.map((f) => this.getItemViewData(f)),
      playlists: h,
      favorites: l,
      tags: d,
      stats: {
        totalItems: s.totalItems,
        favoriteItems: s.favoriteItems,
        playlists: s.playlists,
        tagCount: s.tagCount
      },
      // Filter state for UI
      searchQuery: this.filterState.searchQuery,
      selectedChannel: this.filterState.selectedChannel,
      selectedPlaylistId: this.filterState.selectedPlaylistId,
      sortBy: this.filterState.sortBy,
      hasActiveFilters: m
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
      duration: A(t.duration),
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
    if (this.filterState.selectedChannel !== "all" && (e = e.filter((i) => this.inferGroupFromTags(i.tags) === this.filterState.selectedChannel)), this.filterState.selectedPlaylistId) {
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
    super.activateListeners(t), t.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), t.find('[data-action="search"]').on("input", this.onSearch.bind(this)), t.find('[data-action="filter-channel"]').on("click", this.onFilterChannel.bind(this)), t.find('[data-action="change-sort"]').on("change", this.onChangeSort.bind(this)), t.find('[data-action="clear-filters"]').on("click", this.onClearFilters.bind(this)), t.find('[data-action="toggle-tag"]').on("click", this.onToggleTag.bind(this)), t.find('[data-action="add-tag"]').on("click", this.onAddTag.bind(this)), t.find('[data-action="play-track"]').on("click", this.onPlayTrack.bind(this)), t.find('[data-action="stop-track"]').on("click", this.onStopTrack.bind(this)), t.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), t.find('[data-action="add-to-playlist"]').on("click", this.onAddToPlaylist.bind(this)), t.find('[data-action="track-menu"]').on("click", this.onTrackMenu.bind(this)), t.find('[data-action="select-playlist"]').on("click", this.onSelectPlaylist.bind(this)), t.find('[data-action="create-playlist"]').on("click", this.onCreatePlaylist.bind(this)), t.find('[data-action="toggle-playlist-favorite"]').on("click", this.onTogglePlaylistFavorite.bind(this)), t.find('[data-action="playlist-menu"]').on("click", this.onPlaylistMenu.bind(this)), t.find('[data-action="remove-from-favorites"]').on("click", this.onRemoveFromFavorites.bind(this)), this.setupDragAndDrop(t), this.setupContextMenus(t), o.debug("LocalLibraryApp listeners activated");
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
        this.render(), (i = ui.notifications) == null || i.info(`Created playlist: ${r.name}`);
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
      const r = this.library.playlists.togglePlaylistFavorite(e);
      this.render(), (i = ui.notifications) == null || i.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      o.error("Failed to toggle playlist favorite:", r), (s = ui.notifications) == null || s.error("Failed to update favorite status");
    }
  }
  async onRemoveFromFavorites(t) {
    var s, r;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).closest("[data-favorite-id]").data("favorite-id"), i = $(t.currentTarget).closest("[data-favorite-type]").data("favorite-type");
    try {
      i === "track" ? this.library.toggleFavorite(e) : i === "playlist" && this.library.playlists.togglePlaylistFavorite(e), this.render(), (s = ui.notifications) == null || s.info("Removed from favorites");
    } catch (n) {
      o.error("Failed to remove from favorites:", n), (r = ui.notifications) == null || r.error("Failed to remove from favorites");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Toolbar Event Handlers
  // ─────────────────────────────────────────────────────────────
  onSearch(t) {
    const e = ($(t.currentTarget).val() || "").trim();
    this.filterState.searchQuery = e, this.render(), o.debug("Search:", e);
  }
  onFilterChannel(t) {
    t.preventDefault();
    const e = $(t.currentTarget).data("channel");
    this.filterState.selectedChannel = e, this.render(), o.debug("Filter channel:", e);
  }
  onChangeSort(t) {
    const e = $(t.currentTarget).val();
    this.filterState.sortBy = e, this.render(), o.debug("Sort changed:", e);
  }
  onClearFilters(t) {
    var e;
    t.preventDefault(), this.filterState.searchQuery = "", this.filterState.selectedChannel = "all", this.filterState.selectedPlaylistId = null, this.filterState.selectedTags.clear(), this.render(), (e = ui.notifications) == null || e.info("Filters cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Tag Event Handlers
  // ─────────────────────────────────────────────────────────────
  onToggleTag(t) {
    t.preventDefault();
    const e = $(t.currentTarget).data("tag");
    this.filterState.selectedTags.has(e) ? this.filterState.selectedTags.delete(e) : this.filterState.selectedTags.add(e), this.render(), o.debug("Toggle tag:", e, "Selected tags:", Array.from(this.filterState.selectedTags));
  }
  async onAddTag(t) {
    var i;
    t.preventDefault();
    const e = await this.promptTagName();
    e && (o.debug("Add tag:", e), (i = ui.notifications) == null || i.info(`Tag "${e}" will be available once assigned to tracks`));
  }
  // ─────────────────────────────────────────────────────────────
  // Track Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onPlayTrack(t) {
    var i;
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    o.debug("Play track:", e), (i = ui.notifications) == null || i.info("Play functionality coming soon");
  }
  onStopTrack(t) {
    t.preventDefault(), t.stopPropagation();
    const e = $(t.currentTarget).data("item-id");
    o.debug("Stop track:", e);
  }
  async onAddToPlaylist(t) {
    var n, l, d, h;
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
        this.library.playlists.addTrackToPlaylist(r, e, m), this.render(), (d = ui.notifications) == null || d.info(`Added "${i.name}" to playlist`);
      } catch (m) {
        o.error("Failed to add track to playlist:", m);
        const f = m instanceof Error ? m.message : "Unknown error";
        (h = ui.notifications) == null || h.error(`Failed to add to playlist: ${f}`);
      }
  }
  onTrackMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation(), $(t.currentTarget).data("item-id");
    const e = $(t.currentTarget).closest(".track-item"), i = new MouseEvent("contextmenu", {
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
    this.filterState.selectedPlaylistId === e ? this.filterState.selectedPlaylistId = null : this.filterState.selectedPlaylistId = e, this.render(), o.debug("Select playlist:", e);
  }
  onPlaylistMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation(), $(t.currentTarget).data("playlist-id");
    const e = $(t.currentTarget).closest(".playlist-item"), i = new MouseEvent("contextmenu", {
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
    t.find('.track-item[draggable="true"]').on("dragstart", (e) => {
      const i = $(e.currentTarget).data("item-id");
      e.originalEvent.dataTransfer.effectAllowed = "copy", e.originalEvent.dataTransfer.setData("text/plain", i), $(e.currentTarget).addClass("dragging");
    }), t.find('.track-item[draggable="true"]').on("dragend", (e) => {
      $(e.currentTarget).removeClass("dragging");
    }), t.find(".playlist-item").on("dragover", (e) => {
      e.preventDefault(), e.originalEvent.dataTransfer.dropEffect = "copy", $(e.currentTarget).addClass("drag-over");
    }), t.find(".playlist-item").on("dragleave", (e) => {
      $(e.currentTarget).removeClass("drag-over");
    }), t.find(".playlist-item").on("drop", async (e) => {
      e.preventDefault();
      const i = e.originalEvent.dataTransfer.getData("text/plain"), s = $(e.currentTarget).data("playlist-id");
      $(e.currentTarget).removeClass("drag-over"), await this.handleDropTrackToPlaylist(i, s);
    });
  }
  async handleDropTrackToPlaylist(t, e) {
    var r, n, l;
    const i = this.library.getItem(t), s = this.library.playlists.getPlaylist(e);
    if (!i || !s) {
      (r = ui.notifications) == null || r.error("Track or playlist not found");
      return;
    }
    try {
      const d = this.inferGroupFromTags(i.tags);
      this.library.playlists.addTrackToPlaylist(e, t, d), this.render(), (n = ui.notifications) == null || n.info(`Added "${i.name}" to "${s.name}"`);
    } catch (d) {
      o.error("Failed to add track to playlist:", d);
      const h = d instanceof Error ? d.message : "Unknown error";
      (l = ui.notifications) == null || l.error(`Failed to add to playlist: ${h}`);
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
        callback: async (e) => {
          const i = e.data("item-id");
          await this.onEditTrackName(i);
        }
      },
      {
        name: "Edit Tags",
        icon: '<i class="fas fa-tags"></i>',
        callback: async (e) => {
          const i = e.data("item-id");
          await this.onEditTrackTags(i);
        }
      },
      {
        name: "Add to Playlist",
        icon: '<i class="fas fa-list-ul"></i>',
        callback: async (e) => {
          var l, d, h;
          const i = e.data("item-id"), s = this.library.getItem(i);
          if (!s) return;
          const r = this.library.playlists.getAllPlaylists();
          if (r.length === 0) {
            (l = ui.notifications) == null || l.warn("No playlists available. Create one first.");
            return;
          }
          const n = await this.promptPlaylistSelection(r);
          if (n)
            try {
              const m = this.inferGroupFromTags(s.tags);
              this.library.playlists.addTrackToPlaylist(n, i, m), this.render(), (d = ui.notifications) == null || d.info(`Added "${s.name}" to playlist`);
            } catch (m) {
              o.error("Failed to add track to playlist:", m);
              const f = m instanceof Error ? m.message : "Unknown error";
              (h = ui.notifications) == null || h.error(`Failed to add to playlist: ${f}`);
            }
        }
      },
      {
        name: "Toggle Favorite",
        icon: '<i class="fas fa-star"></i>',
        callback: (e) => {
          var s, r;
          const i = e.data("item-id");
          try {
            const n = this.library.toggleFavorite(i);
            this.render(), (s = ui.notifications) == null || s.info(n ? "Added to favorites" : "Removed from favorites");
          } catch (n) {
            o.error("Failed to toggle favorite:", n), (r = ui.notifications) == null || r.error("Failed to update favorite status");
          }
        }
      },
      {
        name: "Delete Track",
        icon: '<i class="fas fa-trash"></i>',
        callback: async (e) => {
          const i = e.data("item-id");
          await this.onDeleteTrackConfirm(i);
        }
      }
    ]), new ContextMenu(t, ".playlist-item", [
      {
        name: "Rename Playlist",
        icon: '<i class="fas fa-edit"></i>',
        callback: async (e) => {
          const i = e.data("playlist-id");
          await this.onRenamePlaylist(i);
        }
      },
      {
        name: "Edit Description",
        icon: '<i class="fas fa-align-left"></i>',
        callback: async (e) => {
          const i = e.data("playlist-id");
          await this.onEditPlaylistDescription(i);
        }
      },
      {
        name: "View Contents",
        icon: '<i class="fas fa-list"></i>',
        callback: async (e) => {
          const i = e.data("playlist-id");
          await this.onViewPlaylistContents(i);
        }
      },
      {
        name: "Clear Playlist",
        icon: '<i class="fas fa-eraser"></i>',
        callback: async (e) => {
          const i = e.data("playlist-id");
          await this.onClearPlaylist(i);
        }
      },
      {
        name: "Delete Playlist",
        icon: '<i class="fas fa-trash"></i>',
        callback: async (e) => {
          const i = e.data("playlist-id");
          await this.onDeletePlaylistConfirm(i);
        }
      }
    ]), new ContextMenu(t, ".tag-chip:not(.mini)", [
      {
        name: "Rename Tag",
        icon: '<i class="fas fa-edit"></i>',
        callback: async (e) => {
          const i = e.data("tag");
          await this.onRenameTag(i);
        }
      },
      {
        name: "Delete Tag",
        icon: '<i class="fas fa-trash"></i>',
        callback: async (e) => {
          const i = e.data("tag");
          await this.onDeleteTag(i);
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
    const s = i.split(",").map((d) => d.trim()).filter((d) => d.length > 0);
    try {
      this.library.updateItem(t, { tags: s }), this.render(), (n = ui.notifications) == null || n.info("Tags updated");
    } catch (d) {
      o.error("Failed to update tags:", d), (l = ui.notifications) == null || l.error("Failed to update tags");
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
        const d = l instanceof Error ? l.message : "Unknown error";
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
      const d = this.library.getItem(n.libraryItemId), h = (d == null ? void 0 : d.name) || "Unknown";
      return `<li><strong>${l + 1}.</strong> ${h}</li>`;
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
        [...e.items.map((h) => h.id)].forEach((h) => {
          try {
            this.library.playlists.removeTrackFromPlaylist(t, h);
          } catch (m) {
            o.error("Failed to remove item:", m);
          }
        }), this.render(), (n = ui.notifications) == null || n.info(`Cleared playlist: ${e.name}`);
      } catch (d) {
        o.error("Failed to clear playlist:", d), (l = ui.notifications) == null || l.error("Failed to clear playlist");
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
          const l = n.tags.map((d) => d === t ? e : d);
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
          const l = n.tags.filter((d) => d !== t);
          this.library.updateItem(n.id, { tags: l });
        }), this.filterState.selectedTags.delete(t), this.render(), (s = ui.notifications) == null || s.info(`Deleted tag "${t}" from ${e.length} track(s)`);
      } catch (n) {
        o.error("Failed to delete tag:", n), (r = ui.notifications) == null || r.error("Failed to delete tag");
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
            callback: (e) => {
              let i = (e.find('[name="tag-name"]').val() || "").trim();
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
}
class tt {
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
      id: P(),
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
      id: P(),
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
const G = "advanced-sound-engine", C = 1;
class et {
  constructor() {
    u(this, "items", /* @__PURE__ */ new Map());
    u(this, "saveScheduled", !1);
    u(this, "playlists");
    u(this, "debouncedSave", q(() => {
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
  async addItem(a, t, e = "music") {
    const i = M(a);
    if (!i.valid)
      throw new Error(i.error || "Invalid audio file");
    const s = t || this.extractNameFromUrl(a), r = this.findByUrl(a);
    if (r)
      throw new Error(`Track with this URL already exists: ${r.name}`);
    if (this.findByName(s))
      throw new Error(`Track with name "${s}" already exists in library`);
    const l = Date.now(), d = {
      id: P(),
      url: a,
      name: s,
      tags: [],
      duration: 0,
      favorite: !1,
      addedAt: l,
      updatedAt: l
    };
    return this.items.set(d.id, d), this.scheduleSave(), o.info(`Library item added: ${d.name} (${d.id})`), d;
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
    const a = /* @__PURE__ */ new Set();
    return this.items.forEach((t) => {
      t.tags.forEach((e) => a.add(e));
    }), Array.from(a).sort();
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
    }), e > 0 && (this.scheduleSave(), o.info(`Tag renamed: "${a}" → "${t}" (${e} items)`)), e;
  }
  /**
   * Delete tag globally
   */
  deleteTag(a) {
    let t = 0;
    return this.items.forEach((e) => {
      const i = e.tags.indexOf(a);
      i !== -1 && (e.tags.splice(i, 1), e.updatedAt = Date.now(), t++);
    }), t > 0 && (this.scheduleSave(), o.info(`Tag deleted: "${a}" (${t} items)`)), t;
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
      const a = game.settings.get(G, "libraryState");
      if (!a) {
        o.info("No saved library state, starting fresh");
        return;
      }
      const t = JSON.parse(a);
      t.version !== C && o.warn(`Library version mismatch: ${t.version} → ${C}`), this.items.clear(), Object.values(t.items).forEach((e) => {
        this.items.set(e.id, e);
      }), this.playlists.load(t.playlists || {}), o.info(`Library loaded: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (a) {
      o.error("Failed to load library state:", a);
    }
  }
  saveToSettings() {
    try {
      const a = {
        items: Object.fromEntries(this.items),
        playlists: this.playlists.export(),
        version: C,
        lastModified: Date.now()
      };
      game.settings.set(G, "libraryState", JSON.stringify(a)), this.saveScheduled = !1, o.debug(`Library saved: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
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
const F = "advanced-sound-engine";
let p = null, k = null, T = null, w = null, y = null, v = null, g = null;
Hooks.on("getSceneControlButtons", (c) => {
  var e;
  console.log("ASE: Hook fired", c);
  const a = ((e = game.user) == null ? void 0 : e.isGM) ?? !1, t = {
    "open-panel": {
      name: "open-panel",
      title: a ? "Sound Mixer" : "Sound Volume",
      icon: a ? "fas fa-sliders-h" : "fas fa-volume-up",
      button: !0,
      onClick: () => {
        var i;
        return (i = window.ASE) == null ? void 0 : i.openPanel();
      }
    }
  };
  a && (t["open-library"] = {
    name: "open-library",
    title: "Sound Library",
    icon: "fas fa-book",
    button: !0,
    onClick: () => {
      var i, s;
      return (s = (i = window.ASE) == null ? void 0 : i.openLibrary) == null ? void 0 : s.call(i);
    }
  }), c["advanced-sound-engine"] = {
    name: "advanced-sound-engine",
    title: a ? "Advanced Sound Engine" : "Sound Volume",
    icon: a ? "fas fa-sliders-h" : "fas fa-volume-up",
    visible: !0,
    tools: t
  };
});
function at() {
  Handlebars.registerHelper("formatDuration", (c) => {
    if (!c || c <= 0) return "--:--";
    const a = Math.floor(c / 60), t = Math.floor(c % 60);
    return `${a}:${t.toString().padStart(2, "0")}`;
  }), Handlebars.registerHelper("eq", (c, a) => c === a);
}
Hooks.once("init", () => {
  o.info("Initializing Advanced Sound Engine..."), ct(), at();
});
Hooks.once("ready", async () => {
  var a;
  const c = ((a = game.user) == null ? void 0 : a.isGM) ?? !1;
  o.info(`Starting Advanced Sound Engine (${c ? "GM" : "Player"})...`), g = new X(), c ? await it() : await st(), window.ASE = {
    isGM: c,
    openPanel: c ? rt : nt,
    openLibrary: c ? ot : void 0,
    engine: c ? p ?? void 0 : y ?? void 0,
    socket: g ?? void 0,
    library: c ? w ?? void 0 : void 0
  }, lt(), o.info("Advanced Sound Engine ready");
});
async function it() {
  w = new et(), p = new Y(), g.initializeAsGM(p), await p.loadSavedState();
}
async function st() {
  y = new Q(), g.initializeAsPlayer(y);
  const c = U.loadSavedVolume();
  y.setLocalVolume(c);
}
function rt() {
  !p || !g || (k && k.rendered ? k.bringToTop() : (k = new W(p, g), k.render(!0)));
}
function nt() {
  y && (v && v.rendered ? v.bringToTop() : (v = new U(y), v.render(!0)));
}
function ot() {
  w && (T && T.rendered ? T.bringToTop() : (T = new Z(w), T.render(!0)));
}
function lt() {
  const c = () => {
    p == null || p.resume(), y == null || y.resume();
  };
  document.addEventListener("click", c, { once: !0 }), document.addEventListener("keydown", c, { once: !0 }), Hooks.once("canvasReady", c);
}
function ct() {
  game.settings.register(F, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  }), game.settings.register(F, "maxSimultaneousTracks", {
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
  }), game.settings.register(F, "libraryState", {
    name: "Library State",
    hint: "Internal storage for library items and playlists",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  k == null || k.close(), T == null || T.close(), v == null || v.close(), g == null || g.dispose(), p == null || p.dispose(), y == null || y.dispose(), w == null || w.dispose();
});
//# sourceMappingURL=module.js.map
