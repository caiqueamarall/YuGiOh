import React, { useState, useRef } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  BookOpen,
  FileJson,
  FileSpreadsheet,
  Ban,
  ShieldAlert,
  Search,
  ExternalLink,
  Swords,
  Layers,
  HelpCircle,
  Clock,
  X,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { exportBackupJSON, importBackupJSON } from '../utils/storage';
import { exportPlayersToCSV, parsePlayersFromCSV, downloadFile } from '../utils/csvHelper';
import { EDISON_BANLIST } from '../data/edisonBanlist';
import type { BanlistCard, BanlistStatus, CardType } from '../data/edisonBanlist';
import type { Player } from '../types';

interface SettingsViewProps {
  players: Player[];
  onReloadAllData: () => void;
  onImportPlayers: (players: Player[]) => void;
}

type SettingsSection = 'edison-rules' | 'banlist' | 'league-rules' | 'data-management';

export const SettingsView: React.FC<SettingsViewProps> = ({
  players,
  onReloadAllData,
  onImportPlayers,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null);

  // Estado do filtro da Banlist
  const [banlistStatusFilter, setBanlistStatusFilter] = useState<'all' | BanlistStatus>('all');
  const [banlistTypeFilter, setBanlistTypeFilter] = useState<'all' | CardType>('all');
  const [searchCardTerm, setSearchCardTerm] = useState('');
  const [previewCard, setPreviewCard] = useState<BanlistCard | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edison-yugioh-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        alert('Backup JSON importado com sucesso!');
        onReloadAllData();
      } else {
        alert('Falha ao importar arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const csv = exportPlayersToCSV(players);
    downloadFile(`jogadores-${new Date().toISOString().split('T')[0]}.csv`, csv);
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
        alert(`${parsed.length} duelistas importados do CSV com sucesso!`);
      } else {
        alert('Falha ao ler dados do CSV.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (
      confirm(
        'ATENÇÃO: Deseja apagar TODOS os dados da liga (duelistas, histórico e torneios)? O sistema começará 100% limpo do zero.'
      )
    ) {
      localStorage.clear();
      onReloadAllData();
      alert('Sistema zerado com sucesso! Nenhum duelista cadastrado.');
    }
  };

  // Filtragem dos cards da Banlist
  const filteredCards = EDISON_BANLIST.filter((card) => {
    const matchesStatus =
      banlistStatusFilter === 'all' || card.status === banlistStatusFilter;
    const matchesType =
      banlistTypeFilter === 'all' || card.type === banlistTypeFilter;
    const matchesSearch = card.name
      .toLowerCase()
      .includes(searchCardTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const forbiddenCount = EDISON_BANLIST.filter((c) => c.status === 'forbidden').length;
  const limitedCount = EDISON_BANLIST.filter((c) => c.status === 'limited').length;
  const semiLimitedCount = EDISON_BANLIST.filter((c) => c.status === 'semi-limited').length;

  const closeSectionModal = () => {
    setPreviewCard(null);
    setActiveSection(null);
  };

  const getSectionModalMeta = (sec: SettingsSection) => {
    switch (sec) {
      case 'edison-rules':
        return {
          title: 'Regras Edison (2010)',
          subtitle: 'Prioridade de invocação, compra no 1º turno e pré-erratas',
        };
      case 'banlist':
        return {
          title: 'Forbidden & Limited List',
          subtitle: 'Banlist Oficial de Março de 2010 (132 cartas)',
        };
      case 'league-rules':
        return {
          title: 'Regulamento da Liga',
          subtitle: 'Sistema Suíço, Pontuação, BY, Drop e Desempate',
        };
      case 'data-management':
        return {
          title: 'Dados & Backup',
          subtitle: 'Importação, exportação CSV/JSON e limpeza',
        };
    }
  };

  return (
    <div className="view-container">
      {/* Banner Principal */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Settings size={14} className="text-gold" />
            <span>AJUSTES & REGRAS OFICIAIS</span>
          </div>
          <h2 className="hero-title">Guia Edison &amp; Banlist</h2>
          <p className="hero-subtitle">
            Selecione uma opção abaixo para abrir os detalhes de regras, banlist ou backups.
          </p>
        </div>
      </div>

      {/* Lista de Opções Empilhadas (Uma em cima da outra, mesmo estilo da tela de Torneio) */}
      <div className="modern-shortcuts-grid">
        <button
          type="button"
          className="modern-shortcut-card"
          onClick={() => {
            setPreviewCard(null);
            setActiveSection('edison-rules');
          }}
        >
          <div className="modern-shortcut-icon" style={{ background: '#ECFDF5', color: '#0D6E62' }}>
            <BookOpen size={18} />
          </div>
          <div className="modern-shortcut-text">
            <span className="modern-shortcut-title">Regras Edison (2010)</span>
            <span className="modern-shortcut-sub">Prioridade de invocação, 1º turno e pré-erratas</span>
          </div>
          <ChevronRight size={16} className="modern-shortcut-chevron" />
        </button>

        <button
          type="button"
          className="modern-shortcut-card"
          onClick={() => {
            setPreviewCard(null);
            setActiveSection('banlist');
          }}
        >
          <div className="modern-shortcut-icon" style={{ background: '#FFF1F2', color: '#E11D48' }}>
            <Ban size={18} />
          </div>
          <div className="modern-shortcut-text">
            <span className="modern-shortcut-title">Forbidden &amp; Limited List</span>
            <span className="modern-shortcut-sub">
              Banlist de Março de 2010 ({forbiddenCount} Proibidas • {limitedCount} Limitadas • {semiLimitedCount} Semi)
            </span>
          </div>
          <ChevronRight size={16} className="modern-shortcut-chevron" />
        </button>

        <button
          type="button"
          className="modern-shortcut-card"
          onClick={() => {
            setPreviewCard(null);
            setActiveSection('league-rules');
          }}
        >
          <div className="modern-shortcut-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
            <Swords size={18} />
          </div>
          <div className="modern-shortcut-text">
            <span className="modern-shortcut-title">Regulamento da Liga</span>
            <span className="modern-shortcut-sub">Sistema Suíço, Pontuação, BY, Drop e Desempate</span>
          </div>
          <ChevronRight size={16} className="modern-shortcut-chevron" />
        </button>

        <button
          type="button"
          className="modern-shortcut-card"
          onClick={() => {
            setPreviewCard(null);
            setActiveSection('data-management');
          }}
        >
          <div className="modern-shortcut-icon" style={{ background: '#F0F9FF', color: '#0284C7' }}>
            <FileSpreadsheet size={18} />
          </div>
          <div className="modern-shortcut-text">
            <span className="modern-shortcut-title">Dados &amp; Backup</span>
            <span className="modern-shortcut-sub">Exportar ou importar CSV/JSON e zerar dados</span>
          </div>
          <ChevronRight size={16} className="modern-shortcut-chevron" />
        </button>
      </div>

      {/* Marca d'água / Assinatura discreta do Desenvolvedor */}
      <div
        style={{
          marginTop: '14px',
          padding: '12px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          opacity: 0.72,
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '1.5px',
            background: '#CBD5E1',
            borderRadius: '2px',
            marginBottom: '6px',
          }}
        />
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#64748B',
            letterSpacing: '0.02em',
          }}
        >
          Desenvolvido por <strong style={{ color: '#0D6E62', fontWeight: 800 }}>Caique Amaral</strong>
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#94A3B8',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Duel League • Edison Format Manager
        </span>
      </div>

      {/* Inputs de arquivo ocultos para CSV e JSON */}
      <input
        type="file"
        ref={csvFileInputRef}
        style={{ display: 'none' }}
        accept=".csv"
        onChange={handleImportCSVFile}
      />
      <input
        type="file"
        ref={jsonFileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleImportJSONFile}
      />

      {/* POP-UP MODAL DA OPÇÃO SELECIONADA */}
      {activeSection && (
        <div className="modal-backdrop" onClick={closeSectionModal}>
          <div
            className="modal-tournament-setup"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal (Muda dinamicamente caso uma carta da Banlist esteja aberta em detalhe) */}
            <div className="modal-setup-header">
              {activeSection === 'banlist' && previewCard ? (
                <div style={{ minWidth: 0 }}>
                  <h3 className="modal-setup-title" style={{ lineHeight: 1.25 }}>
                    {previewCard.name}
                  </h3>
                  <p className="modal-setup-subtitle">Detalhes da Carta na Banlist Edison</p>
                </div>
              ) : (
                <div>
                  <h3 className="modal-setup-title">{getSectionModalMeta(activeSection).title}</h3>
                  <p className="modal-setup-subtitle">{getSectionModalMeta(activeSection).subtitle}</p>
                </div>
              )}

              <button
                type="button"
                className="btn-close-modal"
                onClick={closeSectionModal}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Corpo Scrollável do Pop-up */}
            <div className="modal-setup-body" style={{ padding: '16px 18px', gap: '14px' }}>
              {/* SEÇÃO 1: REGRAS HISTÓRICAS DO EDISON FORMAT */}
              {activeSection === 'edison-rules' && (
                <div className="settings-section-container" style={{ marginTop: 0 }}>
                  <div className="edison-source-card" style={{ marginTop: 0 }}>
                    <div className="edison-source-info">
                      <span className="source-tag">FONTE OFICIAL: FORMAT LIBRARY</span>
                      <h3 className="source-title">O Que É o Edison Format?</h3>
                      <p className="source-description">
                        O Edison Format é um dos formatos retrô mais icônicos do Yu-Gi-Oh! TCG, fixado no tempo em torno do lendário <strong>75º Shonen Jump Championship (SJC Edison)</strong>, ocorrido em Edison, New Jersey, nos dias <strong>24 e 25 de abril de 2010</strong>.
                      </p>
                      <div className="source-meta-row">
                        <span className="source-meta-pill">
                          <Clock size={13} />
                          <span>Era 5D's (Master Rule 1)</span>
                        </span>
                        <span className="source-meta-pill">
                          <Layers size={13} />
                          <span>Coleções até Absolute Powerforce (ABPF)</span>
                        </span>
                        <span className="source-meta-pill">
                          <Ban size={13} />
                          <span>Banlist de Março de 2010</span>
                        </span>
                      </div>
                    </div>
                    <a
                      href="https://formatlibrary.com/formats/edison"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-external-source"
                      title="Abrir página oficial do Edison na Format Library"
                    >
                      <span>Acessar Format Library</span>
                      <ExternalLink size={16} />
                    </a>
                  </div>

                  <div className="rules-cards-grid" style={{ marginTop: 0 }}>
                    <div className="edison-rule-card highlight-card">
                      <div className="rule-card-header">
                        <h4>1. Prioridade de Invocação (Ignition Priority)</h4>
                      </div>
                      <p className="rule-card-text">
                        <strong>A regra mais importante e diferente do jogo atual:</strong> Em 2010, quando o jogador do turno invoca com sucesso um monstro com prioridade de efeito (efeito ativado manualmente na Main Phase), ele tem o direito de <strong>declarar a ativação do efeito como Elo 1 (Chain Link 1)</strong> antes que o oponente possa responder com cartas como <em>Bottomless Trap Hole</em>, <em>Torrential Tribute</em>, <em>Book of Moon</em> ou <em>Compulsory Evacuation Device</em>.
                      </p>
                      <div className="rule-example-box">
                        <strong>Exemplo Prático:</strong>
                        <p>
                          Você invoca <em>Judgment Dragon</em> ou <em>Chaos Sorcerer</em>. Você retém a prioridade e declara o efeito imediatamente (pagando 1000 PV ou mirando um monstro). Seu oponente só pode ativar <em>Torrential Tribute</em> ou <em>Bottomless Trap Hole</em> em Elo 2! O seu efeito resolverá mesmo que seu monstro seja destruído ou banido.
                        </p>
                      </div>
                    </div>

                    <div className="edison-rule-card">
                      <div className="rule-card-header">
                        <h4>2. Compra no 1º Turno (First Turn Draw)</h4>
                      </div>
                      <p className="rule-card-text">
                        O jogador que joga primeiro <strong>compra 1 carta</strong> em sua Draw Phase no primeiro turno do duelo (começando o turno com 6 cartas na mão). A regra moderna que proíbe comprar no turno 1 só foi introduzida em 2014.
                      </p>
                    </div>

                    <div className="edison-rule-card">
                      <div className="rule-card-header">
                        <h4>3. Regra de Magia de Campo Única</h4>
                      </div>
                      <p className="rule-card-text">
                        Só pode haver <strong>1 Magia de Campo ativa em toda a mesa</strong>. Se o oponente já tiver uma Magia de Campo em jogo e você ativar outra, a Magia de Campo do oponente é <strong>destruída por regra</strong> e enviada ao cemitério.
                      </p>
                    </div>

                    <div className="edison-rule-card">
                      <div className="rule-card-header">
                        <h4>4. Extra Deck de 15 Cartas nas Zonas Principais</h4>
                      </div>
                      <p className="rule-card-text">
                        Não existem Zonas Extras de Monstros (EMZ), nem Monstros Xyz, Pêndulo ou Link. Monstros Sincro e de Fusão são invocados diretamente em uma das <strong>5 Zonas Principais de Monstros</strong>. O Extra Deck tem limite máximo de 15 cartas.
                      </p>
                    </div>

                    <div className="edison-rule-card">
                      <div className="rule-card-header">
                        <h4>5. Textos Originais das Cartas (Pré-Errata)</h4>
                      </div>
                      <p className="rule-card-text">
                        Cartas que sofreram erratas em anos posteriores jogam no Edison Format com seus efeitos originais de 2010:
                      </p>
                      <ul className="rule-card-list">
                        <li>
                          <strong>Brain Control:</strong> Paga 800 PV para tomar o controle de qualquer monstro face-up do oponente até a End Phase (sem a restrição de monstro que possa ser Invocado por Invocação-Normal).
                        </li>
                        <li>
                          <strong>Future Fusion:</strong> Envia todos os monstros materiais do Deck para o Cemitério imediatamente na resolução da ativação da Magia Contínua.
                        </li>
                        <li>
                          <strong>Brionac, Dragon of the Ice Barrier:</strong> Não é "uma vez por turno" (você pode descartar quantas cartas quiser para retornar cartas ao campo).
                        </li>
                        <li>
                          <strong>Goyo Guardian:</strong> Materiais genéricos (1 Tuner + 1+ não-Tuners de qualquer atributo, sem restrição de TERRA).
                        </li>
                      </ul>
                    </div>

                    <div className="edison-rule-card">
                      <div className="rule-card-header">
                        <h4>6. Coleções &amp; Produtos Válidos</h4>
                      </div>
                      <p className="rule-card-text">
                        Apenas cards impressos em produtos TCG lançados até <strong>24 de abril de 2010</strong> são válidos. Coleções como <em>Absolute Powerforce (ABPF)</em>, <em>Stardust Overdrive (SOVR)</em>, <em>Duelist Pack Kaiba</em> e <em>Yusei 2</em> são válidas.
                      </p>
                      <p className="rule-card-text text-amber-300 mt-2">
                        ⚠️ A coleção <em>The Shining Darkness (TSHD)</em> foi lançada semanas depois nos EUA e <strong>NÃO</strong> é válida no Edison Format.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: FORBIDDEN & LIMITED LIST (Com visualização interna da carta sem pop-up duplo!) */}
              {activeSection === 'banlist' && (
                <div className="settings-section-container" style={{ marginTop: 0 }}>
                  {previewCard ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '8px 4px',
                      }}
                    >
                      <div className="card-modal-header-tags" style={{ justifyContent: 'center' }}>
                        <span className={`type-badge type-${previewCard.type}`}>
                          {previewCard.type === 'monster' ? 'Monstro' : previewCard.type === 'spell' ? 'Magia' : 'Armadilha'}
                        </span>
                        <span className="card-modal-status-text">
                          {previewCard.status === 'forbidden' && 'PROIBIDA (0 CÓPIAS)'}
                          {previewCard.status === 'limited' && 'LIMITADA (1 CÓPIA)'}
                          {previewCard.status === 'semi-limited' && 'SEMI-LIMITADA (2 CÓPIAS)'}
                        </span>
                      </div>

                      <img
                        src={`https://images.ygoprodeck.com/images/cards/${previewCard.cardId}.jpg`}
                        alt={previewCard.name}
                        className="card-modal-large-img"
                      />

                      <div className="card-modal-info">
                        <h4 className="card-modal-name">{previewCard.name}</h4>
                        <p className="card-modal-desc">
                          Status no Edison Format (Março de 2010): <strong>{previewCard.limit} {previewCard.limit === 1 ? 'cópia permitida' : 'cópias permitidas'}</strong> no Deck Principal, Adicional e Side combinados.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="banlist-header-card">
                        <div className="banlist-header-text">
                          <div className="banlist-badge-row">
                            <span className="banlist-badge-top">MARÇO DE 2010 (TCG)</span>
                            <span className="banlist-badge-source">FORMAT LIBRARY LOCK</span>
                          </div>
                          <h3 className="banlist-title">Lista de Proibidas &amp; Limitadas (Banlist)</h3>
                          <p className="banlist-subtitle">
                            Esta lista é fixa e oficial do Edison Format. Nenhuma carta recebe banimento ou liberação moderna.
                          </p>
                        </div>

                        <div className="banlist-counts-overview">
                          <div
                            className={`banlist-count-box forbidden ${banlistStatusFilter === 'forbidden' ? 'active' : ''}`}
                            onClick={() => setBanlistStatusFilter(banlistStatusFilter === 'forbidden' ? 'all' : 'forbidden')}
                          >
                            <span className="count-num">{forbiddenCount}</span>
                            <span className="count-label">Proibidas (0)</span>
                          </div>
                          <div
                            className={`banlist-count-box limited ${banlistStatusFilter === 'limited' ? 'active' : ''}`}
                            onClick={() => setBanlistStatusFilter(banlistStatusFilter === 'limited' ? 'all' : 'limited')}
                          >
                            <span className="count-num">{limitedCount}</span>
                            <span className="count-label">Limitadas (1)</span>
                          </div>
                          <div
                            className={`banlist-count-box semi-limited ${banlistStatusFilter === 'semi-limited' ? 'active' : ''}`}
                            onClick={() => setBanlistStatusFilter(banlistStatusFilter === 'semi-limited' ? 'all' : 'semi-limited')}
                          >
                            <span className="count-num">{semiLimitedCount}</span>
                            <span className="count-label">Semi-Limitadas (2)</span>
                          </div>
                        </div>
                      </div>

                      {/* Filtros da Banlist */}
                      <div className="banlist-controls-bar">
                        <div className="search-box banlist-search">
                          <Search size={18} className="search-icon" />
                          <input
                            type="text"
                            value={searchCardTerm}
                            onChange={(e) => setSearchCardTerm(e.target.value)}
                            placeholder="Pesquisar carta da banlist (ex: Brionac, Heavy Storm)..."
                          />
                        </div>

                        <div className="banlist-filter-pills">
                          <div className="filter-pill-group">
                            <button
                              className={`pill-btn ${banlistStatusFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setBanlistStatusFilter('all')}
                            >
                              Todas ({EDISON_BANLIST.length})
                            </button>
                            <button
                              className={`pill-btn pill-forbidden ${banlistStatusFilter === 'forbidden' ? 'active' : ''}`}
                              onClick={() => setBanlistStatusFilter('forbidden')}
                            >
                              Proibidas ({forbiddenCount})
                            </button>
                            <button
                              className={`pill-btn pill-limited ${banlistStatusFilter === 'limited' ? 'active' : ''}`}
                              onClick={() => setBanlistStatusFilter('limited')}
                            >
                              Limitadas ({limitedCount})
                            </button>
                            <button
                              className={`pill-btn pill-semi ${banlistStatusFilter === 'semi-limited' ? 'active' : ''}`}
                              onClick={() => setBanlistStatusFilter('semi-limited')}
                            >
                              Semi-Limitadas ({semiLimitedCount})
                            </button>
                          </div>

                          <div className="filter-pill-group type-filter-group">
                            <button
                              className={`pill-btn ${banlistTypeFilter === 'all' ? 'active' : ''}`}
                              onClick={() => setBanlistTypeFilter('all')}
                            >
                              Todos
                            </button>
                            <button
                              className={`pill-btn type-monster ${banlistTypeFilter === 'monster' ? 'active' : ''}`}
                              onClick={() => setBanlistTypeFilter('monster')}
                            >
                              Monstros
                            </button>
                            <button
                              className={`pill-btn type-spell ${banlistTypeFilter === 'spell' ? 'active' : ''}`}
                              onClick={() => setBanlistTypeFilter('spell')}
                            >
                              Magias
                            </button>
                            <button
                              className={`pill-btn type-trap ${banlistTypeFilter === 'trap' ? 'active' : ''}`}
                              onClick={() => setBanlistTypeFilter('trap')}
                            >
                              Armadilhas
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Grid de Cards da Banlist */}
                      <div className="banlist-cards-grid">
                        {filteredCards.length === 0 ? (
                          <div className="empty-banlist-box">
                            <HelpCircle size={32} className="text-muted" />
                            <p>Nenhuma carta encontrada com os filtros selecionados.</p>
                          </div>
                        ) : (
                          filteredCards.map((card) => {
                            const statusClass =
                              card.status === 'forbidden'
                                ? 'card-forbidden'
                                : card.status === 'limited'
                                ? 'card-limited'
                                : 'card-semi';

                            const statusLabel =
                              card.status === 'forbidden'
                                ? 'PROIBIDA (0)'
                                : card.status === 'limited'
                                ? 'LIMITADA (1)'
                                : 'SEMI-LIMITADA (2)';

                            const typeLabel =
                              card.type === 'monster'
                                ? 'Monstro'
                                : card.type === 'spell'
                                ? 'Magia'
                                : 'Armadilha';

                            return (
                              <div
                                key={card.name}
                                className={`banlist-card-item ${statusClass}`}
                                onClick={() => setPreviewCard(card)}
                                title="Clique para ver a imagem completa da carta"
                              >
                                <div className="banlist-card-image-wrap">
                                  <img
                                    src={card.imageUrl}
                                    alt={card.name}
                                    loading="lazy"
                                    className="banlist-card-img"
                                  />
                                  <span className={`banlist-stamp-limit ${statusClass}`}>
                                    {card.limit}
                                  </span>
                                </div>

                                <div className="banlist-card-info-box">
                                  <div className="banlist-item-status-bar">
                                    <span className="status-indicator-tag">
                                      {card.status === 'forbidden' && <Ban size={11} />}
                                      {card.status === 'limited' && <ShieldAlert size={11} />}
                                      {card.status === 'semi-limited' && <Layers size={11} />}
                                      <span>{statusLabel}</span>
                                    </span>
                                    <span className={`type-badge type-${card.type}`}>
                                      {typeLabel}
                                    </span>
                                  </div>
                                  <div className="banlist-item-name">{card.name}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* SEÇÃO 3: REGULAMENTO DA LIGA SUÍÇA */}
              {activeSection === 'league-rules' && (
                <div className="settings-section-container" style={{ marginTop: 0 }}>
                  <div className="rules-list">
                    <div className="rule-item">
                      <div className="rule-item-header">
                        <span className="rule-badge">Bo3</span>
                        <strong>Confrontos Melhor de 3</strong>
                      </div>
                      <p className="rule-item-text">
                        Cada rodada é disputada em melhor de 3 partidas (até 2 vitórias de um duelista).
                      </p>
                    </div>

                    <div className="rule-item">
                      <div className="rule-item-header">
                        <span className="rule-badge">Pontos</span>
                        <strong>Sistema de Pontuação da Partida</strong>
                      </div>
                      <div className="rule-item-list">
                        <div>• <strong>Vitória (2x0, 2x1 ou 3x0):</strong> 3 pontos</div>
                        <div>• <strong>Empate (1x1 ou 0x0 no tempo):</strong> 1 ponto</div>
                        <div>• <strong>Vitória por W.O.:</strong> 3 pontos</div>
                        <div>• <strong>Derrota:</strong> 0 pontos</div>
                      </div>
                    </div>

                    <div className="rule-item">
                      <div className="rule-item-header">
                        <span className="rule-badge">BY</span>
                        <strong>Regra do BY (Folga por Número Ímpar)</strong>
                      </div>
                      <p className="rule-item-text">
                        Quando o número de duelistas ativos for ímpar, 1 duelista recebe folga automática (BY) na rodada, computando vitória de 3 pontos (com saldo 0 no desempate de games).
                      </p>
                      <div className="rule-item-highlight-note">
                        ★ <strong>Penalidade de Desempate:</strong> Em caso de empate de pontos no ranking final do torneio, o duelista que recebeu BY tem a menor prioridade no desempate entre os empatados.
                      </div>
                    </div>

                    <div className="rule-item">
                      <div className="rule-item-header">
                        <span className="rule-badge">Suíço</span>
                        <strong>Pareamento Suíço &amp; Pair-Down</strong>
                      </div>
                      <div className="rule-item-list">
                        <div>• <strong>Rodada 1:</strong> Sorteio aleatório entre os inscritos.</div>
                        <div>• <strong>Rodadas 2+:</strong> Duelistas enfrentam oponentes com a mesma pontuação acumulada.</div>
                        <div>• <strong>Pair-Down:</strong> Se sobrar número ímpar em um grupo de pontuação, o duelista é pareado com o jogador mais bem classificado do grupo imediatamente abaixo.</div>
                        <div>• <strong>Bloqueio de Repetição:</strong> Confrontos repetidos entre os mesmos duelistas são bloqueados no mesmo torneio.</div>
                      </div>
                    </div>

                    <div className="rule-item">
                      <div className="rule-item-header">
                        <span className="rule-badge">TCG Tie</span>
                        <strong>Desempate Oficial do Torneio</strong>
                      </div>
                      <p className="rule-item-text">
                        Quando dois ou mais duelistas terminam um torneio com a mesma pontuação, a classificação é definida estritamente por:
                      </p>
                      <div className="rule-item-list">
                        <div>1. <strong>Pontuação Total:</strong> 3 pts por vitória/WO/BY, 1 pt por empate, 0 por derrota.</div>
                        <div>2. <strong>Penalidade de BY:</strong> Quem jogou todas as rodadas na mesa tem prioridade sobre quem recebeu BY.</div>
                        <div>3. <strong>OMW% (Opponents' Match Win %):</strong> Força de tabela dos adversários enfrentados (piso oficial TCG de 33%).</div>
                        <div>4. <strong>Saldo de Games:</strong> Diferencial de vitórias e derrotas em games individuais.</div>
                        <div>5. <strong>Confronto Direto (Head-to-Head):</strong> Vencedor do duelo direto entre os empatados.</div>
                        <div>6. <strong>Aproveitamento de Games:</strong> PGW% (games do jogador) e OGW% (games dos oponentes).</div>
                      </div>
                    </div>

                    <div className="rule-item">
                      <div className="rule-item-header">
                        <span className="rule-badge" style={{ background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}>Drop</span>
                        <strong>Regra de Desistência (Drop no Torneio)</strong>
                      </div>
                      <div className="rule-item-list">
                        <div>• Um duelista pode solicitar o Drop a qualquer momento durante o torneio em andamento.</div>
                        <div>• <strong>Preservação Integral de Pontos:</strong> O duelista mantém todos os pontos, vitórias e saldo obtidos até a rodada em que participou, permanecendo na classificação final com sua pontuação conquistada.</div>
                        <div>• <strong>Exclusão de Pareamento:</strong> O jogador dropado é automaticamente excluído dos sorteios das rodadas subsequentes.</div>
                      </div>
                    </div>

                    <div className="rule-item highlight-rule">
                      <div className="rule-item-header">
                        <span className="rule-badge" style={{ background: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' }}>Liga Geral</span>
                        <strong>Desempate da Classificação Geral</strong>
                      </div>
                      <p className="rule-item-text">
                        Quando duelistas acumulam os mesmos pontos na tabela geral da temporada, o desempate premia conquistas e regularidade histórica:
                      </p>
                      <div className="rule-item-list">
                        <div>1. <strong>Pontos Acumulados na Liga</strong></div>
                        <div>2. <strong>Títulos de Campeão de Torneio:</strong> Maior número de 1º lugares conquistados na temporada.</div>
                        <div>3. <strong>Critério Olímpico de Colocações:</strong> Mais 2º lugares, mais 3º lugares ou melhor colocação máxima alcançada.</div>
                        <div>4. <strong>Mais Vitórias em Partidas (Matches)</strong></div>
                        <div>5. <strong>Menos Derrotas Acumuladas</strong></div>
                        <div>6. <strong>Menor Quantidade de BYs Recebidos</strong></div>
                        <div>7. <strong>Maior Win Rate Geral (% de vitórias)</strong></div>
                        <div>8. <strong>Mais Participações em Torneios</strong></div>
                        <div>9. <strong>Ordem Alfabética:</strong> Aplicada exclusivamente como último recurso se todos os critérios anteriores forem 100% idênticos.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO 4: DADOS & BACKUP */}
              {activeSection === 'data-management' && (
                <div className="settings-section-container" style={{ marginTop: 0 }}>
                  <p className="text-muted text-sm" style={{ margin: 0, textAlign: 'justify', lineHeight: 1.5 }}>
                    Você pode sincronizar os duelistas diretamente com o arquivo <code>jogadores.csv</code> ou exportar o backup completo de torneios e histórico da liga em formato JSON.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      id="btn-export-csv-settings"
                      className="btn-secondary-action"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                      onClick={handleExportCSV}
                    >
                      <Download size={18} />
                      <span>Exportar Jogadores (CSV)</span>
                    </button>

                    <button
                      id="btn-import-csv-settings"
                      className="btn-secondary-action"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                      onClick={() => csvFileInputRef.current?.click()}
                    >
                      <Upload size={18} />
                      <span>Importar Jogadores (CSV)</span>
                    </button>

                    <button
                      id="btn-export-json-settings"
                      className="btn-secondary-action"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                      onClick={handleExportJSON}
                    >
                      <FileJson size={18} />
                      <span>Exportar Backup Completo (JSON)</span>
                    </button>

                    <button
                      id="btn-import-json-settings"
                      className="btn-secondary-action"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                      onClick={() => jsonFileInputRef.current?.click()}
                    >
                      <Upload size={18} />
                      <span>Importar Backup (JSON)</span>
                    </button>

                    <button
                      id="btn-clear-all-data"
                      className="btn-danger-ghost"
                      style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', marginTop: '4px' }}
                      onClick={handleClearAllData}
                    >
                      <RotateCcw size={18} />
                      <span>Zerar Dados (Começar do Zero)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Pop-up */}
            <div className="modal-setup-footer">
              {activeSection === 'banlist' && previewCard ? (
                <button
                  type="button"
                  className="btn-modal-submit-tournament"
                  style={{ width: '100%' }}
                  onClick={() => setPreviewCard(null)}
                >
                  <ArrowLeft size={16} />
                  <span>Voltar para a Banlist</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-modal-cancel"
                  style={{ width: '100%', textAlign: 'center' }}
                  onClick={closeSectionModal}
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
