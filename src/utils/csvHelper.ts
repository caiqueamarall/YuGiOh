import type { Player } from '../types';

/**
 * Converte a lista de duelistas para formato CSV
 */
export function exportPlayersToCSV(players: Player[]): string {
  const headers = [
    'id',
    'nome',
    'idade',
    'pontos',
    'vitorias',
    'empates',
    'derrotas',
    'participacoes',
    'trofeus',
    'deck_mais_usado',
    'decks_historico',
  ];

  const rows = players.map((p) => {
    // Calcula deck mais usado na Liga Oficial
    let mostUsedDeck = '';
    const deckCountMap: Record<string, number> = {};
    if (p.decksHistory && p.decksHistory.length > 0) {
      for (const h of p.decksHistory) {
        if (h.countsForLeague === false) continue; // Apenas torneios oficiais da Liga
        deckCountMap[h.deckName] = (deckCountMap[h.deckName] || 0) + 1;
      }
      const sorted = Object.entries(deckCountMap).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) mostUsedDeck = sorted[0][0];
    }

    const historyStr = p.decksHistory && p.decksHistory.length > 0
      ? `"${Object.entries(deckCountMap).map(([k, v]) => `${k}:${v}`).join(';')}"`
      : '""';

    return [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.age !== undefined && p.age !== null ? p.age : '',
      p.points,
      p.wins,
      p.draws,
      p.losses,
      p.participations,
      p.trophies,
      `"${mostUsedDeck.replace(/"/g, '""')}"`,
      historyStr,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Lê e analisa um arquivo CSV para a lista de jogadores
 */
export function parsePlayersFromCSV(csvContent: string): Player[] {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const players: Player[] = [];
  // Pula a linha de cabeçalho
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Tratamento simples de campos CSV considerando aspas
    const tokens = parseCSVLine(line);
    if (tokens.length < 2) continue;

    const id = tokens[0] || `p-${Date.now()}-${i}`;
    const name = tokens[1] || `Duelista ${i}`;
    const parsedAge = tokens[2] ? parseInt(tokens[2], 10) : NaN;
    const age = !isNaN(parsedAge) && parsedAge > 0 ? parsedAge : undefined;
    const points = parseInt(tokens[3], 10) || 0;
    const wins = parseInt(tokens[4], 10) || 0;
    const draws = parseInt(tokens[5], 10) || 0;
    const losses = parseInt(tokens[6], 10) || 0;
    const participations = parseInt(tokens[7], 10) || 0;
    const trophies = parseInt(tokens[8], 10) || wins;

    players.push({
      id,
      name,
      age,
      active: true,
      createdAt: new Date().toISOString(),
      points,
      wins,
      draws,
      losses,
      participations,
      trophies,
      decksHistory: [],
    });
  }

  return players;
}

/**
 * Parser de linha CSV com suporte a campos entre aspas
 */
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Dispara o download de um arquivo no navegador
 */
export function downloadFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
