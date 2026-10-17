import type { Match, Player, Tournament, TournamentRound, TournamentStanding } from '../types';

/**
 * Calcula a pontuação e os games de uma partida no formato Melhor de 3 (Bo3).
 * Regras:
 * - 2 vitórias no Bo3 = 3 pontos
 * - 1 vitória (ex: 1x1 empate por tempo ou 1x0) = 1 ponto
 * - Derrota (0x2, 1x2, 0x1) = 0 pontos
 * - WO = 3 pontos (para o vencedor)
 * - BY = 3 pontos (2x0 automático)
 */
export function getMatchScoreBreakdown(match: Match): {
  p1Points: number;
  p2Points: number;
  p1Games: number;
  p2Games: number;
  isDraw: boolean;
} {
  if (match.isBy) {
    return {
      p1Points: 3,
      p2Points: 0,
      p1Games: 0,
      p2Games: 0,
      isDraw: false,
    };
  }

  if (!match.isCompleted) {
    return {
      p1Points: 0,
      p2Points: 0,
      p1Games: 0,
      p2Games: 0,
      isDraw: false,
    };
  }

  if (match.isWO) {
    return {
      p1Points: match.winnerId === match.player1Id ? 3 : 0,
      p2Points: match.winnerId === match.player2Id ? 3 : 0,
      p1Games: match.winnerId === match.player1Id ? 2 : 0,
      p2Games: match.winnerId === match.player2Id ? 2 : 0,
      isDraw: false,
    };
  }

  if (match.isDraw) {
    // Empate por tempo (ex: 1x1)
    return {
      p1Points: 1,
      p2Points: 1,
      p1Games: match.gameWins1,
      p2Games: match.gameWins2,
      isDraw: true,
    };
  }

  // Partida normal Bo3 decidida
  const p1Wins = match.gameWins1;
  const p2Wins = match.gameWins2;

  let p1Points = 0;
  let p2Points = 0;

  if (p1Wins >= 2) {
    p1Points = 3;
  } else if (p1Wins === 1 && p2Wins < 2) {
    // 1 vitória única se a partida acabou por tempo sem o outro ter 2
    p1Points = 1;
  }

  if (p2Wins >= 2) {
    p2Points = 3;
  } else if (p2Wins === 1 && p1Wins < 2) {
    p2Points = 1;
  }

  return {
    p1Points,
    p2Points,
    p1Games: p1Wins,
    p2Games: p2Wins,
    isDraw: false,
  };
}

/**
 * Retorna o histórico de confrontos anteriores de um torneio
 * para garantir que oponentes não se repitam.
 */
export function getPreviousMatchups(rounds: TournamentRound[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBy || !match.player2Id) continue;
      
      const p1 = match.player1Id;
      const p2 = match.player2Id;

      if (!map.has(p1)) map.set(p1, new Set());
      if (!map.has(p2)) map.set(p2, new Set());

      map.get(p1)!.add(p2);
      map.get(p2)!.add(p1);
    }
  }

  return map;
}

/**
 * Retorna os IDs dos jogadores que já receberam BY neste torneio.
 */
export function getPlayersWithBy(rounds: TournamentRound[]): Set<string> {
  const bySet = new Set<string>();
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.isBy) {
        bySet.add(match.player1Id);
      }
    }
  }
  return bySet;
}

/**
 * Calcula a classificação do torneio (Standings) até o momento.
 * Aplica estritamente a regra do usuário:
 * "em caso de empate de pontos ao término do torneio, quem ficou de by terá a menor prioridade."
 */
