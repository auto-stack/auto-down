import { ref } from 'vue'
import { listFilesResult, createFileRaw, duplicateFileRaw, renameFileRaw, deleteFileRaw, toggleExpanded } from '../../../auto/src/front/utils/fileTree_store_ext'

const files = ref<any>([])
const expanded = ref<string | null>(null)
const loading = ref<boolean>(false)
const error = ref<string | null>(null)

export function useFileTreeStore(): any {
    const CreateFile = async (args: any) => { await createFileRaw(args.path, args.isDir);
loading.value = true;
error.value = null;
let res = await listFilesResult();
if (res.error == '') {files.value = res.files;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    const DeleteFile = async (path: string) => { await deleteFileRaw(path);
loading.value = true;
error.value = null;
let res = await listFilesResult();
if (res.error == '') {files.value = res.files;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    const DuplicateFile = async (args: any) => { await duplicateFileRaw(args.sourcePath, args.targetPath);
loading.value = true;
error.value = null;
let res = await listFilesResult();
if (res.error == '') {files.value = res.files;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    const Load = async () => { loading.value = true;
error.value = null;
let res = await listFilesResult();
if (res.error == '') {files.value = res.files;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    const RenameFile = async (args: any) => { await renameFileRaw(args.oldPath, args.newPath);
loading.value = true;
error.value = null;
let res = await listFilesResult();
if (res.error == '') {files.value = res.files;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    const Toggle = async (path: string) => { await toggleExpanded(expanded.value, path);
 }
    return {
        files,
        expanded,
        loading,
        error,
        CreateFile,
        DeleteFile,
        DuplicateFile,
        Load,
        RenameFile,
        Toggle,
    }
}
