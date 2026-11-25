/* ==========================================================================
   SKY WARRIORS 3D — FLIGHT PHYSICS, COMBAT AI, WEAPONS & TACTICAL HUD ENGINE
   ========================================================================== */

class FlightGameController {
  constructor(engine, sound) {
    this.engine = engine;
    this.sound = sound;

    this.active = false;
    this.paused = false;
    this.mode = "combat";
    this.campaignMission = null;

    this.world = {
      lighting: "sunset",
      cameraMode: "third",
      camDist: 13,
      shake: 0,
      player: {
        jetId: "f16",
        liveryId: "tactical_gray",
        pos: [0, 850, 800],
        yaw: 0,
        pitch: 0,
        roll: 0,
        speed: 320,
        maxSpeed: 600,
        turnRate: 1.95,
        throttle: 0.65,
        afterburner: false,
        hp: 100,
        maxHp: 100,
        missiles: 6,
        maxMissiles: 6,
        missileReloadTimer: 0,
        flares: 4,
        maxFlares: 4,
        flareActiveTimer: 0,
        rollManeuverTimer: 0,
        gunCooldown: 0
      },
      enemies: [],
      rings: [],
      missiles: [],
      particles: []
    };

    this.input = {
      stickX: 0,
      stickY: 0,
      pitchBtn: 0,
      firingGun: false,
      keys: {}
    };

    this.stats = {
      score: 0,
      kills: 0,
      elapsed: 0,
      wave: 1,
      ringsCleared: 0,
      totalRings: 0,
      targetKills: 4
    };

    this.lockedEnemy = null;
    this.lockProgress = 0;
    this.lastLockBeep = 0;
    this.lastWarnBeep = 0;
    this.trailTimer = 0;
    this.radarAngle = 0;

    this.onMissionComplete = null;
    this._bindInputs();
  }

  _bindInputs() {
    // Keyboard controls for PC / Bluetooth Keyboard
    window.addEventListener("keydown", e => {
      this.input.keys[e.code] = true;
      if (!this.active || this.paused) return;
      if (e.code === "KeyE" || e.code === "Enter") this.fireMissile();
      if (e.code === "KeyF") this.deployFlare();
      if (e.code === "KeyQ" || e.code === "KeyR") this.triggerManeuver();
      if (e.code === "KeyC") this.cycleCamera();
      if (e.code === "Escape" || e.code === "KeyP") {
        if (window.uiController) window.uiController.togglePause();
      }
    });
    window.addEventListener("keyup", e => {
      this.input.keys[e.code] = false;
    });

    // Virtual Analog Joystick (Multi-touch enabled)
    const joyZone = document.getElementById("joystick-zone");
    const joyKnob = document.getElementById("joystick-knob");
    let joyTouchId = null;

    const updateStick = (clientX, clientY) => {
      const rect = joyZone.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const maxR = rect.width * 0.38;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.stickX = dx / maxR;
      this.input.stickY = dy / maxR;
    };

    const resetStick = () => {
      joyTouchId = null;
      joyKnob.style.transform = "translate(0px, 0px)";
      this.input.stickX = 0;
      this.input.stickY = 0;
    };

    joyZone.addEventListener("touchstart", e => {
      e.preventDefault();
      if (joyTouchId === null && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        joyTouchId = t.identifier;
        updateStick(t.clientX, t.clientY);
      }
    }, { passive: false });

    joyZone.addEventListener("touchmove", e => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joyTouchId) {
          updateStick(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    joyZone.addEventListener("touchend", e => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) {
          resetStick();
          break;
        }
      }
    });
    joyZone.addEventListener("touchcancel", resetStick);

    // Mouse fallback for testing joystick on desktop
    let mouseDown = false;
    joyZone.addEventListener("mousedown", e => { mouseDown = true; updateStick(e.clientX, e.clientY); });
    window.addEventListener("mousemove", e => { if (mouseDown) updateStick(e.clientX, e.clientY); });
    window.addEventListener("mouseup", () => { if (mouseDown) { mouseDown = false; resetStick(); } });

    // Throttle Slider & Step Buttons
    const thrSlider = document.getElementById("touch-throttle");
    const syncThrottle = val => {
      const clamped = Math.max(20, Math.min(100, Number(val)));
      thrSlider.value = clamped;
      this.world.player.throttle = clamped / 100;
      document.getElementById("hud-throttle-pct").textContent = `${clamped}%`;
    };
    thrSlider.addEventListener("input", e => syncThrottle(e.target.value));
    document.getElementById("btn-thr-up").addEventListener("click", () => syncThrottle(Number(thrSlider.value) + 15));
    document.getElementById("btn-thr-down").addEventListener("click", () => syncThrottle(Number(thrSlider.value) - 15));

