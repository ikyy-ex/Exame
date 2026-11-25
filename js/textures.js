/* ==========================================================================
   SKY WARRIORS 3D — PROCEDURAL HD TEXTURE GENERATOR
   Generates metallic fuselage panel lines, camouflage, runway, hangar & terrain
   ========================================================================== */

window.TextureGenerator = {
  createAircraftTexture(gl, livery) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Base metallic fuselage coat
    ctx.fillStyle = livery.primary;
    ctx.fillRect(0, 0, 512, 512);

    // Tactical splinter camouflage polygons
    ctx.fillStyle = livery.secondary;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(220, 0);
    ctx.lineTo(310, 170);
    ctx.lineTo(80, 240);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(280, 260);
    ctx.lineTo(512, 210);
    ctx.lineTo(512, 430);
    ctx.lineTo(210, 470);
    ctx.closePath();
    ctx.fill();

    // Accent racing / squadron stripe
    ctx.fillStyle = livery.accent;
    ctx.fillRect(0, 244, 512, 16);

    // Aircraft panel grid lines & rivets
    ctx.strokeStyle = "rgba(10, 14, 20, 0.38)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Subtle metallic highlight sheen
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, "rgba(255,255,255,0.12)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.0)");
    grad.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Air Force Tactical Roundel Emblem
    ctx.save();
    ctx.translate(140, 140);
    ctx.strokeStyle = livery.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(14, 12);
    ctx.lineTo(0, 5);
    ctx.lineTo(-14, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    return this._uploadTexture(gl, canvas, true);
  },

  createHangarFloorTexture(gl) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Concrete base
    ctx.fillStyle = "#242b35";
    ctx.fillRect(0, 0, 512, 512);

    // Concrete expansion joints
    ctx.strokeStyle = "#141820";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }

    // Yellow tactical bay perimeter line
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 472, 472);

    // Subtle specular oil / polish variation
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)";
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 50, 0, Math.PI * 2);
      ctx.fill();
    }

    return this._uploadTexture(gl, canvas, true);
  },

  createRunwayTexture(gl) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Dark tarmac asphalt
    ctx.fillStyle = "#1e232b";
    ctx.fillRect(0, 0, 256, 512);

    // Side edge lines
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(14, 0, 6, 512);
    ctx.fillRect(236, 0, 6, 512);

    // Dashed centerline
    ctx.fillStyle = "#f8fafc";
    for (let y = 24; y < 512; y += 96) {
      ctx.fillRect(123, y, 10, 52);
    }

    // Threshold stripes
    for (let x = 32; x <= 212; x += 24) {
      ctx.fillRect(x, 12, 12, 46);
      ctx.fillRect(x, 454, 12, 46);
    }

    return this._uploadTexture(gl, canvas, true);
  },

  _uploadTexture(gl, canvas, repeat) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return tex;
  }
};
