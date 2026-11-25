import React, { useState } from 'react';
import { X, Trophy, Calculator, BookOpen, ShieldCheck, Check } from 'lucide-react';

export type TiebreakStatType = 'PMW' | 'OMW' | 'PGW' | 'OGW';

interface StatInfoModalProps {
  statType: TiebreakStatType;
  onClose: () => void;
}

interface StatDetail {
  code: string;
  name: string;
  shortDesc: string;
  importanceRank: string;
  summary: string;
  howItWorks: string;
  formula: string;
  tcgRulesFloor: string;
  example: string;
}

const STAT_DETAILS: Record<TiebreakStatType, StatDetail> = {
  OMW: {
    code: 'OMW%',
    name: "Opponents' Match Win %",
    shortDesc: 'Força dos Oponentes ("Mínimos")',
    importanceRank: '1º Critério Oficial de Desempate',
    summary:
      'Mede a média do aproveitamento de todos os oponentes que você enfrentou. Quanto mais vitórias seus oponentes tiveram, mais difícil foi a sua chave.',
    howItWorks:
      'Como o sistema Suíço emparceira vencedor vs vencedor, quem enfrentou duelistas fortes teve duelos mais difíceis. O OMW% premia quem sobreviveu à chave mais pesada.',
    formula: 'OMW = Soma dos PMWs dos oponentes / Total de oponentes',
    tcgRulesFloor:
      'Piso Oficial TCG: Caso algum oponente tenha aproveitamento menor que 0.33 (33%), o sistema eleva para 0.33 para não prejudicar quem o venceu. Folgas (BY) não entram no OMW%.',
    example:
      'Oponentes com 75%, 50%, 50% e 33% de vitórias resultam em média de 52,00% de OMW%.',
  },
  PMW: {
    code: 'PMW%',
    name: 'Player Match Win %',
    shortDesc: 'Aproveitamento Próprio de Partidas',
    importanceRank: 'Classificação Direta por Pontos',
    summary:
      'Porcentagem de partidas (matches) vencidas pelo próprio duelista em relação ao total de rodadas do torneio.',
    howItWorks:
      'Cada vitória vale 3 pontos e empate vale 1 ponto. O PMW% converte seus pontos no percentual máximo possível do torneio.',
    formula: 'PMW = Pontos do Jogador / (Total de Rodadas × 3)',
    tcgRulesFloor:
      'Piso Oficial TCG: Nenhum jogador tem PMW abaixo de 0.33 (33,33%) para fins de cálculo de desempate dos outros.',
    example:
      'Em 4 rodadas (máximo 12 pts): 3 vitórias (9 pts) equivalem a 9 / 12 = 75,00% de PMW%.',
  },
  PGW: {
    code: 'PGW%',
    name: 'Player Game Win %',
    shortDesc: 'Aproveitamento de Games (2-0 vs 2-1)',
    importanceRank: '2º Critério Oficial de Desempate',
    summary:
      'Mede o saldo de duelos individuais (games) vencidos dentro das partidas melhor de três (MD3).',
    howItWorks:
      'Diferencia quem venceu suas partidas com autoridade por 2-0 de quem venceu apertado por 2-1.',
    formula: 'PGW = Games Vencidos / Total de Games Disputados',
    tcgRulesFloor:
      'Piso Oficial TCG: Uma vitória por 2-0 dá 100% de PGW; uma vitória por 2-1 dá 66,7% de PGW.',
    example:
      'Se você disputou 9 games e venceu 7 deles, seu PGW é 7 / 9 = 77,78%.',
  },
  OGW: {
    code: 'OGW%',
    name: "Opponents' Game Win %",
    shortDesc: 'Força dos Oponentes em Games Individuais',
    importanceRank: '3º Critério Oficial de Desempate',
    summary:
      'Média da porcentagem de games que seus adversários venceram ao longo do torneio.',
    howItWorks:
      'Utilizado em casos raros onde pontos, confronto direto, OMW%, saldo de games e PGW% ainda persistirem rigorosamente empatados.',
    formula: 'OGW = Soma dos PGWs dos oponentes / Total de oponentes',
    tcgRulesFloor:
      'Piso Oficial TCG: Qualquer PGW de oponente abaixo de 0.33 é elevado para 0.33.',
    example:
      'Se a média do aproveitamento de games dos seus adversários for 0.54, seu OGW% é 54,00%.',
  },
};

