export type BetStatus = "pending" | "win" | "loss" | "void" | "cashout";

export type Bet = {
  id: string;
  user_id: string;
  sport: string;
  competition: string;
  kickoff_at: string | null;
  home_team: string;
  away_team: string;
  market: string;
  selection: string;
  bookmaker: string;
  odds: number;
  stake: number;
  confidence: number | null;
  status: BetStatus;
  profit_loss: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NewBetInput = {
  sport: string;
  competition: string;
  kickoff_at: string | null;
  home_team: string;
  away_team: string;
  market: string;
  selection: string;
  bookmaker: string;
  odds: number;
  stake: number;
  confidence: number | null;
  notes: string | null;
};
