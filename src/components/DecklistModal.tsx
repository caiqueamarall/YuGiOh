import React from 'react';
import type { Decklist } from '../types';
import { DeckNameModal } from './DeckNameModal';

export interface DecklistModalProps {
  decklist?: Decklist | null;
  playerName?: string;
  defaultDeckName?: string;
  readOnly?: boolean;
  onSave?: (savedDecklist: Decklist) => void;
  onClose: () => void;
}

/**
 * DecklistModal simplificado para focar exclusivamente no Nome do Deck,
 * tornando o aplicativo muito mais leve, rápido e sem sobrecarga de imagens de cartas.
 */
export const DecklistModal: React.FC<DecklistModalProps> = ({
  decklist,
  playerName = 'Duelista',
  defaultDeckName = '',
  onSave,
  onClose,
}) => {
  const currentDeck = decklist?.deckName || defaultDeckName || 'Yugioh Deck';

  const handleSave = (newDeckName: string) => {
    if (onSave) {
      onSave({
        id: decklist?.id || `deck_${Date.now()}`,
        deckName: newDeckName,
        mainDeck: [],
        extraDeck: [],
        sideDeck: [],
        mainCount: 0,
        extraCount: 0,
        sideCount: 0,
        updatedAt: new Date().toISOString(),
      });
    }
    onClose();
  };

  return (
    <DeckNameModal
      playerName={playerName}
      currentDeckName={currentDeck}
      onSave={handleSave}
      onClose={onClose}
    />
  );
};
