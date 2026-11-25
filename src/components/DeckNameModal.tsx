import React, { useState } from 'react';
import { Shield, X } from 'lucide-react';

export interface DeckNameModalProps {
  playerName: string;
  currentDeckName: string;
  onSave: (deckName: string) => void;
  onClose: () => void;
}

export const DeckNameModal: React.FC<DeckNameModalProps> = ({
  playerName,
  currentDeckName,
  onSave,
  onClose,
}) => {
  const [deckName, setDeckName] = useState(currentDeckName || '');

  const handleSave = () => {
    const sanitized = deckName.trim() || 'Yugioh Deck';
    onSave(sanitized);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card deck-name-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1.5px solid #CBD5E1',
          boxShadow: '0 20px 48px -8px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-title)' }}>
                Deck do Duelista
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'var(--font-body)' }}>
                {playerName}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            style={{
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#64748B',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#334155',
              marginBottom: '8px',
              fontFamily: 'var(--font-title)',
            }}
          >
            Nome do Deck:
          </label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Ex: Diva Zombie, Blackwing..."
            style={{
              width: '100%',
              padding: '11px 14px',
              background: '#F8FAFC',
              border: '1.5px solid #CBD5E1',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#0F172A',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '4px',
              fontFamily: 'var(--font-body)',
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
        </div>

        <div
          style={{
            padding: '12px 20px 16px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            }}
          >
            Salvar Deck
          </button>
        </div>
      </div>
    </div>
  );
};
