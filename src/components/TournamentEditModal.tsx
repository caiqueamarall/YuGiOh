import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Swords,
  Shield,
  Save,
  X,
  AlertTriangle,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import type { Player, Tournament, Decklist } from '../types';
import { calculateTournamentStandings } from '../utils/swissEngine';
import { DecklistModal } from './DecklistModal';

interface TournamentEditModalProps {
  tournament: Tournament;
  players: Player[];
  onSave: (updatedTournament: Tournament) => void;
  onClose: () => void;
}

export const TournamentEditModal: React.FC<TournamentEditModalProps> = ({
  tournament,
  players,
  onSave,
  onClose,
}) => {
  // Cópia profunda para permitir edição segura e reversível
  const [editedTournament, setEditedTournament] = useState<Tournament>(() =>
    JSON.parse(JSON.stringify(tournament))
  );

  const [activeTab, setActiveTab] = useState<'matches' | 'decks' | 'info'>('matches');
  const [selectedRoundNum, setSelectedRoundNum] = useState<number>(1);
  const [showPreviewDrawer, setShowPreviewDrawer] = useState<boolean>(true);
  const [activeDecklistModal, setActiveDecklistModal] = useState<{
    playerId: string;
    playerName: string;
    deckName: string;
    decklist?: Decklist | null;
  } | null>(null);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // Classificação original (antes das edições)
  const originalStandings = useMemo(
    () => calculateTournamentStandings(tournament, players),
    [tournament, players]
  );
  const originalChamp = originalStandings[0] ? playerMap.get(originalStandings[0].playerId) : null;

  // Classificação recalculada em tempo real com as alterações
  const recalculatedStandings = useMemo(
    () => calculateTournamentStandings(editedTournament, players),
    [editedTournament, players]
  );
  const newChamp = recalculatedStandings[0] ? playerMap.get(recalculatedStandings[0].playerId) : null;

  // Mapeamento das classificações originais por playerId para comparação rápida
  const originalRankMap = useMemo(() => {
    const map = new Map<string, { rank: number; points: number }>();
    originalStandings.forEach((s) => map.set(s.playerId, { rank: s.rank, points: s.matchPoints }));
    return map;
  }, [originalStandings]);

  // Atualiza um confronto específico de uma rodada
  const handleUpdateMatchScore = (
    roundNumber: number,
    matchId: string,
    score1: number,
    score2: number,
    isDraw: boolean,
    isWO: boolean
  ) => {
    setEditedTournament((prev) => {
      const updatedRounds = prev.rounds.map((rnd) => {
        if (rnd.roundNumber !== roundNumber) return rnd;
        const updatedMatches = rnd.matches.map((m) => {
          if (m.id !== matchId) return m;

          let winnerId: string | null = null;
          if (!isDraw) {
            if (score1 > score2) winnerId = m.player1Id;
            else if (score2 > score1 && m.player2Id) winnerId = m.player2Id;
          }

          return {
            ...m,
            gameWins1: score1,
            gameWins2: score2,
            isDraw,
            isWO,
            winnerId,
          };
        });
        return { ...rnd, matches: updatedMatches };
      });
      return { ...prev, rounds: updatedRounds };
    });
  };

  // Atualiza o deck de um jogador específico
  const handleUpdatePlayerDeck = (playerId: string, newDeck: string) => {
    setEditedTournament((prev) => ({
      ...prev,
      playerDecks: {
        ...(prev.playerDecks || {}),
        [playerId]: newDeck,
      },
    }));
  };

  // Salva e confirma as alterações
  const handleConfirmSave = () => {
    const champId = recalculatedStandings[0]?.playerId;
    const runnerId = recalculatedStandings[1]?.playerId;

    const finalTournament: Tournament = {
      ...editedTournament,
      championId: champId,
      runnerUpId: runnerId,
    };

    onSave(finalTournament);
    onClose();
  };

  const currentRound = editedTournament.rounds.find((r) => r.roundNumber === selectedRoundNum);

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#161619',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
        }}
      >
        {/* Header do Modal */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, rgba(168, 85, 247, 0.08) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
              }}
            >
              <Swords size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#fff', fontWeight: 800 }}>
                Editar Torneio do Histórico
              </h3>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Ajuste placares, decks e configurações com recálculo automático da Liga
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="Fechar"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas Superiores com Rolagem Suave */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 16px 0',
            background: '#161619',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('matches')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              background: activeTab === 'matches' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeTab === 'matches' ? '#fbbf24' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'matches' ? '2px solid #f59e0b' : '2px solid transparent',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Swords size={15} />
            <span>Placares das Rodadas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('decks')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              background: activeTab === 'decks' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
              color: activeTab === 'decks' ? '#34d399' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'decks' ? '2px solid #34d399' : '2px solid transparent',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Shield size={15} />
            <span>Decks dos Duelistas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('info')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              background: activeTab === 'info' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: activeTab === 'info' ? '#c084fc' : '#94a3b8',
              border: 'none',
              borderBottom: activeTab === 'info' ? '2px solid #a855f7' : '2px solid transparent',
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Calendar size={15} />
            <span>Dados Gerais</span>
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {/* Aba de Placares */}
          {activeTab === 'matches' && (
            <div>
              {/* Seletor de Rodada */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginRight: '6px' }}>
                  Rodada:
                </span>
                {editedTournament.rounds.map((r) => (
                  <button
                    key={r.roundNumber}
                    type="button"
                    onClick={() => setSelectedRoundNum(r.roundNumber)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: selectedRoundNum === r.roundNumber ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                      color: selectedRoundNum === r.roundNumber ? '#000' : '#e2e8f0',
                      border: selectedRoundNum === r.roundNumber ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    Rodada {r.roundNumber}
                  </button>
                ))}
              </div>

              {/* Lista de Mesas da Rodada Selecionada */}
              {currentRound && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentRound.matches.map((m) => {
                    const p1 = playerMap.get(m.player1Id);
                    const p2 = m.player2Id ? playerMap.get(m.player2Id) : null;
                    const p1Deck = editedTournament.playerDecks?.[m.player1Id] || 'Edison';
                    const p2Deck = m.player2Id ? editedTournament.playerDecks?.[m.player2Id] || 'Edison' : '';

                    if (m.isBy) {
                      return (
                        <div
                          key={m.id}
                          style={{
                            padding: '12px 14px',
                            background: 'rgba(245, 158, 11, 0.05)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 800 }}>
                              MESA {m.tableNumber} • FOLGA AUTOMÁTICA BY
                            </span>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                              {p1?.name} <span style={{ fontSize: '11px', color: '#94a3b8' }}>({p1Deck})</span>
                            </div>
                          </div>
                          <span
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            +3 Pts • Saldo 0 (BY)
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: '14px 16px',
                          background: '#1c1c20',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          borderRadius: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                            flexWrap: 'wrap',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.05em' }}>
                            MESA {m.tableNumber}
                          </span>

                          {/* Atalhos de Placar Rápido */}
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {[
                              { label: '2 - 0', g1: 2, g2: 0, draw: false },
                              { label: '2 - 1', g1: 2, g2: 1, draw: false },
                              { label: '1 - 2', g1: 1, g2: 2, draw: false },
                              { label: '0 - 2', g1: 0, g2: 2, draw: false },
                              { label: '1 - 1 Empate', g1: 1, g2: 1, draw: true },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() =>
                                  handleUpdateMatchScore(
                                    selectedRoundNum,
                                    m.id,
                                    preset.g1,
                                    preset.g2,
                                    preset.draw,
                                    false
                                  )
                                }
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  background:
                                    m.gameWins1 === preset.g1 &&
                                    m.gameWins2 === preset.g2 &&
                                    m.isDraw === preset.draw
                                      ? '#f59e0b'
                                      : 'rgba(255, 255, 255, 0.07)',
                                  color:
                                    m.gameWins1 === preset.g1 &&
                                    m.gameWins2 === preset.g2 &&
                                    m.isDraw === preset.draw
                                      ? '#000'
                                      : '#cbd5e1',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Confronto e Inputs de Placares */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          {/* Jogador 1 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '13.5px',
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={p1?.name}
                            >
                              {p1?.name}
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={p1Deck}
                            >
                              {p1Deck}
                            </span>
                          </div>

                          {/* Inputs de placar centralizados */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <input
                              type="number"
                              min="0"
                              max="2"
                              value={m.gameWins1 ?? 0}
                              onChange={(e) =>
                                handleUpdateMatchScore(
                                  selectedRoundNum,
                                  m.id,
                                  Math.max(0, parseInt(e.target.value) || 0),
                                  m.gameWins2 ?? 0,
                                  m.isDraw ?? false,
                                  m.isWO ?? false
                                )
                              }
                              style={{
                                width: '44px',
                                height: '38px',
                                textAlign: 'center',
                                padding: '4px',
                                background: '#121214',
                                border: '1px solid #3f3f46',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '16px',
                              }}
                            />
                            <span style={{ color: '#64748b', fontWeight: 800, fontSize: '13px' }}>x</span>
                            <input
                              type="number"
                              min="0"
                              max="2"
                              value={m.gameWins2 ?? 0}
                              onChange={(e) =>
                                handleUpdateMatchScore(
                                  selectedRoundNum,
                                  m.id,
                                  m.gameWins1 ?? 0,
                                  Math.max(0, parseInt(e.target.value) || 0),
                                  m.isDraw ?? false,
                                  m.isWO ?? false
                                )
                              }
                              style={{
                                width: '44px',
                                height: '38px',
                                textAlign: 'center',
                                padding: '4px',
                                background: '#121214',
                                border: '1px solid #3f3f46',
                                borderRadius: '6px',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '16px',
                              }}
                            />
                          </div>

                          {/* Jogador 2 */}
                          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '13.5px',
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={p2?.name}
                            >
                              {p2?.name}
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={p2Deck}
                            >
                              {p2Deck}
                            </span>
                          </div>
                        </div>

                        {/* Checkboxes de Empate e WO alinhadas */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '24px',
                            marginTop: '12px',
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            fontSize: '11.5px',
                            color: '#cbd5e1',
                            flexWrap: 'wrap',
                          }}
                        >
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={m.isDraw ?? false}
                              onChange={(e) =>
                                handleUpdateMatchScore(
                                  selectedRoundNum,
                                  m.id,
                                  m.gameWins1 ?? 0,
                                  m.gameWins2 ?? 0,
                                  e.target.checked,
                                  m.isWO ?? false
                                )
                              }
                              style={{
                                width: '16px',
                                height: '16px',
                                minWidth: '16px',
                                minHeight: '16px',
                                accentColor: '#f59e0b',
                                cursor: 'pointer',
                                margin: 0,
                                padding: 0,
                              }}
                            />
                            <span>Empate (1 pt cada)</span>
                          </label>

                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={m.isWO ?? false}
                              onChange={(e) =>
                                handleUpdateMatchScore(
                                  selectedRoundNum,
                                  m.id,
                                  m.gameWins1 ?? 0,
                                  m.gameWins2 ?? 0,
                                  m.isDraw ?? false,
                                  e.target.checked
                                )
                              }
                              style={{
                                width: '16px',
                                height: '16px',
                                minWidth: '16px',
                                minHeight: '16px',
                                accentColor: '#f59e0b',
                                cursor: 'pointer',
                                margin: 0,
                                padding: 0,
                              }}
                            />
                            <span>Vitória por W.O.</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Aba de Decks */}
          {activeTab === 'decks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(52, 211, 153, 0.08)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '10px',
                  fontSize: '12px',
                  color: '#a7f3d0',
                }}
              >
                Edite os nomes dos decks utilizados pelos duelistas especificamente neste torneio.
              </div>

              {editedTournament.playerIds.map((pid) => {
                const p = playerMap.get(pid);
                const currentDeck = editedTournament.playerDecks?.[pid] || '';

                return (
                  <div
                    key={pid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px' }}>
                      <div
                        className="player-avatar-sm"
                        style={{ backgroundColor: p?.avatarColor || '#3B82F6' }}
                      >
                        {p?.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                        {p?.name}
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        value={currentDeck}
                        onChange={(e) => handleUpdatePlayerDeck(pid, e.target.value)}
                        placeholder="Nome do Deck (ex: Diva Zombie, Blackwing...)"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#161619',
                          border: '1px solid #3f3f46',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                      />
                      {(() => {
                        const dl = editedTournament.playerDecklists?.[pid];
                        const hasDl = dl && ((dl.mainDeck?.length || 0) > 0 || (dl.extraDeck?.length || 0) > 0);
                        const countTotal = hasDl ? dl.mainDeck.reduce((a, b) => a + (b.count || 1), 0) : 0;
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDecklistModal({
                                playerId: pid,
                                playerName: p?.name || 'Duelista',
                                deckName: currentDeck || 'Edison Deck',
                                decklist: dl || null,
                              })
                            }
                            className={hasDl ? 'badge-decklist-has' : 'btn-decklist-add'}
                            title="Montar ou visualizar Decklist deste jogador"
                          >
                            <Layers size={11} />
                            <span>{hasDl ? `Decklist (${countTotal})` : '+ Decklist'}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Aba de Informações Gerais */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Nome do Torneio:
                </label>
                <input
                  type="text"
                  value={editedTournament.name}
                  onChange={(e) => setEditedTournament((prev) => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#161619',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Data do Torneio (AAAA-MM-DD):
                </label>
                <input
                  type="date"
                  value={editedTournament.date.substring(0, 10)}
                  onChange={(e) => setEditedTournament((prev) => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#161619',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#e2e8f0',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editedTournament.countsForLeague !== false}
                    onChange={(e) =>
                      setEditedTournament((prev) => ({ ...prev, countsForLeague: e.target.checked }))
                    }
                    style={{
                      width: '16px',
                      height: '16px',
                      minWidth: '16px',
                      minHeight: '16px',
                      accentColor: '#f59e0b',
                      cursor: 'pointer',
                      margin: 0,
                    }}
                  />
                  <span>Torneio Oficial da Liga (concede pontos e títulos no Ranking da Liga)</span>
                </label>
              </div>
            </div>
          )}

          {/* Seção de PRÉVIA COMPARATIVA RECALCULADA EM TEMPO REAL */}
          <div
            style={{
              marginTop: '22px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              paddingTop: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} className="text-gold" />
                <h4 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 800 }}>
                  Prévia Recalculada da Classificação
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewDrawer(!showPreviewDrawer)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {showPreviewDrawer ? 'Ocultar Prévia' : 'Exibir Prévia'}
              </button>
            </div>

            {showPreviewDrawer && (
              <>
                {/* Alerta de Mudança de Campeão */}
                {newChamp?.id !== originalChamp?.id && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#fca5a5',
                      fontSize: '12.5px',
                    }}
                  >
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Atenção: O Campeão deste torneio foi alterado!</strong>
                      <div style={{ marginTop: '2px', color: '#fed7aa' }}>
                        Anterior: <strong>{originalChamp?.name}</strong> ➔ Novo Campeão: <strong>{newChamp?.name}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  <table className="compact-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Posição</th>
                        <th className="text-left">Duelista</th>
                        <th>Pontos</th>
                        <th>V - E - D</th>
                        <th>Saldo</th>
                        <th>OMW%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recalculatedStandings.map((s) => {
                        const orig = originalRankMap.get(s.playerId);
                        const origRank = orig?.rank ?? s.rank;
                        const origPts = orig?.points ?? s.matchPoints;
                        const rankDiff = origRank - s.rank; // >0 significa subiu no rank
                        const ptsDiff = s.matchPoints - origPts;

                        return (
                          <tr key={s.playerId} className={s.rank === 1 ? 'champion-row' : ''}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <span className={`rank-tag ${s.rank <= 3 ? 'top' : ''}`}>
                                  {s.rank}º
                                </span>
                                {rankDiff > 0 && (
                                  <span style={{ color: '#34d399', fontSize: '10px', fontWeight: 800 }}>
                                    ▲{rankDiff}
                                  </span>
                                )}
                                {rankDiff < 0 && (
                                  <span style={{ color: '#f87171', fontSize: '10px', fontWeight: 800 }}>
                                    ▼{Math.abs(rankDiff)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-left">
                              <strong>{s.playerName}</strong>
                              <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                                ({editedTournament.playerDecks?.[s.playerId] || 'Edison'})
                              </span>
                            </td>
                            <td>
                              <span className="points-bold">{s.matchPoints} pts</span>
                              {ptsDiff !== 0 && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    marginLeft: '4px',
                                    color: ptsDiff > 0 ? '#34d399' : '#f87171',
                                  }}
                                >
                                  ({ptsDiff > 0 ? `+${ptsDiff}` : ptsDiff})
                                </span>
                              )}
                            </td>
                            <td>
                              {s.matchWins}-{s.matchDraws}-{s.matchLosses}
                            </td>
                            <td>{s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
                            <td>{s.omwPercentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: '#94a3b8',
                  }}
                >
                  <Info size={13} className="text-gold" />
                  <span>
                    Ao salvar, toda a pontuação da Liga e os troféus dos duelistas serão recalculados e atualizados automaticamente.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#161619',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn-secondary-action"
            onClick={onClose}
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-primary-gold"
            onClick={handleConfirmSave}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000',
              fontWeight: 800,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Save size={16} />
            <span>Confirmar Alterações &amp; Recalcular Liga</span>
          </button>
        </div>
      </div>

      {/* Modal de Decklist Edison */}
      {activeDecklistModal && (
        <DecklistModal
          decklist={activeDecklistModal.decklist}
          playerName={activeDecklistModal.playerName}
          defaultDeckName={activeDecklistModal.deckName}
          onSave={(savedDecklist) => {
            setEditedTournament((prev) => ({
              ...prev,
              playerDecks: {
                ...(prev.playerDecks || {}),
                [activeDecklistModal.playerId]: savedDecklist.deckName,
              },
              playerDecklists: {
                ...(prev.playerDecklists || {}),
                [activeDecklistModal.playerId]: savedDecklist,
              },
            }));
            setActiveDecklistModal(null);
          }}
          onClose={() => setActiveDecklistModal(null)}
        />
      )}
    </div>
  );
};
