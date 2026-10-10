import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Search,
  UserCheck,
  Flame,
  Shield,
  FileDown,
  Users,
  UserPlus
} from 'lucide-react';
import type { Player } from '../types';
import { exportLeagueRankingPDF } from '../utils/pdfGenerator';

interface RankingViewProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  onNavigateToTournament: () => void;
  onNavigateToPlayers?: () => void;
}

export const RankingView: React.FC<RankingViewProps> = ({
  players,
  onSelectPlayer,
  onNavigateToTournament,
  onNavigateToPlayers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Ordena os jogadores para o ranking geral da liga
  const sortedPlayers = [...players]
    .filter((p) => p.active)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (b.participations !== a.participations) return b.participations - a.participations;
      return a.name.localeCompare(b.name);
    });

  const getMostUsedDeck = (p: Player) => {
    if (!p.decksHistory || p.decksHistory.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const h of p.decksHistory) {
      if (h.countsForLeague === false) continue; // Apenas torneios oficiais da Liga
      counts[h.deckName] = (counts[h.deckName] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  };

  const filteredPlayers = sortedPlayers.filter((p) => {
    const mostDeck = getMostUsedDeck(p);
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mostDeck && mostDeck.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const top3 = sortedPlayers.slice(0, 3);

  return (
    <div className="view-container">
      {/* Top Banner Compacto e Elegante */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Trophy size={14} className="text-gold" />
            <span>TABELA OFICIAL DA LIGA EDISON</span>
          </div>
          <h2 className="hero-title">Ranking Geral dos Duelistas</h2>
          <p className="hero-subtitle hide-on-xs">
            Pontuação consolidada dos torneios da temporada. Toque em qualquer jogador para ver suas estatísticas.
          </p>
        </div>
        <div className="hero-action-group">
          <button
            id="btn-export-ranking-pdf"
            className="btn-pdf-export-main"
            onClick={() => exportLeagueRankingPDF(sortedPlayers)}
            title="Exportar Classificação da Liga em PDF"
          >
            <FileDown size={16} />
            <span>Exportar PDF</span>
          </button>
          <button
            id="btn-ranking-new-tournament"
            className="btn-primary-gold"
            onClick={onNavigateToTournament}
          >
            <Flame size={16} />
            <span>Novo Torneio</span>
          </button>
        </div>
      </div>

      {/* Pódio dos 3 Melhores */}
      {sortedPlayers.length >= 2 && (
        <div className="podium-grid">
          {/* 2º Lugar */}
          {top3[1] && (
            <div
              className="podium-card podium-silver cursor-pointer"
              onClick={() => onSelectPlayer(top3[1])}
              title="Ver estatísticas deste duelista"
            >
              <div className="podium-badge">
                <Medal size={22} className="text-silver" />
                <span>2º LUGAR</span>
              </div>
              <div className="podium-avatar" style={{ borderColor: '#94A3B8' }}>
                {top3[1].name.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="podium-name">{top3[1].name}</h3>
              {getMostUsedDeck(top3[1]) && (
                <span className="podium-deck">Deck: {getMostUsedDeck(top3[1])}</span>
              )}
              <div className="podium-stats">
                <span className="stat-highlight">{top3[1].points} pts</span>
                <span className="stat-sub">
                  {top3[1].wins}V - {top3[1].draws}E - {top3[1].losses}D
                </span>
              </div>
            </div>
          )}

          {/* 1º Lugar */}
          {top3[0] && (
            <div
              className="podium-card podium-gold cursor-pointer"
              onClick={() => onSelectPlayer(top3[0])}
              title="Ver estatísticas deste duelista"
            >
              <div className="podium-crown">
                <Trophy size={28} className="text-gold" />
                <span>CAMPEÃO ATUAL</span>
              </div>
              <div className="podium-avatar main-avatar" style={{ borderColor: 'var(--gold-400)' }}>
                {top3[0].name.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="podium-name main-name">{top3[0].name}</h3>
              {getMostUsedDeck(top3[0]) && (
                <span className="podium-deck">Deck: {getMostUsedDeck(top3[0])}</span>
              )}
              <div className="podium-stats">
                <span className="stat-highlight text-gold">{top3[0].points} pts</span>
                <span className="stat-sub">
                  {top3[0].wins} Vitórias • {top3[0].trophies} Troféus
                </span>
              </div>
            </div>
          )}

          {/* 3º Lugar */}
          {top3[2] && (
            <div
              className="podium-card podium-bronze cursor-pointer"
              onClick={() => onSelectPlayer(top3[2])}
              title="Ver estatísticas deste duelista"
            >
              <div className="podium-badge">
                <Award size={22} className="text-bronze" />
                <span>3º LUGAR</span>
              </div>
              <div className="podium-avatar" style={{ borderColor: '#CD7F32' }}>
                {top3[2].name.substring(0, 2).toUpperCase()}
              </div>
              <h3 className="podium-name">{top3[2].name}</h3>
              {getMostUsedDeck(top3[2]) && (
                <span className="podium-deck">Deck: {getMostUsedDeck(top3[2])}</span>
              )}
              <div className="podium-stats">
                <span className="stat-highlight">{top3[2].points} pts</span>
                <span className="stat-sub">
                  {top3[2].wins}V - {top3[2].draws}E - {top3[2].losses}D
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de Filtro e Busca */}
      <div className="ranking-toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            id="input-search-ranking"
            type="text"
            placeholder="Buscar por duelista ou deck..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="toolbar-info">
          <UserCheck size={16} />
          <span>{filteredPlayers.length} duelistas listados</span>
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="empty-state-card-compact">
          <Users size={32} className="text-muted" />
          <h4 style={{ margin: '8px 0 4px', fontSize: '15px' }}>Nenhum duelista encontrado</h4>
          <p className="text-muted text-xs">
            {searchTerm
              ? `Nenhum resultado para a busca "${searchTerm}".`
              : 'Cadastre os primeiros duelistas da liga para começar a pontuação.'}
          </p>
          {!searchTerm && onNavigateToPlayers && (
            <button
              type="button"
              className="btn-primary-gold"
              onClick={onNavigateToPlayers}
              style={{ marginTop: '12px' }}
            >
              <UserPlus size={16} />
              <span>Cadastrar Primeiro Duelista</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Lista em Cards para Mobile */}
          <div className="ranking-mobile-list">
            {filteredPlayers.map((player) => {
              const rankIndex = sortedPlayers.findIndex((p) => p.id === player.id) + 1;
              const mostDeck = getMostUsedDeck(player);
              const isTopCut = rankIndex <= 12;

              return (
                <React.Fragment key={player.id}>
                  <div
                    className={`ranking-card-mobile ${rankIndex === 1 ? 'top-1' : ''} ${isTopCut ? 'topcut' : ''}`}
                    onClick={() => onSelectPlayer(player)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="ranking-card-left">
                      <span className={`mobile-rank-badge rank-${rankIndex <= 3 ? rankIndex : 'other'}`}>
                        {rankIndex}º
                      </span>
                      <div
                        className="mobile-avatar"
                        style={{ backgroundColor: player.avatarColor || '#3B82F6' }}
                      >
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="mobile-player-details">
                        <div className="mobile-player-name-row">
                          <span className="mobile-player-name">{player.name}</span>
                          {isTopCut && <span className="badge-topcut-tag">TOP 12</span>}
                        </div>
                        {mostDeck ? (
                          <span className="mobile-deck-tag">
                            <Shield size={10} />
                            {mostDeck}
                          </span>
                        ) : (
                          player.age ? <span className="text-muted" style={{ fontSize: '11px' }}>{player.age} anos</span> : null
                        )}
                      </div>
                    </div>

                    <div className="ranking-card-right">
                      <span className="mobile-points">{player.points} pts</span>
                      <span className="mobile-record">
                        {player.wins}V - {player.draws}E - {player.losses}D
                      </span>
                    </div>
                  </div>

                  {/* Linha de corte Top Cut no mobile */}
                  {rankIndex === 12 && filteredPlayers.length > 12 && (
                    <div className="mobile-topcut-divider">
                      <span>✂️ Linha de Corte • Top 12</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Tabela do Ranking (Desktop / Tablet) */}
          <div className="table-responsive-wrapper hide-on-mobile">
            <table className="ranking-table" id="ranking-league-table">
              <thead>
                <tr>
                  <th className="th-center" style={{ width: '80px' }}>Posição</th>
                  <th className="th-left">Player</th>
                  <th className="th-center" style={{ width: '110px' }}>Pontuação</th>
                  <th className="th-center" style={{ width: '90px' }}>Vitórias</th>
                  <th className="th-center" style={{ width: '90px' }}>Empates</th>
                  <th className="th-center" style={{ width: '90px' }}>Derrotas</th>
                  <th className="th-center" style={{ width: '120px' }}>Participações</th>
                  <th className="th-center" style={{ width: '100px' }}>Troféus</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => {
                  const rankIndex = sortedPlayers.findIndex((p) => p.id === player.id) + 1;
                  const mostDeck = getMostUsedDeck(player);

                  let rankBadgeClass = 'rank-pill-normal';
                  let rankIcon = null;

                  if (rankIndex === 1) {
                    rankBadgeClass = 'rank-pill-gold';
                    rankIcon = <Trophy size={14} className="text-gold" />;
                  } else if (rankIndex === 2) {
                    rankBadgeClass = 'rank-pill-silver';
                    rankIcon = <Medal size={14} />;
                  } else if (rankIndex === 3) {
                    rankBadgeClass = 'rank-pill-bronze';
                    rankIcon = <Award size={14} />;
                  }

                  const isTopCut = rankIndex <= 12;

                  return (
                    <React.Fragment key={player.id}>
                      <tr className={`ranking-row ${rankIndex <= 3 ? 'top-tier' : ''} ${isTopCut ? 'topcut-qualified-row' : ''}`}>
                        {/* Posição */}
                        <td className="td-center">
                          <div className={`rank-pill ${rankBadgeClass}`}>
                            {rankIcon}
                            <span>{rankIndex}º</span>
                          </div>
                        </td>

                        {/* Player (Clicável para estatísticas) */}
                        <td className="td-left">
                          <button
                            type="button"
                            className="player-cell-btn"
                            onClick={() => onSelectPlayer(player)}
                            title="Ver estatísticas detalhadas deste duelista"
                          >
                            <div
                              className="player-avatar-sm"
                              style={{ backgroundColor: player.avatarColor || '#3B82F6' }}
                            >
                              {player.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="player-meta text-left">
                              <div className="player-name-wrapper">
                                <span className="player-name-link">{player.name}</span>
                                {isTopCut && (
                                  <span className="badge-topcut-tag" title="Classificado para o Top Cut">
                                    TOP CUT
                                  </span>
                                )}
                              </div>
                              <div className="player-submeta">
                                {player.age ? (
                                  <span className="player-age-badge">{player.age} anos</span>
                                ) : null}
                                {mostDeck && (
                                  <span className="player-deck-badge" title="Deck mais jogado">
                                    <Shield size={11} />
                                    {mostDeck}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </td>

                        {/* Pontuação */}
                        <td className="td-center">
                          <span className="score-badge-main">{player.points} pts</span>
                        </td>

                        {/* Vitórias */}
                        <td className="td-center">
                          <span className="stat-win-badge">{player.wins}</span>
                        </td>

                        {/* Empates */}
                        <td className="td-center">
                          <span className="stat-draw-badge">{player.draws}</span>
                        </td>

                        {/* Derrotas */}
                        <td className="td-center">
                          <span className="stat-loss-badge">{player.losses}</span>
                        </td>

                        {/* Participações */}
                        <td className="td-center">
                          <span className="stat-part-badge">{player.participations}</span>
                        </td>

                        {/* Troféus */}
                        <td className="td-center">
                          <div className="trophy-badge">
                            <Trophy size={14} className="text-gold" />
                            <span>{player.trophies}</span>
                          </div>
                        </td>
                      </tr>

                      {/* Linha de Corte Top Cut (Top 12) */}
                      {rankIndex === 12 && filteredPlayers.length > 12 && (
                        <tr key="topcut-cut-line" className="topcut-divider-row">
                          <td colSpan={8}>
                            <div className="topcut-divider-bar">
                              <span className="topcut-divider-badge">
                                ✂️ LINHA DE CORTE • TOP 12 CLASSIFICADOS PARA O TORNEIO FINAL
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