const STAT_TABS: { id: TiebreakStatType; label: string; badge: string }[] = [
  { id: 'OMW', label: 'OMW%', badge: '1º Desempate' },
  { id: 'PMW', label: 'PMW%', badge: 'Pontuação' },
  { id: 'PGW', label: 'PGW%', badge: '2-0 vs 2-1' },
  { id: 'OGW', label: 'OGW%', badge: 'Games Oponentes' },
];

export const StatInfoModal: React.FC<StatInfoModalProps> = ({ statType, onClose }) => {
  const [currentStat, setCurrentStat] = useState<TiebreakStatType>(statType);
  const info = STAT_DETAILS[currentStat] || STAT_DETAILS.OMW;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 2500,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="modal-card stat-info-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          width: '100%',
          maxHeight: '86vh',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 24px 60px -10px rgba(15, 23, 42, 0.25)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Cabeçalho Limpo & Moderno */}
        <div
          style={{
            padding: '18px 20px 14px 20px',
            borderBottom: '1px solid #EEF2F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
                flexShrink: 0,
              }}
            >
              <Trophy size={18} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0F172A',
                  fontFamily: 'var(--font-title)',
                  lineHeight: 1.2,
                }}
              >
                Critérios de Desempate
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Sistema Suíço Oficial (Konami / TCG)
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#F1F5F9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas Interativas em Segmentos Pill (Limpas e sem subtítulos estourando) */}
        <div
          style={{
            padding: '10px 16px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          {STAT_TABS.map((tab) => {
            const isActive = currentStat === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentStat(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 6px',
                  borderRadius: '12px',
                  border: isActive ? 'none' : '1.5px solid #E2E8F0',
                  background: isActive
                    ? 'linear-gradient(135deg, #063C35 0%, #0D6E62 100%)'
                    : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isActive ? '0 4px 12px rgba(6, 60, 53, 0.25)' : 'none',
                  minWidth: 0,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Corpo Scrollável e Limpo */}
        <div
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          {/* Card de Destaque da Métrica Ativa */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '14px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
            }}
          >
            <div>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#065F46' }}>
                {info.code} — {info.shortDesc}
              </span>
              <div style={{ fontSize: '11.5px', color: '#047857', fontWeight: 600 }}>
                {info.importanceRank}
              </div>
            </div>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#059669',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={14} />
            </div>
          </div>

          {/* O que é */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#0D6E62',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '4px',
              }}
            >
              <BookOpen size={13} />
              <span>O que é:</span>
            </div>
            <p style={{ margin: 0, color: '#334155', fontSize: '13px', textAlign: 'justify' }}>
              {info.summary}
            </p>
          </div>

          {/* Como funciona */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#D97706',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '4px',
              }}
            >
              <ShieldCheck size={13} />
              <span>Na Prática:</span>
            </div>
            <p style={{ margin: 0, color: '#334155', fontSize: '13px', textAlign: 'justify' }}>
              {info.howItWorks}
            </p>
          </div>

          {/* Fórmula & Regra Oficial */}
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#0D6E62',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '8px',
              }}
            >
              <Calculator size={13} />
              <span>Fórmula Oficial:</span>
            </div>
            <div
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #CBD5E1',
                borderLeft: '4px solid #0D6E62',
                padding: '10px 12px',
                borderRadius: '10px',
                fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, sans-serif',
                fontSize: '13px',
                fontWeight: 800,
                lineHeight: 1.4,
                marginBottom: '8px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
              }}
            >
              {info.formula}
            </div>
            <span style={{ fontSize: '12px', color: '#475569', display: 'block', textAlign: 'justify', lineHeight: 1.45 }}>
              {info.tcgRulesFloor}
            </span>
          </div>

          {/* Exemplo Numérico */}
          <div
            style={{
              background: '#FFFBEB',
              borderRadius: '14px',
              padding: '12px 14px',
              border: '1px solid #FDE68A',
              fontSize: '12.5px',
              color: '#92400E',
              textAlign: 'justify',
            }}
          >
            <strong>Exemplo:</strong> {info.example}
          </div>
        </div>

        {/* Rodapé com Ação Clara */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #EEF2F6',
            background: '#FFFFFF',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.18s ease',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
