import type { Player, Tournament } from '../types';
import {
  calculateTournamentStandings,
  getTiebreakExplanations,
  sortPlayersForLeague,
  getLeagueTiebreakExplanations,
} from './swissEngine';

const PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 12mm 14mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    font-size: 12px;
    line-height: 1.4;
    padding: 10px;
  }
  .print-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
  }
  @media print {
    .print-actions {
      display: none !important;
    }
    body {
      padding: 0;
    }
  }
  .btn-print {
    background: #d97706;
    color: #ffffff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
  }
  .btn-close {
    background: #64748b;
    color: #ffffff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
  }
  .pdf-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #b45309;
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .pdf-title-group h1 {
    font-size: 20px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .pdf-title-group .subtitle {
    font-size: 13px;
    color: #b45309;
    font-weight: 700;
    margin-top: 2px;
  }
  .pdf-meta {
    text-align: right;
    font-size: 11px;
    color: #64748b;
  }
  .pdf-meta strong {
    color: #0f172a;
  }
  .topcut-banner {
    background: #fffbeb;
    border: 1.5px solid #f59e0b;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 14px;
  }
  .topcut-banner-title {
    font-size: 12px;
    font-weight: 800;
    color: #b45309;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .topcut-banner-desc {
    font-size: 11px;
    color: #78350f;
    margin-top: 3px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  th {
    background: #0f172a;
    color: #ffffff;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 8px 6px;
    text-align: center;
    border: 1px solid #0f172a;
  }
  th.text-left {
    text-align: left;
    padding-left: 10px;
  }
  td {
    padding: 6px;
    font-size: 11.5px;
    border-bottom: 1px solid #e2e8f0;
    text-align: center;
  }
  td.text-left {
    text-align: left;
    padding-left: 10px;
  }
  tr.topcut-row {
    background-color: #fefce8;
  }
  tr.topcut-row:nth-child(even) {
    background-color: #fef9c3;
  }
  tr.regular-row:nth-child(even) {
    background-color: #f8fafc;
  }
  .badge-tc {
    display: inline-block;
    background: #f59e0b;
    color: #000000;
    font-size: 9px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 4px;
    margin-left: 6px;
    text-transform: uppercase;
    vertical-align: middle;
  }
  .cut-line {
    border-top: 2px dashed #d97706;
    background: #fffbeb;
    font-weight: 800;
    color: #b45309;
    font-size: 10px;
    text-align: center;
    padding: 4px !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .deck-pill {
    display: inline-block;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #334155;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
  }
  .podium-box {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    max-width: 820px;
  }
  .podium-card {
    flex: 1;
    border-radius: 8px;
    padding: 0;
    text-align: center;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  }
  .podium-card.place-1 {
    border: 2px solid #d97706;
    background: linear-gradient(180deg, #fffbeb 0%, #ffffff 70%);
  }
  .podium-card.place-2 {
    border: 2px solid #64748b;
    background: linear-gradient(180deg, #f8fafc 0%, #ffffff 70%);
  }
  .podium-card.place-3 {
    border: 2px solid #ea580c;
    background: linear-gradient(180deg, #fff7ed 0%, #ffffff 70%);
  }
  .podium-header-bar {
    padding: 5px 8px;
    font-size: 10.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #ffffff;
  }
  .podium-card.place-1 .podium-header-bar {
    background: linear-gradient(135deg, #d97706, #b45309);
  }
  .podium-card.place-2 .podium-header-bar {
    background: linear-gradient(135deg, #64748b, #475569);
  }
  .podium-card.place-3 .podium-header-bar {
    background: linear-gradient(135deg, #ea580c, #c2410c);
  }
  .podium-body {
    padding: 8px 10px;
  }
  .podium-player {
    font-size: 15px;
    font-weight: 800;
    margin: 2px 0;
  }
  .podium-card.place-1 .podium-player {
    color: #92400e;
  }
  .podium-card.place-2 .podium-player {
    color: #1e293b;
  }
  .podium-card.place-3 .podium-player {
    color: #9a3412;
  }
  .podium-sub {
    font-size: 11px;
    color: #475569;
    font-weight: 600;
  }
  .podium-badge-pts {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
    margin-top: 4px;
  }
  .podium-card.place-1 .podium-badge-pts {
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #f59e0b;
  }
  .podium-card.place-2 .podium-badge-pts {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #94a3b8;
  }
  .podium-card.place-3 .podium-badge-pts {
    background: #ffedd5;
    color: #c2410c;
    border: 1px solid #ea580c;
  }
  table.standings-table {
    width: 100%;
    max-width: 820px;
    margin-bottom: 10px;
  }
  table.matches-table {
    width: 100%;
    max-width: 820px;
    table-layout: fixed;
    margin-bottom: 14px;
    border-collapse: collapse;
  }
  table.matches-table th {
    background: #0f172a;
    color: #ffffff;
    padding: 6px 8px;
    font-size: 10.5px;
    border: 1px solid #1e293b;
  }
  table.matches-table td {
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    font-size: 11px;
    vertical-align: middle;
  }
  .cell-winner {
    background-color: #ecfdf5 !important;
    border-left: 3px solid #10b981 !important;
  }
  .winner-pill-pdf {
    display: inline-block;
    background: #059669;
    color: #ffffff;
    font-size: 8.5px;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 3px;
    margin-right: 5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    vertical-align: middle;
  }
  .winner-name-pdf {
    color: #065f46;
    font-weight: 800;
    font-size: 12px;
  }
  .loser-name-pdf {
    color: #64748b;
    font-weight: 500;
    font-size: 11px;
  }
  .deck-pill-pdf {
    font-size: 9.5px;
    color: #64748b;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 600;
    margin-left: 4px;
    vertical-align: middle;
  }
  .score-badge-pdf {
    display: inline-block;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    font-weight: 800;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    color: #0f172a;
    white-space: nowrap;
  }
  .badge-by-pdf {
    display: inline-block;
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
    font-size: 9px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .tiebreak-pdf-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-left: 3px solid #b45309;
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 14px;
    max-width: 820px;
  }
  .tiebreak-pdf-title {
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 6px;
  }
  .tiebreak-pdf-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 10px;
    margin-bottom: 5px;
  }
  .tiebreak-pdf-badge {
    background: #e2e8f0;
    color: #0f172a;
    font-weight: 800;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 9.5px;
    white-space: nowrap;
  }
  .tiebreak-pdf-text {
    flex: 1;
    color: #334155;
  }
  .tiebreak-pdf-text ul {
    margin: 2px 0 0 14px;
  }
  .tiebreak-pdf-text li {
    margin-bottom: 2px;
  }
  .round-title {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    background: #f1f5f9;
    padding: 6px 10px;
    border-left: 4px solid #b45309;
    margin: 14px 0 6px 0;
    text-transform: uppercase;
    max-width: 820px;
    box-sizing: border-box;
  }
  .pdf-footer {
    border-top: 1px solid #cbd5e1;
    margin-top: 20px;
    padding-top: 8px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
  }
`;

function triggerPrintWindow(title: string, bodyContent: string) {
  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    ${PRINT_CSS}
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
    <button class="btn-close" onclick="window.close()">Fechar</button>
  </div>
  ${bodyContent}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`);
    printWindow.document.close();
  } else {
    // Fallback: Iframe invisível caso bloqueador de pop-ups bloqueie a janela
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${bodyContent}</body>
</html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2500);
      }, 400);
    }
  }
}

/**
 * Exporta o Ranking Geral da Liga em formato PDF
 */
export function exportLeagueRankingPDF(players: Player[]): void {
  const activePlayers = sortPlayersForLeague(players);
  const tiebreakNotes = getLeagueTiebreakExplanations(activePlayers);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const getPlayerMostUsedDeck = (p: Player) => {
    if (!p.decksHistory || p.decksHistory.length === 0) return '-';
    const counts: Record<string, number> = {};
    for (const h of p.decksHistory) {
      if (h.countsForLeague === false) continue;
      counts[h.deckName] = (counts[h.deckName] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : '-';
  };

  const rowsHtml: string[] = [];

  activePlayers.forEach((player, index) => {
    const rank = index + 1;
    const isTopCut = rank <= 12;
    const totalMatches = player.wins + player.draws + player.losses;
    const winRate = totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0;
    const mostDeck = getPlayerMostUsedDeck(player);

    rowsHtml.push(`
      <tr class="${isTopCut ? 'topcut-row' : 'regular-row'}">
        <td><strong>${rank}º</strong></td>
        <td class="text-left">
          <strong>${player.name}</strong>
          ${isTopCut ? '<span class="badge-tc">TOP CUT</span>' : ''}
        </td>
        <td><strong>${player.points} pts</strong></td>
        <td>${player.wins}</td>
        <td>${player.draws}</td>
        <td>${player.losses}</td>
        <td>${player.participations}</td>
        <td>${player.trophies}</td>
        <td>${winRate}%</td>
        <td><span class="deck-pill">${mostDeck}</span></td>
      </tr>
    `);

    // Linha de corte visual após o 12º colocado se houver mais de 12 jogadores
    if (rank === 12 && activePlayers.length > 12) {
      rowsHtml.push(`
        <tr>
          <td colspan="10" class="cut-line">
            ✂️ LINHA DE CORTE • TOP 12 CLASSIFICADOS PARA O TORNEIO FINAL (TOP CUT)
          </td>
        </tr>
      `);
    }
  });

  const content = `
    <div class="pdf-header">
      <div class="pdf-title-group">
        <h1>Yu-Gi-Oh! Edison League</h1>
        <div class="subtitle">Ranking Geral Oficial da Temporada</div>
      </div>
      <div class="pdf-meta">
        <div>Data de Emissão: <strong>${dateStr} às ${timeStr}</strong></div>
        <div>Total de Duelistas Ativos: <strong>${activePlayers.length}</strong></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50px;">Pos</th>
          <th class="text-left">Duelista</th>
          <th style="width: 75px;">Pontos</th>
          <th style="width: 50px;">V</th>
          <th style="width: 50px;">E</th>
          <th style="width: 50px;">D</th>
          <th style="width: 55px;">Part.</th>
          <th style="width: 55px;">Troféus</th>
          <th style="width: 65px;">Win Rate</th>
          <th style="width: 140px;">Deck Mais Usado</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml.join('')}
      </tbody>
    </table>
    <div style="font-size: 10px; color: #64748b; margin-top: -6px; margin-bottom: 12px;">
      * Critérios de Desempate da Liga: Pontos &gt; Títulos de Campeão &gt; Medalhas/Pico Histórico em Torneios &gt; Vitórias &gt; Menos Derrotas &gt; Sem BY &gt; Aproveitamento (Win Rate).
    </div>

    ${tiebreakNotes.length > 0 ? `
      <div class="tiebreak-pdf-box">
        <div class="tiebreak-pdf-title">📌 Observações de Desempate da Liga (Duelistas com mesma pontuação):</div>
        <div class="tiebreak-pdf-list">
          ${tiebreakNotes.map((note) => `
            <div class="tiebreak-pdf-item">
              <span class="tiebreak-pdf-badge">${note.points} Pts</span>
              <div class="tiebreak-pdf-text">
                <strong>Empate entre: ${note.players.join(', ')}</strong>
                <ul>
                  ${note.reasons.map((r) => `<li>${r}</li>`).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="pdf-footer">
      <span>Edison League Manager • Sistema de Torneios Edison Format</span>
      <span>Documento Oficial de Classificação • edisonformat.com</span>
    </div>
  `;

  triggerPrintWindow(`Ranking_Liga_Edison_${dateStr.replace(/\//g, '-')}`, content);
}

/**
 * Exporta o Resultado Completo de um Torneio Individual em PDF
 */
export function exportTournamentResultsPDF(tournament: Tournament, players: Player[]): void {
  const standings = calculateTournamentStandings(tournament, players);
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const firstPlace = standings[0];
  const secondPlace = standings[1];
  const thirdPlace = standings[2];
  const tiebreakNotes = getTiebreakExplanations(standings);
  const playerDecks = tournament.playerDecks || {};

  const tournDate = tournament.date
    ? new Date(tournament.date).toLocaleDateString('pt-BR')
    : '-';

  // Tabela de Classificação Final
  const standingsRows = standings.map((s) => `
    <tr>
      <td><strong>${s.rank}º</strong></td>
      <td class="text-left"><strong>${s.playerName}</strong></td>
      <td><span class="deck-pill">${playerDecks[s.playerId] || 'Edison Deck'}</span></td>
      <td><strong>${s.matchPoints} pts</strong></td>
      <td>${s.matchWins}-${s.matchDraws}-${s.matchLosses}</td>
      <td>${s.gamesWon} - ${s.gamesLost}</td>
      <td>${s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
      <td>${s.hadBy ? 'Sim' : '-'}</td>
      <td><strong>${s.pmw.toFixed(2)}</strong> <span style="font-size: 9px; color: #64748b;">(${s.pmwPercentage}%)</span></td>
      <td style="background-color: #fefce8; color: #b45309; font-weight: 800;"><strong>${s.omw.toFixed(2)}</strong> <span style="font-size: 9px; color: #78350f;">(${s.omwPercentage}%)</span></td>
      <td><strong>${s.pgw.toFixed(2)}</strong> <span style="font-size: 9px; color: #64748b;">(${s.pgwPercentage}%)</span></td>
      <td><strong>${s.ogw.toFixed(2)}</strong> <span style="font-size: 9px; color: #64748b;">(${s.ogwPercentage}%)</span></td>
    </tr>
  `).join('');

  // Tabela de Confrontos Rodada a Rodada
  const roundsHtml = tournament.rounds.map((round) => {
    const matchesRows = round.matches.map((m) => {
      const p1 = playerMap.get(m.player1Id);
      const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
      const p1Deck = playerDecks[m.player1Id] || 'Edison Deck';
      const p2Deck = m.player2Id ? playerDecks[m.player2Id] || 'Edison Deck' : '';

      if (m.isBy) {
        return `
          <tr>
            <td style="width: 65px; font-weight: 700; color: #475569;">Mesa ${m.tableNumber}</td>
            <td class="text-left cell-winner" style="width: 335px;">
              <span class="winner-pill-pdf" style="background: #b45309;">✓ BY (+3)</span>
              <strong class="winner-name-pdf" style="color: #92400e;">${p1?.name}</strong>
              <span class="deck-pill-pdf">${p1Deck}</span>
            </td>
            <td style="width: 85px;">
              <span class="badge-by-pdf">2 x 0 (BY)</span>
            </td>
            <td class="text-left" style="width: 335px; color: #64748b; font-style: italic; font-size: 10.5px;">
              Vitória Automática (Folga)
            </td>
          </tr>
        `;
      }

      const p1Winner = m.winnerId === m.player1Id;
      const p2Winner = m.winnerId === m.player2Id;
      const scoreText = `${m.gameWins1} x ${m.gameWins2}${m.isDraw ? ' (Empate)' : ''}${m.isWO ? ' (WO)' : ''}`;

      return `
        <tr>
          <td style="width: 65px; font-weight: 700; color: #475569;">Mesa ${m.tableNumber}</td>
          <td class="text-left ${p1Winner ? 'cell-winner' : ''}" style="width: 335px;">
            ${p1Winner ? '<span class="winner-pill-pdf">🏆 VENCEU</span>' : ''}
            <span class="${p1Winner ? 'winner-name-pdf' : (p2Winner ? 'loser-name-pdf' : '')}">
              ${p1Winner ? `<strong>${p1?.name}</strong>` : (p1?.name || '')}
            </span>
            <span class="deck-pill-pdf">${p1Deck}</span>
          </td>
          <td style="width: 85px;">
            <span class="score-badge-pdf">${scoreText}</span>
          </td>
          <td class="text-left ${p2Winner ? 'cell-winner' : ''}" style="width: 335px;">
            ${p2Winner ? '<span class="winner-pill-pdf">🏆 VENCEU</span>' : ''}
            <span class="${p2Winner ? 'winner-name-pdf' : (p1Winner ? 'loser-name-pdf' : '')}">
              ${p2Winner ? `<strong>${p2?.name}</strong>` : (p2?.name || '')}
            </span>
            <span class="deck-pill-pdf">${p2Deck}</span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="round-title">Rodada ${round.roundNumber} (Sistema Suíço)</div>
      <table class="matches-table">
        <thead>
          <tr>
            <th style="width: 65px;">Mesa</th>
            <th class="text-left" style="width: 335px;">Duelista 1</th>
            <th style="width: 85px;">Placar Bo3</th>
            <th class="text-left" style="width: 335px;">Duelista 2</th>
          </tr>
        </thead>
        <tbody>
          ${matchesRows}
        </tbody>
      </table>
    `;
  }).join('');

  const content = `
    <div class="pdf-header">
      <div class="pdf-title-group">
        <h1>${tournament.name}</h1>
        <div class="subtitle">
          ${tournament.countsForLeague !== false ? 'Torneio Oficial da Liga Edison' : 'Torneio Freeplay (Amistoso)'}
        </div>
      </div>
      <div class="pdf-meta">
        <div>Data: <strong>${tournDate}</strong></div>
        <div>Total de Rodadas: <strong>${tournament.totalRounds} Rodadas</strong></div>
        <div>Participantes: <strong>${tournament.playerIds.length} duelistas</strong></div>
      </div>
    </div>

    <!-- Pódio Top 3 -->
    <div class="podium-box">
      ${firstPlace ? `
        <div class="podium-card place-1">
          <div class="podium-header-bar">👑 1º Lugar • Campeão</div>
          <div class="podium-body">
            <div class="podium-player">${firstPlace.playerName}</div>
            <div class="podium-sub">${playerDecks[firstPlace.playerId] || 'Edison Deck'}</div>
            <div class="podium-badge-pts">${firstPlace.matchPoints} pontos (${firstPlace.matchWins}-${firstPlace.matchDraws}-${firstPlace.matchLosses})</div>
          </div>
        </div>
      ` : ''}
      ${secondPlace ? `
        <div class="podium-card place-2">
          <div class="podium-header-bar">🥈 2º Lugar • Vice</div>
          <div class="podium-body">
            <div class="podium-player">${secondPlace.playerName}</div>
            <div class="podium-sub">${playerDecks[secondPlace.playerId] || 'Edison Deck'}</div>
            <div class="podium-badge-pts">${secondPlace.matchPoints} pontos (${secondPlace.matchWins}-${secondPlace.matchDraws}-${secondPlace.matchLosses})</div>
          </div>
        </div>
      ` : ''}
      ${thirdPlace ? `
        <div class="podium-card place-3">
          <div class="podium-header-bar">🥉 3º Lugar • Bronze Nobre</div>
          <div class="podium-body">
            <div class="podium-player">${thirdPlace.playerName}</div>
            <div class="podium-sub">${playerDecks[thirdPlace.playerId] || 'Edison Deck'}</div>
            <div class="podium-badge-pts">${thirdPlace.matchPoints} pontos (${thirdPlace.matchWins}-${thirdPlace.matchDraws}-${thirdPlace.matchLosses})</div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Tabela de Classificação -->
    <div class="round-title">Classificação Final do Torneio (Critérios de Desempate TCG)</div>
    <table class="standings-table">
      <thead>
        <tr>
          <th style="width: 38px;">Rank</th>
          <th class="text-left" style="width: 130px;">Duelista</th>
          <th style="width: 105px;">Deck</th>
          <th style="width: 52px;">Pontos</th>
          <th style="width: 48px;">V-E-D</th>
          <th style="width: 52px;">Games</th>
          <th style="width: 44px;">Saldo</th>
          <th style="width: 36px;">BY</th>
          <th style="width: 58px;">PMW%</th>
          <th style="width: 58px; background: #b45309;">OMW%</th>
          <th style="width: 58px;">PGW%</th>
          <th style="width: 58px;">OGW%</th>
        </tr>
      </thead>
      <tbody>
        ${standingsRows}
      </tbody>
    </table>
    <div style="font-size: 10px; color: #64748b; margin-top: -6px; margin-bottom: 12px;">
      * Desempates Oficiais: Pontos &gt; Sem BY &gt; OMW% (Força dos Oponentes) &gt; PGW% (Games do Jogador) &gt; OGW% (Games dos Oponentes). Piso mínimo: 0.33.
    </div>

    <!-- Observações de Desempate -->
    ${tiebreakNotes.length > 0 ? `
      <div class="tiebreak-pdf-box">
        <div class="tiebreak-pdf-title">📌 Observações de Desempate (Duelistas com mesma pontuação):</div>
        <div class="tiebreak-pdf-list">
          ${tiebreakNotes.map((note) => `
            <div class="tiebreak-pdf-item">
              <span class="tiebreak-pdf-badge">${note.points} Pts</span>
              <div class="tiebreak-pdf-text">
                <strong>Empate entre: ${note.players.join(', ')}</strong>
                <ul>
                  ${note.reasons.map((r) => `<li>${r}</li>`).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Histórico de Confrontos -->
    ${roundsHtml}

    <div class="pdf-footer">
      <span>Edison League Manager • Relatório Oficial de Torneio</span>
      <span>${tournDate} • Edison Format Bo3</span>
    </div>
  `;

  triggerPrintWindow(`Resultado_${tournament.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`, content);
}
