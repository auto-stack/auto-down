import { ref } from 'vue'

const left_open = ref<any>(true)
const right_open = ref<any>(false)
const left_panel = ref<any>('files')
const left_width = ref<any>(260)

export function useSidebarStore(): any {
    return {
        left_open,
        right_open,
        left_panel,
        left_width,
        ToggleLeft: () => { left_open.value = !left_open.value;
 },
        SetLeftPanel: (panel: any) => { left_panel.value = panel;
left_open.value = true;
 },
        get all_tags() {
            return [];
        },
    }
}
