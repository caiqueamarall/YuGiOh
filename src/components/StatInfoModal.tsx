import React from 'react';
import { X, Sparkles, Calculator, BookOpen, ShieldCheck } from 'lucide-react';

export type TiebreakStatType = 'PMW' | 'OMW' | 'PGW' | 'OGW';

interface StatInfoModalProps {
  statType: TiebreakStatType;
  onClose: () => void;
}

interface StatDetail {
  code: string;
  englishName: string;
  portugueseMeaning: string;
  badgeColor: string;
  summary: string;
  howItWorks: string;
  formula: string;
  tcgRulesFloor: string;
  example: string;
  importanceRank: string;
}

const STAT_DETAILS: Record<TiebreakStatType, StatDetail> = {
  PMW: {
    code: 'PMW%',
    englishName: 'Player Match Win Percentage',
    portugueseMeaning: 'Aproveitamento de Vitórias em Partidas (Matches) do Jogador',
    badgeColor: '#38bdf8',
    importanceRank: 'Classificação Direta de Pontos',
    summary:
      'Mede a porcentagem de partidas vencidas pelo próprio duelista em relação ao total de rodadas disputadas.',
    howItWorks:
      'Cada vitória em Match vale 3 pontos e cada empate vale 1 ponto. O PMW% converte esses pontos em aproveitamento percentual sobre o máximo possível.',
    formula: 'PMW = (Pontos do Jogador) / (Total de Rodadas × 3)',
    tcgRulesFloor:
      'Piso Oficial TCG: Um duelista nunca pode ter PMW abaixo de 0.33 (33,33%). Se o cálculo der menos, é elevado para 0.33.',
    example:
      'Num torneio de 4 rodadas (máximo 12 pts): se você fez 3 vitórias (9 pts), seu PMW é 9 / 12 = 0.75 (75,00%).',
  },
  OMW: {
    code: 'OMW%',
    englishName: "Opponents' Match Win Percentage",
    portugueseMeaning: 'Força da Tabela dos Oponentes ("Mínimos")',
    badgeColor: '#f59e0b',
    importanceRank: '1º Critério Oficial de Desempate TCG',
    summary:
      'Representa a média do aproveitamento (PMW%) de todos os oponentes que você enfrentou no torneio. É o famoso critério dos "Mínimos".',
    howItWorks:
      'Como os emparceiramentos no Suíço são feitos vencedor vs vencedor, quem enfrentou duelistas que ganharam mais jogos teve uma chave muito mais difícil. O OMW% premia o jogador que sobreviveu à chave mais pesada.',
    formula:
      'OMW = Soma dos PMWs de todos os seus oponentes / Número de oponentes enfrentados',
    tcgRulesFloor:
      'Piso Oficial TCG: Caso algum oponente tenha tido aproveitamento inferior a 0.33 (ex: 0 vitórias), o PMW dele é considerado 0.33 para não punir injustamente quem o enfrentou. Folgas (BY) não entram na conta do OMW%.',
    example:
      'Você enfrentou 4 oponentes com PMWs de 0.75, 0.50, 0.50 e 0.33. Seu OMW% será (0.75 + 0.50 + 0.50 + 0.33) / 4 = 0.52 (52,00%).',
  },
  PGW: {
    code: 'PGW%',
    englishName: 'Player Game Win Percentage',
    portugueseMeaning: 'Aproveitamento de Games Individuais do Jogador',
    badgeColor: '#34d399',
    importanceRank: '2º Critério Oficial de Desempate TCG (após Saldo e Confronto)',
    summary:
      'Mede o aproveitamento do duelista em duelos individuais (games) dentro das partidas melhor de três (MD3).',
    howItWorks:
      'Diferencia quem venceu suas partidas com autoridade por 2-0 de quem venceu apertado por 2-1.',
    formula: 'PGW = (Games Vencidos pelo Jogador) / (Total de Games Jogados)',
    tcgRulesFloor:
      'Piso Oficial TCG: Também possui piso de 0.33 (33,33%). Partidas vencidas por 2-0 geram PGW de 1.0 (100%), enquanto vitórias por 2-1 geram PGW de 0.67 (66,7%).',
    example:
      'Se você disputou 9 games no torneio e venceu 7 deles (ganhando partidas 2-0, 2-1, 2-1, etc.), seu PGW é 7 / 9 = 0.78 (77,78%).',
  },
  OGW: {
    code: 'OGW%',
    englishName: "Opponents' Game Win Percentage",
    portugueseMeaning: 'Força dos Oponentes em Games Individuais',
    badgeColor: '#a855f7',
    importanceRank: '3º Critério Oficial de Desempate TCG',
    summary:
      'Calcula a média do PGW% de todos os oponentes que você enfrentou no torneio.',
    howItWorks:
      'Utilizado em casos raros onde pontos, confronto direto, OMW%, saldo e PGW% ainda persistirem rigorosamente empatados.',
    formula:
      'OGW = Soma dos PGWs de todos os seus oponentes / Número de oponentes enfrentados',
    tcgRulesFloor:
      'Piso Oficial TCG: O PGW de qualquer oponente abaixo de 0.33 é elevado para 0.33 para fins do cálculo de OGW.',
    example:
      'Média dos aproveitamentos de games dos seus oponentes. Ex: se a média dos 4 oponentes resultou em 0.54, seu OGW% é 54,00%.',
  },
};

