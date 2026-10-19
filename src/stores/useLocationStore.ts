import { create } from 'zustand';
import type { SceneryType } from '@/types/location';

interface LocationStore {
  selectedLocationId: string | null;
  selectedSceneryTypes: SceneryType[];
  setSelectedLocationId: (id: string | null) => void;
  toggleSceneryType: (type: SceneryType) => void;
  clearFilters: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  selectedLocationId: null,
  selectedSceneryTypes: [],
  setSelectedLocationId: (id) => set({ selectedLocationId: id }),
  toggleSceneryType: (type) =>
    set((state) => ({
      selectedSceneryTypes: state.selectedSceneryTypes.includes(type)
        ? state.selectedSceneryTypes.filter((t) => t !== type)
        : [...state.selectedSceneryTypes, type],
    })),
  clearFilters: () => set({ selectedSceneryTypes: [] }),
}));
