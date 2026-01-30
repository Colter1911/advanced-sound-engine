import { Logger } from '@utils/logger';
import type { LibraryState } from '@t/library';

const MODULE_ID = 'advanced-sound-engine';

/**
 * GlobalStorage - Cross-world persistent storage using JSON files
 * 
 * Stores library data in Data/ase_library/library.json
 * which persists across all worlds in Foundry and survives module updates
 */
export class GlobalStorage {
    private static readonly FILE_PATH = '/ase_library/library.json';
    private static readonly PRESETS_FILE_PATH = '/ase_library/presets.json';
    private static readonly FILE_SOURCE = 'data';
    private static readonly DIRECTORY = 'ase_library';

    /**
     * Load presets from global JSON file
     */
    static async loadPresets(): Promise<any[]> {
        try {
            const response = await fetch(`${this.PRESETS_FILE_PATH}?t=${Date.now()}`);
            if (!response.ok) return this.getDefaultPresets();
            const data = await response.json();
            return data.length > 0 ? data : this.getDefaultPresets();
        } catch (error) {
            Logger.warn('Failed to load presets:', error);
            return this.getDefaultPresets();
        }
    }

    private static getDefaultPresets(): any[] {
        return [
            {
                id: 'preset-cave',
                name: 'Cave',
                effects: [
                    { type: 'reverb', params: { ir: 'cave', level: 1.2 }, routing: { music: false, sfx: true, ambience: true } },
                    { type: 'delay', params: { time: 0.15, feedback: 0.3, level: 0.5 }, routing: { music: false, sfx: true, ambience: false } }
                ]
            },
            {
                id: 'preset-underwater',
                name: 'Underwater',
                effects: [
                    { type: 'filter', params: { type: 'lowpass', frequency: 600, Q: 1.0, level: 1.0 }, routing: { music: true, sfx: true, ambience: true } }
                ]
            },
            {
                id: 'preset-radio',
                name: 'Old Radio',
                effects: [
                    { type: 'filter', params: { type: 'bandpass', frequency: 2000, Q: 2.0, level: 1.5 }, routing: { music: true, sfx: true, ambience: true } },
                    { type: 'distortion', params: { drive: 20, level: 0.8 }, routing: { music: true, sfx: true, ambience: true } }
                ]
            }
        ];
    }

    /**
     * Save presets to global JSON file
     */
    static async savePresets(presets: any[]): Promise<void> {
        return this.saveFile(this.PRESETS_FILE_PATH, presets);
    }

    /**
     * Generic save helper (refactored from save method)
     */
    private static async saveFile(path: string, data: any): Promise<void> {
        try {
            await this.ensureDirectory();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const file = new File([blob], path.split('/').pop()!, { type: 'application/json' });

            const originalInfo = ui.notifications?.info;
            if (ui.notifications) ui.notifications.info = (() => { }) as any;

            try {
                await FilePicker.upload(this.FILE_SOURCE, this.DIRECTORY, file, {});
            } finally {
                if (ui.notifications && originalInfo) ui.notifications.info = originalInfo;
            }
        } catch (error) {
            Logger.error(`Failed to save file ${path}:`, error);
            throw error;
        }
    }

    /**
     * Load library state from global JSON file
     */
    static async load(): Promise<LibraryState | null> {
        try {
            // Attempt to fetch the file
            const response = await fetch(`${this.FILE_PATH}?t=${Date.now()}`);

            if (!response.ok) {
                Logger.info('No existing library file found');
                return null;
            }

            const data = await response.json();
            Logger.info('Loaded library from global storage');
            return data as LibraryState;
        } catch (error) {
            Logger.warn('Failed to load global library:', error);
            return null;
        }
    }

    /**
     * Save library state to global JSON file
     */
    static async save(state: LibraryState): Promise<void> {
        try {
            await this.saveFile(this.FILE_PATH, state);
            Logger.info('Saved library to global storage');
        } catch (error) {
            Logger.error('Failed to save library to global storage:', error);
            throw error;
        }
    }

