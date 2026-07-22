(() => {
  "use strict";

  const STORAGE_KEY = "dan-island-audio-v1";
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const progression = [
    [261.63, 329.63, 392, 493.88],
    [220, 261.63, 329.63, 392],
    [174.61, 220, 261.63, 329.63],
    [196, 261.63, 293.66, 392]
  ];
  let state = readState();
  let context = null;
  let master = null;
  let timer = null;
  let step = 0;
  let nextNoteAt = 0;

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return {
        enabled: saved?.enabled === true,
        decided: saved?.decided === true,
        startedAt: Number(saved?.startedAt) || 0
      };
    } catch {
      return { enabled: false, decided: false, startedAt: 0 };
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function ensureContext() {
    if (context || !AudioContext) return context;
    context = new AudioContext();
    master = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1500;
    master.gain.value = 0.0001;
    master.connect(filter).connect(context.destination);
    return context;
  }

  function tone(frequency, start, duration, volume, type = "sine") {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = type === "triangle" ? -4 : 3;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.16, duration * .25));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + .05);
  }

  function schedule() {
    if (!state.enabled || !context || context.state !== "running") return;
    while (nextNoteAt < context.currentTime + .8) {
      const chord = progression[Math.floor(step / 8) % progression.length];
      const note = chord[[0, 2, 1, 3, 2, 1, 0, 2][step % 8]];
      tone(note, nextNoteAt, 1.6, .032);
      if (step % 8 === 0) {
        tone(chord[0] / 2, nextNoteAt, 3.7, .026, "triangle");
        chord.slice(1).forEach((frequency, index) => tone(frequency / 2, nextNoteAt + index * .045, 3.25, .011));
      }
      nextNoteAt += .5;
      step += 1;
    }
  }

  async function startPlayback() {
    if (!state.enabled || !ensureContext()) return;
    try { await context.resume(); } catch {}
    if (context.state !== "running" || !state.enabled) return;
    const elapsedSteps = Math.max(0, Math.floor((Date.now() - state.startedAt) / 500));
    if (!timer) step = elapsedSteps;
    nextNoteAt = Math.max(nextNoteAt, context.currentTime + .05);
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(.72, context.currentTime, .7);
    schedule();
    timer = timer || setInterval(schedule, 300);
  }

  function stopPlayback() {
    if (timer) clearInterval(timer);
    timer = null;
    if (!context || !master) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0.0001, context.currentTime, .12);
  }

  function updateControls() {
    document.querySelectorAll("[data-audio-toggle], #musicToggle").forEach((button) => {
      button.setAttribute("aria-pressed", String(state.enabled));
      button.setAttribute("aria-label", state.enabled ? "关闭背景音乐和按钮音效" : "开启背景音乐和按钮音效");
      const label = button.querySelector(".music-label");
      if (label) label.textContent = state.enabled ? "音乐:开" : "音乐:关";
    });
  }

  function setEnabled(value, options = {}) {
    const wasEnabled = state.enabled;
    state.enabled = Boolean(value);
    if (options.decided !== false) state.decided = true;
    if (state.enabled && (!wasEnabled || !state.startedAt)) state.startedAt = Date.now();
    saveState();
    updateControls();
    if (state.enabled) startPlayback();
    else stopPlayback();
    window.dispatchEvent(new CustomEvent("dan-island-audio-change", { detail: { ...state } }));
  }

  function clickSound() {
    if (!state.enabled || !ensureContext() || context.state !== "running") return;
    const now = context.currentTime;
    tone(660, now, .11, .07);
    tone(880, now + .055, .14, .045, "triangle");
  }

  function addFallbackControl() {
    if (document.querySelector("[data-audio-toggle], #musicToggle")) return;
    const button = document.createElement("button");
    button.className = "music-toggle audio-floating";
    button.type = "button";
    button.dataset.audioToggle = "";
    button.innerHTML = '<span class="music-icon" aria-hidden="true">♪</span><span class="music-label">音乐:关</span>';
    document.body.append(button);
  }

  function bind() {
    addFallbackControl();
    updateControls();
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-audio-toggle], #musicToggle");
      if (toggle) {
        setEnabled(!state.enabled);
        if (state.enabled) setTimeout(clickSound, 40);
        return;
      }
      if (event.target.closest("button, a")) clickSound();
    });
    const recover = () => { if (state.enabled) startPlayback(); };
    document.addEventListener("pointerdown", recover, { passive: true });
    document.addEventListener("keydown", recover);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && state.enabled) startPlayback(); });
    if (state.enabled) startPlayback();
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = readState();
    updateControls();
    if (state.enabled) startPlayback();
    else stopPlayback();
  });

  window.DAN_ISLAND_AUDIO = {
    setEnabled,
    clickSound,
    get state() { return { ...state }; },
    get supported() { return Boolean(AudioContext); }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
