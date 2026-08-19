import { ref } from 'vue'
import { cacheClear } from '../../../auto/src/front/utils/blocks_store_ext'

const cache = ref<string | null>(null)

export function useBlocksStore(): any {
    const Clear = async (path: string) => { await cacheClear(cache.value, path);
 }
    return {
        cache,
        Clear,
    }
}
