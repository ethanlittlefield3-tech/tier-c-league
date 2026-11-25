/**
 * A storyline in words (SCOPE.md, "Season storylines"), with "You" for this
 * phone's player: "Your 4-game win streak snapped by Maya".
 */
import type { Story } from '@tcl/engine';

export function storyText(story: Story, name: (player: string) => string): string {
  const who = name(story.player);
  const you = who === 'You';
  const them = name(story.other) === 'You' ? 'you' : name(story.other);
  switch (story.kind) {
    case 'snapped':
      return `${you ? 'Your' : `${who}'s`} ${story.count}-game win streak snapped by ${them}`;
    case 'leader':
      return `${who} took down the leader, ${them}`;
    case 'streak':
      return `${who} ${you ? 'have' : 'has'} won ${story.count} straight`;
    case 'firstWin':
      return `${who} ${you ? 'get' : 'gets'} a first win of the season, after ${story.count} losses`;
    case 'blowout':
      return `${who} crushed ${them} by ${story.count}`;
    default:
      return `${who} edged ${them} by a single point`;
  }
}
