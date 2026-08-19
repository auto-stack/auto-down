import { ref } from 'vue'

const left_open = ref<boolean>(true)
const right_open = ref<boolean>(false)
const left_panel = ref<string>('files')
const left_width = ref<number>(260)

export function useSidebarStore(): any {
    const SetLeftPanel = (panel: string) => { left_panel.value = panel;
left_open.value = true;
 }
    const ToggleLeft = () => { left_open.value = !left_open.value;
 }
    return {
        left_open,
        right_open,
        left_panel,
        left_width,
        SetLeftPanel,
        ToggleLeft,
    }
}
