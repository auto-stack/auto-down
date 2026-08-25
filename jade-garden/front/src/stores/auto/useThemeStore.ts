import { ref } from 'vue'

const mode = ref<string>('light')
const accent = ref<string>('indigo')

export function useThemeStore(): any {
    const SetAccent = (next: string) => { accent.value = next;
 }
    const SetMode = (next: string) => { mode.value = next;
 }
    const ToggleMode = () => { if (mode.value == 'dark') {mode.value = 'light';
}
if (mode.value == 'light') {mode.value = 'dark';
}
 }
    return {
        mode,
        accent,
        SetAccent,
        SetMode,
        ToggleMode,
    }
}
