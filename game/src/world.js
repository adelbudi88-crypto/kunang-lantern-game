// The night garden itself: the firefly, the dew orbs, the shadow moths, the
// thorn brambles and the power-ups, and the rules that move them. The world
// advances in fixed 1/60 s steps and reports what happened as event bits, so
// the loop, the sounds and the screenshot scenes all read the same truth.

import {
  FIELD,
  LANTERN,
  PLAYER,
  LIVES,
  ORB,
  MOTH,
  THORN,
  POWERUP,
  LEVEL,
} from './config.js';

export const EVENT_ORB = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_POWERUP = 8;
export const EVENT_LEVEL = 16;

const KIND_ORB = 'orb';
const KIND_MOTH = 'moth';
const KIND_THORN = 'thorn';
const KIND_POWERUP = 'powerup';

export const POWER_SHIELD = 'shield';
export const POWER_SLOW = 'slow';
export const POWER_MAGNET = 'magnet';

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      time: 0,
      score: 0,
      best: 0,
      lives: LIVES,
      level: 1,
      light: LANTERN.startLight,
      combo: 0,
      comboTimer: 0,
      shieldTimer: 0,
      slowTimer: 0,
      magnetTimer: 0,
      invulnerableTimer: 0,
      shake: 0,
      elapsed: 0,
      orbsCollected: 0,
      player: {
        x: FIELD.width / 2,
        y: FIELD.height * 0.62,
        vx: 0,
        vy: 0,
        wing: 0,
        trail: [],
      },
      items: [],
      floaters: [],
      sparks: [],
      fireflies: [],
      orbTimer: 0.4,
      mothTimer: 1.6,
      thornTimer: 4.5,
      powerTimer: 8,
    };
  }

  function seedBackdrop() {
    state.fireflies = [];
    for (let i = 0; i < 26; i += 1) {
      state.fireflies.push({
        x: random.range(0, FIELD.width),
        y: random.range(40, FIELD.height - 60),
        phase: random.range(0, Math.PI * 2),
        speed: random.range(0.3, 0.9),
        size: random.range(1.2, 2.6),
      });
    }
  }

  function spawnOrb() {
    state.items.push({
      kind: KIND_ORB,
      x: random.range(36, FIELD.width - 36),
      y: random.range(70, FIELD.height - 90),
      radius: ORB.radius,
      age: 0,
      life: ORB.lifeSeconds * random.range(0.85, 1.2),
      phase: random.range(0, Math.PI * 2),
      active: true,
    });
  }

  function spawnMoth() {
    const fromLeft = random.next() < 0.5;
    state.items.push({
      kind: KIND_MOTH,
      x: fromLeft ? -24 : FIELD.width + 24,
      y: random.range(60, FIELD.height - 120),
      radius: MOTH.radius,
      vx: (fromLeft ? 1 : -1) * MOTH.baseSpeed * random.range(0.85, 1.2),
      phase: random.range(0, Math.PI * 2),
      age: 0,
      active: true,
    });
  }

  function spawnThorn() {
    if (state.items.filter((item) => item.kind === KIND_THORN && item.active).length >= THORN.maxCount) return;
    state.items.push({
      kind: KIND_THORN,
      x: random.range(60, FIELD.width - 60),
      y: random.range(FIELD.height - 150, FIELD.height - 46),
      radius: THORN.radius * random.range(0.85, 1.25),
      age: 0,
      life: THORN.fadeSeconds * random.range(1, 1.6),
      phase: random.range(0, Math.PI * 2),
      active: true,
    });
  }

  function spawnPowerup() {
    state.items.push({
      kind: KIND_POWERUP,
      power: random.pick([POWER_SHIELD, POWER_SLOW, POWER_MAGNET]),
      x: random.range(50, FIELD.width - 50),
      y: random.range(80, FIELD.height - 120),
      radius: POWERUP.radius,
      age: 0,
      life: 10,
      phase: random.range(0, Math.PI * 2),
      active: true,
    });
  }

  function addFloater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, age: 0, life: 0.9 });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, Math.PI * 2);
      const v = random.range(speed * 0.3, speed);
      state.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        age: 0,
        life: random.range(0.35, 0.7),
        color,
        size: random.range(1.5, 3.5),
      });
    }
  }

  function loseLife(causeX, causeY) {
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.invulnerableTimer = PLAYER.invulnerableSeconds;
    state.shake = 10;
    state.light = LANTERN.respawnLight;
    const player = state.player;
    const dx = player.x - causeX;
    const dy = player.y - causeY;
    const len = Math.hypot(dx, dy) || 1;
    player.vx = (dx / len) * PLAYER.knockback;
    player.vy = (dy / len) * PLAYER.knockback;
    burst(player.x, player.y, '#ff6b7a', 22, 220);
    if (state.lives <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  function levelFor(time, score) {
    const byTime = 1 + Math.floor(time / LEVEL.secondsPerLevel);
    const byScore = 1 + Math.floor(score / LEVEL.scorePerLevel);
    return Math.max(byTime, byScore);
  }

  function step(dt, steering, demo) {
    let events = 0;
    state.time += dt;
    if (!demo) state.elapsed += dt;

    // The lantern always burns down; the night never waits.
    if (!demo) {
      state.light -= (LANTERN.drainPerSecond + (state.level - 1) * LANTERN.drainPerLevel) * dt;
      if (state.light <= 0) {
        state.light = 0;
        if (state.invulnerableTimer <= 0) {
          events |= loseLife(state.player.x, state.player.y - 40);
          if (events & EVENT_OVER) return events;
        } else {
          state.light = 1;
        }
      }
    }

    // Timers tick down.
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
    state.shieldTimer = Math.max(0, state.shieldTimer - dt);
    state.slowTimer = Math.max(0, state.slowTimer - dt);
    state.magnetTimer = Math.max(0, state.magnetTimer - dt);
    state.invulnerableTimer = Math.max(0, state.invulnerableTimer - dt);
    state.shake = Math.max(0, state.shake - dt * 26);

    // Level up when the clock or the score says so.
    if (!demo) {
      const nextLevel = levelFor(state.elapsed, state.score);
      if (nextLevel > state.level) {
        state.level = nextLevel;
        events |= EVENT_LEVEL;
        addFloater(state.player.x, state.player.y - 44, `LEVEL ${nextLevel}`, '#ffd97a');
      }
    }

    // Steering: keys accelerate, the mouse glides toward the cursor.
    const player = state.player;
    player.wing += dt * 22;
    if (steering.keys) {
      player.vx += steering.keys.x * PLAYER.accel * dt;
      player.vy += steering.keys.y * PLAYER.accel * dt;
    } else if (steering.mouse) {
      const dx = steering.mouse.x - player.x;
      const dy = steering.mouse.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const speed = Math.min(PLAYER.mouseSpeed, dist * 6);
        player.vx = (dx / dist) * speed;
        player.vy = (dy / dist) * speed;
      } else {
        player.vx *= 0.8;
        player.vy *= 0.8;
      }
    }
    const speed = Math.hypot(player.vx, player.vy);
    const cap = PLAYER.maxSpeed * (1 + (state.level - 1) * 0.03);
    if (speed > cap) {
      player.vx = (player.vx / speed) * cap;
      player.vy = (player.vy / speed) * cap;
    }
    player.vx *= Math.pow(PLAYER.damping, dt * 60);
    player.vy *= Math.pow(PLAYER.damping, dt * 60);
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius + 26, player.y + player.vy * dt));

    // A fading trail of light follows the firefly.
    player.trail.unshift({ x: player.x, y: player.y, age: 0 });
    if (player.trail.length > 14) player.trail.pop();
    for (const dot of player.trail) dot.age += dt;

    // Spawning, paced by the level.
    state.orbTimer -= dt;
    if (state.orbTimer <= 0) {
      spawnOrb();
      const interval = Math.max(ORB.spawnEveryMin, ORB.spawnEvery - (state.level - 1) * 0.06);
      state.orbTimer = interval * random.range(0.8, 1.25);
    }
    state.mothTimer -= dt;
    if (state.mothTimer <= 0) {
      spawnMoth();
      const interval = Math.max(MOTH.spawnEveryMin, MOTH.spawnEvery - (state.level - 1) * 0.14);
      state.mothTimer = interval * random.range(0.8, 1.3);
    }
    state.thornTimer -= dt;
    if (state.thornTimer <= 0) {
      spawnThorn();
      state.thornTimer = THORN.spawnEvery * random.range(0.9, 1.3);
    }
    state.powerTimer -= dt;
    if (state.powerTimer <= 0) {
      spawnPowerup();
      state.powerTimer = POWERUP.spawnEvery * random.range(0.9, 1.2);
    }

    // Ambient fireflies drift on their own slow paths.
    for (const fly of state.fireflies) {
      fly.phase += dt * fly.speed;
      fly.x += Math.sin(fly.phase * 0.6) * 12 * dt;
      fly.y += Math.cos(fly.phase * 0.45) * 9 * dt;
      if (fly.x < -10) fly.x = FIELD.width + 10;
      if (fly.x > FIELD.width + 10) fly.x = -10;
    }

    const slowMul = state.slowTimer > 0 ? 0.45 : 1;

    // Move every item, age it out, and resolve what it means for the player.
    for (const item of state.items) {
      if (!item.active) continue;
      item.age += dt;
      if (item.age > item.life) {
        item.active = false;
        continue;
      }
      if (item.kind === KIND_MOTH) {
        item.phase += dt * MOTH.wobble;
        item.x += item.vx * slowMul * dt * (1 + (state.level - 1) * 0.05);
        item.y += Math.sin(item.phase) * 34 * dt;
        if (item.x < -40 || item.x > FIELD.width + 40) item.active = false;
      }
      if (item.kind === KIND_POWERUP || item.kind === KIND_ORB) {
        item.y += Math.sin(item.age * 1.8 + item.phase) * 6 * dt;
      }
      if (item.kind === KIND_ORB && state.magnetTimer > 0) {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const dist = Math.hypot(dx, dy);
        if (dist < POWERUP.magnetRadius && dist > 4) {
          item.x += (dx / dist) * 300 * dt;
          item.y += (dy / dist) * 300 * dt;
        }
      }

      const dx = player.x - item.x;
      const dy = player.y - item.y;
      const reach = PLAYER.radius + item.radius - 4;
      if (dx * dx + dy * dy > reach * reach) continue;

      if (item.kind === KIND_ORB) {
        item.active = false;
        state.orbsCollected += 1;
        state.combo = state.comboTimer > 0 ? Math.min(state.combo + 1, ORB.comboMax) : 1;
        state.comboTimer = ORB.comboWindow;
        const gained = ORB.value * state.combo;
        state.score += gained;
        state.light = Math.min(LANTERN.maxLight, state.light + LANTERN.orbLight);
        addFloater(item.x, item.y - 14, `+${gained}`, '#8ef0c8');
        burst(item.x, item.y, '#8ef0c8', 10, 140);
        events |= EVENT_ORB;
      } else if (item.kind === KIND_POWERUP) {
        item.active = false;
        if (item.power === POWER_SHIELD) state.shieldTimer = POWERUP.shieldSeconds;
        if (item.power === POWER_SLOW) state.slowTimer = POWERUP.slowSeconds;
        if (item.power === POWER_MAGNET) state.magnetTimer = POWERUP.magnetSeconds;
        addFloater(
          item.x,
          item.y - 14,
          item.power === POWER_SHIELD ? 'SHIELD!' : item.power === POWER_SLOW ? 'SLOW TIME!' : 'MAGNET!',
          '#7fd4ff',
        );
        burst(item.x, item.y, '#7fd4ff', 14, 170);
        events |= EVENT_POWERUP;
      } else if (item.kind === KIND_MOTH || item.kind === KIND_THORN) {
        if (state.invulnerableTimer > 0) continue;
        if (state.shieldTimer > 0) {
          item.active = false;
          state.shieldTimer = 0;
          burst(item.x, item.y, '#7fd4ff', 18, 200);
          addFloater(item.x, item.y - 16, 'SHIELD HELD', '#7fd4ff');
          events |= EVENT_HIT;
          continue;
        }
        events |= loseLife(item.x, item.y);
        if (events & EVENT_OVER) return events;
      }
    }

    state.items = state.items.filter((item) => item.active);

    // Floating score texts rise and fade; sparks fly and fade.
    for (const floater of state.floaters) {
      floater.age += dt;
      floater.y -= 34 * dt;
    }
    state.floaters = state.floaters.filter((f) => f.age < f.life);
    for (const spark of state.sparks) {
      spark.age += dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.96;
      spark.vy *= 0.96;
    }
    state.sparks = state.sparks.filter((s) => s.age < s.life);

    return events;
  }

  function reset() {
    const keepBest = state.best;
    Object.assign(state, freshState());
    state.best = keepBest;
    seedBackdrop();
  }

  seedBackdrop();

  return {
    state,
    reset,
    step,
    kinds: { KIND_ORB, KIND_MOTH, KIND_THORN, KIND_POWERUP },
  };
}
