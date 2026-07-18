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

export type AnalysisValue =
  | "low"
  | "medium"
  | "high";

export type CrossAnalysisFilters = {
  sports: string[];
  competitions: string[];
  markets: string[];
  bookmakers: string[];
  confidenceLevels: number[];
  values: AnalysisValue[];
  tags: string[];
  minimumOdds: number | null;
  maximumOdds: number | null;
};

export type ParsedAnalysisQuery = {
  filters: CrossAnalysisFilters;
  detectedFilters: string[];
};

export type CrossAnalysisPerformance = {
  totalBets: number;
  settledBets: number;
  pendingBets: number;
  wins: number;
  losses: number;
  voids: number;
  stake: number;
  exposure: number;
  profit: number;
  roi: number;
  winRate: number;
};

export type CrossAnalysisResult = {
  filters: CrossAnalysisFilters;
  detectedFilters: string[];
  performance: CrossAnalysisPerformance;
};

export type DecisionScoreTone =
  | "excellent"
  | "good"
  | "warning"
  | "critical"
  | "insufficient";

export type DecisionScoreCategory =
  | "stakeManagement"
  | "confidence"
  | "value"
  | "diversification"
  | "discipline"
  | "performance";

export type DecisionScoreComponent = {
  id: DecisionScoreCategory;
  label: string;
  score: number;
  maximumScore: number;
  percentage: number;
  tone: DecisionScoreTone;
  summary: string;
  evidence: string[];
};

export type DecisionScoreReport = {
  score: number;
  maximumScore: 100;
  percentage: number;
  tone: DecisionScoreTone;
  label: string;
  sampleSize: number;
  isReliable: boolean;
  components: DecisionScoreComponent[];
  strengths: string[];
  warnings: string[];
};
