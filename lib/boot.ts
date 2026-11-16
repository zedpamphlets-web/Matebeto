/** Lets the opening screen know when the first real screen is ready, so the logo can fade away smoothly. */
let ready = false;
const subs = new Set<() => void>();

export function markBootReady() {
  if (ready) return;
  ready = true;
  subs.forEach((f) => f());
  subs.clear();
}

export function onBootReady(f: () => void) {
  if (ready) {
    f();
    return () => {};
  }
  subs.add(f);
  return () => {
    subs.delete(f);
  };
}
