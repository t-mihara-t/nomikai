import { useState, useEffect, useCallback } from 'react';
import type { Event, EventWithParticipants, CalculateResult } from '@/types';
import { api } from '@/lib/api';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEvents();
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export function useEventDetail(eventId: number | null) {
  const [event, setEvent] = useState<EventWithParticipants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async () => {
    if (eventId === null) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEvent(eventId);
      setEvent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch event');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  return { event, loading, error, refetch: fetchEvent };
}

export function useCalculate() {
  const [result, setResult] = useState<CalculateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(
    async (
      eventId: number,
      data: { total_amount: number; drinker_ratio: number; rounding: 'ceil' | 'floor' }
    ) => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.calculate(eventId, data);
        setResult(res);
        return res;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Calculation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { result, loading, error, calculate };
}
