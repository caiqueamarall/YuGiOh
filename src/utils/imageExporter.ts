import type { Player, Tournament, DeckCardItem } from '../types';
import {
  calculateTournamentStandings,
  getTiebreakExplanations,
  sortPlayersForLeague,
  getLeagueTiebreakExplanations,
} from './swissEngine';
import {
  getEdisonCardByName,
  getCardCategory,
  getCardBanlistLimit,
} from './cardDatabase';

/**
 * Utilitário para desenhar retângulos com cantos arredondados no Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Função auxiliar para disparar o download da imagem PNG gerada
 */
function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string): void {
  // Tenta usar toBlob para melhor compatibilidade com dispositivos móveis
  if (canvas.toBlob) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  } else {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Exporta os Resultados de um Torneio Individual como imagem PNG em página única
 */
export function exportTournamentResultsPNG(tournament: Tournament, players: Player[]): void {
  const standings = calculateTournamentStandings(tournament, players);
  const playerDecks = tournament.playerDecks || {};
  const tiebreakNotes = getTiebreakExplanations(standings, tournament);

  const tournDate = tournament.date
    ? new Date(tournament.date).toLocaleDateString('pt-BR')
    : '-';

  const firstPlace = standings[0];
  const secondPlace = standings[1];
  const thirdPlace = standings[2];

  // Dimensões do Canvas (Expandido para 1480px para acomodar confortavelmente todas as porcentagens oficiais)
  const width = 1480;
  const padding = 40;
  const contentWidth = width - padding * 2;

  // Cálculo da altura dinâmica para garantir exatamente 1 página
  const headerHeight = 110;
  const podiumHeight = standings.length >= 2 ? 160 : 0;
  const tableHeaderHeight = 44;
  const rowHeight = 36;
  const tableHeight = tableHeaderHeight + standings.length * rowHeight;
  const legendHeight = 32;
  const tiebreakHeight = tiebreakNotes.length > 0 ? 30 + tiebreakNotes.length * 28 : 0;
  const footerHeight = 60;

  const totalHeight =
    padding +
    headerHeight +
    (podiumHeight > 0 ? podiumHeight + 24 : 0) +
    tableHeight +
    legendHeight +
    (tiebreakHeight > 0 ? tiebreakHeight + 16 : 0) +
    footerHeight +
    padding;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. Fundo Principal Elegante (Tema Noturno Yu-Gi-Oh Edison)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGrad.addColorStop(0, '#121214');
  bgGrad.addColorStop(0.5, '#18181b');
  bgGrad.addColorStop(1, '#0e0e10');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, totalHeight);

  // Borda decorativa externa do card
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  roundRect(ctx, 12, 12, width - 24, totalHeight - 24, 16);
  ctx.stroke();

  let curY = padding;

  // 2. Cabeçalho Oficial
  // Tag Superior
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('YU-GI-OH! EDISON LEAGUE • RELATÓRIO OFICIAL DE TORNEIO', padding, curY + 16);

  // Nome do Torneio
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, -apple-system, sans-serif';
  ctx.fillText(tournament.name, padding, curY + 54);

  // Metadados à direita
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Data: ${tournDate} • Formato Suíço Bo3`, width - padding, curY + 22);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${tournament.playerIds.length} Duelistas • ${tournament.totalRounds} Rodadas`, width - padding, curY + 48);
  ctx.textAlign = 'left';

  // Linha divisória dourada
  curY += 80;
  const divGrad = ctx.createLinearGradient(padding, 0, width - padding, 0);
  divGrad.addColorStop(0, '#f59e0b');
  divGrad.addColorStop(0.5, '#a855f7');
  divGrad.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, curY);
  ctx.lineTo(width - padding, curY);
  ctx.stroke();

  curY += 24;

  // 3. Molduras dos Top 3 (Se houver duelistas suficientes)
  if (podiumHeight > 0) {
    const cardGap = 16;
    const cardWidth = (contentWidth - cardGap * 2) / 3;

    // --- 1º LUGAR: OURO IMPERIAL / MILLENNIUM ---
    if (firstPlace) {
      const cX = padding;
      const cY = curY;

      // Fundo do Card Ouro
      const goldBg = ctx.createLinearGradient(cX, cY, cX, cY + podiumHeight);
      goldBg.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
      goldBg.addColorStop(1, 'rgba(24, 24, 28, 0.96)');
      ctx.fillStyle = goldBg;
      roundRect(ctx, cX, cY, cardWidth, podiumHeight, 12);
      ctx.fill();

      // Borda Dourada Trabalhada
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      roundRect(ctx, cX, cY, cardWidth, podiumHeight, 12);
      ctx.stroke();

      // Faixa Superior Ouro
      const ribbonGrad = ctx.createLinearGradient(cX, cY, cX + cardWidth, cY);
      ribbonGrad.addColorStop(0, '#d97706');
      ribbonGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = ribbonGrad;
      roundRect(ctx, cX, cY, cardWidth, 32, 12);
      ctx.fill();
      // Retângulo para cantos inferiores retos da faixa
      ctx.fillRect(cX, cY + 16, cardWidth, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑 1º LUGAR • CAMPEÃO', cX + cardWidth / 2, cY + 21);

      // Nome do Campeão
      ctx.fillStyle = '#fde68a';
      ctx.font = '900 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(firstPlace.playerName, cX + cardWidth / 2, cY + 70);

      // Deck
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(playerDecks[firstPlace.playerId] || 'Edison Deck', cX + cardWidth / 2, cY + 96);

      // Badge de Pontos
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      roundRect(ctx, cX + cardWidth / 2 - 75, cY + 114, 150, 28, 14);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      roundRect(ctx, cX + cardWidth / 2 - 75, cY + 114, 150, 28, 14);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${firstPlace.matchPoints} pts (${firstPlace.matchWins}-${firstPlace.matchDraws}-${firstPlace.matchLosses})`, cX + cardWidth / 2, cY + 133);
      ctx.textAlign = 'left';
    }

    // --- 2º LUGAR: PRATA / AÇO CROMADO ---
    if (secondPlace) {
      const cX = padding + cardWidth + cardGap;
      const cY = curY;

      // Fundo do Card Prata
      const silverBg = ctx.createLinearGradient(cX, cY, cX, cY + podiumHeight);
      silverBg.addColorStop(0, 'rgba(148, 163, 184, 0.20)');
      silverBg.addColorStop(1, 'rgba(24, 24, 28, 0.96)');
      ctx.fillStyle = silverBg;
      roundRect(ctx, cX, cY, cardWidth, podiumHeight, 12);
      ctx.fill();

      // Borda Prateada
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      roundRect(ctx, cX, cY, cardWidth, podiumHeight, 12);
      ctx.stroke();

      // Faixa Superior Prata
      const ribbonGrad = ctx.createLinearGradient(cX, cY, cX + cardWidth, cY);
      ribbonGrad.addColorStop(0, '#64748b');
      ribbonGrad.addColorStop(1, '#475569');
      ctx.fillStyle = ribbonGrad;
      roundRect(ctx, cX, cY, cardWidth, 32, 12);
      ctx.fill();
      ctx.fillRect(cX, cY + 16, cardWidth, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥈 2º LUGAR • VICE-CAMPEÃO', cX + cardWidth / 2, cY + 21);

      // Nome do 2º Lugar
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 19px system-ui, -apple-system, sans-serif';
      ctx.fillText(secondPlace.playerName, cX + cardWidth / 2, cY + 70);

      // Deck
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(playerDecks[secondPlace.playerId] || 'Edison Deck', cX + cardWidth / 2, cY + 96);

      // Badge de Pontos
      ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
      roundRect(ctx, cX + cardWidth / 2 - 75, cY + 114, 150, 28, 14);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      roundRect(ctx, cX + cardWidth / 2 - 75, cY + 114, 150, 28, 14);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${secondPlace.matchPoints} pts (${secondPlace.matchWins}-${secondPlace.matchDraws}-${secondPlace.matchLosses})`, cX + cardWidth / 2, cY + 133);
      ctx.textAlign = 'left';
    }

    // --- 3º LUGAR: BRONZE NOBRE / COBRE NOBRE (DIFERENCIADO!) ---
    if (thirdPlace) {
      const cX = padding + (cardWidth + cardGap) * 2;
      const cY = curY;

      // Fundo do Card Bronze (Tons quentes de cobre avermelhado)
      const bronzeBg = ctx.createLinearGradient(cX, cY, cX, cY + podiumHeight);
      bronzeBg.addColorStop(0, 'rgba(234, 88, 12, 0.22)');
      bronzeBg.addColorStop(1, 'rgba(24, 24, 28, 0.96)');
      ctx.fillStyle = bronzeBg;
      roundRect(ctx, cX, cY, cardWidth, podiumHeight, 12);
      ctx.fill();

      // Borda Cobre / Bronze Avermelhado
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2;
      roundRect(ctx, cX, cY, cardWidth, podiumHeight, 12);
      ctx.stroke();

      // Faixa Superior Bronze
      const ribbonGrad = ctx.createLinearGradient(cX, cY, cX + cardWidth, cY);
      ribbonGrad.addColorStop(0, '#ea580c');
      ribbonGrad.addColorStop(1, '#c2410c');
      ctx.fillStyle = ribbonGrad;
      roundRect(ctx, cX, cY, cardWidth, 32, 12);
      ctx.fill();
      ctx.fillRect(cX, cY + 16, cardWidth, 16);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥉 3º LUGAR • BRONZE NOBRE', cX + cardWidth / 2, cY + 21);

      // Nome do 3º Lugar
      ctx.fillStyle = '#ffedd5';
      ctx.font = '800 19px system-ui, -apple-system, sans-serif';
      ctx.fillText(thirdPlace.playerName, cX + cardWidth / 2, cY + 70);

      // Deck
      ctx.fillStyle = '#fdba74';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(playerDecks[thirdPlace.playerId] || 'Edison Deck', cX + cardWidth / 2, cY + 96);

      // Badge de Pontos
      ctx.fillStyle = 'rgba(234, 88, 12, 0.25)';
      roundRect(ctx, cX + cardWidth / 2 - 75, cY + 114, 150, 28, 14);
      ctx.fill();
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1;
      roundRect(ctx, cX + cardWidth / 2 - 75, cY + 114, 150, 28, 14);
      ctx.stroke();

      ctx.fillStyle = '#fed7aa';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${thirdPlace.matchPoints} pts (${thirdPlace.matchWins}-${thirdPlace.matchDraws}-${thirdPlace.matchLosses})`, cX + cardWidth / 2, cY + 133);
      ctx.textAlign = 'left';
    }

    curY += podiumHeight + 24;
  }

  // 4. Tabela de Classificação Final
  // Cabeçalho da Tabela
  ctx.fillStyle = '#101420';
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#252d43';
  ctx.lineWidth = 1;
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 8);
  ctx.stroke();

  // Colunas da Tabela
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';

  const colX = {
    pos: padding + 15,
    name: padding + 65,
    deck: padding + 295,
    pts: padding + 485,
    ved: padding + 565,
    games: padding + 645,
    saldo: padding + 715,
    by: padding + 775,
    pmw: padding + 830,
    omw: padding + 975,
    pgw: padding + 1135,
    ogw: padding + 1270,
  };

  ctx.fillText('POS', colX.pos, curY + 26);
  ctx.fillText('DUELISTA', colX.name, curY + 26);
  ctx.fillText('DECK UTILIZADO', colX.deck, curY + 26);
  ctx.fillText('PONTOS', colX.pts, curY + 26);
  ctx.fillText('V-E-D', colX.ved, curY + 26);
  ctx.fillText('GAMES', colX.games, curY + 26);
  ctx.fillText('SALDO', colX.saldo, curY + 26);
  ctx.fillText('BY', colX.by, curY + 26);
  ctx.fillText('PMW%', colX.pmw, curY + 26);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText('OMW% (MÍNIMOS)', colX.omw, curY + 26);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('PGW%', colX.pgw, curY + 26);
  ctx.fillText('OGW%', colX.ogw, curY + 26);

  curY += tableHeaderHeight;

  // Linhas da Tabela
  standings.forEach((s, idx) => {
    const rowY = curY;
    const isEven = idx % 2 === 0;

    // Fundo da linha
    if (idx === 0) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.10)';
    } else if (idx <= 2) {
      ctx.fillStyle = idx === 1 ? 'rgba(148, 163, 184, 0.08)' : 'rgba(234, 88, 12, 0.08)';
    } else {
      ctx.fillStyle = isEven ? 'rgba(32, 32, 36, 0.7)' : 'rgba(24, 24, 28, 0.5)';
    }
    ctx.fillRect(padding, rowY, contentWidth, rowHeight);

    // Linha divisória fina
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, rowY + rowHeight);
    ctx.lineTo(width - padding, rowY + rowHeight);
    ctx.stroke();

    // Texto da Linha
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    if (s.rank === 1) {
      ctx.fillStyle = '#fbbf24';
    } else if (s.rank === 2) {
      ctx.fillStyle = '#e2e8f0';
    } else if (s.rank === 3) {
      ctx.fillStyle = '#fdba74';
    } else {
      ctx.fillStyle = '#94a3b8';
    }
    ctx.fillText(`${s.rank}º`, colX.pos, rowY + 23);

    // Nome
    ctx.fillStyle = '#ffffff';
    ctx.font = s.rank <= 3 ? 'bold 13.5px system-ui, -apple-system, sans-serif' : '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(s.isDropped ? `${s.playerName} [DROP]` : s.playerName, colX.name, rowY + 23);

    // Deck
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(playerDecks[s.playerId] || 'Edison Deck', colX.deck, rowY + 23);

    // Pontos
    ctx.fillStyle = s.rank === 1 ? '#fbbf24' : '#f8fafc';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${s.matchPoints} pts`, colX.pts, rowY + 23);

    // V-E-D
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${s.matchWins}-${s.matchDraws}-${s.matchLosses}`, colX.ved, rowY + 23);

    // Games
    ctx.fillText(`${s.gamesWon}-${s.gamesLost}`, colX.games, rowY + 23);

    // Saldo
    ctx.fillStyle = s.gameDiff > 0 ? '#34d399' : (s.gameDiff < 0 ? '#f43f5e' : '#94a3b8');
    ctx.fillText(s.gameDiff > 0 ? `+${s.gameDiff}` : `${s.gameDiff}`, colX.saldo, rowY + 23);

    // BY
    ctx.fillStyle = s.hadBy ? '#fbbf24' : '#64748b';
    ctx.fillText(s.hadBy ? 'Sim' : '-', colX.by, rowY + 23);

    // PMW% (Player Match Win %)
    const pmwStr = `${(s.pmw ?? 0).toFixed(2)} (${s.pmwPercentage ?? 0}%)`;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(pmwStr, colX.pmw, rowY + 23);

    // OMW% (Mínimos - 1º Critério Oficial de Desempate)
    const omwStr = `${(s.omw ?? 0).toFixed(2)} (${s.omwPercentage ?? 0}%)`;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText(omwStr, colX.omw, rowY + 23);

    // PGW% (Player Game Win %)
    const pgwStr = `${(s.pgw ?? 0).toFixed(2)} (${s.pgwPercentage ?? 0}%)`;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(pgwStr, colX.pgw, rowY + 23);

    // OGW% (Opponent Game Win %)
    const ogwStr = `${(s.ogw ?? 0).toFixed(2)} (${s.ogwPercentage ?? 0}%)`;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(ogwStr, colX.ogw, rowY + 23);

    curY += rowHeight;
  });

  curY += 12;

  // Legenda Oficial de Desempate
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    '* Critérios Oficiais Suíço: Pontos > Sem BY > Mínimos (OMW%) > Saldo de Games > Confronto Direto > PGW% > OGW% (Piso: 0.33)',
    padding + 8,
    curY + 12
  );

  curY += 24;

  // 5. Observações de Desempate (se houver empates)
  if (tiebreakNotes.length > 0) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 1;
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 8);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('📌 Observações Oficiais de Desempate (Duelistas com mesma pontuação):', padding + 16, curY + 20);

    let noteY = curY + 44;
    tiebreakNotes.forEach((note) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      const text = `• [${note.points} Pts] Empate entre ${note.players.join(', ')}: ${note.reasons.join(' | ')}`;
      ctx.fillText(text.length > 130 ? text.substring(0, 127) + '...' : text, padding + 16, noteY);
      noteY += 26;
    });

    curY += tiebreakHeight + 16;
  }

  // 6. Rodapé Oficial
  ctx.fillStyle = '#64748b';
  ctx.font = '11.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('Edison League Manager • Sistema Oficial de Torneios Yu-Gi-Oh! Edison Format (2010)', padding, curY + 22);

  ctx.textAlign = 'right';
  ctx.fillText(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Imagem Oficial (PNG)`, width - padding, curY + 22);
  ctx.textAlign = 'left';

  // 7. Dispara o download da imagem PNG em página única
  const safeFilename = `Resultado_${tournament.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  downloadCanvasAsPNG(canvas, safeFilename);
}

/**
 * Exporta o Ranking Geral da Liga Oficial como imagem PNG em página única
 */
export function exportLeagueRankingPNG(players: Player[]): void {
  const activePlayers = sortPlayersForLeague(players.filter((p) => p.active));
  const tiebreakNotes = getLeagueTiebreakExplanations(activePlayers);

  const width = 1200;
  const padding = 40;
  const contentWidth = width - padding * 2;

  const headerHeight = 110;
  const tableHeaderHeight = 44;
  const rowHeight = 36;
  const tableHeight = tableHeaderHeight + activePlayers.length * rowHeight;
  const tiebreakHeight = tiebreakNotes.length > 0 ? 32 + tiebreakNotes.length * 28 : 0;
  const footerHeight = 60;

  const totalHeight = padding + headerHeight + tableHeight + (tiebreakHeight > 0 ? tiebreakHeight + 16 : 0) + footerHeight + padding;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fundo
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  bgGrad.addColorStop(0, '#121214');
  bgGrad.addColorStop(0.5, '#18181b');
  bgGrad.addColorStop(1, '#0e0e10');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, totalHeight);

  // Borda decorativa
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2;
  roundRect(ctx, 12, 12, width - 24, totalHeight - 24, 16);
  ctx.stroke();

  let curY = padding;

  // Cabeçalho
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('YU-GI-OH! EDISON LEAGUE • CLASSIFICAÇÃO GERAL DA TEMPORADA', padding, curY + 16);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 32px system-ui, -apple-system, sans-serif';
  ctx.fillText('Ranking Oficial da Liga', padding, curY + 54);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, width - padding, curY + 22);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${activePlayers.length} Duelistas Ativos`, width - padding, curY + 48);
  ctx.textAlign = 'left';

  curY += 80;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, curY);
  ctx.lineTo(width - padding, curY);
  ctx.stroke();

  curY += 24;

  // Cabeçalho da Tabela
  ctx.fillStyle = '#101420';
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#252d43';
  ctx.lineWidth = 1;
  roundRect(ctx, padding, curY, contentWidth, tableHeaderHeight, 8);
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';

  const colX = {
    pos: padding + 20,
    name: padding + 80,
    deck: padding + 350,
    pts: padding + 580,
    v: padding + 680,
    e: padding + 740,
    d: padding + 800,
    part: padding + 870,
    trophies: padding + 960,
    winRate: padding + 1060,
  };

  ctx.fillText('POS', colX.pos, curY + 26);
  ctx.fillText('DUELISTA', colX.name, curY + 26);
  ctx.fillText('DECK PRINCIPAL', colX.deck, curY + 26);
  ctx.fillText('PONTOS', colX.pts, curY + 26);
  ctx.fillText('V', colX.v, curY + 26);
  ctx.fillText('E', colX.e, curY + 26);
  ctx.fillText('D', colX.d, curY + 26);
  ctx.fillText('PART.', colX.part, curY + 26);
  ctx.fillText('TÍTULOS', colX.trophies, curY + 26);
  ctx.fillText('WIN RATE', colX.winRate, curY + 26);

  curY += tableHeaderHeight;

  // Linhas
  activePlayers.forEach((p, idx) => {
    const rowY = curY;
    const isEven = idx % 2 === 0;
    const rank = idx + 1;
    const totalMatches = p.wins + p.draws + p.losses;
    const winRate = totalMatches > 0 ? ((p.wins / totalMatches) * 100).toFixed(1) : '0.0';

    if (rank === 1) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    } else if (rank === 2) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
    } else if (rank === 3) {
      ctx.fillStyle = 'rgba(234, 88, 12, 0.08)';
    } else {
      ctx.fillStyle = isEven ? 'rgba(32, 32, 36, 0.7)' : 'rgba(24, 24, 28, 0.5)';
    }
    ctx.fillRect(padding, rowY, contentWidth, rowHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, rowY + rowHeight);
    ctx.lineTo(width - padding, rowY + rowHeight);
    ctx.stroke();

    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = rank === 1 ? '#fbbf24' : (rank === 2 ? '#e2e8f0' : (rank === 3 ? '#fdba74' : '#94a3b8'));
    ctx.fillText(`${rank}º`, colX.pos, rowY + 23);

    ctx.fillStyle = '#ffffff';
    ctx.font = rank <= 3 ? 'bold 13.5px system-ui, -apple-system, sans-serif' : '13px system-ui, -apple-system, sans-serif';
    ctx.fillText(p.name, colX.name, rowY + 23);

    const getPlayerMostUsedDeck = (pl: Player) => {
      if (!pl.decksHistory || pl.decksHistory.length === 0) return '-';
      const counts: Record<string, number> = {};
      for (const h of pl.decksHistory) {
        if (h.countsForLeague === false) continue;
        counts[h.deckName] = (counts[h.deckName] || 0) + 1;
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return sorted.length > 0 ? sorted[0][0] : '-';
    };

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText(getPlayerMostUsedDeck(p), colX.deck, rowY + 23);

    ctx.fillStyle = rank === 1 ? '#fbbf24' : '#f8fafc';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${p.points} pts`, colX.pts, rowY + 23);

    ctx.fillStyle = '#34d399';
    ctx.fillText(`${p.wins}`, colX.v, rowY + 23);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`${p.draws}`, colX.e, rowY + 23);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`${p.losses}`, colX.d, rowY + 23);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${p.participations}`, colX.part, rowY + 23);
    ctx.fillText(`${p.tournamentTitles || 0}`, colX.trophies, rowY + 23);
    ctx.fillText(`${winRate}%`, colX.winRate, rowY + 23);

    curY += rowHeight;
  });

  curY += 16;

  // Observações de Desempate da Liga (se houver empates)
  if (tiebreakNotes.length > 0) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 1;
    roundRect(ctx, padding, curY, contentWidth, tiebreakHeight, 8);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('📌 Critérios Oficiais de Desempate da Liga (Duelistas com mesma pontuação):', padding + 16, curY + 20);

    let noteY = curY + 44;
    tiebreakNotes.forEach((note) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      const text = `• [${note.points} Pts] Empate entre ${note.players.join(', ')}: ${note.reasons.join(' | ')}`;
      ctx.fillText(text.length > 130 ? text.substring(0, 127) + '...' : text, padding + 16, noteY);
      noteY += 26;
    });

    curY += tiebreakHeight + 16;
  }

  // Rodapé
  ctx.fillStyle = '#64748b';
  ctx.font = '11.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('Edison League Manager • Documento Oficial de Classificação', padding, curY + 22);

  ctx.textAlign = 'right';
  ctx.fillText('Imagem Oficial em Alta Resolução (PNG)', width - padding, curY + 22);
  ctx.textAlign = 'left';

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCanvasAsPNG(canvas, `Ranking_Liga_Edison_${dateStr}`);
}

