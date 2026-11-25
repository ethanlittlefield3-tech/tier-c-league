/**
 * "Reactions and comments on your posts", bundled (SCOPE.md,
 * "Notifications": "a busy evening sends one push, not twenty"). Once an
 * hour the alerts job looks at the posts stamped with new activity, and each
 * author hears one count of what others added since. Pure: the job keeps how
 * many reactions it has already counted on each post.
 */
import type { Alert } from './alerts.ts';

const REACTIONS = ['fire', 'skull', 'beer'] as const;

export interface ActivePost {
  id: string;
  by: string;
  deleted?: boolean;
  reactions?: Record<string, { fire?: boolean; skull?: boolean; beer?: boolean }>;
}

/** Reactions on a post from everyone but its author. */
export function reactionCount(post: ActivePost): number {
  return Object.entries(post.reactions ?? {})
    .filter(([player]) => player !== post.by)
    .reduce((sum, [, set]) => sum + REACTIONS.filter((kind) => set?.[kind] === true).length, 0);
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function activityAlerts(input: {
  /** Posts stamped with activity since the last look. */
  posts: ActivePost[];
  /** Comments made since the last look, by post. */
  comments: { post: string; by: string }[];
  /** Reactions already counted on each post. */
  seen: Record<string, number>;
  players: Record<string, string>;
  now: number;
}): { alerts: Alert[]; seen: Record<string, number> } {
  const seen = { ...input.seen };
  const news = new Map<string, { reactions: number; comments: number }>();
  for (const post of input.posts) {
    if (post.deleted || !input.players[post.by]) continue;
    const count = reactionCount(post);
    const reactions = Math.max(0, count - (seen[post.id] ?? 0));
    seen[post.id] = count;
    const comments = input.comments.filter((comment) => comment.post === post.id && comment.by !== post.by).length;
    if (reactions + comments === 0) continue;
    const mine = news.get(post.by) ?? { reactions: 0, comments: 0 };
    news.set(post.by, { reactions: mine.reactions + reactions, comments: mine.comments + comments });
  }
  const alerts: Alert[] = [...news.entries()].map(([player, { reactions, comments }]) => ({
    player,
    category: 'social',
    // One key: a newer summary replaces the last one on the phone.
    key: 'activity',
    title: 'New on your posts',
    body: [reactions ? plural(reactions, 'reaction') : '', comments ? plural(comments, 'comment') : ''].filter(Boolean).join(' and ') + '.',
    screen: 'feed',
    expires: input.now + 24 * 3_600_000,
  }));
  return { alerts, seen };
}
