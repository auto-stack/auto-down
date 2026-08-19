import { ref } from 'vue'
import { loadPluginsResult } from '../../../auto/src/front/utils/plugins_store_ext'

const plugins = ref<any>([])
const loading = ref<boolean>(false)
const error = ref<string | null>(null)

export function usePluginsStore(): any {
    const Load = async () => { loading.value = true;
error.value = null;
let res = await loadPluginsResult();
if (res.error == '') {plugins.value = res.plugins;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    return {
        plugins,
        loading,
        error,
        Load,
    }
}
