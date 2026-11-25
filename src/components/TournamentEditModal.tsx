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
} from 'lucide-react';
import type { Player, Tournament } from '../types';
import { calculateTournamentStandings, getTournamentTopCut } from '../utils/swissEngine';

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
          background: '#FFFFFF',
          border: '1.5px solid #CBD5E1',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)',
        }}
      >
        {/* Header do Modal */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #EEF2F6',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--purple-50, #ECFDF5)',
                border: '1px solid var(--border-purple, #A7F3D0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--purple-600, #0D6E62)',
              }}
            >
              <Swords size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#0F172A', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
                Editar Torneio do Histórico
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'var(--font-body)', display: 'block', marginTop: '2px' }}>
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
              background: '#F1F5F9',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas Superiores em Segmented Control Elegante */}
        <div style={{ padding: '10px 16px', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px',
              padding: '4px',
              background: '#F1F5F9',
              borderRadius: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 8px',
                fontSize: '12.5px',
                fontWeight: 800,
                fontFamily: 'var(--font-title)',
                background: activeTab === 'matches' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'matches' ? '#0D6E62' : '#64748B',
                border: 'none',
                borderRadius: '8px',
                boxShadow: activeTab === 'matches' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Swords size={15} />
              <span>Placares</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('decks')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 8px',
                fontSize: '12.5px',
                fontWeight: 800,
                fontFamily: 'var(--font-title)',
                background: activeTab === 'decks' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'decks' ? '#059669' : '#64748B',
                border: 'none',
                borderRadius: '8px',
                boxShadow: activeTab === 'decks' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Shield size={15} />
              <span>Decks</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px 8px',
                fontSize: '12.5px',
                fontWeight: 800,
                fontFamily: 'var(--font-title)',
                background: activeTab === 'info' ? '#FFFFFF' : 'transparent',
                color: activeTab === 'info' ? '#0D6E62' : '#64748B',
                border: 'none',
                borderRadius: '8px',
                boxShadow: activeTab === 'info' ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={15} />
              <span>Geral</span>
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', background: '#F8FAFC' }}>
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
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginRight: '6px' }}>
                  Rodada:
                </span>
                {editedTournament.rounds.map((r) => (
                  <button
                    key={r.roundNumber}
                    type="button"
                    onClick={() => setSelectedRoundNum(r.roundNumber)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: selectedRoundNum === r.roundNumber ? '#0D6E62' : '#FFFFFF',
                      color: selectedRoundNum === r.roundNumber ? '#FFFFFF' : '#334155',
                      border: selectedRoundNum === r.roundNumber ? 'none' : '1px solid #CBD5E1',
                      boxShadow: selectedRoundNum === r.roundNumber ? '0 2px 8px rgba(13, 110, 98, 0.3)' : 'none',
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
                            background: '#FFFDF5',
                            border: '1px solid #FDE68A',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 800 }}>
                              MESA {m.tableNumber} • FOLGA AUTOMÁTICA BY
                            </span>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                              {p1?.name} <span style={{ fontSize: '11px', color: '#64748B' }}>({p1Deck})</span>
                            </div>
                          </div>
                          <span
                            style={{
                              background: '#FEF3C7',
                              color: '#B45309',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #FDE68A',
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
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginBottom: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D6E62', letterSpacing: '0.06em' }}>
                              MESA {m.tableNumber}
                            </span>
                            <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#94A3B8' }}>
                              Atalhos de placar
                            </span>
                          </div>

                          {/* Atalhos de Placar Rápido em linha única e uniforme (incluindo 3-0 e 0-3) */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(7, 1fr)',
                              gap: '4px',
                              width: '100%',
                            }}
                          >
                            {[
                              { label: '3-0', g1: 3, g2: 0, draw: false },
                              { label: '2-0', g1: 2, g2: 0, draw: false },
                              { label: '2-1', g1: 2, g2: 1, draw: false },
                              { label: '1-1', g1: 1, g2: 1, draw: true },
                              { label: '1-2', g1: 1, g2: 2, draw: false },
                              { label: '0-2', g1: 0, g2: 2, draw: false },
                              { label: '0-3', g1: 0, g2: 3, draw: false },
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
                                  padding: '6px 2px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  letterSpacing: '0.015em',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'center',
                                  background:
                                    m.gameWins1 === preset.g1 &&
                                    m.gameWins2 === preset.g2 &&
                                    m.isDraw === preset.draw
                                      ? '#0D6E62'
                                      : '#F1F5F9',
                                  color:
                                    m.gameWins1 === preset.g1 &&
                                    m.gameWins2 === preset.g2 &&
                                    m.isDraw === preset.draw
                                      ? '#FFFFFF'
                                      : '#334155',
                                  border:
                                    m.gameWins1 === preset.g1 &&
                                    m.gameWins2 === preset.g2 &&
                                    m.isDraw === preset.draw
                                      ? '1px solid #0D6E62'
                                      : '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
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
                                color: '#0F172A',
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
                                color: '#64748B',
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
                              max="3"
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
                                background: '#F8FAFC',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '8px',
                                color: '#0F172A',
                                fontWeight: 800,
                                fontSize: '16px',
                              }}
                            />
                            <span style={{ color: '#94A3B8', fontWeight: 800, fontSize: '13px' }}>x</span>
                            <input
                              type="number"
                              min="0"
                              max="3"
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
                                background: '#F8FAFC',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '8px',
                                color: '#0F172A',
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
                                color: '#0F172A',
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
                                color: '#64748B',
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

                        {/* Opções de Empate e WO */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '16px',
                            marginTop: '12px',
                            paddingTop: '10px',
                            borderTop: '1px solid #EEF2F6',
                            fontSize: '12px',
                            color: '#334155',
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
                                accentColor: '#0D6E62',
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
                                accentColor: '#0D6E62',
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
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '10px',
                  fontSize: '12px',
                  color: '#065F46',
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
                      gap: '10px',
                      padding: '10px 12px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flex: '0 1 40%',
                        minWidth: '80px',
                        maxWidth: '45%',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        className="player-avatar-sm"
                        style={{ backgroundColor: p?.avatarColor || '#0D6E62', flexShrink: 0 }}
                      >
                        {p?.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: '#0F172A',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={p?.name}
                      >
                        {p?.name}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={currentDeck}
                        onChange={(e) => handleUpdatePlayerDeck(pid, e.target.value)}
                        placeholder="Nome do Deck..."
                        style={{
                          width: '100%',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          padding: '8px 11px',
                          background: '#F8FAFC',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: '8px',
                          color: '#0F172A',
                          fontSize: '13px',
                          fontWeight: 600,
                          letterSpacing: '0.01em',
                          outline: 'none',
                        }}
                      />
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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nome do Torneio:
                </label>
                <input
                  type="text"
                  value={editedTournament.name}
                  onChange={(e) => setEditedTournament((prev) => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#0F172A',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Data do Torneio (AAAA-MM-DD):
                </label>
                <input
                  type="date"
                  value={editedTournament.date.substring(0, 10)}
                  onChange={(e) => setEditedTournament((prev) => ({ ...prev, date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#0F172A',
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
                    color: '#334155',
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
                      accentColor: '#0D6E62',
                      cursor: 'pointer',
                      margin: 0,
                    }}
                  />
                  <span>Torneio Oficial da Liga (concede pontos e títulos no Ranking da Liga)</span>
                </label>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '13px', color: '#0F172A', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                  Quantitativo do TOP do Torneio:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[2, 3, 4, 5].map((num) => {
                    const currentTop = getTournamentTopCut(editedTournament);
                    const isSelected = currentTop === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        className={`btn-top-select ${isSelected ? 'selected' : ''}`}
                        onClick={() => setEditedTournament((prev) => ({ ...prev, topCut: num }))}
                        style={{ padding: '12px 6px' }}
                      >
                        <span className="top-cut-number">TOP {num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Seção de PRÉVIA COMPARATIVA RECALCULADA EM TEMPO REAL */}
          <div
            style={{
              marginTop: '22px',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <Sparkles size={15} className="text-gold" style={{ flexShrink: 0 }} />
                <h4
                  style={{
                    margin: 0,
                    fontSize: '13.5px',
                    color: '#0F172A',
                    fontWeight: 800,
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Prévia da Classificação
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewDrawer(!showPreviewDrawer)}
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '999px',
                  padding: '4px 12px',
                  color: '#0D6E62',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.015em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: 'pointer',
                  textDecoration: 'none',
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
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#991B1B',
                      fontSize: '12.5px',
                    }}
                  >
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <strong>Atenção: O Campeão deste torneio foi alterado!</strong>
                      <div style={{ marginTop: '2px', color: '#B91C1C' }}>
                        Anterior: <strong>{originalChamp?.name}</strong> ➔ Novo Campeão: <strong>{newChamp?.name}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
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
                                <span className={`rank-tag ${s.rank <= getTournamentTopCut(editedTournament) ? 'top' : ''}`}>
                                  {s.rank}º
                                </span>
                                {rankDiff > 0 && (
                                  <span style={{ color: '#059669', fontSize: '10px', fontWeight: 800 }}>
                                    ▲{rankDiff}
                                  </span>
                                )}
                                {rankDiff < 0 && (
                                  <span style={{ color: '#DC2626', fontSize: '10px', fontWeight: 800 }}>
                                    ▼{Math.abs(rankDiff)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-left">
                              <strong>{s.playerName}</strong>
                              <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>
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
                                    color: ptsDiff > 0 ? '#059669' : '#DC2626',
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
                    padding: '10px 12px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '11.5px',
                    lineHeight: 1.5,
                    letterSpacing: '0.01em',
                    color: '#64748B',
                    textAlign: 'justify',
                  }}
                >
                  <Info size={14} className="text-gold" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ flex: 1 }}>
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
            padding: '12px 16px',
            borderTop: '1px solid #EEF2F6',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="btn-secondary-action"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              borderRadius: '12px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 700,
              letterSpacing: '0.015em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="btn-primary-gold"
            onClick={handleConfirmSave}
            style={{
              flex: 1,
              padding: '10px 16px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: 'var(--purple-gradient)',
              color: '#FFFFFF',
              fontWeight: 700,
              letterSpacing: '0.02em',
              lineHeight: 1.3,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-purple)',
              whiteSpace: 'nowrap',
            }}
          >
            <Save size={15} style={{ flexShrink: 0 }} />
            <span>Salvar e Recalcular Liga</span>
          </button>
        </div>
      </div>
    </div>
  );
};
