import React from 'react';
import type { Player } from '../types';

interface RadarChartProps {
  player: Player;
  size?: number;
}

interface MetricAxis {
  label: string;
  value: number; // 0 a 100
  rawValue: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({ player, size = 320 }) => {
  const center = size / 2;
  const radius = (size / 2) - 48; // margem para rótulos

  // 1. Calcula as 6 métricas para o diagrama de radar:
  const totalMatches = player.wins + player.draws + player.losses;
  const winRate = totalMatches > 0 ? (player.wins / totalMatches) * 100 : 0;
  
  // Assiduidade (normalizada para até 10 torneios = 100)
  const attendanceScore = Math.min(100, (player.participations / 6) * 100);

  // Eficiência de pontos (média de pontos por torneio, máx 9 pts = 100)
  const pointsPerTournament = player.participations > 0 ? player.points / player.participations : 0;
  const efficiencyScore = Math.min(100, (pointsPerTournament / 9) * 100);

  // Troféus (normalizado para até 8 troféus = 100)
  const trophyScore = Math.min(100, (player.trophies / 6) * 100);

  // Versatilidade de Decks (quantos decks diferentes o jogador já usou)
  const uniqueDecks = new Set(player.decksHistory?.map((h) => h.deckName) || []).size;
  const versatilityScore = Math.min(100, Math.max(30, uniqueDecks * 33.3));

  // Resiliência (100 - % de derrotas)
  const lossRate = totalMatches > 0 ? (player.losses / totalMatches) * 100 : 0;
  const resilienceScore = Math.max(10, 100 - lossRate);

  const axes: MetricAxis[] = [
    { label: 'Vitórias', value: winRate, rawValue: `${Math.round(winRate)}%` },
    { label: 'Assiduidade', value: attendanceScore, rawValue: `${player.participations} part.` },
    { label: 'Eficiência', value: efficiencyScore, rawValue: `${pointsPerTournament.toFixed(1)} pts/t` },
    { label: 'Troféus', value: trophyScore, rawValue: `${player.trophies} troféus` },
    { label: 'Versatilidade', value: versatilityScore, rawValue: `${Math.max(1, uniqueDecks)} decks` },
    { label: 'Resiliência', value: resilienceScore, rawValue: `${Math.round(resilienceScore)}%` },
  ];

  const angleStep = (Math.PI * 2) / axes.length;

  // Função auxiliar para converter polar para cartesiano
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2; // Inicia no topo (-90 graus)
    const distance = (value / 100) * radius;
    const x = center + distance * Math.cos(angle);
    const y = center + distance * Math.sin(angle);
    return { x, y };
  };

  // Coordenadas do polígono de dados
  const pointsString = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(axis.value, i);
      return `${x},${y}`;
    })
    .join(' ');

  // Anéis concêntricos (níveis: 20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="radar-chart-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radar-svg">
        <defs>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.2" />
          </linearGradient>
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Círculos / Polígonos de Nível */}
        {levels.map((level, lvlIdx) => {
          const levelPoints = axes
            .map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const x = center + level * radius * Math.cos(angle);
              const y = center + level * radius * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <polygon
              key={`level-${lvlIdx}`}
              points={levelPoints}
              fill={lvlIdx === levels.length - 1 ? 'rgba(255, 255, 255, 0.02)' : 'none'}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
              strokeDasharray={lvlIdx < levels.length - 1 ? '2 2' : 'none'}
            />
          );
        })}

        {/* Linhas dos Eixos */}
        {axes.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);

          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="1"
            />
          );
        })}

        {/* Polígono do Jogador com Efeito de Brilho */}
        <polygon
          points={pointsString}
          fill="url(#radarFill)"
          stroke="#F59E0B"
          strokeWidth="2.5"
          filter="url(#radarGlow)"
        />

        {/* Pontos nos Vértices */}
        {axes.map((axis, i) => {
          const { x, y } = getCoordinates(axis.value, i);
          return (
            <g key={`point-${i}`}>
              <circle cx={x} cy={y} r="4.5" fill="#F59E0B" stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* Rótulos dos Eixos */}
        {axes.map((axis, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelDist = radius + 22;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);

          return (
            <g key={`label-${i}`} transform={`translate(${lx}, ${ly})`}>
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="radar-label-text"
              >
                {axis.label}
              </text>
              <text
                textAnchor="middle"
                dominantBaseline="central"
                y="12"
                className="radar-sublabel-text"
              >
                {axis.rawValue}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
