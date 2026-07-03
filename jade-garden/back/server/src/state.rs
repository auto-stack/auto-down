use std::{
    path::{Path, PathBuf},
    sync::{Mutex, RwLock},
};

use crate::index::Index;

#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Config {
    pub workspace_root: Option<PathBuf>,
}

pub struct AppState {
    config_path: PathBuf,
    config: Mutex<Config>,
    index: RwLock<Option<Index>>,
}

impl AppState {
    pub fn load_or_default() -> Self {
        let config_path = Self::default_config_path();
        let mut config: Config = std::fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        if config.workspace_root.is_none() {
            if let Ok(default_root) = std::env::var("JADE_GARDEN_DEFAULT_WORKSPACE") {
                config.workspace_root = Some(PathBuf::from(default_root));
            }
        }
        let state = Self {
            config_path,
            config: Mutex::new(config),
            index: RwLock::new(None),
        };
        state.open_index();
        state
    }

    #[cfg(test)]
    pub fn with_workspace_root(root: PathBuf) -> Self {
        let state = Self {
            config_path: PathBuf::from("."),
            config: Mutex::new(Config {
                workspace_root: Some(root),
            }),
            index: RwLock::new(None),
        };
        state.open_index();
        state
    }

    fn default_config_path() -> PathBuf {
        // Store config next to the executable / in the crate root during dev.
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| PathBuf::from("."))
            .join("jade-garden-config.json")
    }

    pub fn save_config(&self) -> std::io::Result<()> {
        let config = self.config.lock().unwrap();
        let json = serde_json::to_string_pretty(&*config)?;
        std::fs::write(&self.config_path, json)
    }

    pub fn workspace_root(&self) -> Option<PathBuf> {
        self.config.lock().unwrap().workspace_root.clone()
    }

    pub fn set_workspace_root(&self,
        root: PathBuf) -> std::io::Result<()> {
        let canonical = root.canonicalize().unwrap_or(root);
        self.config.lock().unwrap().workspace_root = Some(canonical);
        self.save_config()?;
        self.open_index();
        Ok(())
    }

    pub fn wiki_dir(&self) -> Option<PathBuf> {
        self.workspace_root().map(|r| r.join("wiki"))
    }

    pub fn index_path(&self) -> Option<PathBuf> {
        self.workspace_root().map(|r| r.join("jade-garden-index.sqlite"))
    }

    pub fn ensure_wiki_dir(&self) -> std::io::Result<()> {
        if let Some(wiki) = self.wiki_dir() {
            std::fs::create_dir_all(&wiki)?;
        }
        Ok(())
    }

    /// Open (or re-open) the SQLite index for the current workspace.
    fn open_index(&self) {
        let mut guard = self.index.write().unwrap();
        *guard = self.index_path().and_then(|p| Index::open(&p).ok());
    }

    pub fn with_index<R>(&self,
        f: impl FnOnce(&Index) -> R) -> Option<R> {
        self.index.read().unwrap().as_ref().map(f)
    }

    pub fn with_index_mut<R>(&self,
        f: impl FnOnce(&mut Index) -> R) -> Option<R> {
        self.index.write().unwrap().as_mut().map(f)
    }

    pub fn set_index(&self, index: Index) {
        *self.index.write().unwrap() = Some(index);
    }

    /// Validate that `rel_path` stays inside the wiki directory.
    pub fn resolve_wiki_path(&self,
        rel_path: &str) -> Option<PathBuf> {
        let wiki = self.wiki_dir()?;
        let cleaned = rel_path.trim_start_matches('/');
        let target = wiki.join(cleaned);
        let target = normalize_path(&target);
        if target.starts_with(&wiki) {
            Some(target)
        } else {
            None
        }
    }
}

/// Normalize a path without hitting the filesystem.
fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    for comp in path.components() {
        match comp {
            std::path::Component::Prefix(_) | std::path::Component::RootDir => {
                components.push(comp.as_os_str().to_owned())
            }
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                components.pop();
            }
            std::path::Component::Normal(c) => components.push(c.to_owned()),
        }
    }
    components.into_iter().collect()
}
