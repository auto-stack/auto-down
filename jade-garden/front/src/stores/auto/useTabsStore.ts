import { ref } from 'vue'
import { readWikiSafe, writeWikiSafe, ensureBlockAnchors, recordRecent, stripExt, confirmClose } from '../../../auto/src/front/utils/tabs_store_ext'

const tabs = ref<any>([])
const active_path = ref<any>(null)

export function useTabsStore(): any {
    return {
        tabs,
        active_path,
        Open: async (args: any) => { let path = args.path;
let title = args.title;
let existing = tabs.value.find((t: any) => t.path == path);
if (existing != null) {active_path.value = path;
if (!existing.loaded && !existing.isGraph) {let doc2 = await readWikiSafe(path);
if (doc2 != null) {existing.body = doc2.body;
existing.originalBody = doc2.body;
existing.frontmatter = doc2.frontmatter || {  };
existing.title = doc2.frontmatter && doc2.frontmatter.title || existing.title;
existing.dirty = false;
existing.loaded = true;
}if (doc2 == null) {existing.loaded = true;
existing.originalBody = existing.body;
existing.dirty = false;
}}}
if (existing == null) {let t2 = title;
if (t2 == '') {t2 = await stripExt(path, '.ad');
}tabs.value.push({ path: path, title: t2, body: '', originalBody: '', frontmatter: {  }, dirty: false, loaded: false, saving: false });
active_path.value = path;
let doc = await readWikiSafe(path);
let tab = tabs.value.find((t: any) => t.path == path);
if (tab != null && doc != null) {tab.body = doc.body;
tab.originalBody = doc.body;
tab.frontmatter = doc.frontmatter || {  };
tab.title = doc.frontmatter && doc.frontmatter.title || tab.title;
tab.dirty = false;
tab.loaded = true;
}if (tab != null && doc == null) {tab.loaded = true;
tab.originalBody = tab.body;
tab.dirty = false;
}await recordRecent(path, t2);
}
 },
        Close: async (path: any) => { let idx = tabs.value.findIndex((t: any) => t.path == path);
if (idx != -1) {let tab = tabs.value[idx];
let ok = true;
if (tab.dirty && !tab.isGraph) {ok = await confirmClose(tab.title);
}if (ok) {tabs.value.splice(idx, 1);
if (active_path.value == path) {if (tabs.value.length > 0) {let idx2 = Math.min(idx, tabs.value.length - 1);
active_path.value = tabs.value[idx2].path;
}if (tabs.value.length == 0) {active_path.value = null;
}}}}
 },
        OpenWhiteboard: async (args: any) => { let path = args.path;
let title = args.title;
let existing = tabs.value.find((t: any) => t.path == path);
if (existing != null) {active_path.value = path;
}
if (existing == null) {let t2 = title;
if (t2 == '') {t2 = await stripExt(path, '.canvas');
}tabs.value.push({ path: path, title: t2, body: '', originalBody: '', frontmatter: {  }, dirty: false, loaded: true, saving: false, isWhiteboard: true });
active_path.value = path;
}
 },
        Save: async (path: any) => { let tab = tabs.value.find((t: any) => t.path == path);
if (tab != null && tab.loaded) {tab.saving = true;
let body2 = await ensureBlockAnchors(tab.body, tab.originalBody);
let saved = await writeWikiSafe(path, { frontmatter: tab.frontmatter, body: body2 });
if (saved != null) {tab.frontmatter = saved.frontmatter || {  };
tab.body = saved.body;
tab.originalBody = saved.body;
tab.dirty = false;
}tab.saving = false;
}
 },
        Load: async (path: any) => { let tab = tabs.value.find((t: any) => t.path == path);
if (tab != null && !tab.loaded) {let doc = await readWikiSafe(path);
if (doc != null) {tab.body = doc.body;
tab.originalBody = doc.body;
tab.frontmatter = doc.frontmatter || {  };
tab.title = doc.frontmatter && doc.frontmatter.title || tab.title;
tab.dirty = false;
tab.loaded = true;
}if (doc == null) {tab.loaded = true;
tab.originalBody = tab.body;
tab.dirty = false;
}}
 },
        SetBody: (args: any) => { let path = args.path;
let body = args.body;
let tab = tabs.value.find((t: any) => t.path == path);
if (tab != null && tab.body != body) {tab.body = body;
tab.dirty = tab.body != tab.originalBody;
}
 },
        OpenGraph: (args: any) => { 
let center = args.center;
let depth = args.depth;
let path = '__graph__';
let title = '全局图谱';
if (center != '') {path = `__graph__:${center}`;
title = `局部图谱：${stripExt(center, ".ad")}`;
}
let existing = tabs.value.find((t: any) => t.path == path);
if (existing != null) {active_path.value = path;
}
if (existing == null) {tabs.value.push({ path: path, title: title, body: '', originalBody: '', frontmatter: {  }, dirty: false, loaded: true, saving: false, isGraph: true, graphCenterPath: center || null, graphDepth: depth });
active_path.value = path;
}
 },
        get active_tab() {
            return tabs.value.find((t: any) => t.path == active_path.value);
        },
        get all_tags() {
            return [];
        },
    }
}