/**
 * Interface dos dados necessários para exportar a decklist completa em PNG
 */
export interface DecklistExportData {
  deckName: string;
  playerName: string;
  mainDeck: DeckCardItem[];
  extraDeck: DeckCardItem[];
  sideDeck: DeckCardItem[];
}

interface ExportCardInstance {
  cardId: number;
  cardName: string;
  category: 'monster' | 'spell' | 'trap' | 'extra';
  type: string;
  banLimit: number;
}

/**
 * Desenha texto rotacionado verticalmente (lendo de baixo para cima, 90° anti-horário)
 */
function drawVerticalRotatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  font: string,
  color: string
) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Espaça as letras para efeito visual destacado
  const spaced = text.split('').join('  ');
  ctx.fillText(spaced, 0, 0);
  ctx.restore();
}

/**
 * Desenha o badge oficial da banlist sobre a carta (Proibida, Limitada ou Semi)
 */
function drawBanlistBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  limit: number,
  isSmall: boolean
) {
  if (limit > 2) return;

  const radius = isSmall ? 7.5 : 9.5;
  const centerX = x + radius + (isSmall ? 2 : 3);
  const centerY = y + radius + (isSmall ? 2 : 3);

  // Fundo preto
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  if (limit === 0) {
    // Proibida: Borda vermelha + barra transversal vermelha
    ctx.lineWidth = isSmall ? 2 : 2.5;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    ctx.beginPath();
    const slashR = radius - 1.5;
    const rad = Math.PI / 4;
    ctx.moveTo(centerX - Math.cos(rad) * slashR, centerY + Math.sin(rad) * slashR);
    ctx.lineTo(centerX + Math.cos(rad) * slashR, centerY - Math.sin(rad) * slashR);
    ctx.stroke();
  } else if (limit === 1) {
    // Limitada: Borda vermelha + número 1 branco
    ctx.lineWidth = isSmall ? 1.5 : 2;
    ctx.strokeStyle = '#ef4444';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isSmall ? 9 : 11}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', centerX, centerY + 0.5);
  } else if (limit === 2) {
    // Semi-limitada: Borda âmbar + número 2 âmbar
    ctx.lineWidth = isSmall ? 1.5 : 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${isSmall ? 9 : 11}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2', centerX, centerY + 0.5);
  }
}

