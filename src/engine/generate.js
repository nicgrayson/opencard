// Ported from scorecard engine's scripts/generate.js
// Pure functions only — no Node.js APIs, converted to ES modules

export function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFontsUrl(fonts) {
  const families = [];
  if (fonts.display) {
    families.push(
      `family=${fonts.display.replace(/ /g, "+")}:wght@400;500;600;700`,
    );
  }
  if (fonts.body && fonts.body !== fonts.display) {
    families.push(`family=${fonts.body.replace(/ /g, "+")}:wght@400;500;600`);
  }
  if (families.length === 0) return "";
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

function generateCssVars(config) {
  const c = config.theme.colors;
  const f = config.theme.fonts;
  const s = config.theme.sizing;
  return `
      --primary: ${c.primary};
      --primary-light: ${c.primaryLight};
      --primary-muted: ${c.primaryMuted || c.primaryLight};
      --primary-faint: ${c.primaryFaint};
      --ink: ${c.ink};
      --background: ${c.background};
      --page-bg: ${c.pageBackground};
      --border: ${c.border};
      --border-light: ${c.borderLight};
      --diamond-fill: ${c.diamondFill};
      --diamond-stroke: ${c.diamondStroke || c.border};
      --font-display: '${f.display}', sans-serif;
      --font-body: '${f.body}', sans-serif;
      --cell-size: ${s.inningCellWidth}px;
      --row-height: ${s.rowHeight}px;
      --player-col: ${s.playerColWidth}px;
      --pos-col: ${s.posColWidth}px;
      --stat-col: ${s.statColWidth}px;
      --diamond-max: ${config.cell.diamond.maxSize}px;
      --margin-top: ${(config.page.margins && config.page.margins.top != null) ? config.page.margins.top : 29}px;
      --margin-right: ${(config.page.margins && config.page.margins.right != null) ? config.page.margins.right : 29}px;
      --margin-bottom: ${(config.page.margins && config.page.margins.bottom != null) ? config.page.margins.bottom : 29}px;
      --margin-left: ${(config.page.margins && config.page.margins.left != null) ? config.page.margins.left : 29}px;`;
}

function generateAtBatCell(config) {
  const cell = config.cell;
  let html = '<div class="at-bat-cell">';

  if (cell.outcomes.show) {
    html += '<div class="outcome-labels">';
    for (const item of cell.outcomes.items) {
      html += `<span>${escapeHtml(item)}</span>`;
    }
    html += "</div>";
  }

  if (cell.diamond.show) {
    html += `<div class="diamond-wrap">
        <svg viewBox="0 0 20 20">
          <rect x="3" y="3" width="14" height="14" rx="1"
                transform="rotate(45 10 10)" />
        </svg>
      </div>`;
  }

  if (cell.count.show) {
    html += '<div class="count-tracker">';
    html += '<div class="count-group"><span class="count-label">S</span>';
    for (let i = 0; i < cell.count.strikes; i++) {
      html += '<div class="count-box"></div>';
    }
    html += "</div>";
    html += '<div class="count-group"><span class="count-label">B</span>';
    for (let i = 0; i < cell.count.balls; i++) {
      html += '<div class="count-box"></div>';
    }
    html += "</div>";
    html += "</div>";
  }

  html += "</div>";
  return html;
}

function generateHeader(config, side) {
  const headerConfig = config.header[side] || config.header || {};
  const fields = headerConfig.fields || [];
  const vals = (config.data && config.data.header) || {};
  const sideVals = (side && vals[side]) || {};
  const teamName =
    sideVals.teamName ||
    (side === "away" ? vals.awayTeam : side === "home" ? vals.homeTeam : "") ||
    "";

  let html = '<div class="section-header-content">';
  if (headerConfig.showTeamTitle) {
    html += `<div class="header-team">${escapeHtml(teamName)}</div>`;
  }
  for (const field of fields) {
    const value = field.team
      ? sideVals[field.key] != null
        ? sideVals[field.key]
        : ""
      : vals[field.key] != null
        ? vals[field.key]
        : "";
    html += `<div class="header-field" style="width:${field.width}">
        <label>${escapeHtml(field.label)}</label>
        <div class="header-input">${escapeHtml(value)}</div>
      </div>`;
  }
  html += "</div>";
  return html;
}

function generateBattingGrid(config, tbodyId, lineupData) {
  const { rows, innings, statColumns } = config.grid;
  const atBatHtml = generateAtBatCell(config);
  const lineup = lineupData || [];

  let html = '<div class="grid-wrap"><table class="scoring-grid"><thead><tr>';
  html += '<th class="col-player">Player</th>';
  html += '<th class="col-pos">Pos</th>';
  for (let i = 1; i <= innings; i++) {
    html += `<th class="col-inning">${config.grid.showInningLabels !== false ? i : ''}</th>`;
  }
  for (const col of statColumns) {
    html += `<th class="col-stat">${escapeHtml(col.label)}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (let r = 0; r < rows; r++) {
    const player = lineup[r] || null;
    html += "<tr>";
    const subLines = config.grid.substitutionLines || 0;
    let subHtml = '';
    for (let k = 1; k <= subLines; k++) {
      subHtml += `<div class="sub-line" style="top:${(k / (subLines + 1)) * 100}%"></div>`;
    }
    const textTop =
      subLines > 0 ? ` style="top:${(100 / (2 * (subLines + 1))).toFixed(2)}%"` : "";
    const nameText = player ? player.name || "" : "";
    const num = player && player.num != null ? player.num : "";
    const numPrefix = num !== "" ? `#${num} ` : "";
    html += `<td class="cell-player">${subHtml}<span class="player-name cell-text"${textTop}>${escapeHtml(numPrefix)}${escapeHtml(nameText)}</span></td>`;
    html += `<td class="cell-pos">${subHtml}<span class="cell-text"${textTop}>${escapeHtml(player ? player.pos || "" : "")}</span></td>`;
    for (let i = 0; i < innings; i++) {
      html += `<td class="cell-inning">${atBatHtml}</td>`;
    }
    for (const col of statColumns) {
      const val = player && player.stats && player.stats[col.key] != null && player.stats[col.key] !== ""
        ? player.stats[col.key]
        : "";
      html += `<td class="cell-stat">${subHtml}${escapeHtml(val)}</td>`;
    }
    html += "</tr>";
  }

  html += "</tbody></table></div>";
  return html;
}

function generatePitcherLog(config, pitchers) {
  const { rows, stats } = config.pitchers;
  const data = pitchers || [];
  let html = '<div class="sidebar-block pitcher-block">';
  html += '<div class="sidebar-title">Pitcher</div>';
  html += '<table class="pitcher-table"><thead><tr>';
  html += "<th>Name</th>";
  for (const stat of stats) {
    html += `<th>${escapeHtml(stat.label)}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (let i = 0; i < rows; i++) {
    const p = data[i] || null;
    const num = p && p.num != null ? `#${p.num} ` : "";
    html += `<tr><td>${escapeHtml(num + (p ? p.name || "" : ""))}</td>`;
    for (const stat of stats) {
      const val = p && p.stats && p.stats[stat.key] != null && p.stats[stat.key] !== ""
        ? p.stats[stat.key]
        : "";
      html += `<td>${escapeHtml(val)}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table></div>";
  return html;
}

function generateNotes(config) {
  if (!config.notes.show) return "";
  const lines = config.notes.lines;
  let html = '<div class="sidebar-block notes-block">';
  html += '<div class="sidebar-title">Game Notes</div>';
  html += '<div class="game-notes-area"><div class="game-notes-lines">';
  for (let i = 0; i < lines; i++) {
    html += '<div class="note-line"></div>';
  }
  html += "</div></div></div>";
  return html;
}

function generateScoreboard(config) {
  if (!config.scoreboard.show) return "";
  const innings = config.grid.innings;
  const totals = config.scoreboard.totals;
  const data = (config.data && config.data.scoreboard) || null;
  const rows = [
    { id: "away", name: data ? data.awayName : "" },
    { id: "home", name: data ? data.homeName : "" },
  ];

  const cellVal = (teamId, inningIdx) => {
    if (!data || !data.innings) return "";
    const inn = data.innings[inningIdx];
    if (!inn) return "";
    const v = inn[teamId];
    return v != null && v !== 0 ? v : "";
  };

  let html = '<div class="scoreboard-block">';
  html += `<div class="scoreboard-header">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2 C12 2 14 8 18 12 C14 16 12 22 12 22"/>
        <path d="M12 2 C12 2 10 8 6 12 C10 16 12 22 12 22"/>
      </svg>
      Scoreboard
    </div>`;

  html += '<table class="scoreboard-table"><thead><tr><th>Team</th>';
  for (let i = 1; i <= innings; i++) {
    html += `<th>${config.grid.showInningLabels !== false ? i : ''}</th>`;
  }
  for (const t of totals) {
    html += `<th class="scoreboard-totals">${escapeHtml(t)}</th>`;
  }
  html += "</tr></thead><tbody>";
  for (const row of rows) {
    html += `<tr><td>${escapeHtml(row.name)}</td>`;
    for (let i = 0; i < innings; i++) {
      html += `<td>${cellVal(row.id, i)}</td>`;
    }
    for (const t of totals) {
      const v = data && data.totals && data.totals[row.id]
        ? data.totals[row.id][t]
        : "";
      html += `<td class="scoreboard-totals">${escapeHtml(v != null && v !== "" ? v : "")}</td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";

  html += "</div>";
  return html;
}

const FIELD_META = {
  C: { x: 160, y: 262 },
  "1B": { x: 240, y: 208 },
  "2B": { x: 226, y: 132 },
  "3B": { x: 80, y: 208 },
  SS: { x: 94, y: 132 },
  LF: { x: 58, y: 52 },
  CF: { x: 160, y: 34 },
  RF: { x: 262, y: 52 },
};

const FIELD_NUMBER = {
  C: "2",
  "1B": "3",
  "2B": "4",
  "3B": "5",
  SS: "6",
  LF: "7",
  CF: "8",
  RF: "9",
};

function lastName(full = "") {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function generateFielding(fielding, teamName) {
  const byPos = {};
  for (const f of fielding || []) {
    if (f && f.pos) byPos[f.pos] = f;
  }

  const posCell = (pos) => {
    const f = byPos[pos];
    const { x, y } = FIELD_META[pos] || {};
    const writeLine = `<line class="field-write" x1="${x - 26}" y1="${y}" x2="${x + 26}" y2="${y}"/>`;
    const numText = `<text class="field-num" x="${x}" y="${y + 6}" text-anchor="middle">${FIELD_NUMBER[pos] || ""}</text>`;
    if (!f) {
      return `<g class="field-slot">${writeLine}${numText}</g>`;
    }
    const name = lastName(f.name || "");
    const nameText = name
      ? `<text class="field-pos filled" x="${x}" y="${y - 1}" text-anchor="middle">${escapeHtml(name)}</text>`
      : "";
    return `<g class="field-slot">${nameText}${writeLine}${numText}</g>`;
  };

  return `<div class="sidebar-block fielding-block">
    <div class="sidebar-title">Fielding${teamName ? ` — ${escapeHtml(teamName)}` : ""}</div>
    <div class="fielding-wrap">
      <svg class="fielding" viewBox="0 0 320 300" aria-hidden="true">
        <g class="field-lines">
          <path d="M160,232 L226,166 L160,100 L94,166 Z" class="inf-diamond"/>
          <path d="M160,232 L226,166 L320,72" class="of-line"/>
          <path d="M160,232 L94,166 L0,72" class="of-line"/>
        </g>
        <g class="bases">
          <rect x="156" y="96" width="8" height="8" class="base"/>
          <rect x="222" y="162" width="8" height="8" class="base"/>
          <rect x="90" y="162" width="8" height="8" class="base"/>
        </g>
        ${Object.keys(FIELD_META).map(posCell).join("")}
      </svg>
    </div>
  </div>`;
}

function generateHalfInning(config, side) {
  const sectionConfig = config.sections[side];
  const label = sectionConfig.label;
  const footerItems = sectionConfig.footer;
  const data = (config.data && config.data.sections && config.data.sections[side]) || {};

  const labelParts = label.split(" / ");
  const labelHtml = escapeHtml(labelParts[0] || label);
  const showHeader =
    config.header.show && (side === "away" || config.header.showOnSecondPage !== false);

  let html = '<div class="half-inning">';
  html += '<div class="section-header">';
  html += `<div class="section-label">${labelHtml}</div>`;
  if (showHeader) html += generateHeader(config, side);
  html += '</div>';
  html += '<div class="section-divider"></div>';
  html += '<div class="section-body">';

  html += generateBattingGrid(config, `${side}-batting`, data.lineup);

  html += '<div class="section-footer">';
  for (const item of footerItems) {
    if (item === "pitchers") {
      html += generatePitcherLog(config, data.pitchers);
    } else if (item === "notes") {
      html += generateNotes(config);
    } else if (item === "scoreboard") {
      html += generateScoreboard(config);
    } else if (item === "fielding") {
      if (config.fielding && config.fielding.show) {
        html += generateFielding(data.fielding, data.opponentName || "");
      }
    }
  }
  html += "</div>";

  html += "</div></div>";
  return html;
}

const PAGE_SIZES = {
  LETTER: [8.5, 11],
  A4: [8.27, 11.69],
  LEGAL: [8.5, 14],
  TABLOID: [11, 17],
  HALF_LETTER: [5.5, 8.5],
  A5: [5.83, 8.27],
  '5X7': [5, 7],
  '4X6': [4, 6],
};

function resolvePageSize(page) {
  const orientation = page.orientation || 'landscape';
  let widthIn, heightIn, cssSize;

  if (Array.isArray(page.size)) {
    widthIn = page.size[0];
    heightIn = page.size[1];
    cssSize = `${widthIn}in ${heightIn}in`;
  } else {
    const name = (page.size || 'LETTER').toUpperCase();
    const dims = PAGE_SIZES[name] || PAGE_SIZES.LETTER;
    if (orientation === 'landscape') {
      widthIn = Math.max(dims[0], dims[1]);
      heightIn = Math.min(dims[0], dims[1]);
    } else {
      widthIn = Math.min(dims[0], dims[1]);
      heightIn = Math.max(dims[0], dims[1]);
    }
    cssSize = `${widthIn}in ${heightIn}in`;
  }

  const mt = (page.margins && page.margins.top != null) ? page.margins.top / 96 : 0.3;
  const mr = (page.margins && page.margins.right != null) ? page.margins.right / 96 : 0.3;
  const mb = (page.margins && page.margins.bottom != null) ? page.margins.bottom / 96 : 0.3;
  const ml = (page.margins && page.margins.left != null) ? page.margins.left / 96 : 0.3;

  const availW = (widthIn - ml - mr) * 96;
  const availH = (heightIn - mt - mb) * 96;

  return { widthIn, heightIn, availW, availH, cssSize, mt, mr, mb, ml };
}

function calculatePrintZoom(config) {
  const s = config.theme.sizing;
  const g = config.grid;
  const p = config.pitchers;
  const n = config.notes;

  let maxPageH = 0;

  const sides = config.pages === 'away' ? ['away'] : config.pages === 'home' ? ['home'] : ['away', 'home'];
  for (const side of sides) {
    let height = 0;

    height += 32;

    if (config.header.show && (side === 'away' || config.header.showOnSecondPage !== false)) height += 56;

    height += 26;
    height += 28;
    height += g.rows * s.rowHeight;
    height += 10;

    const footerItems = config.sections[side].footer;
    let maxFooterH = 0;
    for (const item of footerItems) {
      let itemH = 0;
      if (item === 'pitchers') itemH = 28 + 24 + p.rows * 26;
      if (item === 'notes' && n.show) itemH = 28 + 16 + n.lines * 22;
      if (item === 'scoreboard' && config.scoreboard.show) itemH = 100;
      if (item === 'fielding' && config.fielding?.show) itemH = 28 + 190;
      maxFooterH = Math.max(maxFooterH, itemH);
    }
    height += maxFooterH;

    height += 20;

    maxPageH = Math.max(maxPageH, height);
  }

  const width = s.playerColWidth + s.posColWidth
    + g.innings * s.inningCellWidth
    + g.statColumns.length * s.statColWidth
    + 40;

  const { availW, availH } = resolvePageSize(config.page);

  const zoomW = availW / width;
  const zoomH = availH / maxPageH;

  let zoom = Math.min(zoomW, zoomH);
  zoom = Math.min(zoom, 1);
  zoom = Math.floor(zoom * 100) / 100;

  return zoom;
}

export function generatePage(config) {
  const fontsUrl = buildFontsUrl(config.theme.fonts);
  const cssVars = generateCssVars(config);
  const fitToPage = config.print && config.print.fitToPage;
  const printZoom = fitToPage ? calculatePrintZoom(config) : null;
  const pageInfo = resolvePageSize(config.page);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.name)} — Baseball Scorecard</title>
  ${
    fontsUrl
      ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${fontsUrl}" rel="stylesheet">`
      : ""
  }
  <style>
    :root {${cssVars}
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      background: var(--page-bg);
    }

    body {
      font-family: var(--font-body);
      background: var(--page-bg);
      color: var(--ink);
      display: flex;
      justify-content: center;
      padding: 40px 20px;
      min-width: fit-content;
    }

    .scorecard {
      width: fit-content;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .print-page {
      background: var(--background);
      padding: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
      border-radius: 6px;
      box-shadow:
        0 2px 12px rgba(0,0,0,0.08),
        0 8px 40px rgba(0,0,0,0.06);
    }

    .header-team {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 20px;
      letter-spacing: 1px;
      line-height: 1;
      color: var(--primary);
      text-transform: uppercase;
      white-space: nowrap;
      padding-bottom: 2px;
      margin-right: 8px;
    }

    .header-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-field label {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--primary);
    }

    .header-field .header-input {
      height: 22px;
      border-bottom: 1.5px solid var(--border);
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--ink);
    }

    .half-inning {
      margin-bottom: 24px;
    }

    .half-inning:last-of-type {
      margin-bottom: 0;
    }

    .section-header {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 8px;
      padding-bottom: 4px;
    }

    .section-label {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 28px;
      letter-spacing: 3px;
      line-height: 1;
      text-transform: uppercase;
      color: var(--primary);
      white-space: nowrap;
      padding-bottom: 2px;
    }

    .section-header-content {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .section-divider {
      height: 2px;
      background: var(--primary);
      margin-bottom: 0;
      border-radius: 1px;
    }

    .section-body {
      display: flex;
      flex-direction: column;
    }

    .section-footer {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-top: 10px;
    }

    .section-footer .pitcher-block {
      flex: 0 0 auto;
      width: auto;
    }

    .scoring-grid {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
    }

    .scoring-grid th {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--primary);
      padding: 6px 2px;
      text-align: center;
      border-bottom: 2px solid var(--primary);
    }

    .scoring-grid th.col-player {
      text-align: left;
      width: var(--player-col);
      padding-left: 4px;
    }

    .scoring-grid th.col-pos {
      width: var(--pos-col);
    }

    .scoring-grid th.col-inning {
      width: var(--cell-size);
    }

    .scoring-grid th.col-stat {
      width: var(--stat-col);
      background: var(--primary-faint);
      border-bottom-color: var(--primary);
    }

    .scoring-grid td {
      height: var(--row-height);
      border-bottom: 1px solid var(--border-light);
      text-align: center;
      font-size: 13px;
      font-weight: 500;
      vertical-align: middle;
    }

    .scoring-grid tr:last-child td {
      border-bottom: 2px solid var(--primary);
    }

    .scoring-grid td.cell-player {
      text-align: left;
      padding-left: 4px;
      font-weight: 500;
      font-size: 12px;
      color: var(--ink);
      border-right: 1px solid var(--border-light);
    }

    .scoring-grid td.cell-player,
    .scoring-grid td.cell-pos {
      position: relative;
    }

    .scoring-grid .cell-text {
      position: absolute;
      left: 6px;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }

    .scoring-grid td.cell-pos .cell-text {
      left: 0;
      right: 0;
      text-align: center;
    }

    .scoring-grid td.cell-pos {
      font-family: var(--font-display);
      font-size: 12px;
      color: var(--primary);
      border-right: 1px solid var(--border);
    }

    .sub-line {
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px dashed var(--border);
    }

    .scoring-grid td.cell-inning {
      border-right: 1px solid var(--border-light);
      padding: 0;
      position: relative;
    }

    .scoring-grid td.cell-inning:last-of-type {
      border-right: 1px solid var(--border);
    }

    .scoring-grid td.cell-stat {
      background: var(--primary-faint);
      border-right: 1px solid var(--border-light);
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 13px;
      color: var(--ink);
      position: relative;
    }

    .scoring-grid td.cell-stat:last-child {
      border-right: none;
    }

    .at-bat-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      height: 100%;
      padding: 2px 0 2px;
    }

    .outcome-labels {
      display: flex;
      gap: 1px;
      justify-content: center;
      flex-shrink: 0;
      line-height: 1;
      width: 100%;
      overflow: hidden;
    }

    .outcome-labels span {
      font-family: var(--font-display);
      font-size: calc(var(--cell-size) * 0.11);
      font-weight: 600;
      letter-spacing: 0;
      color: var(--primary-light);
      text-align: center;
      padding: 0 1px;
      line-height: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diamond-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      width: 100%;
    }

    .diamond-wrap svg {
      width: 100%;
      height: 100%;
      max-width: var(--diamond-max);
      max-height: var(--diamond-max);
    }

    .diamond-wrap svg rect {
      fill: var(--diamond-fill);
      stroke: var(--diamond-stroke);
      stroke-width: 1.2;
    }

    .count-tracker {
      position: absolute;
      bottom: -1px;
      right: -1px;
      display: flex;
      align-items: flex-end;
      gap: 0;
      line-height: 1;
    }

    .count-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }

    .count-group .count-label {
      font-family: var(--font-display);
      font-size: 6.5px;
      font-weight: 700;
      color: var(--primary-light);
      line-height: 1;
      margin-bottom: 0px;
    }

    .count-box {
      width: 9px;
      height: 9px;
      border: 1px solid var(--border);
      background: var(--background);
    }

    .count-box + .count-box {
      margin-top: -1px;
    }

    .count-group + .count-group .count-box {
      margin-left: -1px;
    }

    .sidebar-block {
      border: 1.5px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
    }

    .fielding-block {
      flex: 0 0 auto;
      width: max-content;
    }

    .sidebar-title {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--background);
      background: var(--primary);
      padding: 5px 10px;
    }

    .pitcher-table {
      border-collapse: collapse;
      table-layout: auto;
    }

    .pitcher-table th {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 0.5px;
      color: var(--primary);
      padding: 4px 2px;
      text-align: center;
      border-bottom: 1px solid var(--border-light);
      background: var(--primary-faint);
    }

    .pitcher-table th:first-child {
      width: 150px;
      text-align: left;
      padding-left: 8px;
    }

    .pitcher-table th:not(:first-child),
    .pitcher-table td:not(:first-child) {
      width: 26px;
    }

    .pitcher-table td {
      height: 26px;
      border-bottom: 1px solid var(--border-light);
      text-align: center;
      font-size: 12px;
      font-weight: 500;
    }

    .pitcher-table td:first-child {
      text-align: left;
      padding-left: 8px;
      border-right: 1px solid var(--border-light);
    }

    .pitcher-table td:not(:first-child) {
      border-right: 1px solid var(--border-light);
    }

    .pitcher-table td:last-child {
      border-right: none;
    }

    .pitcher-table tr:last-child td {
      border-bottom: none;
    }

    .game-notes-area {
      padding: 8px 10px;
      min-height: 80px;
    }

    .game-notes-lines {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .note-line {
      height: 22px;
      border-bottom: 1px solid var(--border-light);
    }

    .note-line:last-child {
      border-bottom: none;
    }

    .scoreboard-block {
      flex: 1 1 auto;
      border: 2px solid var(--primary);
      border-radius: 6px;
      overflow: hidden;
    }

    .section-footer .notes-block {
      flex: 1 1 auto;
    }

    .scoreboard-header {
      background: var(--primary);
      color: var(--background);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 2px;
      text-transform: uppercase;
      text-align: center;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .scoreboard-header .icon {
      width: 18px;
      height: 18px;
      opacity: 0.8;
    }

    .scoreboard-table {
      border-collapse: collapse;
      width: 100%;
      table-layout: fixed;
    }

    .scoreboard-table th,
    .scoreboard-table td {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      padding: 4px 1px;
      border: 1px solid var(--border-light);
      color: var(--primary);
    }

    .scoreboard-table th {
      background: var(--primary-faint);
      font-size: 10px;
      letter-spacing: 0.5px;
    }

    .scoreboard-table th:first-child,
    .scoreboard-table td:first-child {
      text-align: left;
      padding-left: 8px;
      width: 50px;
      font-weight: 700;
    }

    .scoreboard-table td {
      height: 22px;
      color: var(--ink);
      font-weight: 500;
    }

    th.scoreboard-totals {
      background: var(--primary);
      color: var(--background);
      font-weight: 700;
    }

    td.scoreboard-totals {
      background: var(--primary-faint);
      font-weight: 700;
    }

    .fielding-wrap {
      display: flex;
      justify-content: center;
      padding: 6px;
    }

    .fielding {
      width: 100%;
      max-width: 200px;
      height: auto;
    }

    .fielding .field-lines path {
      fill: none;
      stroke: var(--border);
      stroke-width: 1.4;
    }

    .fielding .field-lines .inf-diamond {
      stroke: var(--diamond-stroke);
      stroke-width: 1.2;
    }

    .fielding .field-lines line {
      stroke: var(--border);
      stroke-width: 1.2;
    }

    .fielding .base {
      fill: var(--background);
      stroke: var(--diamond-stroke);
      stroke-width: 1.2;
    }

    .field-pos {
      font-family: var(--font-body);
      font-size: 17px;
      fill: var(--ink);
      font-weight: 500;
    }

    .field-num {
      fill: var(--primary-light);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 8px;
    }

    .fielding .field-write {
      stroke: var(--border);
      stroke-width: 1;
      stroke-dasharray: 4 3;
    }

    .card-footer {
      margin-top: 12px;
      text-align: right;
      font-family: var(--font-display);
      font-size: 9px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--primary-light);
    }


    @page {
      size: ${pageInfo.cssSize};
      margin: 0;
    }

    @media print {
      body {
        background: white;
        padding: 0;
        margin: 0;${printZoom ? `
        zoom: ${printZoom};` : ''}
      }

      .scorecard {
        gap: 0;
        width: 100%;
      }

      .print-page {
        box-shadow: none;
        border-radius: 0;
        padding: var(--margin-top) var(--margin-right) var(--margin-bottom) var(--margin-left);
        page-break-after: always;
        page-break-inside: avoid;
      }

      .print-page:last-child {
        page-break-after: auto;
      }

      .half-inning {
        margin-bottom: 0;
      }

      .section-footer {
        margin-top: 6px;
        gap: 10px;
      }

      .card-footer {
        margin-top: 8px;
      }

      .diamond-wrap svg rect {
        fill: white;
        stroke: #888;
      }
    }
  </style>
</head>
<body>

<div class="scorecard">
${config.pages !== 'home' ? `  <div class="print-page">
 ${generateHalfInning(config, "away")}
    <div class="card-footer">
      ${escapeHtml(config.name)}
    </div>
  </div>` : ''}
${config.pages !== 'away' ? `  <div class="print-page">
 ${generateHalfInning(config, "home")}
    <div class="card-footer">
      ${escapeHtml(config.name)}
    </div>
  </div>` : ''}
</div>

</body>
</html>`;
}
