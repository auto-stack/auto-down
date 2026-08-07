import { ref } from 'vue'

const mode = ref<any>('light')
const accent = ref<any>('indigo')

export function useThemeStore(): any {
    const SetAccent = (next: any) => { accent.value = next;
 }
    const ToggleMode = () => { if (mode.value == 'dark') {mode.value = 'light';
}
if (mode.value == 'light') {mode.value = 'dark';
}
 }
    const SetMode = (next: any) => { mode.value = next;
 }
    return {
        mode,
        accent,
        SetAccent,
        ToggleMode,
        SetMode,
    }
}
