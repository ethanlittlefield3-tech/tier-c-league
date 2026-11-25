import { describe, expect, it } from 'vitest';
import { activityAlerts, reactionCount } from '../lib/activity.ts';

const players = { alex: 'Alex', maya: 'Maya', sam: 'Sam' };
const NOW = Date.UTC(2027, 0, 13, 20);

describe('Reactions and comments on your posts, bundled', () => {
  it("A post's reactions are counted from everyone but its author", () => {
    expect(reactionCount({ id: 'b1', by: 'alex', reactions: { alex: { fire: true }, maya: { fire: true, beer: true }, sam: { skull: false } } })).toBe(2);
  });

  it("Each author hears one count of what others added since the last look, across all their posts", () => {
    const out = activityAlerts({
      posts: [
        { id: 'b1', by: 'alex', reactions: { maya: { fire: true }, sam: { fire: true, beer: true } } },
        { id: 'b2', by: 'alex', reactions: {} },
        { id: 'b3', by: 'maya', reactions: { alex: { skull: true } } },
      ],
      comments: [
        { post: 'b2', by: 'maya' },
        { post: 'b2', by: 'alex' },
      ],
      seen: { b1: 1 },
      players,
      now: NOW,
    });
    expect(out.alerts.map((alert) => [alert.player, alert.title, alert.body, alert.key])).toEqual([
      ['alex', 'New on your posts', '2 reactions and 1 comment.', 'activity'],
      ['maya', 'New on your posts', '1 reaction.', 'activity'],
    ]);
    // What was counted is remembered, so the next look only counts what is new.
    expect(out.seen).toEqual({ b1: 3, b2: 0, b3: 1 });
  });

  it('A reaction taken back counts nothing, and a taken-down post or a former player hears nothing', () => {
    expect(activityAlerts({ posts: [{ id: 'b1', by: 'alex', reactions: {} }], comments: [], seen: { b1: 2 }, players, now: NOW }).alerts).toEqual([]);
    expect(activityAlerts({ posts: [{ id: 'b1', by: 'alex', deleted: true, reactions: { maya: { fire: true } } }], comments: [], seen: {}, players, now: NOW }).alerts).toEqual([]);
    expect(activityAlerts({ posts: [{ id: 'b1', by: 'gone', reactions: { maya: { fire: true } } }], comments: [], seen: {}, players, now: NOW }).alerts).toEqual([]);
  });
});
