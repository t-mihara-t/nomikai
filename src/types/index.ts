export interface CandidateDate {
  id: number;
  event_id: number;
  date_time: string;
  created_at: string;
}

export interface Event {
  id: number;
  name: string;
  date: string;
  total_amount: number | null;
  drinker_ratio: number;
  has_after_party: boolean;
  paypay_id: string | null;
  kampa_amount: number;
  parent_event_id: number | null;
  created_at: string;
  candidate_dates: CandidateDate[];
}

export interface Participant {
  id: number;
  event_id: number;
  name: string;
  status: 'attending' | 'absent' | 'pending';
  is_drinker: boolean;
  amount_to_pay: number | null;
  paid_status: boolean;
  paypay_id: string | null;
  multiplier: number;
  discount_rate: number;
  join_after_party: boolean;
  created_at: string;
}

export interface ParticipantResponse {
  id: number;
  participant_id: number;
  candidate_date_id: number;
  status: 'attending' | 'absent' | 'pending';
  after_party_status: 'attending' | 'absent' | 'pending' | null;
  created_at: string;
}

export interface EventWithParticipants extends Event {
  participants: Participant[];
  venue_selections: VenueSelection[];
  participant_responses: ParticipantResponse[];
  after_party_event?: EventWithParticipants | null;
}

export interface CalculateRequest {
  total_amount: number;
  drinker_ratio: number;
  kampa_amount: number;
  rounding: 'ceil' | 'floor';
}

export interface ParticipantBreakdown {
  participant_id: number;
  name: string;
  base_amount: number;
  multiplier: number;
  is_drinker: boolean;
  drinker_ratio: number;
  after_multiplier: number;
  discount_rate: number;
  discount_amount: number;
  final_amount: number;
}

export interface CalculateResult {
  drinker_amount: number;
  non_drinker_amount: number;
  drinker_count: number;
  non_drinker_count: number;
  total_collected: number;
  difference: number;
  kampa_amount: number;
  adjusted_total: number;
  breakdowns: ParticipantBreakdown[];
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  station_name: string;
  lat: number;
  lng: number;
  catch: string;
  open: string;
  budget_average: string;
  budget_name: string;
  genre: string;
  photo_url: string;
  url: string;
  capacity: number;
  party_capacity: number;
  course: string;
  free_drink: string;
  free_food: string;
  private_room: string;
  lunch: string;
}

export interface RestaurantSearchResult {
  total: number;
  shops: Restaurant[];
}

export interface VenueSelection {
  id: number;
  event_id: number;
  venue_type: 'primary' | 'after_party';
  restaurant: Restaurant;
  created_at: string;
}
