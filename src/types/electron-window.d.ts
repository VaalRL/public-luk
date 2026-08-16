export { };

declare global {
    interface Window {
        electron?: {
            versions: {
                node: string;
                chrome: string;
                electron: string;
            };
            getAppVersion: () => Promise<string>;
            checkForUpdates: () => Promise<{
                updateAvailable: boolean;
                version?: string;
                releaseNotes?: string | Array<{ releaseName: string; version: string }>;
            }>;
            downloadUpdate: () => Promise<void>;
            quitAndInstall: () => Promise<void>;
            onUpdateStatus: (
                callback: (status: string, info?: unknown) => void
            ) => () => void;
        };
    }
}
