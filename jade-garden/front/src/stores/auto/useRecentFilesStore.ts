import { ref } from 'vue'
import { recordRecentFile, removeRecentFile, clearRecentFiles } from '../../../auto/src/front/utils/recentFiles_store_ext'

const files = ref<any>([])

export function useRecentFilesStore(): any {
    const Record = async (args: any) => { files.value = await recordRecentFile(files.value, args.path, args.title);
 }
    const Clear = async () => { files.value = await clearRecentFiles();
 }
    const Remove = async (path: any) => { files.value = await removeRecentFile(files.value, path);
 }
    return {
        files,
        Record,
        Clear,
        Remove,
    }
}
