// A tiny seeded random source (xorshift32 with a splitmix-style seed scramble):
// the same seed always deals the same night, which is what makes the screenshot
// scenes repeatable frame for frame.

export function createRandom(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  // Scramble the seed once so seeds like 1, 2, 3 do not start alike.
  s ^= s << 13;
  s ^= s >>> 17;
  s ^= s << 5;
  s >>>= 0;
  if (s === 0) s = 0x2545f491;

  function next() {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  }

  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
