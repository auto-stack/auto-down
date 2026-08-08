import { ref } from 'vue'
import { listFilesResult, createFileRaw, duplicateFileRaw, renameFileRaw, deleteFileRaw, toggleExpanded } from '../../../auto/src/front/utils/fileTree_store_ext'

const files = ref<any>([])
const expanded = ref<any>(null)
const loading = ref<any>(false)
const error = ref<any>(null)

export function useFileTreeStore(): any {
    const Toggle = async (path: any) => { await toggleExpanded(expanded.value, path);
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
    const DeleteFile = async (path: any) => { await deleteFileRaw(path);
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
    const Load = async () => { loading.value = true;
error.value = null;
let res = await listFilesResult();
if (res.error == '') {files.value = res.files;
}
if (res.error != '') {error.value = res.error;
}
loading.value = false;
 }
    return {
        files,
        expanded,
        loading,
        error,
        Toggle,
        RenameFile,
        DeleteFile,
        DuplicateFile,
        CreateFile,
        Load,
    }
}
