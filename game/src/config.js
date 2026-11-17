// Kunang — Lantern of the Night Garden: every number the game tunes by lives here,
// so the world, the renderer and the screenshot scenes all read the same values.

export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;
export const BEST_KEY = 'kunang-best-score';

export const LANTERN = {
  startLight: 100,
  maxLight: 100,
  drainPerSecond: 2.1,
  drainPerLevel: 0.22,
  orbLight: 15,
  lowLightWarn: 28,
  respawnLight: 55,
};

export const PLAYER = {
  radius: 15,
  accel: 2400,
  maxSpeed: 330,
  damping: 0.86,
  mouseSpeed: 420,
  invulnerableSeconds: 2.0,
  knockback: 260,
};

export const LIVES = 3;

export const ORB = {
  radius: 9,
  spawnEvery: 0.85,
  spawnEveryMin: 0.38,
  value: 10,
  comboWindow: 2.6,
  comboMax: 8,
  lifeSeconds: 9,
};

export const MOTH = {
  radius: 17,
  spawnEvery: 2.4,
  spawnEveryMin: 1.1,
  baseSpeed: 46,
  speedPerLevel: 9,
  wobble: 1.7,
};

export const THORN = {
  radius: 20,
  spawnEvery: 6.5,
  maxCount: 6,
  fadeSeconds: 14,
};

export const POWERUP = {
  radius: 13,
  spawnEvery: 11,
  shieldSeconds: 8,
  slowSeconds: 6,
  magnetSeconds: 6,
  magnetRadius: 230,
};

export const LEVEL = {
  secondsPerLevel: 40,
  scorePerLevel: 180,
  mothSpeedMul: 1.06,
};

// A soft indigo night, warm amber light, mint dew, violet shadow.
export const PALETTE = {
  skyTop: '#070b1d',
  skyMid: '#101736',
  skyBottom: '#1c2547',
  moon: '#f6e7b8',
  moonGlow: 'rgba(246, 231, 184, 0.28)',
  star: '#dfe6ff',
  farTree: '#0d1330',
  bush: '#131c3d',
  flowerGlow: '#8ef0c8',
  grass: '#16224a',
  orb: '#8ef0c8',
  orbCore: '#eafff5',
  moth: '#7a5cff',
  mothDark: '#3a2a7a',
  thorn: '#ff5d73',
  thornDark: '#7c1f33',
  player: '#ffd97a',
  playerCore: '#fff6d8',
  shield: '#7fd4ff',
  hudText: '#eef2ff',
  hudDim: '#9aa6d6',
  danger: '#ff6b7a',
  gold: '#ffd97a',
};
