export interface RainWaterSettings {
	/** How visible the lit ripples are over the dark surface, 0–1. */
	intensity: number;
	/** Scales how hard each drop pushes the surface. */
	rippleStrength: number;
	/** Fraction of wave velocity kept per simulation step. */
	damping: number;
	/** Average drops per second, divided by the base rate below. */
	dropFrequency: number;
	/** Strength of the specular glint on ripple crests, 0–1. */
	surfaceReflection: number;
}

export interface RainWaterColors {
	/** RGB 0–1: the dark water beneath everything. */
	surface: [number, number, number];
	/** RGB 0–1: the blue that ripples catch. */
	highlight: [number, number, number];
}

interface Drop {
	x: number;
	y: number;
	radius: number;
	strength: number;
	lifetime: number;
	age: number;
}

interface HeightField {
	texture: WebGLTexture;
	framebuffer: WebGLFramebuffer;
}

const MAX_ACTIVE_DROPS = 8;
const SIM_TEXEL_CSS_PX = 4;
const MAX_SIM_WIDTH = 512;
const STEP_SECONDS = 1 / 60;
const MAX_STEPS_PER_FRAME = 3;
const DROPS_PER_SECOND_AT_FULL_FREQUENCY = 4;
const STRONG_DROP_CHANCE = 0.08;

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
	vUv = aPosition * 0.5 + 0.5;
	gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/**
 * One finite-difference step of the 2D wave equation. R holds height, G holds
 * vertical velocity. Drops are added as circular impulses before the step, so
 * every ring on screen is the equation spreading that impulse outward.
 */
const WAVE_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uSimSize;
uniform float uDamping;
uniform int uDropCount;
uniform vec4 uDrops[${MAX_ACTIVE_DROPS}];

in vec2 vUv;
out vec4 outState;

