import type { Failed, Trouble } from './identity.ts';

/**
 * What kind of trouble an error from the data functions was. The import above
 * is for types only, so this never loads the database library.
 */
export const whyOf = (error: unknown): Trouble => (error as Failed | null)?.why ?? 'offline';