    // Pitch Up / Down Hold Buttons
    const bindHoldBtn = (id, onStart, onEnd) => {
      const el = document.getElementById(id);
      el.addEventListener("touchstart", e => { e.preventDefault(); onStart(); }, { passive: false });
      el.addEventListener("touchend", e => { e.preventDefault(); onEnd(); });
      el.addEventListener("touchcancel", onEnd);
      el.addEventListener("mousedown", onStart);
      el.addEventListener("mouseup", onEnd);
      el.addEventListener("mouseleave", onEnd);
    };

    bindHoldBtn("btn-pitch-up", () => { this.input.pitchBtn = 1; }, () => { this.input.pitchBtn = 0; });
    bindHoldBtn("btn-pitch-down", () => { this.input.pitchBtn = -1; }, () => { this.input.pitchBtn = 0; });
    bindHoldBtn("btn-fire-gun", () => { this.input.firingGun = true; }, () => { this.input.firingGun = false; });

    document.getElementById("btn-missile").addEventListener("click", () => this.fireMissile());
    document.getElementById("btn-flare").addEventListener("click", () => this.deployFlare());
    document.getElementById("btn-maneuver").addEventListener("click", () => this.triggerManeuver());
    document.getElementById("btn-hud-camera").addEventListener("click", () => this.cycleCamera());
  }

  startSession(options) {
    const jet = window.GAME_DATA.aircraft.find(a => a.id === options.jetId) || window.GAME_DATA.aircraft[0];
    const upg = options.upgrades || { engine: 0, armor: 0, weapons: 0 };

    const speedBonus = 1 + upg.engine * 0.05;
    const hpBonus = 1 + upg.armor * 0.1;
    const extraMissiles = Math.floor(upg.weapons / 2);

    this.mode = options.mode || "combat";
    this.campaignMission = options.campaignMission || null;

    this.world.lighting = options.lighting || "sunset";
    this.world.cameraMode = options.cameraMode || "third";
    this.world.camDist = options.camDist || 13;
    this.world.shake = 0;

    const p = this.world.player;
    p.jetId = jet.id;
    p.liveryId = options.liveryId || "tactical_gray";
    p.pos = [0, 750, 950];
    p.yaw = 0;
    p.pitch = 0.03;
    p.roll = 0;
    p.maxSpeed = jet.maxSpeed * speedBonus;
    p.turnRate = jet.turnRate * (1 + upg.engine * 0.02);
    p.throttle = 0.68;
    p.speed = p.maxSpeed * 0.68;
    p.maxHp = Math.round(jet.maxHp * hpBonus);
    p.hp = p.maxHp;
    p.maxMissiles = jet.missiles + extraMissiles;
    p.missiles = p.maxMissiles;
    p.missileReloadTimer = 0;
    p.maxFlares = jet.flares;
    p.flares = p.maxFlares;
    p.flareActiveTimer = 0;
    p.rollManeuverTimer = 0;

    document.getElementById("touch-throttle").value = 68;
    document.getElementById("hud-throttle-pct").textContent = "68%";

    this.world.enemies = [];
    this.world.rings = [];
    this.world.missiles = [];
    this.world.particles = [];

    this.stats = {
      score: 0,
      kills: 0,
      elapsed: 0,
      wave: 1,
      ringsCleared: 0,
      totalRings: 0,
      targetKills: 0
    };

    this.lockedEnemy = null;
    this.lockProgress = 0;

    // Populate mode-specific entities
    if (this.mode === "free") {
      this._spawnRings(4, false);
      this.setAwacs("FREE FLIGHT AUTHORIZED. ENJOY THE SKIES OVER GARUDA ARCHIPELAGO.");
    } else if (this.mode === "training") {
      this._spawnRings(6, true);
      this._spawnEnemies(2, true);
      this.stats.totalRings = 6;
      this.stats.targetKills = 2;
      this.setAwacs("CADET TRAINING: FLY THROUGH ALL 6 WAYPOINT RINGS AND DESTROY 2 TARGET DRONES.");
    } else if (this.mode === "combat") {
      this._spawnEnemies(4, false);
      this.stats.targetKills = 4;
      this.setAwacs("BANDITS ON RADAR! ENGAGE AND DESTROY ALL 4 HOSTILE FIGHTERS.");
    } else if (this.mode === "mission" && this.campaignMission) {
      const m = this.campaignMission;
      this.world.lighting = m.lighting || "sunset";
      if (m.rings > 0) {
        this._spawnRings(m.rings, true);
        this.stats.totalRings = m.rings;
      }
      this._spawnEnemies(m.enemies, false);
      this.stats.targetKills = m.enemies;
      this.setAwacs(`${m.code}: ${m.title_en} — WEAPONS FREE!`);
    } else if (this.mode === "survival") {
      this.stats.wave = 1;
      this._spawnEnemies(2, false);
      this.stats.targetKills = 999;
      this.setAwacs("SURVIVAL WAVE 1 INBOUND! HOLD THE AIRSPACE AS LONG AS POSSIBLE.");
    }

    this._syncCameraUI();
    this.active = true;
    this.paused = false;
  }

  _spawnRings(count, required) {
    for (let i = 0; i < count; i++) {
      const angle = (i - (count - 1) * 0.5) * 0.28;
      const dist = 1200 + i * 1150;
      this.world.rings.push({
        pos: [Math.sin(angle) * dist, 550 + (i % 3) * 220, 950 - Math.cos(angle) * dist],
        yaw: angle,
        passed: false,
        required
      });
    }
  }

  _spawnEnemies(count, isDrone) {
    const shapes = ["su57", "f22", "typhoon", "f16"];
    for (let i = 0; i < count; i++) {
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + 0.4;
      const dist = 2600 + i * 650;
      this.world.enemies.push({
        id: "EN-" + (i + 1),
        shape: isDrone ? "f16" : shapes[i % shapes.length],
        pos: [Math.sin(ang) * dist, 750 + (i % 4) * 240, -1200 + Math.cos(ang) * dist],
        yaw: ang + Math.PI,
        pitch: 0,
        roll: 0,
        speed: isDrone ? 165 : (265 + Math.random() * 65),
        hp: isDrone ? 45 : 85,
        maxHp: isDrone ? 45 : 85,
        alive: true,
        isDrone,
        fireCooldown: 2.5 + Math.random() * 2.5,
        missileCooldown: 8 + Math.random() * 6
      });
    }
  }

  setAwacs(msg) {
    const el = document.getElementById("awacs-text");
    if (el) el.textContent = msg;
  }

  cycleCamera() {
    const order = ["third", "first", "cinematic"];
    const idx = order.indexOf(this.world.cameraMode);
    this.world.cameraMode = order[(idx + 1) % order.length];
    this.sound.playSfx("click");
    this._syncCameraUI();
  }

  _syncCameraUI() {
    const badge = document.getElementById("hud-cam-indicator");
    const cockpit = document.getElementById("cockpit-overlay");
    if (this.world.cameraMode === "first") {
      badge.textContent = "CAM: COCKPIT HUD";
      cockpit.classList.remove("hidden");
    } else if (this.world.cameraMode === "cinematic") {
      badge.textContent = "CAM: CINEMATIC";
      cockpit.classList.add("hidden");
    } else {
      badge.textContent = "CAM: 3RD PERSON";
      cockpit.classList.add("hidden");
    }
  }

  triggerManeuver() {
    const p = this.world.player;
    if (p.rollManeuverTimer <= 0) {
      p.rollManeuverTimer = 0.65;
      this.sound.playSfx("maneuver");
      this.setAwacs("EVASIVE BARREL ROLL EXECUTED!");
    }
  }

  deployFlare() {
    const p = this.world.player;
    if (p.flares <= 0) return;
    p.flares--;
    p.flareActiveTimer = 3.2;
    this.sound.playSfx("flare");

    // Spawn 6 bright burning decoy flares behind jet
    for (let i = 0; i < 6; i++) {
      this.world.particles.push({
        pos: [
          p.pos[0] + (Math.random() - 0.5) * 14,
          p.pos[1] - 3 - Math.random() * 6,
          p.pos[2] + (Math.random() - 0.5) * 14
        ],
        vel: [(Math.random() - 0.5) * 35, -18 - Math.random() * 15, (Math.random() - 0.5) * 35],
        size: 3.4,
        color: [1.0, 0.92, 0.5],
        emissive: [1.0, 0.75, 0.2],
        life: 2.6
      });
    }
    this.setAwacs("COUNTERMEASURE FLARES DEPLOYED!");
  }

  fireMissile() {
    const p = this.world.player;
    if (p.missiles <= 0) {
      this.sound.playSfx("warning");
      return;
    }
    p.missiles--;
    this.sound.playSfx("missile");

    const fwd = this._getForwardVector(p.yaw, p.pitch);
    this.world.missiles.push({
      fromPlayer: true,
      pos: [p.pos[0] + fwd[0] * 8, p.pos[1] - 1.2, p.pos[2] + fwd[2] * 8],
      yaw: p.yaw,
      pitch: p.pitch,
      speed: p.speed + 360,
      target: this.lockedEnemy && this.lockedEnemy.alive ? this.lockedEnemy : null,
      life: 6.5
    });
  }

  _fireGunBullet() {
    const p = this.world.player;
    const fwd = this._getForwardVector(p.yaw, p.pitch);
    this.sound.playSfx("gun");

    this.world.particles.push({
      isBullet: true,
      fromPlayer: true,
      pos: [p.pos[0] + fwd[0] * 10, p.pos[1] + fwd[1] * 10, p.pos[2] + fwd[2] * 10],
      vel: [fwd[0] * 1350, fwd[1] * 1350, fwd[2] * 1350],
      size: 1.5,
      color: [1.0, 0.85, 0.25],
      emissive: [1.0, 0.75, 0.15],
      life: 1.4
    });
  }

  _getForwardVector(yaw, pitch) {
    const cp = Math.cos(pitch);
    return [
      -Math.sin(yaw) * cp,
      Math.sin(pitch),
      -Math.cos(yaw) * cp
    ];
  }

  _spawnExplosion(pos, scale = 1.0) {
    this.sound.playSfx("explosion");
    this.world.shake = Math.max(this.world.shake, 1.8 * scale);
    for (let i = 0; i < 16; i++) {
      const isSmoke = i > 10;
      this.world.particles.push({
        pos: [
          pos[0] + (Math.random() - 0.5) * 18 * scale,
          pos[1] + (Math.random() - 0.5) * 18 * scale,
          pos[2] + (Math.random() - 0.5) * 18 * scale
        ],
        vel: [
          (Math.random() - 0.5) * 85 * scale,
          (Math.random() - 0.3) * 85 * scale,
          (Math.random() - 0.5) * 85 * scale
        ],
        size: (isSmoke ? 16 : 11) * scale,
        color: isSmoke ? [0.18, 0.18, 0.20] : [1.0, 0.55, 0.12],
        emissive: isSmoke ? [0, 0, 0] : [1.0, 0.45, 0.08],
        life: isSmoke ? 2.2 : 1.1
      });
    }
  }

  update(dt, sensitivity = 1.0) {
    if (!this.active || this.paused) {
      this.sound.updateFlightAudio(0, false, false);
      return;
    }

    this.stats.elapsed += dt;
    this.radarAngle = (this.radarAngle + dt * 2.6) % (Math.PI * 2);
    if (this.world.shake > 0) this.world.shake = Math.max(0, this.world.shake - dt * 5);

    const p = this.world.player;
    const keys = this.input.keys;

    // Keyboard throttle adjustments
    if (keys["ShiftLeft"] || keys["ShiftRight"]) {
      p.throttle = Math.min(1.0, p.throttle + dt * 0.45);
      const pct = Math.round(p.throttle * 100);
      document.getElementById("touch-throttle").value = pct;
      document.getElementById("hud-throttle-pct").textContent = `${pct}%`;
    }
    if (keys["ControlLeft"] || keys["ControlRight"]) {
      p.throttle = Math.max(0.2, p.throttle - dt * 0.45);
      const pct = Math.round(p.throttle * 100);
      document.getElementById("touch-throttle").value = pct;
      document.getElementById("hud-throttle-pct").textContent = `${pct}%`;
    }

    // Combine Joystick + Pitch Buttons + Keyboard
    let steerX = this.input.stickX;
    let steerY = -this.input.stickY + this.input.pitchBtn;
    if (keys["KeyA"] || keys["ArrowLeft"]) steerX -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) steerX += 1;
    if (keys["KeyW"] || keys["ArrowUp"]) steerY -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) steerY += 1;

    steerX = Math.max(-1, Math.min(1, steerX));
    steerY = Math.max(-1, Math.min(1, steerY));

    // Speed & Afterburner
    p.afterburner = p.throttle >= 0.90;
    const targetSpeed = (145 + p.throttle * (p.maxSpeed - 145)) * (p.afterburner ? 1.14 : 1.0);
    p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 2.2);

    this.sound.updateFlightAudio(p.throttle, p.afterburner, true);

    // Pitch & Roll Banking Dynamics
    const sens = sensitivity;
    p.pitch += steerY * p.turnRate * 0.72 * sens * dt;
    p.pitch = Math.max(-1.25, Math.min(1.25, p.pitch));

    if (p.rollManeuverTimer > 0) {
      p.rollManeuverTimer -= dt;
      p.roll += dt * 9.8;
    } else {
      const targetRoll = -steerX * 1.18;
      p.roll += (targetRoll - p.roll) * Math.min(1, dt * 5.5);
    }

    // Coordinated Turn (Roll + Direct Yaw Steering)
    p.yaw -= (steerX * 0.85 - Math.sin(p.roll) * 0.65) * p.turnRate * sens * dt;

    // Move Player Jet
    const fwd = this._getForwardVector(p.yaw, p.pitch);
    p.pos[0] += fwd[0] * p.speed * dt;
    p.pos[1] += fwd[1] * p.speed * dt;
    p.pos[2] += fwd[2] * p.speed * dt;

    // Soft Combat Boundary Guard (20km radius)
    const distFromOrigin = Math.hypot(p.pos[0], p.pos[2]);
    if (distFromOrigin > 19500) {
      const toCenterYaw = Math.atan2(-p.pos[0], -p.pos[2]);
      p.yaw += Math.sin(toCenterYaw - p.yaw) * dt * 1.5;
      this.setAwacs("RETURNING TO COMBAT AIRSPACE BOUNDARY.");
    }

    // Altitude Ceiling & Sea Level Protection
    if (p.pos[1] > 8500) {
      p.pos[1] = 8500;
      p.pitch = Math.min(p.pitch, 0);
    }

    const warnBanner = document.getElementById("hud-warning-alert");
    let incomingMissile = this.world.missiles.some(m => !m.fromPlayer);

    if (p.pos[1] < 55) {
      warnBanner.textContent = "⚠ PULL UP — ALTITUDE LOW";
      warnBanner.classList.remove("hidden");
      if (this.stats.elapsed - this.lastWarnBeep > 0.6) {
        this.sound.playSfx("warning");
        this.lastWarnBeep = this.stats.elapsed;
      }
      if (p.pos[1] < 6) {
        // Sea impact check
        if (p.pitch < -0.35) {
          this._finishGame(false);
          return;
        } else {
          p.pos[1] = 8;
          p.pitch = Math.max(0.08, p.pitch);
        }
      }
    } else if (incomingMissile && p.flareActiveTimer <= 0) {
      warnBanner.textContent = "⚠ MISSILE LOCK ALERT — DEPLOY FLARES!";
      warnBanner.classList.remove("hidden");
      if (this.stats.elapsed - this.lastWarnBeep > 0.5) {
        this.sound.playSfx("warning");
        this.lastWarnBeep = this.stats.elapsed;
      }
    } else {
      warnBanner.classList.add("hidden");
    }

    if (p.flareActiveTimer > 0) p.flareActiveTimer -= dt;

    // Auto-reload missiles slowly so player always has tactical options
    if (p.missiles < p.maxMissiles) {
      p.missileReloadTimer += dt;
      if (p.missileReloadTimer >= 11) {
        p.missiles++;
        p.missileReloadTimer = 0;
      }
    }

    // Vulcan Gun Firing
    if (p.gunCooldown > 0) p.gunCooldown -= dt;
    if ((this.input.firingGun || keys["Space"]) && p.gunCooldown <= 0) {
      this._fireGunBullet();
      p.gunCooldown = 0.085;
    }

    // Wingtip Contrails
    this.trailTimer += dt;
    if (this.trailTimer >= 0.05) {
      this.trailTimer = 0;
      const right = [Math.cos(p.yaw), 0, -Math.sin(p.yaw)];
      [-5.2, 5.2].forEach(wingSpan => {
        this.world.particles.push({
          pos: [p.pos[0] + right[0] * wingSpan, p.pos[1], p.pos[2] + right[2] * wingSpan],
          vel: [0, 0, 0],
          size: p.afterburner ? 1.3 : 0.75,
          color: [0.92, 0.95, 1.0],
          emissive: [0.35, 0.38, 0.42],
          life: 0.55
        });
      });
    }

    // Update Waypoint Rings
    this.world.rings.forEach(ring => {
      if (ring.passed) return;
      const d = Math.hypot(p.pos[0] - ring.pos[0], p.pos[1] - ring.pos[1], p.pos[2] - ring.pos[2]);
      if (d < 46) {
        ring.passed = true;
        this.stats.ringsCleared++;
        this.stats.score += 250;
        this.sound.playSfx("ring");
        this.setAwacs(`WAYPOINT RING CLEARED! (${this.stats.ringsCleared}/${this.world.rings.length})`);
      }
    });

    // Update Enemy AI Jets & Radar Lock-On
    let bestTarget = null;
    let bestScore = Infinity;

    this.world.enemies.forEach(en => {
      if (!en.alive) return;

      const dx = p.pos[0] - en.pos[0];
      const dy = p.pos[1] - en.pos[1];
      const dz = p.pos[2] - en.pos[2];
      const dist = Math.hypot(dx, dy, dz) || 1;

      if (!en.isDrone) {
        // AI pursues player smoothly
        const desiredYaw = Math.atan2(-dx, -dz);
        const yawDiff = Math.atan2(Math.sin(desiredYaw - en.yaw), Math.cos(desiredYaw - en.yaw));
        en.yaw += Math.max(-1, Math.min(1, yawDiff)) * 0.95 * dt;
        en.roll = -Math.max(-1, Math.min(1, yawDiff)) * 0.85;

        const desiredPitch = Math.max(-0.55, Math.min(0.55, Math.asin(Math.max(-1, Math.min(1, dy / dist)))));
        en.pitch += (desiredPitch - en.pitch) * dt * 1.1;

        // AI fires at player when within range & forward cone
        en.fireCooldown -= dt;
        en.missileCooldown -= dt;
        const eFwd = this._getForwardVector(en.yaw, en.pitch);
        const align = (eFwd[0] * dx + eFwd[1] * dy + eFwd[2] * dz) / dist;

        if (dist < 2200 && align > 0.85 && en.fireCooldown <= 0) {
          en.fireCooldown = 2.4 + Math.random() * 1.5;
          if (p.rollManeuverTimer <= 0 && Math.random() < 0.45) {
            this._damagePlayer(6);
          }
        }
        if (dist < 3200 && dist > 900 && align > 0.9 && en.missileCooldown <= 0) {
          en.missileCooldown = 14 + Math.random() * 6;
          this.world.missiles.push({
            fromPlayer: false,
            pos: [en.pos[0] + eFwd[0] * 10, en.pos[1], en.pos[2] + eFwd[2] * 10],
            yaw: en.yaw,
            pitch: en.pitch,
            speed: 440,
            target: p,
            life: 5.5
          });
        }
      } else {
        // Training drone gentle orbit
        en.yaw += dt * 0.25;
      }

      const eFwd = this._getForwardVector(en.yaw, en.pitch);
      en.pos[0] += eFwd[0] * en.speed * dt;
      en.pos[1] = Math.max(180, en.pos[1] + eFwd[1] * en.speed * dt);
      en.pos[2] += eFwd[2] * en.speed * dt;

      // Check if enemy is in player's forward lock cone
      const toEnemy = [-dx / dist, -dy / dist, -dz / dist];
      const dotFwd = fwd[0] * toEnemy[0] + fwd[1] * toEnemy[1] + fwd[2] * toEnemy[2];
      if (dotFwd > 0.72 && dist < 5500) {
        const score = dist * (1.2 - dotFwd);
        if (score < bestScore) {
          bestScore = score;
          bestTarget = en;
        }
      }
    });

    if (bestTarget) {
      if (this.lockedEnemy !== bestTarget) {
        this.lockedEnemy = bestTarget;
        this.lockProgress = 0;
      }
      this.lockProgress = Math.min(1, this.lockProgress + dt * 1.6);
      if (this.lockProgress >= 1 && this.stats.elapsed - this.lastLockBeep > 0.45) {
        this.sound.playSfx("lock");
        this.lastLockBeep = this.stats.elapsed;
      }
    } else {
      this.lockedEnemy = null;
      this.lockProgress = 0;
    }

    // Update Missiles
    for (let i = this.world.missiles.length - 1; i >= 0; i--) {
      const m = this.world.missiles[i];
      m.life -= dt;
      if (m.life <= 0) {
        this.world.missiles.splice(i, 1);
        continue;
      }

      // Homing guidance
      if (m.target && (m.fromPlayer ? m.target.alive : true)) {
        // Enemy missiles lose lock if player deployed flares or is mid barrel-roll!
        if (!m.fromPlayer && (p.flareActiveTimer > 0 || p.rollManeuverTimer > 0)) {
          m.target = null;
        } else {
          const tPos = m.target.pos;
          const dx = tPos[0] - m.pos[0];
          const dy = tPos[1] - m.pos[1];
          const dz = tPos[2] - m.pos[2];
          const dist = Math.hypot(dx, dy, dz) || 1;
          const dYaw = Math.atan2(-dx, -dz);
          const dPitch = Math.asin(Math.max(-1, Math.min(1, dy / dist)));
          const turnGain = m.fromPlayer ? 3.8 : 2.1;
          m.yaw += Math.atan2(Math.sin(dYaw - m.yaw), Math.cos(dYaw - m.yaw)) * Math.min(1, dt * turnGain);
          m.pitch += (dPitch - m.pitch) * Math.min(1, dt * turnGain);
        }
      }

      const mFwd = this._getForwardVector(m.yaw, m.pitch);
      m.pos[0] += mFwd[0] * m.speed * dt;
      m.pos[1] += mFwd[1] * m.speed * dt;
      m.pos[2] += mFwd[2] * m.speed * dt;

      // Smoke trail
      this.world.particles.push({
        pos: [m.pos[0], m.pos[1], m.pos[2]],
        vel: [0, 0, 0],
        size: 1.8,
        color: [0.9, 0.9, 0.92],
        emissive: [0.3, 0.3, 0.3],
        life: 0.75
      });

      // Hit Detection
      if (m.fromPlayer) {
        for (const en of this.world.enemies) {
          if (!en.alive) continue;
          const d = Math.hypot(m.pos[0] - en.pos[0], m.pos[1] - en.pos[1], m.pos[2] - en.pos[2]);
          if (d < 34) {
            this._damageEnemy(en, 95);
            this._spawnExplosion(m.pos, 0.85);
            this.world.missiles.splice(i, 1);
            break;
          }
        }
      } else {
        const d = Math.hypot(m.pos[0] - p.pos[0], m.pos[1] - p.pos[1], m.pos[2] - p.pos[2]);
        if (d < 22) {
          this._damagePlayer(24);
          this._spawnExplosion(m.pos, 0.7);
          this.world.missiles.splice(i, 1);
        }
      }
    }

    // Update Particles & Bullets
    for (let i = this.world.particles.length - 1; i >= 0; i--) {
      const pt = this.world.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.world.particles.splice(i, 1);
        continue;
      }
      pt.pos[0] += pt.vel[0] * dt;
      pt.pos[1] += pt.vel[1] * dt;
      pt.pos[2] += pt.vel[2] * dt;

      if (pt.isBullet && pt.fromPlayer) {
        for (const en of this.world.enemies) {
          if (!en.alive) continue;
          const d = Math.hypot(pt.pos[0] - en.pos[0], pt.pos[1] - en.pos[1], pt.pos[2] - en.pos[2]);
          if (d < 28) {
            this._damageEnemy(en, 16);
            pt.life = 0;
            this.world.particles.push({
              pos: [...en.pos],
              vel: [0, 10, 0],
              size: 4.5,
              color: [1, 0.7, 0.2],
              emissive: [1, 0.6, 0.1],
              life: 0.22
            });
            break;
          }
        }
      }
    }

    this._checkMissionState();
    this._updateHUD();
  }

  _damageEnemy(en, dmg) {
    en.hp -= dmg;
    this.stats.score += 50;
    if (en.hp <= 0 && en.alive) {
      en.alive = false;
      this.stats.kills++;
      this.stats.score += en.isDrone ? 400 : 1000;
      this._spawnExplosion(en.pos, 1.45);
      this.setAwacs(`SPLASH ONE! HOSTILE ${en.id} DESTROYED!`);
    }
  }

  _damagePlayer(dmg) {
    const p = this.world.player;
    p.hp = Math.max(0, p.hp - dmg);
    this.sound.playSfx("hit");
    this.world.shake = 1.4;

    const vig = document.getElementById("damage-vignette");
    vig.classList.add("hit");
    setTimeout(() => vig.classList.remove("hit"), 220);

    if (p.hp <= 0) {
      this._spawnExplosion(p.pos, 1.5);
      this._finishGame(false);
    }
  }

  _checkMissionState() {
    if (this.mode === "free") return;

    const aliveEnemies = this.world.enemies.filter(e => e.alive).length;
    const remainingRings = this.world.rings.filter(r => r.required && !r.passed).length;

    if (this.mode === "survival") {
      if (aliveEnemies === 0) {
        this.stats.wave++;
        this.stats.score += 750;
        const p = this.world.player;
        p.hp = Math.min(p.maxHp, p.hp + 25);
        p.missiles = p.maxMissiles;
        this._spawnEnemies(Math.min(7, 1 + this.stats.wave), false);
        this.setAwacs(`WAVE ${this.stats.wave} INCOMING! HULL REPAIRED +25%.`);
      }
      return;
    }

    if (aliveEnemies === 0 && remainingRings === 0) {
      this._finishGame(true);
    }
  }

  _finishGame(victory) {
    this.active = false;
    this.sound.updateFlightAudio(0, false, false);
    if (this.onMissionComplete) {
      this.onMissionComplete({
        victory,
        mode: this.mode,
        mission: this.campaignMission,
        kills: this.stats.kills,
        score: this.stats.score,
        elapsed: this.stats.elapsed
      });
    }
  }

  _updateHUD() {
    const p = this.world.player;

    // Speed & Altitude
    const kmh = Math.round(p.speed * 3.6);
    const mach = (kmh / 1235).toFixed(2);
    document.getElementById("hud-speed").textContent = kmh;
    document.getElementById("hud-mach").textContent = `MACH ${mach}`;
    document.getElementById("hud-alt").textContent = Math.max(0, Math.round(p.pos[1]));

    // Heading Compass
    let deg = Math.round(((-p.yaw * 180) / Math.PI) % 360);
    if (deg < 0) deg += 360;
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const dirLabel = dirs[Math.round(deg / 45) % 8];
    document.getElementById("hud-heading-dir").textContent = dirLabel;
    document.getElementById("hud-heading-deg").textContent = String(deg).padStart(3, "0") + "°";

    // Score & Objective
    document.getElementById("hud-score").textContent = this.stats.score.toLocaleString();
    document.getElementById("hud-mode-tag").textContent = this.mode.toUpperCase();

    const aliveEnemies = this.world.enemies.filter(e => e.alive).length;
    if (this.mode === "free") {
      document.getElementById("hud-objective").textContent = "FREE FLIGHT — OPEN AIRSPACE";
    } else if (this.mode === "survival") {
      document.getElementById("hud-objective").textContent = `WAVE ${this.stats.wave} • KILLS: ${this.stats.kills}`;
    } else if (this.stats.totalRings > 0) {
      document.getElementById("hud-objective").textContent =
        `RINGS: ${this.stats.ringsCleared}/${this.stats.totalRings} • HOSTILES: ${aliveEnemies}`;
    } else {
      document.getElementById("hud-objective").textContent =
        `HOSTILES REMAINING: ${aliveEnemies}`;
    }

    // Weapons & Hull
    document.getElementById("hud-msl-count").textContent = `${p.missiles} / ${p.maxMissiles}`;
    document.getElementById("hud-flr-count").textContent = `${p.flares} / ${p.maxFlares}`;
    const hullPct = Math.round((p.hp / p.maxHp) * 100);
    const hullText = document.getElementById("hud-hull-pct");
    const hullBar = document.getElementById("hud-hull-bar");
    hullText.textContent = `${hullPct}%`;
    hullBar.style.width = `${hullPct}%`;
    hullBar.style.backgroundColor = hullPct > 50 ? "#4ade80" : (hullPct > 25 ? "#fbbf24" : "#ef4444");

    // Center Lock Circle
    const lockCircle = document.getElementById("lock-circle");
    if (this.lockedEnemy) {
      lockCircle.classList.remove("hidden");
      document.getElementById("lock-status-text").textContent =
        this.lockProgress >= 1 ? "LOCKED" : "LOCKING";
    } else {
      lockCircle.classList.add("hidden");
    }

    // Project 3D Target Reticles on Screen
    this._renderTargetMarkers();
    // Draw Circular Mini Radar
    this._drawRadar();
  }

  _renderTargetMarkers() {
    const layer = document.getElementById("target-markers-layer");
    layer.innerHTML = "";
    const p = this.world.player;

    // Enemy Jet Markers
    this.world.enemies.forEach(en => {
      if (!en.alive) return;
      const proj = this.engine.projectToScreen(en.pos);
      if (!proj || !proj.inFront) return;
      if (proj.x < 10 || proj.x > window.innerWidth - 10 || proj.y < 10 || proj.y > window.innerHeight - 10) return;

      const distKm = (Math.hypot(en.pos[0] - p.pos[0], en.pos[1] - p.pos[1], en.pos[2] - p.pos[2]) / 1000).toFixed(1);
      const isLocked = this.lockedEnemy === en && this.lockProgress >= 1;

      const box = document.createElement("div");
      box.className = "target-box" + (isLocked ? " locked" : "");
      box.style.left = `${proj.x}px`;
      box.style.top = `${proj.y}px`;
      box.innerHTML = `<div class="target-label">${en.id} [${distKm}km]</div>`;
      layer.appendChild(box);
    });

    // Waypoint Ring Markers
    this.world.rings.forEach((ring, idx) => {
      if (ring.passed) return;
      const proj = this.engine.projectToScreen(ring.pos);
      if (!proj || !proj.inFront) return;
      if (proj.x < 10 || proj.x > window.innerWidth - 10 || proj.y < 10 || proj.y > window.innerHeight - 10) return;

      const distM = Math.round(Math.hypot(ring.pos[0] - p.pos[0], ring.pos[1] - p.pos[1], ring.pos[2] - p.pos[2]));
      const box = document.createElement("div");
      box.className = "target-box ring";
      box.style.left = `${proj.x}px`;
      box.style.top = `${proj.y}px`;
      box.innerHTML = `<div class="target-label">WP-${idx + 1} [${distM}m]</div>`;
      layer.appendChild(box);
    });
  }

  _drawRadar() {
    const canvas = document.getElementById("radar-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = w * 0.46;

    ctx.clearRect(0, 0, w, h);

    // Range Rings & Crosshair
    ctx.strokeStyle = "rgba(74, 222, 128, 0.28)";
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(scale => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Rotating Radar Sweep Beam
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.radarAngle);
    const grad = ctx.createLinearGradient(0, 0, r, 0);
    grad.addColorStop(0, "rgba(74, 222, 128, 0.35)");
    grad.addColorStop(1, "rgba(74, 222, 128, 0.0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -0.35, 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const p = this.world.player;
    const maxRange = 12000;
    const cosY = Math.cos(p.yaw);
    const sinY = Math.sin(p.yaw);

    // Enemy Blips (Red)
    this.world.enemies.forEach(en => {
      if (!en.alive) return;
      const dx = en.pos[0] - p.pos[0];
      const dz = en.pos[2] - p.pos[2];
      // Rotate into player-up coordinates
      const rx = dx * cosY - dz * sinY;
      const rz = dx * sinY + dz * cosY;
      const nx = Math.max(-1, Math.min(1, rx / maxRange));
      const nz = Math.max(-1, Math.min(1, rz / maxRange));

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(cx + nx * r, cy + nz * r, 3.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Waypoint Ring Blips (Cyan)
    this.world.rings.forEach(ring => {
      if (ring.passed) return;
      const dx = ring.pos[0] - p.pos[0];
      const dz = ring.pos[2] - p.pos[2];
      const rx = dx * cosY - dz * sinY;
      const rz = dx * sinY + dz * cosY;
      const nx = Math.max(-1, Math.min(1, rx / maxRange));
      const nz = Math.max(-1, Math.min(1, rz / maxRange));

      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(cx + nx * r, cy + nz * r, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player Center Triangle
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4.5, cy + 5);
    ctx.lineTo(cx - 4.5, cy + 5);
    ctx.closePath();
    ctx.fill();
  }
}

window.FlightGameController = FlightGameController;
