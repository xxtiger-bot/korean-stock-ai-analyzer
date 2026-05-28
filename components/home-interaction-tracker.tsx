"use client";

import { useEffect } from "react";

type EventCounter = Record<string, number>;

const STORAGE_KEY = "krx_home_events";

function readCounters(): EventCounter {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as EventCounter;
  } catch {
    return {};
  }
}

function writeCounters(counters: EventCounter) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
}

function bumpCounter(key: string) {
  if (!key) return;
  const counters = readCounters();
  const current = counters[key];
  const nextValue = Number.isFinite(current) ? current + 1 : 1;
  counters[key] = nextValue;
  counters.last_event_at = Date.now();
  writeCounters(counters);
}

export function HomeInteractionTracker() {
  useEffect(() => {
    bumpCounter("home_open");

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const trackElement = target.closest<HTMLElement>("[data-home-track]");
      if (!trackElement) return;

      const eventKey = trackElement.dataset.homeTrack;
      if (!eventKey) return;
      bumpCounter(eventKey);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return null;
}

