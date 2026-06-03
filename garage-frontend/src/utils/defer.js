export function deferNonCritical(callback, timeout = 2000) {
  if (typeof window === 'undefined') {
    return undefined;
  }

  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, { timeout });
  }

  return window.setTimeout(callback, 300);
}

export function cancelDeferred(id) {
  if (typeof window === 'undefined' || id === undefined) {
    return;
  }

  if (typeof window.requestIdleCallback === 'function' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id);
    return;
  }

  window.clearTimeout(id);
}
