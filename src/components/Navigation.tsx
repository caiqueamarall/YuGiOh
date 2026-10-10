import React from 'react';
import { Trophy, Swords, Users, History, Settings } from 'lucide-react';
import type { ActiveTab, Tournament } from '../types';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeTournament: Tournament | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  activeTournament,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'ranking',
      label: 'Ranking',
      icon: <Trophy size={19} />,
    },
    {
      id: 'tournament',
      label: 'Torneio',
      icon: <Swords size={19} />,
      badge: activeTournament ? `R${activeTournament.currentRound}` : undefined,
    },
    {
      id: 'players',
      label: 'Jogadores',
      icon: <Users size={19} />,
    },
    {
      id: 'history',
      label: 'Histórico',
      icon: <History size={19} />,
    },
    {
      id: 'settings',
      label: 'Regras',
      icon: <Settings size={19} />,
    },
  ];

  return (
    <nav className="app-nav" aria-label="Navegação principal">
      <div className="nav-container">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              className={`nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <div className="nav-icon-wrapper">
                {item.icon}
                {item.badge && <span className="nav-badge-pill">{item.badge}</span>}
              </div>
              <span className="nav-label">{item.label}</span>
              {isActive && <div className="nav-indicator" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
