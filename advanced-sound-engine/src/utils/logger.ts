const PREFIX = 'ASE';

export const Logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`${PREFIX} | ${message}`, ...args);
  },
  
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`${PREFIX} | ${message}`, ...args);
  },
  
  error: (message: string, ...args: unknown[]) => {
    console.error(`${PREFIX} | ${message}`, ...args);
  },
  
  debug: (message: string, ...args: unknown[]) => {
    if (CONFIG?.debug?.audio) {
      console.debug(`${PREFIX} | ${message}`, ...args);
    }
  }
};