import { deriveColors } from './engine/colorUtils';

const presets = [
  {
    name: 'Standard',
    description: 'Full scorecard, letter landscape',
    overrides: {},
  },
  {
    name: 'Compact',
    description: 'Half-letter, tighter layout',
    overrides: {
      page: { size: 'HALF_LETTER', orientation: 'landscape' },
      grid: { rows: 9, innings: 9 },
      theme: {
        sizing: {
          inningCellWidth: 52,
          rowHeight: 54,
          playerColWidth: 90,
          posColWidth: 24,
          batColWidth: 16,
          statColWidth: 20,
        },
      },
      cell: {
        diamond: { maxSize: 34 },
      },
      pitchers: { rows: 4 },
      notes: { lines: 3 },
    },
  },
  {
    name: 'Minimalist',
    description: 'Clean B&W, just the diamond',
    overrides: {
      theme: {
        colors: {
          primary: '#444444',
          primaryLight: '#d0d0d0',
          primaryMuted: '#e4e4e4',
          primaryFaint: '#f3f3f3',
          ink: '#1a1a1a',
          background: '#ffffff',
          pageBackground: '#e0e0e0',
          border: '#bbbbbb',
          borderLight: '#d8d8d8',
          diamondFill: '#f0f0f0',
          diamondStroke: '#bbbbbb',
        },
      },
      cell: {
        outcomes: { show: false },
        count: { show: false },
      },
      grid: {
        statColumns: [
          { key: 'R', label: 'R' },
          { key: 'H', label: 'H' },
        ],
      },
      notes: { show: false },
    },
  },
  {
    name: 'Pocket',
    description: '5x7 card, bare essentials',
    overrides: {
      page: { size: '5X7', orientation: 'landscape' },
      grid: { rows: 9, innings: 9, statColumns: [{ key: 'R', label: 'R' }, { key: 'H', label: 'H' }] },
      theme: {
        sizing: {
          inningCellWidth: 44,
          rowHeight: 44,
          playerColWidth: 72,
          posColWidth: 20,
          batColWidth: 14,
          statColWidth: 18,
        },
      },
      cell: {
        outcomes: { show: false },
        diamond: { maxSize: 28 },
        count: { show: false },
      },
      header: { show: false },
      pitchers: { rows: 3 },
      notes: { show: false },
      scoreboard: { show: false },
    },
  },
  {
    name: 'Retro Green',
    description: 'Vintage field-green theme',
    overrides: {
      theme: {
        colors: deriveColors('#2e7d32'),
      },
    },
  },
  {
    name: 'Dark Mode',
    description: 'Dark background, easy on the eyes',
    overrides: {
      theme: {
        colors: {
          primary: '#60a5fa',
          primaryLight: '#1e3a5f',
          primaryMuted: '#172d4a',
          primaryFaint: '#111f33',
          ink: '#e2e8f0',
          background: '#0f172a',
          pageBackground: '#020617',
          border: '#334155',
          borderLight: '#1e293b',
          diamondFill: '#1e293b',
          diamondStroke: '#475569',
        },
      },
    },
  },
  {
    name: 'Ballpark',
    description: 'Classic ballpark scorekeeping sheet with team header details',
    overrides: {
      theme: {
        colors: {
          primary: '#444444',
          primaryLight: '#d0d0d0',
          primaryMuted: '#e4e4e4',
          primaryFaint: '#f3f3f3',
          ink: '#1a1a1a',
          background: '#ffffff',
          pageBackground: '#e0e0e0',
          border: '#4a4a4a',
          borderLight: '#4a4a4a',
          diamondFill: 'transparent',
          diamondStroke: '#d5d5d5',
          batNumber: '#444444',
        },
        fonts: {
          display: 'Barlow Condensed',
          body: 'Barlow',
        },
        sizing: {
          inningCellWidth: 64,
          rowHeight: 66,
          playerColWidth: 110,
          posColWidth: 28,
          batColWidth: 18,
          statColWidth: 24,
        },
      },
      page: {
        size: 'LETTER',
        orientation: 'landscape',
        margins: { top: 24, right: 24, bottom: 24, left: 24 },
      },
      header: {
        show: true,
        showOnSecondPage: true,
        logo: { show: true },
        away: {
          showTeamTitle: true,
          fields: [
            { key: 'manager', label: 'Manager', width: '13%' },
            { key: 'uniform', label: 'Uniforms', width: '16%' },
            { key: 'umpHP', label: 'Umpire HP', width: '9%', umpire: true },
            { key: 'ump1B', label: 'Umpire 1B', width: '9%', umpire: true },
            { key: 'ump2B', label: 'Umpire 2B', width: '9%', umpire: true },
            { key: 'ump3B', label: 'Umpire 3B', width: '9%', umpire: true },
            { key: 'howWatched', label: 'Seat / Announcers', width: '17%' },
            { key: 'start', label: 'First Pitch', width: '14%' },
          ],
        },
        home: {
          showTeamTitle: true,
          fields: [
            { key: 'manager', label: 'Manager', width: '13%' },
            { key: 'uniform', label: 'Uniforms', width: '16%' },
            { key: 'ballpark', label: 'Ballpark', width: '13%' },
            { key: 'city', label: 'City', width: '11%' },
            { key: 'attendance', label: 'Attendance', width: '13%' },
            { key: 'date', label: 'Date', width: '13%' },
            { key: 'weather', label: 'Weather', width: '10%' },
            { key: 'end', label: 'Final Out', width: '11%' },
          ],
        },
      },
      grid: {
        rows: 9,
        innings: 10,
        showInningLabels: true,
        substitutionLines: 2,
        lobRow: { label: 'LOB', showLabel: true },
        statColumns: [
          { key: 'AB', label: 'AB' },
          { key: 'R', label: 'R' },
          { key: 'H', label: 'H' },
          { key: 'RBI', label: 'RBI' },
        ],
      },
      cell: {
        outcomes: { show: false, position: 'top', items: ['1B', '2B', '3B', 'HR', 'BB'] },
        diamond: { show: true, style: 'filled', maxSize: 42 },
        count: { show: false, position: 'bottom-right', balls: 3, strikes: 2, layout: 'vertical' },
      },
      pitchers: {
        rows: 9,
        stats: [
          { key: 'R/L', label: 'R/L' },
          { key: 'IP', label: 'IP' },
          { key: 'H', label: 'H' },
          { key: 'R', label: 'R' },
          { key: 'ER', label: 'ER' },
          { key: 'BB', label: 'BB' },
          { key: 'K', label: 'K' },
        ],
      },
      scoreboard: {
        show: true,
        totals: ['R', 'H', 'E', 'LOB'],
      },
      notes: {
        show: true,
      },
      fielding: {
        show: true,
      },
      print: {
        fitToPage: true,
      },
      pages: 'both',
      sections: {
        away: {
          label: 'Top',
          footer: ['pitchers', 'fielding', 'notes'],
        },
        home: {
          label: 'Bottom',
          footer: ['pitchers', 'fielding', 'scoreboard', 'notes'],
        },
      },
    },
  },
];

export default presets;
