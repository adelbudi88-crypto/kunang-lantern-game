// Keyboard and mouse, read as one input. WASD and the arrow keys steer with
// acceleration; the mouse steers too — the firefly glides toward the cursor
// while the mouse was the last thing moved. Space, Enter or a click confirms
// (start / restart), P or Escape pauses, R restarts from game over, M mutes.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, active: false, movedAt: 0 };
  let actions = 0;

  function toGameCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key === 'r' || event.key === 'R') actions |= ACTION_RESTART;
    if (event.key === 'm' || event.key === 'M') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function onMouseMove(event) {
    const pos = toGameCoords(event.clientX, event.clientY);
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.active = true;
    mouse.movedAt = performance.now();
  }

  function onMouseDown(event) {
    const pos = toGameCoords(event.clientX, event.clientY);
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.active = true;
    mouse.movedAt = performance.now();
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // -1, 0 or 1 on each axis from the keys currently held.
    direction() {
      const left = keys.has('a') || keys.has('ArrowLeft') ? 1 : 0;
      const right = keys.has('d') || keys.has('ArrowRight') ? 1 : 0;
      const up = keys.has('w') || keys.has('ArrowUp') ? 1 : 0;
      const down = keys.has('s') || keys.has('ArrowDown') ? 1 : 0;
      return { x: right - left, y: down - up };
    },
    hasKeyboardSteering() {
      return (
        keys.has('a') || keys.has('d') || keys.has('w') || keys.has('s') ||
        keys.has('ArrowLeft') || keys.has('ArrowRight') || keys.has('ArrowUp') || keys.has('ArrowDown')
      );
    },
    // The mouse only steers while it was moved in the last couple of seconds,
    // so a resting cursor never drags the firefly away from the keys.
    mouseTarget() {
      if (!mouse.active || performance.now() - mouse.movedAt > 2500) return null;
      return { x: mouse.x, y: mouse.y };
    },
  };
}
