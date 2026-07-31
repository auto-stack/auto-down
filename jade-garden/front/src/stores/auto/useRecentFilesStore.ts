import { ref } from 'vue'
import { recordRecentFile, removeRecentFile, clearRecentFiles } from '../../../auto/src/front/utils/recentFiles_store_ext'

const files = ref<any>([])

export function useRecentFilesStore(): any {
    return {
        files,
        Clear: async () => { files.value = await clearRecentFiles();
 },
        Remove: async (path: any) => { files.value = await removeRecentFile(files.value, path);
 },
        Record: async (args: any) => { files.value = await recordRecentFile(files.value, args.path, args.title);
 },
        get all_tags() {
            return [];
        },
    }
}
