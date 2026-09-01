import { useEffect, useState } from 'react';
import SectionHeader from '../shared/SectionHeader';
import { getTodayLocal, fetchGames, fetchGame, buildGame, buildGameData } from '../../lib/gameConfig';

async function loadGameData(date, gamePk) {
  const data = await fetchGame(gamePk);
  const game = buildGame(data);
  if (!game) throw new Error('No boxscore data for this game yet.');
  return buildGameData(game);
}

export default function GameSection({ gameData, onGameLoaded }) {
  const [date, setDate] = useState(getTodayLocal);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchGames(date)
      .then((gs) => {
        if (!cancelled) setGames(gs);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  function handleDateChange(e) {
    setError(null);
    setGames([]);
    setLoading(true);
    setDate(e.target.value);
  }

  function handleGameChange(e) {
    const gamePk = e.target.value ? Number(e.target.value) : null;
    if (gamePk == null) {
      onGameLoaded(null);
      return;
    }
    setLoading(true);
    setError(null);
    loadGameData(date, gamePk)
      .then(onGameLoaded)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  return (
    <SectionHeader title="MLB Game" defaultOpen={false}>
      <div>
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-700 shrink-0">Date</span>
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </label>
      </div>
      <div>
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-700 shrink-0">Game</span>
          <select
            value={gameData ? 'loaded' : ''}
            onChange={handleGameChange}
            className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">Select a game…</option>
            {games.map((g) => (
              <option key={g.gamePk} value={g.gamePk}>
                {g.away.abbreviation} @ {g.home.abbreviation} — {g.status.detailedState}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-xs text-gray-500">Loading…</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {gameData && (
        <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 flex items-center justify-between gap-2">
          <span className="truncate">{gameData.name}</span>
          <button
            type="button"
            onClick={() => onGameLoaded(null)}
            className="text-blue-500 hover:text-blue-700 shrink-0"
          >
            Clear
          </button>
        </div>
      )}
    </SectionHeader>
  );
}
