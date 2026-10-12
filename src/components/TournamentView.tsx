import React, { useState, useEffect } from 'react';
import {
  Swords,
  Trophy,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Flame,
  Eye,
  Info,
  Shield,
  Edit2,
  Calendar,
  FileDown,
  ImageDown,
  Medal,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Player, Tournament, TournamentRound } from '../types';
import {
  generateSwissPairings,
  calculateTournamentStandings,
  getTiebreakExplanations,
} from '../utils/swissEngine';
import { CustomDatePicker } from './CustomDatePicker';
import { exportTournamentResultsPDF } from '../utils/pdfGenerator';
import { exportTournamentResultsPNG } from '../utils/imageExporter';

interface TournamentViewProps {
  players: Player[];
  activeTournament: Tournament | null;
  onStartTournament: (tournament: Tournament) => void;
  onUpdateActiveTournament: (tournament: Tournament) => void;
  onFinishTournament: (tournament: Tournament) => void;
  onCancelTournament: () => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
  players,
  activeTournament,
  onStartTournament,
  onUpdateActiveTournament,
  onFinishTournament,
  onCancelTournament,
}) => {
  // Data padrão no formato YYYY-MM-DD para o input tipo date
  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Estado para criação de novo torneio
  const [tournamentDate, setTournamentDate] = useState<string>(getTodayISO);
  const [tournamentName, setTournamentName] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `Torneio Edison #${day}/${month}/${year}`;
  });
  const [countsForLeague, setCountsForLeague] = useState<boolean>(true);
  const [totalRounds, setTotalRounds] = useState<number>(4); // 4 ou 5 rodadas
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    players.filter((p) => p.active).map((p) => p.id)
  );

  // Ao mudar a data no calendário, atualiza o nome padrão caso não tenha sido customizado
  const handleDateChange = (newDate: string) => {
    setTournamentDate(newDate);
    if (!newDate) return;
    const parts = newDate.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const formattedDate = `${d}/${m}/${y}`;
      if (tournamentName.startsWith('Torneio Edison #') || tournamentName.trim() === '') {
        setTournamentName(`Torneio Edison #${formattedDate}`);
      }
    }
  };

  // Mapeamento do deck que cada duelista usará neste torneio específico
  const [tournamentPlayerDecks, setTournamentPlayerDecks] = useState<Record<string, string>>(() => {
    const initialDecks: Record<string, string> = {};
    for (const p of players) {
      const lastDeck = p.decksHistory && p.decksHistory.length > 0
        ? p.decksHistory[p.decksHistory.length - 1].deckName
        : '';
      initialDecks[p.id] = lastDeck;
    }
    return initialDecks;
  });

  // Mantém sincronizado caso a lista de jogadores mude
  useEffect(() => {
    setTournamentPlayerDecks((prev) => {
      const updated = { ...prev };
      for (const p of players) {
        if (updated[p.id] === undefined) {
          const lastDeck = p.decksHistory && p.decksHistory.length > 0
            ? p.decksHistory[p.decksHistory.length - 1].deckName
            : '';
          updated[p.id] = lastDeck;
        }
      }
      return updated;
    });
  }, [players]);

  // Controle de abas internas no torneio ativo
  const [showStandings, setShowStandings] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Toggle de seleção de jogador
  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const selectAllPlayers = () => {
    setSelectedPlayerIds(players.filter((p) => p.active).map((p) => p.id));
  };

  const deselectAllPlayers = () => {
    setSelectedPlayerIds([]);
  };

  const handleDeckChange = (playerId: string, deckName: string) => {
    setTournamentPlayerDecks((prev) => ({
      ...prev,
      [playerId]: deckName,
    }));
  };

  // Permite editar o deck de um duelista durante um torneio em andamento
  const handleUpdateActiveDeck = (playerId: string) => {
    if (!activeTournament) return;
    const currentName = activeTournament.playerDecks?.[playerId] || '';
    const newName = window.prompt('Digite o nome do deck para este duelista neste torneio:', currentName);
    if (newName !== null) {
      const sanitized = newName.trim() || 'Edison Deck';
      onUpdateActiveTournament({
        ...activeTournament,
        playerDecks: {
          ...(activeTournament.playerDecks || {}),
          [playerId]: sanitized,
        },
      });
    }
  };

  // Iniciar novo torneio
  const handleCreateTournament = () => {
    if (selectedPlayerIds.length < 2) {
      alert('Selecione pelo menos 2 jogadores para iniciar o torneio.');
      return;
    }

    const sanitizedPlayerDecks: Record<string, string> = {};
    for (const pid of selectedPlayerIds) {
      sanitizedPlayerDecks[pid] = (tournamentPlayerDecks[pid] || '').trim() || 'Edison Deck';
    }

    const finalDate = tournamentDate ? `${tournamentDate}T12:00:00` : new Date().toISOString();

    const newTournament: Tournament = {
      id: `tourn-${Date.now()}`,
      name: tournamentName.trim() || 'Torneio Edison Format',
      date: finalDate,
      totalRounds: totalRounds,
      currentRound: 1,
      status: 'active',
      countsForLeague: countsForLeague,
      playerIds: selectedPlayerIds,
      playerDecks: sanitizedPlayerDecks,
      rounds: [],
      createdAt: new Date().toISOString(),
    };

    // Gera a 1ª rodada usando o algoritmo suíço
    const round1 = generateSwissPairings(1, newTournament, players);
    newTournament.rounds = [round1];

    onStartTournament(newTournament);
  };

  // Atualizar resultado de uma partida específica
  const handleSetMatchScore = (
    roundIndex: number,
    matchId: string,
    p1Wins: number,
    p2Wins: number,
    isDraw: boolean,
    isWO: boolean,
    winnerPlayerId: string | null
  ) => {
    if (!activeTournament) return;

    const updatedTournament: Tournament = JSON.parse(JSON.stringify(activeTournament));
    const targetRound = updatedTournament.rounds[roundIndex];
    if (!targetRound) return;

    const targetMatch = targetRound.matches.find((m) => m.id === matchId);
    if (!targetMatch) return;

    targetMatch.gameWins1 = p1Wins;
    targetMatch.gameWins2 = p2Wins;
    targetMatch.isDraw = isDraw;
    targetMatch.isWO = isWO;
    targetMatch.isCompleted = true;
    targetMatch.winnerId = winnerPlayerId;

    targetRound.isCompleted = targetRound.matches.every((m) => m.isCompleted);

    onUpdateActiveTournament(updatedTournament);
  };

  // Avançar para a próxima rodada
  const handleAdvanceRound = () => {
    if (!activeTournament) return;

    const currentRoundObj = activeTournament.rounds[activeTournament.currentRound - 1];
    if (!currentRoundObj || !currentRoundObj.isCompleted) {
      alert('Conclua todas as mesas da rodada atual antes de avançar.');
      return;
    }

    const nextRoundNumber = activeTournament.currentRound + 1;
    const nextRound = generateSwissPairings(nextRoundNumber, activeTournament, players);

    const updatedTournament: Tournament = {
      ...activeTournament,
      currentRound: nextRoundNumber,
      rounds: [...activeTournament.rounds, nextRound],
    };

    onUpdateActiveTournament(updatedTournament);
  };

  // Disparar confetes e preparar encerramento
  const handlePrepareFinish = () => {
    if (!activeTournament) return;

    const standings = calculateTournamentStandings(activeTournament, players);
    const champion = standings[0];
    const runnerUp = standings[1];

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#8B5CF6', '#FBBF24', '#FFFFFF'],
      });
    } catch {
      // Ignora se confetti não estiver disponível
    }

    const finishedTournament: Tournament = {
      ...activeTournament,
      status: 'completed',
      championId: champion?.playerId,
      runnerUpId: runnerUp?.playerId,
      completedAt: new Date().toISOString(),
    };

    setIsFinishing(true);
    onUpdateActiveTournament(finishedTournament);
  };

  // Confirmar e salvar estatísticas na liga geral
  const handleConfirmAndSaveLeague = () => {
    if (!activeTournament) return;
    onFinishTournament(activeTournament);
    setIsFinishing(false);
  };

  // ==========================================
  // CENÁRIO 1: Nenhum torneio em andamento
  // ==========================================
  if (!activeTournament) {
    const isOdd = selectedPlayerIds.length % 2 !== 0;

    return (
      <div className="view-container">
        <div className="hero-banner">
          <div className="hero-content">
            <div className="hero-tag">
              <Swords size={14} className="text-gold" />
              <span>SISTEMA DE TORNEIO EDISON</span>
            </div>
            <h2 className="hero-title">Criar Novo Torneio Suíço</h2>
            <p className="hero-subtitle hide-on-xs">
              Configure as rodadas, selecione os duelistas e inicie as disputas.
            </p>
          </div>
        </div>

        <div className="tournament-create-card">
          {/* Linha 1: Nome do Torneio e Calendário da Data */}
          <div className="form-grid-2col">
            <div className="form-section">
              <label className="form-label" htmlFor="input-tournament-name">
                Nome do Torneio:
              </label>
              <input
                id="input-tournament-name"
                type="text"
                className="input-large"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Ex: Torneio Edison #08/10/2026"
              />
            </div>

            <div className="form-section">
              <label className="form-label" htmlFor="btn-tournament-date-picker">
                <Calendar size={15} className="text-gold" />
                <span>Data do Torneio:</span>
              </label>
              <CustomDatePicker
                id="btn-tournament-date-picker"
                value={tournamentDate}
                onChange={handleDateChange}
              />
            </div>
          </div>

          {/* Linha 2: Rodadas e Checkbox de Pontuação para Liga vs Freeplay */}
          <div className="form-grid-2col">
            {/* Seletor de Rodadas */}
            <div className="form-section">
              <label className="form-label">Número de Rodadas:</label>
              <div className="rounds-selector-grid">
                <button
                  type="button"
                  id="btn-rounds-4"
                  className={`btn-round-select ${totalRounds === 4 ? 'selected' : ''}`}
                  onClick={() => setTotalRounds(4)}
                >
                  <span className="round-number">4</span>
                  <span className="round-label-clean">Rodadas</span>
                </button>
                <button
                  type="button"
                  id="btn-rounds-5"
                  className={`btn-round-select ${totalRounds === 5 ? 'selected' : ''}`}
                  onClick={() => setTotalRounds(5)}
                >
                  <span className="round-number">5</span>
                  <span className="round-label-clean">Rodadas</span>
                </button>
              </div>
            </div>

            {/* Caixa para marcar Liga ou Torneio */}
            <div className="form-section">
              <label className="form-label">Tipo de Torneio:</label>
              <div
                id="card-toggle-league-points"
                className={`league-option-card ${countsForLeague ? 'selected-league' : 'selected-freeplay'}`}
                onClick={() => setCountsForLeague(!countsForLeague)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setCountsForLeague(!countsForLeague);
                  }
                }}
              >
                <div className="league-option-checkbox-wrapper">
                  <input
                    id="check-counts-league"
                    type="checkbox"
                    className="league-custom-checkbox"
                    checked={countsForLeague}
                    onChange={(e) => setCountsForLeague(e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="league-option-info">
                  <div className="league-option-title-row">
                    {countsForLeague ? (
                      <>
                        <Trophy size={18} className="text-gold" />
                        <span className="league-option-title">Liga</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="text-cyan" />
                        <span className="league-option-title">Torneio</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seleção de Duelistas e Escolha de Deck do Torneio */}
          <div className="form-section">
            <div className="player-selection-header">
              <div>
                <label className="form-label">Duelistas e Decks Participantes:</label>
                <span className="text-muted text-sm">
                  {selectedPlayerIds.length} de {players.filter((p) => p.active).length} selecionados
                </span>
              </div>
              <div className="quick-selection-buttons">
                <button
                  type="button"
                  id="btn-select-all-players"
                  className="btn-text-action"
                  onClick={selectAllPlayers}
                >
                  Selecionar Todos
                </button>
                <button
                  type="button"
                  id="btn-deselect-all-players"
                  className="btn-text-action"
                  onClick={deselectAllPlayers}
                >
                  Limpar
                </button>
              </div>
            </div>

            {isOdd && selectedPlayerIds.length > 0 && (
              <div className="by-alert-box">
                <AlertCircle size={18} className="text-gold" />
                <div>
                  <strong>Atenção: Número ímpar de participantes ({selectedPlayerIds.length})!</strong>
                  <p>
                    A cada rodada, 1 jogador receberá folga automática (BY), recebendo vitória e 3 pontos.
                    Em caso de empate de pontos no final, quem teve BY terá menor prioridade no desempate.
                  </p>
                </div>
              </div>
            )}

            {/* Grid reestruturado com espaçamentos confortáveis e seleção de deck do torneio */}
            <div className="tournament-player-roster">
              {players
                .filter((p) => p.active)
                .map((player) => {
                  const isSelected = selectedPlayerIds.includes(player.id);
                  const currentDeck = tournamentPlayerDecks[player.id] ?? '';

                  return (
                    <div
                      key={player.id}
                      className={`roster-player-row ${isSelected ? 'row-selected' : ''}`}
                    >
                      <div
                        className="roster-left-toggle"
                        onClick={() => togglePlayerSelection(player.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          id={`check-player-${player.id}`}
                          className="roster-checkbox"
                        />
                        <div
                          className="player-avatar-sm"
                          style={{ backgroundColor: player.avatarColor || '#3B82F6' }}
                        >
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="roster-player-info">
                          <span className="roster-player-name">{player.name}</span>
                          {player.age ? (
                            <span className="roster-player-age">{player.age} anos</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Escolha do Deck específico deste Torneio */}
                      <div className="roster-deck-selector">
                        <label className="roster-deck-label" htmlFor={`input-deck-${player.id}`}>
                          <Shield size={13} className="text-gold" />
                          <span>Deck neste Torneio:</span>
                        </label>
                        <input
                          id={`input-deck-${player.id}`}
                          type="text"
                          value={currentDeck}
                          disabled={!isSelected}
                          onChange={(e) => handleDeckChange(player.id, e.target.value)}
                          placeholder="Digite o nome do deck..."
                          className="input-roster-deck"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="create-actions">
            <button
              id="btn-start-tournament-submit"
              className="btn-start-tournament"
              disabled={selectedPlayerIds.length < 2}
              onClick={handleCreateTournament}
            >
              <Flame size={20} />
              <span>
                {countsForLeague
                  ? 'Iniciar Torneio da Liga e Gerar 1ª Rodada'
                  : 'Iniciar Torneio Freeplay e Gerar 1ª Rodada'}
              </span>
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CENÁRIO 2: Torneio Finalizado (Pódio)
  // ==========================================
  if (isFinishing || activeTournament.status === 'completed') {
    const standings = calculateTournamentStandings(activeTournament, players);
    const champion = standings[0];
    const runnerUp = standings[1];
    const thirdPlace = standings[2];
    const tiebreakNotes = getTiebreakExplanations(standings);
    const playerDecks = activeTournament.playerDecks || {};

    return (
      <div className="view-container">
        <div className="celebration-card">
          <div className="celebration-badge">
            <Sparkles size={20} className="text-gold" />
            <span>TORNEIO CONCLUÍDO COM SUCESSO</span>
            {activeTournament.countsForLeague !== false ? (
              <span className="badge-league-official" style={{ marginLeft: '8px' }}>Oficial da Liga</span>
            ) : (
              <span className="badge-league-freeplay" style={{ marginLeft: '8px' }}>Freeplay</span>
            )}
          </div>

          <h2 className="celebration-title title-font">{activeTournament.name}</h2>
          <p className="celebration-subtitle">
            {activeTournament.countsForLeague !== false
              ? `Todas as ${activeTournament.totalRounds} rodadas foram concluídas! Os pontos serão computados no Ranking da Liga.`
              : `Todas as ${activeTournament.totalRounds} rodadas foram concluídas! Torneio Freeplay salvo no histórico sem alterar os pontos da Liga.`}
          </p>

          <div className="mini-podium-showcase">
            {champion && (
              <div className="mini-podium-card place-1">
                <div className="mini-podium-rank rank-gold">
                  <Trophy size={13} className="text-gold" />
                  <span>1º LUGAR</span>
                </div>
                <div className="mini-podium-avatar champion-avatar">
                  {champion.playerName.substring(0, 2).toUpperCase()}
                </div>
                <div className="mini-podium-name champion-name" title={champion.playerName}>
                  {champion.playerName}
                </div>
                {playerDecks[champion.playerId] && (
                  <div className="mini-podium-deck" title={playerDecks[champion.playerId]}>
                    {playerDecks[champion.playerId]}
                  </div>
                )}
                <div className="mini-podium-badge badge-gold">
                  {champion.matchPoints} pts
                </div>
              </div>
            )}

            {runnerUp && (
              <div className="mini-podium-card place-2">
                <div className="mini-podium-rank rank-silver">
                  <Medal size={13} className="text-silver" />
                  <span>2º LUGAR</span>
                </div>
                <div className="mini-podium-avatar">
                  {runnerUp.playerName.substring(0, 2).toUpperCase()}
                </div>
                <div className="mini-podium-name" title={runnerUp.playerName}>
                  {runnerUp.playerName}
                </div>
                {playerDecks[runnerUp.playerId] && (
                  <div className="mini-podium-deck" title={playerDecks[runnerUp.playerId]}>
                    {playerDecks[runnerUp.playerId]}
                  </div>
                )}
                <div className="mini-podium-badge badge-silver">
                  {runnerUp.matchPoints} pts
                </div>
              </div>
            )}

            {thirdPlace && (
              <div className="mini-podium-card place-3">
                <div className="mini-podium-rank rank-bronze">
                  <Award size={13} className="text-bronze" />
                  <span>3º LUGAR</span>
                </div>
                <div className="mini-podium-avatar">
                  {thirdPlace.playerName.substring(0, 2).toUpperCase()}
                </div>
                <div className="mini-podium-name" title={thirdPlace.playerName}>
                  {thirdPlace.playerName}
                </div>
                {playerDecks[thirdPlace.playerId] && (
                  <div className="mini-podium-deck" title={playerDecks[thirdPlace.playerId]}>
                    {playerDecks[thirdPlace.playerId]}
                  </div>
                )}
                <div className="mini-podium-badge badge-bronze">
                  {thirdPlace.matchPoints} pts
                </div>
              </div>
            )}
          </div>

          <div className="standings-table-compact">
            <div className="standings-table-header-row">
              <h4 className="compact-title" style={{ margin: 0 }}>Classificação Final do Torneio</h4>
              <span className="badge-swiss-stats">Critérios Oficiais Suíço (TCG / Edison)</span>
            </div>

            <div className="tiebreaker-info-card">
              <div className="tiebreaker-info-header">
                <Sparkles size={14} className="text-gold" />
                <span>Estatísticas e Porcentagens de Desempate</span>
              </div>
              <div className="tiebreaker-grid">
                <div className="tiebreaker-item" title="Player Match Win Rate: Aproveitamento de vitórias de partidas do jogador (mínimo oficial 0.33)">
                  <span className="tb-code">PMW%</span>
                  <span className="tb-label">Partidas do Jogador</span>
                </div>
                <div className="tiebreaker-item" title="Opponent Match Win Rate: Média de vitórias de partidas dos oponentes enfrentados (1º critério de desempate)">
                  <span className="tb-code">OMW%</span>
                  <span className="tb-label">Força dos Oponentes</span>
                </div>
                <div className="tiebreaker-item" title="Player Game Win Rate: Aproveitamento de games/duelos individuais do jogador (2º critério de desempate)">
                  <span className="tb-code">PGW%</span>
                  <span className="tb-label">Games do Jogador</span>
                </div>
                <div className="tiebreaker-item" title="Opponent Game Win Rate: Média de vitórias em games de todos os oponentes (3º critério de desempate)">
                  <span className="tb-code">OGW%</span>
                  <span className="tb-label">Games dos Oponentes</span>
                </div>
              </div>
              <div className="tiebreaker-rule-note">
                *Ordem de Desempate: Pontos &gt; Sem BY (prioridade para quem jogou) &gt; OMW% &gt; PGW% &gt; OGW% (Piso oficial: 0.33)
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th className="text-left">Jogador</th>
                    <th>Deck</th>
                    <th>Pontos</th>
                    <th>V-E-D</th>
                    <th>Games</th>
                    <th>Saldo</th>
                    <th>BY</th>
                    <th title="Player Match Win Rate: Aproveitamento de vitórias em partidas">PMW%</th>
                    <th title="Opponent Match Win Rate: Força da tabela dos oponentes">OMW%</th>
                    <th title="Player Game Win Rate: Aproveitamento em duelos individuais">PGW%</th>
                    <th title="Opponent Game Win Rate: Força dos oponentes em duelos individuais">OGW%</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => (
                    <tr key={s.playerId} className={s.rank === 1 ? 'champion-row' : ''}>
                      <td>
                        <span className={`rank-tag ${s.rank <= 3 ? 'top' : ''}`}>{s.rank}º</span>
                      </td>
                      <td className="text-left">
                        <strong>{s.playerName}</strong>
                      </td>
                      <td>
                        <span className="player-deck-badge">
                          <Shield size={11} />
                          {playerDecks[s.playerId] || 'Edison'}
                        </span>
                      </td>
                      <td>
                        <span className="points-bold">{s.matchPoints} pts</span>
                      </td>
                      <td>{s.matchWins}-{s.matchDraws}-{s.matchLosses}</td>
                      <td>{s.gamesWon} - {s.gamesLost}</td>
                      <td>{s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
                      <td>{s.hadBy ? <span className="had-by-tag">Teve BY</span> : <span className="text-muted">-</span>}</td>
                      <td>
                        <div className="stat-pct-badge" title={`Player Match Win%: ${s.pmwPercentage}%`}>
                          <span className="dec-val">{s.pmw.toFixed(2)}</span>
                          <span className="pct-val">{s.pmwPercentage}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="stat-pct-badge highlight" title={`Opponent Match Win%: ${s.omwPercentage}% (1º Critério TCG)`}>
                          <span className="dec-val">{s.omw.toFixed(2)}</span>
                          <span className="pct-val">{s.omwPercentage}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="stat-pct-badge" title={`Player Game Win%: ${s.pgwPercentage}% (2º Critério TCG)`}>
                          <span className="dec-val">{s.pgw.toFixed(2)}</span>
                          <span className="pct-val">{s.pgwPercentage}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="stat-pct-badge" title={`Opponent Game Win%: ${s.ogwPercentage}% (3º Critério TCG)`}>
                          <span className="dec-val">{s.ogw.toFixed(2)}</span>
                          <span className="pct-val">{s.ogwPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observações de Desempate para Duelistas com mesma pontuação */}
            {tiebreakNotes.length > 0 && (
              <div className="tiebreak-explanations-card">
                <div className="tiebreak-explanations-title">
                  <Info size={15} className="text-gold" />
                  <span>Observações de Desempate (Duelistas com mesma pontuação):</span>
                </div>
                <div className="tiebreak-explanations-list">
                  {tiebreakNotes.map((note) => (
                    <div key={note.points} className="tiebreak-note-group">
                      <span className="tiebreak-note-badge">{note.points} Pts</span>
                      <div className="tiebreak-note-content">
                        <span className="tiebreak-tied-names">
                          Empate entre: <strong>{note.players.join(', ')}</strong>
                        </span>
                        <ul className="tiebreak-reasons-list">
                          {note.reasons.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="finish-cta-box">
            <button
              id="btn-export-finished-tournament-pdf"
              type="button"
              className="btn-pdf-export-secondary"
              onClick={() => exportTournamentResultsPDF(activeTournament, players)}
              title="Baixar Relatório do Torneio em PDF"
            >
              <FileDown size={18} />
              <span>Baixar Relatório em PDF</span>
            </button>
            <button
              id="btn-export-finished-tournament-png"
              type="button"
              className="btn-png-export-secondary"
              onClick={() => exportTournamentResultsPNG(activeTournament, players)}
              title="Baixar Relatório do Torneio em Imagem PNG (Página Única)"
            >
              <ImageDown size={18} />
              <span>Baixar Imagem PNG</span>
            </button>
            <button
              id="btn-save-to-league"
              className={activeTournament.countsForLeague !== false ? "btn-confirm-save-league" : "btn-confirm-save-freeplay"}
              onClick={handleConfirmAndSaveLeague}
            >
              {activeTournament.countsForLeague !== false ? <Trophy size={20} /> : <CheckCircle2 size={20} />}
              <span>
                {activeTournament.countsForLeague !== false
                  ? 'Salvar Torneio e Atualizar Ranking da Liga'
                  : 'Salvar Torneio Freeplay no Histórico'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // CENÁRIO 3: Torneio Ativo em Andamento
  // ==========================================
  const currentRoundIndex = activeTournament.currentRound - 1;
  const currentRound: TournamentRound = activeTournament.rounds[currentRoundIndex];
  const standings = calculateTournamentStandings(activeTournament, players);
  const playerMap = new Map(players.map((p) => [p.id, p]));
  const playerDecks = activeTournament.playerDecks || {};

  const completedMatchesCount = currentRound.matches.filter((m) => m.isCompleted).length;
  const totalMatchesCount = currentRound.matches.length;
  const isRoundFinished = currentRound.matches.every((m) => m.isCompleted);
  const isLastRound = activeTournament.currentRound === activeTournament.totalRounds;

  return (
    <div className="view-container">
      {/* Header da Rodada */}
      <div className="round-hero-card">
        <div className="round-hero-info">
          <div className="round-badge">
            <Flame size={16} className="text-gold" />
            <span>{activeTournament.name}</span>
            {activeTournament.countsForLeague !== false ? (
              <span className="badge-league-official">Oficial da Liga</span>
            ) : (
              <span className="badge-league-freeplay">Freeplay</span>
            )}
          </div>
          <h2 className="round-title title-font">
            Rodada {activeTournament.currentRound} de {activeTournament.totalRounds}
          </h2>
          <div className="round-progress-wrapper">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${(completedMatchesCount / totalMatchesCount) * 100}%`,
                }}
              />
            </div>
            <span className="progress-text">
              {completedMatchesCount} de {totalMatchesCount} confrontos concluídos
            </span>
          </div>
        </div>

        <div className="round-hero-buttons">
          <button
            id="btn-toggle-tournament-standings"
            className={`btn-secondary-action ${showStandings ? 'active' : ''}`}
            onClick={() => setShowStandings(!showStandings)}
          >
            <Eye size={18} />
            <span>{showStandings ? 'Ocultar Classificação' : 'Ver Classificação'}</span>
          </button>
          <button
            id="btn-cancel-tournament"
            className="btn-danger-ghost"
            onClick={() => {
              if (confirm('Tem certeza de que deseja cancelar este torneio em andamento?')) {
                onCancelTournament();
              }
            }}
            title="Cancelar Torneio"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Classificação Parcial Expansível */}
      {showStandings && (
        <div className="standings-drawer-card">
          <div className="drawer-header">
            <div className="drawer-title-group">
              <Trophy size={18} className="text-gold" />
              <h3>Classificação Parcial (Rodada {activeTournament.currentRound})</h3>
            </div>
            <span className="badge-swiss-stats">Critérios Oficiais Suíço</span>
          </div>

          <div className="tiebreaker-info-card">
            <div className="tiebreaker-info-header">
              <Sparkles size={14} className="text-gold" />
              <span>Estatísticas de Desempate (Padrão Oficial Suíço)</span>
            </div>
            <div className="tiebreaker-grid">
              <div className="tiebreaker-item" title="Player Match Win Rate: Aproveitamento de vitórias de partidas do jogador">
                <span className="tb-code">PMW%</span>
                <span className="tb-label">Partidas do Jogador</span>
              </div>
              <div className="tiebreaker-item" title="Opponent Match Win Rate: Média de vitórias de partidas dos oponentes enfrentados (1º critério de desempate)">
                <span className="tb-code">OMW%</span>
                <span className="tb-label">Força dos Oponentes</span>
              </div>
              <div className="tiebreaker-item" title="Player Game Win Rate: Aproveitamento de games/duelos individuais do jogador (2º critério de desempate)">
                <span className="tb-code">PGW%</span>
                <span className="tb-label">Games do Jogador</span>
              </div>
              <div className="tiebreaker-item" title="Opponent Game Win Rate: Média de vitórias em games de todos os oponentes (3º critério de desempate)">
                <span className="tb-code">OGW%</span>
                <span className="tb-label">Games dos Oponentes</span>
              </div>
            </div>
            <div className="tiebreaker-rule-note">
              *Ordem de Desempate: Pontos &gt; Sem BY (prioridade para quem jogou) &gt; OMW% &gt; PGW% &gt; OGW% (Piso oficial: 0.33)
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th className="text-left">Jogador</th>
                  <th>Deck</th>
                  <th>Pontos</th>
                  <th>V - E - D</th>
                  <th>Games</th>
                  <th>Saldo</th>
                  <th>BY</th>
                  <th title="Player Match Win Rate: Aproveitamento de vitórias em partidas">PMW%</th>
                  <th title="Opponent Match Win Rate: Força da tabela dos oponentes">OMW%</th>
                  <th title="Player Game Win Rate: Aproveitamento em duelos individuais">PGW%</th>
                  <th title="Opponent Game Win Rate: Força dos oponentes em duelos individuais">OGW%</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.playerId}>
                    <td>
                      <span className={`rank-tag ${s.rank <= 3 ? 'top' : ''}`}>{s.rank}º</span>
                    </td>
                    <td className="text-left">
                      <strong>{s.playerName}</strong>
                    </td>
                    <td>
                      <span
                        className="player-deck-badge"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleUpdateActiveDeck(s.playerId)}
                        title="Clique para editar o deck deste jogador"
                      >
                        <Shield size={11} />
                        <span>{playerDecks[s.playerId] || 'Edison'}</span>
                        <Edit2 size={10} style={{ opacity: 0.6, marginLeft: '3px' }} />
                      </span>
                    </td>
                    <td>
                      <span className="points-bold">{s.matchPoints} pts</span>
                    </td>
                    <td>{s.matchWins}-{s.matchDraws}-{s.matchLosses}</td>
                    <td>{s.gamesWon} - {s.gamesLost}</td>
                    <td>{s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
                    <td>
                      {s.hadBy ? (
                        <span className="had-by-tag">Teve BY</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="stat-pct-badge" title={`Player Match Win%: ${s.pmwPercentage}%`}>
                        <span className="dec-val">{s.pmw.toFixed(2)}</span>
                        <span className="pct-val">{s.pmwPercentage}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="stat-pct-badge highlight" title={`Opponent Match Win%: ${s.omwPercentage}% (1º Critério)`}>
                        <span className="dec-val">{s.omw.toFixed(2)}</span>
                        <span className="pct-val">{s.omwPercentage}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="stat-pct-badge" title={`Player Game Win%: ${s.pgwPercentage}% (2º Critério)`}>
                        <span className="dec-val">{s.pgw.toFixed(2)}</span>
                        <span className="pct-val">{s.pgwPercentage}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="stat-pct-badge" title={`Opponent Game Win%: ${s.ogwPercentage}% (3º Critério)`}>
                        <span className="dec-val">{s.ogw.toFixed(2)}</span>
                        <span className="pct-val">{s.ogwPercentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Observações de Desempate */}
          {(() => {
            const liveTiebreakNotes = getTiebreakExplanations(standings);
            if (liveTiebreakNotes.length === 0) return null;
            return (
              <div className="tiebreak-explanations-card" style={{ marginTop: '12px' }}>
                <div className="tiebreak-explanations-title">
                  <Info size={15} className="text-gold" />
                  <span>Observações de Desempate (Duelistas com mesma pontuação):</span>
                </div>
                <div className="tiebreak-explanations-list">
                  {liveTiebreakNotes.map((note) => (
                    <div key={note.points} className="tiebreak-note-group">
                      <span className="tiebreak-note-badge">{note.points} Pts</span>
                      <div className="tiebreak-note-content">
                        <span className="tiebreak-tied-names">
                          Empate entre: <strong>{note.players.join(', ')}</strong>
                        </span>
                        <ul className="tiebreak-reasons-list">
                          {note.reasons.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Lista das Mesas / Confrontos da Rodada */}
      <div className="matches-grid">
        {currentRound.matches.map((match) => {
          const p1 = playerMap.get(match.player1Id);
          const p2 = match.player2Id ? playerMap.get(match.player2Id) : null;
          const p1Deck = playerDecks[match.player1Id] || 'Edison Deck';
          const p2Deck = match.player2Id ? playerDecks[match.player2Id] || 'Edison Deck' : '';

          // Se for uma mesa de BY
          if (match.isBy) {
            return (
              <div key={match.id} className="match-card match-by-card" id={`table-card-${match.tableNumber}`}>
                <div className="match-header">
                  <div className="table-badge">
                    <span>MESA {match.tableNumber}</span>
                  </div>
                  <span className="by-status-pill">FOLGA AUTOMÁTICA BY</span>
                </div>

                <div className="by-body">
                  <div className="by-player-info">
                    <div
                      className="player-avatar-sm"
                      style={{ backgroundColor: p1?.avatarColor || '#3B82F6' }}
                    >
                      {p1?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="match-player-name">{p1?.name}</h4>
                      <span className="match-deck-tag">{p1Deck}</span>
                    </div>
                  </div>
                  <div className="by-reward-badge">
                    <CheckCircle2 size={16} />
                    <span>+3 Pontos • Vitória 2-0</span>
                  </div>
                </div>

                <div className="by-footer-tip">
                  <Info size={14} />
                  <span>
                    Conforme a regra, este duelista terá menor prioridade no desempate de pontos ao término do torneio.
                  </span>
                </div>
              </div>
            );
          }

          // Mesa normal com 2 jogadores
          const isFinished = match.isCompleted;
          const p1IsWinner = match.winnerId === match.player1Id;
          const p2IsWinner = match.winnerId === match.player2Id;
          const isDraw = match.isDraw;

          return (
            <div
              key={match.id}
              className={`match-card ${isFinished ? 'match-completed' : ''}`}
              id={`table-card-${match.tableNumber}`}
            >
              <div className="match-header">
                <div className="table-badge">
                  <span>MESA {match.tableNumber}</span>
                </div>
                {isFinished ? (
                  <span className="status-finished-pill">
                    <CheckCircle2 size={13} />
                    <span>Finalizado</span>
                  </span>
                ) : (
                  <span className="status-pending-pill">Aguardando Placar</span>
                )}
              </div>

              {/* Duelistas */}
              <div className="duelists-row">
                {/* Jogador 1 */}
                <div className={`duelist-side ${p1IsWinner ? 'winner-side' : ''}`}>
                  <div
                    className="duelist-avatar"
                    style={{ backgroundColor: p1?.avatarColor || '#3B82F6' }}
                  >
                    {p1?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="duelist-meta">
                    <span className="duelist-name">{p1?.name}</span>
                    <span className="duelist-deck">{p1Deck}</span>
                  </div>
                  {p1IsWinner && <span className="winner-tag">VITÓRIA</span>}
                </div>

                {/* Placar Central */}
                <div className="score-versus-box">
                  {isFinished ? (
                    <div className="score-display">
                      <span className={`score-digit ${p1IsWinner ? 'text-green' : ''}`}>
                        {match.gameWins1}
                      </span>
                      <span className="score-divider">x</span>
                      <span className={`score-digit ${p2IsWinner ? 'text-green' : ''}`}>
                        {match.gameWins2}
                      </span>
                      {isDraw && <span className="draw-subtag">EMPATE</span>}
                      {match.isWO && <span className="wo-subtag">WO</span>}
                    </div>
                  ) : (
                    <div className="versus-pill">VS</div>
                  )}
                </div>

                {/* Jogador 2 */}
                <div className={`duelist-side ${p2IsWinner ? 'winner-side' : ''}`}>
                  <div
                    className="duelist-avatar"
                    style={{ backgroundColor: p2?.avatarColor || '#8B5CF6' }}
                  >
                    {p2?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="duelist-meta">
                    <span className="duelist-name">{p2?.name}</span>
                    <span className="duelist-deck">{p2Deck}</span>
                  </div>
                  {p2IsWinner && <span className="winner-tag">VITÓRIA</span>}
                </div>
              </div>

              {/* Botões rápidos de inserção de resultado Melhor de 3 */}
              <div className="score-presets-section">
                <span className="presets-label">Inserir Placar Bo3:</span>
                <div className="presets-aligned-container">
                  {/* Lado Esquerdo: Favorece Jogador 1 */}
                  <div className="preset-side preset-side-left">
                    <span className="preset-side-title" title={p1?.name}>
                      {p1?.name || 'Jogador 1'}
                    </span>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-win ${p1IsWinner && !match.isWO && match.gameWins1 === 2 && match.gameWins2 === 0 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 2, 0, false, false, match.player1Id)
                      }
                      title={`Vitória 2-0 para ${p1?.name}`}
                    >
                      2 - 0
                    </button>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-win ${p1IsWinner && !match.isWO && match.gameWins1 === 2 && match.gameWins2 === 1 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 2, 1, false, false, match.player1Id)
                      }
                      title={`Vitória 2-1 para ${p1?.name}`}
                    >
                      2 - 1
                    </button>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-wo ${match.isWO && p1IsWinner ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 2, 0, false, true, match.player1Id)
                      }
                      title={`Vitória por WO para ${p1?.name}`}
                    >
                      WO
                    </button>
                  </div>

                  {/* Centro: Empate */}
                  <div className="preset-side preset-side-center">
                    <span className="preset-side-title">Empate</span>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-draw ${isDraw ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 1, 1, true, false, null)
                      }
                      title="Empate 1-1"
                    >
                      1 - 1
                    </button>
                  </div>

                  {/* Lado Direito: Favorece Jogador 2 */}
                  <div className="preset-side preset-side-right">
                    <span className="preset-side-title" title={p2?.name}>
                      {p2?.name || 'Jogador 2'}
                    </span>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-win ${p2IsWinner && !match.isWO && match.gameWins1 === 0 && match.gameWins2 === 2 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 0, 2, false, false, match.player2Id)
                      }
                      title={`Vitória 0-2 para ${p2?.name}`}
                    >
                      0 - 2
                    </button>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-win ${p2IsWinner && !match.isWO && match.gameWins1 === 1 && match.gameWins2 === 2 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 1, 2, false, false, match.player2Id)
                      }
                      title={`Vitória 1-2 para ${p2?.name}`}
                    >
                      1 - 2
                    </button>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-wo ${match.isWO && p2IsWinner ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 0, 2, false, true, match.player2Id)
                      }
                      title={`Vitória por WO para ${p2?.name}`}
                    >
                      WO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra de Ação da Rodada */}
      <div className="round-bottom-action-bar">
        {!isRoundFinished ? (
          <div className="round-status-warning">
            <AlertCircle size={18} className="text-gold" />
            <span>Preencha o resultado de todas as mesas acima para prosseguir.</span>
          </div>
        ) : (
          <div className="round-action-success">
            {isLastRound ? (
              <button
                id="btn-finish-last-round"
                className="btn-finish-tournament-main"
                onClick={handlePrepareFinish}
              >
                <Trophy size={20} />
                <span>Finalizar Torneio e Ver Campeão!</span>
                <Sparkles size={18} />
              </button>
            ) : (
              <button
                id="btn-advance-round"
                className="btn-advance-round-main"
                onClick={handleAdvanceRound}
              >
                <Flame size={20} />
                <span>
                  Gerar Rodada {activeTournament.currentRound + 1} (Sistema Suíço)
                </span>
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
