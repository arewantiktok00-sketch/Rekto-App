export const safeCall = (cb: any, ...args: any[]) => {
  if (typeof cb === 'function') {
    return cb(...args);
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('Invalid callback passed into safeCall:', cb);
  }
  return undefined;
};

