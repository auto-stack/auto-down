import { ref } from 'vue'
import { read_wiki, write_wiki, ensureBlockAnchors, recordRecent, confirmClose, rethrow } from '../../../auto/src/front/utils/tabs_store_ext'

const tabs = ref<any>([])
const active_path = ref<string | null>(null)

export function useTabsStore(): any {
    const Close = async (path: string) => { let idx = tabs.value.findIndex((t: any) => t.path == path);
if (idx != -1) {let tab = tabs.value[idx];
let ok: boolean = true;
if (tab.dirty && !tab.isGraph) {ok = await confirmClose(tab.title);
}if (ok) {tabs.value.splice(idx, 1);
if (active_path.value == path) {if (tabs.value.length > 0) {let idx2 = Math.min(idx, tabs.value.length - 1);
active_path.value = tabs.value[idx2].path;
}if (tabs.value.length == 0) {active_path.value = null;
}}}}
 }
    const Load = async (path: string) => { let tab = tabs.value.find((t: any) => t.path == path);
if (tab != null && !tab.loaded) {let doc = null;
try {doc = await read_wiki(path);
} catch (e) {doc = null;
}



if (doc != null && tab.loaded == false) {tab.body = doc.body;
tab.originalBody = doc.body;
tab.frontmatter = doc.frontmatter || {  };
tab.title = doc.frontmatter && doc.frontmatter.title || tab.title;
tab.dirty = false;
tab.loaded = true;
}if (doc == null) {tab.loaded = true;
tab.originalBody = tab.body;
tab.dirty = false;
}}
 }
    const Open = async (args: any) => { let path = args.path;
let title = args.title;
let existing = tabs.value.find((t: any) => t.path == path);
if (existing != null) {active_path.value = path;
if (!existing.loaded && !existing.isGraph) {let doc2 = null;
try {doc2 = await read_wiki(path);
} catch (e) {doc2 = null;
}






if (doc2 != null && existing.loaded == false) {existing.body = doc2.body;
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
if (t2 == '') {t2 = strip_ext(path, '.ad');
}tabs.value.push({ path: path, title: t2, body: '', originalBody: '', frontmatter: {  }, dirty: false, loaded: false, saving: false });
active_path.value = path;
let doc = null;
try {doc = await read_wiki(path);
} catch (e) {doc = null;
}
let tab = tabs.value.find((t: any) => t.path == path);



if (tab != null && doc != null && tab.loaded == false) {tab.body = doc.body;
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
 }
    const OpenGraph = (args: any) => { 
let center = args.center;
let depth = args.depth;
let path: string = '__graph__';
let title: string = '全局图谱';
if (center != '') {path = `__graph__:${center}`;
title = `局部图谱：${strip_ext(center, '.ad')}`;
}
let existing = tabs.value.find((t: any) => t.path == path);
if (existing != null) {active_path.value = path;
}
if (existing == null) {tabs.value.push({ path: path, title: title, body: '', originalBody: '', frontmatter: {  }, dirty: false, loaded: true, saving: false, isGraph: true, graphCenterPath: center || null, graphDepth: depth });
active_path.value = path;
}
 }
    const OpenWhiteboard = (args: any) => { let path = args.path;
let title = args.title;
let existing = tabs.value.find((t: any) => t.path == path);
if (existing != null) {active_path.value = path;
}
if (existing == null) {let t2 = title;
if (t2 == '') {t2 = strip_ext(path, '.canvas');
}tabs.value.push({ path: path, title: t2, body: '', originalBody: '', frontmatter: {  }, dirty: false, loaded: true, saving: false, isWhiteboard: true });
active_path.value = path;
}
 }
    const Save = async (path: string) => { let tab = tabs.value.find((t: any) => t.path == path);
if (tab != null && tab.loaded) {tab.saving = true;
try {let body2 = await ensureBlockAnchors(tab.body, tab.originalBody);




let sentFm = tab.frontmatter;
let sentBody = tab.body;
let saved = await write_wiki(path, sentFm, body2);
let r = adopt_save_result(sentFm, tab.frontmatter, sentBody, tab.body, saved);
tab.frontmatter = r.frontmatter;
tab.body = r.body;
tab.originalBody = r.original_body;
tab.dirty = false;
} catch (e) {




await rethrow(e);
} finally {tab.saving = false;
}
}
 }
    const SetBody = (args: any) => { let path = args.path;
let body = args.body;
let tab = tabs.value.find((t: any) => t.path == path);
if (tab != null && tab.body != body) {tab.body = body;
tab.dirty = tab.body != tab.originalBody;
}
 }
    return {
        tabs,
        active_path,
        Close,
        Load,
        Open,
        OpenGraph,
        OpenWhiteboard,
        Save,
        SetBody,
        get active_tab() {
            return tabs.value.find((t: any) => t.path == active_path.value);
        },
    }
}

function strip_ext(path: any, ext: any): string {
    let n = path.length;
    let m = ext.length;
    if (n >= m) {let tail = path.substring(n - m, n);
    if (tail == ext) {return path.substring(0, n - m);
    }}
    return path;
}

function adopt_save_result(sent_fm: any, cur_fm: any, sent_body: any, cur_body: any, saved: any): any {
    let out_fm: any = cur_fm;
    if (cur_fm == sent_fm) {out_fm = saved.frontmatter;
    } else {let upd = saved.frontmatter.updated_at;
    if (upd != '') {out_fm.updated_at = upd;
    }}
    let out = { frontmatter: out_fm, body: cur_body, original_body: cur_body };
    if (cur_body == sent_body) {out.body = saved.body;
    out.original_body = saved.body;
    }
    return out;
}
