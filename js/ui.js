/* ==========================================================================
   SKY WARRIORS 3D — UI CONTROLLER, SAVE SYSTEM & MASTER RENDER LOOP
   ========================================================================== */

(function () {
  const STORAGE_KEY = "sky_warriors_3d_save_v1";

  const defaultSave = {
    level: 1,
    xp: 250,
    credits: 2500,
    kills: 0,
    highScore: 0,
    completedMissions: [],
    selectedJet: "f16",
    selectedMode: "combat",
    selectedMissionId: 1,
    jetConfigs: {
      f16: { livery: "tactical_gray", upgrades: { engine: 0, armor: 0, weapons: 0 } },
      f22: { livery: "stealth_black", upgrades: { engine: 0, armor: 0, weapons: 0 } },
      f35: { livery: "tactical_gray", upgrades: { engine: 0, armor: 0, weapons: 0 } },
      su57: { livery: "arctic_splinter", upgrades: { engine: 0, armor: 0, weapons: 0 } },
      typhoon: { livery: "garuda_ace", upgrades: { engine: 0, armor: 0, weapons: 0 } }
    },
    settings: {
      graphics: "high",
      resolution: "auto",
      fps: 60,
      musicVol: 65,
      sfxVol: 85,
      sensitivity: 1.0,
      camDist: 13,
      cameraMode: "third",
      lang: "id"
    }
  };

  class UIController {
    constructor() {
      this.saveData = this._loadSave();
      this.currentScreen = "loading";
      this.previewJetId = this.saveData.selectedJet;
      this.garageJetId = this.saveData.selectedJet;
      this.autoSpin = true;
      this.afterburnerTest = false;

      this.hangarCamera = {
        orbitYaw: 0.65,
        orbitPitch: 0.22,
        orbitDist: 16.5
      };

      const canvas = document.getElementById("game-canvas");
      this.engine = new SkyEngine3D(canvas);
      this.sound = window.soundEngine;
      this.game = new FlightGameController(this.engine, this.sound);
      this.game.onMissionComplete = res => this._handleMissionResult(res);

      this._applySettingsToSystems();
      this._bindUIEvents();
      this._checkOrientation();
      this._runLoadingSequence();
    }

    _loadSave() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Object.assign({}, defaultSave, parsed, {
            settings: Object.assign({}, defaultSave.settings, parsed.settings || {}),
            jetConfigs: Object.assign({}, defaultSave.jetConfigs, parsed.jetConfigs || {})
          });
        }
      } catch (e) {
        console.warn("Save load fallback", e);
      }
      return JSON.parse(JSON.stringify(defaultSave));
    }

    _persistSave() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saveData));
      } catch (e) {
        console.warn("Save write error", e);
      }
    }

    _checkOrientation() {
      const notice = document.getElementById("rotate-notice");
      const check = () => {
        if (window.innerHeight > window.innerWidth && window.innerWidth < 768) {
          notice.classList.remove("hidden");
        } else {
          notice.classList.add("hidden");
        }
        this.engine.resize();
      };
      window.addEventListener("resize", check);
      document.getElementById("btn-dismiss-rotate").addEventListener("click", () => {
        notice.classList.add("hidden");
      });
      check();
    }

    _runLoadingSequence() {
      const fill = document.getElementById("loading-fill");
      const pct = document.getElementById("loading-percent");
      const status = document.getElementById("loading-status");

      const steps = [
        { p: 24, text: "COMPILING 3D HD WEBGL SHADERS..." },
        { p: 52, text: "GENERATING F-16 / F-22 / F-35 / SU-57 / TYPHOON MESHES..." },
        { p: 80, text: "BUILDING GARUDA AIRBASE & ARCHIPELAGO..." },
        { p: 100, text: "READY FOR LAUNCH!" }
      ];

      let idx = 0;
      const timer = setInterval(() => {
        if (idx < steps.length) {
          fill.style.width = steps[idx].p + "%";
          pct.textContent = steps[idx].p + "%";
          status.textContent = steps[idx].text;
          idx++;
        } else {
          clearInterval(timer);
          this.showScreen("lobby");
          this._startMainLoop();
        }
      }, 220);
    }

    showScreen(name) {
      this.currentScreen = name;
      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
      const target = document.getElementById("screen-" + name);
      if (target) target.classList.add("active");

      if (name === "lobby") {
        this._refreshLobbyUI();
      } else if (name === "hangar") {
        this.previewJetId = this.saveData.selectedJet;
        this._refreshHangarUI();
      } else if (name === "garage") {
        this.garageJetId = this.saveData.selectedJet;
        this._refreshGarageUI();
      } else if (name === "settings") {
        this._refreshSettingsUI();
      } else if (name === "missions") {
        this._refreshMissionsUI();
      }
    }

    _bindUIEvents() {
      // Unlock Web Audio on first user interaction anywhere
      const unlockAudio = () => this.sound.init();
      window.addEventListener("pointerdown", unlockAudio, { once: true });

      // 360° Hangar Orbit Drag on Canvas (Lobby & Hangar)
      const canvas = document.getElementById("game-canvas");
      let dragging = false;
      let lastX = 0, lastY = 0;

      canvas.addEventListener("pointerdown", e => {
        if (this.currentScreen === "lobby" || this.currentScreen === "hangar" || this.currentScreen === "garage") {
          dragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
        }
      });
      window.addEventListener("pointermove", e => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        this.hangarCamera.orbitYaw -= dx * 0.008;
        this.hangarCamera.orbitPitch = Math.max(0.08, Math.min(0.65, this.hangarCamera.orbitPitch + dy * 0.005));
      });
      window.addEventListener("pointerup", () => { dragging = false; });

      // Lobby Buttons
      document.getElementById("btn-audio-toggle").addEventListener("click", () => {
        this.sound.init();
        const muted = this.sound.toggleMute();
        document.getElementById("btn-audio-toggle").textContent = muted ? "🔇" : "🔊";
      });
      document.getElementById("btn-lobby-settings-top").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("settings");
      });
      document.getElementById("btn-nav-aircraft").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("hangar");
      });
      document.getElementById("btn-nav-garage").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("garage");
      });
      document.getElementById("btn-nav-missions").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("missions");
      });
      document.getElementById("btn-nav-settings").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("settings");
      });

      // Quick Mode Cycle in Lobby
      document.getElementById("btn-quick-mode").addEventListener("click", () => {
        this.sound.playSfx("click");
        const modes = window.GAME_DATA.modes;
        const idx = modes.findIndex(m => m.id === this.saveData.selectedMode);
        this.saveData.selectedMode = modes[(idx + 1) % modes.length].id;
        this._persistSave();
        this._refreshLobbyUI();
      });

      // Main PLAY Button
      document.getElementById("btn-play").addEventListener("click", () => {
        this.sound.playSfx("click");
        this._launchGameplay();
      });

      // Hangar Aircraft Selection Buttons
      document.getElementById("btn-hangar-back").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.afterburnerTest = false;
        this.showScreen("lobby");
      });
      document.getElementById("btn-toggle-auto-spin").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.autoSpin = !this.autoSpin;
      });
      document.getElementById("btn-jet-select").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.saveData.selectedJet = this.previewJetId;
        this._persistSave();
        this._refreshHangarUI();
      });
      document.getElementById("btn-jet-preview").addEventListener("click", () => {
        this.sound.playSfx("click");
        document.getElementById("hangar-spec-panel").classList.add("hidden");
        document.getElementById("hangar-carousel").classList.add("hidden");
        document.getElementById("preview-exit-bar").classList.remove("hidden");
      });
      document.getElementById("btn-test-afterburner").addEventListener("click", () => {
        this.afterburnerTest = !this.afterburnerTest;
        if (this.afterburnerTest) this.sound.playSfx("missile");
      });
      document.getElementById("btn-exit-preview").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.afterburnerTest = false;
        document.getElementById("hangar-spec-panel").classList.remove("hidden");
        document.getElementById("hangar-carousel").classList.remove("hidden");
        document.getElementById("preview-exit-bar").classList.add("hidden");
      });

      // Garage Screen Buttons
      document.getElementById("btn-garage-back").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("lobby");
      });
      document.getElementById("btn-garage-equip").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.saveData.selectedJet = this.garageJetId;
        this._persistSave();
        this.showScreen("lobby");
      });

      // Settings Screen Controls
      document.getElementById("btn-settings-back").addEventListener("click", () => {
        this.sound.playSfx("click");
        if (this.game.active && this.game.paused) {
          this.showScreen("gameplay");
        } else {
          this.showScreen("lobby");
        }
      });

      const bindSegmented = (groupId, settingKey) => {
        const group = document.getElementById(groupId);
        group.querySelectorAll("button").forEach(btn => {
          btn.addEventListener("click", () => {
            this.sound.playSfx("click");
            group.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            this.saveData.settings[settingKey] = settingKey === "fps" ? Number(btn.dataset.val) : btn.dataset.val;
            if (settingKey === "lang") this._applyLanguage();
          });
        });
      };
      bindSegmented("set-graphics-group", "graphics");
      bindSegmented("set-fps-group", "fps");
      bindSegmented("set-camera-group", "cameraMode");
      bindSegmented("set-lang-group", "lang");

      document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          this.saveData.settings.lang = btn.dataset.lang;
          this._refreshSettingsUI();
          this._applyLanguage();
        });
      });

      document.getElementById("set-resolution").addEventListener("change", e => {
        this.saveData.settings.resolution = e.target.value;
      });

      const camDistSlider = document.getElementById("set-cam-dist");
      camDistSlider.addEventListener("input", e => {
        this.saveData.settings.camDist = Number(e.target.value);
        document.getElementById("val-cam-dist").textContent = `${e.target.value} m`;
      });

      const sensSlider = document.getElementById("set-sensitivity");
      sensSlider.addEventListener("input", e => {
        this.saveData.settings.sensitivity = Number(e.target.value);
        document.getElementById("val-sensitivity").textContent = `${Number(e.target.value).toFixed(1)}x`;
      });

      const musSlider = document.getElementById("set-music-vol");
      musSlider.addEventListener("input", e => {
        this.saveData.settings.musicVol = Number(e.target.value);
        document.getElementById("val-music-vol").textContent = `${e.target.value}%`;
        this.sound.setVolumes(this.saveData.settings.musicVol, this.saveData.settings.sfxVol);
      });

      const sfxSlider = document.getElementById("set-sfx-vol");
      sfxSlider.addEventListener("input", e => {
        this.saveData.settings.sfxVol = Number(e.target.value);
        document.getElementById("val-sfx-vol").textContent = `${e.target.value}%`;
        this.sound.setVolumes(this.saveData.settings.musicVol, this.saveData.settings.sfxVol);
      });

      document.getElementById("btn-settings-apply").addEventListener("click", () => {
        this.sound.playSfx("click");
        this._applySettingsToSystems();
        this._persistSave();
        if (this.game.active && this.game.paused) {
          this.showScreen("gameplay");
        } else {
          this.showScreen("lobby");
        }
      });

      document.getElementById("btn-settings-reset").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.saveData.settings = JSON.parse(JSON.stringify(defaultSave.settings));
        this._applySettingsToSystems();
        this._refreshSettingsUI();
        this._persistSave();
      });

      // Missions Screen Buttons
      document.getElementById("btn-missions-back").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("lobby");
      });
      document.getElementById("btn-launch-mission").addEventListener("click", () => {
        this.sound.playSfx("click");
        this._launchGameplay();
      });

      // Pause Modal Buttons
      document.getElementById("btn-hud-pause").addEventListener("click", () => this.togglePause());
      document.getElementById("btn-resume").addEventListener("click", () => this.togglePause());
      document.getElementById("btn-pause-camera").addEventListener("click", () => {
        this.game.cycleCamera();
      });
      document.getElementById("btn-pause-settings").addEventListener("click", () => {
        document.getElementById("modal-pause").classList.add("hidden");
        this.showScreen("settings");
      });
      document.getElementById("btn-pause-restart").addEventListener("click", () => {
        document.getElementById("modal-pause").classList.add("hidden");
        this._launchGameplay();
      });
      document.getElementById("btn-pause-lobby").addEventListener("click", () => {
        document.getElementById("modal-pause").classList.add("hidden");
        this.game.active = false;
        this.game.paused = false;
        this.showScreen("lobby");
      });

      // Victory / Defeat Result Buttons
      document.getElementById("btn-result-replay").addEventListener("click", () => {
        this.sound.playSfx("click");
        this._launchGameplay();
      });
      document.getElementById("btn-result-next").addEventListener("click", () => {
        this.sound.playSfx("click");
        if (this.saveData.selectedMode === "mission") {
          this.saveData.selectedMissionId = (this.saveData.selectedMissionId % 5) + 1;
          this._persistSave();
        }
        this._launchGameplay();
      });
      document.getElementById("btn-result-lobby").addEventListener("click", () => {
        this.sound.playSfx("click");
        this.showScreen("lobby");
      });
    }

    togglePause() {
      if (!this.game.active) return;
      this.game.paused = !this.game.paused;
      const modal = document.getElementById("modal-pause");
      if (this.game.paused) {
        const jet = window.GAME_DATA.aircraft.find(a => a.id === this.saveData.selectedJet);
        document.getElementById("pause-mission-sub").textContent =
          `${this.saveData.selectedMode.toUpperCase()} • ${jet ? jet.name : "F-16"}`;
        modal.classList.remove("hidden");
      } else {
        modal.classList.add("hidden");
      }
    }

    _applySettingsToSystems() {
      const s = this.saveData.settings;
      this.engine.setGraphicsOptions(s.graphics, s.resolution);
      this.sound.setVolumes(s.musicVol, s.sfxVol);
      this.game.world.camDist = s.camDist;
      this.game.world.cameraMode = s.cameraMode;
      this._applyLanguage();
    }

    _applyLanguage() {
      const lang = this.saveData.settings.lang || "id";
      const dict = window.GAME_DATA.i18n[lang] || window.GAME_DATA.i18n.id;
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.textContent = dict[key];
      });
    }

    _refreshLobbyUI() {
      const s = this.saveData;
      const xpNeeded = s.level * 1000;
      const ranks = ["CADET PILOT", "WINGMAN", "FLIGHT LIEUTENANT", "SQUADRON LEADER", "ACE COMMANDER"];
      const rank = ranks[Math.min(ranks.length - 1, Math.floor((s.level - 1) / 2))];

      document.getElementById("lobby-level").textContent = s.level;
      document.getElementById("lobby-rank").textContent = rank;
      document.getElementById("lobby-xp-fill").style.width = `${Math.min(100, (s.xp / xpNeeded) * 100)}%`;
      document.getElementById("lobby-xp-text").textContent = `${s.xp} / ${xpNeeded} XP`;
      document.getElementById("lobby-credits").textContent = s.credits.toLocaleString();

      const jet = window.GAME_DATA.aircraft.find(a => a.id === s.selectedJet) || window.GAME_DATA.aircraft[0];
      document.getElementById("lobby-jet-name").textContent = jet.name;

      document.getElementById("stat-total-kills").textContent = s.kills;
      document.getElementById("stat-missions-done").textContent = `${s.completedMissions.length}/5`;
      document.getElementById("stat-high-score").textContent = s.highScore.toLocaleString();

      const modeObj = window.GAME_DATA.modes.find(m => m.id === s.selectedMode) || window.GAME_DATA.modes[2];
      document.getElementById("lobby-selected-mode").textContent =
        s.settings.lang === "en" ? modeObj.name_en : modeObj.name_id;
    }

    _refreshHangarUI() {
      const lang = this.saveData.settings.lang;
      const jet = window.GAME_DATA.aircraft.find(a => a.id === this.previewJetId) || window.GAME_DATA.aircraft[0];
      const cfg = this.saveData.jetConfigs[jet.id] || { upgrades: { engine: 0, armor: 0, weapons: 0 } };

      const speedKmh = Math.round(jet.speedKmh * (1 + cfg.upgrades.engine * 0.04));
      const agi = Math.min(100, jet.agilityStat + cfg.upgrades.engine * 2);
      const dur = Math.min(100, jet.durabilityStat + cfg.upgrades.armor * 4);
      const fir = Math.min(100, jet.firepowerStat + cfg.upgrades.weapons * 3);

      document.getElementById("hangar-jet-role").textContent = jet.role;
      document.getElementById("hangar-jet-name").textContent = jet.name;
      document.getElementById("hangar-jet-desc").textContent = lang === "en" ? jet.desc_en : jet.desc_id;

      document.getElementById("val-speed").textContent = `${speedKmh.toLocaleString()} km/h`;
      document.getElementById("bar-speed").style.width = `${Math.min(100, jet.speedStat + cfg.upgrades.engine * 3)}%`;
      document.getElementById("val-agility").textContent = `${agi} / 100`;
      document.getElementById("bar-agility").style.width = `${agi}%`;
      document.getElementById("val-durability").textContent = `${dur} / 100`;
      document.getElementById("bar-durability").style.width = `${dur}%`;
      document.getElementById("val-firepower").textContent = `${fir} / 100`;
      document.getElementById("bar-firepower").style.width = `${fir}%`;

      const selectBtn = document.getElementById("btn-jet-select");
      if (this.saveData.selectedJet === jet.id) {
        selectBtn.textContent = lang === "en" ? "EQUIPPED ✓" : "TERPASANG ✓";
      } else {
        selectBtn.textContent = lang === "en" ? "SELECT" : "PILIH PESAWAT";
      }

      // Render Carousel
      const carousel = document.getElementById("hangar-carousel");
      carousel.innerHTML = "";
      window.GAME_DATA.aircraft.forEach(item => {
        const card = document.createElement("div");
        card.className = "jet-card" + (item.id === this.previewJetId ? " selected" : "");
        const isEq = item.id === this.saveData.selectedJet;
        card.innerHTML = `
          <div class="jet-card-top">
            <span>MACH ${(item.speedKmh / 1235).toFixed(1)}</span>
            ${isEq ? '<span class="equipped-pill">ACTIVE</span>' : ""}
          </div>
          <div class="jet-card-name">${item.name}</div>
          <div class="jet-card-sub">${item.role}</div>
        `;
        card.addEventListener("click", () => {
          this.sound.playSfx("click");
          this.previewJetId = item.id;
          this._refreshHangarUI();
        });
        carousel.appendChild(card);
      });
    }

    _refreshGarageUI() {
      const lang = this.saveData.settings.lang;
      document.getElementById("garage-credits").textContent = this.saveData.credits.toLocaleString();

      const fleetList = document.getElementById("garage-fleet-list");
      fleetList.innerHTML = "";
      window.GAME_DATA.aircraft.forEach(jet => {
        const row = document.createElement("div");
        row.className = "fleet-item" + (jet.id === this.garageJetId ? " active" : "");
        row.innerHTML = `
          <div>
            <strong>${jet.name}</strong>
            <div style="font-size:10px;color:#94a3b8">${jet.role}</div>
          </div>
          <span style="font-size:11px;color:#4ade80;font-weight:700">UNLOCKED</span>
        `;
        row.addEventListener("click", () => {
          this.sound.playSfx("click");
          this.garageJetId = jet.id;
          this._refreshGarageUI();
        });
        fleetList.appendChild(row);
      });

      const activeJet = window.GAME_DATA.aircraft.find(a => a.id === this.garageJetId) || window.GAME_DATA.aircraft[0];
      document.getElementById("garage-selected-title").textContent = activeJet.name;
      const cfg = this.saveData.jetConfigs[activeJet.id];

      // Liveries
      const livWrap = document.getElementById("livery-options");
      livWrap.innerHTML = "";
      window.GAME_DATA.liveries.forEach(liv => {
        const chip = document.createElement("button");
        chip.className = "livery-chip" + (cfg.livery === liv.id ? " active" : "");
        chip.innerHTML = `<span class="swatch-dot" style="background:${liv.primary}"></span> ${liv.name}`;
        chip.addEventListener("click", () => {
          this.sound.playSfx("click");
          cfg.livery = liv.id;
          this._persistSave();
          this._refreshGarageUI();
        });
        livWrap.appendChild(chip);
      });

      // Upgrades
      const upgWrap = document.getElementById("upgrade-list");
      upgWrap.innerHTML = "";
      window.GAME_DATA.upgrades.forEach(u => {
        const curLvl = cfg.upgrades[u.id] || 0;
        const cost = u.costBase * (curLvl + 1);
        const maxed = curLvl >= u.maxLvl;
        const row = document.createElement("div");
        row.className = "upgrade-row";
        row.innerHTML = `
          <div>
            <strong>${lang === "en" ? u.name_en : u.name_id}</strong>
            <div style="font-size:10px;color:#fb923c">LEVEL ${curLvl} / ${u.maxLvl}</div>
          </div>
          <button class="btn-secondary-sm" ${maxed ? "disabled" : ""}>
            ${maxed ? "MAX" : `UPGRADE (${cost} ✦)`}
          </button>
        `;
        const btn = row.querySelector("button");
        btn.addEventListener("click", () => {
          if (maxed) return;
          if (this.saveData.credits >= cost) {
            this.saveData.credits -= cost;
            cfg.upgrades[u.id] = curLvl + 1;
            this.sound.playSfx("ring");
            this._persistSave();
            this._refreshGarageUI();
          } else {
            this.sound.playSfx("warning");
          }
        });
        upgWrap.appendChild(row);
      });
    }

    _refreshSettingsUI() {
      const s = this.saveData.settings;
      const syncSeg = (id, val) => {
        document.getElementById(id).querySelectorAll("button").forEach(b => {
          b.classList.toggle("active", b.dataset.val === String(val));
        });
      };
      syncSeg("set-graphics-group", s.graphics);
      syncSeg("set-fps-group", s.fps);
      syncSeg("set-camera-group", s.cameraMode);
      syncSeg("set-lang-group", s.lang);

      document.querySelectorAll(".lang-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === s.lang);
      });

      document.getElementById("set-resolution").value = s.resolution;
      document.getElementById("set-cam-dist").value = s.camDist;
      document.getElementById("val-cam-dist").textContent = `${s.camDist} m`;
      document.getElementById("set-sensitivity").value = s.sensitivity;
      document.getElementById("val-sensitivity").textContent = `${Number(s.sensitivity).toFixed(1)}x`;
      document.getElementById("set-music-vol").value = s.musicVol;
      document.getElementById("val-music-vol").textContent = `${s.musicVol}%`;
      document.getElementById("set-sfx-vol").value = s.sfxVol;
      document.getElementById("val-sfx-vol").textContent = `${s.sfxVol}%`;
    }

    _refreshMissionsUI() {
      const lang = this.saveData.settings.lang;
      const modesList = document.getElementById("mode-cards-list");
      modesList.innerHTML = "";

      window.GAME_DATA.modes.forEach(m => {
        const card = document.createElement("button");
        card.className = "mode-btn-card" + (this.saveData.selectedMode === m.id ? " active" : "");
        card.innerHTML = `
          <strong>${lang === "en" ? m.name_en : m.name_id}</strong>
          <span>${lang === "en" ? m.sub_en : m.sub_id}</span>
        `;
        card.addEventListener("click", () => {
          this.sound.playSfx("click");
          this.saveData.selectedMode = m.id;
          this._persistSave();
          this._refreshMissionsUI();
        });
        modesList.appendChild(card);
      });

      const campWrap = document.getElementById("campaign-list-wrap");
      campWrap.innerHTML = "";

      if (this.saveData.selectedMode === "mission") {
        campWrap.classList.remove("hidden");
        window.GAME_DATA.campaignMissions.forEach(cm => {
          const done = this.saveData.completedMissions.includes(cm.id);
          const chip = document.createElement("button");
          chip.className = "campaign-chip" + (this.saveData.selectedMissionId === cm.id ? " active" : "");
          chip.innerHTML = `
            <small>${cm.code} ${done ? "✓" : ""}</small>
            <strong>${lang === "en" ? cm.title_en : cm.title_id}</strong>
          `;
          chip.addEventListener("click", () => {
            this.sound.playSfx("click");
            this.saveData.selectedMissionId = cm.id;
            this._persistSave();
            this._refreshMissionsUI();
          });
          campWrap.appendChild(chip);
        });

        const curM = window.GAME_DATA.campaignMissions.find(c => c.id === this.saveData.selectedMissionId) || window.GAME_DATA.campaignMissions[0];
        document.getElementById("briefing-badge").textContent = curM.code;
        document.getElementById("briefing-diff").textContent = curM.diff;
        document.getElementById("briefing-title").textContent = lang === "en" ? curM.title_en : curM.title_id;
        document.getElementById("briefing-desc").textContent = lang === "en" ? curM.desc_en : curM.desc_id;
        document.getElementById("briefing-env").textContent = lang === "en" ? curM.env_en : curM.env_id;
        document.getElementById("briefing-obj").textContent = lang === "en" ? curM.obj_en : curM.obj_id;
        document.getElementById("briefing-reward").textContent = `+${curM.rewardXp} XP • +${curM.rewardCredits} ✦`;
      } else {
        campWrap.classList.add("hidden");
        const curMode = window.GAME_DATA.modes.find(m => m.id === this.saveData.selectedMode) || window.GAME_DATA.modes[2];
        document.getElementById("briefing-badge").textContent = curMode.id.toUpperCase();
        document.getElementById("briefing-diff").textContent = curMode.diff;
        document.getElementById("briefing-title").textContent = lang === "en" ? curMode.name_en : curMode.name_id;
        document.getElementById("briefing-desc").textContent = lang === "en" ? curMode.desc_en : curMode.desc_id;
        document.getElementById("briefing-env").textContent = lang === "en" ? curMode.env_en : curMode.env_id;
        document.getElementById("briefing-obj").textContent = lang === "en" ? curMode.obj_en : curMode.obj_id;
        document.getElementById("briefing-reward").textContent = `+${curMode.rewardXp} XP • +${curMode.rewardCredits} ✦`;
      }
    }

    _launchGameplay() {
      const s = this.saveData;
      const jetCfg = s.jetConfigs[s.selectedJet] || { livery: "tactical_gray", upgrades: { engine: 0, armor: 0, weapons: 0 } };
      const modeObj = window.GAME_DATA.modes.find(m => m.id === s.selectedMode) || window.GAME_DATA.modes[2];
      const campMission = s.selectedMode === "mission"
        ? window.GAME_DATA.campaignMissions.find(c => c.id === s.selectedMissionId)
        : null;

      this.showScreen("gameplay");
      this.game.startSession({
        jetId: s.selectedJet,
        liveryId: jetCfg.livery,
        upgrades: jetCfg.upgrades,
        mode: s.selectedMode,
        campaignMission: campMission,
        lighting: campMission ? campMission.lighting : modeObj.lighting,
        cameraMode: s.settings.cameraMode,
        camDist: s.settings.camDist
      });
    }

    _handleMissionResult(res) {
      const lang = this.saveData.settings.lang;
      const badge = document.getElementById("result-badge");
      const title = document.getElementById("result-title");
      const sub = document.getElementById("result-subtitle");

      const earnedXp = res.victory ? (350 + res.kills * 80) : (80 + res.kills * 40);
      const earnedCredits = res.victory ? (450 + res.kills * 100) : (100 + res.kills * 50);

      this.saveData.kills += res.kills;
      this.saveData.credits += earnedCredits;
      this.saveData.xp += earnedXp;
      if (res.score > this.saveData.highScore) this.saveData.highScore = res.score;

      if (res.victory && res.mission && !this.saveData.completedMissions.includes(res.mission.id)) {
        this.saveData.completedMissions.push(res.mission.id);
      }

      let leveledUp = false;
      while (this.saveData.xp >= this.saveData.level * 1000) {
        this.saveData.xp -= this.saveData.level * 1000;
        this.saveData.level++;
        leveledUp = true;
      }
      this._persistSave();

      if (res.victory) {
        badge.className = "result-badge victory";
        badge.textContent = "MISSION ACCOMPLISHED";
        title.textContent = lang === "en" ? "AIR SUPERIORITY VICTORY" : "KEMENANGAN UDARA";
        sub.textContent = lang === "en"
          ? "All mission objectives completed. Returning to Garuda Airbase."
          : "Seluruh target dan objektif misi berhasil diselesaikan dengan sempurna.";
      } else {
        badge.className = "result-badge defeat";
        badge.textContent = "AIRCRAFT LOST";
        title.textContent = lang === "en" ? "MISSION FAILED" : "MISI GAGAL";
        sub.textContent = lang === "en"
          ? "Your fighter sustained critical damage. Regroup and re-engage."
          : "Pesawat tempur mengalami kerusakan kritis. Bersiap untuk serangan balasan.";
      }

      const mins = String(Math.floor(res.elapsed / 60)).padStart(2, "0");
      const secs = String(Math.floor(res.elapsed % 60)).padStart(2, "0");
      document.getElementById("res-kills").textContent = res.kills;
      document.getElementById("res-time").textContent = `${mins}:${secs}`;
      document.getElementById("res-score").textContent = res.score.toLocaleString();
      document.getElementById("res-reward").textContent = `+${earnedXp} XP / +${earnedCredits} ✦`;

      document.getElementById("res-level").textContent = this.saveData.level;
      document.getElementById("res-levelup-tag").classList.toggle("hidden", !leveledUp);
      const xpPct = Math.min(100, (this.saveData.xp / (this.saveData.level * 1000)) * 100);
      document.getElementById("res-xp-fill").style.width = `${xpPct}%`;

      this.showScreen("result");
    }

    _startMainLoop() {
      let lastTime = performance.now();

      const loop = now => {
        requestAnimationFrame(loop);
        const targetFps = this.saveData.settings.fps || 60;
        const minFrameMs = 1000 / targetFps;
        const deltaMs = now - lastTime;
        if (deltaMs < minFrameMs * 0.92) return;

        const dt = Math.min(0.05, deltaMs / 1000);
        lastTime = now;

        if (this.currentScreen === "gameplay") {
          this.game.update(dt, this.saveData.settings.sensitivity);
          this.engine.renderWorld(dt, this.game.world);
        } else {
          // Hangar 3D Render for Lobby, Hangar Selection, Garage, Missions, Settings
          if (this.autoSpin) {
            this.hangarCamera.orbitYaw += dt * 0.28;
          }
          const displayJetId =
            this.currentScreen === "hangar" ? this.previewJetId :
            this.currentScreen === "garage" ? this.garageJetId :
            this.saveData.selectedJet;
          const cfg = this.saveData.jetConfigs[displayJetId] || { livery: "tactical_gray" };

          this.engine.renderHangar(dt, {
            jetId: displayJetId,
            liveryId: cfg.livery,
            orbitYaw: this.hangarCamera.orbitYaw,
            orbitPitch: this.hangarCamera.orbitPitch,
            orbitDist: this.currentScreen === "hangar" ? 15.2 : 16.8,
            afterburnerTest: this.afterburnerTest
          });
        }
      };

      requestAnimationFrame(loop);
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.uiController = new UIController();
  });
})();
