/**
 * Three worked example weeks (PHASE1.md, Checkpoint A).
 *
 * Each one is a full week of made-up logs with the totals worked out by hand
 * from SCOPE.md. The test checks the engine against those hand totals, and the
 * Checkpoint A report prints the engine's day-by-day working from this file.
 */

import { HOUSE, type DayInput, type Pair } from '../src/index.ts';
import { log } from './helpers.ts';

export interface WorkedDay extends Omit<DayInput, 'par'> {
  /** What happened, in plain English, for the report. */
  note?: string;
}

export interface WorkedPlayer {
  name: string;
  /** Monday to Sunday. */
  days: WorkedDay[];
  /** Points in earlier weeks, oldest first (for the Bust). */
  earlier?: number[];
}

export interface WorkedWeek {
  title: string;
  shows: string;
  week: number;
  par: number;
  players: WorkedPlayer[];
  pairs: Pair[];
  /** The answers worked out by hand. */
  expected: {
    points: Record<string, number>;
    beers: Record<string, number>;
    outcome: Record<string, 'win' | 'draw' | 'loss'>;
    seasonPoints: Record<string, number>;
    house?: number;
    mvp: string[];
    bust: string[];
    wheel: string[];
  };
}

export const WORKED_WEEKS: WorkedWeek[] = [
  {
    title: 'Example 1: a tie on points, settled by beers',
    shows:
      'A perfect day, an Aerial, a Full Boost blocking a Demolition, a Demolition that lands, a moved rest day, and the fewer-beers tiebreak.',
    week: 1,
    par: 3,
    pairs: [['Alex', 'Maya']],
    players: [
      {
        name: 'Alex',
        days: [
          { log: log('MBW', '0:45', 0), note: 'Perfect day.' },
          { log: log('M-W', '2:30', 1) },
          { log: log('MBW', '1:15', 0), aerial: true, note: 'Aerial, set Tuesday night: the day doubles.' },
          {
            log: log('-B-', '3:30', 2),
            fullBoost: 'mind',
            demolitions: ['mind'],
            note: "Full Boost on Mind. Maya's hidden Demolition was on Mind too, so it is blocked.",
          },
          { log: log('MB-', '4:15', 3) },
          { log: log('-BW', '2:00', 4) },
          { log: log('---', '1:30', 1), restDay: true, note: 'Rest day (Sunday, the default): goals are off.' },
        ],
      },
      {
        name: 'Maya',
        days: [
          { log: log('MB-', '1:45', 0) },
          { log: log('MBW', '0:30', 0), note: 'Perfect day.' },
          { log: log('---', '3:15', 0), restDay: true, note: 'Rest day, moved from Sunday to Wednesday on Monday.' },
          { log: log('M-W', '2:15', 0) },
          {
            log: log('-BW', '1:00', 2),
            demolitions: ['mind'],
            note: "Alex's Demolition on Mind lands: she missed it and had no Full Boost on it.",
          },
          { log: log('MBW', '5:30', 1) },
          { log: log('MB-', '2:45', 0), note: 'Sunday is a normal goal day for her this week.' },
        ],
      },
    ],
    expected: {
      points: { Alex: 16, Maya: 16 },
      beers: { Alex: 11, Maya: 3 },
      outcome: { Alex: 'loss', Maya: 'win' },
      seasonPoints: { Alex: 16, Maya: 21 },
      mvp: ['Maya'],
      bust: ['Alex'],
      wheel: ['Alex', 'Maya'],
    },
  },
  {
    title: 'Example 2: a rough week against The House',
    shows:
      'A no-show, a failed receipt, Rule One with a penalty that survives it, an Aerial on a bad day, a blank rest day, and The House scoring the league average.',
    week: 2,
    par: 3,
    pairs: [
      ['Alex', 'Jordan'],
      ['Riley', HOUSE],
    ],
    players: [
      {
        name: 'Riley',
        earlier: [11],
        days: [
          { log: log('MBW', '0:45', 0), note: 'Perfect day.' },
          {
            log: log('---', '0:30', 6),
            voided: ['screen'],
            adjustments: [-1],
            ruleOne: true,
            note:
              'Jordan asked for receipts on screen time at 4 pm. No proof by 11:59 pm, so the square is voided and Riley loses 1. Riley declares Rule One the next morning: the play is 0, but the lost point stays.',
          },
          { log: log('M-W', '2:00', 1) },
          { log: log('-B-', '4:30', 2), aerial: true, note: 'Aerial, set Wednesday: a bad day doubles too.' },
          { log: null, note: 'No-show: nothing logged.' },
          { log: log('MB-', '1:30', 0) },
          { log: null, restDay: true, note: 'Rest day left blank: counts as screen time not logged.' },
        ],
      },
      {
        name: 'Alex',
        earlier: [16],
        days: [
          { log: log('MBW', '1:30', 0), note: 'Perfect day.' },
          { log: log('MB-', '2:15', 0) },
          { log: log('MBW', '2:30', 0), note: 'Perfect day.' },
          { log: log('M--', '2:00', 0) },
          { log: log('MB-', '2:45', 0) },
          { log: log('M--', '3:15', 2) },
          { log: log('---', '1:00', 0), restDay: true, note: 'Rest day.' },
        ],
      },
      {
        name: 'Jordan',
        earlier: [14],
        days: [
          { log: log('M-W', '2:00', 0) },
          { log: log('MBW', '3:30', 1) },
          { log: log('-BW', '1:15', 0) },
          { log: log('MB-', '4:00', 0) },
          { log: log('--W', '2:30', 3) },
          { log: log('MBW', '1:45', 2) },
          { log: log('---', '2:15', 0), restDay: true, note: 'Rest day.' },
        ],
      },
    ],
    expected: {
      points: { Riley: -1, Alex: 18, Jordan: 13 },
      beers: { Riley: 9, Alex: 2, Jordan: 6 },
      outcome: { Riley: 'loss', Alex: 'win', Jordan: 'loss' },
      seasonPoints: { Riley: -1, Alex: 23, Jordan: 13 },
      house: 15.5,
      mvp: ['Alex'],
      bust: ['Riley'],
      wheel: ['Riley'],
    },
  },
  {
    title: 'Example 3: a draw, and the Bust goes to the biggest drop',
    shows:
      'A draw worth +2 each, a Demolition that misses, one that fizzles on a moved rest day, a commish void and dock for fake proof, and MVP, Bust and Wheel in Week 5.',
    week: 5,
    par: 3,
    pairs: [
      ['Alex', 'Sam'],
      ['Maya', 'Jordan'],
    ],
    players: [
      {
        name: 'Alex',
        earlier: [16, 18, 14, 17],
        days: [
          { log: log('MB-', '1:30', 0) },
          { log: log('MBW', '2:15', 1) },
          { log: log('-BW', '3:00', 0), demolitions: ['body'], note: "Sam's Demolition on Body misses: Alex hit it." },
          { log: log('MBW', '0:45', 0), note: 'Perfect day.' },
          { log: log('M-W', '2:00', 2) },
          { log: log('--W', '4:15', 3) },
          { log: log('---', '1:15', 0), restDay: true, note: 'Rest day.' },
        ],
      },
      {
        name: 'Sam',
        earlier: [10, 12, 14, 16],
        days: [
          { log: log('MBW', '1:00', 0), note: 'Perfect day.' },
          { log: log('-BW', '2:30', 0) },
          { log: log('MB-', '3:45', 2) },
          {
            log: log('---', '1:30', 0),
            restDay: true,
            demolitions: ['wildcard'],
            note: "Rest day, moved here on Tuesday. Alex's Demolition, set on Monday, fizzles.",
          },
          { log: log('MBW', '2:00', 4) },
          {
            log: log('MBW', '1:45', 0),
            voided: ['body'],
            adjustments: [-1],
            note: 'The gym photo was fake: the commish voids Body and docks 1.',
          },
          { log: log('M--', '2:15', 0), note: 'Sunday is a normal goal day for him this week.' },
        ],
      },
      {
        name: 'Maya',
        earlier: [16, 20, 22, 19],
        days: [
          { log: log('MBW', '0:45', 0), note: 'Perfect day.' },
          { log: log('MB-', '1:30', 0) },
          { log: log('MBW', '2:00', 0), note: 'Perfect day.' },
          { log: log('-BW', '1:15', 0) },
          { log: log('M-W', '3:00', 0) },
          { log: log('M--', '3:15', 1) },
          { log: log('---', '2:30', 0), restDay: true, note: 'Rest day.' },
        ],
      },
      {
        name: 'Jordan',
        earlier: [14, 16, 15, 19],
        days: [
          { log: log('M--', '2:00', 0) },
          { log: null, note: 'No-show.' },
          { log: log('MBW', '1:00', 0), note: 'Perfect day.' },
          { log: log('-BW', '2:30', 1) },
          { log: log('MB-', '3:30', 2) },
          { log: log('MBW', '1:30', 3) },
          { log: log('---', '0:30', 0), restDay: true, note: 'Rest day.' },
        ],
      },
    ],
    expected: {
      points: { Alex: 15, Sam: 15, Maya: 21, Jordan: 9 },
      beers: { Alex: 6, Sam: 6, Maya: 1, Jordan: 6 },
      outcome: { Alex: 'draw', Sam: 'draw', Maya: 'win', Jordan: 'loss' },
      seasonPoints: { Alex: 17, Sam: 17, Maya: 26, Jordan: 9 },
      mvp: ['Maya'],
      bust: ['Jordan'],
      wheel: ['Jordan'],
    },
  },
];
