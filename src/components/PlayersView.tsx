import React, { useState, useRef } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Edit2,
  Trash2,
  Shield,
  X,
  Download,
  Upload,
  BarChart2,
  MoreHorizontal
} from 'lucide-react';
import type { Player } from '../types';
import { exportPlayersToCSV, parsePlayersFromCSV, downloadFile } from '../utils/csvHelper';

interface PlayersViewProps {
  players: Player[];
  onAddPlayer: (player: Omit<Player, 'id' | 'createdAt' | 'points' | 'wins' | 'draws' | 'losses' | 'participations' | 'trophies'>) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
  onSelectPlayer: (player: Player) => void;
  onImportPlayers: (players: Player[]) => void;
}

const AVATAR_COLORS = [
  '#0D6E62', // Deep Petrol Teal (2.0 primary)
  '#059669', // Emerald
  '#10B981', // Mint Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#3B82F6', // Blue
];

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onSelectPlayer,
  onImportPlayers,
}) => {
  // Estado do formulário de novo jogador
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

  // Modais e Menus
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeMenuPlayerId, setActiveMenuPlayerId] = useState<string | null>(null);

  // Edição
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Busca
  const [searchTerm, setSearchTerm] = useState('');

  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome do duelista.');
      return;
    }

    const parsedAge = age !== '' && Number(age) > 0 ? Number(age) : undefined;

    onAddPlayer({
      name: name.trim(),
      age: parsedAge,
      avatarColor: selectedColor,
      active: true,
      decksHistory: [],
    });

    setName('');
    setAge('');
    setSelectedColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    if (!editingPlayer.name.trim()) {
      alert('Informe o nome do duelista.');
      return;
    }

    onUpdatePlayer(editingPlayer);
    setEditingPlayer(null);
  };

  const handleExportCSV = () => {
    const csv = exportPlayersToCSV(players);
    downloadFile(`jogadores-edison-${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parsePlayersFromCSV(content);
      if (parsed.length > 0) {
        onImportPlayers(parsed);
        alert(`${parsed.length} duelistas importados com sucesso a partir do CSV!`);
      } else {
        alert('Não foi possível ler os duelistas do CSV. Verifique o formato do arquivo.');
      }
    };
    reader.readAsText(file);
  };

  const getMostUsedDeck = (p: Player) => {
    if (!p.decksHistory || p.decksHistory.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const h of p.decksHistory) {
      counts[h.deckName] = (counts[h.deckName] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  };

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="view-container">
      {/* Banner Superior Minimalista & Responsivo */}
      <div className="players-header-card">
        <div className="players-header-top">
          <div className="hero-tag">
            <Users size={13} />
            <span>DUELISTAS</span>
            <span
              style={{
                marginLeft: '4px',
                background: 'var(--teal-100, #D1FAE5)',
                color: 'var(--teal-700, #047857)',
                padding: '1px 6px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 800,
              }}
            >
              {players.length}
            </span>
          </div>

          <button
            id="btn-open-add-player"
            className="btn-action-pill btn-action-primary"
            onClick={() => setShowAddModal(true)}
            title="Cadastrar novo duelista"
          >
            <UserPlus size={14} />
            <span>+ Novo Duelista</span>
          </button>
        </div>

        <div>
          <h2 className="players-header-title">Duelistas da Liga</h2>
          <p className="players-header-sub">
            {players.length} {players.length === 1 ? 'participante cadastrado' : 'participantes cadastrados'}
          </p>
        </div>

        <div className="players-header-actions">
          <button
            type="button"
            className="btn-action-pill btn-action-secondary"
            onClick={() => csvInputRef.current?.click()}
            title="Importar Duelistas de arquivo CSV"
          >
            <Upload size={13} />
            <span>Importar CSV</span>
          </button>

          <button
            type="button"
            className="btn-action-pill btn-action-secondary"
            onClick={handleExportCSV}
            title="Exportar Duelistas em formato CSV"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>
        </div>

        <input
          type="file"
          ref={csvInputRef}
          style={{ display: 'none' }}
          accept=".csv"
          onChange={handleImportCSVFile}
        />
      </div>

      {/* Lista de Jogadores & Busca */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="players-search-bar">
          <Search size={18} style={{ color: 'var(--text-dim)' }} />
          <input
            id="input-search-players"
            type="text"
            className="players-search-input"
            placeholder="Pesquisar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="players-count-legend">
            <Users size={14} style={{ flexShrink: 0 }} />
            <span>
              {searchTerm ? (
                <><strong>{filteredPlayers.length}</strong> de <strong>{players.length}</strong></>
              ) : (
                <><strong>{players.length}</strong> cadastrados</>
              )}
            </span>
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div
            className="hero-banner"
            style={{ textAlign: 'center', padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <Users size={36} style={{ color: 'var(--text-dim)', marginBottom: '8px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 800 }}>Nenhum duelista encontrado</h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {searchTerm ? `Sem resultados para "${searchTerm}".` : 'Cadastre seu primeiro jogador na liga.'}
            </p>
            <button
              type="button"
              className="btn-action-pill btn-action-primary"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus size={15} />
              <span>Cadastrar Novo Duelista</span>
            </button>
          </div>
        ) : (
          <div className="players-cards-container">
            {filteredPlayers.map((player, idx) => {
              const mostDeck = getMostUsedDeck(player);

              const isMenuActive = activeMenuPlayerId === player.id;
              const isNearBottom = filteredPlayers.length >= 3 && idx >= filteredPlayers.length - 2;

              return (
                <div
                  key={player.id}
                  className={`player-card ${isMenuActive ? 'menu-active' : ''}`}
                  onClick={() => onSelectPlayer(player)}
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: isMenuActive ? 1200 : 1,
                  }}
                >
                  <div>
                    <div className="player-card-header">
                      <div
                        className="duelist-mini-avatar"
                        style={{
                          backgroundColor: player.avatarColor || '#0D6E62',
                          width: '44px',
                          height: '44px',
                          fontSize: '15px',
                        }}
                        title="Ver radar de habilidades"
                      >
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="player-card-name">
                            {player.name}
                          </span>
                          {player.age && (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: '#F1F5F9', padding: '1px 6px', borderRadius: '999px' }}>
                              {player.age} anos
                            </span>
                          )}
                        </div>

                        <div style={{ marginTop: '2px' }}>
                          {mostDeck ? (
                            <span className="duelist-row-deck" style={{ fontSize: '11px' }}>
                              <Shield size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                              {mostDeck}
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Nenhum torneio ainda</span>
                          )}
                        </div>
                      </div>

                      {/* Submenu mini pop-up de ações do duelista */}
                      <div className="popover-anchor" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`btn-more-options ${activeMenuPlayerId === player.id ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuPlayerId(activeMenuPlayerId === player.id ? null : player.id);
                          }}
                          title="Opções do Duelista"
                          aria-label="Opções do Duelista"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {activeMenuPlayerId === player.id && (
                          <>
                            <div
                              className="popover-backdrop"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuPlayerId(null);
                              }}
                            />
                            <div className={`popover-dropdown ${isNearBottom ? 'popover-up' : ''}`}>
                              <button
                                type="button"
                                className="popover-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuPlayerId(null);
                                  onSelectPlayer(player);
                                }}
                              >
                                <BarChart2 size={14} style={{ color: 'var(--purple-600)' }} />
                                <span>Radar & Estatísticas</span>
                              </button>
                              <button
                                type="button"
                                className="popover-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuPlayerId(null);
                                  setEditingPlayer(player);
                                }}
                              >
                                <Edit2 size={14} />
                                <span>Editar Duelista</span>
                              </button>
                              <button
                                type="button"
                                className="popover-item danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuPlayerId(null);
                                  if (confirm(`Deseja realmente excluir ${player.name}?`)) {
                                    onDeletePlayer(player.id);
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                                <span>Excluir Duelista</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Grade de Estatísticas Rápidas */}
                    <div className="player-card-stats-grid" style={{ marginTop: '12px' }}>
                      <div className="stat-item-col">
                        <span className="stat-value">{player.points}</span>
                        <span className="stat-label">Pontos</span>
                      </div>
                      <div className="stat-item-col">
                        <span className="stat-value" style={{ color: 'var(--emerald-600)' }}>{player.wins}</span>
                        <span className="stat-label">Vitórias</span>
                      </div>
                      <div className="stat-item-col">
                        <span className="stat-value" style={{ color: 'var(--amber-600)' }}>{player.trophies}</span>
                        <span className="stat-label">Troféus</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Novo Duelista */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: 'var(--purple-600)' }} />
                <h3 className="modal-title">Novo Duelista</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                handleCreate(e);
                setShowAddModal(false);
              }}
              className="modal-body"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Nome do Duelista *
                </label>
                <input
                  id="input-player-name"
                  type="text"
                  className="input-clean"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Caique"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Idade (Opcional)
                </label>
                <input
                  id="input-player-age"
                  type="number"
                  min="6"
                  max="99"
                  className="input-clean"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 24 (Opcional)"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                  Cor do Avatar:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: selectedColor === c ? '3px solid #0F172A' : '2px solid #FFFFFF',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'transform 150ms ease',
                        transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                      onClick={() => setSelectedColor(c)}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-action-pill"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-player"
                  type="submit"
                  className="btn-action-pill btn-action-primary"
                >
                  <UserPlus size={16} />
                  <span>Cadastrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição Básica */}
      {editingPlayer && (
        <div className="modal-backdrop">
          <div className="modal-content-card" style={{ maxWidth: '420px' }}>
            <div className="modal-header-row">
              <h3 className="modal-title">Editar Duelista</h3>
              <button
                className="btn-close-modal"
                onClick={() => setEditingPlayer(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="modal-body">
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Nome:
                </label>
                <input
                  type="text"
                  className="input-clean"
                  value={editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Idade (Opcional):
                </label>
                <input
                  type="number"
                  min="6"
                  max="99"
                  className="input-clean"
                  value={editingPlayer.age ?? ''}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      age: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  placeholder="Opcional"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-action-pill"
                  onClick={() => setEditingPlayer(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-action-pill btn-action-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