void main() {
	vec4 state = texture(uState, vUv);

	for (int i = 0; i < ${MAX_ACTIVE_DROPS}; i++) {
		if (i >= uDropCount) break;
		vec4 drop = uDrops[i];
		float d = distance(vUv * uSimSize, drop.xy * uSimSize);
		state.r += (1.0 - smoothstep(0.0, drop.z, d)) * drop.w;
	}

	float north = texture(uState, vUv + vec2(0.0, uTexel.y)).r;
	float south = texture(uState, vUv - vec2(0.0, uTexel.y)).r;
	float east = texture(uState, vUv + vec2(uTexel.x, 0.0)).r;
	float west = texture(uState, vUv - vec2(uTexel.x, 0.0)).r;
	// Diagonals keep rings round; the four-neighbour average alone squares them off.
	float diagonals = texture(uState, vUv + uTexel).r
		+ texture(uState, vUv - uTexel).r
		+ texture(uState, vUv + vec2(uTexel.x, -uTexel.y)).r
		+ texture(uState, vUv + vec2(-uTexel.x, uTexel.y)).r;
	float average = ((north + south + east + west) * 4.0 + diagonals) / 20.0;

	state.g += (average - state.r) * 2.0;
	state.g *= uDamping;
	state.r += state.g;
	// Lets the mean level settle back to zero so half floats keep their precision.
	state.r *= 0.999;

	outState = state;
}`;

const SURFACE_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uAspect;
uniform float uIntensity;
uniform float uReflection;
uniform vec3 uSurface;
uniform vec3 uHighlight;

in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
	vec2 cell = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(cell), hash(cell + vec2(1.0, 0.0)), u.x),
		mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

vec3 depths(vec2 uv) {
	vec2 p = vec2(uv.x * uAspect, uv.y);
	float murk = noise(p * 3.0) * 0.6 + noise(p * 7.0) * 0.4;
	float glow = exp(-pow(distance(p, vec2(0.5 * uAspect, 0.85)) * 1.6, 2.0));
	// Dark water deepens toward the bottom; on a light surface that same shading
	// reads as grime, so it gives way to a faint tint of the highlight instead.
	float light = smoothstep(0.35, 0.65, dot(uSurface, vec3(0.2126, 0.7152, 0.0722)));
	vec3 color = uSurface * mix(mix(0.82, 1.08, uv.y), 1.0, light);
	color = mix(color, uHighlight, glow * 0.07 + murk * 0.025 + (1.0 - uv.y) * 0.05 * light);
	return color;
}

void main() {
	float east = texture(uState, vUv + vec2(uTexel.x, 0.0)).r;
	float west = texture(uState, vUv - vec2(uTexel.x, 0.0)).r;
	float north = texture(uState, vUv + vec2(0.0, uTexel.y)).r;
	float south = texture(uState, vUv - vec2(0.0, uTexel.y)).r;
	vec3 normal = normalize(vec3(west - east, south - north, 0.35));

	vec3 color = depths(vUv + normal.xy * 0.02);

	vec3 light = normalize(vec3(-0.35, 0.6, 1.0));
	float slopeLight = dot(normal, light) - light.z;
	color = mix(color, uHighlight, clamp(slopeLight * 3.0, 0.0, 1.0) * uIntensity);
	color *= 1.0 - clamp(-slopeLight * 2.0, 0.0, 1.0) * uIntensity * 0.5;

	vec3 reflected = reflect(vec3(0.0, 0.0, -1.0), normal);
	float glint = pow(max(dot(reflected, light), 0.0), 90.0) * uReflection;
	color += mix(uHighlight, vec3(1.0), 0.6) * glint;

	outColor = vec4(color, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);
	if (!shader) throw new Error("Could not create shader");

	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		throw new Error(gl.getShaderInfoLog(shader) ?? "Shader failed to compile");
	}
	return shader;
}

function link(gl: WebGL2RenderingContext, fragmentSource: string) {
	const program = gl.createProgram();
	gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
	gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
	gl.bindAttribLocation(program, 0, "aPosition");
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error(gl.getProgramInfoLog(program) ?? "Program failed to link");
	}

	const uniforms = new Map<string, WebGLUniformLocation | null>();
	const uniform = (name: string) => {
		if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name));
		return uniforms.get(name) ?? null;
	};

	return { program, uniform };
}

function createHeightField(gl: WebGL2RenderingContext, width: number, height: number): HeightField {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	return { texture, framebuffer };
}

const random = () => Math.random(); // NOSONAR: only decides where decorative raindrops land

/** Exponential gaps read as rain; evenly spaced drops read as a metronome. */
function nextSpawnInterval(dropFrequency: number) {
	const rate = Math.max(dropFrequency, 0.01) * DROPS_PER_SECOND_AT_FULL_FREQUENCY;
	return Math.max(0.03, -Math.log(1 - random()) / rate);
}

function createDrop(rippleStrength: number): Drop {
	const strong = random() < STRONG_DROP_CHANCE;

	return {
		x: random(),
		y: random(),
		radius: strong ? 4 + random() * 3 : 1.5 + random() * 1.5,
		strength: rippleStrength * (strong ? 2.2 + random() : 0.5 + random() * 0.5),
		lifetime: strong ? 0.06 + random() * 0.04 : 0.02 + random() * 0.03,
		age: 0,
	};
}

/**
 * Runs the rain-on-water heightfield on a canvas. Returns null when the GPU
 * cannot render to float textures, so the caller can simply show nothing.
 */
export function createRainWater(canvas: HTMLCanvasElement) {
	const gl = canvas.getContext("webgl2", {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: "low-power",
	});
	if (!gl?.getExtension("EXT_color_buffer_float")) return null;

	const wave = link(gl, WAVE_SHADER);
	const surface = link(gl, SURFACE_SHADER);

	const quad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quad);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	let fields: [HeightField, HeightField] | null = null;
	let simWidth = 0;
	let simHeight = 0;
	let drops: Drop[] = [];
	let untilNextDrop = 0;
	let pendingTime = 0;
	const dropUniforms = new Float32Array(MAX_ACTIVE_DROPS * 4);

	const disposeFields = () => {
		fields?.forEach(({ texture, framebuffer }) => {
			gl.deleteTexture(texture);
			gl.deleteFramebuffer(framebuffer);
		});
		fields = null;
	};

	const resize = (cssWidth: number, cssHeight: number, pixelRatio: number) => {
		canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
		canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));

		const width = Math.min(MAX_SIM_WIDTH, Math.max(1, Math.round(cssWidth / SIM_TEXEL_CSS_PX)));
		const height = Math.max(1, Math.round((width * cssHeight) / Math.max(cssWidth, 1)));
		if (fields && width === simWidth && height === simHeight) return;

		disposeFields();
		simWidth = width;
		simHeight = height;
		fields = [createHeightField(gl, width, height), createHeightField(gl, width, height)];
	};

	const step = (settings: RainWaterSettings) => {
		if (!fields) return;

		const [read, write] = fields;
		let dropCount = 0;
		for (const drop of drops) {
			if (dropCount === MAX_ACTIVE_DROPS) break;
			const share = Math.min(STEP_SECONDS, drop.lifetime - drop.age) / drop.lifetime;
			dropUniforms.set([drop.x, drop.y, drop.radius, drop.strength * share], dropCount * 4);
			drop.age += STEP_SECONDS;
			dropCount++;
		}
		drops = drops.filter((drop) => drop.age < drop.lifetime);

		gl.useProgram(wave.program);
		gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
		gl.viewport(0, 0, simWidth, simHeight);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, read.texture);
		gl.uniform1i(wave.uniform("uState"), 0);
		gl.uniform2f(wave.uniform("uTexel"), 1 / simWidth, 1 / simHeight);
		gl.uniform2f(wave.uniform("uSimSize"), simWidth, simHeight);
		gl.uniform1f(wave.uniform("uDamping"), settings.damping);
		gl.uniform1i(wave.uniform("uDropCount"), dropCount);
		gl.uniform4fv(wave.uniform("uDrops"), dropUniforms);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		fields = [write, read];
	};

	const draw = (settings: RainWaterSettings, colors: RainWaterColors) => {
		if (!fields) return;

		gl.useProgram(surface.program);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, fields[0].texture);
		gl.uniform1i(surface.uniform("uState"), 0);
		gl.uniform2f(surface.uniform("uTexel"), 1 / simWidth, 1 / simHeight);
		gl.uniform1f(surface.uniform("uAspect"), canvas.width / canvas.height);
		gl.uniform1f(surface.uniform("uIntensity"), settings.intensity);
		gl.uniform1f(surface.uniform("uReflection"), settings.surfaceReflection);
		gl.uniform3fv(surface.uniform("uSurface"), colors.surface);
		gl.uniform3fv(surface.uniform("uHighlight"), colors.highlight);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};

	/** Advances the water by `elapsed` seconds on a fixed 60 Hz step, then draws it. */
	const frame = (elapsed: number, settings: RainWaterSettings, colors: RainWaterColors) => {
		pendingTime = Math.min(pendingTime + elapsed, STEP_SECONDS * MAX_STEPS_PER_FRAME);

		while (pendingTime >= STEP_SECONDS) {
			untilNextDrop -= STEP_SECONDS;
			if (untilNextDrop <= 0) {
				drops.push(createDrop(settings.rippleStrength));
				untilNextDrop = nextSpawnInterval(settings.dropFrequency);
			}
			step(settings);
			pendingTime -= STEP_SECONDS;
		}

		draw(settings, colors);
	};

	const dispose = () => {
		disposeFields();
		gl.deleteBuffer(quad);
		gl.deleteProgram(wave.program);
		gl.deleteProgram(surface.program);
	};

	return { resize, frame, draw, dispose };
}
