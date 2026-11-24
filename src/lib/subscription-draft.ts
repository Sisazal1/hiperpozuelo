"use client";
import { cleanItems, cleanWeeks, subscriptionConfig, type SubItem } from "@/config/subscription";

const KEY = "hp-reposicion";
export type Draft = { items: SubItem[]; weeks: number };
export function readDraft(): Draft {
  try {
    const d = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return { items: cleanItems(d?.items) ?? [], weeks: cleanWeeks(d?.weeks) ?? subscriptionConfig.defaultWeeks };
  } catch {
    return { items: [], weeks: subscriptionConfig.defaultWeeks };
  }
}
export function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}
