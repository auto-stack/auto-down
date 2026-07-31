import { ref } from 'vue'

const mode = ref<any>('light')
const accent = ref<any>('indigo')

export function useThemeStore(): any {
    return {
        mode,
        accent,
        SetAccent: (next: any) => { accent.value = next;
 },
        ToggleMode: () => { if (mode.value == 'dark') {mode.value = 'light';
}
if (mode.value == 'light') {mode.value = 'dark';
}
 },
        SetMode: (next: any) => { mode.value = next;
 },
        get all_tags() {
            return [];
        },
    }
}