export function calculateTournamentStandings(
  tournament: Tournament,
  allPlayers: Player[]
): TournamentStanding[] {
  const playerMap = new Map<string, Player>(allPlayers.map((p) => [p.id, p]));
  const standingsMap = new Map<
    string,
    {
      playerId: string;
      matchPoints: number;
      matchWins: number;
      matchDraws: number;
      matchLosses: number;
      gamesWon: number;
      gamesLost: number;
      hadBy: boolean;
      opponents: string[];
    }
  >();

  // Inicializa todos os participantes do torneio
  for (const pid of tournament.playerIds) {
    standingsMap.set(pid, {
      playerId: pid,
      matchPoints: 0,
      matchWins: 0,
      matchDraws: 0,
      matchLosses: 0,
      gamesWon: 0,
      gamesLost: 0,
      hadBy: false,
      opponents: [],
    });
  }

  // Processa todas as rodadas existentes
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.isCompleted) continue;

      const p1Stats = standingsMap.get(match.player1Id);
      if (!p1Stats) continue;

      if (match.isBy) {
        p1Stats.matchPoints += 3;
        p1Stats.matchWins += 1;
        p1Stats.gamesWon += 0;
        p1Stats.hadBy = true;
        continue;
      }

      if (!match.player2Id) continue;
      const p2Stats = standingsMap.get(match.player2Id);
      if (!p2Stats) continue;

      p1Stats.opponents.push(match.player2Id);
      p2Stats.opponents.push(match.player1Id);

      const breakdown = getMatchScoreBreakdown(match);
      p1Stats.matchPoints += breakdown.p1Points;
      p2Stats.matchPoints += breakdown.p2Points;
      p1Stats.gamesWon += breakdown.p1Games;
      p1Stats.gamesLost += breakdown.p2Games;
      p2Stats.gamesWon += breakdown.p2Games;
      p2Stats.gamesLost += breakdown.p1Games;

      if (breakdown.isDraw) {
        p1Stats.matchDraws += 1;
        p2Stats.matchDraws += 1;
      } else if (match.winnerId === match.player1Id) {
        p1Stats.matchWins += 1;
        p2Stats.matchLosses += 1;
      } else if (match.winnerId === match.player2Id) {
        p2Stats.matchWins += 1;
        p1Stats.matchLosses += 1;
      }
    }
  }

  // 1º Passo: Calcula PMW (Player Match Win %) e PGW (Player Game Win %) para cada jogador
  const playerPmwMap = new Map<string, number>();
  const playerPgwMap = new Map<string, number>();

  for (const [pid, item] of standingsMap.entries()) {
    const totalMatches = item.matchWins + item.matchDraws + item.matchLosses;
    // Padrão Oficial TCG: Match Win Rate com piso mínimo de 0.33 (33%)
    const rawPmw = totalMatches > 0 ? (item.matchPoints / (totalMatches * 3)) : 0.33;
    const pmw = Math.max(0.33, rawPmw);
    playerPmwMap.set(pid, pmw);

    const totalGames = item.gamesWon + item.gamesLost;
    // Padrão Oficial TCG: Game Win Rate com piso mínimo de 0.33 (33%)
    const rawPgw = totalGames > 0 ? (item.gamesWon / totalGames) : 0.33;
    const pgw = Math.max(0.33, rawPgw);
    playerPgwMap.set(pid, pgw);
  }

  // 2º Passo: Calcula OMW% (Opponent Match Win %) e OGW% (Opponent Game Win %)
  const standingsList = Array.from(standingsMap.values()).map((item) => {
    const pmw = playerPmwMap.get(item.playerId) || 0.33;
    const pgw = playerPgwMap.get(item.playerId) || 0.33;

    let totalOppPmw = 0;
    let totalOppPgw = 0;

    if (item.opponents.length > 0) {
      for (const oppId of item.opponents) {
        totalOppPmw += playerPmwMap.get(oppId) || 0.33;
        totalOppPgw += playerPgwMap.get(oppId) || 0.33;
      }
      totalOppPmw = totalOppPmw / item.opponents.length;
      totalOppPgw = totalOppPgw / item.opponents.length;
    } else {
      totalOppPmw = 0.33;
      totalOppPgw = 0.33;
    }

    const omw = totalOppPmw;
    const ogw = totalOppPgw;

    const playerObj = playerMap.get(item.playerId);
    const tournamentDeck = tournament.playerDecks?.[item.playerId];
    const isDropped = (tournament.droppedPlayerIds || []).includes(item.playerId);

    return {
      rank: 0,
      playerId: item.playerId,
      playerName: playerObj ? playerObj.name : `Jogador ${item.playerId}`,
      deckName: tournamentDeck,
      matchPoints: item.matchPoints,
      matchWins: item.matchWins,
      matchDraws: item.matchDraws,
      matchLosses: item.matchLosses,
      gamesWon: item.gamesWon,
      gamesLost: item.gamesLost,
      gameDiff: item.gamesWon - item.gamesLost,
      hadBy: item.hadBy,
      isDropped,
      pmw: Math.round(pmw * 100) / 100,
      omw: Math.round(omw * 100) / 100,
      pgw: Math.round(pgw * 100) / 100,
      ogw: Math.round(ogw * 100) / 100,
      pmwPercentage: Math.round(pmw * 1000) / 10,
      omwPercentage: Math.round(omw * 1000) / 10,
      pgwPercentage: Math.round(pgw * 1000) / 10,
      ogwPercentage: Math.round(ogw * 1000) / 10,
    };
  });

  // Função para verificar confronto direto entre dois jogadores no torneio
  const getHeadToHead = (p1Id: string, p2Id: string): number => {
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (!match.isCompleted || match.isDraw || match.isBy) continue;
        if (match.player1Id === p1Id && match.player2Id === p2Id) {
          if (match.winnerId === p1Id) return -1; // p1 venceu
          if (match.winnerId === p2Id) return 1;  // p2 venceu
        } else if (match.player1Id === p2Id && match.player2Id === p1Id) {
          if (match.winnerId === p1Id) return -1; // p1 venceu
          if (match.winnerId === p2Id) return 1;  // p2 venceu
        }
      }
    }
    return 0;
  };

  // Ordenação com Desempate Oficial de Torneio:
  // 1. Pontuação de Partidas (Points)
  // 2. Penalidade de BY (quem NÃO teve BY supera quem teve BY no empate)
  // 3. Os Mínimos (OMW% / Força da Tabela dos Oponentes)
  // 4. Saldo de Games direto (+2 no 2x0, +1 no 2x1, -1 no 1x2, -2 no 0x2)
  // 5. Confronto Direto (Head-to-Head)
  // 6. PGW% (Aproveitamento em Games Individuais)
  // 7. OGW% (Força dos Games dos Oponentes)
  // 8. Alfabético por nome como fallback
  standingsList.sort((a, b) => {
    // 1. Pontuação de Partidas (Points)
    if (b.matchPoints !== a.matchPoints) {
      return b.matchPoints - a.matchPoints;
    }

    // 2. Prioridade de BY: se empatados em pontos, quem NÃO teve BY vem primeiro!
    if (a.hadBy !== b.hadBy) {
      return a.hadBy ? 1 : -1;
    }

    // 3. OMW% (Os "Mínimos" - Força da Tabela dos Oponentes)
    if (b.omw !== a.omw) {
      return b.omw - a.omw;
    }

    // 4. Saldo de Games direto (Vitória 2-0 dá +2; 2-1 dá +1; 1-2 dá -1; 0-2 dá -2)
    if (b.gameDiff !== a.gameDiff) {
      return b.gameDiff - a.gameDiff;
    }

    // 5. Confronto Direto (Head-to-Head entre os dois empatados)
    const h2h = getHeadToHead(a.playerId, b.playerId);
    if (h2h !== 0) {
      return h2h;
    }

    // 6. PGW% (Aproveitamento em Games Individuais)
    if (b.pgw !== a.pgw) {
      return b.pgw - a.pgw;
    }

    // 7. OGW% (Força dos Games dos Oponentes)
    if (b.ogw !== a.ogw) {
      return b.ogw - a.ogw;
    }

    // 8. Alfabético por nome como fallback
    return a.playerName.localeCompare(b.playerName);
  });

  // Atribui as posições
  return standingsList.map((standing, index) => ({
    ...standing,
    rank: index + 1,
  }));
}

