// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.

import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;
/**
 * How far ahead, in seconds, the autopilot checks each hazard: the play
 * scene's pilot looks well ahead and keeps all its lives; the end scene's
 * looks only a moment ahead, so it is caught out once the moths speed up,
 * as a hurried player is.
 */
const HORIZON_PLAY = 0.9;
const HORIZON_END = 0.22;

/** The nearest threat the firefly would reach if it kept its current course. */
function nearestThreat(state, seconds) {
  const player = state.player;
  let worst = null;
  let worstTime = Infinity;
  for (const item of state.items) {
    if (!item.active || (item.kind !== 'moth' && item.kind !== 'thorn')) continue;
    const dx = item.x - player.x;
    const dy = item.y - player.y;
    const dist = Math.hypot(dx, dy);
    const closing = item.kind === 'moth' ? Math.abs(item.vx) * 0.6 + 60 : 60;
    const t = Math.max(0, (dist - 60) / closing);
    if (t < seconds && t < worstTime) {
      worstTime = t;
      worst = item;
    }
  }
  return worst;
}

/**
 * Steer toward the nearest dew orb, unless a moth or thorn is close — then
 * veer away from it. Returns { keys, mouse } in the world's steering shape.
 */
function autopilot(state, horizon) {
  const player = state.player;
  const threat = nearestThreat(state, horizon);
  let tx;
  let ty;
  if (threat) {
    // Flee: aim at the point opposite the threat, across the player, kept
    // inside the garden so the pilot never pins itself against a wall.
    tx = Math.min(900, Math.max(60, player.x + (player.x - threat.x)));
    ty = Math.min(540, Math.max(80, player.y + (player.y - threat.y)));
  } else {
    // Chase the nearest dew orb; with none in sight, drift to mid-garden.
    let orb = null;
    let orbDist = Infinity;
    for (const item of state.items) {
      if (!item.active || item.kind !== 'orb') continue;
      const d = Math.hypot(item.x - player.x, item.y - player.y);
      if (d < orbDist) {
        orbDist = d;
        orb = item;
      }
    }
    if (orb === null) {
      tx = 480;
      ty = 300;
    } else {
      tx = orb.x;
      ty = orb.y;
    }
  }
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dead = 10;
  return {
    keys: {
      x: dx > dead ? 1 : dx < -dead ? -1 : 0,
      y: dy > dead ? 1 : dy < -dead ? -1 : 0,
    },
    mouse: null,
  };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { keys: { x: 0, y: 0 }, mouse: null }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : HORIZON_PLAY;
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, horizon), false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
