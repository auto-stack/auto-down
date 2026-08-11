import { ref } from 'vue'
import { getGraphResult, saveGraphSettings } from '../../../auto/src/front/utils/graph_store_ext'

const nodes = ref<any>([])
const edges = ref<any>([])
const loading = ref<any>(false)
const error = ref<any>(null)
const settings = ref<any>({})
const search_query = ref<any>('')
const view_mode = ref<any>('editor')
const center_path = ref<any>(null)
const depth = ref<any>(1)

export function useGraphStore(): any {
    const OpenLocal = (args: any) => { center_path.value = args.path;
depth.value = args.depth;
view_mode.value = 'graph';
 }
    const SaveSettings = async () => { await saveGraphSettings(settings.value);
 }
    const ShowGlobal = () => { center_path.value = null;
 }
    const ToggleView = () => { if (view_mode.value == 'editor') {view_mode.value = 'graph';
}
if (view_mode.value == 'graph') {view_mode.value = 'editor';
}
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
        OpenLocal,
        SaveSettings,
        ShowGlobal,
        ToggleView,
        Load,
    }
}
