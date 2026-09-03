const BASE = 'https://statsapi.mlb.com/api/v1'
const LIVE_BASE = 'https://statsapi.mlb.com/api/v1.1'

const TEAM_ABBREV = {
  'Arizona Diamondbacks': 'ARI',
  'Atlanta Braves': 'ATL',
  'Baltimore Orioles': 'BAL',
  'Boston Red Sox': 'BOS',
  'Chicago Cubs': 'CHC',
  'Chicago White Sox': 'CWS',
  'Cincinnati Reds': 'CIN',
  'Cleveland Guardians': 'CLE',
  'Colorado Rockies': 'COL',
  'Detroit Tigers': 'DET',
  'Houston Astros': 'HOU',
  'Kansas City Royals': 'KC',
  'Los Angeles Angels': 'LAA',
  'Los Angeles Dodgers': 'LAD',
  'Miami Marlins': 'MIA',
  'Milwaukee Brewers': 'MIL',
  'Minnesota Twins': 'MIN',
  'New York Mets': 'NYM',
  'New York Yankees': 'NYY',
  'Oakland Athletics': 'ATH',
  'Philadelphia Phillies': 'PHI',
  'Pittsburgh Pirates': 'PIT',
  'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF',
  'Seattle Mariners': 'SEA',
  'St. Louis Cardinals': 'STL',
  'Tampa Bay Rays': 'TB',
  'Texas Rangers': 'TEX',
  'Toronto Blue Jays': 'TOR',
  'Washington Nationals': 'WSH',
}

function teamAbbrev(name) {
  return TEAM_ABBREV[name] ?? (name || '').split(' ').map((w) => w[0]).join('')
}

export function getTodayLocal() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export async function fetchGames(date) {
  const url = `${BASE}/schedule?sportId=1&date=${date}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MLB API error: ${res.status}`)
  const data = await res.json()
  return (data.dates?.[0]?.games ?? []).map((g) => ({
    gamePk: g.gamePk,
    gameDate: g.gameDate,
    officialDate: g.officialDate,
    status: g.status,
    venue: g.venue?.name,
    away: { ...g.teams.away.team, abbreviation: teamAbbrev(g.teams.away.team.name) },
    home: { ...g.teams.home.team, abbreviation: teamAbbrev(g.teams.home.team.name) },
  }))
}

export async function fetchGame(gamePk) {
  const url = `${LIVE_BASE}/game/${gamePk}/feed/live`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`MLB API error: ${res.status}`)
  return res.json()
}

const FIELDING = new Set(['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'])

/**
 * Extract a side's batting order (offense), starting pitcher, and defensive
 * fielders from the live boxscore.
 *
 * @param {object} side - boxscore.teams.away or boxscore.teams.home
 * @param {'away'|'home'} tag
 */
