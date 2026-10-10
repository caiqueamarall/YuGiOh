import type { Player, Tournament } from '../types';

const PLAYERS_KEY = 'yugioh_edison_players_v4';
const TOURNAMENTS_KEY = 'yugioh_edison_tournaments_v4';
const ACTIVE_TOURNAMENT_KEY = 'yugioh_edison_active_tournament_v4';

// Remove chaves legadas que continham duelistas mock/demo
try {
  ['v1', 'v2', 'v3'].forEach((ver) => {
    localStorage.removeItem(`yugioh_edison_players_${ver}`);
    localStorage.removeItem(`yugioh_edison_tournaments_${ver}`);
    localStorage.removeItem(`yugioh_edison_active_tournament_${ver}`);
  });
} catch {
  // Ignora se localStorage não estiver acessível
}

// Começa do zero, sem nenhum jogador pré-cadastrado
export const INITIAL_EDISON_PLAYERS: Player[] = [];

export function clearAllLeagueData(): void {
  try {
    localStorage.removeItem(PLAYERS_KEY);
    localStorage.removeItem(TOURNAMENTS_KEY);
    localStorage.removeItem(ACTIVE_TOURNAMENT_KEY);
  } catch (err) {
    console.error('Erro ao limpar dados:', err);
  }
}

export function loadPlayers(): Player[] {
  try {
    const data = localStorage.getItem(PLAYERS_KEY);
    if (!data) {
      savePlayers([]);
      return [];
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Erro ao carregar jogadores:', err);
    return [];
  }
}

export function savePlayers(players: Player[]): void {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch (err) {
    console.error('Erro ao salvar jogadores:', err);
  }
}

export function loadTournaments(): Tournament[] {
  try {
    const data = localStorage.getItem(TOURNAMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Erro ao carregar torneios:', err);
    return [];
  }
}

export function saveTournaments(tournaments: Tournament[]): void {
  try {
    localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
  } catch (err) {
    console.error('Erro ao salvar torneios:', err);
  }
}

export function loadActiveTournament(): Tournament | null {
  try {
    const data = localStorage.getItem(ACTIVE_TOURNAMENT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Erro ao carregar torneio ativo:', err);
    return null;
  }
}

export function saveActiveTournament(tournament: Tournament | null): void {
  try {
    if (tournament) {
      localStorage.setItem(ACTIVE_TOURNAMENT_KEY, JSON.stringify(tournament));
    } else {
      localStorage.removeItem(ACTIVE_TOURNAMENT_KEY);
    }
  } catch (err) {
    console.error('Erro ao salvar torneio ativo:', err);
  }
}

export function exportBackupJSON(): string {
  const payload = {
    version: '3.0',
    exportDate: new Date().toISOString(),
    players: loadPlayers(),
    tournaments: loadTournaments(),
    activeTournament: loadActiveTournament(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importBackupJSON(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (Array.isArray(data.players)) {
      savePlayers(data.players);
    }
    if (Array.isArray(data.tournaments)) {
      saveTournaments(data.tournaments);
    }
    if (data.activeTournament !== undefined) {
      saveActiveTournament(data.activeTournament);
    }
    return true;
  } catch (err) {
    console.error('Falha ao importar backup:', err);
    return false;
  }
}
