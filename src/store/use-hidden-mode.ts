import { create } from 'zustand';

interface HiddenModeState {
    isEnabled: boolean;
    enable: () => void;
    // We could add reset/disable if needed, but the requirement only says "until this app close", 
    // which naturally resets if we don't persist this state. 
    // Zustand store in memory is perfect for "until app close".
}

export const useHiddenMode = create<HiddenModeState>((set) => ({
    isEnabled: false,
    enable: () => set({ isEnabled: true }),
}));
