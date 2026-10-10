import React from 'react';
import { Swords, Trophy } from 'lucide-react';
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
          <div className="brand-icon-wrapper">
            <Swords className="brand-icon" size={20} />
          </div>
          <div className="brand-text-col">
            <h1 className="brand-title">Edison League</h1>
            <span className="brand-subtitle">Formato Edison (2010)</span>
          </div>
        </div>

        <div className="header-actions">
          {activeTournament ? (
            <button
              id="header-btn-active-tournament"
              className="btn-tournament-live"
              onClick={onNavigateToTournament}
              title="Ver torneio em andamento"
            >
              <span className="live-dot" />
              <div className="live-info">
                <span className="live-label">AO VIVO</span>
                <span className="live-round">
                  R{activeTournament.currentRound}/{activeTournament.totalRounds}
                </span>
              </div>
            </button>
          ) : (
            <div className="tournament-idle-pill">
              <Trophy size={14} className="text-gold" />
              <span>Liga Ativa</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
