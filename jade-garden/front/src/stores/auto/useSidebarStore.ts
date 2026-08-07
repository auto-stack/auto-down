import { ref } from 'vue'

const left_open = ref<any>(true)
const right_open = ref<any>(false)
const left_panel = ref<any>('files')
const left_width = ref<any>(260)

export function useSidebarStore(): any {
    const ToggleLeft = () => { left_open.value = !left_open.value;
 }
    const SetLeftPanel = (panel: any) => { left_panel.value = panel;
left_open.value = true;
 }
    return {
        left_open,
        right_open,
        left_panel,
        left_width,
        ToggleLeft,
        SetLeftPanel,
    }
}
