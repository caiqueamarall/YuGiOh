import React, { useState } from 'react';
import {
  X,
  Trophy,
  Shield,
  Calendar,
  Sparkles,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Player, Decklist } from '../types';
import { RadarChart } from './RadarChart';
import { DecklistModal } from './DecklistModal';
import { getDeckCardCounts } from '../utils/cardDatabase';

interface PlayerStatsModalProps {
  player: Player | null;
  onClose: () => void;
  leagueRank?: number;
  onUpdatePlayer?: (player: Player) => void;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({
  player,
  onClose,
  leagueRank,
  onUpdatePlayer,
}) => {
  const [activeDecklistModal, setActiveDecklistModal] = useState<{
    decklist?: Decklist | null;
    deckName: string;
    readOnly?: boolean;
    savedIndex?: number;
  } | null>(null);

  if (!player) return null;

  const totalMatches = player.wins + player.draws + player.losses;
  const winRate = totalMatches > 0 ? Math.round((player.wins / totalMatches) * 100) : 0;

  // Filtra apenas torneios oficiais da Liga para as estatísticas de decks e destaques
  const leagueHistory = (player.decksHistory || []).filter(
    (h) => h.countsForLeague !== false
  );

  // Calcula contagem e histórico de decks usados na Liga Oficial
  const deckStatsMap: Record<
    string,
    { count: number; wins: number; draws: number; losses: number }
  > = {};

  if (leagueHistory.length > 0) {
    for (const h of leagueHistory) {
      if (!deckStatsMap[h.deckName]) {
        deckStatsMap[h.deckName] = { count: 0, wins: 0, draws: 0, losses: 0 };
      }
      deckStatsMap[h.deckName].count += 1;
      deckStatsMap[h.deckName].wins += h.matchWins;
      deckStatsMap[h.deckName].draws += h.matchDraws;
      deckStatsMap[h.deckName].losses += h.matchLosses;
    }
  }

  const sortedDecks = Object.entries(deckStatsMap).sort((a, b) => b[1].count - a[1].count);
  const mostPlayedDeck = sortedDecks.length > 0 ? sortedDecks[0] : null;

  const formatHistoryDate = (dateStr: string) => {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const [y, m, d] = dateStr.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card stats-modal-large" onClick={(e) => e.stopPropagation()}>
        {/* Header do Perfil */}
        <div className="stats-modal-header">
          <div className="stats-profile-info">
            <div
              className="stats-modal-avatar"
              style={{ backgroundColor: player.avatarColor || '#3B82F6' }}
            >
              {player.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="stats-header-tag">
                <Sparkles size={13} className="text-gold" />
                <span>PERFIL DO DUELISTA • EDISON FORMAT</span>
              </div>
              <h2 className="stats-player-name">{player.name}</h2>
              <div className="stats-meta-row">
                {player.age ? <span>{player.age} anos</span> : null}
                {leagueRank && <span className="rank-tag top">{leagueRank}º na Liga</span>}
                {player.tournamentTitles ? (
                  <span className="champion-badge-mini">
                    <Trophy size={12} className="text-gold" />
                    {player.tournamentTitles}x Campeão
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <button
            id="btn-close-stats-modal"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* Corpo com Grid de Estatísticas e Gráfico de Radar */}
        <div className="stats-modal-body">
          {/* Seção Superior: Gráfico de Radar e Destaques */}
          <div className="stats-radar-showcase">
            <div className="radar-wrapper-box">
              <h4 className="section-mini-title">Diagrama de Desempenho</h4>
              <RadarChart player={player} size={300} />
            </div>

            {/* Deck Mais Jogado em Destaque */}
            <div className="stats-highlights-column">
              <div className="highlight-deck-card">
                <div className="highlight-deck-header">
                  <Shield size={18} className="text-gold" />
                  <span className="highlight-tag">DECK MAIS JOGADO</span>
                </div>
                {mostPlayedDeck ? (
                  <div className="highlight-deck-content">
                    <h3 className="highlight-deck-name">{mostPlayedDeck[0]}</h3>
                    <p className="highlight-deck-desc">
                      Utilizado em <strong>{mostPlayedDeck[1].count}</strong> torneio(s).
                    </p>
                    <div className="highlight-deck-record">
                      <span>Placar: {mostPlayedDeck[1].wins}V - {mostPlayedDeck[1].draws}E - {mostPlayedDeck[1].losses}D</span>
                    </div>
                  </div>
                ) : (
                  <div className="highlight-deck-content">
                    <p className="text-muted text-sm">
                      Nenhum torneio registrado ainda para este duelista.
                    </p>
                  </div>
                )}
              </div>

              {/* Cards Rápidos de Números */}
              <div className="quick-numbers-grid">
                <div className="quick-stat-box">
                  <span className="quick-stat-lbl">Pontos</span>
                  <span className="quick-stat-val text-gold">{player.points}</span>
                </div>
                <div className="quick-stat-box">
                  <span className="quick-stat-lbl">Win Rate</span>
                  <span className="quick-stat-val text-green">{winRate}%</span>
                </div>
                <div className="quick-stat-box">
                  <span className="quick-stat-lbl">Vitórias</span>
                  <span className="quick-stat-val text-green">{player.wins}</span>
                </div>
                <div className="quick-stat-box">
                  <span className="quick-stat-lbl">Derrotas</span>
                  <span className="quick-stat-val text-red">{player.losses}</span>
                </div>
                <div className="quick-stat-box">
                  <span className="quick-stat-lbl">Empates</span>
                  <span className="quick-stat-val">{player.draws}</span>
                </div>
                <div className="quick-stat-box">
                  <span className="quick-stat-lbl">BYs</span>
                  <span className="quick-stat-val text-cyan">{player.byCount || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Distribuição de Decks Usados na Liga */}
          {sortedDecks.length > 0 && (
            <div className="stats-section-block">
              <div className="section-header-row">
                <Layers size={18} className="text-gold" />
                <h4 className="section-mini-title">Decks Utilizados na Liga Oficial</h4>
              </div>
              <div className="deck-bars-list">
                {sortedDecks.map(([deck, stats]) => {
                  const percentOfPlay = Math.round(
                    (stats.count / (player.participations || 1)) * 100
                  );
                  return (
                    <div key={deck} className="deck-bar-item">
                      <div className="deck-bar-meta">
                        <span className="deck-name-bold">{deck}</span>
                        <span className="deck-count-text">
                          {stats.count}x ({stats.wins}V - {stats.draws}E - {stats.losses}D)
                        </span>
                      </div>
                      <div className="deck-bar-track">
                        <div
                          className="deck-bar-fill"
                          style={{ width: `${percentOfPlay}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção 2.5: Decklists Salvas / Repositório Pessoal */}
          <div className="stats-section-block">
            <div className="section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} className="text-gold" />
                <h4 className="section-mini-title">Decklists do Duelista (Edison Format)</h4>
              </div>
              {onUpdatePlayer && (
                <button
                  type="button"
                  className="btn-decklist-add"
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() =>
                    setActiveDecklistModal({
                      decklist: null,
                      deckName: 'Novo Deck Edison',
                      readOnly: false,
                    })
                  }
                >
                  <Plus size={12} />
                  Criar Decklist
                </button>
              )}
            </div>

            {(!player.savedDecklists || player.savedDecklists.length === 0) ? (
              <p className="text-muted text-xs" style={{ margin: '8px 0 0', fontStyle: 'italic' }}>
                Nenhuma decklist salva no perfil ainda.{onUpdatePlayer ? ' Clique em "Criar Decklist" para montar uma decklist de 40 a 60 cartas Edison para este jogador.' : ''}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '10px' }}>
                {player.savedDecklists.map((dk, dIdx) => (
                  <div
                    key={`${dk.deckName}-${dIdx}`}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {(() => {
                      const counts = getDeckCardCounts(dk);
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>{dk.deckName}</strong>
                            <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>
                              {counts.totalCount} cartas
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '8px' }}>
                            <span>Main: <strong>{counts.mainCount}</strong></span>
                            <span>Extra: <strong>{counts.extraCount}</strong></span>
                            <span>Side: <strong>{counts.sideCount}</strong></span>
                          </div>
                        </>
                      );
                    })()}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="badge-decklist-has"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() =>
                          setActiveDecklistModal({
                            decklist: dk,
                            deckName: dk.deckName,
                            readOnly: false,
                            savedIndex: dIdx,
                          })
                        }
                      >
                        <Layers size={11} />
                        Editar / Ver
                      </button>
                      {onUpdatePlayer && (
                        <button
                          type="button"
                          className="btn-danger-ghost"
                          style={{ padding: '3px 7px', fontSize: '11px' }}
                          onClick={() => {
                            if (confirm(`Remover a decklist "${dk.deckName}" do perfil de ${player.name}?`)) {
                              const updatedSaved = (player.savedDecklists || []).filter((_, idx) => idx !== dIdx);
                              onUpdatePlayer({
                                ...player,
                                savedDecklists: updatedSaved,
                              });
                            }
                          }}
                          title="Excluir decklist salva"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção 3: Histórico de Torneios */}
          {player.decksHistory && player.decksHistory.length > 0 && (
            <div className="stats-section-block">
              <div className="section-header-row">
                <Calendar size={18} className="text-gold" />
                <h4 className="section-mini-title">Histórico de Torneios Disputados</h4>
              </div>
              <div className="table-responsive-wrapper modal-table">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Torneio</th>
                      <th>Tipo</th>
                      <th>Data</th>
                      <th>Deck Utilizado</th>
                      <th>Posição</th>
                      <th>Placar</th>
                      <th>BY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.decksHistory.map((h, idx) => (
                      <tr key={`${h.tournamentId}-${idx}`}>
                        <td><strong>{h.tournamentName}</strong></td>
                        <td>
                          {h.countsForLeague !== false ? (
                            <span className="badge-league-mini official">Liga</span>
                          ) : (
                            <span className="badge-league-mini freeplay">Freeplay</span>
                          )}
                        </td>
                        <td>{formatHistoryDate(h.date)}</td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="player-deck-badge">
                              <Shield size={11} />
                              {h.deckName}
                            </span>
                            {h.decklist && (
                              <button
                                type="button"
                                className="badge-decklist-has"
                                onClick={() =>
                                  setActiveDecklistModal({
                                    decklist: h.decklist,
                                    deckName: h.deckName,
                                    readOnly: true,
                                  })
                                }
                                title="Visualizar Decklist deste torneio"
                              >
                                <Layers size={10} />
                                Decklist ({getDeckCardCounts(h.decklist).totalCount})
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`rank-tag ${h.rank <= 3 ? 'top' : ''}`}>
                            {h.rank}º Lugar
                          </span>
                          {h.isDropped && (
                            <span className="badge-drop-tag" style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '4px', padding: '1px 5px', fontWeight: 'bold' }}>
                              Drop
                            </span>
                          )}
                        </td>
                        <td>
                          {h.matchWins}V - {h.matchDraws}E - {h.matchLosses}D
                        </td>
                        <td>
                          {h.hadBy ? (
                            <span className="had-by-tag">Sim</span>
                          ) : (
                            <span className="text-muted">Não</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Decklist Edison (Visualização ou Edição) */}
      {activeDecklistModal && (
        <DecklistModal
          decklist={activeDecklistModal.decklist}
          playerName={player.name}
          defaultDeckName={activeDecklistModal.deckName}
          readOnly={activeDecklistModal.readOnly}
          onClose={() => setActiveDecklistModal(null)}
          onSave={(newDecklist) => {
            if (!onUpdatePlayer) return;
            const updatedSaved = [...(player.savedDecklists || [])];
            if (activeDecklistModal.savedIndex !== undefined && activeDecklistModal.savedIndex >= 0) {
              updatedSaved[activeDecklistModal.savedIndex] = newDecklist;
            } else {
              const existingIdx = updatedSaved.findIndex(
                (d) => d.deckName.toLowerCase() === newDecklist.deckName.toLowerCase()
              );
              if (existingIdx >= 0) {
                updatedSaved[existingIdx] = newDecklist;
              } else {
                updatedSaved.push(newDecklist);
              }
            }
            onUpdatePlayer({
              ...player,
              savedDecklists: updatedSaved,
            });
            setActiveDecklistModal(null);
          }}
        />
      )}
    </div>
  );
};
