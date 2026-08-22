import { ref } from 'vue'
import { recordRecentFile, removeRecentFile, clearRecentFiles } from '../../../auto/src/front/utils/recentFiles_store_ext'

const files = ref<any>([])

export function useRecentFilesStore(): any {
    const Remove = async (path: string) => { files.value = await removeRecentFile(files.value, path);
 }
    const Clear = async () => { files.value = await clearRecentFiles();
 }
    const Record = async (args: any) => { files.value = await recordRecentFile(files.value, args.path, args.title);
 }
    return {
        files,
        Remove,
        Clear,
        Record,
    }
}