    /**
     * Ensure the module directory exists
     */
    private static async ensureDirectory(): Promise<void> {
        try {
            await FilePicker.createDirectory(this.FILE_SOURCE, this.DIRECTORY, {});
        } catch (error) {
            // Directory might already exist, ignore error
            Logger.debug('Directory creation skipped (may already exist)');
        }
    }

    /**
     * Migrate data from world-scoped game.settings to global storage
     */
    static async migrateFromWorldSettings(): Promise<boolean> {
        try {
            // Check if we already have global storage
            const existingGlobal = await this.load();
            const itemsCount = existingGlobal?.items ?
                (Array.isArray(existingGlobal.items) ? existingGlobal.items.length : Object.keys(existingGlobal.items).length) : 0;

            if (existingGlobal && existingGlobal.items && itemsCount > 0) {
                Logger.info('Global storage already populated, skipping migration');
                return false;
            }

            // Try to load from old world-scoped settings
            const oldData = await game.settings?.get(MODULE_ID as any, 'libraryState' as any) as string;
            if (!oldData || oldData === '') {
                Logger.info('No world-scoped data to migrate');
                return false;
            }

            // Parse and save to global storage
            const state = JSON.parse(oldData) as LibraryState;

            // Only migrate if there's actual data
            if (!state.items || (Array.isArray(state.items) ? state.items.length === 0 : Object.keys(state.items).length === 0)) {
                Logger.info('World-scoped data is empty, skipping migration');
                return false;
            }

            await this.save(state);

            const itemCount = Array.isArray(state.items) ? state.items.length : Object.keys(state.items).length;
            Logger.info(`Migrated ${itemCount} items from world settings to global storage`);
            ui.notifications?.info(`ASE: Library migrated to global storage (${itemCount} tracks)`);

            return true;
        } catch (error) {
            Logger.error('Migration from world settings failed:', error);
            return false;
        }
    }

    /**
     * Delete a physical file from disk
     * Shows manual deletion instructions since automatic deletion is unreliable
     */
    static async deletePhysicalFile(url: string): Promise<boolean> {
        if (!this.isOurFile(url)) {
            Logger.warn('Cannot delete file not in ase_audio folder:', url);
            return false;
        }

        if (!game.user?.isGM) {
            ui.notifications?.warn('Only GM can delete files');
            return false;
        }

        // Parse file path
        let filePath = url.replace(/\\/g, '/');
        filePath = filePath.replace(/^\/*/, '');
        filePath = filePath.replace(/^Data\//i, '');

        // Show manual deletion dialog
        const content = `
            <div style="padding: 10px;">
                <p>Automatic file deletion is not available in this Foundry configuration.</p>
                <p style="margin-top: 10px;"><strong>To manually delete this file:</strong></p>
                <ol style="margin-left: 20px; margin-top: 10px;">
                    <li>Navigate to your Foundry <code>Data</code> folder</li>
                    <li>Find and delete: <code style="background: #1e293b; padding: 2px 6px; border-radius: 3px; color: #22d3ee;">${filePath}</code></li>
                </ol>
                <p style="margin-top: 10px; color: #94a3b8; font-size: 12px;">The track will be removed from the library now, but the file will remain on disk until manually deleted.</p>
            </div>
        `;

        await Dialog.prompt({
            title: 'Manual File Deletion Required',
            content,
            callback: () => { },
            options: { width: 500 }
        });

        return true;
    }

    /**
     * Check if file URL belongs to our module storage
     * Handles various URL formats from different Foundry versions and platforms
     */
    static isOurFile(url: string): boolean {
        // Normalize path separators and remove leading slashes
        const normalizedUrl = url.replace(/\\/g, '/').toLowerCase();

        // Check for our dedicated folder in various formats:
        // - ase_audio/file.mp3
        // - /ase_audio/file.mp3
        // - Data/ase_audio/file.mp3
        // - modules/advanced-sound-engine/ase_audio/file.mp3
        return normalizedUrl.includes('ase_audio/') ||
            normalizedUrl.includes('/ase_audio/') ||
            normalizedUrl.endsWith('ase_audio');
    }
}
