import React, { useState } from 'react';
import { History, Trophy, Calendar, Users, ChevronDown, ChevronUp, Swords, Sparkles, FileDown, Shield, Info } from 'lucide-react';
import type { Player, Tournament } from '../types';
import { exportTournamentResultsPDF } from '../utils/pdfGenerator';
import { calculateTournamentStandings, getTiebreakExplanations } from '../utils/swissEngine';

interface HistoryViewProps {
  tournaments: Tournament[];
  players: Player[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ tournaments, players }) => {
  const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);

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
            Consulte os resultados oficiais e confrontos anteriores.
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
          completedTournaments.map((tournament) => {
            const isExpanded = expandedTournamentId === tournament.id;
            const standings = calculateTournamentStandings(tournament, players);
            const champion = standings[0] ? playerMap.get(standings[0].playerId) : (tournament.championId ? playerMap.get(tournament.championId) : null);
            const runnerUp = standings[1] ? playerMap.get(standings[1].playerId) : (tournament.runnerUpId ? playerMap.get(tournament.runnerUpId) : null);
            const thirdPlace = standings[2] ? playerMap.get(standings[2].playerId) : null;

            return (
              <div key={tournament.id} className="history-card">
                <div className="history-card-header" onClick={() => toggleExpand(tournament.id)}>
                  <div className="history-main-info">
                    <div className="history-icon-box">
                      <Trophy size={22} className="text-gold" />
                    </div>
                    <div className="history-text-details">
                      <div className="history-title-row">
                        <h3 className="history-title">{tournament.name}</h3>
                        {tournament.countsForLeague !== false ? (
                          <span className="badge-league-official">Oficial da Liga</span>
                        ) : (
                          <span className="badge-league-freeplay">Freeplay</span>
                        )}
                      </div>
                      <div className="history-meta-row">
                        <span className="history-meta-item">
                          <Calendar size={12} />
                          <span>{formatTournamentDate(tournament.date)}</span>
                        </span>
                        <span className="history-meta-item">
                          <Users size={12} />
                          <span>{tournament.playerIds.length} duelistas</span>
                        </span>
                        <span className="history-meta-item">
                          <Swords size={12} />
                          <span>{tournament.totalRounds} rodadas</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="history-header-right">
                    {champion && (
                      <div className="champion-preview-badge">
                        <Trophy size={13} className="text-gold" />
                        <span>1º Lugar: <strong>{champion.name}</strong></span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn-export-pdf-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportTournamentResultsPDF(tournament, players);
                      }}
                      title="Exportar resultado e chaveamento deste torneio em PDF"
                    >
                      <FileDown size={14} />
                      <span>PDF</span>
                    </button>
                    <button className="btn-expand-history" aria-label="Expandir detalhes">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="history-expanded-body">
                    {tournament.countsForLeague === false && (
                      <div className="history-freeplay-notice">
                        <Sparkles size={14} className="text-cyan" />
                        <span>Torneio Freeplay: Resultados salvos no histórico (sem pontuação no Ranking da Liga).</span>
                      </div>
                    )}
                    {/* Destaque de Pódio */}
                    <div className="history-podium-row">
                      {champion && (
                        <div className="podium-mini-pill gold">
                          <Trophy size={16} className="text-gold" />
                          <span>1º Lugar: {champion.name} {tournament.playerDecks?.[champion.id] ? `• ${tournament.playerDecks[champion.id]}` : ''}</span>
                        </div>
                      )}
                      {runnerUp && (
                        <div className="podium-mini-pill silver">
                          <span>2º Lugar: {runnerUp.name} {tournament.playerDecks?.[runnerUp.id] ? `• ${tournament.playerDecks[runnerUp.id]}` : ''}</span>
                        </div>
                      )}
                      {thirdPlace && (
                        <div className="podium-mini-pill bronze">
                          <span>3º Lugar: {thirdPlace.name} {tournament.playerDecks?.[thirdPlace.id] ? `• ${tournament.playerDecks[thirdPlace.id]}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Classificação Final do Torneio */}
                    {(() => {
                      const standings = calculateTournamentStandings(tournament, players);
                      const playerDecks = tournament.playerDecks || {};
                      return (
                        <div className="history-standings-section" style={{ marginTop: '14px', marginBottom: '18px' }}>
                          <div className="standings-table-header-row">
                            <h4 className="compact-title" style={{ margin: 0, fontSize: '13.5px' }}>Classificação Final &amp; Desempates</h4>
                            <span className="badge-swiss-stats">Critérios TCG</span>
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
                                  <th title="Player Match Win Rate: Aproveitamento em partidas">PMW%</th>
                                  <th title="Opponent Match Win Rate: Força dos oponentes">OMW%</th>
                                  <th title="Player Game Win Rate: Aproveitamento em duelos individuais">PGW%</th>
                                  <th title="Opponent Game Win Rate: Força dos games dos oponentes">OGW%</th>
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
                            const tiebreakNotes = getTiebreakExplanations(standings);
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
    </div>
  );
};