/**
 * Desenha carta substituta quando o download da imagem falha (offline/erro)
 */
function drawFallbackCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  category: 'monster' | 'spell' | 'trap' | 'extra',
  cardName: string,
  isSmall: boolean
) {
  let bgColor = '#b45309';
  if (category === 'spell') bgColor = '#15803d';
  if (category === 'trap') bgColor = '#be185d';
  if (category === 'extra') bgColor = '#6b21a8';

  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, w, h, isSmall ? 3 : 4);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${isSmall ? 8 : 9.5}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxChars = isSmall ? 10 : 13;
  const displayName = cardName.length > maxChars ? cardName.substring(0, maxChars - 1) + '…' : cardName;
  ctx.fillText(displayName, x + w / 2, y + h / 2);
}

/**
 * Desenha slot vazio no grid com fundo translúcido e símbolo '+' discreto
 */
function drawEmptySlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  type: 'deck' | 'side' | 'extra',
  isSmall: boolean
) {
  let fill = 'rgba(168, 85, 247, 0.04)';
  let stroke = 'rgba(168, 85, 247, 0.18)';
  let plusColor = 'rgba(168, 85, 247, 0.3)';

  if (type === 'side') {
    fill = 'rgba(6, 182, 212, 0.05)';
    stroke = 'rgba(6, 182, 212, 0.22)';
    plusColor = 'rgba(6, 182, 212, 0.35)';
  } else if (type === 'extra') {
    fill = 'rgba(249, 115, 22, 0.05)';
    stroke = 'rgba(249, 115, 22, 0.22)';
    plusColor = 'rgba(249, 115, 22, 0.35)';
  }

  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, isSmall ? 3 : 4);
  ctx.fill();

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = plusColor;
  ctx.font = `${isSmall ? 13 : 15}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', x + w / 2, y + h / 2);
}

/**
 * Exporta a Decklist completa em imagem PNG de alta resolução estilizada como no simulador DuelingBook
 */
export async function exportDecklistImagePNG(
  deckData: DecklistExportData,
  onProgress?: (progress: { loaded: number; total: number; message: string }) => void
): Promise<void> {
  // 1. Expandir cartas individuais do Main Deck
  const mainCards: ExportCardInstance[] = [];
  (deckData.mainDeck || []).forEach((item) => {
    const cardObj = getEdisonCardByName(item.cardName);
    const cat = cardObj ? getCardCategory(cardObj) : 'monster';
    const banLimit = getCardBanlistLimit(item.cardName);
    const count = item.count || 1;

    for (let c = 0; c < count; c++) {
      mainCards.push({
        cardId: item.cardId,
        cardName: item.cardName,
        category: cat === 'extra' ? 'monster' : cat,
        type: cardObj?.type || 'Monster',
        banLimit,
      });
    }
  });

  // Ordenar Main Deck: Monstros primeiro, Magias segundo, Armadilhas terceiro, depois alfabético
  const catWeight: Record<string, number> = { monster: 1, spell: 2, trap: 3, extra: 4 };
  mainCards.sort((a, b) => {
    if (catWeight[a.category] !== catWeight[b.category]) {
      return catWeight[a.category] - catWeight[b.category];
    }
    return a.cardName.localeCompare(b.cardName);
  });

  // 2. Expandir cartas do Side Deck
  const sideCards: ExportCardInstance[] = [];
  (deckData.sideDeck || []).forEach((item) => {
    const cardObj = getEdisonCardByName(item.cardName);
    const cat = cardObj ? getCardCategory(cardObj) : 'monster';
    const banLimit = getCardBanlistLimit(item.cardName);
    const count = item.count || 1;

    for (let c = 0; c < count; c++) {
      sideCards.push({
        cardId: item.cardId,
        cardName: item.cardName,
        category: cat,
        type: cardObj?.type || 'Card',
        banLimit,
      });
    }
  });

  sideCards.sort((a, b) => {
    if (catWeight[a.category] !== catWeight[b.category]) {
      return catWeight[a.category] - catWeight[b.category];
    }
    return a.cardName.localeCompare(b.cardName);
  });

  // 3. Expandir cartas do Extra Deck
  const extraCards: ExportCardInstance[] = [];
  (deckData.extraDeck || []).forEach((item) => {
    const cardObj = getEdisonCardByName(item.cardName);
    const banLimit = getCardBanlistLimit(item.cardName);
    const count = item.count || 1;

    for (let c = 0; c < count; c++) {
      extraCards.push({
        cardId: item.cardId,
        cardName: item.cardName,
        category: 'extra',
        type: cardObj?.type || 'Fusion / Synchro',
        banLimit,
      });
    }
  });

  extraCards.sort((a, b) => {
    const isASynchro = a.type.toLowerCase().includes('synchro');
    const isBSynchro = b.type.toLowerCase().includes('synchro');
    if (isASynchro && !isBSynchro) return -1;
    if (!isASynchro && isBSynchro) return 1;
    return a.cardName.localeCompare(b.cardName);
  });

  // Estatísticas de contagem
  const mainTotal = mainCards.length;
  const monstersCount = mainCards.filter((c) => c.category === 'monster').length;
  const spellsCount = mainCards.filter((c) => c.category === 'spell').length;
  const trapsCount = mainCards.filter((c) => c.category === 'trap').length;
  const extraTotal = extraCards.length;
  const sideTotal = sideCards.length;

  // 4. Pré-carregamento assíncrono das imagens com proxy seguro CORS
  const allCardIds = [
    ...mainCards.map((c) => c.cardId),
    ...extraCards.map((c) => c.cardId),
    ...sideCards.map((c) => c.cardId),
  ].filter(Boolean);

  const uniqueIds = Array.from(new Set(allCardIds));
  const totalUnique = uniqueIds.length;
  const imageMap = new Map<number, HTMLImageElement>();
  let loadedCount = 0;

  onProgress?.({
    loaded: 0,
    total: totalUnique,
    message: `Carregando ${totalUnique} imagens de cartas...`,
  });

  await Promise.all(
    uniqueIds.map((id) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
          loadedCount++;
          resolve();
        }, 8000);

        img.onload = () => {
          clearTimeout(timeout);
          imageMap.set(id, img);
          loadedCount++;
          onProgress?.({
            loaded: loadedCount,
            total: totalUnique,
            message: `Carregando cartas (${loadedCount}/${totalUnique})...`,
          });
          resolve();
        };

        img.onerror = () => {
          // Fallback tentativa direta
          const fallback = new Image();
          fallback.crossOrigin = 'anonymous';
          fallback.onload = () => {
            clearTimeout(timeout);
            imageMap.set(id, fallback);
            loadedCount++;
            resolve();
          };
          fallback.onerror = () => {
            clearTimeout(timeout);
            loadedCount++;
            resolve();
          };
          fallback.src = `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`;
        };

        img.src = `https://wsrv.nl/?url=images.ygoprodeck.com/images/cards_small/${id}.jpg`;
      });
    })
  );

  onProgress?.({
    loaded: totalUnique,
    total: totalUnique,
    message: 'Renderizando imagem da decklist em alta resolução...',
  });

  // 5. Configuração geométrica do Canvas
  const width = 1080;
  const paddingX = 23;
  const railWidth = 58;
  const railGap = 10;
  const gridX = paddingX + railWidth + railGap; // 91px
  const gridWidth = width - paddingX - gridX; // 966px

  // Grid do Main Deck: 10 colunas, 6 linhas (exatamente 60 slots padrão DuelingBook)
  const mainCols = 10;
  const mainGap = 5;
  const mainCardW = Math.floor((gridWidth - (mainCols - 1) * mainGap) / mainCols); // 92px
  const mainCardH = Math.round(mainCardW * (86 / 59)); // 134px
  const mainRows = 6;
  const mainGridH = mainRows * mainCardH + (mainRows - 1) * mainGap; // 829px

  // Grid do Side e Extra Deck: 15 colunas na mesma largura (exatamente como na referência)
  const subCols = 15;
  const subGap = 4;
  const subCardW = Math.floor((gridWidth - (subCols - 1) * subGap) / subCols); // 60px
  const subCardH = Math.round(subCardW * (86 / 59)); // 87px
  const subGridH = subCardH; // 87px

  const headerH = 84;
  const sectionGap = 12;
  const footerH = 40;

  const height =
    headerH +
    sectionGap +
    mainGridH +
    sectionGap +
    subGridH +
    sectionGap +
    subGridH +
    sectionGap +
    footerH;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fundo principal da imagem
  ctx.fillStyle = '#0d0d11';
  ctx.fillRect(0, 0, width, height);

  // ==========================================================
  // CABEÇALHO SUPERIOR (HEADER)
  // ==========================================================
  const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
  headerGrad.addColorStop(0, '#1c1917');
  headerGrad.addColorStop(1, '#18181b');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, width, headerH);

  // Linha dourada decorativa inferior do cabeçalho
  const lineGrad = ctx.createLinearGradient(0, headerH - 1, width, headerH - 1);
  lineGrad.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
  lineGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.9)');
  lineGrad.addColorStop(1, 'rgba(245, 158, 11, 0.3)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, headerH - 2, width, 2);

  // Nome do Deck e Jogador
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(deckData.deckName || 'Edison Deck', paddingX, 36);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12.5px system-ui, -apple-system, sans-serif';
  const subtitle = `Duelista: ${deckData.playerName || 'Jogador'} • Formato Edison (Março 2010) • Yu-Gi-Oh! TCG`;
  ctx.fillText(subtitle, paddingX, 60);

  // Pílulas de Contagem no topo direito
  const drawCapsule = (
    text: string,
    x: number,
    y: number,
    w: number,
    bg: string,
    fg: string,
    border: string
  ) => {
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, w, 28, 6);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = fg;
    ctx.font = 'bold 11.5px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 14);
  };

  const capY = 28;
  drawCapsule(`Side: ${sideTotal}/15`, width - paddingX - 105, capY, 105, 'rgba(6, 182, 212, 0.15)', '#38bdf8', 'rgba(6, 182, 212, 0.5)');
  drawCapsule(`Extra: ${extraTotal}/15`, width - paddingX - 220, capY, 105, 'rgba(168, 85, 247, 0.15)', '#c084fc', 'rgba(168, 85, 247, 0.5)');
  drawCapsule(`Main: ${mainTotal}/40-60`, width - paddingX - 355, capY, 125, 'rgba(52, 211, 153, 0.15)', '#34d399', 'rgba(52, 211, 153, 0.5)');

  // ==========================================================
  // SEÇÃO 1: MAIN DECK (RAIL LATERAL + GRID 10x6)
  // ==========================================================
  const mainY = headerH + sectionGap;

  // Painel de Fundo do Main Deck
  ctx.fillStyle = '#140e1e';
  roundRect(ctx, gridX - 4, mainY - 4, gridWidth + 8, mainGridH + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rail Lateral do Main Deck
  const boxH = 27;
  const boxGap = 3;
  const drawCountBox = (val: number, orderIdx: number, bg: string, border: string) => {
    const bY = mainY + orderIdx * (boxH + boxGap);
    ctx.fillStyle = bg;
    roundRect(ctx, paddingX, bY, railWidth, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${val}`, paddingX + railWidth / 2, bY + boxH / 2);
  };

  drawCountBox(mainTotal, 0, '#27272a', '#52525b'); // Total Main
  drawCountBox(monstersCount, 1, '#9a3412', '#d97706'); // Monstros
  drawCountBox(spellsCount, 2, '#166534', '#22c55e'); // Magias
  drawCountBox(trapsCount, 3, '#9d174d', '#f43f5e'); // Armadilhas
  drawCountBox(extraTotal, 4, '#581c87', '#a855f7'); // Extra
  drawCountBox(sideTotal, 5, '#0e7490', '#06b6d4'); // Side

  // Faixa Vertical Roxa 'DECK'
  const totalBoxesH = 6 * boxH + 5 * boxGap;
  const stripDeckY = mainY + totalBoxesH + 4;
  const stripDeckH = mainGridH - (totalBoxesH + 4);

  const deckStripGrad = ctx.createLinearGradient(0, stripDeckY, 0, stripDeckY + stripDeckH);
  deckStripGrad.addColorStop(0, '#6b21a8');
  deckStripGrad.addColorStop(1, '#4c1d95');
  ctx.fillStyle = deckStripGrad;
  roundRect(ctx, paddingX, stripDeckY, railWidth, stripDeckH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawVerticalRotatedText(
    ctx,
    'DECK',
    paddingX + railWidth / 2,
    stripDeckY + stripDeckH / 2,
    'bold 22px system-ui, -apple-system, sans-serif',
    '#ffffff'
  );

  // Renderização das Cartas do Main Deck (60 slots)
  for (let r = 0; r < mainRows; r++) {
    for (let c = 0; c < mainCols; c++) {
      const slotIdx = r * mainCols + c;
      const cX = gridX + c * (mainCardW + mainGap);
      const cY = mainY + r * (mainCardH + mainGap);

      if (slotIdx < mainCards.length) {
        const cardItem = mainCards[slotIdx];
        const img = imageMap.get(cardItem.cardId);

        if (img) {
          ctx.save();
          roundRect(ctx, cX, cY, mainCardW, mainCardH, 4);
          ctx.clip();
          ctx.drawImage(img, cX, cY, mainCardW, mainCardH);
          ctx.restore();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          roundRect(ctx, cX, cY, mainCardW, mainCardH, 4);
          ctx.stroke();
        } else {
          drawFallbackCard(ctx, cX, cY, mainCardW, mainCardH, cardItem.category, cardItem.cardName, false);
        }

        drawBanlistBadge(ctx, cX, cY, cardItem.banLimit, false);
      } else {
        drawEmptySlot(ctx, cX, cY, mainCardW, mainCardH, 'deck', false);
      }
    }
  }

  // ==========================================================
  // SEÇÃO 2: SIDE DECK (RAIL LATERAL + GRID 15x1)
  // ==========================================================
  const sideY = mainY + mainGridH + sectionGap;

  // Painel de Fundo do Side Deck
  ctx.fillStyle = '#082f49';
  roundRect(ctx, gridX - 4, sideY - 4, gridWidth + 8, subGridH + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rail Lateral do Side Deck
  const sideStripGrad = ctx.createLinearGradient(0, sideY, 0, sideY + subGridH);
  sideStripGrad.addColorStop(0, '#0891b2');
  sideStripGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = sideStripGrad;
  roundRect(ctx, paddingX, sideY, railWidth, subGridH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawVerticalRotatedText(
    ctx,
    'SIDE',
    paddingX + railWidth / 2,
    sideY + subGridH / 2,
    'bold 15px system-ui, -apple-system, sans-serif',
    '#ffffff'
  );

  // Renderização das Cartas do Side Deck (15 slots)
  for (let c = 0; c < subCols; c++) {
    const cX = gridX + c * (subCardW + subGap);
    const cY = sideY;

    if (c < sideCards.length) {
      const cardItem = sideCards[c];
      const img = imageMap.get(cardItem.cardId);

      if (img) {
        ctx.save();
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.clip();
        ctx.drawImage(img, cX, cY, subCardW, subCardH);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.stroke();
      } else {
        drawFallbackCard(ctx, cX, cY, subCardW, subCardH, cardItem.category, cardItem.cardName, true);
      }

      drawBanlistBadge(ctx, cX, cY, cardItem.banLimit, true);
    } else {
      drawEmptySlot(ctx, cX, cY, subCardW, subCardH, 'side', true);
    }
  }

  // ==========================================================
  // SEÇÃO 3: EXTRA DECK (RAIL LATERAL + GRID 15x1)
  // ==========================================================
  const extraY = sideY + subGridH + sectionGap;

  // Painel de Fundo do Extra Deck
  ctx.fillStyle = '#431407';
  roundRect(ctx, gridX - 4, extraY - 4, gridWidth + 8, subGridH + 8, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rail Lateral do Extra Deck
  const extraStripGrad = ctx.createLinearGradient(0, extraY, 0, extraY + subGridH);
  extraStripGrad.addColorStop(0, '#ea580c');
  extraStripGrad.addColorStop(1, '#c2410c');
  ctx.fillStyle = extraStripGrad;
  roundRect(ctx, paddingX, extraY, railWidth, subGridH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  drawVerticalRotatedText(
    ctx,
    'EXTRA',
    paddingX + railWidth / 2,
    extraY + subGridH / 2,
    'bold 14px system-ui, -apple-system, sans-serif',
    '#ffffff'
  );

  // Renderização das Cartas do Extra Deck (15 slots)
  for (let c = 0; c < subCols; c++) {
    const cX = gridX + c * (subCardW + subGap);
    const cY = extraY;

    if (c < extraCards.length) {
      const cardItem = extraCards[c];
      const img = imageMap.get(cardItem.cardId);

      if (img) {
        ctx.save();
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.clip();
        ctx.drawImage(img, cX, cY, subCardW, subCardH);
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        roundRect(ctx, cX, cY, subCardW, subCardH, 3);
        ctx.stroke();
      } else {
        drawFallbackCard(ctx, cX, cY, subCardW, subCardH, cardItem.category, cardItem.cardName, true);
      }

      drawBanlistBadge(ctx, cX, cY, cardItem.banLimit, true);
    } else {
      drawEmptySlot(ctx, cX, cY, subCardW, subCardH, 'extra', true);
    }
  }

  // ==========================================================
  // RODAPÉ (FOOTER)
  // ==========================================================
  const footerY = extraY + subGridH + sectionGap;
  ctx.fillStyle = '#121214';
  ctx.fillRect(0, footerY, width, footerH);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(width, footerY);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11.5px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Yu-Gi-Oh! Edison League Manager • Imagem Oficial de Decklist', paddingX, footerY + footerH / 2);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Gerado em ${dateStr} às ${timeStr}`, width - paddingX, footerY + footerH / 2);

  // 6. Download do PNG gerado
  const cleanDeck = (deckData.deckName || 'Deck').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const cleanPlayer = (deckData.playerName || 'Jogador').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `Decklist_${cleanDeck}_${cleanPlayer}`;

  downloadCanvasAsPNG(canvas, filename);
}
