export type AnalysisSegment =
  | "sport"
  | "competition"
  | "market"
  | "bookmaker"
  | "confidence"
  | "value"
  | "odds"
  | "tag";

export type SegmentPerformance = {
  key: string;
  label: string;
  bets: number;
  wins: number;
  losses: number;
  voids: number;
  stake: number;
  profit: number;
  roi: number;
  winRate: number;
};

export type GlobalPerformance = {
  totalBets: number;
  pendingBets: number;
  settledBets: number;
  wins: number;
  losses: number;
  voids: number;
  totalStake: number;
  exposure: number;
  profit: number;
  roi: number;
  winRate: number;
};

export type BetAnalysisReport = {
  global: GlobalPerformance;
  sports: SegmentPerformance[];
  competitions: SegmentPerformance[];
  markets: SegmentPerformance[];
  bookmakers: SegmentPerformance[];
  confidence: SegmentPerformance[];
  value: SegmentPerformance[];
  odds: SegmentPerformance[];
  tags: SegmentPerformance[];
};

export type AnalysisAnswer = {
  title: string;
  answer: string;
  highlights: string[];
};
