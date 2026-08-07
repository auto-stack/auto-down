import { ref } from 'vue'
import { cacheClear } from '../../../auto/src/front/utils/blocks_store_ext'

const cache = ref<any>(null)

export function useBlocksStore(): any {
    const Clear = async (path: any) => { await cacheClear(cache.value, path);
 }
    return {
        cache,
        Clear,
    }
}
