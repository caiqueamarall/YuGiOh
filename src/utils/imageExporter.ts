import type { Player, Tournament } from '../types';
import {
  calculateTournamentStandings,
  getTiebreakExplanations,
  sortPlayersForLeague,
  getLeagueTiebreakExplanations,
} from './swissEngine';

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

  // Dimensões do Canvas
  const width = 1200;
  const padding = 40;
  const contentWidth = width - padding * 2;

  // Cálculo da altura dinâmica para garantir exatamente 1 página
  const headerHeight = 110;
  const podiumHeight = standings.length >= 2 ? 160 : 0;
  const tableHeaderHeight = 44;
  const rowHeight = 36;
  const tableHeight = tableHeaderHeight + standings.length * rowHeight;
  const tiebreakHeight = tiebreakNotes.length > 0 ? 30 + tiebreakNotes.length * 28 : 0;
  const footerHeight = 60;

  const totalHeight = padding + headerHeight + (podiumHeight > 0 ? podiumHeight + 24 : 0) + tableHeight + (tiebreakHeight > 0 ? tiebreakHeight + 16 : 0) + footerHeight + padding;

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
      goldBg.addColorStop(1, 'rgba(15, 20, 34, 0.95)');
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
      silverBg.addColorStop(1, 'rgba(15, 20, 34, 0.95)');
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
      bronzeBg.addColorStop(1, 'rgba(15, 20, 34, 0.95)');
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
    pos: padding + 20,
    name: padding + 80,
    deck: padding + 340,
    pts: padding + 560,
    ved: padding + 660,
    games: padding + 760,
    saldo: padding + 860,
    by: padding + 950,
    omw: padding + 1040,
  };

  ctx.fillText('POS', colX.pos, curY + 26);
  ctx.fillText('DUELISTA', colX.name, curY + 26);
  ctx.fillText('DECK UTILIZADO', colX.deck, curY + 26);
  ctx.fillText('PONTOS', colX.pts, curY + 26);
  ctx.fillText('V-E-D', colX.ved, curY + 26);
  ctx.fillText('GAMES', colX.games, curY + 26);
  ctx.fillText('SALDO', colX.saldo, curY + 26);
  ctx.fillText('BY', colX.by, curY + 26);
  ctx.fillText('OMW% (1º CRIT.)', colX.omw, curY + 26);

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
      ctx.fillStyle = isEven ? 'rgba(21, 27, 44, 0.7)' : 'rgba(16, 20, 32, 0.5)';
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

    // OMW%
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 12.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${s.omwPercentage}%`, colX.omw, rowY + 23);

    curY += rowHeight;
  });

  curY += 16;

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
      ctx.fillStyle = isEven ? 'rgba(21, 27, 44, 0.7)' : 'rgba(16, 20, 32, 0.5)';
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
