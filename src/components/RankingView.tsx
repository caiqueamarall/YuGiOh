import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Search,
  UserCheck,
  Shield,
  FileDown,
  ImageDown,
  Users,
  UserPlus,
  Info
} from 'lucide-react';
import type { Player } from '../types';
import { exportLeagueRankingPDF } from '../utils/pdfGenerator';
import { exportLeagueRankingPNG } from '../utils/imageExporter';
import { sortPlayersForLeague, getLeagueTiebreakExplanations } from '../utils/swissEngine';

interface RankingViewProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  onNavigateToTournament?: () => void;
  onNavigateToPlayers?: () => void;
}

export const RankingView: React.FC<RankingViewProps> = ({
  players,
  onSelectPlayer,
  onNavigateToPlayers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Ordena os jogadores para o ranking geral da liga usando os critérios oficiais de desempate
  const sortedPlayers = sortPlayersForLeague(players);
  const tiebreakNotes = getLeagueTiebreakExplanations(sortedPlayers);

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
      {/* Top Banner Compacto e Elegante com Menu de Opções */}
      <div className="hero-banner">
        {/* Linha Superior: Tag Oficial da Liga e Ações Rápidas de Exportação */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
          <div className="hero-tag" style={{ margin: 0 }}>
            <Trophy size={12} />
            <span>TABELA OFICIAL DA LIGA</span>
          </div>

          <div className="ranking-export-actions">
            <button
              type="button"
              className="btn-export-pill"
              onClick={() => exportLeagueRankingPDF(sortedPlayers)}
              title="Exportar Ranking da Liga em PDF"
            >
              <FileDown size={14} />
              <span>PDF</span>
            </button>
            <button
              type="button"
              className="btn-export-pill"
              onClick={() => exportLeagueRankingPNG(sortedPlayers)}
              title="Exportar Ranking da Liga em PNG"
            >
              <ImageDown size={14} />
              <span>PNG</span>
            </button>
          </div>
        </div>

        {/* Título e Subtítulo com Largura Completa e Espaçamento Harmonioso */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <h2 className="hero-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>
            Ranking Geral
          </h2>
          <p className="hero-subtitle" style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, color: 'var(--text-muted)' }}>
            Classificação acumulada da temporada ({players.length} duelistas)
          </p>
        </div>
      </div>

      {/* Pódio dos 3 Melhores (Card layout moderno inspirado no print) */}
      {sortedPlayers.length >= 2 && (
        <div className="podium-container">
          {/* 1º Lugar (Campeão) */}
          {top3[0] && (
            <div
              className="podium-card rank-1"
              onClick={() => onSelectPlayer(top3[0])}
              style={{ cursor: 'pointer' }}
              title="Ver detalhes de estatísticas"
            >
              <div className="podium-header-badge badge-gold">
                <Trophy size={13} />
                <span>1º LUGAR</span>
              </div>
              <div
                className="podium-avatar"
                style={{
                  backgroundColor: top3[0].avatarColor || '#10B981',
                }}
              >
                {top3[0].name.substring(0, 2).toUpperCase()}
              </div>
              <div className="podium-name" style={{ fontSize: '13.5px' }}>
                {top3[0].name}
              </div>
              <div className="podium-points">
                {top3[0].points} pts
              </div>
              <div className="podium-sub-stats" style={{ color: 'var(--amber-700)', fontWeight: 700 }}>
                {top3[0].wins} Vitórias • {top3[0].trophies} Troféus
              </div>
            </div>
          )}

          {/* 2º Lugar */}
          {top3[1] && (
            <div
              className="podium-card rank-2"
              onClick={() => onSelectPlayer(top3[1])}
              style={{ cursor: 'pointer' }}
              title="Ver detalhes de estatísticas"
            >
              <div className="podium-header-badge badge-silver">
                <Medal size={13} />
                <span>2º LUGAR</span>
              </div>
              <div
                className="podium-avatar"
                style={{ backgroundColor: top3[1].avatarColor || '#0D6E62' }}
              >
                {top3[1].name.substring(0, 2).toUpperCase()}
              </div>
              <div className="podium-name">{top3[1].name}</div>
              <div className="podium-points">{top3[1].points} pts</div>
              <div className="podium-sub-stats">
                {top3[1].wins}V - {top3[1].draws}E - {top3[1].losses}D
              </div>
            </div>
          )}

          {/* 3º Lugar */}
          {top3[2] && (
            <div
              className="podium-card rank-3"
              onClick={() => onSelectPlayer(top3[2])}
              style={{ cursor: 'pointer' }}
              title="Ver detalhes de estatísticas"
            >
              <div className="podium-header-badge badge-bronze">
                <Award size={13} />
                <span>3º LUGAR</span>
              </div>
              <div
                className="podium-avatar"
                style={{ backgroundColor: top3[2].avatarColor || '#3B82F6' }}
              >
                {top3[2].name.substring(0, 2).toUpperCase()}
              </div>
              <div className="podium-name">{top3[2].name}</div>
              <div className="podium-points">{top3[2].points} pts</div>
              <div className="podium-sub-stats">
                {top3[2].wins}V - {top3[2].draws}E - {top3[2].losses}D
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barra de Pesquisa e Filtro */}
      <div className="players-search-bar">
        <Search size={18} style={{ color: 'var(--text-dim)' }} />
        <input
          id="input-search-ranking"
          type="text"
          className="players-search-input"
          placeholder="Buscar por duelista ou deck..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="players-count-legend">
          <UserCheck size={14} style={{ flexShrink: 0 }} />
          <span>{filteredPlayers.length} {filteredPlayers.length === 1 ? 'duelista listado' : 'duelistas listados'}</span>
        </div>
      </div>

      {/* Lista do Ranking Geral */}
      {filteredPlayers.length === 0 ? (
        <div
          className="hero-banner"
          style={{ textAlign: 'center', padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <Users size={36} style={{ color: 'var(--text-dim)', marginBottom: '10px' }} />
          <h4 style={{ fontSize: '16px', fontWeight: 800 }}>Nenhum duelista encontrado</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {searchTerm
              ? `Nenhum resultado para a busca "${searchTerm}".`
              : 'Cadastre os primeiros duelistas da liga para começar a pontuação.'}
          </p>
          {!searchTerm && onNavigateToPlayers && (
            <button
              type="button"
              className="btn-action-pill btn-action-primary"
              onClick={onNavigateToPlayers}
              style={{ marginTop: '16px' }}
            >
              <UserPlus size={16} />
              <span>Cadastrar Primeiro Duelista</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredPlayers.map((player) => {
            const rankIndex = sortedPlayers.findIndex((p) => p.id === player.id) + 1;
            const mostDeck = getMostUsedDeck(player);

            let rankClass = '';
            if (rankIndex === 1) rankClass = 'top-1';
            else if (rankIndex === 2) rankClass = 'top-2';
            else if (rankIndex === 3) rankClass = 'top-3';

            return (
              <React.Fragment key={player.id}>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: 'var(--shadow-xs)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onClick={() => onSelectPlayer(player)}
                  role="button"
                  tabIndex={0}
                  title="Clique para ver estatísticas detalhadas"
                >
                  {/* Lado Esquerdo: Posição, Avatar e Informações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span className={`rank-pill ${rankClass}`} style={{ flexShrink: 0 }}>
                      {rankIndex}º
                    </span>

                    <div
                      className="duelist-mini-avatar"
                      style={{
                        backgroundColor: player.avatarColor || '#0D6E62',
                        flexShrink: 0,
                      }}
                    >
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: 1.25,
                          }}
                        >
                          {player.name}
                        </span>
                      </div>

                      <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {mostDeck ? (
                          <span style={{ color: 'var(--purple-600)', fontWeight: 600 }}>
                            <Shield size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                            {mostDeck}
                          </span>
                        ) : player.age ? (
                          <span>{player.age} anos</span>
                        ) : (
                          <span>{player.participations} part.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Pontos e Registro V - E - D */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--purple-700)' }}>
                      {player.points} pts
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {player.wins}V - {player.draws}E - {player.losses}D
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Observações de Desempate da Liga */}
      {tiebreakNotes.length > 0 && (
        <div
          className="hero-banner"
          style={{ background: '#FFFFFF', border: '1px solid var(--border-purple-light)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Info size={16} style={{ color: 'var(--purple-600)' }} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
              Critérios de Desempate Aplicados na Liga:
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tiebreakNotes.map((note) => (
              <div
                key={note.points}
                style={{
                  background: 'var(--purple-50)',
                  border: '1px solid var(--border-purple-light)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: 'var(--purple-700)',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-purple-light)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      width: 'fit-content',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Empate em {note.points} {note.points === 1 ? 'ponto' : 'pontos'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, lineHeight: 1.35 }}>
                    Empate entre: <strong style={{ color: 'var(--purple-700)' }}>{note.players.join(', ')}</strong>
                  </span>
                </div>
                <ul
                  style={{
                    paddingLeft: '16px',
                    fontSize: '11.5px',
                    color: 'var(--text-body)',
                    margin: '2px 0 0 0',
                    textAlign: 'justify',
                    lineHeight: 1.4,
                  }}
                >
                  {note.reasons.map((r, idx) => (
                    <li key={idx} style={{ marginBottom: '2px' }}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
