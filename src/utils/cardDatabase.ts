import edisonCardsRaw from '../data/edisonCards.json';
import { EDISON_BANLIST } from '../data/edisonBanlist';
import type { Decklist, DeckCardItem } from '../types';

export interface EdisonCard {
  id: number;
  name: string;
  type: string;
  frameType: string;
  race?: string;
  attribute?: string;
  atk?: number;
  def?: number;
  level?: number;
  desc?: string;
}

export type CardCategory = 'monster' | 'spell' | 'trap' | 'extra';

// Converte a base de cartas importada
export const ALL_EDISON_CARDS: EdisonCard[] = edisonCardsRaw as EdisonCard[];

// Mapeamento rápido por ID e por Nome (em minúsculas)
const cardByIdMap = new Map<number, EdisonCard>();
const cardByNameMap = new Map<string, EdisonCard>();

ALL_EDISON_CARDS.forEach((card) => {
  cardByIdMap.set(card.id, card);
  cardByNameMap.set(card.name.toLowerCase().trim(), card);
});

// Mapeamento da Banlist de Edison (Março de 2010)
const banlistMap = new Map<string, { limit: number; status: 'forbidden' | 'limited' | 'semi-limited' }>();

EDISON_BANLIST.forEach((item) => {
  banlistMap.set(item.name.toLowerCase().trim(), {
    limit: item.limit,
    status: item.status,
  });
});

/**
 * Retorna o limite da carta na Banlist Oficial de Edison (0 = Proibida, 1 = Limitada, 2 = Semi, 3 = Ilimitada)
 */
export function getCardBanlistLimit(cardName: string): number {
  const item = banlistMap.get(cardName.toLowerCase().trim());
  return item !== undefined ? item.limit : 3;
}

/**
 * Retorna o status da carta na Banlist
 */
export function getCardBanlistStatus(cardName: string): 'forbidden' | 'limited' | 'semi-limited' | 'unlimited' {
  const item = banlistMap.get(cardName.toLowerCase().trim());
  return item !== undefined ? item.status : 'unlimited';
}

/**
 * Verifica se a carta pertence ao Extra Deck (Fusões e Synchros no formato Edison)
 */
export function isExtraDeckCard(card: { type?: string }): boolean {
  if (!card || !card.type) return false;
  const t = card.type.toLowerCase();
  return t.includes('synchro') || t.includes('fusion');
}

/**
 * Retorna a categoria da carta ('extra', 'spell', 'trap', 'monster')
 */
export function getCardCategory(card: { type?: string }): CardCategory {
  if (!card || !card.type) return 'monster';
  const t = card.type.toLowerCase();
  if (t.includes('synchro') || t.includes('fusion')) return 'extra';
  if (t.includes('spell')) return 'spell';
  if (t.includes('trap')) return 'trap';
  return 'monster';
}

/**
 * Retorna URL da imagem miniatura da carta (YGOPRODeck CDN)
 */
export function getCardSmallImageUrl(cardId: number): string {
  return `https://images.ygoprodeck.com/images/cards_small/${cardId}.jpg`;
}

/**
 * Retorna URL da imagem em alta resolução da carta
 */
export function getCardFullImageUrl(cardId: number): string {
  return `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`;
}

/**
 * Busca uma carta por ID
 */
export function getEdisonCardById(id: number): EdisonCard | undefined {
  return cardByIdMap.get(id);
}

/**
 * Busca uma carta por Nome exato (case-insensitive)
 */
export function getEdisonCardByName(name: string): EdisonCard | undefined {
  return cardByNameMap.get(name.toLowerCase().trim());
}

/**
 * Realiza busca rápida no repositório de 3.660 cartas Edison
 */
export function searchEdisonCards(
  query: string,
  options?: {
    category?: 'all' | CardCategory;
    limit?: number;
  }
): EdisonCard[] {
  const q = query.toLowerCase().trim();
  const categoryFilter = options?.category || 'all';
  const maxLimit = options?.limit || 40;

  let filtered = ALL_EDISON_CARDS;

  // Filtro por categoria
  if (categoryFilter !== 'all') {
    filtered = filtered.filter((c) => getCardCategory(c) === categoryFilter);
  }

  if (!q) {
    return filtered.slice(0, maxLimit);
  }

  const exactMatches: EdisonCard[] = [];
  const prefixMatches: EdisonCard[] = [];
  const containsMatches: EdisonCard[] = [];

  for (const card of filtered) {
    const nameLower = card.name.toLowerCase();
    if (nameLower === q) {
      exactMatches.push(card);
    } else if (nameLower.startsWith(q)) {
      prefixMatches.push(card);
    } else if (nameLower.includes(q)) {
      containsMatches.push(card);
    }

    if (exactMatches.length + prefixMatches.length + containsMatches.length >= maxLimit * 2) {
      break;
    }
  }

  return [...exactMatches, ...prefixMatches, ...containsMatches].slice(0, maxLimit);
}

