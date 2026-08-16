import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * UI Store
 * 管理 UI 相關的全域狀態（側邊欄、對話框、主題等）
 */

/** 對話框附帶的資料，形狀依 dialogId 而定 */
export type DialogData = Record<string, unknown> | null;

interface UIState {
    // Sidebar
    isSidebarOpen: boolean;
    isSidebarCollapsed: boolean;

    // Dialogs
    activeDialog: string | null;
    dialogData: DialogData;

    // Theme
    theme: 'light' | 'dark' | 'system';

    // Loading states
    globalLoading: boolean;
    loadingMessage: string | null;

    // Notifications
    notifications: Array<{
        id: string;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
        timestamp: Date;
    }>;

    // Collapsible sections
    collapsedSections: Record<string, boolean>;

    // Actions - Sidebar
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    toggleSidebarCollapse: () => void;
    setSidebarCollapsed: (isCollapsed: boolean) => void;

    // Actions - Dialogs
    openDialog: (dialogId: string, data?: DialogData) => void;
    closeDialog: () => void;
    setDialogData: (data: DialogData) => void;

    // Actions - Theme
    setTheme: (theme: 'light' | 'dark' | 'system') => void;

    // Actions - Loading
    setGlobalLoading: (isLoading: boolean, message?: string) => void;

    // Actions - Notifications
    addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;

    // Actions - Collapsible sections
    toggleSection: (sectionId: string) => void;
    setSectionCollapsed: (sectionId: string, isCollapsed: boolean) => void;

    // Reset
    reset: () => void;
}

const initialState = {
    isSidebarOpen: true,
    isSidebarCollapsed: false,
    activeDialog: null,
    dialogData: null,
    theme: 'system' as const,
    globalLoading: false,
    loadingMessage: null,
    notifications: [],
    collapsedSections: {},
};

export const useUIStore = create<UIState>()(
    devtools(
        persist(
            (set, get) => ({
                ...initialState,

                // Sidebar Actions
                toggleSidebar: () =>
                    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

                setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

                toggleSidebarCollapse: () =>
                    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

                setSidebarCollapsed: (isCollapsed) =>
                    set({ isSidebarCollapsed: isCollapsed }),

                // Dialog Actions
                openDialog: (dialogId, data = null) =>
                    set({ activeDialog: dialogId, dialogData: data }),

                closeDialog: () =>
                    set({ activeDialog: null, dialogData: null }),

                setDialogData: (data) => set({ dialogData: data }),

                // Theme Actions
                setTheme: (theme) => {
                    set({ theme });
                    // Apply theme to document
                    if (typeof window !== 'undefined') {
                        const root = window.document.documentElement;
                        root.classList.remove('light', 'dark');

                        if (theme === 'system') {
                            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                                ? 'dark'
                                : 'light';
                            root.classList.add(systemTheme);
                        } else {
                            root.classList.add(theme);
                        }
                    }
                },

                // Loading Actions
                setGlobalLoading: (isLoading, message) =>
                    set({ globalLoading: isLoading, loadingMessage: message || null }),

                // Notification Actions
                addNotification: (notification) => {
                    const id = `notification-${Date.now()}-${Math.random()}`;
                    const newNotification = {
                        ...notification,
                        id,
                        timestamp: new Date(),
                    };

                    set((state) => ({
                        notifications: [...state.notifications, newNotification],
                    }));

                    // Auto-remove after 5 seconds
                    setTimeout(() => {
                        get().removeNotification(id);
                    }, 5000);
                },

                removeNotification: (id) =>
                    set((state) => ({
                        notifications: state.notifications.filter((n) => n.id !== id),
                    })),

                clearNotifications: () => set({ notifications: [] }),

                // Collapsible Section Actions
                toggleSection: (sectionId) =>
                    set((state) => ({
                        collapsedSections: {
                            ...state.collapsedSections,
                            [sectionId]: !state.collapsedSections[sectionId],
                        },
                    })),

                setSectionCollapsed: (sectionId, isCollapsed) =>
                    set((state) => ({
                        collapsedSections: {
                            ...state.collapsedSections,
                            [sectionId]: isCollapsed,
                        },
                    })),

                // Reset
                reset: () => set(initialState),
            }),
            {
                name: 'ui-store',
                // Only persist theme and collapsed sections
                partialize: (state) => ({
                    theme: state.theme,
                    collapsedSections: state.collapsedSections,
                    isSidebarCollapsed: state.isSidebarCollapsed,
                }),
            }
        ),
        { name: 'UIStore' }
    )
);
