import React from 'react';
import type { Tournament } from '../types';

interface HeaderProps {
  activeTournament: Tournament | null;
  onNavigateToTournament: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTournament, onNavigateToTournament }) => {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-group">
          <div className="brand-icon-wrapper" title="Duel League">
            <img
              src={`${import.meta.env.BASE_URL}duel-league-logo.png`}
              alt="Duel League Logo"
              className="brand-logo-img"
            />
          </div>
        </div>

        <div className="header-actions">
          {!activeTournament ? (
            <div className="header-right-meta">
              <span className="brand-subtitle">Gestão de Torneios</span>
              <span className="brand-format-tag">Edison Format</span>
            </div>
          ) : (
            <button
              id="header-btn-active-tournament"
              className="btn-tournament-live"
              onClick={onNavigateToTournament}
              title="Ver rodada do torneio em andamento"
            >
              <span className="live-dot" />
              <div className="live-info">
                <span className="live-label">AO VIVO</span>
                <span className="live-round">
                  R{activeTournament.currentRound}/{activeTournament.totalRounds}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