export interface TiebreakNote {
  points: number;
  players: string[];
  reasons: string[];
}

/**
 * Analisa a classificação e gera observações explicativas sobre duelistas empatados em pontos.
 */
export function getTiebreakExplanations(
  standings: TournamentStanding[],
  tournament?: Tournament
): TiebreakNote[] {
  // Agrupa jogadores pela mesma pontuação de partidas
  const groupsByPoints = new Map<number, TournamentStanding[]>();
  for (const s of standings) {
    const list = groupsByPoints.get(s.matchPoints) || [];
    list.push(s);
    groupsByPoints.set(s.matchPoints, list);
  }

  const results: TiebreakNote[] = [];

  for (const [points, group] of groupsByPoints.entries()) {
    if (group.length <= 1) continue; // Sem empate nesta faixa de pontuação

    const reasons: string[] = [];

    // Compara cada par consecutivo dentro do grupo de empatados
    for (let i = 0; i < group.length - 1; i++) {
      const a = group[i];
      const b = group[i + 1];

      if (!a.hadBy && b.hadBy) {
        reasons.push(
          `${a.playerName} (${a.rank}º) superou ${b.playerName} (${b.rank}º) por prioridade de duelos jogados na mesa (não teve BY).`
        );
      } else if (a.hadBy && !b.hadBy) {
        reasons.push(
          `${b.playerName} (${b.rank}º) teve prioridade sobre ${a.playerName} (${a.rank}º) por não ter tido BY.`
        );
      } else if (a.omw !== b.omw) {
        reasons.push(
          `${a.playerName} (${a.rank}º) superou ${b.playerName} (${b.rank}º) pelo critério Mínimos / OMW% (${a.omwPercentage}% vs ${b.omwPercentage}%) — enfrentou adversários com melhor aproveitamento.`
        );
      } else if (a.gameDiff !== b.gameDiff) {
        const diffA = a.gameDiff > 0 ? `+${a.gameDiff}` : `${a.gameDiff}`;
        const diffB = b.gameDiff > 0 ? `+${b.gameDiff}` : `${b.gameDiff}`;
        reasons.push(
          `${a.playerName} (${a.rank}º) empatou nos Mínimos com ${b.playerName} (${b.rank}º), superando pelo Saldo de Games (${diffA} vs ${diffB}).`
        );
      } else {
        // Verifica confronto direto caso torneio tenha sido informado
        let h2hReason: string | null = null;
        if (tournament) {
          for (const round of tournament.rounds) {
            for (const match of round.matches) {
              if (!match.isCompleted || match.isDraw || match.isBy) continue;
              if (
                (match.player1Id === a.playerId && match.player2Id === b.playerId) ||
                (match.player1Id === b.playerId && match.player2Id === a.playerId)
              ) {
                if (match.winnerId === a.playerId) {
                  h2hReason = `${a.playerName} (${a.rank}º) superou ${b.playerName} (${b.rank}º) no Confronto Direto (vitória na Rodada ${match.roundNumber}).`;
                }
              }
            }
          }
        }

        if (h2hReason) {
          reasons.push(h2hReason);
        } else if (a.pgw !== b.pgw) {
          reasons.push(
            `${a.playerName} (${a.rank}º) superou ${b.playerName} (${b.rank}º) pelo PGW% (${a.pgwPercentage}% vs ${b.pgwPercentage}%) — melhor aproveitamento em duelos individuais.`
          );
        } else if (a.ogw !== b.ogw) {
          reasons.push(
            `${a.playerName} (${a.rank}º) superou ${b.playerName} (${b.rank}º) pelo OGW% (${a.ogwPercentage}% vs ${b.ogwPercentage}%) — adversários venceram mais games.`
          );
        } else {
          reasons.push(
            `${a.playerName} (${a.rank}º) e ${b.playerName} (${b.rank}º) empataram rigorosamente em todos os critérios estatísticos; ordem alfabética.`
          );
        }
      }
    }

    results.push({
      points,
      players: group.map((s) => s.playerName),
      reasons,
    });
  }

  // Ordena os grupos dos maiores pontos para os menores
  return results.sort((a, b) => b.points - a.points);
}

