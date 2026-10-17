export interface DeckCardItem {
  cardId: number;
  cardName: string;
  count: number; // 1, 2, ou 3 cópias
  type?: string;
  frameType?: string;
  attribute?: string;
  race?: string;
  level?: number;
  atk?: number;
  def?: number;
  desc?: string;
}

export interface Decklist {
  id?: string;
  deckName: string;
  mainDeck: DeckCardItem[]; // 40-60 cartas
  extraDeck: DeckCardItem[]; // 0-15 cartas (Fusão e Synchro)
  sideDeck: DeckCardItem[]; // 0-15 cartas
  mainCount?: number;
  extraCount?: number;
  sideCount?: number;
  notes?: string;
  updatedAt?: string;
}

export interface PlayerTournamentHistory {
  tournamentId: string;
  tournamentName: string;
  date: string;
  deckName: string;
  decklist?: Decklist; // Decklist completa usada especificamente neste torneio (opcional)
  rank: number;
  matchPoints: number;
  matchWins: number;
  matchDraws: number;
  matchLosses: number;
  hadBy: boolean;
  countsForLeague?: boolean; // Se pontua para o Ranking da Liga ou se foi Freeplay
  isDropped?: boolean; // Se desistiu/dropou do torneio
}

export interface Player {
  id: string;
  name: string; // Ex: "Caique", "Lucas"
  age?: number; // Opcional
  avatarColor?: string;
  active: boolean;
  createdAt: string;

  // Estatísticas acumuladas da Liga Edison Format
  points: number; // Pontuação total acumulada
  wins: number; // Partidas/matches ganhas
  draws: number; // Partidas empatadas
  losses: number; // Partidas perdidas
  participations: number; // Quantidade de torneios jogados
  trophies: number; // Troféus (igual ao número de vitórias acumuladas)
  tournamentTitles?: number; // Torneios em que foi campeão
  byCount?: number; // Vezes que ficou de BY

  // Histórico de torneios com o deck usado em cada um
  decksHistory?: PlayerTournamentHistory[];

  // Decklists salvas do duelista no perfil pessoal
  savedDecklists?: Decklist[];
}

export interface MatchScore {
  gameWins1: number;
  gameWins2: number;
  isDraw: boolean;
  isWO: boolean;
  winnerId: string | null;
}

export interface Match {
  id: string;
  roundNumber: number;
  tableNumber: number;
  player1Id: string;
  player2Id: string | null; // null quando for BY
  isBy: boolean;
  
  // Placar do confronto Melhor de 3 (Bo3)
  gameWins1: number;
  gameWins2: number;
  isCompleted: boolean;
  isDraw: boolean;
  isWO: boolean;
  winnerId: string | null;
}

export interface TournamentRound {
  roundNumber: number;
  matches: Match[];
  isCompleted: boolean;
}

export interface TournamentStanding {
  rank: number;
  playerId: string;
  playerName: string;
  deckName?: string;
  matchPoints: number;
  matchWins: number;
  matchDraws: number;
  matchLosses: number;
  gamesWon: number;
  gamesLost: number;
  gameDiff: number;
  hadBy: boolean;
  omwPercentage: number;
  pmwPercentage: number;
  pgwPercentage: number;
  ogwPercentage: number;
  pmw: number; // Decimal (ex: 0.67)
  omw: number; // Decimal (ex: 0.33)
  pgw: number; // Decimal (ex: 1.00)
  ogw: number; // Decimal (ex: 0.33)
  isDropped?: boolean; // Se o jogador dropou do torneio
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  totalRounds: number; // 4 ou 5 rodadas
  currentRound: number;
  status: 'active' | 'completed';
  playerIds: string[];
  droppedPlayerIds?: string[]; // IDs dos jogadores que droparam deste torneio
  playerDecks?: Record<string, string>; // Mapeia playerId -> Nome do Deck jogado neste torneio
  playerDecklists?: Record<string, Decklist>; // Mapeia playerId -> Decklist completa (Main, Extra, Side) deste torneio
  rounds: TournamentRound[];
  championId?: string;
  runnerUpId?: string;
  createdAt: string;
  completedAt?: string;
  countsForLeague?: boolean; // true = Pontua para a Liga Oficial (padrão); false = Torneio Freeplay
  topCut?: number; // 2, 3, 4 ou 5 (quantitativo de duelistas no TOP selecionado pelo gestor)
}

export type ActiveTab = 'ranking' | 'tournament' | 'players' | 'history' | 'settings';
