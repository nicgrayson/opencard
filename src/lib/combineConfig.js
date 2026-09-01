import { deepMerge } from '../engine/generate';
import defaults from '../engine/defaults.json' with { type: 'json' };

/**
 * Merge user's persisted overrides with live MLB game data to produce the
 * effective config used for preview and print. When no game data is present,
 * returns just the user's configured (blank) scorecard.
 */
export function combineConfig(userOverrides, gameData) {
  const base = deepMerge(defaults, userOverrides);
  if (!gameData) return base;
  return deepMerge(base, {
    data: {
      header: gameData.header,
      scoreboard: gameData.scoreboard,
      sections: gameData.sections,
    },
    sections: {
      away: { footer: gameData.footers.away },
      home: { footer: gameData.footers.home },
    },
    name: gameData.name || base.name,
  });
}
