// #35 — WebGL post-processing stack: bloom / chromatic aberration / vignette /
// per-biome color grade. Single full-screen fragment-shader pass.
//
// Architecture: an overlay <canvas id="postFxCanvas"> is created lazily on the
// first call to renderPostFX(). Each gameplay frame the renderer uploads the
// freshly drawn 2D gameCanvas as a texture, draws a fullscreen quad through
// the shader, and the result occludes the underlying 2D canvas. The HTML HUD
// (#ui-layer) sits above the overlay (z-index 5 in main.css) so HUD text/icons
// never go through the shader.
//
// State access pattern: same globalThis bridge as core/drawGameplayPost.js.
// The module is safe to import on the server simulation — every code path is
// guarded by `_hasDOM` and `_glReady` so loader.js's stub canvas can never
// trigger a WebGL call.

const _hasDOM = typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.body !== 'undefined';

const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUV;
void main() {
    vUV = vec2((aPos.x + 1.0) * 0.5, 1.0 - (aPos.y + 1.0) * 0.5);
    gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uChromatic;
uniform float uVignette;
uniform float uBloomThreshold;
uniform float uBloomStrength;
uniform vec3 uColorGrade;
uniform float uTime;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec3 base = texture2D(uTex, vUV).rgb;

    // Bloom: 8-tap ring at ~1.5px radius, additive for samples above threshold.
    vec3 bloomAcc = vec3(0.0);
    float r = 1.5;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7853981633974483;
        vec2 off = vec2(cos(a), sin(a)) * uTexel * r;
        vec3 s = texture2D(uTex, vUV + off).rgb;
        float l = luma(s);
        float excess = max(l - uBloomThreshold, 0.0);
        bloomAcc += s * excess;
    }
    vec3 colored = base + bloomAcc * (uBloomStrength * 0.125);

    // Chromatic aberration: shift R/B sample radially from screen center.
    vec2 dir = vUV - vec2(0.5);
    float chrom = uChromatic * (1.0 + 0.25 * sin(uTime * 60.0));
    vec2 offR = dir * chrom;
    vec2 offB = -dir * chrom;
    float chR = texture2D(uTex, vUV + offR).r;
    float chB = texture2D(uTex, vUV + offB).b;
    colored.r = mix(colored.r, chR, min(uChromatic * 80.0, 1.0));
    colored.b = mix(colored.b, chB, min(uChromatic * 80.0, 1.0));

    // Per-biome color grade.
    colored *= uColorGrade;

    // Vignette: smooth radial darken.
    float d = length(dir) * 1.4142135624;
    float v = smoothstep(0.55, 1.0, d);
    colored *= mix(1.0, 1.0 - v, uVignette);

    gl_FragColor = vec4(colored, 1.0);
}
`;

const BIOME_GRADE = {
    fire:  [1.10, 0.95, 0.85],
    water: [0.90, 0.98, 1.12],
    ice:   [0.95, 1.02, 1.10],
    plant: [0.95, 1.10, 0.92],
    metal: [1.02, 1.02, 1.05],
    black: [0.85, 0.85, 0.95],
};
const DEFAULT_GRADE = [1.0, 1.0, 1.0];

let _gl = null;
let _glReady = false;
let _glFailed = false;
let _overlay = null;
let _program = null;
let _texture = null;
let _vbo = null;
let _uLoc = null;
let _aPos = -1;
let _lastW = 0;
let _lastH = 0;
let _hidden = true;
let _t0 = 0;

function _isReducedMotion() {
    const fn = globalThis.isReducedMotion;
    return typeof fn === 'function' ? !!fn() : false;
}

function _compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh);
        gl.deleteShader(sh);
        throw new Error('postFX shader compile failed: ' + log);
    }
    return sh;
}

function _initGL() {
    if (_glReady || _glFailed) return _glReady;
    if (!_hasDOM) { _glFailed = true; return false; }

    const srcCanvas = globalThis.canvas;
    if (!srcCanvas || typeof srcCanvas.getContext !== 'function') {
        _glFailed = true;
        return false;
    }

    try {
        _overlay = document.createElement('canvas');
        _overlay.id = 'postFxCanvas';
        _overlay.width  = srcCanvas.width  || 1;
        _overlay.height = srcCanvas.height || 1;
        _overlay.style.cssText =
            'position:absolute;left:0;top:0;width:100%;height:100%;' +
            'pointer-events:none;z-index:2;display:none;';
        document.body.appendChild(_overlay);

        const opts = { alpha: false, premultipliedAlpha: false, antialias: false, depth: false, stencil: false };
        _gl = _overlay.getContext('webgl', opts) || _overlay.getContext('experimental-webgl', opts);
        if (!_gl) throw new Error('webgl not available');

        const gl = _gl;
        const vs = _compile(gl, gl.VERTEX_SHADER, VERT_SRC);
        const fs = _compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
        _program = gl.createProgram();
        gl.attachShader(_program, vs);
        gl.attachShader(_program, fs);
        gl.linkProgram(_program);
        if (!gl.getProgramParameter(_program, gl.LINK_STATUS)) {
            throw new Error('postFX link failed: ' + gl.getProgramInfoLog(_program));
        }
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        _aPos = gl.getAttribLocation(_program, 'aPos');
        _uLoc = {
            uTex:            gl.getUniformLocation(_program, 'uTex'),
            uTexel:          gl.getUniformLocation(_program, 'uTexel'),
            uChromatic:      gl.getUniformLocation(_program, 'uChromatic'),
            uVignette:       gl.getUniformLocation(_program, 'uVignette'),
            uBloomThreshold: gl.getUniformLocation(_program, 'uBloomThreshold'),
            uBloomStrength:  gl.getUniformLocation(_program, 'uBloomStrength'),
            uColorGrade:     gl.getUniformLocation(_program, 'uColorGrade'),
            uTime:           gl.getUniformLocation(_program, 'uTime'),
        };

        _vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, _vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  1, -1, -1,  1,
            -1,  1,  1, -1,  1,  1,
        ]), gl.STATIC_DRAW);

        _texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, _texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        _overlay.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            _glReady = false;
        }, false);
        _overlay.addEventListener('webglcontextrestored', () => {
            _glReady = false;
            _glFailed = false;
            _initGL();
        }, false);

        _t0 = performance.now ? performance.now() : Date.now();
        _glReady = true;
        return true;
    } catch (err) {
        console.warn('[postFX] init failed, disabling:', err && err.message);
        _glFailed = true;
        if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
        _overlay = null;
        _gl = null;
        return false;
    }
}

function _hideOverlay() {
    if (_overlay && !_hidden) {
        _overlay.style.display = 'none';
        _hidden = true;
    }
}

function _showOverlay() {
    if (_overlay && _hidden) {
        _overlay.style.display = 'block';
        _hidden = false;
    }
}

export function renderPostFX() {
    if (!_hasDOM) return;

    const cfg = globalThis.gameConfig;
    const enabled = cfg ? cfg.postFX !== false : true;
    if (!enabled || _isReducedMotion()) {
        _hideOverlay();
        return;
    }

    if (!_glReady && !_glFailed) _initGL();
    if (!_glReady) { _hideOverlay(); return; }

    const srcCanvas = globalThis.canvas;
    if (!srcCanvas) { _hideOverlay(); return; }

    const sw = srcCanvas.width  | 0;
    const sh = srcCanvas.height | 0;
    if (sw <= 0 || sh <= 0) { _hideOverlay(); return; }

    if (sw !== _lastW || sh !== _lastH) {
        _overlay.width  = sw;
        _overlay.height = sh;
        _gl.viewport(0, 0, sw, sh);
        _lastW = sw;
        _lastH = sh;
    }

    const gl = _gl;
    gl.bindTexture(gl.TEXTURE_2D, _texture);
    try {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    } catch (err) {
        // Source canvas may be tainted / not uploadable this frame; bail cleanly.
        _hideOverlay();
        return;
    }

    // ── Uniform feed ───────────────────────────────────────────────────
    const player = globalThis.player;
    let vig = 0;
    if (player && typeof player.hp === 'number' && typeof player.maxHp === 'number' && player.maxHp > 0) {
        const ratio = Math.max(0, Math.min(1, player.hp / player.maxHp));
        vig = (1 - ratio) * 0.7;
        if (ratio < 0.3) {
            const t = (performance.now ? performance.now() : Date.now()) / 1000;
            vig *= 1.0 + 0.18 * Math.sin(t * 6.0);
        }
    }

    const hitStop = +globalThis._hitStopFrames || 0;
    const chrom = Math.max(0, Math.min(1, hitStop / 12)) * 0.012;

    const biome = globalThis.currentBiomeType;
    const grade = (biome && BIOME_GRADE[biome]) || DEFAULT_GRADE;

    const now = performance.now ? performance.now() : Date.now();
    const time = (now - _t0) / 1000;

    gl.useProgram(_program);
    gl.bindBuffer(gl.ARRAY_BUFFER, _vbo);
    gl.enableVertexAttribArray(_aPos);
    gl.vertexAttribPointer(_aPos, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, _texture);
    gl.uniform1i(_uLoc.uTex, 0);
    gl.uniform2f(_uLoc.uTexel, 1 / sw, 1 / sh);
    gl.uniform1f(_uLoc.uChromatic, chrom);
    gl.uniform1f(_uLoc.uVignette, Math.max(0, Math.min(1, vig)));
    gl.uniform1f(_uLoc.uBloomThreshold, 0.75);
    gl.uniform1f(_uLoc.uBloomStrength, 0.6);
    gl.uniform3f(_uLoc.uColorGrade, grade[0], grade[1], grade[2]);
    gl.uniform1f(_uLoc.uTime, time);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    _showOverlay();
}
