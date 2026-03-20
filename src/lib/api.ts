import type { Event, EventWithParticipants, Participant, CandidateDate, CalculateResult, RestaurantSearchResult, VenueSelection, Restaurant, ParticipantResponse, Arrival, DrinkOrder, CustomVenueLink, PointsSummary, RecruitPointRecord } from '@/types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((error as { error: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Events
  getEvents(): Promise<Event[]> {
    return fetchJson(`${API_BASE}/events`);
  },

  async getEvent(id: number): Promise<EventWithParticipants> {
    const data = await fetchJson<EventWithParticipants>(`${API_BASE}/events/${id}`);
    // Normalize event fields (D1 stores booleans as 0/1)
    data.has_after_party = !!data.has_after_party;
    data.is_active = data.is_active !== undefined ? !!data.is_active : true;
    // Normalize participant fields that may be missing from older DB schemas
    if (data.participants) {
      data.participants = data.participants.map(p => ({
        ...p,
        multiplier: p.multiplier ?? 1.0,
        discount_rate: p.discount_rate ?? 0,
        join_after_party: !!p.join_after_party,
      }));
    }
    if (data.after_party_event?.participants) {
      data.after_party_event.participants = data.after_party_event.participants.map(p => ({
        ...p,
        multiplier: p.multiplier ?? 1.0,
        discount_rate: p.discount_rate ?? 0,
        join_after_party: !!p.join_after_party,
      }));
    }
    return data;
  },

  createEvent(data: {
    name: string;
    date: string;
    has_after_party?: boolean;
    candidate_dates?: string[];
    paypay_id?: string;
  }): Promise<Event> {
    return fetchJson(`${API_BASE}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEvent(
    id: number,
    data: Partial<Pick<Event, 'name' | 'date' | 'total_amount' | 'drinker_ratio' | 'has_after_party' | 'paypay_id' | 'kampa_amount' | 'auto_delete_at' | 'is_active'>>
  ): Promise<Event> {
    return fetchJson(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteEvent(id: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/events/${id}`, { method: 'DELETE' });
  },

  // Candidate Dates
  addCandidateDate(eventId: number, dateTime: string): Promise<CandidateDate> {
    return fetchJson(`${API_BASE}/events/${eventId}/dates`, {
      method: 'POST',
      body: JSON.stringify({ date_time: dateTime }),
    });
  },

  deleteCandidateDate(id: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/dates/${id}`, { method: 'DELETE' });
  },

  // Participants
  addParticipant(
    eventId: number,
    data: { name: string; is_drinker?: boolean }
  ): Promise<Participant> {
    return fetchJson(`${API_BASE}/events/${eventId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateParticipant(
    id: number,
    data: Partial<Pick<Participant, 'name' | 'status' | 'is_drinker' | 'paid_status' | 'paypay_id' | 'multiplier' | 'discount_rate' | 'join_after_party'>>
  ): Promise<Participant> {
    return fetchJson(`${API_BASE}/participants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteParticipant(id: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/participants/${id}`, { method: 'DELETE' });
  },

  // Participant Responses (per-date)
  submitResponses(
    eventId: number,
    data: {
      participant_id: number;
      responses: Array<{
        candidate_date_id: number;
        status: 'attending' | 'absent' | 'pending';
        after_party_status?: 'attending' | 'absent' | 'pending';
      }>;
    }
  ): Promise<ParticipantResponse[]> {
    return fetchJson(`${API_BASE}/events/${eventId}/responses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Restaurants
  searchRestaurants(options: {
    keyword?: string;
    count?: number;
    range?: string;
    budget?: string;
    party_capacity?: number;
    lat?: number;
    lng?: number;
    free_drink?: boolean;
    card?: boolean;
  }): Promise<RestaurantSearchResult> {
    const params = new URLSearchParams();
    if (options.keyword) params.set('keyword', options.keyword);
    if (options.count) params.set('count', options.count.toString());
    if (options.range) params.set('range', options.range);
    if (options.budget) params.set('budget', options.budget);
    if (options.party_capacity) params.set('party_capacity', options.party_capacity.toString());
    if (options.lat) params.set('lat', options.lat.toString());
    if (options.lng) params.set('lng', options.lng.toString());
    if (options.free_drink) params.set('free_drink', '1');
    if (options.card) params.set('card', '1');
    return fetchJson(`${API_BASE}/restaurants?${params.toString()}`);
  },

  // Venue Selections
  getVenues(eventId: number): Promise<VenueSelection[]> {
    return fetchJson(`${API_BASE}/events/${eventId}/venues`);
  },

  addVenue(eventId: number, data: { venue_type: 'primary' | 'after_party'; restaurant: Restaurant }): Promise<VenueSelection> {
    return fetchJson(`${API_BASE}/events/${eventId}/venues`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteVenue(id: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/venues/${id}`, { method: 'DELETE' });
  },

  // Calculate
  calculate(
    eventId: number,
    data: { total_amount: number; drinker_ratio: number; kampa_amount: number; rounding: 'ceil' | 'floor'; apply_discount?: boolean }
  ): Promise<CalculateResult> {
    return fetchJson(`${API_BASE}/events/${eventId}/calculate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // After-party event
  createAfterPartyEvent(
    parentEventId: number,
    data: { participant_ids: number[] }
  ): Promise<Event> {
    return fetchJson(`${API_BASE}/events/${parentEventId}/after-party`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Bulk update participants
  bulkUpdateParticipants(
    eventId: number,
    data: { participant_ids: number[]; updates: Partial<Pick<Participant, 'status' | 'is_drinker'>> }
  ): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/events/${eventId}/participants/bulk`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Arrivals (Heroic Entry)
  getArrivals(eventId: number): Promise<Arrival[]> {
    return fetchJson(`${API_BASE}/events/${eventId}/arrivals`);
  },

  announceArrival(
    eventId: number,
    data: { participant_id: number; eta_minutes?: number; message?: string }
  ): Promise<Arrival> {
    return fetchJson(`${API_BASE}/events/${eventId}/arrivals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateArrival(
    id: number,
    data: Partial<Pick<Arrival, 'status' | 'eta_minutes'>>
  ): Promise<Arrival> {
    return fetchJson(`${API_BASE}/arrivals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Drink Orders
  getDrinkOrders(eventId: number): Promise<DrinkOrder[]> {
    return fetchJson(`${API_BASE}/events/${eventId}/drink-orders`);
  },

  createDrinkOrder(
    eventId: number,
    data: { participant_id: number; drink_name: string; quantity?: number; note?: string }
  ): Promise<DrinkOrder> {
    return fetchJson(`${API_BASE}/events/${eventId}/drink-orders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  confirmDrinkOrder(id: number): Promise<DrinkOrder> {
    return fetchJson(`${API_BASE}/drink-orders/${id}/confirm`, {
      method: 'PUT',
    });
  },

  deleteDrinkOrder(id: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/drink-orders/${id}`, { method: 'DELETE' });
  },

  // Custom Venue Links
  getCustomVenueLinks(eventId: number): Promise<CustomVenueLink[]> {
    return fetchJson(`${API_BASE}/events/${eventId}/custom-venues`);
  },

  addCustomVenueLink(
    eventId: number,
    data: { venue_type: 'primary' | 'after_party'; label: string; url: string }
  ): Promise<CustomVenueLink> {
    return fetchJson(`${API_BASE}/events/${eventId}/custom-venues`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteCustomVenueLink(id: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/custom-venues/${id}`, { method: 'DELETE' });
  },

  // LINE Integration
  getLineAuthUrl(eventId: number): Promise<{ auth_url: string; redirect_uri: string }> {
    return fetchJson(`${API_BASE}/events/${eventId}/line-link`);
  },

  unlinkLine(eventId: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/events/${eventId}/line-link`, { method: 'DELETE' });
  },

  // Trigger LINE reminder check (called during polling)
  checkLineReminders(): Promise<{ sent: number; checked: number }> {
    return fetchJson(`${API_BASE}/cron/notify`, { method: 'POST' });
  },

  // Trigger recovery actions (last train reminder + convenience store suggestion)
  checkRecoveryActions(): Promise<{ checked: number; sent_reminders: number; sent_recovery: number }> {
    return fetchJson(`${API_BASE}/cron/recovery`, { method: 'POST' });
  },

  // Recruit Points
  getPoints(eventId: number): Promise<PointsSummary> {
    return fetchJson(`${API_BASE}/events/${eventId}/points`);
  },

  addPoints(
    eventId: number,
    data: { type: 'earned' | 'contributed'; amount: number; description?: string }
  ): Promise<RecruitPointRecord> {
    return fetchJson(`${API_BASE}/events/${eventId}/points`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Pool surplus as earned points (余剰金をポイントとして記録)
  poolSurplus(eventId: number, amount: number): Promise<RecruitPointRecord> {
    return fetchJson(`${API_BASE}/events/${eventId}/points`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'earned',
        amount,
        description: `精算余剰金プール（500円刻み端数）`,
      }),
    });
  },

};
