(function () {
  "use strict";

  var TRACKS = [
    { title: "Playoff", artist: "no es ia, es música muerta", file: "audio/playoff.mp3", duration: 92.4995918367347 },
    { title: "Western Trap v1.3", artist: "no es ia, es música muerta", file: "audio/western-trap-v1-3.mp3", duration: 119.56244897959184 },
    { title: "Falopa", artist: "no es ia, es música muerta", file: "audio/falopa.mp3", duration: 85.73387755102041 },
    { title: "Neo Boombap 1.5", artist: "no es ia, es música muerta", file: "audio/neo-boombap-1-5.mp3", duration: 81.2669387755102 },
    { title: "ArpCore House 2.1", artist: "no es ia, es música muerta", file: "audio/arpcore-house-2-1.mp3", duration: 104.51591836734694 },
    { title: "Melodic House", artist: "no es ia, es música muerta", file: "audio/melodic-house.mp3", duration: 102.58285714285714 },
    { title: "Calvin Christmas 3", artist: "no es ia, es música muerta", file: "audio/arjaus-11-calvin-christmas-3.mp3", duration: 142.056 },
    { title: "Calvin Christmas 2", artist: "no es ia, es música muerta", file: "audio/calvin-christmas-2.mp3", duration: 146.088 },
    { title: "Diapositiva Neo Soul", artist: "no es ia, es música muerta", file: "audio/diapositiva-neo-soul-master.mp3", duration: 135.696 },
    { title: "Go", artist: "no es ia, es música muerta", file: "audio/go.mp3", duration: 233.76979591836735 }
  ];

  var THEMES = [
    { id: "green", label: "GREEN" },
    { id: "amber", label: "AMBER" },
    { id: "ice", label: "ICE" },
    { id: "hot", label: "HOT" }
  ];

  var PRESETS = {
    flat: [0, 0, 0, 0, 0],
    bass: [9, 6, 2, 0, 1],
    club: [5, 3, 0, 2, 4],
    vox: [-3, -1, 4, 5, 2],
    lofi: [4, 1, -5, -7, -3],
    cassette: [3, -2, -4, 1, -6]
  };

  var REPEAT_MODES = ["off", "all", "one"];

  var $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };

  var $$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  var audio = $("#audio");
  var els = {
    body: document.body,
    playlist: $("#playlist"),
    filter: $("#filter"),
    clearFilter: $("#clearFilter"),
    playlistCount: $("#playlistCount"),
    playlistTotal: $("#playlistTotal"),
    lcdIndex: $("#lcdIndex"),
    marqueeText: $("#marqueeText"),
    marqueeText2: $("#marqueeText2"),
    marqueeTrack: $("#marqueeTrack"),
    lcdKbps: $("#lcdKbps"),
    lcdArtist: $("#lcdArtist"),
    lcdTitle: $("#lcdTitle"),
    timeCurrent: $("#timeCurrent"),
    timeTotal: $("#timeTotal"),
    seekbar: $("#seekbar"),
    seekFill: $("#seekFill"),
    seekThumb: $("#seekThumb"),
    statusText: $("#statusText"),
    eqStatus: $("#eqStatus"),
    statusSong: $("#statusSong"),
    playLed: $("#playLed"),
    volume: $("#volume"),
    volValue: $("#volValue"),
    volLabel: $("#volLabel"),
    shuffleBtn: $("#shuffleBtn"),
    repeatBtn: $("#repeatBtn"),
    eqToggle: $("#eqToggle"),
    eqPower: $("#eqPower"),
    eqWindow: $("#eqWindow"),
    eqPreset: $("#eqPreset"),
    eqReset: $("#eqReset"),
    eqBands: $("#eqBands"),
    spectrum: $("#spectrum"),
    vizCanvas: $("#vizCanvas"),
    vizTitle: $("#vizTitle"),
    skinBtn: $("#skinBtn"),
    skinName: $("#skinName"),
    clock: $("#clock"),
    trayLed: $("#trayLed"),
    trayText: $("#trayText"),
    toast: $("#toast"),
    startBtn: $("#startBtn"),
    taskList: $("#taskList"),
    vinyl: $("#vinyl"),
    tonearm: $("#tonearm"),
    playerWindow: $("#playerWindow")
  };

  var state = {
    index: 0,
    playing: false,
    shuffle: false,
    repeat: "off",
    eqOn: true,
    volume: 78,
    lastVolume: 78,
    theme: "green",
    filter: "",
    seeking: false,
    windowZ: 5
  };

  var graph = {
    ready: false,
    ctx: null,
    source: null,
    filters: [],
    gain: null,
    analyser: null,
    freq: null,
    wave: null
  };

  var accent = "#58ff92";
  var toastTimer = null;
  var rows = [];
  var clockTimer = null;
  var drag = null;

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    var total = Math.floor(seconds);
    var minutes = Math.floor(total / 60);
    return pad(minutes) + ":" + pad(total % 60);
  }

  function formatLongTime(seconds) {
    var total = Math.floor(seconds || 0);
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var secs = total % 60;
    return hours > 0 ? hours + ":" + pad(minutes) + ":" + pad(secs) : pad(minutes) + ":" + pad(secs);
  }

  function totalAlbumDuration() {
    return TRACKS.reduce(function (sum, track) {
      return sum + (isFinite(track.duration) ? track.duration : 0);
    }, 0);
  }

  function totalAlbumLabel() {
    return formatLongTime(totalAlbumDuration());
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      return;
    }
  }

  function showToast(message, duration) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, duration || 2600);
  }

  function currentTrack() {
    return TRACKS[state.index] || TRACKS[0];
  }

  function buildPlaylist() {
    els.playlist.innerHTML = "";
    rows = [];

    TRACKS.forEach(function (track, index) {
      var li = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "track-row";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", "Reproducir " + track.title);
      button.innerHTML =
        '<span class="row-index">' + pad(index + 1) + "</span>" +
        '<span class="row-title">' + escapeHtml(track.title) + "</span>" +
        '<span class="row-duration">' + formatTime(track.duration) + "</span>";

      button.addEventListener("click", function () {
        loadTrack(index, true);
      });

      li.appendChild(button);
      els.playlist.appendChild(li);
      rows.push(button);
    });

    els.playlistCount.textContent = TRACKS.length + " TRACKS";
    els.playlistTotal.textContent = totalAlbumLabel();
    updatePlaylistDurations();
  }

  function updatePlaylistDurations() {
    rows.forEach(function (row, index) {
      var duration = row.querySelector(".row-duration");
      if (duration && TRACKS[index]) {
        duration.textContent = formatTime(TRACKS[index].duration);
      }
    });
    els.playlistTotal.textContent = totalAlbumLabel();
  }

  function updateActiveRow() {
    rows.forEach(function (row, index) {
      var active = index === state.index;
      row.classList.toggle("is-active", active);
      if (active) {
        row.setAttribute("aria-current", "true");
        row.querySelector(".row-index").textContent = "▶";
      } else {
        row.removeAttribute("aria-current");
        row.querySelector(".row-index").textContent = pad(index + 1);
      }
    });

    var activeRow = rows[state.index];
    if (activeRow) {
      var top = activeRow.offsetTop;
      var bottom = top + activeRow.offsetHeight;
      var viewTop = els.playlist.scrollTop;
      var viewBottom = viewTop + els.playlist.clientHeight;
      if (top < viewTop || bottom > viewBottom) {
        els.playlist.scrollTop = Math.max(0, top - Math.floor(els.playlist.clientHeight / 2) + Math.floor(activeRow.offsetHeight / 2));
      }
    }
  }

  function applyFilter() {
    var query = normalize(els.filter.value);
    state.filter = query;
    var visible = 0;

    rows.forEach(function (row, index) {
      var haystack = normalize(TRACKS[index].title + " " + (index + 1) + " " + TRACKS[index].artist);
      var match = !query || haystack.indexOf(query) !== -1;
      row.classList.toggle("is-hidden", !match);
      if (match) visible += 1;
    });

    els.playlistCount.textContent = visible + (visible === 1 ? " TRACK" : " TRACKS");
    els.clearFilter.classList.toggle("is-dim", !query);
  }

  function updateMarquee() {
    var track = currentTrack();
    var text = track.title + "  •  " + track.artist;
    els.marqueeText.textContent = text;
    els.marqueeText2.textContent = text;
    els.marqueeTrack.style.animationDuration = Math.max(14, text.length * 0.55) + "s";
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    var track = currentTrack();

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "no es ia, es música muerta"
      });
      navigator.mediaSession.playbackState = state.playing ? "playing" : "paused";
      navigator.mediaSession.setActionHandler("play", function () {
        playAudio();
      });
      navigator.mediaSession.setActionHandler("pause", function () {
        audio.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", function () {
        previousTrack();
      });
      navigator.mediaSession.setActionHandler("nexttrack", function () {
        nextTrack(true);
      });
      navigator.mediaSession.setActionHandler("seekto", function (details) {
        if (details && isFinite(details.seekTime)) {
          audio.currentTime = details.seekTime;
        }
      });
    } catch (error) {
      return;
    }
  }

  function updateTrackUI() {
    var track = currentTrack();
    var duration = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : track.duration;

    els.lcdIndex.textContent = pad(state.index + 1);
    els.lcdArtist.textContent = track.artist;
    els.lcdTitle.textContent = track.title;
    els.vizTitle.textContent = track.title.toUpperCase();
    els.timeCurrent.textContent = "00:00";
    els.timeTotal.textContent = formatTime(duration);
    els.statusSong.textContent = "TRACK " + pad(state.index + 1) + "/" + pad(TRACKS.length) + " · 320 KBPS";
    els.seekbar.setAttribute("aria-valuetext", "0% de " + track.title);
    els.lcdKbps.textContent = "320 kbps";
    document.title = track.title + " :: no es ia, es música muerta";

    updateMarquee();
    updateActiveRow();
    updateSeek(0, duration);
    updateMediaSession();
  }

  function updateSeek(current, duration) {
    var ratio = duration > 0 ? clamp(current / duration, 0, 1) : 0;
    var percent = ratio * 100;
    els.seekFill.style.width = percent + "%";
    els.seekThumb.style.left = percent + "%";
    els.seekbar.setAttribute("aria-valuenow", String(Math.round(percent)));
    els.seekbar.setAttribute("aria-valuetext", formatTime(current) + " de " + formatTime(duration));
  }

  function loadTrack(index, autoplay) {
    if (index < 0 || index >= TRACKS.length) return;

    var wasPlaying = !audio.paused && !audio.ended;
    state.index = index;
    var track = currentTrack();

    audio.src = track.file;
    audio.load();
    updateTrackUI();

    if (autoplay) {
      playAudio();
    } else if (wasPlaying) {
      playAudio();
    }

    safeStorageSet("nesm:lastIndex", String(index));
    if (els.playlist.scrollHeight > els.playlist.clientHeight) {
      updateActiveRow();
    }
  }

  function ensureAudioGraph() {
    if (graph.ready) {
      if (graph.ctx && graph.ctx.state === "suspended") {
        graph.ctx.resume().catch(function () {});
      }
      return;
    }

    var AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      audio.volume = state.volume / 100;
      return;
    }

    try {
      var ctx = new AudioContextClass();
      var source = ctx.createMediaElementSource(audio);
      var bandConfig = [
        { type: "lowshelf", frequency: 60 },
        { type: "peaking", frequency: 230, Q: 1.1 },
        { type: "peaking", frequency: 910, Q: 1.1 },
        { type: "peaking", frequency: 3600, Q: 1.1 },
        { type: "highshelf", frequency: 14000 }
      ];

      var filters = bandConfig.map(function (config) {
        var filter = ctx.createBiquadFilter();
        filter.type = config.type;
        filter.frequency.value = config.frequency;
        if (config.Q) filter.Q.value = config.Q;
        filter.gain.value = 0;
        return filter;
      });

      var node = source;
      filters.forEach(function (filter) {
        node.connect(filter);
        node = filter;
      });

      var gain = ctx.createGain();
      gain.gain.value = state.volume / 100;
      node.connect(gain);

      var analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      graph.ctx = ctx;
      graph.source = source;
      graph.filters = filters;
      graph.gain = gain;
      graph.analyser = analyser;
      graph.freq = new Uint8Array(analyser.frequencyBinCount);
      graph.wave = new Uint8Array(analyser.fftSize);
      graph.ready = true;

      audio.volume = 1;
      applyVolume();
      applyEq();
      ctx.resume().catch(function () {});
    } catch (error) {
      graph.ready = false;
      audio.volume = state.volume / 100;
    }
  }

  function playAudio() {
    ensureAudioGraph();
    var promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(function (error) {
        if (error && error.name === "AbortError") return;
        setStatusMessage("SIGNAL LOST");
        showToast("No se pudo reproducir. Probá de nuevo.");
      });
    }
  }

  function setPlaying(playing) {
    state.playing = playing;
    els.body.classList.toggle("is-playing", playing);
    els.playLed.classList.toggle("is-on", playing);
    els.trayLed.classList.toggle("is-on", playing);
    els.trayText.textContent = playing ? "PLAYING" : "STANDBY";

    var playButton = $(".play-btn");
    if (playButton) {
      playButton.setAttribute("aria-label", playing ? "Pausar" : "Reproducir");
      playButton.setAttribute("title", playing ? "Pausar (Space)" : "Reproducir (Space)");
    }

    setStatusMessage(playing ? "PLAYING // SIDE A" : "PAUSED // SIDE A");
    updateMediaSession();
  }

  function setStatusMessage(message) {
    els.statusText.textContent = message;
  }

  function randomIndex() {
    if (TRACKS.length < 2) return 0;
    var random = state.index;
    while (random === state.index) {
      random = Math.floor(Math.random() * TRACKS.length);
    }
    return random;
  }

  function nextIndex() {
    if (state.shuffle) return randomIndex();
    return (state.index + 1) % TRACKS.length;
  }

  function nextTrack(fromEnded) {
    var wasPlaying = fromEnded || audio.ended || !audio.paused;
    loadTrack(nextIndex(), wasPlaying);
  }

  function previousTrack() {
    if (audio.currentTime > 3.5) {
      audio.currentTime = 0;
      updateSeek(0, isFinite(audio.duration) ? audio.duration : currentTrack().duration);
      return;
    }

    var wasPlaying = audio.ended || !audio.paused;
    var previous = state.shuffle ? nextIndex() : (state.index - 1 + TRACKS.length) % TRACKS.length;
    loadTrack(previous, wasPlaying);
  }

  function stopPlayback() {
    audio.pause();
    audio.currentTime = 0;
    updateSeek(0, isFinite(audio.duration) ? audio.duration : currentTrack().duration);
    els.timeCurrent.textContent = "00:00";
    setStatusMessage("STOPPED // SIDE A");
    els.trayText.textContent = "STOPPED";
  }

  function togglePlay() {
    if (audio.paused || audio.ended) {
      playAudio();
    } else {
      audio.pause();
    }
  }

  function handleEnded() {
    if (state.repeat === "one") {
      audio.currentTime = 0;
      playAudio();
      return;
    }

    if (state.repeat === "off" && !state.shuffle && state.index === TRACKS.length - 1) {
      setPlaying(false);
      setStatusMessage("FIN // SIDE A");
      els.trayText.textContent = "FIN";
      return;
    }

    loadTrack(nextIndex(), true);
  }

  function applyVolume() {
    var value = clamp(state.volume, 0, 100);
    if (graph.ready && graph.gain) {
      var target = graph.ctx.currentTime + 0.02;
      graph.gain.gain.setTargetAtTime(value / 100, target, 0.02);
      audio.volume = 1;
    } else {
      audio.volume = value / 100;
    }

    els.volume.value = String(value);
    els.volValue.textContent = String(Math.round(value));
    els.volLabel.textContent = value === 0 ? "MUTE" : "VOL";
    els.volume.setAttribute("aria-valuetext", Math.round(value) + "%");
    safeStorageSet("nesm:volume", String(value));
  }

  function setVolume(value) {
    state.volume = clamp(Math.round(value), 0, 100);
    if (state.volume > 0) state.lastVolume = state.volume;
    applyVolume();
  }

  function toggleMute() {
    if (state.volume > 0) {
      state.lastVolume = state.volume;
      setVolume(0);
      showToast("MUTE");
    } else {
      setVolume(state.lastVolume || 78);
      showToast("VOL " + state.volume);
    }
  }

  function applyEq() {
    var sliders = $$('#eqBands input[type="range"]');
    sliders.forEach(function (slider, index) {
      var value = state.eqOn ? Number(slider.value) : 0;
      var label = $('[data-band-value="' + index + '"]');
      if (label) label.textContent = Number(slider.value) > 0 ? "+" + slider.value : slider.value;
      if (graph.ready && graph.filters[index]) {
        graph.filters[index].gain.setTargetAtTime(value, graph.ctx.currentTime + 0.01, 0.02);
      }
    });
  }

  function setEqOn(on) {
    state.eqOn = Boolean(on);
    els.eqToggle.classList.toggle("is-on", state.eqOn);
    els.eqToggle.setAttribute("aria-pressed", String(state.eqOn));
    els.eqPower.classList.toggle("is-on", state.eqOn);
    els.eqPower.setAttribute("aria-pressed", String(state.eqOn));
    els.eqPower.textContent = state.eqOn ? "ON" : "OFF";
    els.eqWindow.classList.toggle("is-eq-on", state.eqOn);
    els.eqStatus.textContent = "EQ: " + (state.eqOn ? "ON" : "OFF");
    applyEq();
    safeStorageSet("nesm:eqOn", state.eqOn ? "1" : "0");
  }

  function setPreset(name) {
    var values = PRESETS[name] || PRESETS.flat;
    var sliders = $$('#eqBands input[type="range"]');
    sliders.forEach(function (slider, index) {
      slider.value = String(values[index]);
    });
    els.eqPreset.value = name;
    applyEq();

    if (!state.eqOn) setEqOn(true);
    safeStorageSet("nesm:eqBands", JSON.stringify(values));
    safeStorageSet("nesm:eqPreset", name);
    showToast("PRESET: " + (name === "flat" ? "FLAT" : name.toUpperCase()));
  }

  function saveEqBands() {
    var values = $$('#eqBands input[type="range"]').map(function (slider) {
      return Number(slider.value);
    });
    safeStorageSet("nesm:eqBands", JSON.stringify(values));
  }

  function cycleRepeat() {
    var current = REPEAT_MODES.indexOf(state.repeat);
    state.repeat = REPEAT_MODES[(current + 1) % REPEAT_MODES.length];
    els.repeatBtn.classList.toggle("is-on", state.repeat !== "off");
    els.repeatBtn.textContent = state.repeat === "one" ? "REP 1" : "REP";
    els.repeatBtn.setAttribute("aria-pressed", String(state.repeat !== "off"));
    var labels = { off: "REPEAT OFF", all: "REPEAT ALL", one: "REPEAT ONE" };
    showToast(labels[state.repeat]);
    safeStorageSet("nesm:repeat", state.repeat);
  }

  function toggleShuffle() {
    state.shuffle = !state.shuffle;
    els.shuffleBtn.classList.toggle("is-on", state.shuffle);
    els.shuffleBtn.setAttribute("aria-pressed", String(state.shuffle));
    showToast(state.shuffle ? "SHUFFLE ON" : "SHUFFLE OFF");
    safeStorageSet("nesm:shuffle", state.shuffle ? "1" : "0");
  }

  function applyTheme(themeId, announce) {
    var theme = THEMES.find(function (item) {
      return item.id === themeId;
    }) || THEMES[0];

    THEMES.forEach(function (item) {
      els.body.classList.remove("theme-" + item.id);
    });
    if (theme.id !== "green") {
      els.body.classList.add("theme-" + theme.id);
    }

    state.theme = theme.id;
    els.skinName.textContent = theme.label;
    accent = window.getComputedStyle(els.body).getPropertyValue("--accent").trim() || "#58ff92";
    safeStorageSet("nesm:theme", theme.id);

    if (announce) showToast("SKIN: " + theme.label);
  }

  function cycleTheme() {
    var current = THEMES.findIndex(function (theme) {
      return theme.id === state.theme;
    });
    var next = THEMES[(current + 1) % THEMES.length];
    applyTheme(next.id, true);
  }

  function toggleTaskWindow(name) {
    var win = document.querySelector('[data-window="' + name + '"]');
    if (!win) return;
    win.classList.toggle("is-hidden");
    updateTaskButtons();
  }

  function showAllWindows() {
    state.windowZ = 5;
    $$(".window").forEach(function (win) {
      win.classList.remove("is-hidden");
      win.style.setProperty("--tx", "0px");
      win.style.setProperty("--ty", "0px");
      win.style.zIndex = "1";
    });
    updateTaskButtons();
    showToast("VENTANAS RESTAURADAS");
  }

  function raiseWindow(win) {
    state.windowZ += 1;
    win.style.zIndex = String(state.windowZ);
  }

  function updateTaskButtons() {
    $$(".task-btn").forEach(function (button) {
      var win = document.querySelector('[data-window="' + button.dataset.task + '"]');
      button.classList.toggle("is-active", Boolean(win && !win.classList.contains("is-hidden")));
    });
  }

  function minimizeWindow(win) {
    win.classList.add("is-hidden");
    updateTaskButtons();
  }

  function handleAction(action) {
    switch (action) {
      case "play":
        togglePlay();
        break;
      case "prev":
        previousTrack();
        break;
      case "next":
        nextTrack(false);
        break;
      case "stop":
        stopPlayback();
        break;
      case "random":
        loadTrack(randomIndex(), true);
        break;
      case "shuffle":
        toggleShuffle();
        break;
      case "repeat":
        cycleRepeat();
        break;
      case "eq":
        setEqOn(!state.eqOn);
        showToast(state.eqOn ? "EQ ON" : "EQ OFF");
        break;
      case "close":
      case "minimize":
        var win = document.querySelector(".window.is-dragging") || null;
        if (!win) {
          var target = document.activeElement;
          win = target ? target.closest(".window") : null;
        }
        if (!win) win = els.playerWindow;
        minimizeWindow(win);
        break;
      case "about":
        showToast("no es ia, es música muerta · beats hechos a mano · 10 tracks · space = play", 4200);
        break;
      default:
        break;
    }
  }

  function setupSeekbar() {
    function seekFromEvent(event) {
      var duration = isFinite(audio.duration) ? audio.duration : currentTrack().duration;
      if (!duration || duration <= 0 || audio.readyState === 0) return;
      var rect = els.seekbar.getBoundingClientRect();
      var ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      var time = ratio * duration;
      audio.currentTime = time;
      updateSeek(time, duration);
      els.timeCurrent.textContent = formatTime(time);
    }

    els.seekbar.addEventListener("pointerdown", function (event) {
      state.seeking = true;
      els.seekbar.setPointerCapture(event.pointerId);
      seekFromEvent(event);
    });

    els.seekbar.addEventListener("pointermove", function (event) {
      if (state.seeking) seekFromEvent(event);
    });

    function endSeek() {
      state.seeking = false;
    }

    els.seekbar.addEventListener("pointerup", endSeek);
    els.seekbar.addEventListener("pointercancel", endSeek);
    els.seekbar.addEventListener("lostpointercapture", endSeek);

    els.seekbar.addEventListener("keydown", function (event) {
      var duration = isFinite(audio.duration) ? audio.duration : currentTrack().duration;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        var delta = event.key === "ArrowRight" ? 5 : -5;
        audio.currentTime = clamp(audio.currentTime + delta, 0, duration);
        updateSeek(audio.currentTime, duration);
      }
    });
  }

  function setupDragging() {
    $$(".window").forEach(function (win) {
      var handle = $(".titlebar", win);
      if (!handle) return;

      win.addEventListener("pointerdown", function () {
        raiseWindow(win);
      });

      handle.addEventListener("pointerdown", function (event) {
        if (event.button !== 0) return;
        if (event.target.closest("button")) return;
        if (window.matchMedia("(max-width: 840px)").matches) return;

        var rect = win.getBoundingClientRect();
        var startX = event.clientX;
        var startY = event.clientY;
        var baseX = parseFloat(win.style.getPropertyValue("--tx")) || 0;
        var baseY = parseFloat(win.style.getPropertyValue("--ty")) || 0;
        var minDx = Math.min(0, 48 - rect.width - rect.left);
        var maxDx = Math.max(0, window.innerWidth - 48 - rect.left);
        var minDy = Math.min(0, -rect.top);
        var maxDy = Math.max(0, window.innerHeight - 80 - rect.top);

        drag = {
          win: win,
          handle: handle,
          pointerId: event.pointerId,
          startX: startX,
          startY: startY,
          baseX: baseX,
          baseY: baseY,
          minDx: minDx,
          maxDx: maxDx,
          minDy: minDy,
          maxDy: maxDy
        };

        win.classList.add("is-dragging");
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
      });

      handle.addEventListener("pointermove", function (event) {
        if (!drag || drag.win !== win || drag.pointerId !== event.pointerId) return;
        var dx = clamp(event.clientX - drag.startX, drag.minDx, drag.maxDx);
        var dy = clamp(event.clientY - drag.startY, drag.minDy, drag.maxDy);
        win.style.setProperty("--tx", (drag.baseX + dx) + "px");
        win.style.setProperty("--ty", (drag.baseY + dy) + "px");
      });

      function endDrag(event) {
        if (!drag || drag.win !== win) return;
        if (event && event.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
        win.classList.remove("is-dragging");
        try {
          handle.releasePointerCapture(drag.pointerId);
        } catch (error) {
          return;
        }
        drag = null;
      }

      handle.addEventListener("pointerup", endDrag);
      handle.addEventListener("pointercancel", endDrag);
      handle.addEventListener("lostpointercapture", endDrag);

      handle.addEventListener("dblclick", function (event) {
        if (event.target.closest("button")) return;
        win.style.setProperty("--tx", "0px");
        win.style.setProperty("--ty", "0px");
      });
    });
  }

  function setupCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    var currentWidth = 0;
    var currentHeight = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    return {
      ctx: ctx,
      ready: function () {
        var width = Math.max(1, Math.round(canvas.clientWidth));
        var height = Math.max(1, Math.round(canvas.clientHeight));
        if (width !== currentWidth || height !== currentHeight) {
          currentWidth = width;
          currentHeight = height;
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        return { ctx: ctx, width: currentWidth, height: currentHeight };
      }
    };
  }

  function setupAnalyserDraw() {
    var spectrum = setupCanvas(els.spectrum);
    var viz = setupCanvas(els.vizCanvas);
    var lastTime = 0;

    function draw(timestamp) {
      window.requestAnimationFrame(draw);
      if (timestamp - lastTime < 30) return;
      lastTime = timestamp;

      var hasData = graph.ready && graph.analyser && state.playing;
      if (hasData) {
        graph.analyser.getByteFrequencyData(graph.freq);
        graph.analyser.getByteTimeDomainData(graph.wave);
      }

      drawSpectrum(spectrum, hasData, timestamp);
      drawViz(viz, hasData, timestamp);
    }

    window.requestAnimationFrame(draw);
  }

  function drawSpectrum(target, hasData, timestamp) {
    var surface = target.ready();
    var ctx = surface.ctx;
    var width = surface.width;
    var height = surface.height;
    var bars = Math.max(24, Math.floor(width / 5));
    var gap = 1;
    var barWidth = Math.max(1, (width - gap * (bars - 1)) / bars);
    var bins = graph.freq ? graph.freq.length : 0;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 6;

    for (var i = 0; i < bars; i += 1) {
      var level;
      if (hasData && bins > 0) {
        var position = Math.pow(i / bars, 1.6);
        var bin = Math.min(bins - 1, Math.floor(position * bins * 0.72));
        level = graph.freq[bin] / 255;
      } else {
        level = 0.04 + 0.025 * Math.sin(timestamp / 640 + i * 0.55);
      }

      var barHeight = Math.max(1, level * height * 0.92);
      var x = i * (barWidth + gap);
      ctx.globalAlpha = hasData ? 0.45 + level * 0.5 : 0.18;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    }

    ctx.restore();
  }

  function drawViz(target, hasData, timestamp) {
    var surface = target.ready();
    var ctx = surface.ctx;
    var width = surface.width;
    var height = surface.height;
    var center = height / 2;
    var bars = Math.max(32, Math.floor(width / 4.5));
    var gap = 1;
    var barWidth = Math.max(1, (width - gap * (bars - 1)) / bars);
    var bins = graph.freq ? graph.freq.length : 0;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.055)";
    ctx.lineWidth = 1;
    for (var line = 1; line < 4; line += 1) {
      var y = (height / 4) * line;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (var column = 1; column < 8; column += 1) {
      var x = (width / 8) * column;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;

    for (var i = 0; i < bars; i += 1) {
      var level;
      if (hasData && bins > 0) {
        var position = Math.pow(i / bars, 1.5);
        var bin = Math.min(bins - 1, Math.floor(position * bins * 0.7));
        level = graph.freq[bin] / 255;
      } else {
        level = 0.03 + 0.02 * Math.sin(timestamp / 700 + i * 0.42);
      }

      var barHeight = Math.max(1, level * (height * 0.46));
      var xPos = i * (barWidth + gap);
      ctx.globalAlpha = hasData ? 0.6 : 0.18;
      ctx.fillRect(xPos, center - barHeight, barWidth, barHeight);
      ctx.globalAlpha = hasData ? 0.22 : 0.08;
      ctx.fillRect(xPos, center, barWidth, barHeight * 0.55);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = hasData ? 0.95 : 0.25;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.beginPath();

    var wave = graph.wave;
    var points = wave && hasData ? wave.length : 128;
    for (var p = 0; p < points; p += 1) {
      var value = hasData && wave ? wave[p] / 128 - 1 : Math.sin(timestamp / 480 + p * 0.11) * 0.04;
      var px = (p / (points - 1)) * width;
      var py = center - value * (height * 0.42);
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, center, width, 1);
    ctx.restore();
  }

  function updateClock() {
    var now = new Date();
    els.clock.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
  }

  function restoreSettings() {
    var storedVolume = safeStorageGet("nesm:volume");
    if (storedVolume !== null && storedVolume !== "") {
      var parsedVolume = Number(storedVolume);
      if (isFinite(parsedVolume) && parsedVolume >= 0) state.volume = clamp(parsedVolume, 0, 100);
    }
    state.lastVolume = state.volume || 78;

    var storedIndex = Number(safeStorageGet("nesm:lastIndex"));
    if (isFinite(storedIndex) && storedIndex >= 0 && storedIndex < TRACKS.length) {
      state.index = Math.floor(storedIndex);
    }

    state.shuffle = safeStorageGet("nesm:shuffle") === "1";
    var storedRepeat = safeStorageGet("nesm:repeat");
    if (REPEAT_MODES.indexOf(storedRepeat) !== -1) state.repeat = storedRepeat;

    var storedTheme = safeStorageGet("nesm:theme");
    if (storedTheme && THEMES.some(function (theme) { return theme.id === storedTheme; })) {
      state.theme = storedTheme;
    }

    var storedEqOn = safeStorageGet("nesm:eqOn");
    if (storedEqOn !== null) state.eqOn = storedEqOn === "1";

    var storedBands = safeStorageGet("nesm:eqBands");
    if (storedBands) {
      try {
        var values = JSON.parse(storedBands);
        var sliders = $$('#eqBands input[type="range"]');
        sliders.forEach(function (slider, index) {
          if (values[index] !== undefined) slider.value = String(clamp(Number(values[index]), -12, 12));
        });
      } catch (error) {
        return;
      }
    }

    var storedPreset = safeStorageGet("nesm:eqPreset");
    if (storedPreset && PRESETS[storedPreset]) els.eqPreset.value = storedPreset;
  }

  function bindEvents() {
    els.volume.addEventListener("input", function () {
      setVolume(Number(els.volume.value));
    });

    els.eqPower.addEventListener("click", function () {
      setEqOn(!state.eqOn);
      showToast(state.eqOn ? "EQ ON" : "EQ OFF");
    });
    els.eqPreset.addEventListener("change", function () {
      setPreset(els.eqPreset.value);
    });
    els.eqReset.addEventListener("click", function () {
      setPreset("flat");
      setEqOn(true);
    });

    $$('#eqBands input[type="range"]').forEach(function (slider) {
      slider.addEventListener("input", function () {
        applyEq();
        saveEqBands();
        els.eqPreset.value = "custom";
      });
    });

    els.filter.addEventListener("input", applyFilter);
    els.clearFilter.addEventListener("click", function () {
      els.filter.value = "";
      applyFilter();
      els.filter.focus();
    });

    els.skinBtn.addEventListener("click", cycleTheme);
    els.startBtn.addEventListener("click", showAllWindows);

    els.taskList.addEventListener("click", function (event) {
      var button = event.target.closest(".task-btn");
      if (!button) return;
      toggleTaskWindow(button.dataset.task);
    });

    document.addEventListener("click", function (event) {
      var transport = event.target.closest(".transport-btn");
      if (transport) {
        handleAction(transport.dataset.action);
        return;
      }

      var action = event.target.closest("[data-action]");
      if (!action) return;
      var name = action.dataset.action;
      if (name === "close" || name === "minimize") {
        var win = action.closest(".window");
        if (win) {
          minimizeWindow(win);
          return;
        }
      }
      handleAction(name);
    });

    els.eqPreset.addEventListener("keydown", function (event) {
      event.stopPropagation();
    });

    audio.addEventListener("play", function () {
      setPlaying(true);
    });

    audio.addEventListener("pause", function () {
      setPlaying(false);
    });

    audio.addEventListener("ended", handleEnded);

    audio.addEventListener("loadedmetadata", function () {
      if (isFinite(audio.duration) && audio.duration > 0) {
        TRACKS[state.index].duration = audio.duration;
        updatePlaylistDurations();
        els.timeTotal.textContent = formatTime(audio.duration);
        if (!state.seeking) updateSeek(audio.currentTime, audio.duration);
      }
    });

    audio.addEventListener("timeupdate", function () {
      if (state.seeking) return;
      var duration = isFinite(audio.duration) ? audio.duration : currentTrack().duration;
      els.timeCurrent.textContent = formatTime(audio.currentTime);
      els.timeTotal.textContent = formatTime(duration);
      updateSeek(audio.currentTime, duration);
    });

    audio.addEventListener("error", function () {
      setStatusMessage("SIGNAL LOST");
      showToast("No encontré el audio. Revisá la carpeta /audio.");
    });

    document.addEventListener("keydown", function (event) {
      var tag = event.target.tagName;
      var typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || event.target.isContentEditable;
      if (typing) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          if (event.target === els.seekbar) return;
          event.preventDefault();
          audio.currentTime = clamp(audio.currentTime + 5, 0, isFinite(audio.duration) ? audio.duration : 0);
          break;
        case "ArrowLeft":
          if (event.target === els.seekbar) return;
          event.preventDefault();
          audio.currentTime = clamp(audio.currentTime - 5, 0, isFinite(audio.duration) ? audio.duration : 0);
          break;
        case "ArrowUp":
          event.preventDefault();
          setVolume(Math.min(100, state.volume + 5));
          break;
        case "ArrowDown":
          event.preventDefault();
          setVolume(Math.max(0, state.volume - 5));
          break;
        case "n":
        case "N":
          nextTrack(false);
          break;
        case "p":
        case "P":
          previousTrack();
          break;
        case "s":
        case "S":
          toggleShuffle();
          break;
        case "r":
        case "R":
          cycleRepeat();
          break;
        case "e":
        case "E":
          setEqOn(!state.eqOn);
          showToast(state.eqOn ? "EQ ON" : "EQ OFF");
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "t":
        case "T":
          cycleTheme();
          break;
        case "Escape":
          if (els.filter.value) {
            els.filter.value = "";
            applyFilter();
          }
          break;
        case "?":
          showToast("SPACE play · ←/→ seek · ↑/↓ vol · N/P tema · S shuffle · R repeat · E eq · M mute · T skin", 5200);
          break;
        default:
          break;
      }
    });

    window.addEventListener("resize", function () {
      updateActiveRow();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        state.seeking = false;
      }
    });
  }

  function init() {
    restoreSettings();
    buildPlaylist();
    applyTheme(state.theme, false);
    applyFilter();

    els.shuffleBtn.classList.toggle("is-on", state.shuffle);
    els.shuffleBtn.setAttribute("aria-pressed", String(state.shuffle));
    els.repeatBtn.classList.toggle("is-on", state.repeat !== "off");
    els.repeatBtn.textContent = state.repeat === "one" ? "REP 1" : "REP";
    els.repeatBtn.setAttribute("aria-pressed", String(state.repeat !== "off"));
    setEqOn(state.eqOn);
    applyVolume();

    loadTrack(state.index, false);
    setStatusMessage("READY // SIDE A");
    els.trayText.textContent = "STANDBY";
    updateTaskButtons();
    setupSeekbar();
    setupDragging();
    setupAnalyserDraw();
    bindEvents();

    updateClock();
    clockTimer = window.setInterval(updateClock, 15000);
    window.addEventListener("beforeunload", function () {
      window.clearInterval(clockTimer);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
