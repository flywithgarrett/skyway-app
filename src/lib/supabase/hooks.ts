"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "./client";
import type { User } from "@supabase/supabase-js";

// ═══ Auth Hook ═══

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }, [supabase.auth]);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message || null };
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase.auth]);

  return { user, loading, signInWithEmail, signUpWithEmail, signOut };
}

// ═══ Saved Flights Hook ═══

export interface SavedFlight {
  id: string;
  callsign: string;
  flightNumber: string;
  airlineCode: string | null;
  airlineName: string | null;
  originCode: string | null;
  destinationCode: string | null;
  aircraftType: string | null;
  registration: string | null;
  createdAt: string;
}

export function useSavedFlights(userId: string | null) {
  const [savedFlights, setSavedFlights] = useState<SavedFlight[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Fetch saved flights
  const fetchSaved = useCallback(async () => {
    if (!userId) { setSavedFlights([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("saved_flights")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setSavedFlights(data.map((r) => ({
        id: r.id,
        callsign: r.callsign,
        flightNumber: r.flight_number,
        airlineCode: r.airline_code,
        airlineName: r.airline_name,
        originCode: r.origin_code,
        destinationCode: r.destination_code,
        aircraftType: r.aircraft_type,
        registration: r.registration,
        createdAt: r.created_at,
      })));
    }
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const saveFlight = useCallback(async (flight: {
    callsign: string; flightNumber: string; airlineCode?: string; airlineName?: string;
    originCode?: string; destinationCode?: string; aircraftType?: string; registration?: string;
  }) => {
    if (!userId) return { error: "Not signed in" };
    const { error } = await supabase.from("saved_flights").insert({
      user_id: userId,
      callsign: flight.callsign,
      flight_number: flight.flightNumber,
      airline_code: flight.airlineCode || null,
      airline_name: flight.airlineName || null,
      origin_code: flight.originCode || null,
      destination_code: flight.destinationCode || null,
      aircraft_type: flight.aircraftType || null,
      registration: flight.registration || null,
    });
    if (!error) fetchSaved();
    return { error: error?.message || null };
  }, [userId, supabase, fetchSaved]);

  const unsaveFlight = useCallback(async (callsign: string) => {
    if (!userId) return;
    await supabase.from("saved_flights").delete().eq("user_id", userId).eq("callsign", callsign);
    fetchSaved();
  }, [userId, supabase, fetchSaved]);

  const isSaved = useCallback((callsign: string) => {
    return savedFlights.some((f) => f.callsign === callsign);
  }, [savedFlights]);

  return { savedFlights, loading, saveFlight, unsaveFlight, isSaved };
}

// ═══ Persistent Alert History Hook ═══

export interface PersistedAlert {
  id: string;
  flightId: string;
  flightNumber: string;
  airlineCode: string | null;
  airlineColor: string | null;
  originCode: string | null;
  destinationCode: string | null;
  alertType: string;
  title: string;
  subtitle: string | null;
  severity: string;
  read: boolean;
  createdAt: string;
}

export function useAlertHistory(userId: string | null) {
  const [alerts, setAlerts] = useState<PersistedAlert[]>([]);
  const supabase = createClient();

  const fetchAlerts = useCallback(async () => {
    if (!userId) { setAlerts([]); return; }
    const { data } = await supabase
      .from("alert_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      setAlerts(data.map((r) => ({
        id: r.id,
        flightId: r.flight_id,
        flightNumber: r.flight_number,
        airlineCode: r.airline_code,
        airlineColor: r.airline_color,
        originCode: r.origin_code,
        destinationCode: r.destination_code,
        alertType: r.alert_type,
        title: r.title,
        subtitle: r.subtitle,
        severity: r.severity,
        read: r.read,
        createdAt: r.created_at,
      })));
    }
  }, [userId, supabase]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const persistAlert = useCallback(async (alert: {
    flightId: string; flightNumber: string; airlineCode?: string; airlineColor?: string;
    originCode?: string; destinationCode?: string; alertType: string;
    title: string; subtitle?: string; severity: string;
  }) => {
    if (!userId) return;
    await supabase.from("alert_history").insert({
      user_id: userId,
      flight_id: alert.flightId,
      flight_number: alert.flightNumber,
      airline_code: alert.airlineCode || null,
      airline_color: alert.airlineColor || null,
      origin_code: alert.originCode || null,
      destination_code: alert.destinationCode || null,
      alert_type: alert.alertType,
      title: alert.title,
      subtitle: alert.subtitle || null,
      severity: alert.severity,
    });
    fetchAlerts();
  }, [userId, supabase, fetchAlerts]);

  const markRead = useCallback(async (id: string) => {
    if (!userId) return;
    await supabase.from("alert_history").update({ read: true }).eq("id", id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  }, [userId, supabase]);

  return { alerts, persistAlert, markRead };
}