export const StatInfoModal: React.FC<StatInfoModalProps> = ({ statType, onClose }) => {
  const info = STAT_DETAILS[statType] || STAT_DETAILS.OMW;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1300 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '92%',
          background: '#0a0d16',
          border: `1px solid ${info.badgeColor}55`,
          borderRadius: '12px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: `0 15px 45px rgba(0,0,0,0.85), 0 0 25px ${info.badgeColor}22`,
        }}
      >
        {/* Header com identificação em inglês */}
        <div
          style={{
            padding: '16px 20px',
            background: `linear-gradient(135deg, ${info.badgeColor}18 0%, rgba(15, 23, 42, 0.9) 100%)`,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: `${info.badgeColor}25`,
                border: `1px solid ${info.badgeColor}`,
                color: info.badgeColor,
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '14px',
                letterSpacing: '0.04em',
              }}
            >
              {info.code}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: 800 }}>
                {info.englishName}
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {info.portugueseMeaning}
              </span>
            </div>
          </div>

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

        {/* Corpo explicativo */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Prioridade no Desempate */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
          >
            <ShieldCheck size={16} style={{ color: info.badgeColor }} />
            <span style={{ color: '#cbd5e1' }}>
              Importância no Torneio: <strong style={{ color: '#fff' }}>{info.importanceRank}</strong>
            </span>
          </div>

          {/* O que é */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 800,
                color: info.badgeColor,
                marginBottom: '4px',
              }}
            >
              <BookOpen size={14} />
              <span>O QUE SIGNIFICA:</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: '1.55' }}>
              {info.summary}
            </p>
          </div>

          {/* Como funciona e justificativa competitiva */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#fbbf24',
                marginBottom: '4px',
              }}
            >
              <Sparkles size={14} />
              <span>COMO FUNCIONA NA PRÁTICA:</span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.55' }}>
              {info.howItWorks}
            </p>
          </div>

          {/* Fórmula e Piso TCG */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#94a3b8',
                marginBottom: '6px',
              }}
            >
              <Calculator size={13} />
              <span>FÓRMULA OFICIAL:</span>
            </div>
            <code
              style={{
                display: 'block',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '6px 10px',
                borderRadius: '4px',
                color: '#f8fafc',
                fontSize: '12px',
                fontFamily: 'monospace',
                marginBottom: '8px',
              }}
            >
              {info.formula}
            </code>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#94a3b8', lineHeight: '1.45' }}>
              ℹ️ {info.tcgRulesFloor}
            </p>
          </div>

          {/* Exemplo prático */}
          <div
            style={{
              background: `${info.badgeColor}0e`,
              border: `1px solid ${info.badgeColor}30`,
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              lineHeight: '1.5',
              color: '#e2e8f0',
            }}
          >
            <strong style={{ color: info.badgeColor }}>Exemplo Prático:</strong> {info.example}
          </div>
        </div>

        {/* Rodapé com botão Fechar */}
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn-primary-gold"
            onClick={onClose}
            style={{ padding: '6px 20px', fontSize: '12.5px' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
