import { describe, it, expect, beforeEach } from 'vitest';
import { buildGameData } from '../gameConfig';
import { combineConfig } from '../combineConfig';
import { generatePage } from '../../engine/generate';

const game = {
  officialDate: '2026-08-30',
  venue: 'Citizens Bank Park',
  city: 'Philadelphia',
  roof: 'Outdoor',
  weather: { condition: 'Clear', temp: 82, wind: '5 mph' },
  attendance: 41234,
  gameDurationMinutes: 175,
  firstPitch: '2026-08-30T23:05:00Z',
  dayNight: 'night',
  gameType: 'R',
  umpires: [{ type: 'Home Plate', name: 'Joe West' }],
  linescore: {
    innings: [
      { away: 0, home: 1 }, { away: 0, home: 0 }, { away: 2, home: 0 },
      { away: 0, home: 0 }, { away: 1, home: 0 }, { away: 0, home: 0 },
      { away: 0, home: 0 }, { away: 0, home: 0 }, { away: 0, home: 0 },
    ],
    teams: { away: { runs: 3, hits: 6, errors: 0 }, home: { runs: 1, hits: 4, errors: 1 } },
  },
  away: {
    tag: 'away', name: 'New York Mets', abbreviation: 'NYM', record: '72-58',
    lineup: [
      { id: 1, name: 'Francisco Lindor', pos: 'SS', num: '12', battingOrder: 100, AB: 4, R: 1, H: 2, RBI: 2 },
      { id: 2, name: 'Brandon Nimmo', pos: 'CF', num: '9', battingOrder: 200, AB: 3, R: 0, H: 1, RBI: 0 },
    ],
    pitchers: [
      { id: 1, name: 'Sean Manaea', num: '59', 'R/L': 'L', IP: '5.1', H: 3, R: 1, ER: 1, BB: 2, K: 6, started: true },
      { id: 2, name: 'Edwin Diaz', num: '39', IP: '1.0', H: 0, R: 0, ER: 0, BB: 0, K: 2, started: false },
    ],
    starter: { name: 'Sean Manaea', num: '59', 'R/L': 'L' },
    fielders: [
      { pos: 'C', name: 'Francisco Alvarez', num: '4' }, { pos: '1B', name: 'Pete Alonso', num: '20' },
      null, null, { pos: 'SS', name: 'Francisco Lindor', num: '12' },
      { pos: 'LF', name: 'Jeff McNeil', num: '1' }, { pos: 'CF', name: 'Brandon Nimmo', num: '9' },
      { pos: 'RF', name: 'Starling Marte', num: '8' },
    ],
  },
  home: {
    tag: 'home', name: 'Philadelphia Phillies', abbreviation: 'PHI', record: '70-60',
    lineup: [
      { id: 1, name: 'Kyle Schwarber', pos: 'DH', num: '12', battingOrder: 100, AB: 4, R: 1, H: 1, RBI: 1 },
      { id: 2, name: 'Trea Turner', pos: 'SS', num: '7', battingOrder: 200, AB: 3, R: 0, H: 1, RBI: 0 },
    ],
    pitchers: [
      { id: 1, name: 'Zack Wheeler', num: '45', IP: '7.0', H: 4, R: 2, ER: 2, BB: 1, K: 8, started: true },
    ],
    starter: { name: 'Zack Wheeler', num: '45' },
    fielders: [
      { pos: 'C', name: 'J.T. Realmuto', num: '10' }, { pos: '1B', name: 'Bryce Harper', num: '28' },
      { pos: '2B', name: 'Bryson Stott', num: '5' }, { pos: '3B', name: 'Alec Bohm', num: '28' },
      { pos: 'SS', name: 'Trea Turner', num: '7' }, { pos: 'LF', name: 'Brandon Marsh', num: '16' },
      { pos: 'CF', name: 'Michael Harris II', num: '18' }, { pos: 'RF', name: 'Nick Castellanos', num: '8' },
    ],
  },
};

describe('MLB game data integration', () => {
  beforeEach(() => {});

  it('builds a data block with both sections and fielding', () => {
    const data = buildGameData(game);
    expect(data.name).toBe('NYM @ PHI');
    expect(data.sections.away.lineup[0].name).toBe('Francisco Lindor');
    // Away page lists the opponent's (home) pitchers, since home field while away bats
    expect(data.sections.away.pitchers[0].name).toBe('Zack Wheeler');
    expect(data.sections.home.pitchers[0].name).toBe('Sean Manaea');
    expect(data.sections.home.pitchers[0].stats['R/L']).toBe('L');
    expect(data.sections.away.fielding.some((f) => f.pos === 'C')).toBe(true);
    expect(data.sections.away.fielding.some((f) => f.pos === 'P')).toBe(false);
    expect(data.footers.away).toContain('fielding');
    expect(data.header.umpHP).toBe('Joe West');
    expect(data.footers.home).toContain('fielding');
  });

  it('renders autofilled lineup, pitchers, scoreboard, header, and fielding', () => {
    const gameData = buildGameData(game);
    const effective = combineConfig({ fielding: { show: true } }, gameData);
    const html = generatePage(effective);

    expect(html).toContain('NYM @ PHI');
    expect(html).toContain('F. Lindor');
    expect(html).not.toContain('#12 ');
    expect(html).toContain('Zack Wheeler'); // home pitchers on away page
    expect(html).toContain('Sean Manaea');
    expect(html.match(/sidebar-block fielding-block/g).length).toBe(2);
    expect(html).toContain('Citizens Bank Park');
    // stats and scoreboard numbers are never auto-filled
    expect(html).not.toMatch(/cell-stat">[0-9]+</);
    expect(html).not.toMatch(/scoreboard-totals">[0-9]+</);
  });

  it('uses the family name (dropping roman-numeral suffixes) on fielding positions', () => {
    const gameData = buildGameData(game);
    const effective = combineConfig({ fielding: { show: true } }, gameData);
    const html = generatePage(effective);
    expect(html).not.toMatch(/class="field-pos filled"[^>]*>Harris II</);
    expect(html).toMatch(/class="field-pos filled"[^>]*>Harris</);
  });

  it('preserves user style overrides when merging game data', () => {
    const gameData = buildGameData(game);
    const effective = combineConfig({ theme: { colors: { primary: '#ff0000' } } }, gameData);
    const html = generatePage(effective);
    expect(html).toContain('--primary: #ff0000');
    expect(html).toContain('F. Lindor');
  });

  it('returns a blank config when no game data is present', () => {
    const effective = combineConfig({ theme: { colors: { primary: '#00ff00' } }, fielding: { show: true } }, null);
    const html = generatePage(effective);
    expect(html).toContain('--primary: #00ff00');
    expect(html).not.toContain('F. Lindor');
    // blank scorecard still shows the fielding diagram with write-in lines
    expect(html).toContain('sidebar-block fielding-block');
    expect(html).toContain('field-write');
    expect(html).not.toContain('field-pos filled');
  });
});
