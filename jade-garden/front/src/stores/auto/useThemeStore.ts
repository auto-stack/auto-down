import { ref } from 'vue'

const mode = ref<any>('light')
const accent = ref<any>('indigo')

export function useThemeStore(): any {
    const ToggleMode = () => { if (mode.value == 'dark') {mode.value = 'light';
}
if (mode.value == 'light') {mode.value = 'dark';
}
 }
    const SetMode = (next: any) => { mode.value = next;
 }
    const SetAccent = (next: any) => { accent.value = next;
 }
    return {
        mode,
        accent,
        ToggleMode,
        SetMode,
        SetAccent,
        get all_tags() {
            return [];
        },
    }
}
