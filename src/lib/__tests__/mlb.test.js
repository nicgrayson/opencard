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

  it('recovers a starter who was pinch-hit for and dropped out of battingOrder', () => {
    // Real Cubs/Brewers failure: the catcher bats 9th but is later pinch-hit
    // for, so `battingOrder` lists the pinch hitter instead. The lineup still
    // carries the catcher's batting order (900 vs the sub's 901), so the
    // lowest order per position must win the fielder slot.
    const side = makeSide({
      order: [1, 2, 3, 4, 5, 6, 7, 8],
      positions: {
        1: { name: 'Pete Crow-Armstrong', pos: 'CF', bo: 100 },
        2: { name: 'Seiya Suzuki', pos: 'RF', bo: 200 },
        3: { name: 'Michael Busch', pos: '1B', bo: 300 },
        4: { name: 'Alex Bregman', pos: '3B', bo: 400 },
        5: { name: 'Ian Happ', pos: 'DH', bo: 500 },
        6: { name: 'Nico Hoerner', pos: 'SS', bo: 600 },
        7: { name: 'Pedro Ramírez', pos: '2B', bo: 700 },
        8: { name: 'Michael Conforto', pos: 'LF', bo: 800 },
      },
    });
    // The catcher batted 9th (900) but was pinch-hit for. The pinch hitter is
    // the one listed in the final `battingOrder`, and the catcher is not.
    side.players.ID9 = {
      person: { fullName: 'Carson Kelly' },
      position: { abbreviation: 'C' },
      jerseyNumber: '',
      gameStatus: { isSubstitute: false },
      stats: { batting: { battingOrder: 900, atBats: 1, hits: 0, runs: 0, rbi: 0 }, pitching: {} },
    };
    side.players.ID10 = {
      person: { fullName: 'BJ Murray Jr.' },
      position: { abbreviation: 'PH' },
      jerseyNumber: '',
      gameStatus: { isSubstitute: true },
      stats: { batting: { battingOrder: 901, atBats: 1, hits: 0, runs: 0, rbi: 0 }, pitching: {} },
    };
    side.battingOrder.push(10); // 9th batter in the final order is the pinch hitter

    const result = parseSide(side, 'away');
    const byPos = Object.fromEntries(
      (result.fielders || []).filter(Boolean).map((f) => [f.pos, f.name]),
    );
    expect(byPos.C).toBe('Carson Kelly');
    expect(result.fielders.map((f) => f && f.pos)).toEqual(
      ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'],
    );
  });

  it('shows the starting fielders, not a double-switch replacement who batted in a lower slot', () => {
    const side = makeSide({
      order: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      positions: {
        1: { name: 'Starter CF', pos: 'CF', bo: 100 },
        2: { name: 'Starter 2B', pos: '2B', bo: 200 },
        3: { name: 'Starter 1B', pos: '1B', bo: 300 },
        4: { name: 'Starter 3B', pos: '3B', bo: 400 },
        5: { name: 'Starter SS', pos: 'SS', bo: 500 },
        6: { name: 'Starter RF', pos: 'RF', bo: 600 },
        7: { name: 'Starter C', pos: 'C', bo: 700 },
        8: { name: 'Starter LF', pos: 'LF', bo: 800 },
        9: { name: 'Starter DH', pos: 'DH', bo: 900 },
      },
    });
    // Double switch: the replacement left fielder enters the 2-hole (201) —
    // numerically lower than the starting LF's 800.
    side.players.ID99 = {
      person: { fullName: 'Repl LF' },
      position: { abbreviation: 'LF' },
      jerseyNumber: '',
      gameStatus: { isSubstitute: true },
      stats: { batting: { battingOrder: 201, atBats: 1, runs: 0, hits: 0, rbi: 0 }, pitching: {} },
    };

    const result = parseSide(side, 'away');
    const byPos = Object.fromEntries(
      (result.fielders || []).filter(Boolean).map((f) => [f.pos, f.name]),
    );
    expect(byPos.LF).toBe('Starter LF');
    expect(byPos['2B']).toBe('Starter 2B');
    expect(byPos.C).toBe('Starter C');
  });
});