/**
 * Ordena os duelistas para o Ranking Geral Oficial da Liga Edison.
 *
 * CRITÉRIOS DE CLASSIFICAÇÃO E DESEMPATE OFICIAIS DA LIGA:
 * 1. Pontuação Geral da Liga (Points): mais pontos = melhor posição.
 * 2. Títulos de Campeão de Torneio (tournamentTitles): quem venceu torneios fica na frente.
 * 3. Critério Olímpico de Colocações nos Torneios Oficiais da Liga (decksHistory):
 *    - Mais 1º lugares nos torneios
 *    - Mais 2º lugares nos torneios
 *    - Mais 3º lugares nos torneios
 *    - Melhor pico de colocação histórica (menor rank)
 * 4. Total de Vitórias em Partidas (Wins): maior número de vitórias.
 * 5. Menor Número de Derrotas (Losses): menos derrotas acumuladas.
 * 6. Penalidade de BY (byCount): quem pontuou jogando partidas na mesa tem prioridade sobre BY automático.
 * 7. Troféus Acumulados (Trophies).
 * 8. Aproveitamento Geral (Win Rate): % de vitórias sobre partidas disputadas.
 * 9. Menor Número de Participações (eficiência de pontos por torneio).
 * 10. Desempate Alfabético por Nome (apenas se rigorosamente empatados em todos os anteriores).
 */
export function sortPlayersForLeague(players: Player[]): Player[] {
  return [...players]
    .filter((p) => p.active)
    .sort((a, b) => {
      // 1. Pontuação Geral da Liga
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      // 2. Títulos de Campeão de Torneio Oficial
      const titlesA = a.tournamentTitles || 0;
      const titlesB = b.tournamentTitles || 0;
      if (titlesB !== titlesA) {
        return titlesB - titlesA;
      }

      // 3. Critério Olímpico de Colocações nos Torneios Oficiais da Liga
      const getHistoryRanks = (p: Player) => {
        return (p.decksHistory || [])
          .filter((h) => h.countsForLeague !== false && h.rank > 0)
          .map((h) => h.rank)
          .sort((r1, r2) => r1 - r2); // Ordenado do melhor rank (1º) para o pior
      };

      const ranksA = getHistoryRanks(a);
      const ranksB = getHistoryRanks(b);

      const maxRankCount = Math.max(ranksA.length, ranksB.length);
      for (let i = 0; i < maxRankCount; i++) {
        const rA = ranksA[i];
        const rB = ranksB[i];
        if (rA !== undefined && rB !== undefined && rA !== rB) {
          return rA - rB; // Menor rank é melhor (1º supera 2º)
        }
        if (rA !== undefined && rB === undefined) {
          return -1; // Jogador A tem mais presenças em posições altas
        }
        if (rA === undefined && rB !== undefined) {
          return 1; // Jogador B tem mais presenças em posições altas
        }
      }

      // 4. Total de Vitórias em Partidas (Matches)
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      // 5. Menos Derrotas
      if (a.losses !== b.losses) {
        return a.losses - b.losses;
      }

      // 6. Penalidade de BY (menos BYs = prioridade)
      const byA = a.byCount || 0;
      const byB = b.byCount || 0;
      if (byA !== byB) {
        return byA - byB;
      }

      // 7. Troféus Acumulados
      const trophiesA = a.trophies || 0;
      const trophiesB = b.trophies || 0;
      if (trophiesB !== trophiesA) {
        return trophiesB - trophiesA;
      }

      // 8. Win Rate Geral (Aproveitamento)
      const totalMatchesA = a.wins + a.draws + a.losses;
      const totalMatchesB = b.wins + b.draws + b.losses;
      const wrA = totalMatchesA > 0 ? a.wins / totalMatchesA : 0;
      const wrB = totalMatchesB > 0 ? b.wins / totalMatchesB : 0;
      if (Math.abs(wrB - wrA) > 0.0001) {
        return wrB - wrA;
      }

      // 9. Participações
      if (b.participations !== a.participations) {
        return b.participations - a.participations;
      }

      // 10. Fallback alfabético
      return a.name.localeCompare(b.name);
    });
}

