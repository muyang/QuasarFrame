import { create } from 'zustand';

interface GlobeStore {
  hoveredLocationId: string | null;
  flyTargetId: string | null;
  isFlying: boolean;
  setHoveredLocationId: (id: string | null) => void;
  setFlyTarget: (id: string | null) => void;
  setIsFlying: (flying: boolean) => void;
}

export const useGlobeStore = create<GlobeStore>((set) => ({
  hoveredLocationId: null,
  flyTargetId: null,
  isFlying: false,
  setHoveredLocationId: (id) => set({ hoveredLocationId: id }),
  setFlyTarget: (id) => set({ flyTargetId: id, isFlying: !!id }),
  setIsFlying: (flying) => set({ isFlying: flying }),
}));
