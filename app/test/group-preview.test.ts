import { describe, expect, it } from 'vitest';
import { GROUP_MODES, HOUSE, weekPlayers } from '@tcl/engine';
import { PREVIEW_DAYS, PREVIEW_PLAYERS, nowOn, previewBoard, previewSettle, previewWeek, sampleLogs } from '../src/group/preview.ts';

describe('The group play preview', () => {
  it('It is a made-up league: you and five made-up players, and one week of seven days', () => {
    expect(PREVIEW_PLAYERS.map((player) => player.id)).toEqual(['you', 'maya', 'sam', 'jo', 'kim', 'lee']);
    expect(PREVIEW_DAYS).toHaveLength(7);
    expect(PREVIEW_DAYS[0]!.dayIndex).toBe(0);
  });

  it('Every one of the six modes has a week with everyone in it: two teams of three, three duos (one against the House duo), everyone in the Bounty and the Alley, and three 1v1s in Rumble and Drop Shot', () => {
    for (const mode of GROUP_MODES) {
      const week = previewWeek(mode);
      expect(weekPlayers(week)).toHaveLength(6);
    }
    expect(previewWeek('teamWeek').teams).toEqual({ blue: ['you', 'maya', 'sam'], orange: ['jo', 'kim', 'lee'] });
    expect(previewWeek('twoVTwo').duos?.at(-1)?.b).toEqual([HOUSE]);
    expect(previewWeek('rumble').pairs).toHaveLength(3);
    expect(Object.keys(previewWeek('rumble').rumble?.items ?? {})).toHaveLength(6 * 7);
  });

  it("The made-up days are the same every time, and only days that have started count", () => {
    expect(sampleLogs(1)).toEqual(sampleLogs(1));
    const board = previewBoard('alley', sampleLogs(1), nowOn(2));
    const cells = board.weeks.you!;
    expect(cells.filter((cell) => cell.state === 'future')).toHaveLength(4);
    expect(board.ids).toHaveLength(6);
  });

  it("Settling the preview's week uses the same engine as the weekly job: every player gets a result", () => {
    for (const mode of GROUP_MODES) {
      const settled = previewSettle(mode, sampleLogs(3));
      expect(Object.keys(settled.results).sort()).toEqual(['jo', 'kim', 'lee', 'maya', 'sam', 'you']);
    }
    expect(previewSettle('teamWeek', sampleLogs(3)).group?.mode).toBe('teamWeek');
  });
});
