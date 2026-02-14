const PREFIX = 'ASE';
const READY_MESSAGE = 'Advanced Sound Engine ready';

export const Logger = {
  info: (message: string): void => {
    if (message === READY_MESSAGE) {
      console.log(`${PREFIX} | ${message}`);
    }
  },

  warn: (_message: string, ..._args: unknown[]): void => {
    // Production logging disabled by request.
  },

  error: (_message: string, ..._args: unknown[]): void => {
    // Production logging disabled by request.
  },

  debug: (_message: string, ..._args: unknown[]): void => {
    // Production logging disabled by request.
  }
};
