import { describe, it, expect } from 'vitest';
import { parseSide } from '../mlb';

// Reproduces the real feed's failure mode: a genuine starter is flagged
// `isSubstitute=true` (they get swapped mid-game but did start), while a
// late-inning replacement is not in the starting batting order. Fielders must
// be derived from `battingOrder` (the starting nine).
function makeSide({ order, positions }) {
  const players = {};
  const battingOrder = [];
  for (const id of order) {
    const p = positions[id];
    battingOrder.push(id);
    players[`ID${id}`] = {
      person: { fullName: p.name },
      position: { abbreviation: p.pos },
      jerseyNumber: p.num || '',
      gameStatus: { isSubstitute: !!p.sub },
      stats: {
        batting: { battingOrder: p.bo, atBats: 0, runs: 0, hits: 0, rbi: 0 },
        pitching: {},
      },
    };
  }
  return {
    battingOrder,
    players,
    team: { name: 'Test Team' },
  };
}

describe('parseSide fielding (starting fielders)', () => {
  it('picks starters from battingOrder even when mislabeled as substitutes', () => {
    // 9 starters. The catcher (Joe Mack) and center fielder start but get
    // substituted later, so the feed flags them isSubstitute=true.
    const side = makeSide({
      order: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      positions: {
        1: { name: 'Heriberto Hernández', pos: 'LF', bo: 100, sub: true },
        2: { name: 'Otto Lopez', pos: 'SS', bo: 200 },
        3: { name: 'Agustín Ramírez', pos: 'DH', bo: 300 },
        4: { name: 'Esteury Ruiz', pos: 'RF', bo: 400 },
        5: { name: 'Joe Mack', pos: 'C', bo: 500, sub: true },
        6: { name: 'Javier Sanoja', pos: '2B', bo: 600 },
        7: { name: 'Leo Jiménez', pos: '3B', bo: 700 },
        8: { name: 'Jakob Marsee', pos: 'CF', bo: 800 },
        9: { name: 'Griffin Conine', pos: '1B', bo: 900, sub: true },
      },
    });
    // A substitute catcher and center fielder who entered late but never started.
    side.players.ID10 = {
      person: { fullName: 'Brian Navarreto' },
      position: { abbreviation: 'C' },
      jerseyNumber: '',
      gameStatus: { isSubstitute: true },
      stats: { batting: {}, pitching: {} },
    };
    side.players.ID11 = {
      person: { fullName: 'Xavier Edwards' },
      position: { abbreviation: 'CF' },
      jerseyNumber: '',
      gameStatus: { isSubstitute: true },
      stats: { batting: {}, pitching: {} },
    };

    const result = parseSide(side, 'away');
    const byPos = Object.fromEntries(
      (result.fielders || []).filter(Boolean).map((f) => [f.pos, f.name]),
    );
    // Starters, not the late substitutes — despite isSubstitute=true on starters
    expect(byPos.C).toBe('Joe Mack');
    expect(byPos.CF).toBe('Jakob Marsee');
    expect(byPos['1B']).toBe('Griffin Conine');
    expect(result.fielders.map((f) => f && f.pos)).toEqual(
      ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
    );
  });
});
