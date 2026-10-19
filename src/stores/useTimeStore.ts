import { create } from 'zustand';
import { dateKeyAtLocation } from '@/lib/location-time';

interface TimeStore {
  dateKey: string;
  timeOfDay: number; // location-local hours, 0 <= h < 24
  setDateKey: (date: string) => void;
  setTimeOfDay: (hours: number) => void;
}

export const useTimeStore = create<TimeStore>((set) => ({
  dateKey: dateKeyAtLocation(new Date()),
  timeOfDay: 12,
  setDateKey: (dateKey) => { if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) set({ dateKey }); },
  setTimeOfDay: (hours) => set({ timeOfDay: Math.max(0, Math.min(1439 / 60, hours)) }),
}));
