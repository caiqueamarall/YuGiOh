import React from 'react';
import {
  X,
  Trophy,
  Award,
  Medal,
  Shield,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { Player } from '../types';
import { RadarChart } from './RadarChart';

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
}) => {
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
        {/* Header Fixo do Perfil */}
        <div className="stats-modal-header">
          <div className="stats-profile-info">
            <div
              className="stats-modal-avatar"
              style={{ backgroundColor: player.avatarColor || '#0D6E62' }}
            >
              {player.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="stats-header-tag">
                <Sparkles size={12} className="text-gold" />
                <span>PERFIL DO DUELISTA</span>
              </div>
              <h2 className="stats-player-name">{player.name}</h2>
              <div className="stats-meta-row">
                {player.age ? <span>{player.age} anos</span> : null}
                {leagueRank && <span className="rank-tag top">{leagueRank}º na Liga</span>}
                {player.tournamentTitles ? (
                  <span className="champion-badge-mini">
                    <Trophy size={11} className="text-gold" />
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
            <X size={18} />
          </button>
        </div>

        {/* Corpo com Rolagem Interna Segura */}
        <div className="stats-modal-body">
          {/* Seção Superior: Gráfico de Radar e Destaques */}
          <div className="stats-radar-showcase">
            <div className="radar-wrapper-box">
              <h4 className="section-mini-title" style={{ marginBottom: '8px' }}>Diagrama de Habilidades</h4>
              <RadarChart player={player} size={280} />
            </div>

            {/* Deck Mais Jogado em Destaque */}
            <div className="stats-highlights-column">
              <div className="highlight-deck-card">
                <div className="highlight-deck-header">
                  <Shield size={16} style={{ color: 'var(--purple-600, #0D6E62)' }} />
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
                    <p className="text-muted text-sm" style={{ margin: 0, fontSize: '12px' }}>
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
                <Layers size={16} style={{ color: 'var(--purple-600, #0D6E62)' }} />
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

          {/* Seção 3: Histórico de Torneios Disputados */}
          {player.decksHistory && player.decksHistory.length > 0 ? (
            <div className="stats-section-block">
              <div className="section-header-row" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: '#0D6E62' }} />
                  <h4 className="section-mini-title">Histórico de Torneios</h4>
                </div>
                <span className="history-count-badge">
                  {player.decksHistory.length} {player.decksHistory.length === 1 ? 'torneio' : 'torneios'}
                </span>
              </div>

              <div className="player-history-cards-container">
                {player.decksHistory.map((h, idx) => {
                  const isFirst = h.rank === 1;
                  const isSecond = h.rank === 2;
                  const isThird = h.rank === 3;
                  const isOfficial = h.countsForLeague !== false;

                  return (
                    <div
                      key={`${h.tournamentId || 'tour'}-${idx}`}
                      className={`player-history-item-card ${
                        isFirst ? 'podium-first' : isSecond ? 'podium-second' : isThird ? 'podium-third' : ''
                      }`}
                    >
                      {/* Topo do Card: Título do Torneio + Badge de Posição */}
                      <div className="ph-card-top-row">
                        <div className="ph-title-col">
                          <h5 className="ph-tournament-title">{h.tournamentName}</h5>
                          <div className="ph-meta-pills">
                            <span className="ph-date-pill">
                              <Calendar size={11} />
                              {formatHistoryDate(h.date)}
                            </span>
                            <span className={`ph-type-pill ${isOfficial ? 'official' : 'freeplay'}`}>
                              {isOfficial ? 'Liga Oficial' : 'Amistoso'}
                            </span>
                            {h.format && (
                              <span className="ph-format-pill">{h.format}</span>
                            )}
                          </div>
                        </div>

                        <div className="ph-rank-col">
                          <div
                            className={`ph-rank-badge ${
                              isFirst
                                ? 'rank-gold'
                                : isSecond
                                ? 'rank-silver'
                                : isThird
                                ? 'rank-bronze'
                                : 'rank-standard'
                            }`}
                          >
                            {isFirst && <Trophy size={13} />}
                            {isSecond && <Medal size={13} />}
                            {isThird && <Award size={13} />}
                            <span>{isFirst ? '1º Campeão' : `${h.rank}º Lugar`}</span>
                          </div>
                          {h.isDropped && <span className="ph-dropped-tag">Dropou</span>}
                        </div>
                      </div>

                      {/* Rodapé do Card: Deck Utilizado & Desempenho / Placar */}
                      <div className="ph-card-bottom-row">
                        <div className="ph-deck-info" title={`Deck: ${h.deckName || 'Yugioh Deck'}`}>
                          <Shield size={12} className="ph-deck-icon" />
                          <span className="ph-deck-name">{h.deckName || 'Yugioh Deck'}</span>
                        </div>

                        <div className="ph-score-stats">
                          <div className="ph-score-badge" title="Vitórias - Empates - Derrotas">
                            <span className="score-v">{h.matchWins}V</span>
                            <span className="score-sep">-</span>
                            <span className="score-e">{h.matchDraws}E</span>
                            <span className="score-sep">-</span>
                            <span className="score-d">{h.matchLosses}D</span>
                          </div>

                          {h.matchPoints !== undefined && h.matchPoints !== null && (
                            <span className="ph-pts-badge" title="Pontos conquistados">
                              {h.matchPoints} pts
                            </span>
                          )}

                          {h.hadBy && (
                            <span className="ph-by-tag" title="Recebeu vitória por folga no torneio">
                              +1 BY
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="stats-section-block">
              <div className="section-header-row">
                <Calendar size={16} style={{ color: '#0D6E62' }} />
                <h4 className="section-mini-title">Histórico de Torneios</h4>
              </div>
              <div
                style={{
                  padding: '18px 14px',
                  textAlign: 'center',
                  color: '#64748B',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Calendar size={22} style={{ opacity: 0.35, color: '#0D6E62' }} />
                <span>Nenhum histórico de torneios registrado para este duelista ainda.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
