import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Layers,
  Plus,
  Minus,
  Trash2,
  Search,
  Check,
  AlertTriangle,
  Copy,
  Upload,
  ArrowRightLeft,
  Info,
  Edit2,
  Save,
  LayoutGrid,
  List,
} from 'lucide-react';
import type { Decklist, DeckCardItem } from '../types';
import {
  searchEdisonCards,
  getCardBanlistLimit,
  getCardBanlistStatus,
  getCardCategory,
  isExtraDeckCard,
  getCardSmallImageUrl,
  getCardFullImageUrl,
  getEdisonCardByName,
  getDecklistStats,
  type EdisonCard,
  type CardCategory,
} from '../utils/cardDatabase';

interface DecklistModalProps {
  decklist?: Decklist | null;
  playerName: string;
  defaultDeckName?: string;
  onSave?: (updatedDecklist: Decklist) => void;
  onClose: () => void;
  readOnly?: boolean;
}

interface SimulatorCard {
  instanceId: string;
  cardId: number;
  cardName: string;
  category: 'monster' | 'spell' | 'trap' | 'extra';
  type: string;
  atk?: number;
  def?: number;
  level?: number;
  banLimit: number;
}

export const DecklistModal: React.FC<DecklistModalProps> = ({
  decklist,
  playerName,
  defaultDeckName,
  onSave,
  onClose,
  readOnly = false,
}) => {
  const canEdit = !!onSave && !readOnly;
  const [isEditingName, setIsEditingName] = useState<boolean>(false);

  const [deckName, setDeckName] = useState<string>(
    decklist?.deckName || defaultDeckName || 'Edison Deck'
  );

  const [mainDeck, setMainDeck] = useState<DeckCardItem[]>(() =>
    decklist?.mainDeck ? JSON.parse(JSON.stringify(decklist.mainDeck)) : []
  );
  const [extraDeck, setExtraDeck] = useState<DeckCardItem[]>(() =>
    decklist?.extraDeck ? JSON.parse(JSON.stringify(decklist.extraDeck)) : []
  );
  const [sideDeck, setSideDeck] = useState<DeckCardItem[]>(() =>
    decklist?.sideDeck ? JSON.parse(JSON.stringify(decklist.sideDeck)) : []
  );

  // ABA ATIVA: "visual" (Visão Geral) é a PRIMEIRA e PADRÃO!
  const [activeTab, setActiveTab] = useState<'visual' | 'search' | 'list'>('visual');

  // Filtro na Lista Detalhada
  const [listSection, setListSection] = useState<'all' | 'main' | 'extra' | 'side'>('all');

  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CardCategory>('all');

  // Modal de Detalhes da Carta expandida
  const [previewCard, setPreviewCard] = useState<EdisonCard | null>(null);
  const [previewSection, setPreviewSection] = useState<'main' | 'extra' | 'side' | null>(null);

  // Modal de Importação / Exportação
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Objeto temporário de Decklist para cálculo de estatísticas
  const currentDecklistObj: Decklist = useMemo(
    () => ({
      deckName,
      mainDeck,
      extraDeck,
      sideDeck,
    }),
    [deckName, mainDeck, extraDeck, sideDeck]
  );

  const stats = useMemo(() => getDecklistStats(currentDecklistObj), [currentDecklistObj]);

  const searchResults = useMemo(() => {
    return searchEdisonCards(searchQuery, {
      category: selectedCategory,
      limit: searchQuery.trim().length > 0 ? 60 : 30,
    });
  }, [searchQuery, selectedCategory]);

  const cardCountsMap = useMemo(() => {
    const map = new Map<number, { main: number; extra: number; side: number; total: number }>();
    const tally = (items: DeckCardItem[], section: 'main' | 'extra' | 'side') => {
      for (const item of items) {
        const cur = map.get(item.cardId) || { main: 0, extra: 0, side: 0, total: 0 };
        cur[section] += item.count || 1;
        cur.total += item.count || 1;
        map.set(item.cardId, cur);
      }
    };
    tally(mainDeck, 'main');
    tally(extraDeck, 'extra');
    tally(sideDeck, 'side');
    return map;
  }, [mainDeck, extraDeck, sideDeck]);

  // Prepara as cartas expandidas por cópia individual e ordenadas como no simulador oficial (Print 3)
  const simulatorData = useMemo(() => {
    // 1. MAIN DECK
    const mainList: SimulatorCard[] = [];
    (mainDeck || []).forEach((item, itemIdx) => {
      const cardObj = getEdisonCardByName(item.cardName);
      const cat = cardObj ? getCardCategory(cardObj) : 'monster';
      const banLimit = getCardBanlistLimit(item.cardName);
      const count = item.count || 1;

      for (let c = 0; c < count; c++) {
        mainList.push({
          instanceId: `main-${item.cardId}-${itemIdx}-${c}`,
          cardId: item.cardId,
          cardName: item.cardName,
          category: cat === 'extra' ? 'monster' : cat,
          type: cardObj?.type || 'Monster',
          atk: cardObj?.atk,
          def: cardObj?.def,
          level: cardObj?.level,
          banLimit,
        });
      }
    });

    // Ordenação do Main Deck: 1º Monstros, 2º Magias, 3º Armadilhas, e por nome em cada grupo
    const catWeight = { monster: 1, spell: 2, trap: 3, extra: 4 };
    mainList.sort((a, b) => {
      if (catWeight[a.category] !== catWeight[b.category]) {
        return catWeight[a.category] - catWeight[b.category];
      }
      return a.cardName.localeCompare(b.cardName);
    });

    // 2. EXTRA DECK
    const extraList: SimulatorCard[] = [];
    (extraDeck || []).forEach((item, itemIdx) => {
      const cardObj = getEdisonCardByName(item.cardName);
      const banLimit = getCardBanlistLimit(item.cardName);
      const count = item.count || 1;

      for (let c = 0; c < count; c++) {
        extraList.push({
          instanceId: `extra-${item.cardId}-${itemIdx}-${c}`,
          cardId: item.cardId,
          cardName: item.cardName,
          category: 'extra',
          type: cardObj?.type || 'Fusion / Synchro',
          atk: cardObj?.atk,
          def: cardObj?.def,
          level: cardObj?.level,
          banLimit,
        });
      }
    });

    // Ordena Extra: Synchros primeiro, depois Fusões, alfabético
    extraList.sort((a, b) => {
      const isASynchro = a.type.toLowerCase().includes('synchro');
      const isBSynchro = b.type.toLowerCase().includes('synchro');
      if (isASynchro && !isBSynchro) return -1;
      if (!isASynchro && isBSynchro) return 1;
      return a.cardName.localeCompare(b.cardName);
    });

    // 3. SIDE DECK
    const sideList: SimulatorCard[] = [];
    (sideDeck || []).forEach((item, itemIdx) => {
      const cardObj = getEdisonCardByName(item.cardName);
      const cat = cardObj ? getCardCategory(cardObj) : 'monster';
      const banLimit = getCardBanlistLimit(item.cardName);
      const count = item.count || 1;

      for (let c = 0; c < count; c++) {
        sideList.push({
          instanceId: `side-${item.cardId}-${itemIdx}-${c}`,
          cardId: item.cardId,
          cardName: item.cardName,
          category: cat,
          type: cardObj?.type || 'Card',
          atk: cardObj?.atk,
          def: cardObj?.def,
          level: cardObj?.level,
          banLimit,
        });
      }
    });

    sideList.sort((a, b) => {
      if (catWeight[a.category] !== catWeight[b.category]) {
        return catWeight[a.category] - catWeight[b.category];
      }
      return a.cardName.localeCompare(b.cardName);
    });

    return { mainList, extraList, sideList };
  }, [mainDeck, extraDeck, sideDeck]);

  // Ações de Manipulação
  const handleAddCard = (card: EdisonCard, destination: 'main' | 'extra' | 'side') => {
    const banLimit = getCardBanlistLimit(card.name);
    const counts = cardCountsMap.get(card.id) || { main: 0, extra: 0, side: 0, total: 0 };

    if (counts.total >= banLimit) {
      alert(`"${card.name}" já atingiu o limite de ${banLimit} cópia(s) para o formato Edison.`);
      return;
    }

    if (destination === 'extra' && !isExtraDeckCard(card)) {
      alert('Apenas monstros de Fusão ou Synchro podem ser colocados no Extra Deck.');
      return;
    }

    if (destination === 'main' && isExtraDeckCard(card)) {
      alert('Monstros do Extra Deck (Synchro/Fusão) devem ser adicionados ao Extra Deck.');
      return;
    }

    const updater = (prev: DeckCardItem[]) => {
      const idx = prev.findIndex((i) => i.cardId === card.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], count: (copy[idx].count || 1) + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          cardId: card.id,
          cardName: card.name,
          count: 1,
          type: card.type,
          atk: card.atk,
          def: card.def,
          level: card.level,
          desc: card.desc,
        },
      ];
    };

    if (destination === 'main') setMainDeck(updater);
    else if (destination === 'extra') setExtraDeck(updater);
    else setSideDeck(updater);
  };

  const handleChangeCount = (cardId: number, section: 'main' | 'extra' | 'side', delta: number) => {
    const updater = (list: DeckCardItem[]) => {
      const idx = list.findIndex((i) => i.cardId === cardId);
      if (idx === -1) return list;
      const item = list[idx];
      const newCount = (item.count || 1) + delta;
      if (newCount <= 0) return list.filter((i) => i.cardId !== cardId);

      if (delta > 0) {
        const banLimit = getCardBanlistLimit(item.cardName);
        const counts = cardCountsMap.get(cardId) || { main: 0, extra: 0, side: 0, total: 0 };
        if (counts.total >= banLimit) {
          alert(`"${item.cardName}" atingiu o limite de ${banLimit} cópia(s).`);
          return list;
        }
      }
      const copy = [...list];
      copy[idx] = { ...item, count: newCount };
      return copy;
    };

    if (section === 'main') setMainDeck(updater);
    else if (section === 'extra') setExtraDeck(updater);
    else setSideDeck(updater);
  };

  const handleRemoveCard = (cardId: number, section: 'main' | 'extra' | 'side') => {
    if (section === 'main') setMainDeck((prev) => prev.filter((i) => i.cardId !== cardId));
    else if (section === 'extra') setExtraDeck((prev) => prev.filter((i) => i.cardId !== cardId));
    else setSideDeck((prev) => prev.filter((i) => i.cardId !== cardId));
  };

  const handleMoveCard = (item: DeckCardItem, from: 'main' | 'extra' | 'side', to: 'main' | 'extra' | 'side') => {
    handleChangeCount(item.cardId, from, -1);
    const cardObj = getEdisonCardByName(item.cardName);
    if (cardObj) {
      handleAddCard(cardObj, to);
    }
  };

  const handleSaveDecklist = () => {
    if (!onSave) return;
    const finalDecklist: Decklist = {
      deckName: deckName.trim() || 'Edison Deck',
      mainDeck,
      extraDeck,
      sideDeck,
      mainCount: stats.mainTotal,
      extraCount: stats.extraTotal,
      sideCount: stats.sideTotal,
      updatedAt: new Date().toISOString(),
    };
    onSave(finalDecklist);
    setIsEditingName(false);
  };

  const handleCopyDecklistText = () => {
    let text = `=== DECKLIST: ${deckName} (${playerName}) ===\n\n`;

    text += `--- MAIN DECK (${stats.mainTotal}) ---\n`;
    mainDeck.forEach((c) => {
      text += `${c.count}x ${c.cardName}\n`;
    });

    text += `\n--- EXTRA DECK (${stats.extraTotal}) ---\n`;
    extraDeck.forEach((c) => {
      text += `${c.count}x ${c.cardName}\n`;
    });

    text += `\n--- SIDE DECK (${stats.sideTotal}) ---\n`;
    sideDeck.forEach((c) => {
      text += `${c.count}x ${c.cardName}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleImportText = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    let currentTarget: 'main' | 'extra' | 'side' = 'main';

    const newMain: DeckCardItem[] = [];
    const newExtra: DeckCardItem[] = [];
    const newSide: DeckCardItem[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (lower.includes('main deck') || lower.includes('#main')) {
        currentTarget = 'main';
        continue;
      }
      if (lower.includes('extra deck') || lower.includes('#extra')) {
        currentTarget = 'extra';
        continue;
      }
      if (lower.includes('side deck') || lower.includes('#side')) {
        currentTarget = 'side';
        continue;
      }

      const match = line.match(/^(\d+)[xX\s]+(.*)$/);
      let count = 1;
      let cardName = line;

      if (match) {
        count = Math.min(3, Math.max(1, parseInt(match[1], 10)));
        cardName = match[2].trim();
      }

      const found = getEdisonCardByName(cardName);
      if (found) {
        const item: DeckCardItem = {
          cardId: found.id,
          cardName: found.name,
          count,
          type: found.type,
          atk: found.atk,
          def: found.def,
          level: found.level,
          desc: found.desc,
        };

        if (currentTarget === 'extra' || isExtraDeckCard(found)) {
          newExtra.push(item);
        } else if (currentTarget === 'side') {
          newSide.push(item);
        } else {
          newMain.push(item);
        }
      }
    }

    if (newMain.length > 0 || newExtra.length > 0 || newSide.length > 0) {
      setMainDeck(newMain);
      setExtraDeck(newExtra);
      setSideDeck(newSide);
      setShowImportModal(false);
      setImportText('');
      alert(`Deck importado: ${newMain.length} cartas Main, ${newExtra.length} Extra, ${newSide.length} Side.`);
    } else {
      alert('Nenhuma carta válida do formato Edison foi identificada no texto informado.');
    }
  };

  // Renderizador de um slot de carta na Visão Geral (Print 3 Reference)
  const renderCardSlot = (c: SimulatorCard, section: 'main' | 'extra' | 'side') => (
    <div
      key={c.instanceId}
      className="simulator-card-slot"
      onClick={() => {
        const found = getEdisonCardByName(c.cardName);
        if (found) {
          setPreviewCard(found);
          setPreviewSection(section);
        }
      }}
      title={`${c.cardName}\n${c.type}\nClique para ver detalhes expandidos`}
    >
      <img
        src={getCardSmallImageUrl(c.cardId)}
        alt={c.cardName}
        className="simulator-card-img"
        loading="lazy"
      />
      {c.banLimit === 0 && <span className="banlist-badge forbidden" title="Proibida">🚫</span>}
      {c.banLimit === 1 && <span className="banlist-badge limited" title="Limitada (1)">1</span>}
      {c.banLimit === 2 && <span className="banlist-badge semi" title="Semi-Limitada (2)">2</span>}
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1250 }}>
      <div className="deck-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Topo do Header: Título & Ações Principais */}
        <div className="deck-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fbbf24',
                flexShrink: 0,
              }}
            >
              <Shield size={20} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isEditingName && canEdit ? (
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    placeholder="Nome do Deck"
                    autoFocus
                    style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#fff',
                      background: '#121214',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      maxWidth: '200px',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3
                      style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 800, cursor: canEdit ? 'pointer' : 'default' }}
                      onClick={() => canEdit && setIsEditingName(true)}
                      title={canEdit ? 'Clique para editar o nome do deck' : undefined}
                    >
                      {deckName}
                    </h3>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                        title="Editar nome do deck"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                )}
                <span
                  style={{
                    fontSize: '11px',
                    color: '#cbd5e1',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  {playerName}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Decklist Oficial • Formato Edison (2010)
              </span>
            </div>
          </div>

          {/* Botões do Topo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyDecklistText}
              title="Copiar decklist em texto"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: copySuccess ? '#34d399' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? <Check size={13} /> : <Copy size={13} />}
              <span>{copySuccess ? 'Copiado' : 'Copiar'}</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                title="Colar texto de deck para importar"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Upload size={13} />
                <span>Importar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              title="Fechar"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Faixa de Contadores e Categorias */}
        <div className="deck-header-badges-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                background: stats.mainTotal >= 40 && stats.mainTotal <= 60 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: stats.mainTotal >= 40 && stats.mainTotal <= 60 ? '#34d399' : '#fbbf24',
                border: '1px solid currentColor',
              }}
            >
              Main: {stats.mainTotal} / 40-60
            </span>

            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                background: stats.extraTotal <= 15 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: stats.extraTotal <= 15 ? '#c084fc' : '#f87171',
                border: '1px solid currentColor',
              }}
            >
              Extra: {stats.extraTotal} / 15
            </span>

            <span
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 800,
                background: stats.sideTotal <= 15 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: stats.sideTotal <= 15 ? '#60a5fa' : '#f87171',
                border: '1px solid currentColor',
              }}
            >
              Side: {stats.sideTotal} / 15
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11.5px', color: '#94a3b8' }}>
            <span style={{ color: '#fbbf24' }}>🐉 Monstros: <strong>{stats.mainMonsters}</strong></span>
            <span style={{ color: '#34d399' }}>📜 Magias: <strong>{stats.mainSpells}</strong></span>
            <span style={{ color: '#f472b6' }}>⚡ Armadilhas: <strong>{stats.mainTraps}</strong></span>
          </div>
        </div>

        {/* Alerta de Validação Edison (se houver) */}
        {stats.warnings.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(245, 158, 11, 0.08)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11.5px',
              color: '#fde68a',
            }}
          >
            <AlertTriangle size={15} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <span>{stats.warnings.join(' • ')}</span>
          </div>
        )}

        {/* Abas Principais - VISÃO GERAL EM PRIMEIRO LUGAR */}
        <div className="deck-tabs-nav">
          <button
            type="button"
            className={`deck-tab-button ${activeTab === 'visual' ? 'active' : ''}`}
            onClick={() => setActiveTab('visual')}
          >
            <LayoutGrid size={15} />
            <span>Visão Geral do Deck</span>
          </button>

          {canEdit && (
            <button
              type="button"
              className={`deck-tab-button ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <Search size={15} />
              <span>Buscar &amp; Adicionar Cartas</span>
            </button>
          )}

          <button
            type="button"
            className={`deck-tab-button ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <List size={15} />
            <span>Lista Detalhada ({stats.mainTotal + stats.extraTotal + stats.sideTotal})</span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA ATIVA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#0e0e11' }}>
          {/* ========================================================== */}
          {/* ABA 1: VISÃO GERAL DO DECK (LAYOUT ESTILO PRINT 3)        */}
          {/* ========================================================== */}
          {activeTab === 'visual' && (
            <div className="simulator-container">
              {/* Barra de ação rápida para adicionar cartas */}
              {canEdit && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    💡 Toque em qualquer carta para expandir detalhes, ver efeito e ajustar cópias.
                  </span>
                  <button
                    type="button"
                    className="btn-decklist-add"
                    onClick={() => setActiveTab('search')}
                    style={{ fontSize: '11.5px', padding: '4px 10px', color: '#fbbf24', borderColor: '#f59e0b' }}
                  >
                    <Plus size={13} />
                    <span>Adicionar Cartas (+Banco)</span>
                  </button>
                </div>
              )}

              {/* SEÇÃO 1: MAIN DECK (Com Rail Lateral e Grid Estilo Print 3) */}
              <div className="simulator-section">
                {/* Coluna / Rail Lateral com Contadores e Banner DECK */}
                <div className="simulator-rail">
                  <div className="simulator-count-box total" title="Total no Main Deck">
                    {stats.mainTotal}
                  </div>
                  <div className="simulator-count-box monsters" title="Monstros">
                    {stats.mainMonsters}
                  </div>
                  <div className="simulator-count-box spells" title="Magias">
                    {stats.mainSpells}
                  </div>
                  <div className="simulator-count-box traps" title="Armadilhas">
                    {stats.mainTraps}
                  </div>
                  <div className="simulator-count-box side-extra" title="Extra Deck">
                    {stats.extraTotal}
                  </div>

                  <div className="simulator-vertical-strip deck">
                    DECK
                  </div>
                </div>

                {/* Grid das Cartas do Main Deck */}
                <div className="simulator-grid-content">
                  <div className="simulator-section-header">
                    <span>MAIN DECK ({stats.mainTotal} CARTAS)</span>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      Mín. 40 • Máx. 60
                    </span>
                  </div>

                  {simulatorData.mainList.length === 0 ? (
                    <div
                      style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#64748b',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '6px',
                        border: '1px dashed rgba(255,255,255,0.1)',
                      }}
                    >
                      <Layers size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <p style={{ margin: '0 0 10px', fontSize: '13px' }}>Main Deck vazio.</p>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn-primary-gold"
                          onClick={() => setActiveTab('search')}
                          style={{ fontSize: '12px', padding: '6px 14px' }}
                        >
                          <Plus size={14} /> Buscar cartas para adicionar
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="simulator-grid">
                      {simulatorData.mainList.map((c) => renderCardSlot(c, 'main'))}

                      {/* Slots vazios para preencher a linha ou indicar espaço */}
                      {(() => {
                        const count = simulatorData.mainList.length;
                        const remainder = count % 10;
                        const emptySlotsCount = remainder > 0 ? 10 - remainder : (count < 40 ? 40 - count : 0);
                        return Array.from({ length: Math.min(emptySlotsCount, 10) }).map((_, i) => (
                          <div key={`empty-main-${i}`} className="simulator-card-empty">
                            +
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* SEÇÃO 2: SIDE DECK */}
              <div className="simulator-section" style={{ borderLeft: '3px solid #06b6d4' }}>
                <div className="simulator-rail">
                  <div className="simulator-vertical-strip side" style={{ minHeight: '60px' }}>
                    SIDE
                  </div>
                </div>

                <div className="simulator-grid-content">
                  <div className="simulator-section-header">
                    <span style={{ color: '#22d3ee' }}>SIDE DECK ({stats.sideTotal} CARTAS)</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Máximo 15</span>
                  </div>

                  {simulatorData.sideList.length === 0 ? (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '12px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                      }}
                    >
                      Nenhuma carta no Side Deck.
                    </div>
                  ) : (
                    <div className="simulator-grid">
                      {simulatorData.sideList.map((c) => renderCardSlot(c, 'side'))}

                      {/* Slots vazios do Side até 10 slots na primeira linha se menor */}
                      {simulatorData.sideList.length < 10 &&
                        Array.from({ length: 10 - simulatorData.sideList.length }).map((_, i) => (
                          <div key={`empty-side-${i}`} className="simulator-card-empty">
                            +
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SEÇÃO 3: EXTRA DECK */}
              <div className="simulator-section" style={{ borderLeft: '3px solid #f97316' }}>
                <div className="simulator-rail">
                  <div className="simulator-vertical-strip extra" style={{ minHeight: '60px' }}>
                    EXTRA
                  </div>
                </div>

                <div className="simulator-grid-content">
                  <div className="simulator-section-header">
                    <span style={{ color: '#fb923c' }}>
                      EXTRA DECK ({stats.extraTotal} CARTAS) • {stats.extraSynchro} Synchro • {stats.extraFusion} Fusão
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Máximo 15</span>
                  </div>

                  {simulatorData.extraList.length === 0 ? (
                    <div
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '12px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                      }}
                    >
                      Nenhum monstro Synchro ou Fusão no Extra Deck.
                    </div>
                  ) : (
                    <div className="simulator-grid">
                      {simulatorData.extraList.map((c) => renderCardSlot(c, 'extra'))}

                      {/* Slots vazios do Extra até 10 slots na primeira linha se menor */}
                      {simulatorData.extraList.length < 10 &&
                        Array.from({ length: 10 - simulatorData.extraList.length }).map((_, i) => (
                          <div key={`empty-extra-${i}`} className="simulator-card-empty">
                            +
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ABA 2: BUSCAR & ADICIONAR CARTAS                          */}
          {/* ========================================================== */}
          {activeTab === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Barra de Pesquisa */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#161619',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                >
                  <Search size={16} className="text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar entre as 3.660 cartas de Edison (ex: Cyber Dragon, Dustshoot, Dandy...)"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: '13.5px',
                      width: '100%',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filtros de Categoria */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(
                  [
                    { key: 'all', label: 'Todas as Cartas' },
                    { key: 'monster', label: '🐉 Monstros' },
                    { key: 'spell', label: '📜 Magias' },
                    { key: 'trap', label: '⚡ Armadilhas' },
                    { key: 'extra', label: '🔮 Extra Deck' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedCategory(tab.key)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      borderRadius: '20px',
                      fontWeight: selectedCategory === tab.key ? 700 : 500,
                      background: selectedCategory === tab.key ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                      color: selectedCategory === tab.key ? '#000' : '#cbd5e1',
                      border: '1px solid',
                      borderColor: selectedCategory === tab.key ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Lista de Resultados da Busca */}
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {searchResults.length} cartas encontradas no repositório Edison:
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '8px',
                }}
              >
                {searchResults.map((card) => {
                  const banLimit = getCardBanlistLimit(card.name);
                  const isExtra = isExtraDeckCard(card);
                  const counts = cardCountsMap.get(card.id) || { main: 0, extra: 0, side: 0, total: 0 };
                  const canAddMore = counts.total < banLimit;

                  return (
                    <div
                      key={card.id}
                      style={{
                        background: '#161619',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '8px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      {/* Imagem da Carta Reduzida (ao clicar abre preview) */}
                      <div
                        onClick={() => {
                          setPreviewCard(card);
                          setPreviewSection(null);
                        }}
                        style={{
                          width: '46px',
                          aspectRatio: '59 / 86',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                        title="Clique para ver carta expandida"
                      >
                        <img
                          src={getCardSmallImageUrl(card.id)}
                          alt={card.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                        {banLimit === 0 && <span className="banlist-badge forbidden">🚫</span>}
                        {banLimit === 1 && <span className="banlist-badge limited">1</span>}
                        {banLimit === 2 && <span className="banlist-badge semi">2</span>}
                      </div>

                      {/* Informações & Botões de Adicionar */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div
                          onClick={() => {
                            setPreviewCard(card);
                            setPreviewSection(null);
                          }}
                          style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                          }}
                          title={card.name}
                        >
                          {card.name}
                        </div>

                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                          {card.atk !== undefined ? `${card.atk}/${card.def}` : card.type}
                          {counts.total > 0 && (
                            <span style={{ color: '#fbbf24', marginLeft: '6px', fontWeight: 700 }}>
                              ({counts.total} no deck)
                            </span>
                          )}
                        </div>

                        {/* Botões de Ação */}
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          {!isExtra && (
                            <button
                              type="button"
                              disabled={!canAddMore}
                              onClick={() => handleAddCard(card, 'main')}
                              style={{
                                padding: '3px 8px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: canAddMore ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: canAddMore ? '#34d399' : '#64748b',
                                border: '1px solid',
                                borderColor: canAddMore ? '#34d399' : 'transparent',
                                borderRadius: '4px',
                                cursor: canAddMore ? 'pointer' : 'not-allowed',
                              }}
                            >
                              + Main
                            </button>
                          )}

                          {isExtra && (
                            <button
                              type="button"
                              disabled={!canAddMore}
                              onClick={() => handleAddCard(card, 'extra')}
                              style={{
                                padding: '3px 8px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: canAddMore ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: canAddMore ? '#c084fc' : '#64748b',
                                border: '1px solid',
                                borderColor: canAddMore ? '#c084fc' : 'transparent',
                                borderRadius: '4px',
                                cursor: canAddMore ? 'pointer' : 'not-allowed',
                              }}
                            >
                              + Extra
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={!canAddMore}
                            onClick={() => handleAddCard(card, 'side')}
                            style={{
                              padding: '3px 8px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              background: canAddMore ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              color: canAddMore ? '#60a5fa' : '#64748b',
                              border: '1px solid',
                              borderColor: canAddMore ? '#60a5fa' : 'transparent',
                              borderRadius: '4px',
                              cursor: canAddMore ? 'pointer' : 'not-allowed',
                            }}
                          >
                            + Side
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ABA 3: LISTA DETALHADA COM CONTADORES (+ / -)             */}
          {/* ========================================================== */}
          {activeTab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(
                  [
                    { key: 'all', label: `Todas (${stats.mainTotal + stats.extraTotal + stats.sideTotal})` },
                    { key: 'main', label: `Main Deck (${stats.mainTotal})` },
                    { key: 'extra', label: `Extra Deck (${stats.extraTotal})` },
                    { key: 'side', label: `Side Deck (${stats.sideTotal})` },
                  ] as const
                ).map((sec) => (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => setListSection(sec.key)}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      fontWeight: listSection === sec.key ? 700 : 500,
                      background: listSection === sec.key ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: listSection === sec.key ? '#fbbf24' : '#cbd5e1',
                      border: '1px solid',
                      borderColor: listSection === sec.key ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                    }}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {/* Tabela de Cartas da Seção Selecionada */}
              {([
                { id: 'main', title: 'Main Deck', list: mainDeck, color: '#fbbf24' },
                { id: 'extra', title: 'Extra Deck', list: extraDeck, color: '#c084fc' },
                { id: 'side', title: 'Side Deck', list: sideDeck, color: '#60a5fa' },
              ] as const)
                .filter((sec) => listSection === 'all' || listSection === sec.id)
                .map((sec) => (
                  <div key={sec.id} style={{ background: '#141417', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ color: sec.color, fontSize: '13px' }}>
                        {sec.title} ({sec.list.reduce((acc, i) => acc + (i.count || 1), 0)} cartas)
                      </strong>
                    </div>

                    {sec.list.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>
                        Nenhuma carta nesta seção.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sec.list.map((item) => {
                          const banLimit = getCardBanlistLimit(item.cardName);
                          return (
                            <div
                              key={`${sec.id}-${item.cardId}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                              }}
                            >
                              <div
                                onClick={() => {
                                  const found = getEdisonCardByName(item.cardName);
                                  if (found) {
                                    setPreviewCard(found);
                                    setPreviewSection(sec.id);
                                  }
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                              >
                                <img
                                  src={getCardSmallImageUrl(item.cardId)}
                                  alt={item.cardName}
                                  style={{ width: '28px', aspectRatio: '59 / 86', borderRadius: '3px', objectFit: 'cover' }}
                                />
                                <div>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                                    {item.cardName}
                                  </span>
                                  {banLimit < 3 && (
                                    <span style={{ marginLeft: '6px', fontSize: '10.5px', color: '#fbbf24', fontWeight: 700 }}>
                                      ({banLimit === 0 ? 'Proibida' : banLimit === 1 ? 'Limitada' : 'Semi'})
                                    </span>
                                  )}
                                </div>
                              </div>

                              {canEdit && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleChangeCount(item.cardId, sec.id, -1)}
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '4px',
                                      background: '#27272a',
                                      border: 'none',
                                      color: '#fff',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Minus size={13} />
                                  </button>

                                  <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 800, fontSize: '13px', color: '#fbbf24' }}>
                                    {item.count}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleChangeCount(item.cardId, sec.id, 1)}
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      borderRadius: '4px',
                                      background: '#27272a',
                                      border: 'none',
                                      color: '#fff',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Plus size={13} />
                                  </button>

                                  {(sec.id === 'main' || sec.id === 'side') && (
                                    <button
                                      type="button"
                                      onClick={() => handleMoveCard(item, sec.id, sec.id === 'main' ? 'side' : 'main')}
                                      title={sec.id === 'main' ? 'Mover para Side' : 'Mover para Main'}
                                      style={{
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#cbd5e1',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <ArrowRightLeft size={11} />
                                      {sec.id === 'main' ? 'Side' : 'Main'}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCard(item.cardId, sec.id)}
                                    title="Remover carta do deck"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: '4px',
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Rodapé com Totais e Salvar */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#121214',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
            <Info size={14} className="text-gold" />
            <span>
              Total Geral: <strong>{stats.mainTotal + stats.extraTotal + stats.sideTotal} cartas</strong> ({stats.mainTotal} Main / {stats.extraTotal} Extra / {stats.sideTotal} Side)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary-action"
              onClick={onClose}
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              Fechar
            </button>

            {canEdit && (
              <button
                type="button"
                className="btn-primary-gold"
                onClick={handleSaveDecklist}
                style={{
                  padding: '8px 22px',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Save size={15} />
                <span>Salvar Decklist</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* MODAL DE DETALHES DA CARTA (EXPANDE AO CLICAR NA CARTA)   */}
      {/* ========================================================== */}
      {previewCard && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setPreviewCard(null);
            setPreviewSection(null);
          }}
          style={{ zIndex: 1350 }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '92%',
              background: '#18181b',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95)',
            }}
          >
            {/* Header do Card Detail */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 800 }}>
                  {previewCard.name}
                </h3>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                  {previewCard.type} • {previewCard.attribute || previewCard.race}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewCard(null);
                  setPreviewSection(null);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Imagem em alta resolução e dados */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <img
                src={getCardFullImageUrl(previewCard.id)}
                alt={previewCard.name}
                style={{
                  width: '120px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.7)',
                  flexShrink: 0,
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                {previewCard.level && (
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                    Nível / Rank: {previewCard.level} ★
                  </span>
                )}
                {previewCard.atk !== undefined && (
                  <span style={{ color: '#fff', fontWeight: 700 }}>
                    ATK: {previewCard.atk} / DEF: {previewCard.def}
                  </span>
                )}
                <span style={{ color: '#cbd5e1' }}>
                  Tipo: <strong>{previewCard.race}</strong>
                </span>
                <span style={{ color: '#cbd5e1' }}>
                  Status Edison:{' '}
                  <strong
                    style={{
                      color:
                        getCardBanlistStatus(previewCard.name) === 'forbidden'
                          ? '#f87171'
                          : getCardBanlistStatus(previewCard.name) === 'unlimited'
                          ? '#34d399'
                          : '#fbbf24',
                    }}
                  >
                    {getCardBanlistStatus(previewCard.name).toUpperCase()} ({getCardBanlistLimit(previewCard.name)} máx)
                  </strong>
                </span>
              </div>
            </div>

            {/* Texto de Efeito / Descrição */}
            <div
              style={{
                background: '#121214',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                color: '#e2e8f0',
                lineHeight: '1.5',
                maxHeight: '140px',
                overflowY: 'auto',
              }}
            >
              {previewCard.desc || 'Sem descrição cadastrada.'}
            </div>

            {/* Ações interativas da carta (Adicionar cópia, remover, mover) */}
            {canEdit && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  paddingTop: '10px',
                  borderTop: '1px solid #27272a',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-primary-gold"
                    style={{ padding: '6px 12px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      const dest =
                        previewSection ||
                        (isExtraDeckCard(previewCard) ? 'extra' : 'main');
                      handleAddCard(previewCard, dest);
                    }}
                  >
                    <Plus size={13} /> + Cópia
                  </button>

                  {previewSection && (
                    <button
                      type="button"
                      className="btn-secondary-action"
                      style={{ padding: '6px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        handleChangeCount(previewCard.id, previewSection, -1);
                        setPreviewCard(null);
                        setPreviewSection(null);
                      }}
                    >
                      <Minus size={13} /> - 1
                    </button>
                  )}

                  {previewSection && (previewSection === 'main' || previewSection === 'side') && !isExtraDeckCard(previewCard) && (
                    <button
                      type="button"
                      className="btn-secondary-action"
                      style={{ padding: '6px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        const target = previewSection === 'main' ? 'side' : 'main';
                        handleMoveCard(
                          { cardId: previewCard.id, cardName: previewCard.name, count: 1 },
                          previewSection,
                          target
                        );
                        setPreviewCard(null);
                        setPreviewSection(null);
                      }}
                    >
                      <ArrowRightLeft size={12} />
                      {previewSection === 'main' ? 'Mover Side' : 'Mover Main'}
                    </button>
                  )}
                </div>

                {previewSection && (
                  <button
                    type="button"
                    className="btn-danger-ghost"
                    style={{ padding: '6px 10px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      handleRemoveCard(previewCard.id, previewSection);
                      setPreviewCard(null);
                      setPreviewSection(null);
                    }}
                  >
                    <Trash2 size={13} /> Remover
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL DE IMPORTAÇÃO DE DECK POR TEXTO                     */}
      {/* ========================================================== */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)} style={{ zIndex: 1350 }}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '92%', background: '#18181b', borderRadius: '12px', padding: '18px' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} className="text-gold" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 800 }}>
                  Importar Decklist Edison por Texto
                </h3>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setShowImportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 0' }}>
              <p style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.5', margin: '0 0 10px' }}>
                Cole a lista de cartas no formato padrão de simuladores (ex: <code>3x Cyber Dragon</code>, <code>#extra</code>, <code>#side</code>):
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="3x Cyber Dragon&#10;1x Heavy Storm&#10;1x Mirror Force&#10;#extra&#10;1x Stardust Dragon&#10;#side&#10;2x D.D. Crow"
                rows={10}
                style={{
                  width: '100%',
                  background: '#121214',
                  border: '1px solid #3f3f46',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '10px',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-secondary-action" onClick={() => setShowImportModal(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary-gold" onClick={handleImportText}>
                Importar Cartas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
