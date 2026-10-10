/** Quick connectivity probe. Resolves false if there's no real internet access. */
export async function isOnline(timeoutMs = 4000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch("https://clients3.google.com/generate_204", {
      method: "HEAD",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok || res.status === 204 || res.status === 0;
  } catch {
    return false;
  }
}

/** Rejects with an Error("timeout") if `promise` doesn't settle within `ms`. Prevents a dead/stuck
 * network request from leaving a screen stuck on its loading skeleton forever. */
export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
