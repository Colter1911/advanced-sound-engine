var P = Object.defineProperty;
var C = (r, e, t) => e in r ? P(r, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : r[e] = t;
var l = (r, e, t) => C(r, typeof e != "symbol" ? e + "" : e, t);
const S = "ASE", c = {
  info: (r, ...e) => {
    console.log(`${S} | ${r}`, ...e);
  },
  warn: (r, ...e) => {
    console.warn(`${S} | ${r}`, ...e);
  },
  error: (r, ...e) => {
    console.error(`${S} | ${r}`, ...e);
  },
  debug: (r, ...e) => {
    var t;
    (t = CONFIG == null ? void 0 : CONFIG.debug) != null && t.audio && console.debug(`${S} | ${r}`, ...e);
  }
};
class G {
  constructor(e, t, s, a = "music") {
    l(this, "id");
    l(this, "ctx");
    l(this, "_group");
    l(this, "_url", "");
    l(this, "audio");
    l(this, "sourceNode", null);
    l(this, "gainNode");
    l(this, "outputNode");
    l(this, "_state", "stopped");
    l(this, "_volume", 1);
    l(this, "_loop", !1);
    l(this, "_ready", !1);
    this.id = e, this.ctx = t, this._group = a, this.audio = new Audio(), this.audio.crossOrigin = "anonymous", this.audio.preload = "auto", this.gainNode = t.createGain(), this.outputNode = t.createGain(), this.gainNode.connect(this.outputNode), this.outputNode.connect(s), this.setupAudioEvents();
  }
  setupAudioEvents() {
    this.audio.addEventListener("canplay", () => {
      this._ready = !0, this._state === "loading" && (this._state = "stopped"), c.debug(`Track ${this.id} ready to play`);
    }), this.audio.addEventListener("ended", () => {
      this._loop || (this._state = "stopped", c.debug(`Track ${this.id} ended`));
    }), this.audio.addEventListener("error", (e) => {
      c.error(`Track ${this.id} error:`, this.audio.error), this._state = "stopped";
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
    return this._state = "loading", this._url = e, this._ready = !1, new Promise((t, s) => {
      const a = () => {
        this.audio.removeEventListener("canplay", a), this.audio.removeEventListener("error", n), this.sourceNode || (this.sourceNode = this.ctx.createMediaElementSource(this.audio), this.sourceNode.connect(this.gainNode)), this._ready = !0, this._state = "stopped", c.debug(`Track loaded: ${this.id}`), t();
      }, n = () => {
        this.audio.removeEventListener("canplay", a), this.audio.removeEventListener("error", n), this._state = "stopped", s(new Error(`Failed to load: ${e}`));
      };
      this.audio.addEventListener("canplay", a, { once: !0 }), this.audio.addEventListener("error", n, { once: !0 }), this.audio.src = e, this.audio.load();
    });
  }
  async play(e = 0) {
    if (!this._ready) {
      c.warn(`Track ${this.id} not ready`);
      return;
    }
    try {
      this.audio.currentTime = Math.max(0, Math.min(e, this.audio.duration || 0)), this.audio.loop = this._loop, await this.audio.play(), this._state = "playing", c.debug(`Track ${this.id} playing from ${e.toFixed(2)}s`);
    } catch (t) {
      c.error(`Failed to play ${this.id}:`, t);
    }
  }
  pause() {
    this._state === "playing" && (this.audio.pause(), this._state = "paused", c.debug(`Track ${this.id} paused at ${this.audio.currentTime.toFixed(2)}s`));
  }
  stop() {
    this.audio.pause(), this.audio.currentTime = 0, this._state = "stopped", c.debug(`Track ${this.id} stopped`);
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
    this.audio.pause(), this.audio.src = "", (e = this.sourceNode) == null || e.disconnect(), this.gainNode.disconnect(), this.outputNode.disconnect(), c.debug(`Track ${this.id} disposed`);
  }
}
function f() {
  return Date.now();
}
function b(r) {
  if (!isFinite(r) || r < 0) return "0:00";
  const e = Math.floor(r / 60), t = Math.floor(r % 60);
  return `${e}:${t.toString().padStart(2, "0")}`;
}
const E = "advanced-sound-engine", x = 8;
class L {
  constructor() {
    l(this, "ctx");
    l(this, "masterGain");
    l(this, "channelGains");
    l(this, "players", /* @__PURE__ */ new Map());
    l(this, "_volumes", {
      master: 1,
      music: 1,
      ambience: 1,
      sfx: 1
    });
    l(this, "saveTimeout", null);
    this.ctx = new AudioContext(), this.masterGain = this.ctx.createGain(), this.masterGain.connect(this.ctx.destination), this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    }, this.channelGains.music.connect(this.masterGain), this.channelGains.ambience.connect(this.masterGain), this.channelGains.sfx.connect(this.masterGain), c.info("AudioEngine initialized");
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
      await game.settings.set(E, "mixerState", JSON.stringify(e)), c.debug("Mixer state saved");
    } catch (s) {
      c.error("Failed to save mixer state:", s);
    }
  }
  async loadSavedState() {
    if (game.ready)
      try {
        const e = game.settings.get(E, "mixerState");
        if (!e) return;
        const t = JSON.parse(e);
        await this.restoreState(t), c.info("Mixer state restored");
      } catch (e) {
        c.error("Failed to load mixer state:", e);
      }
  }
  // ─────────────────────────────────────────────────────────────
  // Track Management
  // ─────────────────────────────────────────────────────────────
  async createTrack(e) {
    if (this.players.has(e.id))
      return this.players.get(e.id);
    const t = this.channelGains[e.group], s = new G(
      e.id,
      this.ctx,
      t,
      e.group
    );
    return e.volume !== void 0 && s.setVolume(e.volume), e.loop !== void 0 && s.setLoop(e.loop), await s.load(e.url), this.players.set(e.id, s), this.scheduleSave(), c.info(`Track created: ${e.id}`), s;
  }
  getTrack(e) {
    return this.players.get(e);
  }
  removeTrack(e) {
    const t = this.players.get(e);
    return t ? (t.dispose(), this.players.delete(e), this.scheduleSave(), c.info(`Track removed: ${e}`), !0) : !1;
  }
  getAllTracks() {
    return Array.from(this.players.values());
  }
  getTracksByGroup(e) {
    return this.getAllTracks().filter((t) => t.group === e);
  }
  setTrackChannel(e, t) {
    const s = this.players.get(e);
    s && (s.setChannel(t, this.channelGains[t]), this.scheduleSave());
  }
  // ─────────────────────────────────────────────────────────────
  // Playback Control
  // ─────────────────────────────────────────────────────────────
  async playTrack(e, t = 0) {
    var u;
    const s = this.players.get(e);
    if (!s) {
      c.warn(`Track not found: ${e}`);
      return;
    }
    const a = this.getAllTracks().filter((i) => i.state === "playing").length;
    if (!(s.state === "playing") && a >= x) {
      c.warn(`Maximum simultaneous tracks (${x}) reached`), (u = ui.notifications) == null || u.warn(`Cannot play more than ${x} tracks simultaneously`);
      return;
    }
    await s.play(t);
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
    var s;
    (s = this.players.get(e)) == null || s.seek(t);
  }
  setTrackVolume(e, t) {
    var s;
    (s = this.players.get(e)) == null || s.setVolume(t), this.scheduleSave();
  }
  setTrackLoop(e, t) {
    var s;
    (s = this.players.get(e)) == null || s.setLoop(t), this.scheduleSave();
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
      timestamp: f(),
      syncEnabled: !1
    };
  }
  async restoreState(e) {
    if (this._volumes.master = e.masterVolume, this.masterGain.gain.setValueAtTime(this._volumes.master, this.ctx.currentTime), e.channelVolumes)
      for (const s of ["music", "ambience", "sfx"])
        this._volumes[s] = e.channelVolumes[s], this.channelGains[s].gain.setValueAtTime(this._volumes[s], this.ctx.currentTime);
    for (const s of e.tracks)
      if (!this.players.has(s.id))
        try {
          await this.createTrack({
            id: s.id,
            url: s.url,
            group: s.group,
            volume: s.volume,
            loop: s.loop
          });
        } catch (a) {
          c.error(`Failed to restore track ${s.id}:`, a);
        }
    const t = new Set(e.tracks.map((s) => s.id));
    for (const [s] of this.players)
      t.has(s) || this.removeTrack(s);
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), c.info("AudioContext resumed"));
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
    this.players.clear(), this.ctx.close(), c.info("AudioEngine disposed");
  }
}
class I {
  constructor() {
    l(this, "ctx");
    l(this, "masterGain");
    l(this, "gmGain");
    // Громкость от GM
    l(this, "channelGains");
    l(this, "players", /* @__PURE__ */ new Map());
    l(this, "_localVolume", 1);
    // Личная громкость игрока
    l(this, "_gmVolumes", {
      master: 1,
      music: 1,
      ambience: 1,
      sfx: 1
    });
    this.ctx = new AudioContext(), this.masterGain = this.ctx.createGain(), this.masterGain.connect(this.ctx.destination), this.gmGain = this.ctx.createGain(), this.gmGain.connect(this.masterGain), this.channelGains = {
      music: this.ctx.createGain(),
      ambience: this.ctx.createGain(),
      sfx: this.ctx.createGain()
    }, this.channelGains.music.connect(this.gmGain), this.channelGains.ambience.connect(this.gmGain), this.channelGains.sfx.connect(this.gmGain), c.info("PlayerAudioEngine initialized");
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
    const s = Math.max(0, Math.min(1, t));
    e === "master" ? (this._gmVolumes.master = s, this.gmGain.gain.linearRampToValueAtTime(s, this.ctx.currentTime + 0.01)) : (this._gmVolumes[e] = s, this.channelGains[e].gain.linearRampToValueAtTime(s, this.ctx.currentTime + 0.01));
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
    const s = (f() - e.startTimestamp) / 1e3, a = Math.max(0, e.offset + s);
    await t.play(a), c.debug(`Player: track ${e.trackId} playing at ${a.toFixed(2)}s`);
  }
  handlePause(e) {
    var t;
    (t = this.players.get(e)) == null || t.pause();
  }
  handleStop(e) {
    var t;
    (t = this.players.get(e)) == null || t.stop();
  }
  handleSeek(e, t, s, a) {
    const n = this.players.get(e);
    if (n)
      if (s) {
        const u = (f() - a) / 1e3;
        n.seek(t + u);
      } else
        n.seek(t);
  }
  handleTrackVolume(e, t) {
    var s;
    (s = this.players.get(e)) == null || s.setVolume(t);
  }
  handleTrackLoop(e, t) {
    var s;
    (s = this.players.get(e)) == null || s.setLoop(t);
  }
  // ─────────────────────────────────────────────────────────────
  // Sync State (full state from GM)
  // ─────────────────────────────────────────────────────────────
  async syncState(e, t) {
    this.setAllGMVolumes(t);
    const s = new Set(e.map((a) => a.id));
    for (const [a, n] of this.players)
      s.has(a) || (n.dispose(), this.players.delete(a));
    for (const a of e) {
      let n = this.players.get(a.id);
      if (n || (n = new G(
        a.id,
        this.ctx,
        this.channelGains[a.group],
        a.group
      ), await n.load(a.url), this.players.set(a.id, n)), n.setVolume(a.volume), n.setLoop(a.loop), a.isPlaying) {
        const u = (f() - a.startTimestamp) / 1e3, i = a.currentTime + u;
        await n.play(i);
      } else
        n.stop();
    }
    c.info("Player: synced state from GM");
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
    this.players.clear(), c.info("Player: all tracks cleared");
  }
  // ─────────────────────────────────────────────────────────────
  // Audio Context
  // ─────────────────────────────────────────────────────────────
  async resume() {
    this.ctx.state === "suspended" && (await this.ctx.resume(), c.info("PlayerAudioEngine: AudioContext resumed"));
  }
  dispose() {
    this.clearAll(), this.ctx.close(), c.info("PlayerAudioEngine disposed");
  }
}
const N = "advanced-sound-engine", v = `module.${N}`;
class F {
  constructor() {
    l(this, "gmEngine", null);
    l(this, "playerEngine", null);
    l(this, "socket", null);
    l(this, "_syncEnabled", !1);
    l(this, "isGM", !1);
  }
  initializeAsGM(e) {
    var t;
    this.isGM = !0, this.gmEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(v, (s) => {
      this.handleGMMessage(s);
    }), c.info("SocketManager initialized as GM");
  }
  initializeAsPlayer(e) {
    var t;
    this.isGM = !1, this.playerEngine = e, this.socket = game.socket, (t = this.socket) == null || t.on(v, (s) => {
      this.handlePlayerMessage(s);
    }), setTimeout(() => {
      this.send("player-ready", {});
    }, 1e3), c.info("SocketManager initialized as Player");
  }
  // ─────────────────────────────────────────────────────────────
  // Sync Mode (GM)
  // ─────────────────────────────────────────────────────────────
  get syncEnabled() {
    return this._syncEnabled;
  }
  setSyncEnabled(e) {
    this.isGM && (this._syncEnabled = e, e ? this.broadcastSyncStart() : this.broadcastSyncStop(), c.info(`Sync mode: ${e ? "ON" : "OFF"}`));
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
      switch (c.debug(`Player received: ${e.type}`, e.payload), e.type) {
        case "sync-start":
          const s = e.payload;
          await this.playerEngine.syncState(s.tracks, s.channelVolumes);
          break;
        case "sync-stop":
          this.playerEngine.clearAll();
          break;
        case "sync-state":
          const a = e.payload;
          await this.playerEngine.syncState(a.tracks, a.channelVolumes);
          break;
        case "track-play":
          const n = e.payload;
          await this.playerEngine.handlePlay(n);
          break;
        case "track-pause":
          const u = e.payload;
          this.playerEngine.handlePause(u.trackId);
          break;
        case "track-stop":
          const i = e.payload;
          this.playerEngine.handleStop(i.trackId);
          break;
        case "track-seek":
          const o = e.payload;
          this.playerEngine.handleSeek(
            o.trackId,
            o.time,
            o.isPlaying,
            o.seekTimestamp
          );
          break;
        case "track-volume":
          const d = e.payload;
          this.playerEngine.handleTrackVolume(d.trackId, d.volume);
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
  send(e, t, s) {
    var n;
    if (!this.socket) return;
    const a = {
      type: e,
      payload: t,
      senderId: ((n = game.user) == null ? void 0 : n.id) ?? "",
      timestamp: f()
    };
    s ? this.socket.emit(v, a, { recipients: [s] }) : this.socket.emit(v, a), c.debug(`Sent: ${e}`, t);
  }
  getCurrentSyncState() {
    if (!this.gmEngine)
      return { tracks: [], channelVolumes: { master: 1, music: 1, ambience: 1, sfx: 1 } };
    const e = f(), t = [];
    for (const s of this.gmEngine.getAllTracks()) {
      const a = s.getState();
      t.push({
        id: a.id,
        url: a.url,
        group: a.group,
        volume: a.volume,
        loop: a.loop,
        isPlaying: a.playbackState === "playing",
        currentTime: s.getCurrentTime(),
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
    const s = this.gmEngine.getTrack(e);
    if (!s) return;
    const a = {
      trackId: e,
      url: s.url,
      group: s.group,
      volume: s.volume,
      loop: s.loop,
      offset: t,
      startTimestamp: f()
    };
    this.send("track-play", a);
  }
  broadcastTrackPause(e, t) {
    if (!this._syncEnabled) return;
    const s = { trackId: e, pausedAt: t };
    this.send("track-pause", s);
  }
  broadcastTrackStop(e) {
    if (!this._syncEnabled) return;
    const t = { trackId: e };
    this.send("track-stop", t);
  }
  broadcastTrackSeek(e, t, s) {
    if (!this._syncEnabled) return;
    const a = {
      trackId: e,
      time: t,
      isPlaying: s,
      seekTimestamp: f()
    };
    this.send("track-seek", a);
  }
  broadcastTrackVolume(e, t) {
    if (!this._syncEnabled) return;
    const s = { trackId: e, volume: t };
    this.send("track-volume", s);
  }
  broadcastTrackLoop(e, t) {
    if (!this._syncEnabled) return;
    const s = { trackId: e, loop: t };
    this.send("track-loop", s);
  }
  broadcastChannelVolume(e, t) {
    if (!this._syncEnabled) return;
    const s = { channel: e, volume: t };
    this.send("channel-volume", s);
  }
  broadcastStopAll() {
    this._syncEnabled && this.send("stop-all", {});
  }
  dispose() {
    var e;
    (e = this.socket) == null || e.off(v);
  }
}
function _(r, e) {
  let t = 0, s = null;
  return function(...a) {
    const n = Date.now(), u = e - (n - t);
    u <= 0 ? (s && (clearTimeout(s), s = null), t = n, r.apply(this, a)) : s || (s = setTimeout(() => {
      t = Date.now(), s = null, r.apply(this, a);
    }, u));
  };
}
const O = "advanced-sound-engine", D = 8;
class z extends Application {
  constructor(t, s, a) {
    super(a);
    l(this, "engine");
    l(this, "socket");
    l(this, "updateInterval", null);
    this.engine = t, this.socket = s;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-sound-mixer",
      title: "Sound Mixer (GM)",
      template: `modules/${O}/templates/mixer.hbs`,
      classes: ["ase-mixer"],
      width: 550,
      height: "auto",
      resizable: !0,
      minimizable: !0,
      popOut: !0
    });
  }
  getData() {
    const t = this.engine.getAllTracks().map((n) => this.getTrackViewData(n)), s = this.engine.volumes, a = t.filter((n) => n.isPlaying).length;
    return {
      tracks: t,
      volumes: {
        master: Math.round(s.master * 100),
        music: Math.round(s.music * 100),
        ambience: Math.round(s.ambience * 100),
        sfx: Math.round(s.sfx * 100)
      },
      playingCount: a,
      maxSimultaneous: D,
      syncEnabled: this.socket.syncEnabled
    };
  }
  getTrackViewData(t) {
    const s = t.getState(), a = t.getCurrentTime(), n = t.getDuration();
    return {
      id: s.id,
      name: this.extractFileName(s.url),
      group: s.group,
      isPlaying: s.playbackState === "playing",
      isPaused: s.playbackState === "paused",
      isStopped: s.playbackState === "stopped",
      isLoading: s.playbackState === "loading",
      volume: s.volume,
      volumePercent: Math.round(s.volume * 100),
      loop: s.loop,
      currentTime: a,
      currentTimeFormatted: b(a),
      duration: n,
      durationFormatted: b(n),
      progress: n > 0 ? a / n * 100 : 0
    };
  }
  extractFileName(t) {
    if (!t) return "Unknown";
    try {
      const a = decodeURIComponent(t).split("/");
      return a[a.length - 1].replace(/\.[^.]+$/, "");
    } catch {
      const s = t.split("/");
      return s[s.length - 1].replace(/\.[^.]+$/, "");
    }
  }
  activateListeners(t) {
    super.activateListeners(t), t.find("#ase-sync-toggle").on("change", (i) => {
      const o = i.target.checked;
      this.socket.setSyncEnabled(o), this.updateSyncIndicator(t, o);
    });
    const s = _((i, o) => {
      i === "master" ? (this.engine.setMasterVolume(o), this.socket.broadcastChannelVolume("master", o)) : (this.engine.setChannelVolume(i, o), this.socket.broadcastChannelVolume(i, o));
    }, 50);
    t.find(".ase-channel-slider").on("input", (i) => {
      const o = $(i.currentTarget).data("channel"), d = parseFloat(i.target.value) / 100;
      s(o, d), $(i.currentTarget).siblings(".ase-channel-value").text(`${Math.round(d * 100)}%`);
    }), t.find("#ase-add-track").on("click", () => this.onAddTrack());
    const a = t.find(".ase-tracks");
    a.on("click", ".ase-btn-play", (i) => {
      const o = $(i.currentTarget).closest(".ase-track").data("track-id");
      this.onPlayTrack(o);
    }), a.on("click", ".ase-btn-pause", (i) => {
      const o = $(i.currentTarget).closest(".ase-track").data("track-id");
      this.onPauseTrack(o);
    }), a.on("click", ".ase-btn-stop", (i) => {
      const o = $(i.currentTarget).closest(".ase-track").data("track-id");
      this.onStopTrack(o);
    }), a.on("click", ".ase-btn-remove", (i) => {
      const o = $(i.currentTarget).closest(".ase-track").data("track-id");
      this.onRemoveTrack(o);
    }), a.on("change", ".ase-loop-toggle", (i) => {
      const o = $(i.currentTarget).closest(".ase-track").data("track-id"), d = i.target.checked;
      this.engine.setTrackLoop(o, d), this.socket.broadcastTrackLoop(o, d);
    }), a.on("change", ".ase-channel-select", (i) => {
      const o = $(i.currentTarget).data("track-id"), d = i.target.value;
      this.engine.setTrackChannel(o, d);
    });
    const n = _((i, o) => {
      this.engine.setTrackVolume(i, o), this.socket.broadcastTrackVolume(i, o);
    }, 50);
    a.on("input", ".ase-volume-slider", (i) => {
      const o = $(i.currentTarget).closest(".ase-track").data("track-id"), d = parseFloat(i.target.value) / 100;
      n(o, d), $(i.currentTarget).siblings(".ase-volume-value").text(`${Math.round(d * 100)}%`);
    });
    const u = _((i, o) => {
      const d = this.engine.getTrack(i), h = (d == null ? void 0 : d.state) === "playing";
      this.engine.seekTrack(i, o), this.socket.broadcastTrackSeek(i, o, h ?? !1);
    }, 100);
    a.on("input", ".ase-seek-slider", (i) => {
      const o = $(i.currentTarget).closest(".ase-track").data("track-id"), d = this.engine.getTrack(o);
      if (d) {
        const T = parseFloat(i.target.value) / 100 * d.getDuration();
        u(o, T);
      }
    }), t.find("#ase-stop-all").on("click", () => {
      this.engine.stopAll(), this.socket.broadcastStopAll(), this.render();
    }), this.startUpdates();
  }
  updateSyncIndicator(t, s) {
    const a = t.find(".ase-sync-status");
    a.toggleClass("is-active", s), a.find("span").text(s ? "SYNC ON" : "SYNC OFF");
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
    let s = 0;
    for (const n of this.engine.getAllTracks()) {
      const u = t.find(`.ase-track[data-track-id="${n.id}"]`);
      if (!u.length) continue;
      const i = n.getCurrentTime(), o = n.getDuration(), d = o > 0 ? i / o * 100 : 0, h = n.state;
      h === "playing" && s++, u.find(".ase-time-current").text(b(i));
      const T = u.find(".ase-seek-slider");
      T.is(":active") || T.val(d), u.removeClass("is-playing is-paused is-stopped is-loading"), u.addClass(`is-${h}`), u.find(".ase-btn-play").prop("disabled", h === "playing" || h === "loading"), u.find(".ase-btn-pause").prop("disabled", h !== "playing"), u.find(".ase-btn-stop").prop("disabled", h === "stopped");
    }
    const a = this.engine.getAllTracks().length;
    t.find(".ase-track-count").text(`${s}/${a} playing`);
  }
  async onAddTrack() {
    new FilePicker({
      type: "audio",
      current: "",
      callback: async (s) => {
        await this.addTrackFromPath(s);
      }
    }).render(!0);
  }
  async addTrackFromPath(t, s = "music") {
    var n, u;
    const a = `track-${Date.now()}`;
    try {
      await this.engine.createTrack({
        id: a,
        url: t,
        group: s,
        volume: 1,
        loop: !1
      }), this.render(), (n = ui.notifications) == null || n.info(`Added: ${this.extractFileName(t)}`);
    } catch (i) {
      c.error("Failed to add track:", i), (u = ui.notifications) == null || u.error(`Failed to load: ${t}`);
    }
  }
  async onPlayTrack(t) {
    const s = this.engine.getTrack(t);
    if (!s) return;
    const a = s.state === "paused" ? s.getCurrentTime() : 0;
    await this.engine.playTrack(t, a), this.socket.broadcastTrackPlay(t, a);
  }
  onPauseTrack(t) {
    const s = this.engine.getTrack(t);
    if (!s) return;
    const a = s.getCurrentTime();
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
const M = "advanced-sound-engine";
class V extends Application {
  constructor(t, s) {
    super(s);
    l(this, "engine");
    this.engine = t;
  }
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "ase-player-volume",
      title: "Sound Volume",
      template: `modules/${M}/templates/player-volume.hbs`,
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
    super.activateListeners(t), t.find(".ase-volume-slider").on("input", (s) => {
      const a = parseFloat(s.target.value) / 100;
      this.engine.setLocalVolume(a), t.find(".ase-volume-value").text(`${Math.round(a * 100)}%`), this.saveVolume(a);
    });
  }
  saveVolume(t) {
    localStorage.setItem(`${M}-player-volume`, String(t));
  }
  static loadSavedVolume() {
    const t = localStorage.getItem(`${M}-player-volume`);
    return t ? parseFloat(t) : 1;
  }
}
const U = "advanced-sound-engine";
let p = null, y = null, m = null, k = null, g = null;
Hooks.once("init", () => {
  c.info("Initializing Advanced Sound Engine..."), J();
});
Hooks.once("ready", async () => {
  var e;
  const r = ((e = game.user) == null ? void 0 : e.isGM) ?? !1;
  c.info(`Starting Advanced Sound Engine (${r ? "GM" : "Player"})...`), g = new F(), r ? await R() : await H(), window.ASE = {
    isGM: r,
    openPanel: r ? A : w,
    engine: r ? p ?? void 0 : m ?? void 0,
    socket: g ?? void 0
  }, B(), j(), c.info("Advanced Sound Engine ready");
});
async function R() {
  p = new L(), g.initializeAsGM(p), await p.loadSavedState();
}
async function H() {
  m = new I(), g.initializeAsPlayer(m);
  const r = V.loadSavedVolume();
  m.setLocalVolume(r);
}
function A() {
  !p || !g || (y && y.rendered ? y.bringToTop() : (y = new z(p, g), y.render(!0)));
}
function w() {
  m && (k && k.rendered ? k.bringToTop() : (k = new V(m), k.render(!0)));
}
function j() {
  Hooks.on("renderSceneControls", () => {
    var s;
    if (document.getElementById("ase-control-btn")) return;
    const r = document.querySelector("#controls");
    if (!r) return;
    const e = ((s = game.user) == null ? void 0 : s.isGM) ?? !1, t = document.createElement("li");
    t.id = "ase-control-btn", t.className = "scene-control", t.dataset.tooltip = e ? "Sound Mixer" : "Sound Volume", t.innerHTML = `<i class="fas ${e ? "fa-sliders-h" : "fa-volume-up"}"></i>`, t.style.cursor = "pointer", t.addEventListener("click", () => {
      e ? A() : w();
    }), r.appendChild(t);
  });
}
function B() {
  const r = () => {
    p == null || p.resume(), m == null || m.resume();
  };
  document.addEventListener("click", r, { once: !0 }), document.addEventListener("keydown", r, { once: !0 }), Hooks.once("canvasReady", r);
}
function J() {
  game.settings.register(U, "mixerState", {
    name: "Mixer State",
    hint: "Internal storage for mixer state",
    scope: "world",
    config: !1,
    type: String,
    default: ""
  });
}
Hooks.once("closeGame", () => {
  y == null || y.close(), k == null || k.close(), g == null || g.dispose(), p == null || p.dispose(), m == null || m.dispose();
});
//# sourceMappingURL=module.js.map
