import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { RankingView } from './components/RankingView';
import { TournamentView } from './components/TournamentView';
import { PlayersView } from './components/PlayersView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { PlayerStatsModal } from './components/PlayerStatsModal';
import { MobileSimulator } from './components/MobileSimulator';
import type { ActiveTab, Player, Tournament, PlayerTournamentHistory } from './types';
import {
  loadPlayers,
  savePlayers,
  loadTournaments,
  saveTournaments,
  loadActiveTournament,
  saveActiveTournament,
} from './utils/storage';
import {
  calculateTournamentStandings,
  sortPlayersForLeague,
  recalculateAllPlayerStats,
} from './utils/swissEngine';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ranking');
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);

  // Modal de estatísticas detalhadas com Diagrama de Radar
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<Player | null>(null);

  // Carrega os dados na montagem
  useEffect(() => {
    const loadedPlayers = loadPlayers();
    const loadedTournaments = loadTournaments();
    const loadedActiveTournament = loadActiveTournament();

    setPlayers(loadedPlayers);
    setTournaments(loadedTournaments);
    setActiveTournament(loadedActiveTournament);
  }, []);

  // Handlers de Jogadores
  const handleAddPlayer = (
    newPlayerData: Omit<
      Player,
      'id' | 'createdAt' | 'points' | 'wins' | 'draws' | 'losses' | 'participations' | 'trophies'
    >
  ) => {
    const newPlayer: Player = {
      ...newPlayerData,
      id: `p-${Date.now()}`,
      createdAt: new Date().toISOString(),
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      participations: 0,
      trophies: 0,
      tournamentTitles: 0,
      byCount: 0,
      decksHistory: [],
    };

    const updated = [newPlayer, ...players];
    setPlayers(updated);
    savePlayers(updated);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    const updated = players.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p));
    setPlayers(updated);
    savePlayers(updated);
    if (selectedPlayerForStats?.id === updatedPlayer.id) {
      setSelectedPlayerForStats(updatedPlayer);
    }
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter((p) => p.id !== id);
    setPlayers(updated);
    savePlayers(updated);
  };

  const handleImportPlayers = (importedPlayers: Player[]) => {
    setPlayers(importedPlayers);
    savePlayers(importedPlayers);
  };

  // Handlers de Torneio
  const handleStartTournament = (newTournament: Tournament) => {
    setActiveTournament(newTournament);
    saveActiveTournament(newTournament);
    setActiveTab('tournament');
  };

  const handleUpdateActiveTournament = (updated: Tournament) => {
    setActiveTournament(updated);
    saveActiveTournament(updated);
  };

  const handleCancelTournament = () => {
    setActiveTournament(null);
    saveActiveTournament(null);
    setActiveTab('tournament');
  };

  // Finalização do Torneio e Atualização Consolidada da Liga
  const handleFinishTournament = (finishedTournament: Tournament) => {
    // 1. Calcula classificação final do torneio com a regra de BY e tiebreakers
    const standings = calculateTournamentStandings(finishedTournament, players);
    const championId = standings[0]?.playerId;
    const runnerUpId = standings[1]?.playerId;

    const completedTournament: Tournament = {
      ...finishedTournament,
      status: 'completed',
      championId,
      runnerUpId,
      completedAt: new Date().toISOString(),
    };

    // 2. Atualiza as estatísticas acumuladas e o histórico de deck de cada jogador
    const standingsMap = new Map(standings.map((s) => [s.playerId, s]));
    const playerDecks = finishedTournament.playerDecks || {};
    const isLeagueTournament = completedTournament.countsForLeague !== false;

    const updatedPlayers = players.map((player) => {
      const standing = standingsMap.get(player.id);
      if (!standing) return player; // Não participou deste torneio

      const isChampion = standing.playerId === championId;
      const tournamentDeckUsed = playerDecks[player.id] || 'Quickdraw Dandy';
      const isDropped = (completedTournament.droppedPlayerIds || []).includes(player.id);

      const newHistoryEntry: PlayerTournamentHistory = {
        tournamentId: completedTournament.id,
        tournamentName: completedTournament.name,
        date: completedTournament.date,
        deckName: tournamentDeckUsed,
        decklist: completedTournament.playerDecklists?.[player.id],
        rank: standing.rank,
        matchPoints: standing.matchPoints,
        matchWins: standing.matchWins,
        matchDraws: standing.matchDraws,
        matchLosses: standing.matchLosses,
        hadBy: standing.hadBy,
        countsForLeague: isLeagueTournament,
        isDropped,
      };

      // Torneio Freeplay: Salva histórico de participação e deck jogado para consultas futuras,
      // mas NÃO altera as estatísticas e pontuações do Ranking Geral da Liga.
      if (!isLeagueTournament) {
        return {
          ...player,
          decksHistory: [newHistoryEntry, ...(player.decksHistory || [])],
        };
      }

      // Torneio Oficial da Liga: Atualiza todas as métricas do ranking oficial
      return {
        ...player,
        points: player.points + standing.matchPoints,
        wins: player.wins + standing.matchWins,
        draws: player.draws + standing.matchDraws,
        losses: player.losses + standing.matchLosses,
        participations: player.participations + 1,
        trophies: player.trophies + standing.matchWins, // Por hora igual ao número de vitórias
        tournamentTitles: (player.tournamentTitles || 0) + (isChampion ? 1 : 0),
        byCount: (player.byCount || 0) + (standing.hadBy ? 1 : 0),
        decksHistory: [newHistoryEntry, ...(player.decksHistory || [])],
      };
    });

    // 3. Salva no histórico de torneios (tanto Liga quanto Freeplay ficam salvos para consultas futuras)
    const updatedTournaments = [completedTournament, ...tournaments];

    // 4. Salva tudo no LocalStorage
    setPlayers(updatedPlayers);
    savePlayers(updatedPlayers);

    setTournaments(updatedTournaments);
    saveTournaments(updatedTournaments);

    setActiveTournament(null);
    saveActiveTournament(null);

    // 5. Redireciona: Se for Liga vai pro ranking; se for Freeplay vai pro histórico
    if (isLeagueTournament) {
      setActiveTab('ranking');
    } else {
      setActiveTab('history');
    }
  };

  // Remove torneio do histórico e recalcula toda a pontuação da Liga
  const handleDeleteTournament = (tournamentId: string) => {
    const updatedTournaments = tournaments.filter((t) => t.id !== tournamentId);
    const updatedPlayers = recalculateAllPlayerStats(updatedTournaments, players);

    setPlayers(updatedPlayers);
    savePlayers(updatedPlayers);

    setTournaments(updatedTournaments);
    saveTournaments(updatedTournaments);
  };

  // Atualiza um torneio editado no histórico e recalcula toda a pontuação da Liga
  const handleUpdateTournament = (updatedTournament: Tournament) => {
    const updatedTournaments = tournaments.map((t) =>
      t.id === updatedTournament.id ? updatedTournament : t
    );
    const updatedPlayers = recalculateAllPlayerStats(updatedTournaments, players);

    setPlayers(updatedPlayers);
    savePlayers(updatedPlayers);

    setTournaments(updatedTournaments);
    saveTournaments(updatedTournaments);
  };

  // Recarrega todos os dados
  const handleReloadAllData = () => {
    setPlayers(loadPlayers());
    setTournaments(loadTournaments());
    setActiveTournament(loadActiveTournament());
  };

  // Calcula posição do jogador selecionado para o modal de stats
  const getPlayerLeagueRank = (playerId: string) => {
    const sorted = sortPlayersForLeague(players);
    const idx = sorted.findIndex((p) => p.id === playerId);
    return idx >= 0 ? idx + 1 : undefined;
  };

  return (
    <MobileSimulator>
      <div className="app-layout">
        {/* Top Header */}
        <Header
          activeTournament={activeTournament}
          onNavigateToTournament={() => setActiveTab('tournament')}
        />

        {/* Navegação Principal */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeTournament={activeTournament}
        />

        {/* Conteúdo Principal */}
        <main className="main-content">
          {activeTab === 'ranking' && (
            <RankingView
              players={players}
              onSelectPlayer={(p) => setSelectedPlayerForStats(p)}
              onNavigateToTournament={() => setActiveTab('tournament')}
              onNavigateToPlayers={() => setActiveTab('players')}
            />
          )}

          {activeTab === 'tournament' && (
            <TournamentView
              players={players}
              activeTournament={activeTournament}
              onStartTournament={handleStartTournament}
              onUpdateActiveTournament={handleUpdateActiveTournament}
              onFinishTournament={handleFinishTournament}
              onCancelTournament={handleCancelTournament}
            />
          )}

          {activeTab === 'players' && (
            <PlayersView
              players={players}
              onAddPlayer={handleAddPlayer}
              onUpdatePlayer={handleUpdatePlayer}
              onDeletePlayer={handleDeletePlayer}
              onSelectPlayer={(p) => setSelectedPlayerForStats(p)}
              onImportPlayers={handleImportPlayers}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              tournaments={tournaments}
              players={players}
              onDeleteTournament={handleDeleteTournament}
              onUpdateTournament={handleUpdateTournament}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              players={players}
              onReloadAllData={handleReloadAllData}
              onImportPlayers={handleImportPlayers}
            />
          )}
        </main>

        {/* Modal de Estatísticas e Diagrama de Radar do Jogador */}
        {selectedPlayerForStats && (
          <PlayerStatsModal
            player={selectedPlayerForStats}
            onClose={() => setSelectedPlayerForStats(null)}
            leagueRank={getPlayerLeagueRank(selectedPlayerForStats.id)}
            onUpdatePlayer={handleUpdatePlayer}
          />
        )}
      </div>
    </MobileSimulator>
  );
}

export default App;
