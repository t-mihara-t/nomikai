import type { Event, EventWithParticipants, Participant, CandidateDate, CalculateResult, RestaurantSearchResult } from '@/types';

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

  getEvent(id: number): Promise<EventWithParticipants> {
    return fetchJson(`${API_BASE}/events/${id}`);
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
    data: Partial<Pick<Event, 'name' | 'date' | 'total_amount' | 'drinker_ratio' | 'has_after_party' | 'paypay_id'>>
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
    data: { name: string; status?: 'attending' | 'absent' | 'pending'; is_drinker: boolean; paypay_id?: string }
  ): Promise<Participant> {
    return fetchJson(`${API_BASE}/events/${eventId}/participants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateParticipant(
    id: number,
    data: Partial<Pick<Participant, 'name' | 'status' | 'is_drinker' | 'paid_status' | 'paypay_id'>>
  ): Promise<Participant> {
    return fetchJson(`${API_BASE}/participants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteParticipant(id: number): Promise<{ success: boolean }> {
    return fetchJson(`${API_BASE}/participants/${id}`, { method: 'DELETE' });
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
  }): Promise<RestaurantSearchResult> {
    const params = new URLSearchParams();
    if (options.keyword) params.set('keyword', options.keyword);
    if (options.count) params.set('count', options.count.toString());
    if (options.range) params.set('range', options.range);
    if (options.budget) params.set('budget', options.budget);
    if (options.party_capacity) params.set('party_capacity', options.party_capacity.toString());
    if (options.lat) params.set('lat', options.lat.toString());
    if (options.lng) params.set('lng', options.lng.toString());
    return fetchJson(`${API_BASE}/restaurants?${params.toString()}`);
  },

  // Calculate
  calculate(
    eventId: number,
    data: { total_amount: number; drinker_ratio: number; rounding: 'ceil' | 'floor' }
  ): Promise<CalculateResult> {
    return fetchJson(`${API_BASE}/events/${eventId}/calculate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
