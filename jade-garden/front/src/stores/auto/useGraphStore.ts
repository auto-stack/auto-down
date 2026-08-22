import { ref } from 'vue'
import { getGraphResult, saveGraphSettings } from '../../../auto/src/front/utils/graph_store_ext'

const nodes = ref<any>([])
const edges = ref<any>([])
const loading = ref<boolean>(false)
const error = ref<string | null>(null)
const settings = ref<any>({})
const search_query = ref<string>('')
const view_mode = ref<string>('editor')
const center_path = ref<string | null>(null)
const depth = ref<number>(1)

export function useGraphStore(): any {
    const SaveSettings = async () => { await saveGraphSettings(settings.value);
 }
    const ToggleView = () => { if (view_mode.value == 'editor') {view_mode.value = 'graph';
}
if (view_mode.value == 'graph') {view_mode.value = 'editor';
}
 }
    const ShowGlobal = () => { center_path.value = null;
 }
    const OpenLocal = (args: any) => { center_path.value = args.path;
depth.value = args.depth;
view_mode.value = 'graph';
 }
    const Load = async () => { loading.value = true;
error.value = null;
let res = await getGraphResult();
if (res.error == '') {nodes.value = res.nodes;
edges.value = res.edges;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    return {
        nodes,
        edges,
        loading,
        error,
        settings,
        search_query,
        view_mode,
        center_path,
        depth,
        SaveSettings,
        ToggleView,
        ShowGlobal,
        OpenLocal,
        Load,
    }
}
