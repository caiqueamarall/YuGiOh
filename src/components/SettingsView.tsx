import React, { useState, useRef } from 'react';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  BookOpen,
  Smartphone,
  FileJson,
  FileSpreadsheet,
  Ban,
  ShieldAlert,
  Search,
  ExternalLink,
  Flame,
  Swords,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
  Zap,
  X
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

type SettingsSection = 'edison-rules' | 'banlist' | 'league-rules' | 'mobile-guide' | 'data-management';

export const SettingsView: React.FC<SettingsViewProps> = ({
  players,
  onReloadAllData,
  onImportPlayers,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('edison-rules');

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

  return (
    <div className="view-container">
      {/* Banner Principal */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-tag">
            <Settings size={14} className="text-gold" />
            <span>AJUSTES & REGRAS OFICIAIS</span>
          </div>
          <h2 className="hero-title">Guia Edison & Banlist</h2>
          <p className="hero-subtitle hide-on-xs">
            Regras históricas, banlist de Março de 2010, regulamento e backups.
          </p>
        </div>
      </div>

      {/* Navegação por Abas das Configurações */}
      <div className="settings-nav-tabs">
        <button
          className={`settings-nav-tab ${activeSection === 'edison-rules' ? 'active' : ''}`}
          onClick={() => setActiveSection('edison-rules')}
        >
          <BookOpen size={16} />
          <span>Regras Edison (2010)</span>
        </button>

        <button
          className={`settings-nav-tab ${activeSection === 'banlist' ? 'active' : ''}`}
          onClick={() => setActiveSection('banlist')}
        >
          <Ban size={16} />
          <span>Forbidden & Limited List</span>
        </button>

        <button
          className={`settings-nav-tab ${activeSection === 'league-rules' ? 'active' : ''}`}
          onClick={() => setActiveSection('league-rules')}
        >
          <Swords size={16} />
          <span>Regulamento da Liga</span>
        </button>

        <button
          className={`settings-nav-tab ${activeSection === 'mobile-guide' ? 'active' : ''}`}
          onClick={() => setActiveSection('mobile-guide')}
        >
          <Smartphone size={16} />
          <span>App no Celular</span>
        </button>

        <button
          className={`settings-nav-tab ${activeSection === 'data-management' ? 'active' : ''}`}
          onClick={() => setActiveSection('data-management')}
        >
          <FileSpreadsheet size={16} />
          <span>Dados & Backup</span>
        </button>
      </div>

      {/* SEÇÃO 1: REGRAS HISTÓRICAS DO EDISON FORMAT (FORMAT LIBRARY) */}
      {activeSection === 'edison-rules' && (
        <div className="settings-section-container">
          <div className="edison-source-card">
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

          <div className="rules-cards-grid">
            {/* Prioridade de Invocação */}
            <div className="edison-rule-card highlight-card">
              <div className="rule-card-header">
                <Zap size={20} className="text-gold" />
                <h4>1. Prioridade de Invocação (Ignition Priority)</h4>
              </div>
              <p className="rule-card-text">
                <strong>A regra mais importante e diferente do jogo atual:</strong> Em 2010, quando o jogador do turno invoca com sucesso um monstro com efeito de ignição (efeito ativado manualmente na Main Phase), ele tem o direito de <strong>declarar a ativação do efeito de ignição como Elo 1 (Chain Link 1)</strong> antes que o oponente possa responder com cartas como <em>Bottomless Trap Hole</em>, <em>Torrential Tribute</em>, <em>Book of Moon</em> ou <em>Compulsory Evacuation Device</em>.
              </p>
              <div className="rule-example-box">
                <strong>Exemplo Prático:</strong>
                <p>
                  Você invoca <em>Judgment Dragon</em> ou <em>Chaos Sorcerer</em>. Você retém a prioridade e declara o efeito imediatamente (pagando 1000 PV ou mirando um monstro). Seu oponente só pode ativar <em>Torrential Tribute</em> ou <em>Bottomless Trap Hole</em> em Elo 2! O seu efeito resolverá mesmo que seu monstro seja destruído ou banido.
                </p>
              </div>
            </div>

            {/* Compra no Primeiro Turno */}
            <div className="edison-rule-card">
              <div className="rule-card-header">
                <Sparkles size={20} className="text-cyan-400" />
                <h4>2. Compra no 1º Turno (First Turn Draw)</h4>
              </div>
              <p className="rule-card-text">
                O jogador que joga primeiro <strong>compra 1 carta normalmente</strong> em sua Draw Phase no primeiro turno do duelo (começando o turno com 6 cartas na mão). A regra moderna que proíbe comprar no turno 1 só foi introduzida em 2014.
              </p>
            </div>

            {/* Regra de Magia de Campo */}
            <div className="edison-rule-card">
              <div className="rule-card-header">
                <Flame size={20} className="text-amber-400" />
                <h4>3. Regra de Magia de Campo Única</h4>
              </div>
              <p className="rule-card-text">
                Só pode haver <strong>1 Magia de Campo ativa em toda a mesa</strong>. Se o oponente já tiver uma Magia de Campo em jogo e você ativar outra, a Magia de Campo do oponente é <strong>destruída por regra</strong> e enviada ao cemitério.
              </p>
            </div>

            {/* Extra Deck nas Zonas Principais */}
            <div className="edison-rule-card">
              <div className="rule-card-header">
                <Layers size={20} className="text-purple-400" />
                <h4>4. Extra Deck de 15 Cartas nas Zonas Principais</h4>
              </div>
              <p className="rule-card-text">
                Não existem Zonas Extras de Monstros (EMZ), nem Monstros Xyz, Pêndulo ou Link. Monstros Sincro e de Fusão são invocados diretamente em uma das <strong>5 Zonas Principais de Monstros</strong>. O Extra Deck tem limite máximo de 15 cartas.
              </p>
            </div>

            {/* Textos Pré-Errata */}
            <div className="edison-rule-card">
              <div className="rule-card-header">
                <HelpCircle size={20} className="text-green-400" />
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

            {/* Card Pool Válido */}
            <div className="edison-rule-card">
              <div className="rule-card-header">
                <Clock size={20} className="text-gold" />
                <h4>6. Coleções & Produtos Válidos</h4>
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

      {/* SEÇÃO 2: FORBIDDEN & LIMITED LIST (MARÇO DE 2010) */}
      {activeSection === 'banlist' && (
        <div className="settings-section-container">
          <div className="banlist-header-card">
            <div className="banlist-header-text">
              <div className="banlist-badge-row">
                <span className="banlist-badge-top">MARÇO DE 2010 (TCG)</span>
                <span className="banlist-badge-source">FORMAT LIBRARY LOCK</span>
              </div>
              <h3 className="banlist-title">Lista de Proibidas & Limitadas (Banlist)</h3>
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
                placeholder="Pesquisar carta da banlist (ex: Brionac, Heavy Storm, Dandylion)..."
              />
            </div>

            <div className="banlist-filter-pills">
              {/* Status */}
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

              {/* Tipo de Carta */}
              <div className="filter-pill-group">
                <button
                  className={`pill-btn ${banlistTypeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setBanlistTypeFilter('all')}
                >
                  Todos Tipos
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
        </div>
      )}

      {/* SEÇÃO 3: REGULAMENTO DA LIGA SUÍÇA */}
      {activeSection === 'league-rules' && (
        <div className="settings-section-container">
          <div className="settings-card">
            <div className="settings-card-header">
              <Swords size={20} className="text-gold" />
              <h3>Regulamento Oficial da Liga (Torneio Suíço Edison)</h3>
            </div>

            <div className="rules-list">
              <div className="rule-item">
                <span className="rule-badge">Bo3</span>
                <div>
                  <strong>Confrontos Melhor de 3:</strong>
                  <p>Cada rodada é disputada em melhor de 3 partidas (até 2 vitórias de um duelista).</p>
                </div>
              </div>

              <div className="rule-item">
                <span className="rule-badge">Pontos</span>
                <div>
                  <strong>Sistema de Pontuação da Partida:</strong>
                  <p>
                    • <strong>2 vitórias (2x0 ou 2x1)</strong> = <strong>3 pontos</strong><br />
                    • <strong>1 vitória (1x1 empate de tempo ou 1x0)</strong> = <strong>1 ponto</strong><br />
                    • <strong>WO</strong> = <strong>3 pontos</strong><br />
                    • <strong>Derrota</strong> = <strong>0 pontos</strong>
                  </p>
                </div>
              </div>

              <div className="rule-item">
                <span className="rule-badge">BY</span>
                <div>
                  <strong>Regra do BY - Folga por número ímpar:</strong>
                  <p>
                    Quando o número de duelistas ativos for ímpar, 1 duelista recebe folga automática (BY) na rodada, computando vitória de 3 pontos (2-0).<br />
                    <span className="text-gold">
                      ★ <strong>Penalidade de Desempate:</strong> Em caso de empate de pontos no ranking final do torneio, o duelista que recebeu BY tem a menor prioridade no desempate entre os empatados.
                    </span>
                  </p>
                </div>
              </div>

              <div className="rule-item">
                <span className="rule-badge">Suíço</span>
                <div>
                  <strong>Pareamento Suíço & Pair-Down:</strong>
                  <p>
                    • <strong>Rodada 1:</strong> Sorteio aleatório.<br />
                    • <strong>Rodadas 2+:</strong> Vencedores enfrentam vencedores, perdedores enfrentam perdedores no mesmo bracket de pontuação.<br />
                    • <strong>Pair-Down:</strong> Se sobrar ímpar em um bracket, o duelista é pareado com o jogador mais pontuado do bracket logo abaixo (maior saldo de games ganhos).<br />
                    • Confrontos repetidos entre os mesmos duelistas são bloqueados no mesmo torneio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: APLICATIVO EXECUTÁVEL DE CELULAR */}
      {activeSection === 'mobile-guide' && (
        <div className="settings-section-container">
          <div className="settings-card">
            <div className="settings-card-header">
              <Smartphone size={20} className="text-cyan-400" />
              <h3>Como Executar em Celular (PWA & APK Android)</h3>
            </div>

            <div className="mobile-guide-content">
              <p className="guide-intro">
                O projeto foi construído com design mobile-first e pode ser executado em celulares de duas formas práticas:
              </p>

              <div className="guide-step-card">
                <div className="step-number">Opção 1</div>
                <div>
                  <h4>Instalar como PWA (Mais Rápido e Sem Compilação)</h4>
                  <p>
                    Acesse a URL do projeto pelo navegador do smartphone (Chrome no Android ou Safari no iPhone) na mesma rede Wi-Fi e toque em <strong>"Adicionar à Tela de Início"</strong>. O aplicativo funcionará em tela cheia com ícone próprio e sem barra de navegação do browser.
                  </p>
                </div>
              </div>

              <div className="guide-step-card">
                <div className="step-number">Opção 2</div>
                <div>
                  <h4>Gerar Aplicativo Nativo Android (.apk) com Capacitor</h4>
                  <p>
                    Caso queira gerar um executável nativo <code>.apk</code> para instalar no Android, execute no terminal do projeto:
                  </p>
                  <div className="code-snippet-box">
                    <code>
                      npm run build<br />
                      npm install @capacitor/core @capacitor/cli @capacitor/android<br />
                      npx cap init "YuGiOh Edison" "com.yugioh.edison"<br />
                      npx cap add android<br />
                      npx cap copy<br />
                      npx cap open android
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 5: DADOS & BACKUP */}
      {activeSection === 'data-management' && (
        <div className="settings-section-container">
          <div className="settings-card">
            <div className="settings-card-header">
              <FileSpreadsheet size={20} className="text-gold" />
              <h3>Armazenamento, Exportação e Limpeza de Dados</h3>
            </div>

            <p className="text-muted text-sm mb-4">
              Você pode sincronizar os duelistas diretamente com o arquivo <code>jogadores.csv</code> salvo na pasta do projeto, ou exportar o backup completo de torneios em formato JSON.
            </p>

            <div className="backup-buttons-row">
              <button id="btn-export-csv-settings" className="btn-secondary-action" onClick={handleExportCSV}>
                <Download size={18} />
                <span>Exportar Jogadores (CSV)</span>
              </button>

              <button
                id="btn-import-csv-settings"
                className="btn-secondary-action"
                onClick={() => csvFileInputRef.current?.click()}
              >
                <Upload size={18} />
                <span>Importar Jogadores (CSV)</span>
              </button>

              <input
                type="file"
                ref={csvFileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleImportCSVFile}
              />

              <button id="btn-export-json-settings" className="btn-secondary-action" onClick={handleExportJSON}>
                <FileJson size={18} />
                <span>Exportar Backup Completo (JSON)</span>
              </button>

              <button
                id="btn-import-json-settings"
                className="btn-secondary-action"
                onClick={() => jsonFileInputRef.current?.click()}
              >
                <Upload size={18} />
                <span>Importar Backup (JSON)</span>
              </button>

              <input
                type="file"
                ref={jsonFileInputRef}
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleImportJSONFile}
              />

              <button
                id="btn-clear-all-data"
                className="btn-danger-ghost"
                onClick={handleClearAllData}
              >
                <RotateCcw size={18} />
                <span>Zerar Dados (Começar do Zero)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização da Carta em Alta Resolução */}
      {previewCard && (
        <div className="modal-backdrop" onClick={() => setPreviewCard(null)}>
          <div className="modal-card card-preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-modal-header-tags">
                <span className={`type-badge type-${previewCard.type}`}>
                  {previewCard.type === 'monster' ? 'Monstro' : previewCard.type === 'spell' ? 'Magia' : 'Armadilha'}
                </span>
                <span className="card-modal-status-text">
                  {previewCard.status === 'forbidden' && 'PROIBIDA (0 CÓPIAS)'}
                  {previewCard.status === 'limited' && 'LIMITADA (1 CÓPIA)'}
                  {previewCard.status === 'semi-limited' && 'SEMI-LIMITADA (2 CÓPIAS)'}
                </span>
              </div>
              <button className="btn-modal-close" onClick={() => setPreviewCard(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="card-modal-body">
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
          </div>
        </div>
      )}
    </div>
  );
};