/**
 * Analisa a classificação da Liga e gera observações oficiais de desempate para jogadores empatados em pontos.
 */
export function getLeagueTiebreakExplanations(sortedPlayers: Player[]): TiebreakNote[] {
  const groupsByPoints = new Map<number, Player[]>();
  for (const p of sortedPlayers) {
    const list = groupsByPoints.get(p.points) || [];
    list.push(p);
    groupsByPoints.set(p.points, list);
  }

  const results: TiebreakNote[] = [];

  for (const [points, group] of groupsByPoints.entries()) {
    if (group.length <= 1) continue;

    const reasons: string[] = [];

    const getPlayerPeakRank = (p: Player) => {
      const ranks = (p.decksHistory || [])
        .filter((h) => h.countsForLeague !== false && h.rank > 0)
        .map((h) => h.rank)
        .sort((r1, r2) => r1 - r2);
      return ranks.length > 0 ? ranks[0] : null;
    };

    for (let i = 0; i < group.length - 1; i++) {
      const a = group[i];
      const b = group[i + 1];
      const rankA = sortedPlayers.findIndex((p) => p.id === a.id) + 1;
      const rankB = sortedPlayers.findIndex((p) => p.id === b.id) + 1;

      const titlesA = a.tournamentTitles || 0;
      const titlesB = b.tournamentTitles || 0;
      const peakA = getPlayerPeakRank(a);
      const peakB = getPlayerPeakRank(b);

      if (titlesA !== titlesB) {
        reasons.push(
          `${a.name} (${rankA}º) superou ${b.name} (${rankB}º) por possuir Título de Campeão de Torneio Oficial (${titlesA} vs ${titlesB} títulos).`
        );
      } else if (peakA !== null && peakB !== null && peakA !== peakB) {
        reasons.push(
          `${a.name} (${rankA}º) superou ${b.name} (${rankB}º) pelo critério de melhor colocação em torneios oficiais (${peakA}º lugar vs ${peakB}º lugar).`
        );
      } else if (a.wins !== b.wins) {
        reasons.push(
          `${a.name} (${rankA}º) superou ${b.name} (${rankB}º) por maior número de vitórias em partidas (${a.wins} vs ${b.wins} vitórias).`
        );
      } else if (a.losses !== b.losses) {
        reasons.push(
          `${a.name} (${rankA}º) superou ${b.name} (${rankB}º) por menor número de derrotas (${a.losses} vs ${b.losses} derrotas).`
        );
      } else if ((a.byCount || 0) !== (b.byCount || 0)) {
        reasons.push(
          `${a.name} (${rankA}º) superou ${b.name} (${rankB}º) por ter pontuado sem BY na mesa (${a.byCount || 0} vs ${b.byCount || 0} BYs).`
        );
      } else {
        const totalMatchesA = a.wins + a.draws + a.losses;
        const totalMatchesB = b.wins + b.draws + b.losses;
        const wrA = totalMatchesA > 0 ? ((a.wins / totalMatchesA) * 100).toFixed(1) : '0.0';
        const wrB = totalMatchesB > 0 ? ((b.wins / totalMatchesB) * 100).toFixed(1) : '0.0';
        if (wrA !== wrB) {
          reasons.push(
            `${a.name} (${rankA}º) superou ${b.name} (${rankB}º) por maior aproveitamento de vitórias (${wrA}% vs ${wrB}%).`
          );
        } else {
          reasons.push(
            `${a.name} (${rankA}º) e ${b.name} (${rankB}º) empataram rigorosamente em todos os critérios estatísticos; ordem alfabética.`
          );
        }
      }
    }

    results.push({
      points,
      players: group.map((p) => p.name),
      reasons,
    });
  }

  return results.sort((a, b) => b.points - a.points);
}

