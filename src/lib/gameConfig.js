import { buildGame, fetchGames, fetchGame, getTodayLocal } from './mlb.js';

function lineupEntries(lineup) {
  return (lineup || []).map((p) => ({
    name: p.name || '',
    num: p.num != null ? p.num : '',
    pos: p.pos || '',
    stats: {},
  }));
}

function pitcherEntries(pitchers) {
  return (pitchers || []).map((p) => ({
    name: p.name || '',
    num: p.num != null ? p.num : '',
    stats: {},
  }));
}

function fieldingEntries(side) {
  const list = [];
  for (const f of side.fielders || []) {
    if (f) list.push({ pos: f.pos, name: f.name || '', num: f.num != null ? f.num : '' });
  }
  return list;
}

function headerFields(game) {
  const w = game.weather || {};
  const weather = [w.condition, w.temp != null ? `${w.temp}°` : '']
    .filter(Boolean)
    .join(' · ');
  return {
    date: game.officialDate || '',
    start: game.startTime || '',
    end: '',
    awayTeam: game.away ? game.away.name || game.away.abbreviation : '',
    homeTeam: game.home ? game.home.name || game.home.abbreviation : '',
    venue: game.venue || '',
    weather,
  };
}

function scoreboardData(game, innings) {
  const pad = Array.from({ length: innings || 12 }, () => ({ away: '', home: '' }));
  return {
    awayName: game.away ? game.away.abbreviation : '',
    homeName: game.home ? game.home.abbreviation : '',
    innings: pad,
    totals: { away: { R: '', H: '', E: '' }, home: { R: '', H: '', E: '' } },
  };
}

/**
 * Build the engine `data` block (header/scoreboard/sections) for a game, plus
 * the section footer lists with "fielding" appended so the diagram renders.
 */
export function buildGameData(game) {
  const innings = 12;
  const awayBat = game.away || null;
  const homeBat = game.home || null;
  const awayDef = homeBat;
  const homeDef = awayBat;

  const section = (bat, def) => ({
    label: bat === awayBat ? 'Top' : 'Bottom',
    footer: bat === awayBat ? ['pitchers', 'fielding', 'notes'] : ['pitchers', 'fielding', 'scoreboard'],
    lineup: bat ? lineupEntries(bat.lineup) : [],
    pitchers: def && def.starter ? pitcherEntries([def.starter]) : [],
    fielding: def ? fieldingEntries(def) : [],
    opponentName: def ? def.abbreviation : '',
  });

  const away = section(awayBat, awayDef);
  const home = section(homeBat, homeDef);

  return {
    name: [game.away?.abbreviation, game.home?.abbreviation].filter(Boolean).join(' @ ') || '',
    header: headerFields(game),
    scoreboard: scoreboardData(game, innings),
    sections: { away, home },
    // Footer lists for the sections (includes fielding)
    footers: { away: away.footer, home: home.footer },
  };
}

export { fetchGames, fetchGame, getTodayLocal, buildGame };
