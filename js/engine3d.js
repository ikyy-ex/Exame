/* ==========================================================================
   SKY WARRIORS 3D — CUSTOM HIGH-PERFORMANCE WEBGL 3D ENGINE
   Supports HD/Full HD, 5 Detailed Fighter Jet 3D Models, 3D Military Hangar,
   Animated Ocean, Islands, Mountains, Airbase Runway, Clouds & Explosions
   ========================================================================== */

(function () {
  // ---------------- MATRIX & VECTOR MATH ----------------
  const Mat4 = {
    create() {
      const m = new Float32Array(16);
      m[0] = m[5] = m[10] = m[15] = 1;
      return m;
    },
    identity(out) {
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      return out;
    },
    multiply(out, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

      let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
      out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
      out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
      out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

      b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
      out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return out;
    },
    perspective(out, fovy, aspect, near, far) {
      const f = 1.0 / Math.tan(fovy / 2);
      out.fill(0);
      out[0] = f / aspect;
      out[5] = f;
      out[11] = -1;
      const nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
      return out;
    },
    lookAt(out, eye, center, up) {
      let zx = eye[0] - center[0];
      let zy = eye[1] - center[1];
      let zz = eye[2] - center[2];
      let len = Math.hypot(zx, zy, zz) || 1;
      zx /= len; zy /= len; zz /= len;

      let xx = up[1] * zz - up[2] * zy;
      let xy = up[2] * zx - up[0] * zz;
      let xz = up[0] * zy - up[1] * zx;
      len = Math.hypot(xx, xy, xz);
      if (len === 0) { xx = 1; xy = 0; xz = 0; }
      else { xx /= len; xy /= len; xz /= len; }

      const yx = zy * xz - zz * xy;
      const yy = zz * xx - zx * xz;
      const yz = zx * xy - zy * xx;

      out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
      out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
      out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
      out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
      out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
      out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
      out[15] = 1;
      return out;
    },
    compose(out, pos, yaw, pitch, roll, scale = 1) {
      // Yaw around Y, Pitch around X, Roll around Z
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const cr = Math.cos(roll), sr = Math.sin(roll);

      const m00 = (cy * cr + sy * sp * sr) * scale;
      const m01 = (cp * sr) * scale;
      const m02 = (-sy * cr + cy * sp * sr) * scale;

      const m10 = (-cy * sr + sy * sp * cr) * scale;
      const m11 = (cp * cr) * scale;
      const m12 = (sy * sr + cy * sp * cr) * scale;

      const m20 = (sy * cp) * scale;
      const m21 = (-sp) * scale;
      const m22 = (cy * cp) * scale;

      out[0] = m00; out[1] = m01; out[2] = m02; out[3] = 0;
      out[4] = m10; out[5] = m11; out[6] = m12; out[7] = 0;
      out[8] = m20; out[9] = m21; out[10] = m22; out[11] = 0;
      out[12] = pos[0]; out[13] = pos[1]; out[14] = pos[2]; out[15] = 1;
      return out;
    }
  };

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const num = parseInt(clean, 16);
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }

  // ---------------- GEOMETRY BUILDER ----------------
  class MeshBuilder {
    constructor() {
      this.verts = []; // x, y, z, nx, ny, nz, u, v, r, g, b
    }

    pushTri(p1, p2, p3, uv1, uv2, uv3, color = [1, 1, 1]) {
      const ux = p2[0] - p1[0], uy = p2[1] - p1[1], uz = p2[2] - p1[2];
      const vx = p3[0] - p1[0], vy = p3[1] - p1[1], vz = p3[2] - p1[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const pts = [p1, p2, p3];
      const uvs = [uv1, uv2, uv3];
      for (let i = 0; i < 3; i++) {
        this.verts.push(
          pts[i][0], pts[i][1], pts[i][2],
          nx, ny, nz,
          uvs[i][0], uvs[i][1],
          color[0], color[1], color[2]
        );
      }
    }

    pushQuad(p1, p2, p3, p4, color = [1, 1, 1], uvScale = 1) {
      this.pushTri(p1, p2, p3, [0, 0], [uvScale, 0], [uvScale, uvScale], color);
      this.pushTri(p1, p3, p4, [0, 0], [uvScale, uvScale], [0, uvScale], color);
    }

    addBox(cx, cy, cz, sx, sy, sz, color = [1, 1, 1], uvScale = 1) {
      const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
      const p000 = [cx - hx, cy - hy, cz - hz];
      const p100 = [cx + hx, cy - hy, cz - hz];
      const p110 = [cx + hx, cy + hy, cz - hz];
      const p010 = [cx - hx, cy + hy, cz - hz];
      const p001 = [cx - hx, cy - hy, cz + hz];
      const p101 = [cx + hx, cy - hy, cz + hz];
      const p111 = [cx + hx, cy + hy, cz + hz];
      const p011 = [cx - hx, cy + hy, cz + hz];

      this.pushQuad(p001, p101, p111, p011, color, uvScale); // Front
      this.pushQuad(p100, p000, p010, p110, color, uvScale); // Back
      this.pushQuad(p011, p111, p110, p010, color, uvScale); // Top
      this.pushQuad(p000, p100, p101, p001, color, uvScale); // Bottom
      this.pushQuad(p101, p100, p110, p111, color, uvScale); // Right
      this.pushQuad(p000, p001, p011, p010, color, uvScale); // Left
    }

    addTaperedSection(z1, r1x, r1y, yOff1, z2, r2x, r2y, yOff2, segs, color) {
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0);
        const c1 = Math.cos(a1), s1 = Math.sin(a1);

        const p1 = [c0 * r1x, yOff1 + s0 * r1y, z1];
        const p2 = [c1 * r1x, yOff1 + s1 * r1y, z1];
        const p3 = [c1 * r2x, yOff2 + s1 * r2y, z2];
        const p4 = [c0 * r2x, yOff2 + s0 * r2y, z2];

        this.pushTri(p1, p2, p3, [i / segs, 0], [(i + 1) / segs, 0], [(i + 1) / segs, 1], color);
        this.pushTri(p1, p3, p4, [i / segs, 0], [(i + 1) / segs, 1], [i / segs, 1], color);
      }
    }

    addWing(side, rootZ, rootLen, tipX, tipZ, tipLen, yRoot, yTip, thickness, color) {
      // side: +1 right, -1 left
      const rx = side * 0.55;
      const tx = side * tipX;
      const t = thickness * 0.5;

      const rLE_T = [rx, yRoot + t, rootZ];
      const rTE_T = [rx, yRoot + t * 0.5, rootZ + rootLen];
      const tLE_T = [tx, yTip + t * 0.4, tipZ];
      const tTE_T = [tx, yTip + t * 0.2, tipZ + tipLen];

      const rLE_B = [rx, yRoot - t, rootZ];
      const rTE_B = [rx, yRoot - t * 0.5, rootZ + rootLen];
      const tLE_B = [tx, yTip - t * 0.4, tipZ];
      const tTE_B = [tx, yTip - t * 0.2, tipZ + tipLen];

      if (side > 0) {
        this.pushQuad(rLE_T, tLE_T, tTE_T, rTE_T, color, 1); // Top
        this.pushQuad(rTE_B, tTE_B, tLE_B, rLE_B, color, 1); // Bottom
        this.pushQuad(rLE_B, tLE_B, tLE_T, rLE_T, color, 1); // Leading edge
        this.pushQuad(rTE_T, tTE_T, tTE_B, rTE_B, color, 1); // Trailing edge
        this.pushQuad(tLE_B, tTE_B, tTE_T, tLE_T, color, 1); // Tip
      } else {
        this.pushQuad(tLE_T, rLE_T, rTE_T, tTE_T, color, 1);
        this.pushQuad(tTE_B, rTE_B, rLE_B, tLE_B, color, 1);
        this.pushQuad(tLE_B, rLE_B, rLE_T, tLE_T, color, 1);
        this.pushQuad(tTE_T, rTE_T, rTE_B, tTE_B, color, 1);
        this.pushQuad(tTE_B, tLE_B, tLE_T, tTE_T, color, 1);
      }
    }

    addVerticalTail(xPos, cantAngle, rootZ, rootLen, height, tipZ, tipLen, thickness, color) {
      const dx = Math.sin(cantAngle) * height;
      const dy = Math.cos(cantAngle) * height;
      const t = thickness * 0.5;

      const bF_L = [xPos - t, 0.2, rootZ];
      const bF_R = [xPos + t, 0.2, rootZ];
      const bR_L = [xPos - t, 0.2, rootZ + rootLen];
      const bR_R = [xPos + t, 0.2, rootZ + rootLen];

      const tF_L = [xPos + dx - t * 0.5, 0.2 + dy, tipZ];
      const tF_R = [xPos + dx + t * 0.5, 0.2 + dy, tipZ];
      const tR_L = [xPos + dx - t * 0.5, 0.2 + dy, tipZ + tipLen];
      const tR_R = [xPos + dx + t * 0.5, 0.2 + dy, tipZ + tipLen];

      this.pushQuad(bF_L, bR_L, tR_L, tF_L, color, 1);
      this.pushQuad(bR_R, bF_R, tF_R, tR_R, color, 1);
      this.pushQuad(bF_R, bF_L, tF_L, tF_R, color, 1);
      this.pushQuad(bR_L, bR_R, tR_R, tR_L, color, 1);
      this.pushQuad(tF_L, tR_L, tR_R, tF_R, color, 1);
    }

    build(gl) {
      const data = new Float32Array(this.verts);
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return { vbo, count: data.length / 11 };
    }
  }

  // ---------------- 3D WEBGL ENGINE CLASS ----------------
  class SkyEngine3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext("webgl2", { antialias: true, powerPreference: "high-performance" }) ||
                canvas.getContext("webgl", { antialias: true, powerPreference: "high-performance" });
      if (!this.gl) {
        console.error("WebGL unavailable");
        return;
      }

      this.quality = "high";
      this.resolution = "auto";
      this.time = 0;

      this._initShaders();
      this._initCommonMeshes();
      this._initEnvironmentData();
      this.resize();
    }

    setGraphicsOptions(quality, resolution) {
      this.quality = quality || "high";
      this.resolution = resolution || "auto";
      this.resize();
    }

    resize() {
      if (!this.gl) return;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const aspect = winW / Math.max(1, winH);

      let targetW = winW;
      let targetH = winH;
      const dpr = Math.min(window.devicePixelRatio || 1, this.quality === "ultra" ? 2 : 1.5);

      if (this.resolution === "1280x720") {
        targetH = 720;
        targetW = Math.round(720 * aspect);
      } else if (this.resolution === "1600x900") {
        targetH = 900;
        targetW = Math.round(900 * aspect);
      } else if (this.resolution === "1920x1080") {
        targetH = 1080;
        targetW = Math.round(1080 * aspect);
      } else {
        const mult = this.quality === "low" ? 0.72 : (this.quality === "medium" ? 0.9 : dpr);
        targetW = Math.round(winW * mult);
        targetH = Math.round(winH * mult);
      }

      this.canvas.width = Math.max(320, targetW);
      this.canvas.height = Math.max(200, targetH);
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    _compileShader(type, src) {
      const gl = this.gl;
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("Shader error:", gl.getShaderInfoLog(s));
      }
      return s;
    }

    _createProgram(vsSrc, fsSrc) {
      const gl = this.gl;
      const p = gl.createProgram();
      gl.attachShader(p, this._compileShader(gl.VERTEX_SHADER, vsSrc));
      gl.attachShader(p, this._compileShader(gl.FRAGMENT_SHADER, fsSrc));
      gl.linkProgram(p);
      return p;
    }

    _initShaders() {
      const gl = this.gl;

      // 1. Standard Lit 3D Mesh Shader
      const meshVS = `
        attribute vec3 aPos;
        attribute vec3 aNormal;
        attribute vec2 aUv;
        attribute vec3 aColor;

        uniform mat4 uProj;
        uniform mat4 uView;
        uniform mat4 uModel;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vColor;

        void main() {
          vec4 wp = uModel * vec4(aPos, 1.0);
          vWorldPos = wp.xyz;
          vNormal = mat3(uModel) * aNormal;
          vUv = aUv;
          vColor = aColor;
          gl_Position = uProj * uView * wp;
        }
      `;

      const meshFS = `
        precision mediump float;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vColor;

        uniform vec3 uCamPos;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uSkyColor;
        uniform vec3 uGroundColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform bool uUseTex;
        uniform sampler2D uSampler;
        uniform vec3 uTint;
        uniform vec3 uEmissive;
        uniform float uSpecular;

        void main() {
          vec3 N = normalize(vNormal);
          vec3 L = normalize(uSunDir);
          vec3 V = normalize(uCamPos - vWorldPos);
          vec3 H = normalize(L + V);

          vec3 baseCol = vColor * uTint;
          if (uUseTex) {
            baseCol *= texture2D(uSampler, vUv).rgb;
          }

          float hemi = N.y * 0.5 + 0.5;
          vec3 ambient = mix(uGroundColor, uSkyColor, hemi) * 0.65;
          float diff = max(dot(N, L), 0.0);
          float spec = pow(max(dot(N, H), 0.0), 28.0) * uSpecular;

          vec3 lit = baseCol * (ambient + uSunColor * diff * 0.95) + uSunColor * spec + uEmissive;

          float dist = length(uCamPos - vWorldPos);
          float fogFactor = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
          fogFactor = clamp(fogFactor, 0.0, 1.0);

          gl_FragColor = vec4(mix(lit, uFogColor, fogFactor), 1.0);
        }
      `;

      this.meshProg = this._createProgram(meshVS, meshFS);
      this.meshLoc = {
        aPos: gl.getAttribLocation(this.meshProg, "aPos"),
        aNormal: gl.getAttribLocation(this.meshProg, "aNormal"),
        aUv: gl.getAttribLocation(this.meshProg, "aUv"),
        aColor: gl.getAttribLocation(this.meshProg, "aColor"),
        uProj: gl.getUniformLocation(this.meshProg, "uProj"),
        uView: gl.getUniformLocation(this.meshProg, "uView"),
        uModel: gl.getUniformLocation(this.meshProg, "uModel"),
        uCamPos: gl.getUniformLocation(this.meshProg, "uCamPos"),
        uSunDir: gl.getUniformLocation(this.meshProg, "uSunDir"),
        uSunColor: gl.getUniformLocation(this.meshProg, "uSunColor"),
        uSkyColor: gl.getUniformLocation(this.meshProg, "uSkyColor"),
        uGroundColor: gl.getUniformLocation(this.meshProg, "uGroundColor"),
        uFogColor: gl.getUniformLocation(this.meshProg, "uFogColor"),
        uFogDensity: gl.getUniformLocation(this.meshProg, "uFogDensity"),
        uUseTex: gl.getUniformLocation(this.meshProg, "uUseTex"),
        uSampler: gl.getUniformLocation(this.meshProg, "uSampler"),
        uTint: gl.getUniformLocation(this.meshProg, "uTint"),
        uEmissive: gl.getUniformLocation(this.meshProg, "uEmissive"),
        uSpecular: gl.getUniformLocation(this.meshProg, "uSpecular")
      };

      // 2. Animated 3D Ocean Shader
      const oceanVS = `
        attribute vec3 aPos;
        uniform mat4 uProj;
        uniform mat4 uView;
        uniform vec2 uCenterXZ;
        varying vec3 vWorldPos;
        void main() {
          vec3 wp = vec3(aPos.x + uCenterXZ.x, 0.0, aPos.z + uCenterXZ.y);
          vWorldPos = wp;
          gl_Position = uProj * uView * vec4(wp, 1.0);
        }
      `;
      const oceanFS = `
        precision mediump float;
        varying vec3 vWorldPos;
        uniform float uTime;
        uniform vec3 uCamPos;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;

        void main() {
          vec2 p = vWorldPos.xz * 0.018;
          float w1 = sin(p.x * 1.7 + uTime * 1.4) * cos(p.y * 1.5 + uTime * 1.1);
          float w2 = sin((p.x + p.y) * 3.1 - uTime * 2.1) * 0.5;
          vec3 N = normalize(vec3((w1 + w2) * 0.08, 1.0, (w1 - w2) * 0.08));

          vec3 V = normalize(uCamPos - vWorldPos);
          vec3 L = normalize(uSunDir);
          vec3 H = normalize(L + V);

          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 deepSea = vec3(0.03, 0.14, 0.28);
          vec3 horizonRefl = uFogColor * 0.85;
          vec3 col = mix(deepSea, horizonRefl, fresnel * 0.65);

          float spec = pow(max(dot(N, H), 0.0), 72.0) * 1.3;
          col += uSunColor * spec;

          float dist = length(uCamPos - vWorldPos);
          float fogFactor = clamp(1.0 - exp(-pow(dist * uFogDensity, 2.0)), 0.0, 1.0);
          gl_FragColor = vec4(mix(col, uFogColor, fogFactor), 1.0);
        }
      `;
      this.oceanProg = this._createProgram(oceanVS, oceanFS);
      this.oceanLoc = {
        aPos: gl.getAttribLocation(this.oceanProg, "aPos"),
        uProj: gl.getUniformLocation(this.oceanProg, "uProj"),
        uView: gl.getUniformLocation(this.oceanProg, "uView"),
        uCenterXZ: gl.getUniformLocation(this.oceanProg, "uCenterXZ"),
        uTime: gl.getUniformLocation(this.oceanProg, "uTime"),
        uCamPos: gl.getUniformLocation(this.oceanProg, "uCamPos"),
        uSunDir: gl.getUniformLocation(this.oceanProg, "uSunDir"),
        uSunColor: gl.getUniformLocation(this.oceanProg, "uSunColor"),
        uFogColor: gl.getUniformLocation(this.oceanProg, "uFogColor"),
        uFogDensity: gl.getUniformLocation(this.oceanProg, "uFogDensity")
      };

      // 3. Atmospheric Sky Dome Shader
      const skyVS = `
        attribute vec3 aPos;
        uniform mat4 uProj;
        uniform mat4 uView;
        uniform vec3 uCamPos;
        varying vec3 vDir;
        void main() {
          vDir = normalize(aPos);
          vec3 wp = aPos * 25000.0 + uCamPos;
          gl_Position = uProj * uView * vec4(wp, 1.0);
        }
      `;
      const skyFS = `
        precision mediump float;
        varying vec3 vDir;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uZenithColor;

        void main() {
          vec3 d = normalize(vDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 sky = mix(uHorizonColor, uZenithColor, pow(h, 0.55));

          float sunAmt = max(dot(d, normalize(uSunDir)), 0.0);
          sky += uSunColor * pow(sunAmt, 14.0) * 0.45;
          sky += uSunColor * smoothstep(0.9975, 0.9994, sunAmt) * 2.2;

          gl_FragColor = vec4(sky, 1.0);
        }
      `;
      this.skyProg = this._createProgram(skyVS, skyFS);
      this.skyLoc = {
        aPos: gl.getAttribLocation(this.skyProg, "aPos"),
        uProj: gl.getUniformLocation(this.skyProg, "uProj"),
        uView: gl.getUniformLocation(this.skyProg, "uView"),
        uCamPos: gl.getUniformLocation(this.skyProg, "uCamPos"),
        uSunDir: gl.getUniformLocation(this.skyProg, "uSunDir"),
        uSunColor: gl.getUniformLocation(this.skyProg, "uSunColor"),
        uHorizonColor: gl.getUniformLocation(this.skyProg, "uHorizonColor"),
        uZenithColor: gl.getUniformLocation(this.skyProg, "uZenithColor")
      };
    }

    _initCommonMeshes() {
      const gl = this.gl;

      // Sky Dome Sphere
      const skyVerts = [];
      const stacks = 14, slices = 24;
      for (let i = 0; i < stacks; i++) {
        const p0 = (i / stacks) * Math.PI - Math.PI * 0.5;
        const p1 = ((i + 1) / stacks) * Math.PI - Math.PI * 0.5;
        for (let j = 0; j < slices; j++) {
          const t0 = (j / slices) * Math.PI * 2;
          const t1 = ((j + 1) / slices) * Math.PI * 2;
          const v00 = [Math.cos(p0) * Math.cos(t0), Math.sin(p0), Math.cos(p0) * Math.sin(t0)];
          const v10 = [Math.cos(p0) * Math.cos(t1), Math.sin(p0), Math.cos(p0) * Math.sin(t1)];
          const v11 = [Math.cos(p1) * Math.cos(t1), Math.sin(p1), Math.cos(p1) * Math.sin(t1)];
          const v01 = [Math.cos(p1) * Math.cos(t0), Math.sin(p1), Math.cos(p1) * Math.sin(t0)];
          skyVerts.push(...v00, ...v10, ...v11, ...v00, ...v11, ...v01);
        }
      }
      this.skyVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.skyVBO);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyVerts), gl.STATIC_DRAW);
      this.skyCount = skyVerts.length / 3;

      // Ocean Grid Plane (40km x 40km)
      const S = 22000;
      const oceanVerts = new Float32Array([
        -S, 0, -S,  S, 0, -S,  S, 0, S,
        -S, 0, -S,  S, 0, S,  -S, 0, S
      ]);
      this.oceanVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.oceanVBO);
      gl.bufferData(gl.ARRAY_BUFFER, oceanVerts, gl.STATIC_DRAW);

      // Generic Sphere / Puff Mesh (for clouds, explosions, radar domes)
      const puffMB = new MeshBuilder();
      const ps = 8, psl = 12;
      for (let i = 0; i < ps; i++) {
        const a0 = (i / ps) * Math.PI - Math.PI * 0.5;
        const a1 = ((i + 1) / ps) * Math.PI - Math.PI * 0.5;
        for (let j = 0; j < psl; j++) {
          const b0 = (j / psl) * Math.PI * 2;
          const b1 = ((j + 1) / psl) * Math.PI * 2;
          const p00 = [Math.cos(a0) * Math.cos(b0), Math.sin(a0), Math.cos(a0) * Math.sin(b0)];
          const p10 = [Math.cos(a0) * Math.cos(b1), Math.sin(a0), Math.cos(a0) * Math.sin(b1)];
          const p11 = [Math.cos(a1) * Math.cos(b1), Math.sin(a1), Math.cos(a1) * Math.sin(b1)];
          const p01 = [Math.cos(a1) * Math.cos(b0), Math.sin(a1), Math.cos(a1) * Math.sin(b0)];
          puffMB.pushTri(p00, p10, p11, [0, 0], [1, 0], [1, 1], [1, 1, 1]);
          puffMB.pushTri(p00, p11, p01, [0, 0], [1, 1], [0, 1], [1, 1, 1]);
        }
      }
      this.sphereMesh = puffMB.build(gl);

      // Waypoint Ring Mesh
      const ringMB = new MeshBuilder();
      const rSegs = 24;
      const R = 36, tube = 2.6;
      for (let i = 0; i < rSegs; i++) {
        const t0 = (i / rSegs) * Math.PI * 2;
        const t1 = ((i + 1) / rSegs) * Math.PI * 2;
        const c0 = Math.cos(t0), s0 = Math.sin(t0);
        const c1 = Math.cos(t1), s1 = Math.sin(t1);
        ringMB.pushQuad(
          [c0 * (R - tube), s0 * (R - tube), -tube],
          [c1 * (R - tube), s1 * (R - tube), -tube],
          [c1 * (R + tube), s1 * (R + tube), tube],
          [c0 * (R + tube), s0 * (R + tube), tube],
          [0.2, 0.85, 1.0]
        );
      }
      this.ringMesh = ringMB.build(gl);

      // Missile Mesh
      const mslMB = new MeshBuilder();
      mslMB.addTaperedSection(-1.8, 0.02, 0.02, 0, -1.2, 0.14, 0.14, 0, 8, [0.95, 0.35, 0.1]);
      mslMB.addTaperedSection(-1.2, 0.14, 0.14, 0, 1.4, 0.14, 0.14, 0, 8, [0.92, 0.94, 0.96]);
      mslMB.addBox(0, 0, 1.1, 0.75, 0.04, 0.45, [0.3, 0.35, 0.4]);
      mslMB.addBox(0, 0, 1.1, 0.04, 0.75, 0.45, [0.3, 0.35, 0.4]);
      this.missileMesh = mslMB.build(gl);

      // Build all 5 Fighter Jet 3D Geometries
      this.jetModels = {
        f16: this._buildFighterJet("f16"),
        f22: this._buildFighterJet("f22"),
        f35: this._buildFighterJet("f35"),
        su57: this._buildFighterJet("su57"),
        typhoon: this._buildFighterJet("typhoon")
      };

      // Cache textures
      this.hangarFloorTex = TextureGenerator.createHangarFloorTexture(gl);
      this.runwayTex = TextureGenerator.createRunwayTexture(gl);
      this.liveryTextures = {};
      window.GAME_DATA.liveries.forEach(liv => {
        this.liveryTextures[liv.id] = TextureGenerator.createAircraftTexture(gl, liv);
      });
      this.enemyTex = TextureGenerator.createAircraftTexture(gl, {
        primary: "#3f1d1d",
        secondary: "#1e1b1b",
        accent: "#ef4444"
      });

      // Build 3D Military Hangar Scene
      this._buildHangarScene();
    }

    _buildFighterJet(shape) {
      const gl = this.gl;
      const body = new MeshBuilder();
      const canopy = new MeshBuilder();
      const flame = new MeshBuilder();

      const darkMetal = [0.22, 0.25, 0.30];
      const lightMetal = [0.88, 0.90, 0.93];
      const missileCol = [0.95, 0.95, 0.95];

      // 1. Nose radome + forward & main fuselage (-Z is forward!)
      const noseLen = shape === "f22" || shape === "su57" ? -7.2 : -6.8;
      const wid = shape === "su57" ? 1.25 : (shape === "f22" ? 1.15 : 0.88);

      body.addTaperedSection(noseLen, 0.04, 0.04, -0.08, -4.4, wid * 0.58, 0.48, 0.0, 10, darkMetal);
      body.addTaperedSection(-4.4, wid * 0.58, 0.48, 0.0, -1.5, wid, 0.65, 0.05, 12, lightMetal);
      body.addTaperedSection(-1.5, wid, 0.65, 0.05, 3.8, wid * 0.92, 0.60, 0.04, 12, lightMetal);

      // Air intakes
      if (shape === "f16" || shape === "typhoon") {
        body.addBox(0, -0.45, -1.6, wid * 0.95, 0.42, 3.4, darkMetal);
      } else {
        body.addBox(-wid * 0.72, -0.18, -1.8, 0.52, 0.46, 3.6, darkMetal);
        body.addBox(wid * 0.72, -0.18, -1.8, 0.52, 0.46, 3.6, darkMetal);
      }

      // 2. Bubble Canopy (Glossy Gold/Cyan Tinted Glass)
      canopy.addTaperedSection(-3.7, 0.12, 0.10, 0.35, -2.5, 0.44, 0.42, 0.58, 10, [1.0, 0.85, 0.35]);
      canopy.addTaperedSection(-2.5, 0.44, 0.42, 0.58, -0.8, 0.36, 0.30, 0.48, 10, [1.0, 0.85, 0.35]);

      // 3. Wings & Tail configuration specific to each real jet
      if (shape === "f16") {
        body.addWing(1, -1.2, 3.6, 5.1, 1.1, 1.1, 0.08, 0.02, 0.16, lightMetal);
        body.addWing(-1, -1.2, 3.6, 5.1, 1.1, 1.1, 0.08, 0.02, 0.16, lightMetal);
        // Horizontal tailplanes
        body.addWing(1, 2.7, 1.6, 2.8, 3.6, 0.7, -0.05, -0.08, 0.1, lightMetal);
        body.addWing(-1, 2.7, 1.6, 2.8, 3.6, 0.7, -0.05, -0.08, 0.1, lightMetal);
        // Single tall vertical tail
        body.addVerticalTail(0, 0, 1.6, 2.5, 2.45, 3.1, 0.9, 0.14, lightMetal);
        // Single exhaust nozzle
        body.addTaperedSection(3.8, 0.55, 0.55, 0.0, 4.9, 0.44, 0.44, 0.0, 12, darkMetal);
        flame.addTaperedSection(4.85, 0.38, 0.38, 0.0, 8.2, 0.04, 0.04, 0.0, 10, [1.0, 0.55, 0.12]);
      } else if (shape === "f22") {
        body.addWing(1, -1.6, 4.4, 6.2, 1.2, 1.3, 0.1, 0.04, 0.16, lightMetal);
        body.addWing(-1, -1.6, 4.4, 6.2, 1.2, 1.3, 0.1, 0.04, 0.16, lightMetal);
        body.addWing(1, 2.8, 1.7, 3.5, 3.8, 0.8, 0.0, -0.04, 0.1, lightMetal);
        body.addWing(-1, 2.8, 1.7, 3.5, 3.8, 0.8, 0.0, -0.04, 0.1, lightMetal);
        // Twin outward-canted stealth vertical tails
        body.addVerticalTail(0.68, 0.42, 1.6, 2.4, 2.15, 3.0, 0.9, 0.12, lightMetal);
        body.addVerticalTail(-0.68, -0.42, 1.6, 2.4, 2.15, 3.0, 0.9, 0.12, lightMetal);
        // Twin nozzles
        body.addBox(0.45, 0.0, 4.3, 0.58, 0.42, 1.1, darkMetal);
        body.addBox(-0.45, 0.0, 4.3, 0.58, 0.42, 1.1, darkMetal);
        flame.addTaperedSection(4.8, 0.28, 0.22, 0.0, 8.3, 0.04, 0.04, 0.0, 8, [1.0, 0.58, 0.14]);
      } else if (shape === "f35") {
        body.addWing(1, -1.4, 3.9, 5.4, 0.8, 1.3, 0.1, 0.04, 0.18, lightMetal);
        body.addWing(-1, -1.4, 3.9, 5.4, 0.8, 1.3, 0.1, 0.04, 0.18, lightMetal);
        body.addWing(1, 2.7, 1.5, 3.1, 3.6, 0.75, 0.0, -0.04, 0.1, lightMetal);
        body.addWing(-1, 2.7, 1.5, 3.1, 3.6, 0.75, 0.0, -0.04, 0.1, lightMetal);
        body.addVerticalTail(0.62, 0.38, 1.7, 2.2, 2.0, 2.9, 0.85, 0.12, lightMetal);
        body.addVerticalTail(-0.62, -0.38, 1.7, 2.2, 2.0, 2.9, 0.85, 0.12, lightMetal);
        body.addTaperedSection(3.8, 0.62, 0.62, 0.0, 4.9, 0.50, 0.50, 0.0, 12, darkMetal);
        flame.addTaperedSection(4.85, 0.42, 0.42, 0.0, 8.2, 0.04, 0.04, 0.0, 10, [1.0, 0.52, 0.10]);
      } else if (shape === "su57") {
        // Blended wide wing-body + LERX
        body.addWing(1, -2.6, 5.4, 6.6, 1.3, 1.4, 0.08, 0.02, 0.15, lightMetal);
        body.addWing(-1, -2.6, 5.4, 6.6, 1.3, 1.4, 0.08, 0.02, 0.15, lightMetal);
        body.addWing(1, 2.9, 1.8, 3.8, 4.0, 0.8, -0.02, -0.05, 0.1, lightMetal);
        body.addWing(-1, 2.9, 1.8, 3.8, 4.0, 0.8, -0.02, -0.05, 0.1, lightMetal);
        body.addVerticalTail(0.95, 0.36, 1.9, 2.2, 1.95, 3.1, 0.8, 0.11, lightMetal);
        body.addVerticalTail(-0.95, -0.36, 1.9, 2.2, 1.95, 3.1, 0.8, 0.11, lightMetal);
        body.addTaperedSection(3.8, 0.42, 0.42, 0.0, 5.0, 0.35, 0.35, 0.0, 10, darkMetal);
        flame.addTaperedSection(4.9, 0.34, 0.34, 0.0, 8.5, 0.04, 0.04, 0.0, 10, [0.35, 0.72, 1.0]);
      } else {
        // Eurofighter Typhoon: Forward Canards + Large Cranked Delta Wing + Single Tail
        body.addWing(1, -3.5, 1.1, 1.9, -2.8, 0.5, 0.12, 0.14, 0.08, lightMetal);
        body.addWing(-1, -3.5, 1.1, 1.9, -2.8, 0.5, 0.12, 0.14, 0.08, lightMetal);
        body.addWing(1, -1.0, 4.6, 5.6, 2.2, 1.4, 0.04, 0.0, 0.15, lightMetal);
        body.addWing(-1, -1.0, 4.6, 5.6, 2.2, 1.4, 0.04, 0.0, 0.15, lightMetal);
        body.addVerticalTail(0, 0, 1.5, 2.6, 2.5, 3.1, 0.95, 0.13, lightMetal);
        body.addTaperedSection(3.8, 0.58, 0.52, 0.0, 4.9, 0.46, 0.44, 0.0, 12, darkMetal);
        flame.addTaperedSection(4.85, 0.38, 0.38, 0.0, 8.2, 0.04, 0.04, 0.0, 10, [1.0, 0.58, 0.14]);
      }

      // 4. Underwing Weapon Pylons & Air-to-Air Missiles
      [-2.6, 2.6, -4.1, 4.1].forEach(wx => {
        body.addBox(wx, -0.14, 0.3, 0.08, 0.22, 1.3, darkMetal);
        body.addTaperedSection(-0.8, 0.02, 0.02, -0.32, 1.4, 0.08, 0.08, -0.32, 6, missileCol);
      });

      return {
        body: body.build(gl),
        canopy: canopy.build(gl),
        flame: flame.build(gl)
      };
    }

    _buildHangarScene() {
      const gl = this.gl;
      const floor = new MeshBuilder();
      floor.pushQuad([-28, -1.8, -32], [28, -1.8, -32], [28, -1.8, 32], [-28, -1.8, 32], [1, 1, 1], 4);
      this.hangarFloorMesh = floor.build(gl);

      const struct = new MeshBuilder();
      const wallCol = [0.16, 0.20, 0.27];
      const beamCol = [0.10, 0.13, 0.18];
      const bannerBlue = [0.09, 0.24, 0.48];
      const bannerOrange = [0.92, 0.42, 0.09];

      // Side walls
      struct.addBox(-24, 7, 0, 1.2, 18, 60, wallCol);
      struct.addBox(24, 7, 0, 1.2, 18, 60, wallCol);
      // Back wall with open blast-door gap in middle
      struct.addBox(-16, 7, -28, 16, 18, 1.5, wallCol);
      struct.addBox(16, 7, -28, 16, 18, 1.5, wallCol);
      struct.addBox(0, 14, -28, 18, 4, 1.5, beamCol);

      // Overhead roof trusses & steel pillars
      for (let z = -24; z <= 24; z += 8) {
        struct.addBox(-23, 7, z, 1.4, 18, 1.2, beamCol);
        struct.addBox(23, 7, z, 1.4, 18, 1.2, beamCol);
        struct.addBox(0, 15.8, z, 48, 1.1, 1.0, beamCol);
      }

      // Military Squadron Banners hanging on walls (Reference 1 style!)
      [-14, 0, 14].forEach(z => {
        struct.addBox(-23.2, 9.5, z, 0.2, 7.5, 2.4, bannerBlue);
        struct.addBox(-23.1, 6.2, z, 0.25, 0.7, 2.4, bannerOrange);
        struct.addBox(23.2, 9.5, z, 0.2, 7.5, 2.4, bannerBlue);
        struct.addBox(23.1, 6.2, z, 0.25, 0.7, 2.4, bannerOrange);
      });

      // Central Turntable Ring Pad
      struct.addTaperedSection(-9, 9.5, 0.12, -1.72, 9, 9.5, 0.12, -1.72, 4, [0.22, 0.26, 0.32]);

      // Pilot standing beside the jet (Reference 1 touch!)
      struct.addBox(3.4, -0.75, -1.2, 0.48, 1.1, 0.32, [0.25, 0.34, 0.24]); // Flight suit torso
      struct.addBox(3.4, -1.45, -1.2, 0.44, 0.7, 0.3, [0.22, 0.30, 0.21]);  // Legs
      struct.addBox(3.4, -0.02, -1.2, 0.32, 0.34, 0.34, [0.85, 0.88, 0.92]); // White helmet

      this.hangarStructMesh = struct.build(gl);

      // Overhead Spotlight Panels
      const lights = new MeshBuilder();
      for (let z = -16; z <= 16; z += 16) {
        lights.addBox(-8, 15.1, z, 4.5, 0.3, 1.8, [1, 1, 1]);
        lights.addBox(8, 15.1, z, 4.5, 0.3, 1.8, [1, 1, 1]);
      }
      this.hangarLightsMesh = lights.build(gl);
    }

    _initEnvironmentData() {
      const gl = this.gl;

      // Build Garuda Airbase Island + 14 Archipelago Mountain Islands
      const terrainMB = new MeshBuilder();
      const runwayMB = new MeshBuilder();
      const baseStructMB = new MeshBuilder();

      const sandCol = [0.76, 0.70, 0.50];
      const grassCol = [0.16, 0.38, 0.18];
      const rockCol = [0.36, 0.37, 0.40];
      const snowCol = [0.90, 0.92, 0.95];

      // Main Airbase Island at (0, 0, -1800)
      terrainMB.addBox(0, 4, -1800, 1400, 12, 2600, sandCol);
      terrainMB.addBox(0, 10, -1800, 1250, 12, 2400, grassCol);

      // Asphalt Runway on Garuda Airbase
      runwayMB.pushQuad(
        [-45, 17.5, -2750], [45, 17.5, -2750],
        [45, 17.5, -850], [-45, 17.5, -850],
        [1, 1, 1], 8
      );

      // Control Tower & Base Hangars
      baseStructMB.addBox(140, 45, -1700, 36, 72, 36, [0.75, 0.78, 0.82]);
      baseStructMB.addBox(140, 88, -1700, 48, 18, 48, [0.15, 0.65, 0.45]);
      [-1350, -1550, -1950].forEach(hz => {
        baseStructMB.addBox(-150, 32, hz, 90, 34, 110, [0.28, 0.34, 0.42]);
      });

      // 14 Archipelago Islands & Towering Peaks
      const islandCoords = [
        [-3200, -4200, 1100, 750],
        [3600, -3800, 1300, 980],
        [-5500, 1200, 1500, 1150],
        [5200, 2400, 1400, 880],
        [0, -7800, 1800, 1350],
        [-7800, -6500, 1600, 1050],
        [8200, -7200, 1500, 920],
        [-2800, 5800, 1200, 680],
        [4100, 6500, 1350, 810],
        [-9500, 7500, 1700, 1220],
        [9800, 8200, 1650, 1100],
        [12000, -1500, 1450, 940],
        [-12500, -2200, 1550, 1020],
        [1500, 11500, 1600, 960]
      ];

      islandCoords.forEach(([ix, iz, rad, peakH]) => {
        // Coastal beach base
        terrainMB.addTaperedSection(iz - rad, rad * 0.85, 6, 3, iz + rad, rad * 0.85, 6, 3, 6, sandCol);
        // Lush green mid-slopes
        terrainMB.addTaperedSection(iz - rad * 0.75, rad * 0.75, peakH * 0.38, 12, iz + rad * 0.75, rad * 0.75, peakH * 0.38, 12, 6, grassCol);
        // Steep rocky mountain pyramid
        const pTop = [ix, peakH, iz];
        const b1 = [ix - rad * 0.45, peakH * 0.32, iz - rad * 0.45];
        const b2 = [ix + rad * 0.45, peakH * 0.32, iz - rad * 0.45];
        const b3 = [ix + rad * 0.45, peakH * 0.32, iz + rad * 0.45];
        const b4 = [ix - rad * 0.45, peakH * 0.32, iz + rad * 0.45];
        const mCol = peakH > 1000 ? snowCol : rockCol;
        terrainMB.pushTri(b1, b2, pTop, [0, 0], [1, 0], [0.5, 1], mCol);
        terrainMB.pushTri(b2, b3, pTop, [0, 0], [1, 0], [0.5, 1], rockCol);
        terrainMB.pushTri(b3, b4, pTop, [0, 0], [1, 0], [0.5, 1], mCol);
        terrainMB.pushTri(b4, b1, pTop, [0, 0], [1, 0], [0.5, 1], rockCol);
      });

      this.terrainMesh = terrainMB.build(gl);
      this.runwayMesh = runwayMB.build(gl);
      this.baseStructMesh = baseStructMB.build(gl);

      // 3D Cloud Clusters
      this.clouds = [];
      for (let i = 0; i < 48; i++) {
        this.clouds.push({
          x: (Math.random() - 0.5) * 24000,
          y: 650 + Math.random() * 1450,
          z: (Math.random() - 0.5) * 24000,
          sx: 240 + Math.random() * 340,
          sy: 65 + Math.random() * 75,
          sz: 190 + Math.random() * 280
        });
      }
    }

    _getLightingPreset(preset) {
      if (preset === "sunset") {
        return {
          sunDir: [-0.45, 0.24, -0.86],
          sunColor: [1.0, 0.72, 0.42],
          skyColor: [0.55, 0.65, 0.85],
          groundColor: [0.22, 0.18, 0.16],
          horizonColor: [0.95, 0.58, 0.30],
          zenithColor: [0.12, 0.26, 0.52],
          fogColor: [0.88, 0.56, 0.34],
          fogDensity: 0.000048
        };
      } else if (preset === "dusk") {
        return {
          sunDir: [0.35, 0.16, -0.92],
          sunColor: [0.85, 0.52, 0.65],
          skyColor: [0.28, 0.36, 0.58],
          groundColor: [0.10, 0.12, 0.18],
          horizonColor: [0.48, 0.34, 0.52],
          zenithColor: [0.05, 0.09, 0.22],
          fogColor: [0.38, 0.28, 0.44],
          fogDensity: 0.000052
        };
      }
      // Crisp Daylight
      return {
        sunDir: [0.42, 0.68, -0.60],
        sunColor: [1.0, 0.96, 0.88],
        skyColor: [0.52, 0.76, 0.98],
        groundColor: [0.18, 0.26, 0.34],
        horizonColor: [0.68, 0.84, 0.96],
        zenithColor: [0.14, 0.42, 0.82],
        fogColor: [0.66, 0.82, 0.94],
        fogDensity: 0.000042
      };
    }

    _drawMesh(mesh, proj, view, model, camPos, light, opts = {}) {
      const gl = this.gl;
      const loc = this.meshLoc;
      gl.useProgram(this.meshProg);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
      const stride = 11 * 4;
      gl.enableVertexAttribArray(loc.aPos);
      gl.vertexAttribPointer(loc.aPos, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(loc.aNormal);
      gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, stride, 3 * 4);
      gl.enableVertexAttribArray(loc.aUv);
      gl.vertexAttribPointer(loc.aUv, 2, gl.FLOAT, false, stride, 6 * 4);
      gl.enableVertexAttribArray(loc.aColor);
      gl.vertexAttribPointer(loc.aColor, 3, gl.FLOAT, false, stride, 8 * 4);

      gl.uniformMatrix4fv(loc.uProj, false, proj);
      gl.uniformMatrix4fv(loc.uView, false, view);
      gl.uniformMatrix4fv(loc.uModel, false, model);
      gl.uniform3fv(loc.uCamPos, camPos);
      gl.uniform3fv(loc.uSunDir, light.sunDir);
      gl.uniform3fv(loc.uSunColor, light.sunColor);
      gl.uniform3fv(loc.uSkyColor, light.skyColor);
      gl.uniform3fv(loc.uGroundColor, light.groundColor);
      gl.uniform3fv(loc.uFogColor, light.fogColor);
      gl.uniform1f(loc.uFogDensity, light.fogDensity);

      if (opts.texture) {
        gl.uniform1i(loc.uUseTex, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, opts.texture);
        gl.uniform1i(loc.uSampler, 0);
      } else {
        gl.uniform1i(loc.uUseTex, 0);
      }

      gl.uniform3fv(loc.uTint, opts.tint || [1, 1, 1]);
      gl.uniform3fv(loc.uEmissive, opts.emissive || [0, 0, 0]);
      gl.uniform1f(loc.uSpecular, opts.specular !== undefined ? opts.specular : 0.35);

      gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    }

    renderHangar(dt, state) {
      if (!this.gl) return;
      this.time += dt;
      const gl = this.gl;
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.05, 0.08, 0.13, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = this.canvas.width / Math.max(1, this.canvas.height);
      const proj = Mat4.perspective(Mat4.create(), (46 * Math.PI) / 180, aspect, 0.5, 500);

      const yaw = state.orbitYaw;
      const pitch = Math.max(0.08, Math.min(0.65, state.orbitPitch));
      const dist = state.orbitDist || 16.5;

      const camPos = [
        Math.sin(yaw) * Math.cos(pitch) * dist,
        1.4 + Math.sin(pitch) * dist,
        Math.cos(yaw) * Math.cos(pitch) * dist
      ];
      const view = Mat4.lookAt(Mat4.create(), camPos, [0, 0.4, 0], [0, 1, 0]);

      const hangarLight = {
        sunDir: [0.3, 0.85, 0.42],
        sunColor: [1.0, 0.95, 0.88],
        skyColor: [0.42, 0.55, 0.72],
        groundColor: [0.16, 0.19, 0.24],
        fogColor: [0.08, 0.12, 0.18],
        fogDensity: 0.008
      };

      const idMat = Mat4.create();

      // Hangar floor, walls, banners, pilot & lights
      this._drawMesh(this.hangarFloorMesh, proj, view, idMat, camPos, hangarLight, {
        texture: this.hangarFloorTex,
        specular: 0.45
      });
      this._drawMesh(this.hangarStructMesh, proj, view, idMat, camPos, hangarLight, {
        specular: 0.25
      });
      this._drawMesh(this.hangarLightsMesh, proj, view, idMat, camPos, hangarLight, {
        emissive: [0.95, 0.96, 1.0],
        specular: 0.0
      });

      // Active Fighter Jet centered on turntable
      const jetInfo = window.GAME_DATA.aircraft.find(a => a.id === state.jetId) || window.GAME_DATA.aircraft[0];
      const jetMesh = this.jetModels[jetInfo.shape] || this.jetModels.f16;
      const liv = window.GAME_DATA.liveries.find(l => l.id === state.liveryId) || window.GAME_DATA.liveries[0];
      const tex = this.liveryTextures[liv.id];

      const jetModel = Mat4.compose(Mat4.create(), [0, -0.35, 0], 0.35, 0, 0, 1.18);
      this._drawMesh(jetMesh.body, proj, view, jetModel, camPos, hangarLight, {
        texture: tex,
        specular: 0.78
      });
      this._drawMesh(jetMesh.canopy, proj, view, jetModel, camPos, hangarLight, {
        tint: hexToRgb(liv.canopy),
        emissive: [0.16, 0.14, 0.05],
        specular: 1.2
      });

      if (state.afterburnerTest) {
        const flicker = 0.9 + Math.sin(this.time * 48) * 0.15;
        const fModel = Mat4.compose(Mat4.create(), [0, -0.35, 0], 0.35, 0, 0, 1.18 * flicker);
        this._drawMesh(jetMesh.flame, proj, view, fModel, camPos, hangarLight, {
          emissive: [1.0, 0.52, 0.12],
          specular: 0
        });
      }
    }

    renderWorld(dt, world) {
      if (!this.gl) return;
      this.time += dt;
      const gl = this.gl;
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const light = this._getLightingPreset(world.lighting);
      const aspect = this.canvas.width / Math.max(1, this.canvas.height);
      const fov = world.player.afterburner ? 64 : 56;
      const proj = Mat4.perspective(Mat4.create(), (fov * Math.PI) / 180, aspect, 1.5, 36000);

      const p = world.player;
      const pMat = Mat4.compose(Mat4.create(), p.pos, p.yaw, p.pitch, p.roll, 1.0);

      // Forward & Up vectors from player orientation
      const fwd = [-pMat[8], -pMat[9], -pMat[10]];
      const up = [pMat[4], pMat[5], pMat[6]];

      let camPos, camTarget, camUp = [0, 1, 0];
      if (world.cameraMode === "first") {
        // First-Person Cockpit View
        camPos = [
          p.pos[0] + fwd[0] * 2.8 + up[0] * 0.95,
          p.pos[1] + fwd[1] * 2.8 + up[1] * 0.95,
          p.pos[2] + fwd[2] * 2.8 + up[2] * 0.95
        ];
        camTarget = [
          camPos[0] + fwd[0] * 120,
          camPos[1] + fwd[1] * 120,
          camPos[2] + fwd[2] * 120
        ];
        camUp = up;
      } else if (world.cameraMode === "cinematic") {
        // Sweeping Tactical Cinematic Orbit Camera
        const ang = this.time * 0.45;
        const r = world.camDist * 1.45;
        camPos = [
          p.pos[0] + Math.cos(ang) * r,
          p.pos[1] + 4.5 + Math.sin(ang * 0.7) * 2.5,
          p.pos[2] + Math.sin(ang) * r
        ];
        camTarget = p.pos;
      } else {
        // Third-Person Chase Camera (Configurable Distance)
        const d = world.camDist || 13;
        camPos = [
          p.pos[0] - fwd[0] * d + up[0] * (d * 0.24),
          p.pos[1] - fwd[1] * d + up[1] * (d * 0.24),
          p.pos[2] - fwd[2] * d + up[2] * (d * 0.24)
        ];
        camTarget = [
          p.pos[0] + fwd[0] * 28,
          p.pos[1] + fwd[1] * 28,
          p.pos[2] + fwd[2] * 28
        ];
      }

      // Apply subtle camera shake on hit or high Mach
      if (world.shake > 0) {
        camPos[0] += (Math.random() - 0.5) * world.shake;
        camPos[1] += (Math.random() - 0.5) * world.shake;
      }

      const view = Mat4.lookAt(Mat4.create(), camPos, camTarget, camUp);
      this.lastProj = proj;
      this.lastView = view;

      // 1. Sky Dome
      gl.depthMask(false);
      gl.useProgram(this.skyProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.skyVBO);
      gl.enableVertexAttribArray(this.skyLoc.aPos);
      gl.vertexAttribPointer(this.skyLoc.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(this.skyLoc.uProj, false, proj);
      gl.uniformMatrix4fv(this.skyLoc.uView, false, view);
      gl.uniform3fv(this.skyLoc.uCamPos, camPos);
      gl.uniform3fv(this.skyLoc.uSunDir, light.sunDir);
      gl.uniform3fv(this.skyLoc.uSunColor, light.sunColor);
      gl.uniform3fv(this.skyLoc.uHorizonColor, light.horizonColor);
      gl.uniform3fv(this.skyLoc.uZenithColor, light.zenithColor);
      gl.drawArrays(gl.TRIANGLES, 0, this.skyCount);
      gl.depthMask(true);

      // 2. Infinite Animated Ocean
      gl.useProgram(this.oceanProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.oceanVBO);
      gl.enableVertexAttribArray(this.oceanLoc.aPos);
      gl.vertexAttribPointer(this.oceanLoc.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(this.oceanLoc.uProj, false, proj);
      gl.uniformMatrix4fv(this.oceanLoc.uView, false, view);
      gl.uniform2f(this.oceanLoc.uCenterXZ, camPos[0], camPos[2]);
      gl.uniform1f(this.oceanLoc.uTime, this.time);
      gl.uniform3fv(this.oceanLoc.uCamPos, camPos);
      gl.uniform3fv(this.oceanLoc.uSunDir, light.sunDir);
      gl.uniform3fv(this.oceanLoc.uSunColor, light.sunColor);
      gl.uniform3fv(this.oceanLoc.uFogColor, light.fogColor);
      gl.uniform1f(this.oceanLoc.uFogDensity, light.fogDensity);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // 3. Islands, Mountains & Garuda Airbase Runway
      const idMat = Mat4.create();
      this._drawMesh(this.terrainMesh, proj, view, idMat, camPos, light, { specular: 0.08 });
      this._drawMesh(this.runwayMesh, proj, view, idMat, camPos, light, {
        texture: this.runwayTex,
        specular: 0.25
      });
      this._drawMesh(this.baseStructMesh, proj, view, idMat, camPos, light, { specular: 0.4 });

      // 4. 3D Cloud Formations
      const cloudLimit = this.quality === "low" ? 20 : (this.quality === "medium" ? 32 : this.clouds.length);
      for (let i = 0; i < cloudLimit; i++) {
        const c = this.clouds[i];
        c.x += dt * 12;
        if (c.x > 13000) c.x = -13000;
        const cMat = Mat4.create();
        cMat[0] = c.sx; cMat[5] = c.sy; cMat[10] = c.sz;
        cMat[12] = c.x; cMat[13] = c.y; cMat[14] = c.z;
        this._drawMesh(this.sphereMesh, proj, view, cMat, camPos, light, {
          tint: [1.0, 0.98, 0.96],
          emissive: [0.16, 0.16, 0.18],
          specular: 0.0
        });
      }

      // 5. Player Fighter Jet (Hidden in First-Person cockpit view so canopy doesn't block)
      if (world.cameraMode !== "first") {
        const jetInfo = window.GAME_DATA.aircraft.find(a => a.id === p.jetId) || window.GAME_DATA.aircraft[0];
        const jetMesh = this.jetModels[jetInfo.shape] || this.jetModels.f16;
        const liv = window.GAME_DATA.liveries.find(l => l.id === p.liveryId) || window.GAME_DATA.liveries[0];
        const tex = this.liveryTextures[liv.id];

        this._drawMesh(jetMesh.body, proj, view, pMat, camPos, light, {
          texture: tex,
          specular: 0.85
        });
        this._drawMesh(jetMesh.canopy, proj, view, pMat, camPos, light, {
          tint: hexToRgb(liv.canopy),
          emissive: [0.14, 0.12, 0.05],
          specular: 1.2
        });

        // Dynamic Afterburner Plume
        const thrScale = 0.4 + p.throttle * 0.85 + (p.afterburner ? 0.55 : 0) + Math.sin(this.time * 55) * 0.08;
        const fMat = Mat4.compose(Mat4.create(), p.pos, p.yaw, p.pitch, p.roll, 1.0);
        fMat[8] *= thrScale; fMat[9] *= thrScale; fMat[10] *= thrScale;
        this._drawMesh(jetMesh.flame, proj, view, fMat, camPos, light, {
          emissive: p.afterburner ? [1.0, 0.62, 0.16] : [0.95, 0.38, 0.08],
          specular: 0
        });
      }

      // 6. Enemy Fighter Jets
      world.enemies.forEach(en => {
        if (!en.alive) return;
        const eMesh = this.jetModels[en.shape] || this.jetModels.su57;
        const eMat = Mat4.compose(Mat4.create(), en.pos, en.yaw, en.pitch, en.roll, 1.15);
        this._drawMesh(eMesh.body, proj, view, eMat, camPos, light, {
          texture: this.enemyTex,
          specular: 0.75
        });
        this._drawMesh(eMesh.canopy, proj, view, eMat, camPos, light, {
          tint: [0.95, 0.25, 0.25],
          emissive: [0.25, 0.05, 0.05],
          specular: 1.0
        });
        this._drawMesh(eMesh.flame, proj, view, eMat, camPos, light, {
          emissive: [1.0, 0.35, 0.1],
          specular: 0
        });
      });

      // 7. Waypoint Rings (Training & Patrol)
      world.rings.forEach(ring => {
        if (ring.passed) return;
        const rMat = Mat4.compose(Mat4.create(), ring.pos, ring.yaw, 0, 0, 1.0);
        this._drawMesh(this.ringMesh, proj, view, rMat, camPos, light, {
          emissive: [0.15, 0.75, 1.0],
          specular: 0.5
        });
      });

      // 8. Active Missiles
      world.missiles.forEach(m => {
        const mMat = Mat4.compose(Mat4.create(), m.pos, m.yaw, m.pitch, 0, 1.5);
        this._drawMesh(this.missileMesh, proj, view, mMat, camPos, light, {
          emissive: [0.95, 0.45, 0.1],
          specular: 0.4
        });
      });

      // 9. Bullets, Flares, Smoke Trails & Explosions
      world.particles.forEach(pt => {
        const sMat = Mat4.create();
        sMat[0] = pt.size; sMat[5] = pt.size; sMat[10] = pt.size;
        sMat[12] = pt.pos[0]; sMat[13] = pt.pos[1]; sMat[14] = pt.pos[2];
        this._drawMesh(this.sphereMesh, proj, view, sMat, camPos, light, {
          tint: pt.color,
          emissive: pt.emissive || [0, 0, 0],
          specular: 0
        });
      });
    }

    projectToScreen(worldPos) {
      if (!this.lastProj || !this.lastView) return null;
      const vp = Mat4.multiply(Mat4.create(), this.lastProj, this.lastView);
      const x = worldPos[0], y = worldPos[1], z = worldPos[2];
      const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
      const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
      const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];

      const inFront = cw > 0.1;
      const invW = 1.0 / (Math.abs(cw) || 0.001);
      const ndcX = cx * invW * (inFront ? 1 : -1);
      const ndcY = cy * invW * (inFront ? 1 : -1);

      const sx = (ndcX * 0.5 + 0.5) * window.innerWidth;
      const sy = (-ndcY * 0.5 + 0.5) * window.innerHeight;
      return { x: sx, y: sy, inFront };
    }
  }

  window.SkyEngine3D = SkyEngine3D;
})();
