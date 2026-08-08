import { ref } from 'vue'
import { getWorkspaceResult, openWorkspaceResult } from '../../../auto/src/front/utils/workspace_store_ext'

const root = ref<any>(null)
const wiki_dir = ref<any>(null)
const loading = ref<any>(false)
const error = ref<any>(null)

export function useWorkspaceStore(): any {
    const Open = async (path: any) => { loading.value = true;
error.value = null;
let res = await openWorkspaceResult(path);
if (res.error == '') {root.value = res.root;
wiki_dir.value = res.wiki_dir;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    const Load = async () => { loading.value = true;
error.value = null;
let res = await getWorkspaceResult();
if (res.error == '') {root.value = res.root;
wiki_dir.value = res.wiki_dir;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    return {
        root,
        wiki_dir,
        loading,
        error,
        Open,
        Load,
    }
}
