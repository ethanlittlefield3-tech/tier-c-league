import { describe, expect, it } from 'vitest';
import { isNew, newestFromOthers } from '../src/ui/seen.ts';

describe('What is new since you last looked', () => {
  it('Something is new only if it came after your last look', () => {
    expect(isNew(2000, 1000)).toBe(true);
    expect(isNew(1000, 1000)).toBe(false);
    expect(isNew(500, 1000)).toBe(false);
  });

  it('With no look kept on this phone, or nothing there, nothing is new', () => {
    expect(isNew(2000, null)).toBe(false);
    expect(isNew(null, 1000)).toBe(false);
    expect(isNew(undefined, 1000)).toBe(false);
  });

  it('Feed counts the newest post by someone else; your own posts and posts taken down never count', () => {
    const posts = [
      { by: 'alex', at: 5000 },
      { by: 'riley', at: 4000, deleted: true },
      { by: 'jordan', at: 3000 },
    ];
    expect(newestFromOthers(posts, 'alex')).toBe(3000);
    expect(newestFromOthers([{ by: 'alex', at: 5000 }], 'alex')).toBeNull();
    expect(newestFromOthers([], 'alex')).toBeNull();
  });
});
