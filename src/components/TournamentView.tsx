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
  Award,
  UserMinus,
  UserPlus,
  Users,
  RotateCcw,
  X,
  Search,
  Sliders,
  ArrowLeftRight,
  Plus,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Player, Tournament, TournamentRound, Match, Decklist } from '../types';
import {
  generateSwissPairings,
  calculateTournamentStandings,
  getTiebreakExplanations,
  getTournamentTopCut,
  getDefaultTopCutForPlayerCount,
} from '../utils/swissEngine';
import { exportTournamentResultsPDF } from '../utils/pdfGenerator';
import { exportTournamentResultsPNG } from '../utils/imageExporter';
import { StatInfoModal, type TiebreakStatType } from './StatInfoModal';
import { RoundTimer } from './RoundTimer';
import { CustomDatePicker } from './CustomDatePicker';
import { DecklistModal } from './DecklistModal';

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
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [tournamentDate, setTournamentDate] = useState<string>(getTodayISO);
  const [tournamentFormat, setTournamentFormat] = useState<string>('Edison');
  const [tournamentName, setTournamentName] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `Torneio Edison #${day}/${month}/${year}`;
  });
  const [countsForLeague, setCountsForLeague] = useState<boolean>(true);
  const [totalRounds, setTotalRounds] = useState<number>(4); // 4 ou 5 rodadas
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('');
  const [topCut, setTopCut] = useState<number>(() => {
    const activeCount = players.filter((p) => p.active).length;
    return getDefaultTopCutForPlayerCount(activeCount > 0 ? activeCount : 8);
  });
  const [hasUserChangedTopCut, setHasUserChangedTopCut] = useState<boolean>(false);

  // Ajusta automaticamente a sugestão de TOP conforme os jogadores selecionados (a menos que o gestor tenha escolhido manualmente)
  useEffect(() => {
    if (!hasUserChangedTopCut && selectedPlayerIds.length > 0) {
      setTopCut(getDefaultTopCutForPlayerCount(selectedPlayerIds.length));
    }
  }, [selectedPlayerIds.length, hasUserChangedTopCut]);

  // Ao mudar o formato do torneio, atualiza o nome padrão caso não tenha sido customizado
  const handleFormatChange = (newFormat: string) => {
    setTournamentFormat(newFormat);
    if (tournamentDate) {
      const parts = tournamentDate.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const formattedDate = `${d}/${m}/${y}`;
        const fmtName = newFormat.trim() || 'Yu-Gi-Oh!';
        if (tournamentName.startsWith('Torneio ') || tournamentName.trim() === '') {
          setTournamentName(`Torneio ${fmtName} #${formattedDate}`);
        }
      }
    }
  };

  // Ao mudar a data no calendário, atualiza o nome padrão caso não tenha sido customizado
  const handleDateChange = (newDate: string) => {
    setTournamentDate(newDate);
    if (!newDate) return;
    const parts = newDate.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const formattedDate = `${d}/${m}/${y}`;
      const fmtName = tournamentFormat.trim() || 'Yu-Gi-Oh!';
      if (tournamentName.startsWith('Torneio ') || tournamentName.trim() === '') {
        setTournamentName(`Torneio ${fmtName} #${formattedDate}`);
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

  // Mapeamento das decklists dos jogadores para o novo torneio
  const [tournamentPlayerDecklists, setTournamentPlayerDecklists] = useState<Record<string, Decklist>>({});

  // Modal de Decklist (para criar, editar ou visualizar)
  const [activeDecklistModal, setActiveDecklistModal] = useState<{
    playerId: string;
    playerName: string;
    deckName: string;
    decklist?: Decklist | null;
    isPreTournament?: boolean;
  } | null>(null);

  // Controle de abas internas no torneio ativo
  const [showStandings, setShowStandings] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showEditRoundModal, setShowEditRoundModal] = useState(false);
  const [manualMatches, setManualMatches] = useState<Match[]>([]);
  const [participantsModalTab, setParticipantsModalTab] = useState<'drops' | 'late-entry'>('drops');
  const [selectedLatePlayerId, setSelectedLatePlayerId] = useState<string>('');
  const [latePlayerDeck, setLatePlayerDeck] = useState<string>('');
  const [selectedStatModal, setSelectedStatModal] = useState<TiebreakStatType | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Manipulação de Drop (Desistência de torneio)
  const handleDropPlayer = (playerId: string) => {
    if (!activeTournament) return;
    const playerObj = players.find((p) => p.id === playerId);
    const playerName = playerObj ? playerObj.name : 'o duelista';
    if (
      !window.confirm(
        `Deseja dropar ${playerName} deste torneio?\n\n• Ele manterá todos os pontos e saldo conquistados até agora.\n• Não será mais pareado nas próximas rodadas.\n• A pontuação continuará valendo na classificação final.`
      )
    ) {
      return;
    }

    const currentDropped = activeTournament.droppedPlayerIds || [];
    if (currentDropped.includes(playerId)) return;

    onUpdateActiveTournament({
      ...activeTournament,
      droppedPlayerIds: [...currentDropped, playerId],
    });
  };

  const handleUndropPlayer = (playerId: string) => {
    if (!activeTournament) return;
    const currentDropped = activeTournament.droppedPlayerIds || [];
    onUpdateActiveTournament({
      ...activeTournament,
      droppedPlayerIds: currentDropped.filter((id) => id !== playerId),
    });
  };

  // Voltar para a rodada anterior (reverter rodada para correção de placares ou pareamentos)
  const handleRevertRound = () => {
    if (!activeTournament || activeTournament.currentRound <= 1) return;
    const currentRoundNum = activeTournament.currentRound;
    const prevRoundNum = currentRoundNum - 1;

    if (
      !window.confirm(
        `Deseja voltar para a Rodada ${prevRoundNum}?\n\n• Os pareamentos e placares da Rodada ${currentRoundNum} serão descartados.\n• A Rodada ${prevRoundNum} será reaberta para você corrigir os placares e decks das mesas.\n• Em seguida, você poderá gerar a nova rodada novamente.`
      )
    ) {
      return;
    }

    const updatedRounds = activeTournament.rounds.slice(0, prevRoundNum);
    if (updatedRounds[prevRoundNum - 1]) {
      updatedRounds[prevRoundNum - 1].isCompleted = false;
    }

    onUpdateActiveTournament({
      ...activeTournament,
      currentRound: prevRoundNum,
      rounds: updatedRounds,
    });
  };

  // Abrir modal de edição manual de rodada
  const handleOpenEditRoundModal = () => {
    if (!activeTournament) return;
    const roundIdx = Math.max(0, (activeTournament.currentRound || 1) - 1);
    const currentRnd = activeTournament.rounds?.[roundIdx];
    const matches = currentRnd?.matches || [];
    setManualMatches(JSON.parse(JSON.stringify(matches)));
    setShowEditRoundModal(true);
  };

  const handleUpdateManualMatchPlayer = (matchIndex: number, slot: 'player1' | 'player2', playerId: string) => {
    setManualMatches((prev) => {
      const updated = [...prev];
      const target = { ...updated[matchIndex] };
      if (slot === 'player1') {
        target.player1Id = playerId;
      } else {
        if (playerId === 'BYE') {
          target.player2Id = null;
          target.isBy = true;
        } else {
          target.player2Id = playerId;
          target.isBy = false;
        }
      }
      updated[matchIndex] = target;
      return updated;
    });
  };

  const handleSwapP1P2 = (matchIndex: number) => {
    setManualMatches((prev) => {
      const updated = [...prev];
      const target = { ...updated[matchIndex] };
      if (target.isBy || !target.player2Id) return prev;
      const tmp = target.player1Id;
      target.player1Id = target.player2Id;
      target.player2Id = tmp;
      updated[matchIndex] = target;
      return updated;
    });
  };

  const handleAddManualTable = () => {
    if (!activeTournament) return;
    setManualMatches((prev) => [
      ...prev,
      {
        id: `manual-match-${Date.now()}-${prev.length + 1}`,
        roundNumber: activeTournament.currentRound,
        tableNumber: prev.length + 1,
        player1Id: '',
        player2Id: null,
        isBy: true,
        gameWins1: 2,
        gameWins2: 0,
        isCompleted: true,
        isDraw: false,
        isWO: false,
        winnerId: null,
      },
    ]);
  };

  const handleRemoveManualTable = (index: number) => {
    setManualMatches((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((m, idx) => ({ ...m, tableNumber: idx + 1 }));
    });
  };

  const handleSaveManualMatches = () => {
    if (!activeTournament) return;
    const currentRndIdx = activeTournament.currentRound - 1;
    const currentRnd = activeTournament.rounds[currentRndIdx];
    if (!currentRnd) return;

    // Validações de jogadores
    const activePlayerIds = activeTournament.playerIds.filter(
      (pid) => !(activeTournament.droppedPlayerIds || []).includes(pid)
    );

    const hasEmptyP1 = manualMatches.some((m) => !m.player1Id);
    if (hasEmptyP1) {
      alert('Erro: Todas as mesas precisam ter o Jogador 1 selecionado.');
      return;
    }

    const hasEmptyP2 = manualMatches.some((m) => !m.isBy && !m.player2Id);
    if (hasEmptyP2) {
      alert('Erro: Em mesas que não são BY, o Jogador 2 precisa ser selecionado.');
      return;
    }

    const counts: Record<string, number> = {};
    manualMatches.forEach((m) => {
      if (m.player1Id) counts[m.player1Id] = (counts[m.player1Id] || 0) + 1;
      if (m.player2Id) counts[m.player2Id] = (counts[m.player2Id] || 0) + 1;
    });

    const duplicates = Object.keys(counts).filter((pid) => counts[pid] > 1);
    if (duplicates.length > 0) {
      const dupNames = duplicates.map((id) => players.find((p) => p.id === id)?.name || id).join(', ');
      alert(`Erro: Há jogador(es) alocado(s) em mais de uma mesa ao mesmo tempo:\n${dupNames}\n\nCada duelista deve estar em apenas 1 mesa.`);
      return;
    }

    const unassigned = activePlayerIds.filter((pid) => !counts[pid]);
    if (unassigned.length > 0) {
      const unNames = unassigned.map((id) => players.find((p) => p.id === id)?.name || id).join(', ');
      if (!confirm(`Atenção: Os seguintes duelistas participantes não foram alocados em nenhuma mesa:\n${unNames}\n\nDeseja salvar mesmo assim?`)) {
        return;
      }
    }

    if (
      !confirm(
        `Confirmar as alterações manuais dos pareamentos da Rodada ${activeTournament.currentRound}?\n\n• Os novos confrontos entrarão em vigor imediatamente.\n• Mesas com adversários alterados terão seus placares reiniciados para 0 - 0.`
      )
    ) {
      return;
    }

    const oldMatches = currentRnd.matches;
    const updatedMatches: Match[] = manualMatches.map((m, idx) => {
      const isBy = m.player2Id === null || m.isBy;
      const oldMatch = oldMatches.find(
        (om) =>
          (om.player1Id === m.player1Id && om.player2Id === m.player2Id) ||
          (om.player1Id === m.player2Id && om.player2Id === m.player1Id)
      );

      if (isBy) {
        return {
          id: m.id || `match-${activeTournament.currentRound}-${idx + 1}-${Date.now()}`,
          roundNumber: activeTournament.currentRound,
          tableNumber: idx + 1,
          player1Id: m.player1Id,
          player2Id: null,
          isBy: true,
          gameWins1: 2,
          gameWins2: 0,
          isCompleted: true,
          isDraw: false,
          isWO: false,
          winnerId: m.player1Id,
        };
      }

      // Se manteve exatamente o mesmo confronto, preserva resultado
      if (oldMatch && oldMatch.player1Id === m.player1Id && oldMatch.player2Id === m.player2Id) {
        return {
          ...oldMatch,
          tableNumber: idx + 1,
        };
      }

      // Confronto alterado ou novo
      return {
        id: `match-${activeTournament.currentRound}-${idx + 1}-${Date.now()}`,
        roundNumber: activeTournament.currentRound,
        tableNumber: idx + 1,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        isBy: false,
        gameWins1: 0,
        gameWins2: 0,
        isCompleted: false,
        isDraw: false,
        isWO: false,
        winnerId: null,
      };
    });

    const updatedRound: TournamentRound = {
      ...currentRnd,
      matches: updatedMatches,
      isCompleted: updatedMatches.every((m) => m.isCompleted),
    };

    const updatedRounds = [...activeTournament.rounds];
    updatedRounds[currentRndIdx] = updatedRound;

    onUpdateActiveTournament({
      ...activeTournament,
      rounds: updatedRounds,
    });

    setShowEditRoundModal(false);
  };

  // Entrada tardia: Adicionar duelista no meio do torneio
  const handleAddLatePlayer = () => {
    if (!activeTournament || !selectedLatePlayerId) {
      alert('Selecione um duelista para incluir no torneio.');
      return;
    }
    if (activeTournament.playerIds.includes(selectedLatePlayerId)) {
      alert('Este duelista já está participando deste torneio.');
      return;
    }

    const playerObj = players.find((p) => p.id === selectedLatePlayerId);
    const playerName = playerObj ? playerObj.name : 'o duelista';
    const sanitizedDeck = latePlayerDeck.trim() || 'Yugioh Deck';

    if (
      !window.confirm(
        `Deseja incluir ${playerName} no torneio em andamento?\n\n• Ele entrará com 0 pontos pelas rodadas já finalizadas.\n• Será pareado normalmente a partir da próxima rodada.\n• Deck informado: ${sanitizedDeck}.`
      )
    ) {
      return;
    }

    const updatedPlayerIds = [...activeTournament.playerIds, selectedLatePlayerId];
    const updatedDecks = {
      ...(activeTournament.playerDecks || {}),
      [selectedLatePlayerId]: sanitizedDeck,
    };

    onUpdateActiveTournament({
      ...activeTournament,
      playerIds: updatedPlayerIds,
      playerDecks: updatedDecks,
    });

    setSelectedLatePlayerId('');
    setLatePlayerDeck('');
    alert(`${playerName} foi incluído no torneio com sucesso!`);
  };

  // Toggle de seleção de jogador
  const togglePlayerSelection = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const selectAllPlayers = () => {
    if (playerSearchQuery.trim()) {
      const filteredIds = players
        .filter((p) => p.active && p.name.toLowerCase().includes(playerSearchQuery.toLowerCase().trim()))
        .map((p) => p.id);
      setSelectedPlayerIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    } else {
      setSelectedPlayerIds(players.filter((p) => p.active).map((p) => p.id));
    }
  };

  const deselectAllPlayers = () => {
    if (playerSearchQuery.trim()) {
      const filteredIds = new Set(
        players
          .filter((p) => p.active && p.name.toLowerCase().includes(playerSearchQuery.toLowerCase().trim()))
          .map((p) => p.id)
      );
      setSelectedPlayerIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      setSelectedPlayerIds([]);
    }
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
      const sanitized = newName.trim() || 'Yugioh Deck';
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
      sanitizedPlayerDecks[pid] = (tournamentPlayerDecks[pid] || '').trim() || 'Yugioh Deck';
    }

    const finalDate = tournamentDate ? `${tournamentDate}T12:00:00` : new Date().toISOString();

    const newTournament: Tournament = {
      id: `tourn-${Date.now()}`,
      name: tournamentName.trim() || `Torneio ${tournamentFormat.trim() || 'Yu-Gi-Oh!'}`,
      format: tournamentFormat.trim() || 'Edison',
      date: finalDate,
      totalRounds: totalRounds,
      currentRound: 1,
      status: 'active',
      countsForLeague: countsForLeague,
      topCut: topCut,
      playerIds: selectedPlayerIds,
      playerDecks: sanitizedPlayerDecks,
      playerDecklists: tournamentPlayerDecklists,
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
        colors: ['#F59E0B', '#10B981', '#0D6E62', '#FBBF24', '#FFFFFF'],
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
        {/* Hero Card Moderno & Minimalista inspirado nos apps móveis de alta fidelidade */}
        <div className="modern-hero-card">
          <div className="modern-hero-header">
            <div className="modern-hero-brand">
              <div className="modern-hero-icon-pill">
                <Swords size={18} />
              </div>
              <span className="modern-hero-badge">Torneio Suíço</span>
            </div>
            <span className="modern-status-pill">
              <span className="pulse-indicator-dot" />
              Pronto
            </span>
          </div>

          <div className="modern-hero-body">
            <h2 className="modern-hero-title">Gestão de Rodadas</h2>

            <button
              type="button"
              className="btn-modern-primary"
              onClick={() => setShowCreateModal(true)}
              id="btn-open-create-tournament"
            >
              <Flame size={18} />
              <span>Configurar e Iniciar Torneio</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Grade de Atalhos Rápidos Minimalista (Sem textos extensos) */}
        <div className="modern-shortcuts-grid">
          <button
            type="button"
            className="modern-shortcut-card"
            onClick={() => setShowRulesModal(true)}
          >
            <div className="modern-shortcut-icon" style={{ background: '#ECFDF5', color: '#0D6E62' }}>
              <Shield size={18} />
            </div>
            <div className="modern-shortcut-text">
              <span className="modern-shortcut-title">Regras do Formato</span>
              <span className="modern-shortcut-sub">Banlist e prioridades</span>
            </div>
            <ChevronRight size={16} className="modern-shortcut-chevron" />
          </button>

          <button
            type="button"
            className="modern-shortcut-card"
            onClick={() => setSelectedStatModal('OMW')}
          >
            <div className="modern-shortcut-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <Trophy size={18} />
            </div>
            <div className="modern-shortcut-text">
              <span className="modern-shortcut-title">Critérios de Desempate</span>
              <span className="modern-shortcut-sub">OMW% e Buchholz</span>
            </div>
            <ChevronRight size={16} className="modern-shortcut-chevron" />
          </button>
        </div>

        {/* ========================================================
            MODAL DE CONFIGURAÇÃO DE NOVO TORNEIO
            Habilita uma janela limpa e organizada para o usuário configurar
            as opções e escolher os duelistas participantes sem poluir a tela.
            ======================================================== */}
        {showCreateModal && (
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
            <div
              className="modal-tournament-setup"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="modal-setup-header">
                <div>
                  <h3 className="modal-setup-title">Configurar Novo Torneio</h3>
                  <p className="modal-setup-subtitle">
                    Defina rodadas, nome e selecione os duelistas participantes
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Corpo Scrollável do Modal */}
              <div className="modal-setup-body">
                {/* Formato do Torneio */}
                <div className="form-section" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                    <label className="form-label" htmlFor="input-tournament-format" style={{ marginBottom: 0 }}>
                      <Sparkles size={14} className="text-gold" />
                      <span>Formato do Torneio</span>
                    </label>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Digite ou escolha um formato abaixo:
                    </span>
                  </div>
                  <input
                    id="input-tournament-format"
                    type="text"
                    className="input-large"
                    value={tournamentFormat}
                    onChange={(e) => handleFormatChange(e.target.value)}
                    placeholder="Ex: Edison, Vegas, Avançado, GOAT..."
                    style={{ marginBottom: '6px' }}
                  />
                  {/* Atalhos Rápidos de Formato */}
                  <div className="format-shortcuts-grid">
                    {['Edison', 'Vegas', 'Avançado', 'GOAT', 'HAT', 'Moderno'].map((fmt) => {
                      const isActiveFmt = tournamentFormat.toLowerCase() === fmt.toLowerCase();
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleFormatChange(fmt)}
                          className={`btn-format-shortcut ${isActiveFmt ? 'active' : ''}`}
                        >
                          {fmt}
                        </button>
                      );
                    })}
                  </div>
                </div>

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
                      placeholder={`Ex: Torneio ${tournamentFormat || 'Yu-Gi-Oh!'} #08/10/2026`}
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
                      <div
                        className={`custom-round-input-card ${totalRounds !== 4 && totalRounds !== 5 ? 'selected' : ''}`}
                      >
                        <input
                          id="input-custom-rounds"
                          type="number"
                          min={1}
                          max={20}
                          value={totalRounds}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 20) {
                              setTotalRounds(val);
                            }
                          }}
                          className="custom-round-number-input"
                          aria-label="Inserir número de rodadas personalizado"
                        />
                        <span className="round-label-clean">Outro</span>
                      </div>
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
                              <span className="league-option-title">Oficial da Liga</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={18} className="text-cyan" />
                              <span className="league-option-title">Torneio Freeplay</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linha 3: Quantitativo de Duelistas no TOP */}
                <div className="form-section">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      <Award size={14} className="text-gold" />
                      <span>Quantitativo do TOP:</span>
                    </label>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                      {selectedPlayerIds.length > 0
                        ? `Sugestão para ${selectedPlayerIds.length} jogadores: TOP ${getDefaultTopCutForPlayerCount(selectedPlayerIds.length)}`
                        : 'Defina a quantidade de duelistas em destaque'}
                    </span>
                  </div>
                  <div className="top-cut-selector-grid">
                    {[2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        id={`btn-top-cut-${num}`}
                        className={`btn-top-select ${topCut === num ? 'selected' : ''}`}
                        onClick={() => {
                          setTopCut(num);
                          setHasUserChangedTopCut(true);
                        }}
                        style={{ padding: '12px 6px' }}
                      >
                        <span className="top-cut-number">TOP {num}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seleção de Duelistas e Nome do Deck */}
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

                  {/* Campo de Busca de Duelistas */}
                  <div className="roster-search-container">
                    <Search size={15} className="text-muted roster-search-icon" />
                    <input
                      type="text"
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      placeholder="Buscar duelista pelo nome..."
                      className="roster-search-input"
                    />
                    {playerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setPlayerSearchQuery('')}
                        className="btn-clear-roster-search"
                        title="Limpar busca"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Grid de Duelistas com Checkbox e Nome do Deck */}
                  <div className="tournament-player-roster">
                    {(() => {
                      const activeList = players.filter((p) => p.active);
                      const filtered = activeList.filter((p) =>
                        p.name.toLowerCase().includes(playerSearchQuery.toLowerCase().trim())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                            Nenhum duelista encontrado com o nome "{playerSearchQuery}".
                          </div>
                        );
                      }

                      return filtered.map((player) => {
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

                            {/* Escolha do Deck específico deste Torneio (Nome apenas para máxima leveza) */}
                            <div className="roster-deck-selector">
                              <label className="roster-deck-label" htmlFor={`input-deck-${player.id}`} title="Deck neste Torneio">
                                <Shield size={13} className="text-gold" style={{ flexShrink: 0 }} />
                                <span className="roster-deck-label-text">Deck:</span>
                              </label>
                              <div className="roster-deck-input-group">
                                <input
                                  id={`input-deck-${player.id}`}
                                  type="text"
                                  value={currentDeck}
                                  disabled={!isSelected}
                                  onChange={(e) => handleDeckChange(player.id, e.target.value)}
                                  placeholder="Nome do deck..."
                                  className="input-roster-deck"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Footer do Modal com Botões de Ação */}
              <div className="modal-setup-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-start-tournament-submit"
                  className="btn-modal-submit-tournament"
                  disabled={selectedPlayerIds.length < 2}
                  onClick={() => {
                    handleCreateTournament();
                    setShowCreateModal(false);
                  }}
                >
                  <span>Iniciar Torneio ({selectedPlayerIds.length})</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODAL DE REGULAMENTO EDISON FORMAT 2010
            ======================================================== */}
        {showRulesModal && (
          <div className="modal-backdrop" onClick={() => setShowRulesModal(false)}>
            <div
              className="modal-tournament-setup"
              style={{ maxWidth: '480px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-setup-header">
                <div>
                  <h3 className="modal-setup-title">Regulamento Edison Format</h3>
                  <p className="modal-setup-subtitle">Regras Oficiais Históricas (Abril de 2010)</p>
                </div>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setShowRulesModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-setup-body" style={{ gap: '14px', fontSize: '13px', lineHeight: 1.5, color: '#334155' }}>
                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', fontSize: '12px', lineHeight: 1.25, whiteSpace: 'nowrap', letterSpacing: '-0.015em' }}>
                    1. Prioridade de Invocação (Ignition Priority)
                  </h4>
                  <p style={{ margin: 0, textAlign: 'justify' }}>
                    No Edison Format, o duelista do turno tem prioridade para ativar o efeito de ignição de monstros (ex: Judgment Dragon, Dark Armed Dragon, Brionac, Snipe Hunter) imediatamente após sua Invocação Normal/Especial bem-sucedida, antes de cartas como Bottomless Trap Hole ou Torrential Tribute resolverem.
                  </p>
                </div>

                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', fontSize: '12px', lineHeight: 1.25, whiteSpace: 'nowrap', letterSpacing: '-0.015em' }}>
                    2. Pontuação e Sistema Suíço Oficial
                  </h4>
                  <p style={{ margin: 0, textAlign: 'justify' }}>
                    • <strong>Vitória na Rodada</strong>: 3 Pontos<br />
                    • <strong>Empate</strong>: 1 Ponto cada<br />
                    • <strong>Derrota</strong>: 0 Pontos<br />
                    • <strong>BY (Folga em número ímpar)</strong>: Vitória automática e 3 pontos (menor prioridade em caso de desempate).
                  </p>
                </div>

                <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <h4 style={{ fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', fontSize: '12px', lineHeight: 1.25, whiteSpace: 'nowrap', letterSpacing: '-0.015em' }}>
                    3. Critérios de Desempate (Buchholz / OMW%)
                  </h4>
                  <p style={{ margin: 0, textAlign: 'justify' }}>
                    O sistema calcula automaticamente o aproveitamento dos oponentes enfrentados (OMW% com piso de 33%), saldo de games (+2, +1, -1, -2), confronto direto, PGW% e OGW%.
                  </p>
                </div>
              </div>

              <div className="modal-setup-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  style={{ width: '100%', textAlign: 'center' }}
                  onClick={() => setShowRulesModal(false)}
                >
                  Entendi e Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal explicativo com regras oficiais de desempate Suíço (PMW, OMW, PGW, OGW) */}
        {selectedStatModal && (
          <StatInfoModal
            statType={selectedStatModal}
            onClose={() => setSelectedStatModal(null)}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // CENÁRIO 2: Torneio Finalizado (Pódio)
  // ==========================================
  if (isFinishing || activeTournament.status === 'completed') {
    const standings = calculateTournamentStandings(activeTournament, players);
    const tournamentTopCut = getTournamentTopCut(activeTournament);
    const topStandings = standings.slice(0, Math.min(tournamentTopCut, standings.length));
    const tiebreakNotes = getTiebreakExplanations(standings, activeTournament);
    const playerDecks = activeTournament.playerDecks || {};

    return (
      <div className="view-container">
        <div className="celebration-card">
          <div className="celebration-badge">
            <Sparkles size={20} className="text-gold" />
            <span>TORNEIO CONCLUÍDO • TOP {tournamentTopCut} DEFINIDO</span>
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
            {topStandings.map((s, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;
              const isSecond = rank === 2;

              const cardClass = isFirst
                ? 'place-1'
                : isSecond
                ? 'place-2'
                : `place-3 place-${rank}`;

              const rankClass = isFirst
                ? 'rank-gold'
                : isSecond
                ? 'rank-silver'
                : 'rank-bronze';

              const badgeClass = isFirst
                ? 'badge-gold'
                : isSecond
                ? 'badge-silver'
                : 'badge-bronze';

              const iconColor = isFirst
                ? 'text-gold'
                : isSecond
                ? 'text-silver'
                : 'text-bronze';

              const rankLabel = isFirst
                ? '1º LUGAR'
                : isSecond
                ? '2º LUGAR'
                : `${rank}º LUGAR`;

              const Icon = isFirst ? Trophy : isSecond ? Medal : Award;

              return (
                <div key={s.playerId} className={`mini-podium-card ${cardClass}`}>
                  <div className={`mini-podium-rank ${rankClass}`}>
                    <Icon size={13} className={iconColor} />
                    <span>{rankLabel}</span>
                  </div>
                  <div className={`mini-podium-avatar ${isFirst ? 'champion-avatar' : ''}`}>
                    {s.playerName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className={`mini-podium-name ${isFirst ? 'champion-name' : ''}`} title={s.playerName}>
                    {s.playerName}
                  </div>
                  {playerDecks[s.playerId] && (
                    <div className="mini-podium-deck" title={playerDecks[s.playerId]}>
                      {playerDecks[s.playerId]}
                    </div>
                  )}
                  <div className={`mini-podium-badge ${badgeClass}`}>
                    {s.matchPoints} pts
                  </div>
                </div>
              );
            })}
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
                <div className="tiebreaker-item" title="Player Match Win Percentage">
                  <span className="tb-code">PMW%</span>
                  <span className="tb-label">Player Match Win %</span>
                </div>
                <div className="tiebreaker-item" title="Opponents' Match Win Percentage">
                  <span className="tb-code">OMW%</span>
                  <span className="tb-label">Opponents' Match Win %</span>
                </div>
                <div className="tiebreaker-item" title="Player Game Win Percentage">
                  <span className="tb-code">PGW%</span>
                  <span className="tb-label">Player Game Win %</span>
                </div>
                <div className="tiebreaker-item" title="Opponents' Game Win Percentage">
                  <span className="tb-code">OGW%</span>
                  <span className="tb-label">Opponents' Game Win %</span>
                </div>
              </div>
              <div className="tiebreaker-rule-note">
                *Ordem de Desempate: Pontos &gt; Sem BY (prioridade para quem jogou) &gt; Mínimos (OMW%) &gt; Saldo de Games (+2 / +1 / -1 / -2) &gt; Confronto Direto &gt; PGW% &gt; OGW% (Piso: 0.33)
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
                        <span className={`rank-tag ${s.rank <= tournamentTopCut ? 'top' : ''}`}>{s.rank}º</span>
                      </td>
                      <td className="text-left">
                        <strong>{s.playerName}</strong>
                        {s.isDropped && (
                          <span
                            className="badge-drop-tag"
                            style={{
                              marginLeft: '6px',
                              fontSize: '10px',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              fontWeight: 'bold',
                            }}
                          >
                            DROP
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="player-deck-badge">
                          <Shield size={11} />
                          {playerDecks[s.playerId] || 'Yugioh Deck'}
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

        {/* Modal explicativo com regras oficiais de desempate Suíço (PMW, OMW, PGW, OGW) */}
        {selectedStatModal && (
          <StatInfoModal
            statType={selectedStatModal}
            onClose={() => setSelectedStatModal(null)}
          />
        )}
      </div>
    );
  }

  // ==========================================
  // CENÁRIO 3: Torneio Ativo em Andamento
  // ==========================================
  const currentRoundIndex = activeTournament.currentRound - 1;
  const currentRound: TournamentRound = activeTournament.rounds[currentRoundIndex];
  const standings = calculateTournamentStandings(activeTournament, players);
  const activeTopCut = getTournamentTopCut(activeTournament);
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
            {activeTournament.format && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {activeTournament.format}
              </span>
            )}
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
            type="button"
            className={`btn-secondary-action ${showStandings ? 'active' : ''}`}
            onClick={() => setShowStandings(!showStandings)}
            title="Exibir ou ocultar classificação do torneio"
          >
            <Eye size={15} />
            <span>{showStandings ? 'Ocultar' : 'Classificação'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={handleOpenEditRoundModal}
            title="Editar pareamentos e mesas manualmente"
          >
            <Sliders size={15} />
            <span>Editar Rodada</span>
          </button>

          <button
            type="button"
            className="btn-secondary-action"
            onClick={() => setShowParticipantsModal(true)}
            title="Gerenciar duelistas e registrar desistências"
          >
            <Users size={15} />
            <span>
              Participantes & Drops
              {(activeTournament.droppedPlayerIds?.length || 0) > 0
                ? ` (${activeTournament.droppedPlayerIds!.length})`
                : ''}
            </span>
          </button>

          {activeTournament.currentRound > 1 && (
            <button
              type="button"
              className="btn-secondary-action"
              onClick={handleRevertRound}
              title="Voltar para a rodada anterior"
            >
              <RotateCcw size={15} />
              <span>Voltar Rodada</span>
            </button>
          )}

          <button
            type="button"
            className="btn-danger-ghost"
            onClick={() => {
              if (confirm('Tem certeza de que deseja cancelar este torneio em andamento?\n\nOs confrontos e placares da rodada atual serão descartados.')) {
                onCancelTournament();
              }
            }}
            title="Cancelar o torneio em andamento"
          >
            <X size={15} />
            <span>Cancelar Torneio</span>
          </button>
        </div>
      </div>

      {/* Cronômetro Oficial da Rodada (40 min padrão, customizável com alertas) */}
      <RoundTimer
        tournamentId={activeTournament.id}
        roundNumber={activeTournament.currentRound}
      />

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
              <div className="tiebreaker-item" title="Player Match Win Percentage">
                <span className="tb-code">PMW%</span>
                <span className="tb-label">Player Match Win %</span>
              </div>
              <div className="tiebreaker-item" title="Opponents' Match Win Percentage">
                <span className="tb-code">OMW%</span>
                <span className="tb-label">Opponents' Match Win %</span>
              </div>
              <div className="tiebreaker-item" title="Player Game Win Percentage">
                <span className="tb-code">PGW%</span>
                <span className="tb-label">Player Game Win %</span>
              </div>
              <div className="tiebreaker-item" title="Opponents' Game Win Percentage">
                <span className="tb-code">OGW%</span>
                <span className="tb-label">Opponents' Game Win %</span>
              </div>
            </div>
            <div className="tiebreaker-rule-note">
              *Ordem de Desempate: Pontos &gt; Sem BY (prioridade para quem jogou) &gt; Mínimos (OMW%) &gt; Saldo de Games (+2 / +1 / -1 / -2) &gt; Confronto Direto &gt; PGW% &gt; OGW% (Piso: 0.33)
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
                      <span className={`rank-tag ${s.rank <= activeTopCut ? 'top' : ''}`}>{s.rank}º</span>
                    </td>
                    <td className="text-left">
                      <strong>{s.playerName}</strong>
                      {s.isDropped && (
                        <span
                          className="badge-drop-tag"
                          style={{
                            marginLeft: '6px',
                            fontSize: '10px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            fontWeight: 'bold',
                          }}
                        >
                          DROP
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="standings-deck-cell">
                        <div className="standings-deck-name-row">
                          <span
                            className="player-deck-badge"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleUpdateActiveDeck(s.playerId)}
                            title="Clique para editar o nome do deck deste jogador"
                          >
                            <Shield size={11} style={{ flexShrink: 0 }} />
                            <span className="standings-deck-name-text">
                              {playerDecks[s.playerId] || 'Yugioh Deck'}
                            </span>
                            <Edit2 size={10} style={{ opacity: 0.7, marginLeft: '3px', flexShrink: 0 }} />
                          </span>
                        </div>
                      </div>
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
            const liveTiebreakNotes = getTiebreakExplanations(standings, activeTournament);
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
          const p1Deck = playerDecks[match.player1Id] || 'Yugioh Deck';
          const p2Deck = match.player2Id ? playerDecks[match.player2Id] || 'Yugioh Deck' : '';

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
                    <span>+3 Pontos • Saldo 0 (BY)</span>
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
                    style={{ backgroundColor: p2?.avatarColor || '#0D6E62' }}
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

              {/* Botões rápidos de inserção de resultado em 3 colunas (formato clássico) */}
              <div className="score-presets-section">
                <span className="presets-label">Inserir Placar:</span>
                <div className="presets-aligned-container">
                  {/* Lado Esquerdo: Favorece Jogador 1 */}
                  <div className="preset-side preset-side-left">
                    <span className="preset-side-title" title={p1?.name}>
                      {p1?.name || 'Jogador 1'}
                    </span>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-win ${p1IsWinner && !match.isWO && match.gameWins1 === 3 && match.gameWins2 === 0 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 3, 0, false, false, match.player1Id)
                      }
                      title={`Vitória 3-0 para ${p1?.name}`}
                    >
                      3 - 0
                    </button>
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
                      className={`btn-preset btn-preset-win ${p1IsWinner && !match.isWO && match.gameWins1 === 1 && match.gameWins2 === 0 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 1, 0, false, false, match.player1Id)
                      }
                      title={`Vitória 1-0 para ${p1?.name}`}
                    >
                      1 - 0
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
                      className={`btn-preset btn-preset-draw ${isDraw && match.gameWins1 === 1 && match.gameWins2 === 1 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 1, 1, true, false, null)
                      }
                      title="Empate 1-1"
                    >
                      1 - 1
                    </button>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-draw ${isDraw && match.gameWins1 === 0 && match.gameWins2 === 0 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 0, 0, true, false, null)
                      }
                      title="Empate 0-0 (Tempo esgotado)"
                    >
                      0 - 0
                    </button>
                  </div>

                  {/* Lado Direito: Favorece Jogador 2 */}
                  <div className="preset-side preset-side-right">
                    <span className="preset-side-title" title={p2?.name}>
                      {p2?.name || 'Jogador 2'}
                    </span>
                    <button
                      type="button"
                      className={`btn-preset btn-preset-win ${p2IsWinner && !match.isWO && match.gameWins1 === 0 && match.gameWins2 === 3 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 0, 3, false, false, match.player2Id)
                      }
                      title={`Vitória 0-3 para ${p2?.name}`}
                    >
                      0 - 3
                    </button>
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
                      className={`btn-preset btn-preset-win ${p2IsWinner && !match.isWO && match.gameWins1 === 0 && match.gameWins2 === 1 ? 'preset-active' : ''}`}
                      onClick={() =>
                        handleSetMatchScore(currentRoundIndex, match.id, 0, 1, false, false, match.player2Id)
                      }
                      title={`Vitória 0-1 para ${p2?.name}`}
                    >
                      0 - 1
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

      {/* Modal de Gerenciamento de Participantes (Drops e Entrada Tardia) */}
      {showParticipantsModal && (
        <div className="modal-backdrop" onClick={() => setShowParticipantsModal(false)}>
          <div
            className="modal-card modal-content-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '100%' }}
          >
            <div className="modal-header-row" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: '#0D6E62' }} />
                <h3 className="modal-title" style={{ margin: 0 }}>Participantes do Torneio</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowParticipantsModal(false)}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Abas do Modal */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '10px 16px 0',
                background: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <button
                type="button"
                onClick={() => setParticipantsModalTab('drops')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  background: participantsModalTab === 'drops' ? '#FEF2F2' : 'transparent',
                  color: participantsModalTab === 'drops' ? '#DC2626' : '#64748B',
                  border: 'none',
                  borderBottom: participantsModalTab === 'drops' ? '2px solid #EF4444' : '2px solid transparent',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <UserMinus size={15} />
                <span>Drop</span>
                {(activeTournament.droppedPlayerIds?.length || 0) > 0 && (
                  <span
                    style={{
                      background: '#EF4444',
                      color: '#fff',
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {activeTournament.droppedPlayerIds?.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setParticipantsModalTab('late-entry')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  background: participantsModalTab === 'late-entry' ? '#ECFDF5' : 'transparent',
                  color: participantsModalTab === 'late-entry' ? '#0D6E62' : '#64748B',
                  border: 'none',
                  borderBottom: participantsModalTab === 'late-entry' ? '2px solid #059669' : '2px solid transparent',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <UserPlus size={15} />
                <span>Adicionar Jogador</span>
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {participantsModalTab === 'drops' ? (
                <>
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: '#92400E',
                      textAlign: 'justify',
                    }}
                  >
                    <strong>ℹ️ Como funciona o Drop:</strong>
                    <p style={{ margin: '4px 0 0', color: '#78350F', textAlign: 'justify' }}>
                      O duelista que dropar <strong>mantém todos os pontos conquistados</strong> até agora e continuará na classificação final com sua pontuação. Ele apenas não será pareado nas próximas rodadas.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
                    {activeTournament.playerIds.map((pid) => {
                      const p = playerMap.get(pid);
                      const isDropped = (activeTournament.droppedPlayerIds || []).includes(pid);
                      const playerStanding = standings.find((s) => s.playerId === pid);
                      const pts = playerStanding ? playerStanding.matchPoints : 0;
                      const currentDeck = playerDecks[pid] || 'Yugioh Deck';

                      return (
                        <div
                          key={pid}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: isDropped ? '#FEF2F2' : '#F8FAFC',
                            border: isDropped ? '1px solid #FECACA' : '1px solid #E2E8F0',
                            borderRadius: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div
                              className="player-avatar-sm"
                              style={{
                                backgroundColor: p?.avatarColor || '#0D6E62',
                                opacity: isDropped ? 0.6 : 1,
                              }}
                            >
                              {p?.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 700, fontSize: '13.5px', color: isDropped ? '#DC2626' : '#0F172A' }}>
                                  {p?.name}
                                </span>
                                {isDropped && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      background: '#FEE2E2',
                                      color: '#DC2626',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 800,
                                    }}
                                  >
                                    DROPADO
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                {currentDeck} • {pts} pts
                              </span>
                            </div>
                          </div>

                          {isDropped ? (
                            <button
                              type="button"
                              className="btn-secondary-action"
                              onClick={() => handleUndropPlayer(pid)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: '#ECFDF5',
                                border: '1px solid #6EE7B7',
                                color: '#059669',
                                borderRadius: '8px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Reintegrar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-danger-ghost"
                              onClick={() => handleDropPlayer(pid)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                borderRadius: '8px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Dropar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Aba de Entrada Tardia */
                <div>
                  <div
                    style={{
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '14px',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: '#065F46',
                      textAlign: 'justify',
                    }}
                  >
                    <strong>ℹ️ Como funciona a Entrada Tardia (Late Entry):</strong>
                    <p style={{ margin: '4px 0 0', color: '#047857', textAlign: 'justify' }}>
                      Adicione um duelista no meio do torneio. Ele entrará com <strong>0 pontos</strong> pelas rodadas anteriores e começará a ser pareado normalmente a partir da próxima rodada.
                    </p>
                  </div>

                  {(() => {
                    const availableLatePlayers = players.filter(
                      (p) => !activeTournament.playerIds.includes(p.id)
                    );

                    if (availableLatePlayers.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748B', fontSize: '13px' }}>
                          <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                          <p>Todos os duelistas cadastrados já estão inscritos neste torneio.</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Selecione o Duelista para Incluir:
                          </label>
                          <select
                            value={selectedLatePlayerId}
                            onChange={(e) => {
                              const chosenId = e.target.value;
                              setSelectedLatePlayerId(chosenId);
                              const p = players.find((x) => x.id === chosenId);
                              const lastDeck = p?.decksHistory && p.decksHistory.length > 0
                                ? p.decksHistory[p.decksHistory.length - 1].deckName
                                : '';
                              setLatePlayerDeck(lastDeck);
                            }}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              padding: '10px 12px',
                              background: '#F8FAFC',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '10px',
                              color: '#0F172A',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                          >
                            <option value="">-- Escolha um jogador cadastrado --</option>
                            {availableLatePlayers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {!p.active ? '(Inativo)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedLatePlayerId && (
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                              Nome do Deck para este Torneio:
                            </label>
                            <input
                              type="text"
                              value={latePlayerDeck}
                              onChange={(e) => setLatePlayerDeck(e.target.value)}
                              placeholder="Ex: Diva Zombie, Blackwing, Machina Gadget..."
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 12px',
                                background: '#F8FAFC',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '10px',
                                color: '#0F172A',
                                fontSize: '13px',
                                fontWeight: 600,
                              }}
                            />
                          </div>
                        )}

                        <button
                          type="button"
                          className="btn-modal-submit-tournament"
                          onClick={handleAddLatePlayer}
                          disabled={!selectedLatePlayerId}
                          style={{
                            width: '100%',
                            marginTop: '4px',
                            padding: '11px 16px',
                            opacity: selectedLatePlayerId ? 1 : 0.5,
                          }}
                        >
                          <UserPlus size={16} />
                          <span>Confirmar Entrada no Torneio</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowParticipantsModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição Manual de Rodada / Pareamentos */}
      {showEditRoundModal && activeTournament && (
        <div className="modal-backdrop" onClick={() => setShowEditRoundModal(false)}>
          <div
            className="modal-card modal-content-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              width: '94%',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-modal, 0 20px 48px -8px rgba(15, 23, 42, 0.25))',
            }}
          >
            <div
              className="modal-header-row"
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
                <Sliders size={18} style={{ color: 'var(--primary, #0A4F46)', flexShrink: 0 }} />
                <h3
                  className="modal-title"
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Editar Pareamentos - Rodada {activeTournament.currentRound}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowEditRoundModal(false)}
                title="Fechar"
                style={{ flexShrink: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: '16px 20px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: '#166534',
                  lineHeight: '1.5',
                  textAlign: 'justify',
                }}
              >
                <strong>Personalização manual da rodada:</strong> você pode ajustar os duelistas de cada mesa, alterar adversários, inverter posições (Jogador 1 / Jogador 2) ou definir vitória livre (BY). Ao salvar, mesas com confrontos alterados terão seus placares reiniciados para 0 - 0.
              </div>

              {/* Status de jogadores: Alerta de duplicatas ou pendentes */}
              {(() => {
                const activePlayerIds = activeTournament.playerIds.filter(
                  (pid) => !(activeTournament.droppedPlayerIds || []).includes(pid)
                );
                const counts: Record<string, number> = {};
                manualMatches.forEach((m) => {
                  if (m.player1Id) counts[m.player1Id] = (counts[m.player1Id] || 0) + 1;
                  if (m.player2Id) counts[m.player2Id] = (counts[m.player2Id] || 0) + 1;
                });
                const duplicates = Object.keys(counts).filter((pid) => counts[pid] > 1);
                const unassigned = activePlayerIds.filter((pid) => !counts[pid]);

                return (
                  <>
                    {duplicates.length > 0 && (
                      <div
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: '#B91C1C',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Atenção:</strong> Jogador(es) repetido(s) em mais de uma mesa:{' '}
                          {duplicates.map((id) => players.find((p) => p.id === id)?.name || id).join(', ')}
                        </span>
                      </div>
                    )}
                    {unassigned.length > 0 && (
                      <div
                        style={{
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          color: '#B45309',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Info size={16} style={{ flexShrink: 0 }} />
                        <span>
                          Duelista(s) ativo(s) sem mesa nesta rodada:{' '}
                          {unassigned.map((id) => players.find((p) => p.id === id)?.name || id).join(', ')}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Lista de mesas / confrontos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {manualMatches.map((match, mIdx) => {
                  const activeTournamentPlayers = players.filter(
                    (p) =>
                      activeTournament.playerIds.includes(p.id) &&
                      !(activeTournament.droppedPlayerIds || []).includes(p.id)
                  );

                  return (
                    <div
                      key={match.id || mIdx}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #E2E8F0',
                          paddingBottom: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#1E293B' }}>
                          Mesa {mIdx + 1} {match.isBy || !match.player2Id ? '• (BY)' : ''}
                        </span>
                        {manualMatches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveManualTable(mIdx)}
                            className="btn-icon"
                            style={{ color: '#EF4444', padding: '4px' }}
                            title="Remover esta mesa"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto 1fr',
                          gap: '8px',
                          alignItems: 'center',
                        }}
                      >
                        {/* Jogador 1 */}
                        <div>
                          <label
                            style={{
                              fontSize: '11px',
                              color: '#64748B',
                              display: 'block',
                              marginBottom: '4px',
                              fontWeight: 700,
                            }}
                          >
                            Jogador 1:
                          </label>
                          <select
                            value={match.player1Id || ''}
                            onChange={(e) => handleUpdateManualMatchPlayer(mIdx, 'player1', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: '#FFFFFF',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '8px',
                              color: '#0F172A',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                          >
                            <option value="">-- Selecione o Jogador 1 --</option>
                            {activeTournamentPlayers.map((p) => {
                              const isSelectedInOther = manualMatches.some(
                                (otherM, otherIdx) =>
                                  otherIdx !== mIdx &&
                                  (otherM.player1Id === p.id || otherM.player2Id === p.id)
                              );
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} {isSelectedInOther ? '⚠️' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Botão de Swap */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingTop: '16px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleSwapP1P2(mIdx)}
                            disabled={match.isBy || !match.player2Id}
                            title="Inverter Jogador 1 e 2"
                            style={{
                              background: '#FFFFFF',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '8px',
                              padding: '7px 9px',
                              color: match.isBy || !match.player2Id ? '#94A3B8' : '#0F172A',
                              cursor: match.isBy || !match.player2Id ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowLeftRight size={14} />
                          </button>
                        </div>

                        {/* Jogador 2 */}
                        <div>
                          <label
                            style={{
                              fontSize: '11px',
                              color: '#64748B',
                              display: 'block',
                              marginBottom: '4px',
                              fontWeight: 700,
                            }}
                          >
                            Jogador 2:
                          </label>
                          <select
                            value={match.isBy || !match.player2Id ? 'BYE' : match.player2Id}
                            onChange={(e) => handleUpdateManualMatchPlayer(mIdx, 'player2', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: '#FFFFFF',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: '8px',
                              color: match.isBy || !match.player2Id ? '#2563EB' : '#0F172A',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                          >
                            <option value="BYE">⭐ BY (Vitória Livre - Sem Oponente)</option>
                            {activeTournamentPlayers.map((p) => {
                              const isSelectedInOther = manualMatches.some(
                                (otherM, otherIdx) =>
                                  otherIdx !== mIdx &&
                                  (otherM.player1Id === p.id || otherM.player2Id === p.id)
                              );
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} {isSelectedInOther ? '⚠️' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botão Adicionar Mesa */}
              <button
                type="button"
                onClick={handleAddManualTable}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  background: '#F8FAFC',
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '10px',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <Plus size={16} />
                <span>Adicionar Nova Mesa</span>
              </button>
            </div>

            {/* Rodapé do Modal */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                background: '#F8FAFC',
              }}
            >
              <div>
                {activeTournament.currentRound > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditRoundModal(false);
                      handleRevertRound();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      color: '#DC2626',
                      cursor: 'pointer',
                    }}
                    title="Voltar para a rodada anterior para corrigir placares passados"
                  >
                    <RotateCcw size={14} />
                    <span>Voltar para Rodada {activeTournament.currentRound - 1}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowEditRoundModal(false)}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={handleSaveManualMatches}
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Salvar Pareamentos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal explicativo com regras oficiais de desempate Suíço (PMW, OMW, PGW, OGW) */}
      {selectedStatModal && (
        <StatInfoModal
          statType={selectedStatModal}
          onClose={() => setSelectedStatModal(null)}
        />
      )}

      {/* Modal de Decklist Edison (Visualização e Edição de Decks) */}
      {activeDecklistModal && (
        <DecklistModal
          decklist={activeDecklistModal.decklist}
          playerName={activeDecklistModal.playerName}
          defaultDeckName={activeDecklistModal.deckName}
          onSave={(savedDecklist) => {
            if (activeDecklistModal.isPreTournament) {
              setTournamentPlayerDecklists((prev) => ({
                ...prev,
                [activeDecklistModal.playerId]: savedDecklist,
              }));
              setTournamentPlayerDecks((prev) => ({
                ...prev,
                [activeDecklistModal.playerId]: savedDecklist.deckName,
              }));
            } else if (activeTournament) {
              onUpdateActiveTournament({
                ...activeTournament,
                playerDecks: {
                  ...(activeTournament.playerDecks || {}),
                  [activeDecklistModal.playerId]: savedDecklist.deckName,
                },
                playerDecklists: {
                  ...(activeTournament.playerDecklists || {}),
                  [activeDecklistModal.playerId]: savedDecklist,
                },
              });
            }
            setActiveDecklistModal(null);
          }}
          onClose={() => setActiveDecklistModal(null)}
        />
      )}
    </div>
  );
};
