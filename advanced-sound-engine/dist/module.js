var O = Object.defineProperty;
var U = (n, e, t) => e in n ? O(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[e] = t;
var d = (n, e, t) => U(n, typeof e != "symbol" ? e + "" : e, t);
const x = "ASE", o = {
  info: (n, ...e) => {
    console.log(`${x} | ${n}`, ...e);
  },
  warn: (n, ...e) => {
    console.warn(`${x} | ${n}`, ...e);
  },
  error: (n, ...e) => {
    console.error(`${x} | ${n}`, ...e);
  },
  debug: (n, ...e) => {
    var t;
    (t = CONFIG == null ? void 0 : CONFIG.debug) != null && t.audio && console.debug(`${x} | ${n}`, ...e);
  }
};
class G {
  constructor(e, t, a, s = "music") {
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
    this.id = e, this.ctx = t, this._group = s, this.audio = new Audio(), this.audio.crossOrigin = "anonymous", this.audio.preload = "auto", this.gainNode = t.createGain(), this.outputNode = t.createGain(), this.gainNode.connect(this.outputNode), this.outputNode.connect(a), this.setupAudioEvents();
  }
  setupAudioEvents() {
    this.audio.addEventListener("canplay", () => {
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), o.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", o.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (e) => {
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
  async load(e) {
    return this._state = "loading", this._url = e, this._ready = !1, new Promise((t, a) => {
      const s = () => {
        this.audio.removeEventListener("canplay", s), this.audio.removeEventListener("error", i), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", o.debug(`Track loaded: ${this.id}`), t();
      }, i = () => {
        this.audio.removeEventListener("canplay", s), this.audio.removeEventListener("error", i), this._state = "stopped", a(new Error(`Failed to load: ${e}`));
      };
      this.audio.addEventListener("canplay", s, { once: !0 }), this.audio.addEventListener("error", i, { once: !0 }), this.audio.src = e, this.audio.load();
    });
  }
  async play(e = 0) {
    if (!this._ready) {
      o.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(e, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", o.debug(`Track ${this.id} playing from ${e.toFixed(2)}s`);
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
    this.audio.pause(), this.audio.src = "", (e = this.sourceNode) == null || e.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), o.debug(`Track ${this.id} disposed`);
  }
}
function v() {
  return Date.now();
}
function w(n) {
  if (!isFinite(n) || n < 0) return "0:00";
  const e = Math.floor(n / 60), t = Math.floor(n % 60);
  return `${e}:${t.toString().padStart(2, "0")}`;
}
function L() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (n) => {
    const e = Math.random() * 16 | 0;
    return (n === "x" ? e : e & 3 | 8).toString(16);
  });
}
const C = [
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
function z(n) {
  const e = P(n);
  return C.includes(e);
}
function P(n) {
  try {
    const a = decodeURIComponent(n).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return a ? `.${a[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function B(n) {
  const e = P(n);
  return R[e] || null;
}
function V(n) {
  if (!n || typeof n != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const e = P(n);
  if (!e)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!z(n))
    return {
      valid: !1,
      error: `Unsupported audio format: ${e}. Supported formats: ${C.join(", ")}`,
      extension: e
    };
  const t = B(n);
  return {
    valid: !0,
    extension: e,
    mimeType: t || void 0
  };
}
const I = "advanced-sound-engine";
function j() {
  return game.settings.get(I, "maxSimultaneousTracks") || 8;
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
      await game.settings.set(I, "mixerState", JSON.stringify(e)), o.debug("Mixer state saved");
    } catch (a) {
      o.error("Failed to save mixer state:", a);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const e = game.settings.get(I, "mixerState");
        if (!e) return;
        const t = JSON.parse(e);
        await this.restoreState(t), o.info("Mixer state restored");
      } catch (e) {
        o.error("Failed to load mixer state:", e);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(e) {
    const t = e.id || L();
    if (this.players.has(t))
      return this.players.get(t);
    const a = V(e.url);
    if (!a.valid) {
      const c = new Error(a.error || "Invalid audio file");
      throw o.error(`Track validation failed: ${a.error}`), c;
    }
    const s = this.channelGains[e.group], i = new G(
      t,
      this.ctx,
      s,
      e.group
    );
    return e.volume !== void 0 && i.setVolume(e.volume), e.loop !== void 0 && i.setLoop(e.loop), await i.load(e.url), this.players.set(t, i), this.scheduleSave(), o.info(`Track created: ${t} (${a.extension})`), i;
  }
  getTrack(e) {
    return this.players.get(e);
  }
  removeTrack(e) {
    const t = this.players.get(e);
    return t ? (t.dispose(), this.players.delete(e), this.scheduleSave(), o.info(`Track removed: ${e}`), !0) : !1;
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
    var r;
    const a = this.players.get(e);
    if (!a) {
      o.warn(`Track not found: ${e}`);
      return;
    }
    const s = j(), i = this.getAllTracks().filter((l) => l.state === "playing").length;
    if (!(a.state === "playing") && i >= s) {
      o.warn(`Maximum simultaneous tracks (${s}) reached`), (r = ui.notifications) == null || r.warn(`Cannot play more than ${s} tracks simultaneously`);
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
      timestamp: v(),
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
        } catch (s) {
          o.error(`Failed to restore track ${a.id}:`, s);
        }
    const t = new Set(e.tracks.map((a) => a.id));
    for (const [a] of this.players)
      t.has(a) || this.removeTrack(a);
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
    for (const e of this.players.values())
      e.dispose();
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
    t || (t = new G(
      e.trackId,
      this.ctx,
      this.channelGains[e.group],
      e.group
    ), await t.load(e.url), this.players.set(e.trackId, t)), t.setVolume(e.volume), t.setLoop(e.loop);
    const a = (v() - e.startTimestamp) / 1e3, s = Math.max(0, e.offset + a);
    await t.play(s), o.debug(`Player: track ${e.trackId} playing at ${s.toFixed(2)}s`);
  }
  handlePause(e) {
    var t;
    (t = this.players.get(e)) == null || t.pause();
  }
  handleStop(e) {
    var t;
    (t = this.players.get(e)) == null || t.stop();
  }
  handleSeek(e, t, a, s) {
    const i = this.players.get(e);
    if (i)
      if (a) {
        const c = (v() - s) / 1e3;
        i.seek(t + c);
      } else
        i.seek(t);
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
    const a = new Set(e.map((s) => s.id));
    for (const [s, i] of this.players)
      a.has(s) || (i.dispose(), this.players.delete(s));
    for (const s of e) {
      let i = this.players.get(s.id);
      if (i || (i = new G(
        s.id,
        this.ctx,
        this.channelGains[s.group],
        s.group
      ), await i.load(s.url), this.players.set(s.id, i)), i.setVolume(s.volume), i.setLoop(s.loop), s.isPlaying) {
        const c = (v() - s.startTimestamp) / 1e3, r = s.currentTime + c;
        await i.play(r);
      } else
        i.stop();
    }
    o.info("Player: synced state from GM");
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
const Y = "advanced-sound-engine", S = `module.${Y}`;
class q {
  constructor() {
    d(this, "gmEngine", null);
    d(this, "playerEngine", null);
    d(this, "socket", null);
    d(this, "_syncEnabled", !1);
    d(this, "isGM", !1);
  }
  initializeAsGM(e) {
    var t;
    this.isGM = !0, this.gmEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(S, (a) => {
      this.handleGMMessage(a);
    }), o.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(e) {
    var t;
    this.isGM = !1, this.playerEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(S, (a) => {
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
  setSyncEnabled(e) {
    this.isGM && (this._syncEnabled = e, e ? this.broadcastSyncStart() : this.broadcastSyncStop(), o.info(`Sync mode: ${e ? "ON" : "OFF"}`));
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
      switch (o.debug(`Player received: ${e.type}`, e.payload), e.type) {
        case "sync-start":
          const a = e.payload;
          await this.playerEngine.syncState(a.tracks, a.channelVolumes);
          break;
        case "sync-stop":
          this.playerEngine.clearAll();
          break;
        case "sync-state":
          const s = e.payload;
          await this.playerEngine.syncState(s.tracks, s.channelVolumes);
          break;
        case "track-play":
          const i = e.payload;
          await this.playerEngine.handlePlay(i);
          break;
        case "track-pause":
          const c = e.payload;
          this.playerEngine.handlePause(c.trackId);
          break;
        case "track-stop":
          const r = e.payload;
          this.playerEngine.handleStop(r.trackId);
          break;
        case "track-seek":
          const l = e.payload;
          this.playerEngine.handleSeek(
            l.trackId,
            l.time,
            l.isPlaying,
            l.seekTimestamp
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
          const T = e.payload;
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
  send(e, t, a) {
    var i;
    if (!this.socket) return;
    const s = {
      type: e,
      payload: t,
      senderId: ((i = game.user) == null ? void 0 : i.id) ?? "",
      timestamp: v()
    };
    a ? this.socket.emit(S, s, { recipients: [a] }) : this.socket.emit(S, s), o.debug(`Sent: ${e}`, t);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const e = v(), t = [];
    for (const a of this.gmEngine.getAllTracks()) {
      const s = a.getState();
      t.push({
        id: s.id,
        url: s.url,
        group: s.group,
        volume: s.volume,
        loop: s.loop,
        isPlaying: s.playbackState === "playing",
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
    const s = {
      trackId: e,
      url: a.url,
      group: a.group,
      volume: a.volume,
      loop: a.loop,
      offset: t,
      startTimestamp: v()
    };
    this.send("track-play", s);
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
    const s = {
      trackId: e,
      time: t,
      isPlaying: a,
      seekTimestamp: v()
    };
    this.send("track-seek", s);
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
    (e = this.socket) == null || e.off(S);
  }
}
function A(n, e) {
  let t = 0, a = null;
  return function(...s) {
    const i = Date.now(), c = e - (i - t);
    c <= 0 ? (a && (clearTimeout(a), a = null), t = i, n.apply(this, s)) : a || (a = setTimeout(() => {
      t = Date.now(), a = null, n.apply(this, s);
    }, c));
  };
}
function K(n, e) {
  let t = null;
  return function(...a) {
    t && clearTimeout(t), t = setTimeout(() => {
      n.apply(this, a);
    }, e);
  };
}
const D = "advanced-sound-engine";
function Q() {
  return game.settings.get(D, "maxSimultaneousTracks") || 8;
}
class X extends Application {
  constructor(t, a, s) {
    super(s);
    d(this, "engine");
    d(this, "socket");
    d(this, "updateInterval", null);
    this.engine = t, this.socket = a;
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
    const t = this.engine.getAllTracks().map((i) => this.getTrackViewData(i)), a = this.engine.volumes, s = t.filter((i) => i.isPlaying).length;
    return {
      tracks: t,
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
  getTrackViewData(t) {
    const a = t.getState(), s = t.getCurrentTime(), i = t.getDuration();
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
      currentTimeFormatted: w(s),
      duration: i,
      durationFormatted: w(i),
      progress: i > 0 ? s / i * 100 : 0
    };
  }
  extractFileName(t) {
    if (!t) return "Unknown";
    try {
      const s = decodeURIComponent(t).split("/");
      return s[s.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      const a = t.split("/");
      return a[a.length - 1].replace(/\.[^.]+$/, "");
    }
  }
  activateListeners(t) {
    super.activateListeners(t), t.find("#ase-sync-toggle").on("change", (r) => {
      const l = r.target.checked;
      this.socket.setSyncEnabled(l), this.updateSyncIndicator(t, l);
    });
    const a = A((r, l) => {
      r === "master" ? (this.engine.setMasterVolume(l), this.socket.broadcastChannelVolume("master", l)) : (this.engine.setChannelVolume(r, l), this.socket.broadcastChannelVolume(r, l));
    }, 50);
    t.find(".ase-channel-slider").on("input", (r) => {
      const l = $(r.currentTarget).data("channel"), u = parseFloat(r.target.value) / 100;
      a(l, u), $(r.currentTarget).siblings(".ase-channel-value").text(`${Math.round(u * 100)}%`);
    }), t.find("#ase-add-track").on("click", () => this.onAddTrack());
    const s = t.find(".ase-tracks");
    s.on("click", ".ase-btn-play", (r) => {
      const l = $(r.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(l);
    }), s.on("click", ".ase-btn-pause", (r) => {
      const l = $(r.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(l);
    }), s.on("click", ".ase-btn-stop", (r) => {
      const l = $(r.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(l);
    }), s.on("click", ".ase-btn-remove", (r) => {
      const l = $(r.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(l);
    }), s.on("change", ".ase-loop-toggle", (r) => {
      const l = $(r.currentTarget).closest(".ase-track").data("track-id"), u = r.target.checked;
      this.engine.setTrackLoop(l, u), this.socket.broadcastTrackLoop(l, u);
    }), s.on("change", ".ase-channel-select", (r) => {
      const l = $(r.currentTarget).data("track-id"), u = r.target.value;
      this.engine.setTrackChannel(l, u);
    });
    const i = A((r, l) => {
      this.engine.setTrackVolume(r, l), this.socket.broadcastTrackVolume(r, l);
    }, 50);
    s.on("input", ".ase-volume-slider", (r) => {
      const l = $(r.currentTarget).closest(".ase-track").data("track-id"), u = parseFloat(r.target.value) / 100;
      i(l, u), $(r.currentTarget).siblings(".ase-volume-value").text(`${Math.round(u * 100)}%`);
    });
    const c = A((r, l) => {
      const u = this.engine.getTrack(r), h = (u == null ? void 0 : u.state) === "playing";
      this.engine.seekTrack(r, l), this.socket.broadcastTrackSeek(r, l, h ?? !1);
    }, 100);
    s.on("input", ".ase-seek-slider", (r) => {
      const l = $(r.currentTarget).closest(".ase-track").data("track-id"), u = this.engine.getTrack(l);
      if (u) {
        const T = parseFloat(r.target.value) / 100 * u.getDuration();
        c(l, T);
      }
    }), t.find("#ase-stop-all").on("click", () => {
      this.engine.stopAll(), this.socket.broadcastStopAll(), this.render();
    }), this.startUpdates();
  }
  updateSyncIndicator(t, a) {
    const s = t.find(".ase-sync-status");
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
    const t = this.element;
    if (!t || !t.length) return;
    let a = 0;
    for (const i of this.engine.getAllTracks()) {
      const c = t.find(`.ase-track[data-track-id="${i.id}"]`);
      if (!c.length) continue;
      const r = i.getCurrentTime(), l = i.getDuration(), u = l > 0 ? r / l * 100 : 0, h = i.state;
      h === "playing" && a++, c.find(".ase-time-current").text(w(r));
      const T = c.find(".ase-seek-slider");
      T.is(":active") || T.val(u), c.removeClass("is-playing is-paused is-stopped is-loading"), c.addClass(`is-${h}`), c.find(".ase-btn-play").prop("disabled", h === "playing" || h === "loading"), c.find(".ase-btn-pause").prop("disabled", h !== "playing"), c.find(".ase-btn-stop").prop("disabled", h === "stopped");
    }
    const s = this.engine.getAllTracks().length;
    t.find(".ase-track-count").text(`${a}/${s} playing`);
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
    var i, c;
    const s = L();
    try {
      await this.engine.createTrack({
        id: s,
        url: t,
        group: a,
        volume: 1,
        loop: !1
      }), this.render(), (i = ui.notifications) == null || i.info(`Added: ${this.extractFileName(t)}`);
    } catch (r) {
      o.error("Failed to add track:", r);
      const l = r instanceof Error ? r.message : "Unknown error";
      (c = ui.notifications) == null || c.error(`Failed to load: ${l}`);
    }
  }
  async onPlayTrack(t) {
    const a = this.engine.getTrack(t);
    if (!a) return;
    const s = a.state === "paused" ? a.getCurrentTime() : 0;
    await this.engine.playTrack(t, s), this.socket.broadcastTrackPlay(t, s);
  }
  onPauseTrack(t) {
    const a = this.engine.getTrack(t);
    if (!a) return;
    const s = a.getCurrentTime();
    this.engine.pauseTrack(t), this.socket.broadcastTrackPause(t, s);
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
      const s = parseFloat(a.target.value) / 100;
      this.engine.setLocalVolume(s), t.find(".ase-volume-value").text(`${Math.round(s * 100)}%`), this.saveVolume(s);
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
class W extends Application {
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
    const t = this.library.getAllItems(), a = this.library.getStats();
    return {
      items: t.map((s) => this.getItemViewData(s)),
      stats: {
        total: a.totalItems,
        favorites: a.favoriteItems
      }
    };
  }
  getItemViewData(t) {
    return {
      id: t.id,
      name: t.name,
      url: t.url,
      duration: w(t.duration),
      durationSeconds: t.duration,
      tags: t.tags,
      favorite: t.favorite,
      group: this.inferGroupFromTags(t.tags)
    };
  }
  inferGroupFromTags(t) {
    const a = t.map((s) => s.toLowerCase());
    return a.some((s) => s.includes("music")) ? "music" : a.some((s) => s.includes("ambient") || s.includes("ambience")) ? "ambience" : a.some((s) => s.includes("sfx") || s.includes("effect")) ? "sfx" : "music";
  }
  activateListeners(t) {
    super.activateListeners(t), t.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), t.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), t.find('[data-action="delete-track"]').on("click", this.onDeleteTrack.bind(this)), o.debug("LocalLibraryApp listeners activated");
  }
  // ─────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onAddTrack(t) {
    t.preventDefault(), new FilePicker({
      type: "audio",
      callback: async (s) => {
        await this.addTrackFromPath(s);
      }
    }).render(!0);
  }
  async addTrackFromPath(t, a = "music") {
    var s, i;
    try {
      const c = await this.library.addItem(t, void 0, a);
      this.render(), (s = ui.notifications) == null || s.info(`Added to library: ${c.name}`);
    } catch (c) {
      o.error("Failed to add track to library:", c);
      const r = c instanceof Error ? c.message : "Unknown error";
      (i = ui.notifications) == null || i.error(`Failed to add track: ${r}`);
    }
  }
  async onToggleFavorite(t) {
    var s, i;
    t.preventDefault();
    const a = $(t.currentTarget).closest("[data-item-id]").data("item-id");
    try {
      const c = this.library.toggleFavorite(a);
      this.render(), (s = ui.notifications) == null || s.info(c ? "Added to favorites" : "Removed from favorites");
    } catch (c) {
      o.error("Failed to toggle favorite:", c), (i = ui.notifications) == null || i.error("Failed to update favorite status");
    }
  }
  async onDeleteTrack(t) {
    var c, r, l;
    t.preventDefault();
    const a = $(t.currentTarget).closest("[data-item-id]").data("item-id"), s = this.library.getItem(a);
    if (!s) {
      (c = ui.notifications) == null || c.error("Track not found");
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
        this.library.removeItem(a), this.render(), (r = ui.notifications) == null || r.info(`Deleted: ${s.name}`);
      } catch (u) {
        o.error("Failed to delete track:", u), (l = ui.notifications) == null || l.error("Failed to delete track");
      }
  }
}
const F = "advanced-sound-engine", M = 1;
class Z {
  constructor() {
    d(this, "items", /* @__PURE__ */ new Map());
    d(this, "saveScheduled", !1);
    d(this, "debouncedSave", K(() => {
      this.saveToSettings();
    }, 500));
    this.loadFromSettings();
  }
  // ─────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────
  /**
   * Add new item to library
   */
  async addItem(e, t, a = "music") {
    const s = V(e);
    if (!s.valid)
      throw new Error(s.error || "Invalid audio file");
    const i = t || this.extractNameFromUrl(e), c = this.findByUrl(e);
    if (c)
      throw new Error(`Track with this URL already exists: ${c.name}`);
    if (this.findByName(i))
      throw new Error(`Track with name "${i}" already exists in library`);
    const l = Date.now(), u = {
      id: L(),
      url: e,
      name: i,
      tags: [],
      duration: 0,
      favorite: !1,
      addedAt: l,
      updatedAt: l
    };
    return this.items.set(u.id, u), this.scheduleSave(), o.info(`Library item added: ${u.name} (${u.id})`), u;
  }
  /**
   * Update existing item
   */
  updateItem(e, t) {
    const a = this.items.get(e);
    if (!a)
      throw new Error(`Library item not found: ${e}`);
    if (t.name && t.name !== a.name) {
      const i = this.findByName(t.name);
      if (i && i.id !== e)
        throw new Error(`Track with name "${t.name}" already exists`);
    }
    if (t.url && t.url !== a.url) {
      const i = V(t.url);
      if (!i.valid)
        throw new Error(i.error || "Invalid audio file");
      const c = this.findByUrl(t.url);
      if (c && c.id !== e)
        throw new Error(`Track with this URL already exists: ${c.name}`);
    }
    delete t.id;
    const s = {
      ...a,
      ...t,
      updatedAt: Date.now()
    };
    return this.items.set(e, s), this.scheduleSave(), o.info(`Library item updated: ${s.name}`), s;
  }
  /**
   * Remove item from library
   */
  removeItem(e) {
    const t = this.items.get(e);
    if (!t)
      throw new Error(`Library item not found: ${e}`);
    this.items.delete(e), this.scheduleSave(), o.info(`Library item removed: ${t.name}`);
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
    const s = a.tags.indexOf(t);
    s !== -1 && (a.tags.splice(s, 1), a.updatedAt = Date.now(), this.scheduleSave());
  }
  /**
   * Rename tag globally
   */
  renameTag(e, t) {
    let a = 0;
    return this.items.forEach((s) => {
      const i = s.tags.indexOf(e);
      i !== -1 && (s.tags[i] = t, s.updatedAt = Date.now(), a++);
    }), a > 0 && (this.scheduleSave(), o.info(`Tag renamed: "${e}" → "${t}" (${a} items)`)), a;
  }
  /**
   * Delete tag globally
   */
  deleteTag(e) {
    let t = 0;
    return this.items.forEach((a) => {
      const s = a.tags.indexOf(e);
      s !== -1 && (a.tags.splice(s, 1), a.updatedAt = Date.now(), t++);
    }), t > 0 && (this.scheduleSave(), o.info(`Tag deleted: "${e}" (${t} items)`)), t;
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
      const e = game.settings.get(F, "libraryState");
      if (!e) {
        o.info("No saved library state, starting fresh");
        return;
      }
      const t = JSON.parse(e);
      t.version !== M && o.warn(`Library version mismatch: ${t.version} → ${M}`), this.items.clear(), Object.values(t.items).forEach((a) => {
        this.items.set(a.id, a);
      }), o.info(`Library loaded: ${this.items.size} items`);
    } catch (e) {
      o.error("Failed to load library state:", e);
    }
  }
  saveToSettings() {
    try {
      const e = {
        items: Object.fromEntries(this.items),
        playlists: {},
        version: M,
        lastModified: Date.now()
      };
      game.settings.set(F, "libraryState", JSON.stringify(e)), this.saveScheduled = !1, o.debug(`Library saved: ${this.items.size} items`);
    } catch (e) {
      o.error("Failed to save library state:", e);
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
    const e = this.getAllItems();
    return {
      totalItems: e.length,
      favoriteItems: e.filter((t) => t.favorite).length,
      totalDuration: e.reduce((t, a) => t + a.duration, 0),
      tagCount: this.getAllTags().length
    };
  }
  /**
   * Clear all library data
   */
  clear() {
    this.items.clear(), this.scheduleSave(), o.warn("Library cleared");
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.saveScheduled && this.saveToSettings();
  }
}
const _ = "advanced-sound-engine";
let m = null, f = null, y = null, b = null, p = null, k = null, g = null;
Hooks.on("getSceneControlButtons", (n) => {
  var a;
  console.log("ASE: Hook fired", n);
  const e = ((a = game.user) == null ? void 0 : a.isGM) ?? !1, t = {
    "open-panel": {
      name: "open-panel",
      title: e ? "Sound Mixer" : "Sound Volume",
      icon: e ? "fas fa-sliders-h" : "fas fa-volume-up",
      button: !0,
      onClick: () => {
        var s;
        return (s = window.ASE) == null ? void 0 : s.openPanel();
      }
    }
  };
  e && (t["open-library"] = {
    name: "open-library",
    title: "Sound Library",
    icon: "fas fa-book",
    button: !0,
    onClick: () => {
      var s, i;
      return (i = (s = window.ASE) == null ? void 0 : s.openLibrary) == null ? void 0 : i.call(s);
    }
  }), n["advanced-sound-engine"] = {
    name: "advanced-sound-engine",
    title: e ? "Advanced Sound Engine" : "Sound Volume",
    icon: e ? "fas fa-sliders-h" : "fas fa-volume-up",
    visible: !0,
    tools: t
  };
});
Hooks.once("init", () => {
  o.info("Initializing Advanced Sound Engine..."), re();
});
Hooks.once("ready", async () => {
  var e;
  const n = ((e = game.user) == null ? void 0 : e.isGM) ?? !1;
  o.info(`Starting Advanced Sound Engine (${n ? "GM" : "Player"})...`), g = new q(), n ? await ee() : await te(), window.ASE = {
    isGM: n,
    openPanel: n ? ae : se,
    openLibrary: n ? ie : void 0,
    engine: n ? m ?? void 0 : p ?? void 0,
    socket: g ?? void 0,
    library: n ? b ?? void 0 : void 0
  }, ne(), o.info("Advanced Sound Engine ready");
});
async function ee() {
  b = new Z(), m = new H(), g.initializeAsGM(m), await m.loadSavedState();
}
async function te() {
  p = new J(), g.initializeAsPlayer(p);
  const n = N.loadSavedVolume();
  p.setLocalVolume(n);
}
function ae() {
  !m || !g || (f && f.rendered ? f.bringToTop() : (f = new X(m, g), f.render(!0)));
}
function se() {
  p && (k && k.rendered ? k.bringToTop() : (k = new N(p), k.render(!0)));
}
function ie() {
  b && (y && y.rendered ? y.bringToTop() : (y = new W(b), y.render(!0)));
}
function ne() {
  const n = () => {
    m == null || m.resume(), p == null || p.resume();
  };
  document.addEventListener("click", n, { once: !0 }), document.addEventListener("keydown", n, { once: !0 }), Hooks.once("canvasReady", n);
}
function re() {
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
  f == null || f.close(), y == null || y.close(), k == null || k.close(), g == null || g.dispose(), m == null || m.dispose(), p == null || p.dispose(), b == null || b.dispose();
});
//# sourceMappingURL=module.js.map
