import React, { useState } from 'react';
import {
  History,
  Trophy,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Swords,
  Sparkles,
  FileDown,
  ImageDown,
  Shield,
  Info,
  Trash2,
  AlertTriangle,
  Edit2,
  X,
  Medal,
  Award,
  MoreHorizontal,
} from 'lucide-react';
import type { Player, Tournament, Decklist } from '../types';
import { exportTournamentResultsPDF } from '../utils/pdfGenerator';
import { exportTournamentResultsPNG } from '../utils/imageExporter';
import {
  calculateTournamentStandings,
  getTiebreakExplanations,
  getTournamentTopCut,
} from '../utils/swissEngine';
import { StatInfoModal, type TiebreakStatType } from './StatInfoModal';
import { TournamentEditModal } from './TournamentEditModal';
import { DecklistModal } from './DecklistModal';

interface HistoryViewProps {
  tournaments: Tournament[];
  players: Player[];
  onDeleteTournament: (tournamentId: string) => void;
  onUpdateTournament: (tournament: Tournament) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  tournaments,
  players,
  onDeleteTournament,
  onUpdateTournament,
}) => {
  const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);
  const [activeMenuTournamentId, setActiveMenuTournamentId] = useState<string | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [selectedStatModal, setSelectedStatModal] = useState<TiebreakStatType | null>(null);
  const [historyDecklistModal, setHistoryDecklistModal] = useState<{
    tournament: Tournament;
    playerId: string;
    playerName: string;
    deckName: string;
    decklist?: Decklist | null;
  } | null>(null);

  // Estado para edição rápida e direta de nome de deck de um jogador no histórico
  const [quickDeckModal, setQuickDeckModal] = useState<{
    tournament: Tournament;
    playerId: string;
    currentDeck: string;
  } | null>(null);
  const [quickDeckValue, setQuickDeckValue] = useState<string>('');

  const playerMap = new Map(players.map((p) => [p.id, p]));

  const completedTournaments = tournaments
    .filter((t) => t.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toggleExpand = (id: string) => {
    setExpandedTournamentId((prev) => (prev === id ? null : id));
  };

  const formatTournamentDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
  };

  // Abre modal de edição rápida de deck
  const openQuickDeckEdit = (tournament: Tournament, playerId: string, currentDeck: string) => {
    setQuickDeckValue(currentDeck || '');
    setQuickDeckModal({
      tournament,
      playerId,
      currentDeck,
    });
  };

  // Salva edição rápida de deck
  const handleSaveQuickDeck = () => {
    if (!quickDeckModal) return;
    const sanitizedDeck = quickDeckValue.trim() || 'Yugioh Deck';
    const updatedTournament: Tournament = {
      ...quickDeckModal.tournament,
      playerDecks: {
        ...(quickDeckModal.tournament.playerDecks || {}),
        [quickDeckModal.playerId]: sanitizedDeck,
      },
    };
    onUpdateTournament(updatedTournament);
    setQuickDeckModal(null);
  };

  return (
    <div className="view-container">
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <History size={14} className="text-gold" />
            <span>HISTÓRICO DE TORNEIOS</span>
          </div>
          <h2 className="hero-title">Torneios Realizados</h2>
          <p className="hero-subtitle hide-on-xs">
            Consulte resultados, estatísticas oficiais, edite placares ou altere decks.
          </p>
        </div>
      </div>

      <div className="history-list">
        {completedTournaments.length === 0 ? (
          <div className="empty-state-card">
            <Trophy size={36} className="text-muted" />
            <h3>Nenhum torneio finalizado ainda</h3>
            <p className="text-muted">
              Quando você concluir o primeiro torneio de 4 ou 5 rodadas, o histórico completo aparecerá aqui.
            </p>
          </div>
        ) : (
          completedTournaments.map((tournament, idx) => {
            const isExpanded = expandedTournamentId === tournament.id;
            const standings = calculateTournamentStandings(tournament, players);
            const tourTopCut = getTournamentTopCut(tournament);
            const topStandings = standings.slice(0, Math.min(tourTopCut, standings.length));
            const champion = standings[0] ? playerMap.get(standings[0].playerId) : (tournament.championId ? playerMap.get(tournament.championId) : null);

            const isMenuActive = activeMenuTournamentId === tournament.id;
            const isNearBottom = completedTournaments.length >= 3 && idx === completedTournaments.length - 1;

            return (
              <div
                key={tournament.id}
                className={`history-card ${isMenuActive ? 'menu-active' : ''}`}
                style={{
                  position: 'relative',
                  zIndex: isMenuActive ? 100 : 1,
                }}
              >
                <div className="history-card-header" onClick={() => toggleExpand(tournament.id)}>
                  <div className="history-header-top-row">
                    <div className="history-main-info">
                      <div className="history-icon-box">
                        <Trophy size={16} className="text-gold" />
                      </div>
                      <div className="history-text-details">
                        <div className="history-title-row">
                          <h3 className="history-title">{tournament.name}</h3>
                          {tournament.format && (
                            <span className="badge-tournament-format">
                              {tournament.format}
                            </span>
                          )}
                          {tournament.countsForLeague !== false ? (
                            <span className="badge-league-official">Oficial da Liga</span>
                          ) : (
                            <span className="badge-league-freeplay">Freeplay</span>
                          )}
                        </div>
                        <div className="history-meta-row">
                          <span className="history-meta-item">
                            <Calendar size={11} />
                            <span>{formatTournamentDate(tournament.date)}</span>
                          </span>
                          <span className="history-meta-item">
                            <Users size={11} />
                            <span>{tournament.playerIds.length} duelistas</span>
                          </span>
                          <span className="history-meta-item">
                            <Swords size={11} />
                            <span>{tournament.totalRounds} rodadas</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="history-header-actions" onClick={(e) => e.stopPropagation()}>
                      {/* Submenu mini pop-up de ações do torneio */}
                      <div className="popover-anchor">
                        <button
                          type="button"
                          className={`btn-more-options ${activeMenuTournamentId === tournament.id ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTournamentId(activeMenuTournamentId === tournament.id ? null : tournament.id);
                          }}
                          title="Opções do Torneio"
                          aria-label="Opções do Torneio"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {activeMenuTournamentId === tournament.id && (
                          <>
                            <div
                              className="popover-backdrop"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuTournamentId(null);
                              }}
                            />
                            <div className={`popover-dropdown ${isNearBottom ? 'popover-up' : ''}`}>
                              <button
                                type="button"
                                className="popover-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuTournamentId(null);
                                  setEditingTournament(tournament);
                                }}
                              >
                                <Edit2 size={14} />
                                <span>Editar Torneio</span>
                              </button>
                              <button
                                type="button"
                                className="popover-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuTournamentId(null);
                                  exportTournamentResultsPDF(tournament, players);
                                }}
                              >
                                <FileDown size={14} />
                                <span>Exportar PDF</span>
                              </button>
                              <button
                                type="button"
                                className="popover-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuTournamentId(null);
                                  exportTournamentResultsPNG(tournament, players);
                                }}
                              >
                                <ImageDown size={14} />
                                <span>Exportar PNG</span>
                              </button>
                              <button
                                type="button"
                                className="popover-item danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuTournamentId(null);
                                  setTournamentToDelete(tournament);
                                }}
                              >
                                <Trash2 size={14} />
                                <span>Excluir Registro</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn-expand-history"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(tournament.id);
                        }}
                        aria-label="Expandir detalhes"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {!isExpanded && champion && (
                    <div className="history-actions-strip">
                      <div className="champion-preview-badge">
                        <Trophy size={11} className="text-gold" />
                        <span>1º Lugar: <strong>{champion.name}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="history-expanded-body">
                    {tournament.countsForLeague === false && (
                      <div className="history-freeplay-notice">
                        <Sparkles size={14} className="text-cyan" />
                        <span>Torneio Freeplay: Resultados salvos no histórico (sem pontuação no Ranking da Liga).</span>
                      </div>
                    )}

                    {/* Destaque de Pódio com edição rápida de deck */}
                    <div className="history-podium-row">
                      {topStandings.map((s, idx) => {
                        const rank = idx + 1;
                        const isFirst = rank === 1;
                        const isSecond = rank === 2;
                        const pillColor = isFirst ? 'gold' : isSecond ? 'silver' : 'bronze';
                        const playerObj = playerMap.get(s.playerId);
                        const pName = playerObj?.name || s.playerName;
                        const pDeck = tournament.playerDecks?.[s.playerId] || 'Yugioh Deck';

                        return (
                          <div key={s.playerId} className={`podium-mini-pill ${pillColor}`}>
                            {isFirst && <Trophy size={16} className="text-gold" />}
                            {isSecond && <Medal size={16} className="text-silver" />}
                            {rank >= 3 && <Award size={16} className="text-bronze" />}
                            <span>{rank}º Lugar: {pName}</span>
                            <span style={{ opacity: 0.85 }}>• {pDeck}</span>
                            <button
                              type="button"
                              className="btn-deck-edit-inline"
                              onClick={() =>
                                openQuickDeckEdit(
                                  tournament,
                                  s.playerId,
                                  tournament.playerDecks?.[s.playerId] || ''
                                )
                              }
                              title={`Editar deck do ${rank}º colocado`}
                            >
                              <Edit2 size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Classificação Final do Torneio */}
                    {(() => {
                      const standings = calculateTournamentStandings(tournament, players);
                      const playerDecks = tournament.playerDecks || {};
                      return (
                        <div className="history-standings-section" style={{ marginTop: '14px', marginBottom: '18px' }}>
                          <div
                            className="standings-table-header-row"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                              marginBottom: '10px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h4 className="compact-title" style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>
                                Classificação Final
                              </h4>
                              <span className="badge-swiss-stats">Critérios Oficiais Suíço</span>
                            </div>
                          </div>

                          {/* Card Informativo de Critérios de Desempate (Padrão TCG em Inglês com botão informativo) */}
                          <div className="tiebreaker-info-card" style={{ marginBottom: '12px' }}>
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

                          {/* MODO CARDS: Visualização moderna, agradável e mobile-first sem rolagem horizontal */}
                          <div className="standings-cards-list">
                              {standings.map((s) => {
                                const isFirst = s.rank === 1;
                                const isSecond = s.rank === 2;
                                const isThird = s.rank === 3;
                                const isTopCut = s.rank <= tourTopCut;
                                const currentDeck = playerDecks[s.playerId] || 'Yugioh Deck';

                                return (
                                  <div
                                    key={s.playerId}
                                    className={`standing-card-item ${
                                      isFirst ? 'champion-standing' : isTopCut ? 'topcut-standing' : ''
                                    }`}
                                  >
                                    {/* Linha Superior: Posição, Nome e Pontuação */}
                                    <div className="sc-header-row">
                                      <div className="sc-player-col">
                                        <div
                                          className={`sc-rank-badge ${
                                            isFirst
                                              ? 'rank-gold'
                                              : isSecond
                                              ? 'rank-silver'
                                              : isThird
                                              ? 'rank-bronze'
                                              : isTopCut
                                              ? 'rank-topcut'
                                              : 'rank-standard'
                                          }`}
                                        >
                                          {isFirst && <Trophy size={13} />}
                                          {isSecond && <Medal size={13} />}
                                          {isThird && <Award size={13} />}
                                          <span>{s.rank}º</span>
                                        </div>

                                        <div className="sc-name-group">
                                          <span className="sc-player-name">{s.playerName}</span>
                                          {s.isDropped && <span className="sc-drop-badge">Dropou</span>}
                                        </div>
                                      </div>

                                      <div className="sc-points-badge" title={`${s.matchPoints} pontos oficiais conquistados`}>
                                        <span className="sc-pts-val">{s.matchPoints}</span>
                                        <span className="sc-pts-lbl">pts</span>
                                      </div>
                                    </div>

                                    {/* Linha do Meio: Deck Usado com Edição Rápida de 1 toque */}
                                    <div className="sc-deck-row">
                                      <button
                                        type="button"
                                        className="sc-deck-chip"
                                        onClick={() =>
                                          openQuickDeckEdit(
                                            tournament,
                                            s.playerId,
                                            playerDecks[s.playerId] || ''
                                          )
                                        }
                                        title={`Toque para alterar o deck de ${s.playerName}`}
                                      >
                                        <Shield size={12} className="sc-deck-icon" />
                                        <span className="sc-deck-name">{currentDeck}</span>
                                        <Edit2 size={11} className="sc-deck-edit-icon" />
                                      </button>

                                      {s.hadBy && (
                                        <span className="sc-by-pill" title="Teve vitória automática por folga (BY)">
                                          Teve BY
                                        </span>
                                      )}
                                    </div>

                                    {/* Grid de Estatísticas: 100% visível na tela sem precisar de scroll lateral */}
                                    <div className="sc-metrics-grid">
                                      <div className="sc-metric-item" title="Partidas: Vitórias - Empates - Derrotas">
                                        <span className="sc-metric-lbl">Placar (V-E-D)</span>
                                        <span className="sc-metric-val">
                                          <span className="sc-win">{s.matchWins}V</span> -{' '}
                                          <span className="sc-draw">{s.matchDraws}E</span> -{' '}
                                          <span className="sc-loss">{s.matchLosses}D</span>
                                        </span>
                                      </div>

                                      <div className="sc-metric-item" title="Saldo de Games (Games Vencidos - Games Perdidos)">
                                        <span className="sc-metric-lbl">Games (Saldo)</span>
                                        <span className="sc-metric-val">
                                          {s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}{' '}
                                          <span className="sc-sub-metric">({s.gamesWon}-{s.gamesLost})</span>
                                        </span>
                                      </div>

                                      <div
                                        className="sc-metric-item highlight"
                                        title="OMW%: Opponents' Match Win % (1º Critério Oficial Konami)"
                                      >
                                        <span className="sc-metric-lbl">OMW% (Mínimos)</span>
                                        <span className="sc-metric-val text-emerald">{s.omwPercentage}%</span>
                                      </div>

                                      <div
                                        className="sc-metric-item"
                                        title="PGW%: Player Game Win % (2º Critério Oficial Konami)"
                                      >
                                        <span className="sc-metric-lbl">PGW%</span>
                                        <span className="sc-metric-val">{s.pgwPercentage}%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                          {/* Observações de Desempate */}
                          {(() => {
                            const tiebreakNotes = getTiebreakExplanations(standings, tournament);
                            if (tiebreakNotes.length === 0) return null;
                            return (
                              <div className="tiebreak-explanations-card" style={{ marginTop: '10px' }}>
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
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {/* Rodadas do Torneio */}
                    <div className="history-rounds-container">
                      <h4 className="rounds-heading">Confrontos Rodada a Rodada:</h4>
                      {tournament.rounds.map((round) => (
                        <div key={round.roundNumber} className="history-round-block">
                          <div className="round-block-header">
                            <span>Rodada {round.roundNumber}</span>
                          </div>
                          <div className="history-matches-table">
                            {round.matches.map((m) => {
                              const p1 = playerMap.get(m.player1Id);
                              const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
                              const p1Winner = m.winnerId === m.player1Id;
                              const p2Winner = m.winnerId === m.player2Id;
                              return (
                                <div key={m.id} className="history-match-row">
                                  <span className="mesa-tag">Mesa {m.tableNumber}</span>
                                  {m.isBy ? (
                                    <div className="history-by-row">
                                      <div className="history-duelist is-winner">
                                        <span className="win-pill-icon">🏆</span>
                                        <strong>{p1?.name}</strong>
                                      </div>
                                      <span className="badge-by-tag">BY (+3 pts)</span>
                                    </div>
                                  ) : (
                                    <div className="history-versus-row">
                                      <div className={`history-duelist ${p1Winner ? 'is-winner' : (p2Winner ? 'is-loser' : '')}`}>
                                        {p1Winner && <span className="win-pill-icon">🏆</span>}
                                        <span className="duelist-label">{p1?.name}</span>
                                      </div>
                                      <span className="score-history-badge">
                                        {m.gameWins1} x {m.gameWins2}
                                        {m.isDraw && ' (Empate)'}
                                        {m.isWO && ' (WO)'}
                                      </span>
                                      <div className={`history-duelist ${p2Winner ? 'is-winner' : (p1Winner ? 'is-loser' : '')}`}>
                                        {p2Winner && <span className="win-pill-icon">🏆</span>}
                                        <span className="duelist-label">{p2?.name}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Edição Rápida e Direta de Nome de Deck */}
      {quickDeckModal && (
        <div className="modal-backdrop" onClick={() => setQuickDeckModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '18px', boxShadow: '0 20px 48px -8px rgba(15, 23, 42, 0.2)' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} style={{ color: 'var(--purple-600, #0D6E62)' }} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0F172A', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
                  Editar Deck do Duelista
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setQuickDeckModal(null)}
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--purple-50, #ECFDF5)',
                  border: '1px solid var(--border-purple, #A7F3D0)',
                  borderRadius: '10px',
                  marginBottom: '14px',
                  fontSize: '13px',
                  color: 'var(--purple-700, #0A4F46)',
                  lineHeight: '1.5',
                }}
              >
                Duelista: <strong>{playerMap.get(quickDeckModal.playerId)?.name}</strong>
                <br />
                Torneio: <strong>{quickDeckModal.tournament.name}</strong>
              </div>

              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Nome do Deck neste Torneio:
              </label>
              <input
                type="text"
                value={quickDeckValue}
                onChange={(e) => setQuickDeckValue(e.target.value)}
                placeholder="Ex: Diva Zombie, Blackwing, Machina Gadget..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#F8FAFC',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  color: '#0F172A',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveQuickDeck();
                }}
              />

            </div>

            <div className="modal-actions" style={{ padding: '12px 20px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F8FAFC', borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px' }}>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setQuickDeckModal(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveQuickDeck}
                style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px', border: 'none', background: 'var(--purple-gradient)', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(6, 60, 53, 0.25)' }}
              >
                Salvar Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Completo de Edição de Torneio com Prévia em Tempo Real */}
      {editingTournament && (
        <TournamentEditModal
          tournament={editingTournament}
          players={players}
          onSave={(updated) => {
            onUpdateTournament(updated);
            setEditingTournament(null);
          }}
          onClose={() => setEditingTournament(null)}
        />
      )}

      {/* Modal Explicativo de Estatísticas de Desempate (PMW, OMW, PGW, OGW) */}
      {selectedStatModal && (
        <StatInfoModal
          statType={selectedStatModal}
          onClose={() => setSelectedStatModal(null)}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Torneio */}
      {tournamentToDelete && (
        <div className="modal-backdrop" onClick={() => setTournamentToDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', background: '#FFFFFF', border: '1.5px solid #CBD5E1', borderRadius: '18px', boxShadow: '0 20px 48px -8px rgba(15, 23, 42, 0.2)' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
                <AlertTriangle size={20} />
                <h3 style={{ margin: 0, fontSize: '17px', color: '#991B1B', fontWeight: 800, fontFamily: 'var(--font-title)' }}>Remover Torneio do Histórico?</h3>
              </div>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '12px' }}>
                Você está prestes a remover o torneio <strong>{tournamentToDelete.name}</strong>.
              </p>
              {tournamentToDelete.countsForLeague !== false ? (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px', color: '#991B1B' }}>
                  ⚠️ <strong>Atenção:</strong> Por se tratar de um torneio oficial da Liga, <strong>todos os pontos, vitórias, empates e títulos</strong> concedidos aos duelistas neste torneio serão <strong>revertidos automaticamente</strong> da tabela de classificação.
                </div>
              ) : (
                <div style={{ background: '#ECFEFF', border: '1px solid #A5F3FC', borderRadius: '10px', padding: '12px', color: '#0E7490' }}>
                  ℹ️ Este foi um torneio Freeplay. O registro será removido do histórico sem afetar a pontuação da Liga.
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ padding: '12px 20px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F8FAFC', borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px' }}>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setTournamentToDelete(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger-confirm"
                onClick={() => {
                  onDeleteTournament(tournamentToDelete.id);
                  setTournamentToDelete(null);
                }}
                style={{
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                }}
              >
                <Trash2 size={16} />
                <span>Sim, Excluir Torneio</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Decklist Edison do Jogador no Histórico */}
      {historyDecklistModal && (
        <DecklistModal
          decklist={historyDecklistModal.decklist}
          playerName={historyDecklistModal.playerName}
          defaultDeckName={historyDecklistModal.deckName}
          onClose={() => setHistoryDecklistModal(null)}
          onSave={(newDecklist) => {
            const currentT = historyDecklistModal.tournament;
            const updatedDecklists = {
              ...(currentT.playerDecklists || {}),
              [historyDecklistModal.playerId]: newDecklist,
            };
            const updatedT: Tournament = {
              ...currentT,
              playerDecks: {
                ...(currentT.playerDecks || {}),
                [historyDecklistModal.playerId]: newDecklist.deckName,
              },
              playerDecklists: updatedDecklists,
            };
            onUpdateTournament(updatedT);
            setHistoryDecklistModal(null);
          }}
        />
      )}
    </div>
  );
};