/**
 * Embaralha um array aleatoriamente (Fisher-Yates)
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Gera os pareamentos de uma rodada (Sistema Suíço Edison Format).
 *
 * Regras:
 * - Rodada 1: Sorteio 100% aleatório. Se ímpar, 1 recebe BY aleatório.
 * - Rodada 2+:
 *    - Ganhador enfrenta ganhador, perdedor enfrenta perdedor.
 *    - Se sobrou 1 ganhador e 1 perdedor (ou bracket ímpar),
 *      parear com o mais pontuado dos perdedores (ex: quem perdeu 2 mas ganhou 1 na melhor de 3,
 *      ou seja, maior saldo de games ganhos). Se todos empatados, sorteio aleatório.
 *    - Se o total de jogadores for ímpar: atribui BY ao jogador de menor pontuação que ainda NÃO teve BY.
 *    - Não repetir oponentes enfrentados nas rodadas anteriores.
 */
export function generateSwissPairings(
  roundNumber: number,
  tournament: Tournament,
  allPlayers: Player[]
): TournamentRound {
  const droppedSet = new Set(tournament.droppedPlayerIds || []);
  const playerIds = tournament.playerIds.filter((id) => !droppedSet.has(id));
  const previousMatchups = getPreviousMatchups(tournament.rounds);
  const playersWithBy = getPlayersWithBy(tournament.rounds);
  const standings = calculateTournamentStandings(tournament, allPlayers);
  const standingsMap = new Map(standings.map((s) => [s.playerId, s]));

  let activePlayerIds = [...playerIds];
  let byPlayerId: string | null = null;

  // Se o número de jogadores for ímpar, precisamos selecionar quem fica de BY
  if (activePlayerIds.length % 2 !== 0) {
    if (roundNumber === 1) {
      // Rodada 1: sorteio aleatório do BY
      const shuffled = shuffle(activePlayerIds);
      byPlayerId = shuffled[0];
      activePlayerIds = shuffled.slice(1);
    } else {
      // Rodadas seguintes: BY vai para o jogador de menor pontuação que ainda NÃO teve BY
      const candidatesWithoutBy = standings
        .filter((s) => !playersWithBy.has(s.playerId) && activePlayerIds.includes(s.playerId))
        .sort((a, b) => {
          // Menor pontuação primeiro
          if (a.matchPoints !== b.matchPoints) return a.matchPoints - b.matchPoints;
          // Pior saldo de games primeiro
          if (a.gameDiff !== b.gameDiff) return a.gameDiff - b.gameDiff;
          return 0;
        });

      if (candidatesWithoutBy.length > 0) {
        // Se houver empate entre os piores, sorteia aleatoriamente entre os piores empatados
        const lowestPoints = candidatesWithoutBy[0].matchPoints;
        const lowestTied = candidatesWithoutBy.filter((c) => c.matchPoints === lowestPoints);
        const chosen = shuffle(lowestTied)[0];
        byPlayerId = chosen.playerId;
      } else {
        // Fallback raro se todos já tiveram BY: escolhe o com menor pontuação
        const lastStanding = standings[standings.length - 1];
        byPlayerId = lastStanding.playerId;
      }

      activePlayerIds = activePlayerIds.filter((id) => id !== byPlayerId);
    }
  }

  const matches: Match[] = [];
  let tableCounter = 1;

  if (roundNumber === 1) {
    // Sorteio puramente aleatório para a Rodada 1
    const shuffled = shuffle(activePlayerIds);
    for (let i = 0; i < shuffled.length; i += 2) {
      matches.push({
        id: `r${roundNumber}-t${tableCounter}-${Date.now()}-${i}`,
        roundNumber,
        tableNumber: tableCounter++,
        player1Id: shuffled[i],
        player2Id: shuffled[i + 1],
        isBy: false,
        gameWins1: 0,
        gameWins2: 0,
        isCompleted: false,
        isDraw: false,
        isWO: false,
        winnerId: null,
      });
    }
  } else {
    // Rodada 2 em diante: Sistema Suíço por Brackets de Pontuação
    // Ordena os jogadores por pontos (decrescente), desempatando por games ganhos
    const sortedPlayers = [...activePlayerIds].sort((a, b) => {
      const sA = standingsMap.get(a)!;
      const sB = standingsMap.get(b)!;
      if (sB.matchPoints !== sA.matchPoints) return sB.matchPoints - sA.matchPoints;
      if (sB.gameDiff !== sA.gameDiff) return sB.gameDiff - sA.gameDiff;
      if (sB.gamesWon !== sA.gamesWon) return sB.gamesWon - sA.gamesWon;
      return 0;
    });

    // Algoritmo de emparelhamento com backtracking para garantir que oponentes não se repitam
    // e respeitar o emparelhamento por pontuação e critério de pair-down
    const paired = solveSwissPairings(sortedPlayers, previousMatchups, standingsMap);

    if (paired) {
      for (const pair of paired) {
        matches.push({
          id: `r${roundNumber}-t${tableCounter}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          roundNumber,
          tableNumber: tableCounter++,
          player1Id: pair[0],
          player2Id: pair[1],
          isBy: false,
          gameWins1: 0,
          gameWins2: 0,
          isCompleted: false,
          isDraw: false,
          isWO: false,
          winnerId: null,
        });
      }
    } else {
      // Fallback de segurança se nenhuma combinação sem repetição for viável:
      // pareia sequencialmente da melhor forma possível
      for (let i = 0; i < sortedPlayers.length; i += 2) {
        matches.push({
          id: `r${roundNumber}-t${tableCounter}-${Date.now()}-${i}`,
          roundNumber,
          tableNumber: tableCounter++,
          player1Id: sortedPlayers[i],
          player2Id: sortedPlayers[i + 1] || null,
          isBy: !sortedPlayers[i + 1],
          gameWins1: 0,
          gameWins2: 0,
          isCompleted: false,
          isDraw: false,
          isWO: false,
          winnerId: null,
        });
      }
    }
  }

  // Adiciona a mesa de BY, se houver
  if (byPlayerId) {
    matches.push({
      id: `r${roundNumber}-by-${byPlayerId}-${Date.now()}`,
      roundNumber,
      tableNumber: tableCounter,
      player1Id: byPlayerId,
      player2Id: null,
      isBy: true,
      gameWins1: 0,
      gameWins2: 0,
      isCompleted: true, // BY já começa resolvido com 3 pontos e saldo 0
      isDraw: false,
      isWO: false,
      winnerId: byPlayerId,
    });
  }

  return {
    roundNumber,
    matches,
    isCompleted: false,
  };
}

/**
 * Solucionador de pareamento suíço com respeito a brackets e ausência de revanches.
 * Aplica a regra solicitada:
 * Se um jogador do grupo de cima precisar descer (pair-down),
 * ele enfrenta o jogador mais pontuado do grupo de baixo (com mais games ganhos/saldo de games).
 */
function solveSwissPairings(
  playerIds: string[],
  previousMatchups: Map<string, Set<string>>,
  standingsMap: Map<string, TournamentStanding>
): [string, string][] | null {
  const result: [string, string][] = [];
  const used = new Set<string>();

  function backtrack(index: number): boolean {
    if (result.length * 2 === playerIds.length) {
      return true;
    }

    // Encontra o primeiro jogador ainda não pareado
    while (index < playerIds.length && used.has(playerIds[index])) {
      index++;
    }
    if (index >= playerIds.length) return true;

    const p1 = playerIds[index];
    const p1Standing = standingsMap.get(p1)!;

    // Constrói lista de candidatos ordenados por compatibilidade de suíço
    const candidates: string[] = [];
    for (let j = index + 1; j < playerIds.length; j++) {
      const p2 = playerIds[j];
      if (used.has(p2)) continue;

      // Não permite revanche se já se enfrentaram no torneio
      const p1History = previousMatchups.get(p1);
      if (p1History && p1History.has(p2)) {
        continue;
      }
      candidates.push(p2);
    }

    // Ordena os candidatos de acordo com a regra:
    // 1. Mais próximo em pontos de partida
    // 2. Se for pair-down (pontos diferentes), priorizar o mais pontuado nos games (games ganhos / saldo)
    // 3. Embaralha levemente candidatos idênticos para não ser determinístico se empatados
    candidates.sort((c1, c2) => {
      const s1 = standingsMap.get(c1)!;
      const s2 = standingsMap.get(c2)!;

      const diff1 = Math.abs(s1.matchPoints - p1Standing.matchPoints);
      const diff2 = Math.abs(s2.matchPoints - p1Standing.matchPoints);

      if (diff1 !== diff2) return diff1 - diff2;

      // Se ambos são de um grupo diferente, o com melhor saldo de games vem primeiro
      if (s2.gameDiff !== s1.gameDiff) return s2.gameDiff - s1.gameDiff;
      if (s2.gamesWon !== s1.gamesWon) return s2.gamesWon - s1.gamesWon;

      // Aleatoriedade leve para desempate
      return Math.random() - 0.5;
    });

    // Tenta cada candidato
    for (const p2 of candidates) {
      used.add(p1);
      used.add(p2);
      result.push([p1, p2]);

      if (backtrack(index + 1)) {
        return true;
      }

      // Desfaz
      result.pop();
      used.delete(p1);
      used.delete(p2);
    }

    return false;
  }

  // Tenta resolver sem nenhuma revanche
  if (backtrack(0)) {
    return result;
  }

  // Se for impossível sem repetição (muito raro em torneios de poucas rodadas),
  // tenta permitindo revanche como último recurso para nunca travar o app
  const fallbackResult: [string, string][] = [];
  const fallbackUsed = new Set<string>();

  for (let i = 0; i < playerIds.length; i++) {
    const p1 = playerIds[i];
    if (fallbackUsed.has(p1)) continue;

    for (let j = i + 1; j < playerIds.length; j++) {
      const p2 = playerIds[j];
      if (fallbackUsed.has(p2)) continue;

      fallbackUsed.add(p1);
      fallbackUsed.add(p2);
      fallbackResult.push([p1, p2]);
      break;
    }
  }

  return fallbackResult;
}

/**
 * Recalcula com 100% de integridade todas as estatísticas acumuladas da Liga Edison
 * para todos os jogadores a partir do histórico de torneios concluídos.
 */
export function recalculateAllPlayerStats(
  tournaments: Tournament[],
  currentPlayers: Player[]
): Player[] {
  // 1. Reseta os acumuladores de todos os jogadores
  const playerStatsMap = new Map<string, Player>();
  for (const p of currentPlayers) {
    playerStatsMap.set(p.id, {
      ...p,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      participations: 0,
      trophies: 0,
      tournamentTitles: 0,
      byCount: 0,
      decksHistory: [],
      savedDecklists: p.savedDecklists || [],
    });
  }

  // 2. Ordena os torneios finalizados em ordem cronológica de realização
  const completedTournaments = tournaments
    .filter((t) => t.status === 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 3. Itera em cada torneio e acumula as estatísticas
  for (const tourn of completedTournaments) {
    const isLeague = tourn.countsForLeague !== false;
    const standings = calculateTournamentStandings(tourn, currentPlayers);
    const championId = tourn.championId || standings[0]?.playerId;
    const playerDecks = tourn.playerDecks || {};
    const droppedSet = new Set(tourn.droppedPlayerIds || []);

    for (const standing of standings) {
      const p = playerStatsMap.get(standing.playerId);
      if (!p) continue;

      const deckName = playerDecks[standing.playerId] || 'Edison Deck';
      const decklist = tourn.playerDecklists?.[standing.playerId];
      const isChampion = standing.playerId === championId;
      const isDropped = droppedSet.has(standing.playerId);

      const historyEntry = {
        tournamentId: tourn.id,
        tournamentName: tourn.name,
        date: tourn.date,
        deckName,
        decklist,
        rank: standing.rank,
        matchPoints: standing.matchPoints,
        matchWins: standing.matchWins,
        matchDraws: standing.matchDraws,
        matchLosses: standing.matchLosses,
        hadBy: standing.hadBy,
        countsForLeague: isLeague,
        isDropped,
      };

      // Adiciona ao histórico do jogador (mais recentes primeiro)
      p.decksHistory = [historyEntry, ...(p.decksHistory || [])];

      // Se for torneio oficial da liga, acumula pontuações
      if (isLeague) {
        p.points += standing.matchPoints;
        p.wins += standing.matchWins;
        p.draws += standing.matchDraws;
        p.losses += standing.matchLosses;
        p.participations += 1;
        p.trophies += standing.matchWins;
        p.tournamentTitles = (p.tournamentTitles || 0) + (isChampion ? 1 : 0);
        p.byCount = (p.byCount || 0) + (standing.hadBy ? 1 : 0);
      }
    }
  }

  return Array.from(playerStatsMap.values());
}

/**
 * Retorna o quantitativo de duelistas para o TOP de um torneio.
 * Prioriza a escolha salva pelo gestor (tournament.topCut).
 * Se não definido, calcula com base na regra de jogadores:
 * - até 13 jogadores: Top 2
 * - 14 a 18 jogadores: Top 4
 * - 19 ou mais jogadores: Top 5
 */
export function getTournamentTopCut(tournament: { topCut?: number; playerIds?: string[] } | null | undefined): number {
  if (!tournament) return 3;
  if (tournament.topCut && [2, 3, 4, 5].includes(tournament.topCut)) {
    return tournament.topCut;
  }
  const count = tournament.playerIds ? tournament.playerIds.length : 8;
  return getDefaultTopCutForPlayerCount(count);
}

/**
 * Sugere o quantitativo padrão de TOP baseado na quantidade de participantes:
 * - até 13 jogadores: Top 2
 * - 14 a 18 jogadores: Top 4
 * - 19 ou mais jogadores: Top 5
 */
export function getDefaultTopCutForPlayerCount(playerCount: number): number {
  if (playerCount <= 13) return 2;
  if (playerCount <= 18) return 4;
  return 5;
}
