import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Layers,
  Plus,
  Minus,
  Trash2,
  Search,
  Eye,
  Check,
  AlertTriangle,
  Copy,
  Upload,
  ArrowRightLeft,
  Sparkles,
  Info,
  Edit2,
  Save,
} from 'lucide-react';
import type { Decklist, DeckCardItem } from '../types';
import {
  searchEdisonCards,
  getCardBanlistLimit,
  getCardBanlistStatus,
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

export const DecklistModal: React.FC<DecklistModalProps> = ({
  decklist,
  playerName,
  defaultDeckName,
  onSave,
  onClose,
  readOnly = false,
}) => {
  // Estado de modo de edição (se onSave não foi fornecido, força readOnly)
  const canEdit = !!onSave && !readOnly;
  const [isEditing, setIsEditing] = useState<boolean>(canEdit && (!decklist || (decklist.mainDeck?.length === 0)));

  const [deckName, setDeckName] = useState<string>(
    decklist?.deckName || defaultDeckName || 'Edison Deck'
  );

  // Seções do Deck
  const [mainDeck, setMainDeck] = useState<DeckCardItem[]>(() =>
    decklist?.mainDeck ? JSON.parse(JSON.stringify(decklist.mainDeck)) : []
  );
  const [extraDeck, setExtraDeck] = useState<DeckCardItem[]>(() =>
    decklist?.extraDeck ? JSON.parse(JSON.stringify(decklist.extraDeck)) : []
  );
  const [sideDeck, setSideDeck] = useState<DeckCardItem[]>(() =>
    decklist?.sideDeck ? JSON.parse(JSON.stringify(decklist.sideDeck)) : []
  );

  // Aba ativa de visualização/edição
  const [activeDeckTab, setActiveDeckTab] = useState<'main' | 'extra' | 'side' | 'visual'>('main');

  // Busca e Filtros de cartas
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CardCategory>('all');
  const [previewCard, setPreviewCard] = useState<EdisonCard | null>(null);

  // Modal de importação/exportação em texto
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

  // Resultados da busca de cartas
  const searchResults = useMemo(() => {
    return searchEdisonCards(searchQuery, {
      category: selectedCategory,
      limit: searchQuery.trim().length > 0 ? 50 : 25,
    });
  }, [searchQuery, selectedCategory]);

  // Contagem de cópias já utilizadas no deck (Main + Extra + Side) por ID
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

  // Adiciona carta ao deck
  const handleAddCard = (card: EdisonCard, destination: 'main' | 'extra' | 'side') => {
    const banLimit = getCardBanlistLimit(card.name);
    const counts = cardCountsMap.get(card.id) || { main: 0, extra: 0, side: 0, total: 0 };

    if (counts.total >= banLimit) {
      alert(`"${card.name}" já atingiu o limite máximo permitido (${banLimit} cópia(s)) para o formato Edison.`);
      return;
    }

    if (destination === 'extra' && !['Synchro Monster', 'Fusion Monster'].includes(card.type)) {
      alert('Apenas monstros de Fusão ou Synchro podem ser colocados no Extra Deck.');
      return;
    }

    if (destination === 'main' && ['Synchro Monster', 'Fusion Monster'].includes(card.type)) {
      alert('Monstros do Extra Deck (Synchro/Fusão) devem ser adicionados ao Extra Deck.');
      return;
    }

    if (destination === 'main') {
      setMainDeck((prev) => {
        const existingIdx = prev.findIndex((i) => i.cardId === card.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            count: (updated[existingIdx].count || 1) + 1,
          };
          return updated;
        }
        return [
          ...prev,
          {
            cardId: card.id,
            cardName: card.name,
            count: 1,
            type: card.type,
            frameType: card.frameType,
            attribute: card.attribute,
            race: card.race,
            level: card.level,
            atk: card.atk,
            def: card.def,
            desc: card.desc,
          },
        ];
      });
    } else if (destination === 'extra') {
      setExtraDeck((prev) => {
        const existingIdx = prev.findIndex((i) => i.cardId === card.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            count: (updated[existingIdx].count || 1) + 1,
          };
          return updated;
        }
        return [
          ...prev,
          {
            cardId: card.id,
            cardName: card.name,
            count: 1,
            type: card.type,
            frameType: card.frameType,
            attribute: card.attribute,
            race: card.race,
            level: card.level,
            atk: card.atk,
            def: card.def,
            desc: card.desc,
          },
        ];
      });
    } else {
      setSideDeck((prev) => {
        const existingIdx = prev.findIndex((i) => i.cardId === card.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            count: (updated[existingIdx].count || 1) + 1,
          };
          return updated;
        }
        return [
          ...prev,
          {
            cardId: card.id,
            cardName: card.name,
            count: 1,
            type: card.type,
            frameType: card.frameType,
            attribute: card.attribute,
            race: card.race,
            level: card.level,
            atk: card.atk,
            def: card.def,
            desc: card.desc,
          },
        ];
      });
    }
  };

  // Altera quantidade de uma carta (+1 ou -1)
  const handleChangeCount = (cardId: number, section: 'main' | 'extra' | 'side', delta: number) => {
    const updateList = (list: DeckCardItem[]) => {
      const idx = list.findIndex((i) => i.cardId === cardId);
      if (idx < 0) return list;

      const item = list[idx];
      const newCount = (item.count || 1) + delta;

      if (newCount <= 0) {
        return list.filter((i) => i.cardId !== cardId);
      }

      // Validação de limite máximo
      if (delta > 0) {
        const banLimit = getCardBanlistLimit(item.cardName);
        const counts = cardCountsMap.get(cardId) || { main: 0, extra: 0, side: 0, total: 0 };
        if (counts.total >= banLimit) {
          alert(`"${item.cardName}" atingiu o limite de ${banLimit} cópia(s).`);
          return list;
        }
      }

      const updated = [...list];
      updated[idx] = { ...item, count: newCount };
      return updated;
    };

    if (section === 'main') setMainDeck(updateList);
    else if (section === 'extra') setExtraDeck(updateList);
    else setSideDeck(updateList);
  };

  // Remove carta totalmente
  const handleRemoveCard = (cardId: number, section: 'main' | 'extra' | 'side') => {
    if (section === 'main') setMainDeck((prev) => prev.filter((i) => i.cardId !== cardId));
    else if (section === 'extra') setExtraDeck((prev) => prev.filter((i) => i.cardId !== cardId));
    else setSideDeck((prev) => prev.filter((i) => i.cardId !== cardId));
  };

  // Move uma cópia entre seções (ex: Main <-> Side)
  const handleMoveCard = (item: DeckCardItem, from: 'main' | 'extra' | 'side', to: 'main' | 'extra' | 'side') => {
    handleChangeCount(item.cardId, from, -1);
    const cardObj = getEdisonCardByName(item.cardName);
    if (cardObj) {
      handleAddCard(cardObj, to);
    }
  };

  // Salva a decklist
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
    setIsEditing(false);
  };

  // Exportar texto do deck
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

  // Importar texto do deck
  const handleImportText = () => {
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    let currentTarget: 'main' | 'extra' | 'side' = 'main';

    const newMain: DeckCardItem[] = [];
    const newExtra: DeckCardItem[] = [];
    const newSide: DeckCardItem[] = [];

    for (let rawLine of lines) {
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

      // Reconhece formatos como "3x Cyber Dragon", "3 Cyber Dragon" ou apenas "Cyber Dragon"
      const match = line.match(/^(\d+)[xX\s]+(.*)$/);
      let count = 1;
      let cardName = line;

      if (match) {
        count = Math.min(3, Math.max(1, parseInt(match[1])));
        cardName = match[2].trim();
      }

      const found = getEdisonCardByName(cardName);
      if (found) {
        const item: DeckCardItem = {
          cardId: found.id,
          cardName: found.name,
          count,
          type: found.type,
          frameType: found.frameType,
          attribute: found.attribute,
          race: found.race,
          level: found.level,
          atk: found.atk,
          def: found.def,
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

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1250 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '960px',
          width: '96%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#161619',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header do Decklist */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    placeholder="Nome do Deck (ex: Blackwing)"
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#fff',
                      background: '#121214',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      maxWidth: '220px',
                    }}
                  />
                ) : (
                  <h3 style={{ margin: 0, fontSize: '17px', color: '#fff', fontWeight: 800 }}>
                    {deckName}
                  </h3>
                )}
                <span
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {playerName}
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Decklist Oficial • Formato Edison (2010)
              </span>
            </div>
          </div>

          {/* Badges de Contagem de Cartas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: stats.mainTotal >= 40 && stats.mainTotal <= 60 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: stats.mainTotal >= 40 && stats.mainTotal <= 60 ? '#34d399' : '#fbbf24',
                border: '1px solid currentColor',
              }}
              title={`Monstros: ${stats.mainMonsters} | Magias: ${stats.mainSpells} | Armadilhas: ${stats.mainTraps}`}
            >
              Main: {stats.mainTotal}
            </span>

            <span
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: stats.extraTotal <= 15 ? 'rgba(168, 85, 247, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: stats.extraTotal <= 15 ? '#c084fc' : '#f87171',
                border: '1px solid currentColor',
              }}
            >
              Extra: {stats.extraTotal}
            </span>

            <span
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: stats.sideTotal <= 15 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: stats.sideTotal <= 15 ? '#60a5fa' : '#f87171',
                border: '1px solid currentColor',
              }}
            >
              Side: {stats.sideTotal}
            </span>

            {/* Ações de Importar/Exportar e Modo de Edição */}
            <button
              type="button"
              className="btn-icon"
              onClick={handleCopyDecklistText}
              title="Copiar decklist em texto"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: copySuccess ? '#34d399' : '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              {copySuccess ? <Check size={13} /> : <Copy size={13} />}
              <span>{copySuccess ? 'Copiado!' : 'Copiar'}</span>
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
                  fontSize: '11px',
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

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  background: isEditing ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: isEditing ? '#fbbf24' : '#cbd5e1',
                  border: isEditing ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                <Edit2 size={13} />
                <span>{isEditing ? 'Modo Visual' : 'Editar Cartas'}</span>
              </button>
            )}

            <button
              type="button"
              className="btn-icon"
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

        {/* Abas das Seções do Deck */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 16px 0',
            background: '#121214',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveDeckTab('main')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: activeDeckTab === 'main' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeDeckTab === 'main' ? '#fbbf24' : '#94a3b8',
              border: 'none',
              borderBottom: activeDeckTab === 'main' ? '2px solid #f59e0b' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderRadius: '6px 6px 0 0',
            }}
          >
            <Layers size={14} />
            <span>Main Deck ({stats.mainTotal})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDeckTab('extra')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: activeDeckTab === 'extra' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: activeDeckTab === 'extra' ? '#c084fc' : '#94a3b8',
              border: 'none',
              borderBottom: activeDeckTab === 'extra' ? '2px solid #a855f7' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderRadius: '6px 6px 0 0',
            }}
          >
            <Sparkles size={14} />
            <span>Extra Deck ({stats.extraTotal})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDeckTab('side')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: activeDeckTab === 'side' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeDeckTab === 'side' ? '#60a5fa' : '#94a3b8',
              border: 'none',
              borderBottom: activeDeckTab === 'side' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderRadius: '6px 6px 0 0',
            }}
          >
            <Shield size={14} />
            <span>Side Deck ({stats.sideTotal})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDeckTab('visual')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 700,
              background: activeDeckTab === 'visual' ? 'rgba(52, 211, 153, 0.15)' : 'transparent',
              color: activeDeckTab === 'visual' ? '#34d399' : '#94a3b8',
              border: 'none',
              borderBottom: activeDeckTab === 'visual' ? '2px solid #34d399' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              borderRadius: '6px 6px 0 0',
            }}
          >
            <Eye size={14} />
            <span>Visão Geral do Deck</span>
          </button>
        </div>

        {/* Corpo Principal com Visualização ou Edição */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* MODO 1: EDITOR / CONSTRUTOR DECK COM BUSCA (quando isEditing = true) */}
          {isEditing && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1.2fr)',
                gap: '16px',
                minHeight: '440px',
              }}
              className="deck-builder-grid"
            >
              {/* Painel Esquerdo: Busca no Repositório de 3.660 Cartas */}
              <div
                style={{
                  background: '#121214',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '13px', fontWeight: 800 }}>
                  <Search size={15} />
                  <span>Repositório Edison (3.660 Cartas)</span>
                </div>

                {/* Input de Busca */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Digite o nome da carta (ex: Gale, Cyber...)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: '#1c1c20',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filtros de Categoria */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'all', label: 'Todas' },
                    { key: 'monster', label: 'Monstros' },
                    { key: 'spell', label: 'Magias' },
                    { key: 'trap', label: 'Armadilhas' },
                    { key: 'extra', label: 'Extra' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key as any)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        background: selectedCategory === cat.key ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                        color: selectedCategory === cat.key ? '#000' : '#cbd5e1',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Lista de Cartas Encontradas */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '350px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchResults.map((card) => {
                    const banLimit = getCardBanlistLimit(card.name);
                    const banStatus = getCardBanlistStatus(card.name);
                    const counts = cardCountsMap.get(card.id) || { main: 0, extra: 0, side: 0, total: 0 };
                    const isExtra = ['Synchro Monster', 'Fusion Monster'].includes(card.type);

                    return (
                      <div
                        key={card.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '6px 8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, cursor: 'pointer' }}
                          onClick={() => setPreviewCard(card)}
                          title="Clique para ver detalhes e efeito da carta"
                        >
                          <img
                            src={getCardSmallImageUrl(card.id)}
                            alt={card.name}
                            style={{ width: '28px', height: '41px', objectFit: 'cover', borderRadius: '3px' }}
                            loading="lazy"
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {card.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              {card.type}
                              {banStatus !== 'unlimited' && (
                                <span
                                  style={{
                                    marginLeft: '4px',
                                    color: banStatus === 'forbidden' ? '#f87171' : '#fbbf24',
                                    fontWeight: 800,
                                  }}
                                >
                                  [{banStatus === 'forbidden' ? 'Proibida' : banStatus === 'limited' ? 'Limitada (1)' : 'Semi (2)'}]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Adição Rápida */}
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          {!isExtra ? (
                            <button
                              type="button"
                              onClick={() => handleAddCard(card, 'main')}
                              disabled={counts.total >= banLimit}
                              title={`Adicionar ao Main Deck (${counts.main}/${banLimit})`}
                              style={{
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                background: counts.total >= banLimit ? 'rgba(255, 255, 255, 0.05)' : '#f59e0b',
                                color: counts.total >= banLimit ? '#64748b' : '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: counts.total >= banLimit ? 'not-allowed' : 'pointer',
                              }}
                            >
                              + Main {counts.main > 0 && `(${counts.main})`}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddCard(card, 'extra')}
                              disabled={counts.total >= banLimit}
                              title={`Adicionar ao Extra Deck (${counts.extra}/${banLimit})`}
                              style={{
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                background: counts.total >= banLimit ? 'rgba(255, 255, 255, 0.05)' : '#a855f7',
                                color: counts.total >= banLimit ? '#64748b' : '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: counts.total >= banLimit ? 'not-allowed' : 'pointer',
                              }}
                            >
                              + Extra {counts.extra > 0 && `(${counts.extra})`}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleAddCard(card, 'side')}
                            disabled={counts.total >= banLimit}
                            title={`Adicionar ao Side Deck (${counts.side}/${banLimit})`}
                            style={{
                              padding: '3px 6px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: counts.total >= banLimit ? 'rgba(255, 255, 255, 0.05)' : 'rgba(59, 130, 246, 0.25)',
                              color: counts.total >= banLimit ? '#64748b' : '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              borderRadius: '4px',
                              cursor: counts.total >= banLimit ? 'not-allowed' : 'pointer',
                            }}
                          >
                            + Side {counts.side > 0 && `(${counts.side})`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Painel Direito: Cartas Inclusas na Seção Selecionada */}
              <div
                style={{
                  background: '#121214',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '13px', fontWeight: 800 }}>
                    <Layers size={15} className="text-gold" />
                    <span>
                      {activeDeckTab === 'main'
                        ? `Main Deck (${stats.mainTotal} cartas)`
                        : activeDeckTab === 'extra'
                        ? `Extra Deck (${stats.extraTotal} cartas)`
                        : `Side Deck (${stats.sideTotal} cartas)`}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {activeDeckTab === 'main'
                      ? `${stats.mainMonsters}M • ${stats.mainSpells}S • ${stats.mainTraps}T`
                      : activeDeckTab === 'extra'
                      ? `${stats.extraSynchro} Synchro • ${stats.extraFusion} Fusão`
                      : `${stats.sideTotal}/15`}
                  </span>
                </div>

                {/* Lista de Cartas da Seção Ativa */}
                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '380px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(() => {
                    const list =
                      activeDeckTab === 'main'
                        ? mainDeck
                        : activeDeckTab === 'extra'
                        ? extraDeck
                        : sideDeck;

                    if (list.length === 0) {
                      return (
                        <div style={{ padding: '30px 10px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                          Nenhuma carta nesta seção ainda. Busque e adicione cartas pelo painel à esquerda.
                        </div>
                      );
                    }

                    return list.map((item) => (
                      <div
                        key={item.cardId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '6px 10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '6px',
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, cursor: 'pointer' }}
                          onClick={() => {
                            const found = getEdisonCardByName(item.cardName);
                            if (found) setPreviewCard(found);
                          }}
                        >
                          <img
                            src={getCardSmallImageUrl(item.cardId)}
                            alt={item.cardName}
                            style={{ width: '28px', height: '41px', objectFit: 'cover', borderRadius: '3px' }}
                            loading="lazy"
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '12.5px',
                                fontWeight: 700,
                                color: '#fff',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.cardName}
                            </div>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>{item.type}</span>
                          </div>
                        </div>

                        {/* Controles de Quantidade */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => handleChangeCount(item.cardId, activeDeckTab as any, -1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Diminuir cópia"
                          >
                            <Minus size={12} />
                          </button>

                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24', minWidth: '16px', textAlign: 'center' }}>
                            {item.count}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleChangeCount(item.cardId, activeDeckTab as any, 1)}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Aumentar cópia"
                          >
                            <Plus size={12} />
                          </button>

                          {/* Mover para Side / Main */}
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveCard(
                                item,
                                activeDeckTab as any,
                                activeDeckTab === 'side' ? (isExtraDeckCard(item) ? 'extra' : 'main') : 'side'
                              )
                            }
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title={activeDeckTab === 'side' ? 'Mover para Main/Extra' : 'Mover para Side'}
                          >
                            <ArrowRightLeft size={13} />
                          </button>

                          {/* Excluir totalmente */}
                          <button
                            type="button"
                            onClick={() => handleRemoveCard(item.cardId, activeDeckTab as any)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Remover carta do deck"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* MODO 2: VISUALIZAÇÃO COMPLETA DA DECKLIST */}
          {(!isEditing || activeDeckTab === 'visual') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Seção 1: Main Deck */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} className="text-gold" />
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 800 }}>
                      Main Deck ({stats.mainTotal} cartas)
                    </h4>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {stats.mainMonsters} Monstros • {stats.mainSpells} Magias • {stats.mainTraps} Armadilhas
                  </span>
                </div>

                {mainDeck.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Nenhuma carta cadastrada no Main Deck.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {mainDeck.map((item) => (
                      <div
                        key={item.cardId}
                        onClick={() => {
                          const found = getEdisonCardByName(item.cardName);
                          if (found) setPreviewCard(found);
                        }}
                        style={{
                          background: '#121214',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'transform 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '28/41' }}>
                          <img
                            src={getCardSmallImageUrl(item.cardId)}
                            alt={item.cardName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                            loading="lazy"
                          />
                          <span
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: '#f59e0b',
                              color: '#000',
                              fontSize: '11px',
                              fontWeight: 900,
                              borderRadius: '4px',
                              padding: '1px 5px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                            }}
                          >
                            x{item.count}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#fff',
                            textAlign: 'center',
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                          title={item.cardName}
                        >
                          {item.cardName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 2: Extra Deck */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} style={{ color: '#c084fc' }} />
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 800 }}>
                      Extra Deck ({stats.extraTotal} cartas)
                    </h4>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {stats.extraSynchro} Synchro • {stats.extraFusion} Fusão
                  </span>
                </div>

                {extraDeck.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Nenhuma carta cadastrada no Extra Deck.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {extraDeck.map((item) => (
                      <div
                        key={item.cardId}
                        onClick={() => {
                          const found = getEdisonCardByName(item.cardName);
                          if (found) setPreviewCard(found);
                        }}
                        style={{
                          background: '#121214',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          borderRadius: '8px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '28/41' }}>
                          <img
                            src={getCardSmallImageUrl(item.cardId)}
                            alt={item.cardName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                            loading="lazy"
                          />
                          <span
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: '#a855f7',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 900,
                              borderRadius: '4px',
                              padding: '1px 5px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                            }}
                          >
                            x{item.count}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#fff',
                            textAlign: 'center',
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                          title={item.cardName}
                        >
                          {item.cardName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 3: Side Deck */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} style={{ color: '#60a5fa' }} />
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 800 }}>
                      Side Deck ({stats.sideTotal} cartas)
                    </h4>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Máximo de 15 cartas</span>
                </div>

                {sideDeck.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Nenhuma carta cadastrada no Side Deck.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {sideDeck.map((item) => (
                      <div
                        key={item.cardId}
                        onClick={() => {
                          const found = getEdisonCardByName(item.cardName);
                          if (found) setPreviewCard(found);
                        }}
                        style={{
                          background: '#121214',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '8px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          position: 'relative',
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '28/41' }}>
                          <img
                            src={getCardSmallImageUrl(item.cardId)}
                            alt={item.cardName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                            loading="lazy"
                          />
                          <span
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: '#3b82f6',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 900,
                              borderRadius: '4px',
                              padding: '1px 5px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                            }}
                          >
                            x{item.count}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#fff',
                            textAlign: 'center',
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                          title={item.cardName}
                        >
                          {item.cardName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            padding: '14px 20px',
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
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000',
                  fontWeight: 800,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Save size={15} />
                <span>Salvar Decklist</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE DETALHES DA CARTA (Card Artwork, Stats & Text) */}
      {previewCard && (
        <div
          className="modal-backdrop"
          onClick={() => setPreviewCard(null)}
          style={{ zIndex: 1300 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '90%',
              background: '#18181b',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            }}
          >
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
                onClick={() => setPreviewCard(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <img
                src={getCardFullImageUrl(previewCard.id)}
                alt={previewCard.name}
                style={{
                  width: '120px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
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
                  <strong style={{ color: getCardBanlistStatus(previewCard.name) === 'forbidden' ? '#f87171' : '#fbbf24' }}>
                    {getCardBanlistStatus(previewCard.name).toUpperCase()} ({getCardBanlistLimit(previewCard.name)} máx)
                  </strong>
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#121214',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                color: '#e2e8f0',
                lineHeight: '1.5',
                maxHeight: '160px',
                overflowY: 'auto',
              }}
            >
              {previewCard.desc || 'Sem descrição cadastrada.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setPreviewCard(null)}
                style={{ padding: '6px 16px', fontSize: '12px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO DE DECK POR TEXTO */}
      {showImportModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowImportModal(false)}
          style={{ zIndex: 1300 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              width: '92%',
              background: '#18181b',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                <Upload size={18} />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 800 }}>
                  Importar Decklist por Texto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
              Cole a lista de cartas abaixo. Aceita formatos como <code>3x Cyber Dragon</code>, <code>2 Gale</code> ou separadores <code>#main</code>, <code>#extra</code> e <code>#side</code>:
            </p>

            <textarea
              rows={10}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`#main\n3 Blackwing - Bora the Spear\n1 Blackwing - Gale the Whirlwind\n1 Heavy Storm\n\n#extra\n1 Stardust Dragon\n1 Black Rose Dragon\n\n#side\n2 Cyber Dragon`}
              style={{
                width: '100%',
                background: '#121214',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                color: '#fff',
                padding: '10px',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setShowImportModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary-gold"
                onClick={handleImportText}
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Processar e Carregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