export function parseSide(side, tag, starterId) {
  const players = Object.entries(side.players ?? {})
  const lineup = []
  const pitchers = []
  const bySlot = new Map()
  const byPos = new Map()

  const team = side.team ?? {}
  const teamName = team.name || side.name || ''

  const jersey = (p) => (p.jerseyNumber ? String(p.jerseyNumber) : '')

  for (const [id, p] of players) {
    const {
      person: { fullName } = {},
      position = {},
      stats = {},
    } = p
    const battingOrder = (stats.batting || {}).battingOrder || p.battingOrder
    const pos = position.abbreviation
    const name = fullName
    const num = jersey(p)

    if (battingOrder) {
      const b = stats.batting || {}
      const slot = Math.floor(Number(battingOrder) / 100)
      const entry = {
        id,
        name,
        pos,
        num,
        battingOrder,
        slot,
        AB: b.atBats ?? '',
        R: b.runs ?? '',
        H: b.hits ?? '',
        RBI: b.rbi ?? '',
      }
      // the starter in each batting slot is the player with the lowest
      // battingOrder for that slot (substitutes get *01, *02, ...)
      const cur = bySlot.get(slot)
      if (!cur || Number(battingOrder) < Number(cur.battingOrder)) {
        bySlot.set(slot, entry)
      }
      lineup.push(entry)
    }

    if (pos === 'P') {
      const pg = stats.pitching || {}
      pitchers.push({
        id,
        name,
        num,
        IP: pg.inningsPitched ?? '',
        H: pg.hits ?? '',
        R: pg.runs ?? '',
        ER: pg.earnedRuns ?? '',
        BB: pg.baseOnBalls ?? '',
        K: pg.strikeOuts ?? '',
        started: pg.gamesStarted === 1,
      })
    }
  }

  // Derive the STARTING fielders from `battingOrder` (the 9 starter IDs).
  // Unlike `gameStatus.isSubstitute`, this reliable identifies genuine
  // starters even when the feed mislabels some as substitutes (and avoids
  // picking a late-game replacement who never started).
  const startIds = (side.battingOrder || []).map((id) => String(id))
  const byId = new Map(
    players.map(([id, p]) => [String(id).replace(/^ID/, ''), p]),
  )
  for (const id of startIds) {
    const p = byId.get(id)
    if (!p) continue
    const pos = (p.position || {}).abbreviation
    if (pos && FIELDING.has(pos) && !byPos.has(pos)) {
      byPos.set(pos, { id, name: p.person?.fullName || '', pos, num: jersey(p) })
    }
  }

  // identify the starter: prefer the announced probable pitcher, then
  // fall back to marks `started` from game logs, then the first listed
  const byProbable = starterId
    ? pitchers.find((q) => String(q.id) === String(starterId))
    : null
  const starter = byProbable || pitchers.find((q) => q.started) || pitchers[0] || null
  pitchers.sort((a, b) => Number(b === starter) - Number(a === starter))

  lineup.sort((a, b) => a.battingOrder - b.battingOrder)
  // keep only the starters (lowest battingOrder per slot), in batting order
  const starters = [...bySlot.values()]
  starters.sort((a, b) => a.battingOrder - b.battingOrder)

  // conventional defensive order: C, 1B, 2B, 3B, SS, LF, CF, RF
  const order = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']
  const fielders = order.map((pos) => {
    const f = byPos.get(pos)
    return f ? { id: f.id, name: f.name, pos: f.pos, num: f.num } : null
  })

  return {
    tag,
    name: teamName,
    abbreviation: teamAbbrev(teamName),
    lineup: starters,
    pitchers,
    starter,
    fielders,
  }
}

/**
 * Build a full scorecard-ready game object from the live feed.
 */
export function buildGame(data) {
  const gd = data.gameData ?? {}
  const box = data.liveData?.boxscore
  if (!box) return null

  const away = parseSide(box.teams.away, 'away', gd.probablePitchers?.away?.id)
  const home = parseSide(box.teams.home, 'home', gd.probablePitchers?.home?.id)

  const weather = gd.weather ?? {}
  const venue = gd.venue ?? {}
  const fieldInfo = venue.fieldInfo ?? {}

  const record = (side) => {
    const r = gd.teams?.[side]?.record?.leagueRecord
    if (!r) return ''
    return `${r.wins}-${r.losses}${r.ties ? `-${r.ties}` : ''}`
  }

  const ls = data.liveData?.linescore
  const linescore = ls
    ? {
        innings: (ls.innings ?? []).map((inn) => ({
          home: inn.home?.runs ?? 0,
          away: inn.away?.runs ?? 0,
        })),
        teams: {
          home: ls.teams?.home ?? {},
          away: ls.teams?.away ?? {},
        },
      }
    : null

  const umpires = (box.officials ?? []).map((o) => ({
    type: o.officialType,
    name: o.official?.fullName ?? '',
  }))

  const gi = gd.gameInfo ?? {}
  const game = gd.game ?? {}
  const long = (s) => (s ? `${s.slice(0, 10)} ${s.slice(11, 19)}` : '')

  return {
    officialDate: gd.datetime?.officialDate || '',
    venue: venue.name || '',
    city: venue.location?.city || '',
    roof: fieldInfo.roofType ?? '',
    weather: {
      condition: weather.condition,
      temp: weather.temp,
      wind: weather.wind,
    },
    attendance: gi.attendance ?? '',
    gameDurationMinutes: gi.gameDurationMinutes ?? '',
    firstPitch: long(gi.firstPitch),
    startTime: gd.datetime?.dateTime
      ? `${gd.datetime.time || ''}${gd.datetime.ampm ? ` ${gd.datetime.ampm}` : ''}`.trim()
      : '',
    status: gd.status?.detailedState || '',
    dayNight: gd.datetime?.dayNight || '',
    gameType: game.type ?? '',
    umpires,
    linescore,
    away: { ...away, record: record('away') },
    home: { ...home, record: record('home') },
  }
}
