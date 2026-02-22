export interface Event {
  id: number;
  name: string;
  date: string;
  total_amount: number | null;
  drinker_ratio: number;
  paypay_id: string | null;
  created_at: string;
}

export interface Participant {
  id: number;
  event_id: number;
  name: string;
  status: 'attending' | 'absent';
  is_drinker: boolean;
  amount_to_pay: number | null;
  paid_status: boolean;
  paypay_id: string | null;
  created_at: string;
}

export interface EventWithParticipants extends Event {
  participants: Participant[];
}

export interface CalculateRequest {
  total_amount: number;
  drinker_ratio: number;
  rounding: 'ceil' | 'floor';
}

export interface CalculateResult {
  drinker_amount: number;
  non_drinker_amount: number;
  drinker_count: number;
  non_drinker_count: number;
  total_collected: number;
  difference: number;
}
