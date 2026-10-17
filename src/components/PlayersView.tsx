import React, { useState, useRef } from 'react';
import {
  UserPlus,
  Users,
  Search,
  Edit2,
  Trash2,
  Shield,
  Trophy,
  X,
  Download,
  Upload,
  BarChart2
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
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#84CC16', // Lime
];

export const PlayersView: React.FC<PlayersViewProps> = ({
  players,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
  onSelectPlayer,
  onImportPlayers,
}) => {
  // Estado do formulário de novo jogador (apenas informações básicas: nome e idade)
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);

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
      {/* Banner Superior */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Users size={14} className="text-gold" />
            <span>CADASTRO & DUELISTAS</span>
            <span
              style={{
                marginLeft: '6px',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                padding: '1px 7px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 800,
              }}
              title="Total de duelistas adicionados"
            >
              {players.length}
            </span>
          </div>
          <h2 className="hero-title">Duelistas da Liga</h2>
          <p className="hero-subtitle hide-on-xs">
            Gerencie os participantes da liga com facilidade ({players.length} {players.length === 1 ? 'duelista adicionado' : 'duelistas adicionados'}).
          </p>
        </div>
      </div>

      <div className="players-layout-grid">
        {/* Formulário de Cadastro Básico */}
        <div className="player-form-card">
          <div className="form-card-header">
            <div className="icon-badge">
              <UserPlus size={20} className="text-gold" />
            </div>
            <div>
              <h3>Cadastrar Duelista</h3>
              <p className="text-muted text-xs">Informações cadastrais básicas do participante.</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="player-create-form">
            <div className="form-group">
              <label htmlFor="input-player-name" className="form-label">
                Nome do Jogador *
              </label>
              <input
                id="input-player-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Caique"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="input-player-age" className="form-label">
                Idade (Opcional)
              </label>
              <input
                id="input-player-age"
                type="number"
                min="6"
                max="99"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 24 (Opcional)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cor do Avatar:</label>
              <div className="avatar-colors-picker">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot ${selectedColor === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setSelectedColor(c)}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>

            <button id="btn-submit-player" type="submit" className="btn-primary-gold w-full mt-2">
              <UserPlus size={18} />
              <span>Salvar Duelista</span>
            </button>
          </form>
        </div>

        {/* Lista de Jogadores & Botões de CSV */}
        <div className="players-list-column">
          <div className="list-toolbar">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                id="input-search-players"
                type="text"
                placeholder="Pesquisar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Ações de CSV */}
            <div className="csv-actions-group">
              <button
                id="btn-export-players-csv"
                className="btn-secondary-action"
                onClick={handleExportCSV}
                title="Exportar dados de jogadores em arquivo CSV"
              >
                <Download size={15} />
                <span>Exportar CSV</span>
              </button>

              <button
                id="btn-import-players-csv"
                className="btn-secondary-action"
                onClick={() => csvInputRef.current?.click()}
                title="Carregar jogadores a partir de um arquivo CSV"
              >
                <Upload size={15} />
                <span>Importar CSV</span>
              </button>

              <input
                type="file"
                ref={csvInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleImportCSVFile}
              />

              {players.length > 0 && (
                <button
                  id="btn-clear-all-players"
                  className="btn-danger-ghost"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => {
                    if (confirm(`Tem certeza de que deseja apagar todos os ${players.length} duelistas cadastrados?`)) {
                      onImportPlayers([]);
                    }
                  }}
                  title="Apagar todos os duelistas e recomeçar do zero"
                >
                  <Trash2 size={15} />
                  <span>Zerar Duelistas</span>
                </button>
              )}
            </div>
          </div>

          {/* Legenda simples com contagem total de duelistas adicionados */}
          <div className="players-count-legend">
            <Users size={13} className="text-gold" />
            <span>
              {searchTerm ? (
                <>Mostrando <strong>{filteredPlayers.length}</strong> de <strong>{players.length}</strong> {players.length === 1 ? 'jogador adicionado' : 'jogadores adicionados'}</>
              ) : (
                <>Total: <strong>{players.length}</strong> {players.length === 1 ? 'jogador adicionado' : 'jogadores adicionados'}</>
              )}
            </span>
          </div>

          <div className="players-cards-container">
            {filteredPlayers.length === 0 ? (
              <div className="empty-state-card">
                <Users size={32} className="text-muted" />
                <p>Nenhum duelista encontrado.</p>
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const mostDeck = getMostUsedDeck(player);

                return (
                  <div key={player.id} className="player-profile-card">
                    <div className="profile-header">
                      <div
                        className="profile-avatar cursor-pointer"
                        style={{ backgroundColor: player.avatarColor || '#3B82F6' }}
                        onClick={() => onSelectPlayer(player)}
                      >
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="profile-details cursor-pointer" onClick={() => onSelectPlayer(player)}>
                        <div className="profile-name-row">
                          <h4 className="profile-name">{player.name}</h4>
                          {player.age ? (
                            <span className="profile-age-tag">{player.age} anos</span>
                          ) : null}
                        </div>
                        {mostDeck ? (
                          <span className="profile-deck">
                            <Shield size={12} />
                            Mais jogado: <strong>{mostDeck}</strong>
                          </span>
                        ) : (
                          <span className="profile-deck-none">Nenhum torneio ainda</span>
                        )}
                      </div>

                      <div className="profile-actions">
                        <button
                          className="btn-icon-action"
                          onClick={() => onSelectPlayer(player)}
                          title="Ver diagrama de radar e estatísticas"
                        >
                          <BarChart2 size={16} className="text-gold" />
                        </button>
                        <button
                          className="btn-icon-action"
                          onClick={() => setEditingPlayer(player)}
                          title="Editar jogador"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon-action btn-danger-action"
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir ${player.name}?`)) {
                              onDeletePlayer(player.id);
                            }
                          }}
                          title="Excluir jogador"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div
                      className="profile-stats-grid cursor-pointer"
                      onClick={() => onSelectPlayer(player)}
                      title="Clique para abrir detalhes do duelista"
                    >
                      <div className="stat-box">
                        <span className="stat-label">Pontos</span>
                        <span className="stat-value text-gold">{player.points}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Vitórias</span>
                        <span className="stat-value text-green">{player.wins}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Empates</span>
                        <span className="stat-value">{player.draws}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Derrotas</span>
                        <span className="stat-value text-red">{player.losses}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Torneios</span>
                        <span className="stat-value">{player.participations}</span>
                      </div>
                      <div className="stat-box">
                        <span className="stat-label">Troféus</span>
                        <span className="stat-value text-gold flex items-center justify-center gap-1">
                          <Trophy size={12} />
                          {player.trophies}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edição Básica */}
      {editingPlayer && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Editar Duelista</h3>
              <button
                className="btn-modal-close"
                onClick={() => setEditingPlayer(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="modal-form">
              <div className="form-group">
                <label className="form-label">Nome:</label>
                <input
                  type="text"
                  value={editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Idade (Opcional):</label>
                <input
                  type="number"
                  min="6"
                  max="99"
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

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingPlayer(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary-gold">
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
