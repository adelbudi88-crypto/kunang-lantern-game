// Everything the eye sees: a parallax night garden, the glowing firefly, the
// dew orbs, the shadow moths, the thorn brambles, and the HUD and menus over
// them. The canvas fills the window; the 960x600 garden is letterboxed inside
// it so the game always reads the same at any window size.

import { FIELD, PALETTE, PLAYER, LIVES, LANTERN } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function makeStars() {
  const stars = [];
  let s = 1234567;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 90; i += 1) {
    stars.push({
      x: next() * FIELD.width,
      y: next() * FIELD.height * 0.5,
      r: 0.6 + next() * 1.4,
      phase: next() * Math.PI * 2,
      speed: 0.5 + next() * 1.5,
    });
  }
  return stars;
}

function makeFlowers() {
  const flowers = [];
  let s = 987654321;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 14; i += 1) {
    flowers.push({
      x: 30 + next() * (FIELD.width - 60),
      y: FIELD.height - 150 + next() * 110,
      phase: next() * Math.PI * 2,
      hue: next(),
    });
  }
  return flowers;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = makeStars();
  const flowers = makeFlowers();
  let view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view = {
      scale,
      ox: (canvas.width - FIELD.width * scale) / 2,
      oy: (canvas.height - FIELD.height * scale) / 2,
      w: canvas.width,
      h: canvas.height,
    };
  }

  window.addEventListener('resize', resize);
  resize();

  function glowCircle(x, y, radius, color, alpha) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSky(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const star of stars) {
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(time * star.speed + star.phase));
      ctx.globalAlpha = twinkle * 0.9;
      ctx.fillStyle = PALETTE.star;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The moon, low and warm, with a soft halo.
    glowCircle(830, 92, 90, PALETTE.moonGlow, 0.9);
    ctx.fillStyle = PALETTE.moon;
    ctx.beginPath();
    ctx.arc(830, 92, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(190, 175, 130, 0.5)';
    ctx.beginPath();
    ctx.arc(820, 84, 7, 0, Math.PI * 2);
    ctx.arc(840, 100, 5, 0, Math.PI * 2);
    ctx.arc(836, 78, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGarden(time, state) {
    // Far tree line.
    ctx.fillStyle = PALETTE.farTree;
    ctx.beginPath();
    ctx.moveTo(0, 470);
    for (let x = 0; x <= FIELD.width; x += 60) {
      const h = 34 + 26 * Math.abs(Math.sin(x * 0.021 + 1.7));
      ctx.lineTo(x, 470 - h);
      ctx.lineTo(x + 30, 470 - h * 0.55);
    }
    ctx.lineTo(FIELD.width, 470);
    ctx.lineTo(FIELD.width, FIELD.height);
    ctx.lineTo(0, FIELD.height);
    ctx.closePath();
    ctx.fill();

    // Mid bushes with glowing night flowers.
    ctx.fillStyle = PALETTE.bush;
    for (let x = -20; x < FIELD.width + 40; x += 90) {
      ctx.beginPath();
      ctx.ellipse(x + 45, FIELD.height - 42, 62, 42, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    for (const flower of flowers) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 1.6 + flower.phase);
      const color = flower.hue < 0.5 ? PALETTE.flowerGlow : '#ffd97a';
      glowCircle(flower.x, flower.y, 16 + pulse * 8, color, 0.35 * pulse);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.75 + 0.25 * pulse;
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * Math.PI * 2 + flower.phase;
        ctx.beginPath();
        ctx.arc(flower.x + Math.cos(a) * 5, flower.y + Math.sin(a) * 5, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Foreground grass blades, swaying.
    ctx.strokeStyle = PALETTE.grass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 8; x < FIELD.width; x += 16) {
      const sway = Math.sin(time * 1.1 + x * 0.05) * 5;
      ctx.moveTo(x, FIELD.height);
      ctx.quadraticCurveTo(x + sway, FIELD.height - 18, x + sway * 1.6, FIELD.height - 30);
    }
    ctx.stroke();

    // Ambient fireflies drifting through the garden.
    for (const fly of state.fireflies) {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(fly.phase * 2));
      glowCircle(fly.x, fly.y, 9, '#ffd97a', 0.5 * twinkle);
      ctx.fillStyle = '#fff6d8';
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, fly.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawOrb(item, time) {
    const bob = Math.sin(item.age * 1.8 + item.phase) * 3;
    const pulse = 1 + 0.12 * Math.sin(time * 3 + item.phase);
    const fade = item.age > item.life - 1.5 ? Math.max(0, (item.life - item.age) / 1.5) : 1;
    ctx.globalAlpha = fade;
    glowCircle(item.x, item.y + bob, 26 * pulse, PALETTE.orb, 0.5);
    ctx.fillStyle = PALETTE.orbCore;
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, item.radius * 0.62 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.orb;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, item.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawMoth(item, time) {
    const flap = Math.sin(time * 14 + item.phase) * 0.55;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(Math.sin(item.phase) * 0.15);
    glowCircle(0, 0, 34, PALETTE.moth, 0.35);
    ctx.fillStyle = PALETTE.mothDark;
    // Two wings, beating.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(flap * 0.5);
      ctx.beginPath();
      ctx.ellipse(13, -4, 13, 8, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(11, 7, 10, 6, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body and pale eyes.
    ctx.fillStyle = '#2a1e55';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5d73';
    ctx.beginPath();
    ctx.arc(-2.4, -6, 1.6, 0, Math.PI * 2);
    ctx.arc(2.4, -6, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawThorn(item, time) {
    const sway = Math.sin(time * 0.9 + item.phase) * 0.06;
    const fade = item.age > item.life - 1.5 ? Math.max(0, (item.life - item.age) / 1.5) : 1;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(sway);
    ctx.globalAlpha = fade;
    glowCircle(0, 0, 30, PALETTE.thorn, 0.3);
    ctx.strokeStyle = PALETTE.thornDark;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-item.radius, 6);
    ctx.quadraticCurveTo(0, -item.radius * 0.9, item.radius, 6);
    ctx.stroke();
    // Spikes.
    ctx.fillStyle = PALETTE.thorn;
    for (let i = -2; i <= 2; i += 1) {
      const x = (i / 2) * item.radius * 0.8;
      const h = item.radius * (0.9 - Math.abs(i) * 0.14);
      ctx.beginPath();
      ctx.moveTo(x - 5, 2);
      ctx.lineTo(x, -h);
      ctx.lineTo(x + 5, 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPowerup(item, time) {
    const bob = Math.sin(item.age * 2 + item.phase) * 3;
    const color = item.power === 'shield' ? '#7fd4ff' : item.power === 'slow' ? '#c9a7ff' : '#ffd97a';
    glowCircle(item.x, item.y + bob, 30, color, 0.55);
    ctx.fillStyle = 'rgba(10, 14, 30, 0.85)';
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, item.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, item.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = item.power === 'shield' ? '◈' : item.power === 'slow' ? '◷' : '◎';
    ctx.fillText(glyph, item.x, item.y + bob + 0.5);
  }

  function drawPlayer(state, time) {
    const player = state.player;
    // Trail: fading embers behind the firefly.
    for (let i = player.trail.length - 1; i >= 0; i -= 1) {
      const dot = player.trail[i];
      const alpha = Math.max(0, 0.5 - dot.age * 1.4) * (1 - i / player.trail.length);
      if (alpha <= 0) continue;
      glowCircle(dot.x, dot.y, 10, PALETTE.player, alpha);
    }
    const flicker = 0.85 + 0.15 * Math.sin(time * 9);
    const radius = PLAYER.radius + 26 * flicker;
    glowCircle(player.x, player.y, radius, PALETTE.player, 0.5);
    glowCircle(player.x, player.y, radius * 1.9, PALETTE.player, 0.16);

    ctx.save();
    ctx.translate(player.x, player.y);
    // Wings, beating fast.
    const flap = Math.sin(player.wing) * 0.7;
    ctx.fillStyle = 'rgba(255, 246, 216, 0.75)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-0.5 - flap * 0.35);
      ctx.beginPath();
      ctx.ellipse(12, -8, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body: a warm lantern with a bright core.
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    // Eyes, looking where the firefly flies.
    const lookX = Math.max(-3, Math.min(3, player.vx * 0.012));
    const lookY = Math.max(-3, Math.min(3, player.vy * 0.012));
    ctx.fillStyle = '#241a08';
    ctx.beginPath();
    ctx.arc(-4 + lookX, -2 + lookY, 2.2, 0, Math.PI * 2);
    ctx.arc(4 + lookX, -2 + lookY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Shield bubble.
    if (state.shieldTimer > 0) {
      const pulse = 1 + 0.05 * Math.sin(time * 5);
      ctx.strokeStyle = 'rgba(127, 212, 255, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, (PLAYER.radius + 12) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Blinking while invulnerable after a hit.
    if (state.invulnerableTimer > 0 && Math.floor(time * 10) % 2 === 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawFloaters(state) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const floater of state.floaters) {
      ctx.globalAlpha = Math.max(0, 1 - floater.age / floater.life);
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawSparks(state) {
    for (const spark of state.sparks) {
      ctx.globalAlpha = Math.max(0, 1 - spark.age / spark.life);
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best, muted) {
    const pad = 18;
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText(String(state.score), pad, 42);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, pad, 62);
    if (state.combo >= 2) {
      ctx.fillStyle = '#ffd97a';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.fillText(`COMBO ×${state.combo}`, pad, 86);
    }
    // Light meter, top centre: a lantern bar that drains as the night goes on.
    const barW = 260;
    const barX = (FIELD.width - barW) / 2;
    const barY = 22;
    const ratio = Math.max(0, state.light / LANTERN.maxLight);
    ctx.fillStyle = 'rgba(10, 14, 30, 0.7)';
    roundRect(barX - 6, barY - 6, barW + 12, 26, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    roundRect(barX, barY, barW, 14, 7);
    ctx.fill();
    const low = ratio < LANTERN.lowLightWarn / LANTERN.maxLight;
    ctx.fillStyle = low ? PALETTE.danger : '#ffd97a';
    if (ratio > 0) {
      roundRect(barX, barY, Math.max(14, barW * ratio), 14, 7);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(low ? 'LIGHT FADING — FIND DEW!' : 'LANTERN LIGHT', FIELD.width / 2, barY + 30);
    // Lives and level, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '700 20px system-ui, sans-serif';
    let lanterns = '';
    for (let i = 0; i < LIVES; i += 1) lanterns += i < state.lives ? '✦ ' : '✧ ';
    ctx.fillText(lanterns.trim(), FIELD.width - pad, 40);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`LEVEL ${state.level}`, FIELD.width - pad, 62);
    if (state.slowTimer > 0) ctx.fillText(`SLOW ${Math.ceil(state.slowTimer)}s`, FIELD.width - pad, 82);
    if (state.magnetTimer > 0) ctx.fillText(`MAGNET ${Math.ceil(state.magnetTimer)}s`, FIELD.width - pad, 82);
    if (muted) {
      ctx.fillStyle = PALETTE.hudDim;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MUTED (M)', pad, FIELD.height - 16);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dim(alpha) {
    ctx.fillStyle = `rgba(5, 8, 20, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(8, 12, 30, 0.82)';
    roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 217, 122, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function title(text, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, FIELD.width / 2, y);
  }

  function body(text, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, FIELD.width / 2, y);
  }

  function drawTitle(state, best) {
    dim(0.45);
    panel(FIELD.width / 2 - 330, 92, 660, 420);
    glowCircle(FIELD.width / 2, 168, 90, PALETTE.player, 0.35);
    title('KUNANG', 168, 64, '#ffd97a');
    title('Lantern of the Night Garden', 214, 22, '#eef2ff');
    body('You are the firefly spirit guarding the garden lantern.', 268, 16, '#c6cfee');
    body('Gather dew-light to keep your lantern burning.', 292, 16, '#c6cfee');
    body('Dodge shadow moths and thorn brambles — three hits end the night.', 316, 16, '#c6cfee');
    body('WASD / arrows or mouse to fly  •  P pause  •  M mute', 356, 15, '#9aa6d6');
    body('Chain dew orbs for combos up to ×8  •  ◈ shield  ◷ slow time  ◎ magnet', 380, 15, '#9aa6d6');
    if (best > 0) body(`Best score: ${best}`, 420, 16, '#ffd97a');
    title('Press SPACE or click to begin', 466, 20, '#ffffff');
  }

  function drawPaused() {
    dim(0.55);
    panel(FIELD.width / 2 - 240, 210, 480, 170);
    title('PAUSED', 268, 40, '#eef2ff');
    body('The garden waits for you.', 312, 16, '#c6cfee');
    body('P / Esc to keep flying', 344, 15, '#9aa6d6');
  }

  function drawOver(state, best) {
    dim(0.6);
    panel(FIELD.width / 2 - 300, 130, 600, 340);
    title('THE LANTERN FADES', 190, 38, '#ff8fa0');
    body('The night garden grows quiet without your light.', 232, 16, '#c6cfee');
    title(`${state.score}`, 300, 64, '#ffd97a');
    body('SCORE', 336, 13, '#9aa6d6');
    if (state.score >= best && state.score > 0) {
      body('★ NEW BEST ★', 366, 18, '#ffd97a');
    } else {
      body(`Best: ${best}`, 366, 16, '#c6cfee');
    }
    body(`Dew gathered: ${state.orbsCollected}   •   Level reached: ${state.level}`, 398, 15, '#9aa6d6');
    title('Press R or click to fly again', 440, 19, '#ffffff');
  }

  function draw(state, screen, best, muted) {
    const time = state.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05081a';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    if (state.shake > 0) {
      const mag = state.shake * 0.6;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    drawSky(time);
    drawGarden(time, state);
    for (const item of state.items) {
      if (item.kind === 'thorn') drawThorn(item, time);
    }
    for (const item of state.items) {
      if (item.kind === 'orb') drawOrb(item, time);
      else if (item.kind === 'powerup') drawPowerup(item, time);
    }
    for (const item of state.items) {
      if (item.kind === 'moth') drawMoth(item, time);
    }
    drawPlayer(state, time);
    drawSparks(state);
    drawFloaters(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best, muted);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_PAUSED) drawPaused();
    if (screen === SCREEN_OVER) drawOver(state, best);
  }

  return { draw, resize };
}
