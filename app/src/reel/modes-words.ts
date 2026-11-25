import { GROUP_MODES, MODE_NAMES } from '@tcl/engine';

export { MODE_NAMES };

/** A week's mode is one of the six group-play modes. */
export const isGroupModeName = (mode: string): boolean => (GROUP_MODES as readonly string[]).includes(mode);