/**
 * Calcula totais e validações de uma Decklist
 */
export function getDecklistStats(decklist: Decklist) {
  let mainMonsters = 0;
  let mainSpells = 0;
  let mainTraps = 0;
  let mainTotal = 0;

  for (const item of decklist.mainDeck || []) {
    const count = item.count || 1;
    mainTotal += count;
    const cat = getCardCategory(item);
    if (cat === 'spell') mainSpells += count;
    else if (cat === 'trap') mainTraps += count;
    else mainMonsters += count;
  }

  let extraSynchro = 0;
  let extraFusion = 0;
  let extraTotal = 0;

  for (const item of decklist.extraDeck || []) {
    const count = item.count || 1;
    extraTotal += count;
    const t = (item.type || '').toLowerCase();
    if (t.includes('fusion')) extraFusion += count;
    else extraSynchro += count;
  }

  let sideTotal = 0;
  for (const item of decklist.sideDeck || []) {
    sideTotal += item.count || 1;
  }

  // Validações Edison
  const warnings: string[] = [];
  if (mainTotal < 40) warnings.push(`Main Deck possui ${mainTotal} cartas (Mínimo recomendado: 40).`);
  if (mainTotal > 60) warnings.push(`Main Deck possui ${mainTotal} cartas (Máximo permitido: 60).`);
  if (extraTotal > 15) warnings.push(`Extra Deck possui ${extraTotal} cartas (Máximo permitido: 15).`);
  if (sideTotal > 15) warnings.push(`Side Deck possui ${sideTotal} cartas (Máximo permitido: 15).`);

  // Checagem de limite por carta entre Main + Side + Extra
  const totalCopiesMap = new Map<string, number>();
  const addCopies = (items: DeckCardItem[]) => {
    for (const item of items) {
      const nameKey = item.cardName.toLowerCase().trim();
      totalCopiesMap.set(nameKey, (totalCopiesMap.get(nameKey) || 0) + (item.count || 1));
    }
  };

  addCopies(decklist.mainDeck || []);
  addCopies(decklist.extraDeck || []);
  addCopies(decklist.sideDeck || []);

  totalCopiesMap.forEach((count, nameKey) => {
    const cardObj = getEdisonCardByName(nameKey);
    const displayName = cardObj?.name || nameKey;
    const banLimit = getCardBanlistLimit(nameKey);

    if (count > banLimit) {
      if (banLimit === 0) {
        warnings.push(`"${displayName}" é PROIBIDA no formato Edison (${count} cópia(s) no deck).`);
      } else if (banLimit === 1) {
        warnings.push(`"${displayName}" é LIMITADA a 1 cópia (${count} cópias presentes).`);
      } else if (banLimit === 2) {
        warnings.push(`"${displayName}" é SEMI-LIMITADA a 2 cópias (${count} cópias presentes).`);
      }
    } else if (count > 3) {
      warnings.push(`"${displayName}" possui ${count} cópias (máximo permitido: 3).`);
    }
  });

  return {
    mainTotal,
    mainMonsters,
    mainSpells,
    mainTraps,
    extraTotal,
    extraSynchro,
    extraFusion,
    sideTotal,
    warnings,
    isValid: warnings.length === 0 && mainTotal >= 40 && mainTotal <= 60 && extraTotal <= 15 && sideTotal <= 15,
  };
}

/**
 * Retorna contagens de cartas de uma decklist com fallback dinâmico
 */
export function getDeckCardCounts(decklist?: Decklist | null): {
  mainCount: number;
  extraCount: number;
  sideCount: number;
  totalCount: number;
} {
  if (!decklist) return { mainCount: 0, extraCount: 0, sideCount: 0, totalCount: 0 };
  const mainCount =
    decklist.mainCount ??
    (decklist.mainDeck?.reduce((acc, c) => acc + (c.count || 1), 0) || 0);
  const extraCount =
    decklist.extraCount ??
    (decklist.extraDeck?.reduce((acc, c) => acc + (c.count || 1), 0) || 0);
  const sideCount =
    decklist.sideCount ??
    (decklist.sideDeck?.reduce((acc, c) => acc + (c.count || 1), 0) || 0);
  return {
    mainCount,
    extraCount,
    sideCount,
    totalCount: mainCount + extraCount + sideCount,
  };
}
