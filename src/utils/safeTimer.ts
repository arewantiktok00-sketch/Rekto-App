export const safeTimer = (cb: any, delay?: number): ReturnType<typeof setTimeout> => {
  if (typeof cb === 'function') {
    return setTimeout(cb, delay);
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('Invalid timer callback passed into safeTimer:', cb);
    // eslint-disable-next-line no-console
    console.warn(new Error('safeTimer invalid callback stack').stack);
  }

  // Return a dummy ID so callers that expect a handle can still call clearTimeout safely.
  return 0 as unknown as ReturnType<typeof setTimeout>;
};

