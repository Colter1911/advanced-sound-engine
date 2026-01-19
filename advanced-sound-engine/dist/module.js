var O = Object.defineProperty;
var R = (l, e, t) => e in l ? O(l, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : l[e] = t;
var d = (l, e, t) => R(l, typeof e != "symbol" ? e + "" : e, t);
const P = "ASE", n = {
  info: (l, ...e) => {
    console.log(`${P} | ${l}`, ...e);
  },
  warn: (l, ...e) => {
    console.warn(`${P} | ${l}`, ...e);
  },
  error: (l, ...e) => {
    console.error(`${P} | ${l}`, ...e);
  },
  debug: (l, ...e) => {
    var t;
    (t = CONFIG == null ? void 0 : CONFIG.debug) != null && t.audio && console.debug(`${P} | ${l}`, ...e);
  }
};
class F {
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
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), n.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", n.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (e) => {
      n.error(`Track ${this.id} error:`, this.audio.error), this._state = "stopped";
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
        this.audio.removeEventListener("canplay", s), this.audio.removeEventListener("error", i), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", n.debug(`Track loaded: ${this.id}`), t();
      }, i = () => {
        this.audio.removeEventListener("canplay", s), this.audio.removeEventListener("error", i), this._state = "stopped", a(new Error(`Failed to load: ${e}`));
      };
      this.audio.addEventListener("canplay", s, { once: !0 }), this.audio.addEventListener("error", i, { once: !0 }), this.audio.src = e, this.audio.load();
    });
  }
  async play(e = 0) {
    if (!this._ready) {
      n.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(e, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", n.debug(`Track ${this.id} playing from ${e.toFixed(2)}s`);
    } catch (t) {
      n.error(`Failed to play ${this.id}:`, t);
    }
  }
  pause() {
    this._state === "playing" && (this.audio.pause(), this._state = "paused", n.debug(`Track ${this.id} paused at ${this.audio.currentTime.toFixed(2)}s`));
  }
  stop() {
    this.audio.pause(), this.audio.currentTime = 0, this._state = "stopped", n.debug(`Track ${this.id} stopped`);
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
    this.audio.pause(), this.audio.src = "", (e = this.sourceNode) == null || e.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), n.debug(`Track ${this.id} disposed`);
  }
}
function b() {
  return Date.now();
}
function A(l) {
  if (!isFinite(l) || l < 0) return "0:00";
  const e = Math.floor(l / 60), t = Math.floor(l % 60);
  return `${e}:${t.toString().padStart(2, "0")}`;
}
function x() {
  return typeof crypto < "u" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (l) => {
    const e = Math.random() * 16 | 0;
    return (l === "x" ? e : e & 3 | 8).toString(16);
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
function z(l) {
  const e = G(l);
  return L.includes(e);
}
function G(l) {
  try {
    const a = decodeURIComponent(l).split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
    return a ? `.${a[1].toLowerCase()}` : "";
  } catch {
    return "";
  }
}
function H(l) {
  const e = G(l);
  return B[e] || null;
}
function D(l) {
  if (!l || typeof l != "string")
    return {
      valid: !1,
      error: "URL is required and must be a string"
    };
  const e = G(l);
  if (!e)
    return {
      valid: !1,
      error: "Could not extract file extension from URL"
    };
  if (!z(l))
    return {
      valid: !1,
      error: `Unsupported audio format: ${e}. Supported formats: ${L.join(", ")}`,
      extension: e
    };
  const t = H(l);
  return {
    valid: !0,
    extension: e,
    mimeType: t || void 0
  };
}
const _ = "advanced-sound-engine";
function j() {
  return game.settings.get(_, "maxSimultaneousTracks") || 8;
}
class Q {
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
    }, this.channelGains.music.connect(this.masterGain), this.channelGains.ambience.connect(this.masterGain), this.channelGains.sfx.connect(this.masterGain), n.info("AudioEngine initialized");
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
      await game.settings.set(_, "mixerState", JSON.stringify(e)), n.debug("Mixer state saved");
    } catch (a) {
      n.error("Failed to save mixer state:", a);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const e = game.settings.get(_, "mixerState");
        if (!e) return;
        const t = JSON.parse(e);
        await this.restoreState(t), n.info("Mixer state restored");
      } catch (e) {
        n.error("Failed to load mixer state:", e);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(e) {
    const t = e.id || x();
    if (this.players.has(t))
      return this.players.get(t);
    const a = D(e.url);
    if (!a.valid) {
      const r = new Error(a.error || "Invalid audio file");
      throw n.error(`Track validation failed: ${a.error}`), r;
    }
    const s = this.channelGains[e.group], i = new F(
      t,
      this.ctx,
      s,
      e.group
    );
    return e.volume !== void 0 && i.setVolume(e.volume), e.loop !== void 0 && i.setLoop(e.loop), await i.load(e.url), this.players.set(t, i), this.scheduleSave(), n.info(`Track created: ${t} (${a.extension})`), i;
  }
  getTrack(e) {
    return this.players.get(e);
  }
  removeTrack(e) {
    const t = this.players.get(e);
    return t ? (t.dispose(), this.players.delete(e), this.scheduleSave(), n.info(`Track removed: ${e}`), !0) : !1;
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
      n.warn(`Track not found: ${e}`);
      return;
    }
    const s = j(), i = this.getAllTracks().filter((c) => c.state === "playing").length;
    if (!(a.state === "playing") && i >= s) {
      n.warn(`Maximum simultaneous tracks (${s}) reached`), (o = ui.notifications) == null || o.warn(`Cannot play more than ${s} tracks simultaneously`);
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
      timestamp: b(),
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
          n.error(`Failed to restore track ${a.id}:`, s);
        }
    const t = new Set(e.tracks.map((a) => a.id));
    for (const [a] of this.players)
      t.has(a) || this.removeTrack(a);
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), n.info("AudioContext resumed"));
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
    this.players.clear(), this.ctx.close(), n.info("AudioEngine disposed");
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
    }, this.channelGains.music.connect(this.gmGain), this.channelGains.ambience.connect(this.gmGain), this.channelGains.sfx.connect(this.gmGain), n.info("PlayerAudioEngine initialized");
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
    t || (t = new F(
      e.trackId,
      this.ctx,
      this.channelGains[e.group],
      e.group
    ), await t.load(e.url), this.players.set(e.trackId, t)), t.setVolume(e.volume), t.setLoop(e.loop);
    const a = (b() - e.startTimestamp) / 1e3, s = Math.max(0, e.offset + a);
    await t.play(s), n.debug(`Player: track ${e.trackId} playing at ${s.toFixed(2)}s`);
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
        const r = (b() - s) / 1e3;
        i.seek(t + r);
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
      if (i || (i = new F(
        s.id,
        this.ctx,
        this.channelGains[s.group],
        s.group
      ), await i.load(s.url), this.players.set(s.id, i)), i.setVolume(s.volume), i.setLoop(s.loop), s.isPlaying) {
        const r = (b() - s.startTimestamp) / 1e3, o = s.currentTime + r;
        await i.play(o);
      } else
        i.stop();
    }
    n.info("Player: synced state from GM");
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
    this.players.clear(), n.info("Player: all tracks cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), n.info("PlayerAudioEngine: AudioContext resumed"));
  }
  dispose() {
    this.clearAll(), this.ctx.close(), n.info("PlayerAudioEngine disposed");
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
  initializeAsGM(e) {
    var t;
    this.isGM = !0, this.gmEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(w, (a) => {
      this.handleGMMessage(a);
    }), n.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(e) {
    var t;
    this.isGM = !1, this.playerEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(w, (a) => {
      this.handlePlayerMessage(a);
    }), setTimeout(() => {
      this.send("player-ready", {});
    }, 1e3), n.info("SocketManager initialized as Player");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Mode (GM)
  // ─────────────────────────────────────────────────────────────
  get syncEnabled() {
    return this._syncEnabled;
  }
  setSyncEnabled(e) {
    this.isGM && (this._syncEnabled = e, e ? this.broadcastSyncStart() : this.broadcastSyncStop(), n.info(`Sync mode: ${e ? "ON" : "OFF"}`));
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
      switch (n.debug(`Player received: ${e.type}`, e.payload), e.type) {
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
          const r = e.payload;
          this.playerEngine.handlePause(r.trackId);
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
    var i;
    if (!this.socket) return;
    const s = {
      type: e,
      payload: t,
      senderId: ((i = game.user) == null ? void 0 : i.id) ?? "",
      timestamp: b()
    };
    a ? this.socket.emit(w, s, { recipients: [a] }) : this.socket.emit(w, s), n.debug(`Sent: ${e}`, t);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const e = b(), t = [];
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
      startTimestamp: b()
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
      seekTimestamp: b()
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
    (e = this.socket) == null || e.off(w);
  }
}
function E(l, e) {
  let t = 0, a = null;
  return function(...s) {
    const i = Date.now(), r = e - (i - t);
    r <= 0 ? (a && (clearTimeout(a), a = null), t = i, l.apply(this, s)) : a || (a = setTimeout(() => {
      t = Date.now(), a = null, l.apply(this, s);
    }, r));
  };
}
function K(l, e) {
  let t = null;
  return function(...a) {
    t && clearTimeout(t), t = setTimeout(() => {
      l.apply(this, a);
    }, e);
  };
}
const N = "advanced-sound-engine";
function W() {
  return game.settings.get(N, "maxSimultaneousTracks") || 8;
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
      maxSimultaneous: W(),
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
      currentTimeFormatted: A(s),
      duration: i,
      durationFormatted: A(i),
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
    super.activateListeners(t), t.find("#ase-sync-toggle").on("change", (o) => {
      const c = o.target.checked;
      this.socket.setSyncEnabled(c), this.updateSyncIndicator(t, c);
    });
    const a = E((o, c) => {
      o === "master" ? (this.engine.setMasterVolume(c), this.socket.broadcastChannelVolume("master", c)) : (this.engine.setChannelVolume(o, c), this.socket.broadcastChannelVolume(o, c));
    }, 50);
    t.find(".ase-channel-slider").on("input", (o) => {
      const c = $(o.currentTarget).data("channel"), u = parseFloat(o.target.value) / 100;
      a(c, u), $(o.currentTarget).siblings(".ase-channel-value").text(`${Math.round(u * 100)}%`);
    }), t.find("#ase-add-track").on("click", () => this.onAddTrack());
    const s = t.find(".ase-tracks");
    s.on("click", ".ase-btn-play", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(c);
    }), s.on("click", ".ase-btn-pause", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(c);
    }), s.on("click", ".ase-btn-stop", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(c);
    }), s.on("click", ".ase-btn-remove", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(c);
    }), s.on("change", ".ase-loop-toggle", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id"), u = o.target.checked;
      this.engine.setTrackLoop(c, u), this.socket.broadcastTrackLoop(c, u);
    }), s.on("change", ".ase-channel-select", (o) => {
      const c = $(o.currentTarget).data("track-id"), u = o.target.value;
      this.engine.setTrackChannel(c, u);
    });
    const i = E((o, c) => {
      this.engine.setTrackVolume(o, c), this.socket.broadcastTrackVolume(o, c);
    }, 50);
    s.on("input", ".ase-volume-slider", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id"), u = parseFloat(o.target.value) / 100;
      i(c, u), $(o.currentTarget).siblings(".ase-volume-value").text(`${Math.round(u * 100)}%`);
    });
    const r = E((o, c) => {
      const u = this.engine.getTrack(o), h = (u == null ? void 0 : u.state) === "playing";
      this.engine.seekTrack(o, c), this.socket.broadcastTrackSeek(o, c, h ?? !1);
    }, 100);
    s.on("input", ".ase-seek-slider", (o) => {
      const c = $(o.currentTarget).closest(".ase-track").data("track-id"), u = this.engine.getTrack(c);
      if (u) {
        const m = parseFloat(o.target.value) / 100 * u.getDuration();
        r(c, m);
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
      const r = t.find(`.ase-track[data-track-id="${i.id}"]`);
      if (!r.length) continue;
      const o = i.getCurrentTime(), c = i.getDuration(), u = c > 0 ? o / c * 100 : 0, h = i.state;
      h === "playing" && a++, r.find(".ase-time-current").text(A(o));
      const m = r.find(".ase-seek-slider");
      m.is(":active") || m.val(u), r.removeClass("is-playing is-paused is-stopped is-loading"), r.addClass(`is-${h}`), r.find(".ase-btn-play").prop("disabled", h === "playing" || h === "loading"), r.find(".ase-btn-pause").prop("disabled", h !== "playing"), r.find(".ase-btn-stop").prop("disabled", h === "stopped");
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
    var i, r;
    const s = x();
    try {
      await this.engine.createTrack({
        id: s,
        url: t,
        group: a,
        volume: 1,
        loop: !1
      }), this.render(), (i = ui.notifications) == null || i.info(`Added: ${this.extractFileName(t)}`);
    } catch (o) {
      n.error("Failed to add track:", o);
      const c = o instanceof Error ? o.message : "Unknown error";
      (r = ui.notifications) == null || r.error(`Failed to load: ${c}`);
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
const I = "advanced-sound-engine";
class U extends Application {
  constructor(t, a) {
    super(a);
    d(this, "engine");
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
    super.activateListeners(t), t.find(".ase-volume-slider").on("input", (a) => {
      const s = parseFloat(a.target.value) / 100;
      this.engine.setLocalVolume(s), t.find(".ase-volume-value").text(`${Math.round(s * 100)}%`), this.saveVolume(s);
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
  constructor(t, a = {}) {
    super(a);
    d(this, "library");
    d(this, "filterState");
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
    const a = this.library.playlists.getAllPlaylists(), s = this.library.getAllTags(), i = this.library.getStats();
    t = this.applyFilters(t), t = this.applySorting(t);
    const r = this.library.getFavorites(), o = this.library.playlists.getFavoritePlaylists(), c = [
      ...r.map((g) => ({
        id: g.id,
        name: g.name,
        type: "track"
      })),
      ...o.map((g) => ({
        id: g.id,
        name: g.name,
        type: "playlist"
      }))
    ], u = s.map((g) => ({
      name: g,
      selected: this.filterState.selectedTags.has(g)
    })), h = a.map((g) => ({
      ...this.getPlaylistViewData(g),
      selected: g.id === this.filterState.selectedPlaylistId
    })), m = !!(this.filterState.searchQuery || this.filterState.selectedChannel !== "all" || this.filterState.selectedPlaylistId || this.filterState.selectedTags.size > 0);
    return {
      items: t.map((g) => this.getItemViewData(g)),
      playlists: h,
      favorites: c,
      tags: u,
      stats: {
        totalItems: i.totalItems,
        favoriteItems: i.favoriteItems,
        playlists: i.playlists,
        tagCount: i.tagCount
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
    const a = t.map((s) => s.toLowerCase());
    return a.some((s) => s.includes("music")) ? "music" : a.some((s) => s.includes("ambient") || s.includes("ambience")) ? "ambience" : a.some((s) => s.includes("sfx") || s.includes("effect")) ? "sfx" : "music";
  }
  // ─────────────────────────────────────────────────────────────
  // Filtering & Sorting
  // ─────────────────────────────────────────────────────────────
  applyFilters(t) {
    let a = t;
    if (this.filterState.searchQuery) {
      const s = this.filterState.searchQuery.toLowerCase();
      a = a.filter(
        (i) => i.name.toLowerCase().includes(s) || i.tags.some((r) => r.toLowerCase().includes(s))
      );
    }
    if (this.filterState.selectedChannel !== "all" && (a = a.filter((s) => this.inferGroupFromTags(s.tags) === this.filterState.selectedChannel)), this.filterState.selectedPlaylistId) {
      const s = this.library.playlists.getPlaylist(this.filterState.selectedPlaylistId);
      if (s) {
        const i = new Set(s.items.map((r) => r.libraryItemId));
        a = a.filter((r) => i.has(r.id));
      }
    }
    return this.filterState.selectedTags.size > 0 && (a = a.filter(
      (s) => s.tags.some((i) => this.filterState.selectedTags.has(i))
    )), a;
  }
  applySorting(t) {
    const a = [...t];
    switch (this.filterState.sortBy) {
      case "name-asc":
        a.sort((s, i) => s.name.localeCompare(i.name));
        break;
      case "name-desc":
        a.sort((s, i) => i.name.localeCompare(s.name));
        break;
      case "date-asc":
        a.sort((s, i) => s.addedAt - i.addedAt);
        break;
      case "date-desc":
        a.sort((s, i) => i.addedAt - s.addedAt);
        break;
      case "duration-asc":
        a.sort((s, i) => s.duration - i.duration);
        break;
      case "duration-desc":
        a.sort((s, i) => i.duration - s.duration);
        break;
    }
    return a;
  }
  activateListeners(t) {
    super.activateListeners(t), t.find('[data-action="add-track"]').on("click", this.onAddTrack.bind(this)), t.find('[data-action="search"]').on("input", this.onSearch.bind(this)), t.find('[data-action="filter-channel"]').on("click", this.onFilterChannel.bind(this)), t.find('[data-action="change-sort"]').on("change", this.onChangeSort.bind(this)), t.find('[data-action="clear-filters"]').on("click", this.onClearFilters.bind(this)), t.find('[data-action="toggle-tag"]').on("click", this.onToggleTag.bind(this)), t.find('[data-action="add-tag"]').on("click", this.onAddTag.bind(this)), t.find('[data-action="play-track"]').on("click", this.onPlayTrack.bind(this)), t.find('[data-action="stop-track"]').on("click", this.onStopTrack.bind(this)), t.find('[data-action="toggle-favorite"]').on("click", this.onToggleFavorite.bind(this)), t.find('[data-action="add-to-playlist"]').on("click", this.onAddToPlaylist.bind(this)), t.find('[data-action="track-menu"]').on("click", this.onTrackMenu.bind(this)), t.find('[data-action="select-playlist"]').on("click", this.onSelectPlaylist.bind(this)), t.find('[data-action="create-playlist"]').on("click", this.onCreatePlaylist.bind(this)), t.find('[data-action="toggle-playlist-favorite"]').on("click", this.onTogglePlaylistFavorite.bind(this)), t.find('[data-action="playlist-menu"]').on("click", this.onPlaylistMenu.bind(this)), t.find('[data-action="remove-from-favorites"]').on("click", this.onRemoveFromFavorites.bind(this)), this.setupDragAndDrop(t), n.debug("LocalLibraryApp listeners activated");
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
      const r = await this.library.addItem(t, void 0, a);
      this.render(), (s = ui.notifications) == null || s.info(`Added to library: ${r.name}`);
    } catch (r) {
      n.error("Failed to add track to library:", r);
      const o = r instanceof Error ? r.message : "Unknown error";
      (i = ui.notifications) == null || i.error(`Failed to add track: ${o}`);
    }
  }
  async onToggleFavorite(t) {
    var s, i;
    t.preventDefault();
    const a = $(t.currentTarget).closest("[data-item-id]").data("item-id");
    try {
      const r = this.library.toggleFavorite(a);
      this.render(), (s = ui.notifications) == null || s.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      n.error("Failed to toggle favorite:", r), (i = ui.notifications) == null || i.error("Failed to update favorite status");
    }
  }
  async onDeleteTrack(t) {
    var r, o, c;
    t.preventDefault();
    const a = $(t.currentTarget).closest("[data-item-id]").data("item-id"), s = this.library.getItem(a);
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
        this.library.removeItem(a), this.render(), (o = ui.notifications) == null || o.info(`Deleted: ${s.name}`);
      } catch (u) {
        n.error("Failed to delete track:", u), (c = ui.notifications) == null || c.error("Failed to delete track");
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers
  // ─────────────────────────────────────────────────────────────
  async onCreatePlaylist(t) {
    var s, i;
    t.preventDefault();
    const a = await this.promptPlaylistName();
    if (a)
      try {
        const r = this.library.playlists.createPlaylist(a);
        this.render(), (s = ui.notifications) == null || s.info(`Created playlist: ${r.name}`);
      } catch (r) {
        n.error("Failed to create playlist:", r);
        const o = r instanceof Error ? r.message : "Unknown error";
        (i = ui.notifications) == null || i.error(`Failed to create playlist: ${o}`);
      }
  }
  async onTogglePlaylistFavorite(t) {
    var s, i;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).closest("[data-playlist-id]").data("playlist-id");
    try {
      const r = this.library.playlists.togglePlaylistFavorite(a);
      this.render(), (s = ui.notifications) == null || s.info(r ? "Added to favorites" : "Removed from favorites");
    } catch (r) {
      n.error("Failed to toggle playlist favorite:", r), (i = ui.notifications) == null || i.error("Failed to update favorite status");
    }
  }
  async onRemoveFromFavorites(t) {
    var i, r;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).closest("[data-favorite-id]").data("favorite-id"), s = $(t.currentTarget).closest("[data-favorite-type]").data("favorite-type");
    try {
      s === "track" ? this.library.toggleFavorite(a) : s === "playlist" && this.library.playlists.togglePlaylistFavorite(a), this.render(), (i = ui.notifications) == null || i.info("Removed from favorites");
    } catch (o) {
      n.error("Failed to remove from favorites:", o), (r = ui.notifications) == null || r.error("Failed to remove from favorites");
    }
  }
  // ─────────────────────────────────────────────────────────────
  // Toolbar Event Handlers
  // ─────────────────────────────────────────────────────────────
  onSearch(t) {
    const a = ($(t.currentTarget).val() || "").trim();
    this.filterState.searchQuery = a, this.render(), n.debug("Search:", a);
  }
  onFilterChannel(t) {
    t.preventDefault();
    const a = $(t.currentTarget).data("channel");
    this.filterState.selectedChannel = a, this.render(), n.debug("Filter channel:", a);
  }
  onChangeSort(t) {
    const a = $(t.currentTarget).val();
    this.filterState.sortBy = a, this.render(), n.debug("Sort changed:", a);
  }
  onClearFilters(t) {
    var a;
    t.preventDefault(), this.filterState.searchQuery = "", this.filterState.selectedChannel = "all", this.filterState.selectedPlaylistId = null, this.filterState.selectedTags.clear(), this.render(), (a = ui.notifications) == null || a.info("Filters cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Tag Event Handlers
  // ─────────────────────────────────────────────────────────────
  onToggleTag(t) {
    t.preventDefault();
    const a = $(t.currentTarget).data("tag");
    this.filterState.selectedTags.has(a) ? this.filterState.selectedTags.delete(a) : this.filterState.selectedTags.add(a), this.render(), n.debug("Toggle tag:", a, "Selected tags:", Array.from(this.filterState.selectedTags));
  }
  async onAddTag(t) {
    var s;
    t.preventDefault();
    const a = await this.promptTagName();
    a && (n.debug("Add tag:", a), (s = ui.notifications) == null || s.info(`Tag "${a}" will be available once assigned to tracks`));
  }
  // ─────────────────────────────────────────────────────────────
  // Track Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onPlayTrack(t) {
    var s;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id");
    n.debug("Play track:", a), (s = ui.notifications) == null || s.info("Play functionality coming soon");
  }
  onStopTrack(t) {
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id");
    n.debug("Stop track:", a);
  }
  async onAddToPlaylist(t) {
    var o, c, u, h;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id"), s = this.library.getItem(a);
    if (!s) {
      (o = ui.notifications) == null || o.error("Track not found");
      return;
    }
    const i = this.library.playlists.getAllPlaylists();
    if (i.length === 0) {
      (c = ui.notifications) == null || c.warn("No playlists available. Create one first.");
      return;
    }
    const r = await this.promptPlaylistSelection(i);
    if (r)
      try {
        const m = this.inferGroupFromTags(s.tags);
        this.library.playlists.addTrackToPlaylist(r, a, m), this.render(), (u = ui.notifications) == null || u.info(`Added "${s.name}" to playlist`);
      } catch (m) {
        n.error("Failed to add track to playlist:", m);
        const g = m instanceof Error ? m.message : "Unknown error";
        (h = ui.notifications) == null || h.error(`Failed to add to playlist: ${g}`);
      }
  }
  onTrackMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("item-id");
    n.debug("Track menu:", a), (s = ui.notifications) == null || s.info("Context menu coming soon");
  }
  // ─────────────────────────────────────────────────────────────
  // Playlist Event Handlers (Extended)
  // ─────────────────────────────────────────────────────────────
  onSelectPlaylist(t) {
    t.preventDefault();
    const a = $(t.currentTarget).data("playlist-id");
    this.filterState.selectedPlaylistId === a ? this.filterState.selectedPlaylistId = null : this.filterState.selectedPlaylistId = a, this.render(), n.debug("Select playlist:", a);
  }
  onPlaylistMenu(t) {
    var s;
    t.preventDefault(), t.stopPropagation();
    const a = $(t.currentTarget).data("playlist-id");
    n.debug("Playlist menu:", a), (s = ui.notifications) == null || s.info("Context menu coming soon");
  }
  // ─────────────────────────────────────────────────────────────
  // Drag and Drop
  // ─────────────────────────────────────────────────────────────
  setupDragAndDrop(t) {
    t.find('.track-item[draggable="true"]').on("dragstart", (a) => {
      const s = $(a.currentTarget).data("item-id");
      a.originalEvent.dataTransfer.effectAllowed = "copy", a.originalEvent.dataTransfer.setData("text/plain", s), $(a.currentTarget).addClass("dragging");
    }), t.find('.track-item[draggable="true"]').on("dragend", (a) => {
      $(a.currentTarget).removeClass("dragging");
    }), t.find(".playlist-item").on("dragover", (a) => {
      a.preventDefault(), a.originalEvent.dataTransfer.dropEffect = "copy", $(a.currentTarget).addClass("drag-over");
    }), t.find(".playlist-item").on("dragleave", (a) => {
      $(a.currentTarget).removeClass("drag-over");
    }), t.find(".playlist-item").on("drop", async (a) => {
      a.preventDefault();
      const s = a.originalEvent.dataTransfer.getData("text/plain"), i = $(a.currentTarget).data("playlist-id");
      $(a.currentTarget).removeClass("drag-over"), await this.handleDropTrackToPlaylist(s, i);
    });
  }
  async handleDropTrackToPlaylist(t, a) {
    var r, o, c;
    const s = this.library.getItem(t), i = this.library.playlists.getPlaylist(a);
    if (!s || !i) {
      (r = ui.notifications) == null || r.error("Track or playlist not found");
      return;
    }
    try {
      const u = this.inferGroupFromTags(s.tags);
      this.library.playlists.addTrackToPlaylist(a, t, u), this.render(), (o = ui.notifications) == null || o.info(`Added "${s.name}" to "${i.name}"`);
    } catch (u) {
      n.error("Failed to add track to playlist:", u);
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
              let s = (a.find('[name="tag-name"]').val() || "").trim();
              s.startsWith("#") && (s = s.substring(1)), t(s || null);
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
      (s) => `<option value="${s.id}">${s.name} (${s.items.length} tracks)</option>`
    ).join("");
    return new Promise((s) => {
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
            callback: (i) => {
              const r = i.find('[name="playlist-id"]').val();
              s(r || null);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => s(null)
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
              const s = (a.find('[name="playlist-name"]').val() || "").trim();
              t(s || null);
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
    const s = Date.now(), i = {
      id: x(),
      name: e,
      description: t,
      items: [],
      createdAt: s,
      updatedAt: s,
      favorite: !1
    };
    return this.playlists.set(i.id, i), this.notifyChange(), n.info(`Playlist created: ${i.name} (${i.id})`), i;
  }
  /**
   * Update playlist metadata
   */
  updatePlaylist(e, t) {
    const a = this.playlists.get(e);
    if (!a)
      throw new Error(`Playlist not found: ${e}`);
    if (t.name && t.name !== a.name) {
      const i = this.findByName(t.name);
      if (i && i.id !== e)
        throw new Error(`Playlist with name "${t.name}" already exists`);
    }
    const s = {
      ...a,
      ...t,
      updatedAt: Date.now()
    };
    return this.playlists.set(e, s), this.notifyChange(), n.info(`Playlist updated: ${s.name}`), s;
  }
  /**
   * Delete playlist
   */
  deletePlaylist(e) {
    const t = this.playlists.get(e);
    if (!t)
      throw new Error(`Playlist not found: ${e}`);
    this.playlists.delete(e), this.notifyChange(), n.info(`Playlist deleted: ${t.name}`);
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
  addTrackToPlaylist(e, t, a, s) {
    const i = this.getPlaylist(e);
    if (!i)
      throw new Error(`Playlist not found: ${e}`);
    if (i.items.find((c) => c.libraryItemId === t))
      throw new Error("Track already exists in this playlist");
    const o = {
      id: x(),
      libraryItemId: t,
      group: a,
      volume: (s == null ? void 0 : s.volume) ?? 1,
      loop: (s == null ? void 0 : s.loop) ?? !1,
      order: i.items.length,
      fadeIn: s == null ? void 0 : s.fadeIn,
      fadeOut: s == null ? void 0 : s.fadeOut
    };
    return i.items.push(o), i.updatedAt = Date.now(), this.notifyChange(), n.debug(`Track added to playlist ${i.name}: ${t}`), o;
  }
  /**
   * Remove track from playlist
   */
  removeTrackFromPlaylist(e, t) {
    const a = this.getPlaylist(e);
    if (!a)
      throw new Error(`Playlist not found: ${e}`);
    const s = a.items.findIndex((i) => i.id === t);
    if (s === -1)
      throw new Error(`Playlist item not found: ${t}`);
    a.items.splice(s, 1), this.reorderPlaylistItems(a), a.updatedAt = Date.now(), this.notifyChange(), n.debug(`Track removed from playlist ${a.name}`);
  }
  /**
   * Remove all tracks with specific library item ID from playlist
   */
  removeLibraryItemFromPlaylist(e, t) {
    const a = this.getPlaylist(e);
    if (!a)
      throw new Error(`Playlist not found: ${e}`);
    const s = a.items.length;
    a.items = a.items.filter((r) => r.libraryItemId !== t);
    const i = s - a.items.length;
    return i > 0 && (this.reorderPlaylistItems(a), a.updatedAt = Date.now(), this.notifyChange(), n.debug(`Removed ${i} instances of library item ${t} from playlist ${a.name}`)), i;
  }
  /**
   * Remove library item from all playlists
   */
  removeLibraryItemFromAllPlaylists(e) {
    let t = 0;
    return this.playlists.forEach((a) => {
      const s = a.items.length;
      a.items = a.items.filter((r) => r.libraryItemId !== e);
      const i = s - a.items.length;
      i > 0 && (this.reorderPlaylistItems(a), a.updatedAt = Date.now(), t += i);
    }), t > 0 && (this.notifyChange(), n.info(`Removed library item ${e} from ${t} playlist(s)`)), t;
  }
  /**
   * Update playlist item
   */
  updatePlaylistItem(e, t, a) {
    const s = this.getPlaylist(e);
    if (!s)
      throw new Error(`Playlist not found: ${e}`);
    const i = s.items.find((r) => r.id === t);
    if (!i)
      throw new Error(`Playlist item not found: ${t}`);
    return Object.assign(i, a), s.updatedAt = Date.now(), this.notifyChange(), n.debug(`Playlist item updated in ${s.name}`), i;
  }
  /**
   * Reorder track in playlist
   */
  reorderTrack(e, t, a) {
    const s = this.getPlaylist(e);
    if (!s)
      throw new Error(`Playlist not found: ${e}`);
    const i = s.items.findIndex((o) => o.id === t);
    if (i === -1)
      throw new Error(`Playlist item not found: ${t}`);
    if (a < 0 || a >= s.items.length)
      throw new Error(`Invalid order: ${a}`);
    const [r] = s.items.splice(i, 1);
    s.items.splice(a, 0, r), this.reorderPlaylistItems(s), s.updatedAt = Date.now(), this.notifyChange(), n.debug(`Track reordered in playlist ${s.name}`);
  }
  /**
   * Get tracks in playlist
   */
  getPlaylistTracks(e) {
    const t = this.getPlaylist(e);
    if (!t)
      throw new Error(`Playlist not found: ${e}`);
    return [...t.items].sort((a, s) => a.order - s.order);
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
      t.items.sort((a, s) => a.order - s.order), this.playlists.set(t.id, t);
    }), n.info(`PlaylistManager loaded: ${this.playlists.size} playlists`);
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
    this.playlists.clear(), n.warn("All playlists cleared");
  }
}
const V = "advanced-sound-engine", C = 1;
class et {
  constructor() {
    d(this, "items", /* @__PURE__ */ new Map());
    d(this, "saveScheduled", !1);
    d(this, "playlists");
    d(this, "debouncedSave", K(() => {
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
    const s = D(e);
    if (!s.valid)
      throw new Error(s.error || "Invalid audio file");
    const i = t || this.extractNameFromUrl(e), r = this.findByUrl(e);
    if (r)
      throw new Error(`Track with this URL already exists: ${r.name}`);
    if (this.findByName(i))
      throw new Error(`Track with name "${i}" already exists in library`);
    const c = Date.now(), u = {
      id: x(),
      url: e,
      name: i,
      tags: [],
      duration: 0,
      favorite: !1,
      addedAt: c,
      updatedAt: c
    };
    return this.items.set(u.id, u), this.scheduleSave(), n.info(`Library item added: ${u.name} (${u.id})`), u;
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
      const i = D(t.url);
      if (!i.valid)
        throw new Error(i.error || "Invalid audio file");
      const r = this.findByUrl(t.url);
      if (r && r.id !== e)
        throw new Error(`Track with this URL already exists: ${r.name}`);
    }
    delete t.id;
    const s = {
      ...a,
      ...t,
      updatedAt: Date.now()
    };
    return this.items.set(e, s), this.scheduleSave(), n.info(`Library item updated: ${s.name}`), s;
  }
  /**
   * Remove item from library
   */
  removeItem(e) {
    const t = this.items.get(e);
    if (!t)
      throw new Error(`Library item not found: ${e}`);
    this.playlists.removeLibraryItemFromAllPlaylists(e), this.items.delete(e), this.scheduleSave(), n.info(`Library item removed: ${t.name}`);
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
    }), a > 0 && (this.scheduleSave(), n.info(`Tag renamed: "${e}" → "${t}" (${a} items)`)), a;
  }
  /**
   * Delete tag globally
   */
  deleteTag(e) {
    let t = 0;
    return this.items.forEach((a) => {
      const s = a.tags.indexOf(e);
      s !== -1 && (a.tags.splice(s, 1), a.updatedAt = Date.now(), t++);
    }), t > 0 && (this.scheduleSave(), n.info(`Tag deleted: "${e}" (${t} items)`)), t;
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
      const e = game.settings.get(V, "libraryState");
      if (!e) {
        n.info("No saved library state, starting fresh");
        return;
      }
      const t = JSON.parse(e);
      t.version !== C && n.warn(`Library version mismatch: ${t.version} → ${C}`), this.items.clear(), Object.values(t.items).forEach((a) => {
        this.items.set(a.id, a);
      }), this.playlists.load(t.playlists || {}), n.info(`Library loaded: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (e) {
      n.error("Failed to load library state:", e);
    }
  }
  saveToSettings() {
    try {
      const e = {
        items: Object.fromEntries(this.items),
        playlists: this.playlists.export(),
        version: C,
        lastModified: Date.now()
      };
      game.settings.set(V, "libraryState", JSON.stringify(e)), this.saveScheduled = !1, n.debug(`Library saved: ${this.items.size} items, ${this.playlists.getAllPlaylists().length} playlists`);
    } catch (e) {
      n.error("Failed to save library state:", e);
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
      totalDuration: e.reduce((a, s) => a + s.duration, 0),
      tagCount: this.getAllTags().length,
      playlists: t.totalPlaylists
    };
  }
  /**
   * Clear all library data
   */
  clear() {
    this.items.clear(), this.playlists.clear(), this.scheduleSave(), n.warn("Library cleared");
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.saveScheduled && this.saveToSettings();
  }
}
const M = "advanced-sound-engine";
let p = null, k = null, v = null, S = null, f = null, T = null, y = null;
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
  n.info("Initializing Advanced Sound Engine..."), ct(), at();
});
Hooks.once("ready", async () => {
  var e;
  const l = ((e = game.user) == null ? void 0 : e.isGM) ?? !1;
  n.info(`Starting Advanced Sound Engine (${l ? "GM" : "Player"})...`), y = new q(), l ? await st() : await it(), window.ASE = {
    isGM: l,
    openPanel: l ? rt : nt,
    openLibrary: l ? ot : void 0,
    engine: l ? p ?? void 0 : f ?? void 0,
    socket: y ?? void 0,
    library: l ? S ?? void 0 : void 0
  }, lt(), n.info("Advanced Sound Engine ready");
});
async function st() {
  S = new et(), p = new Q(), y.initializeAsGM(p), await p.loadSavedState();
}
async function it() {
  f = new J(), y.initializeAsPlayer(f);
  const l = U.loadSavedVolume();
  f.setLocalVolume(l);
}
function rt() {
  !p || !y || (k && k.rendered ? k.bringToTop() : (k = new X(p, y), k.render(!0)));
}
function nt() {
  f && (T && T.rendered ? T.bringToTop() : (T = new U(f), T.render(!0)));
}
function ot() {
  S && (v && v.rendered ? v.bringToTop() : (v = new Z(S), v.render(!0)));
}
function lt() {
  const l = () => {
    p == null || p.resume(), f == null || f.resume();
  };
  document.addEventListener("click", l, { once: !0 }), document.addEventListener("keydown", l, { once: !0 }), Hooks.once("canvasReady", l);
}
function ct() {
  game.settings.register(M, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  }), game.settings.register(M, "maxSimultaneousTracks", {
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
  }), game.settings.register(M, "libraryState", {
    name: "Library State",
    hint: "Internal storage for library items and playlists",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  k == null || k.close(), v == null || v.close(), T == null || T.close(), y == null || y.dispose(), p == null || p.dispose(), f == null || f.dispose(), S == null || S.dispose();
});
//# sourceMappingURL=module.js.map
