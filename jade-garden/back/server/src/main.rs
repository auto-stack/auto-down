mod files;
mod links;
mod state;
mod wiki;
mod workspace;

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn};

use state::AppState;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = Arc::new(AppState::load_or_default());

    // Ensure wiki directory exists and build initial link index if a workspace is open.
    if let Some(root) = state.workspace_root() {
        if let Err(e) = state.ensure_wiki_dir() {
            warn!("Failed to create wiki directory: {e}");
        } else if let Err(e) = links::rebuild_index(state.clone()).await {
            warn!("Failed to build initial link index: {e}");
        } else {
            info!("Initial link index built for {}", root.display());
        }
    }

    // Spawn file watcher to keep link index up to date.
    let watcher_state = state.clone();
    tokio::spawn(async move {
        if let Err(e) = files::watch_wiki(watcher_state).await {
            warn!("File watcher exited: {e}");
        }
    });

    let app = Router::new()
        // Workspace
        .route("/api/workspace", get(workspace::get_workspace))
        .route("/api/workspace/open", post(workspace::open_workspace))
        // Files
        .route("/api/files", get(files::list_files))
        .route("/api/files/create", post(files::create_file))
        .route("/api/files/rename", post(files::rename_file))
        .route("/api/files/delete", post(files::delete_file))
        // Wiki docs
        .route("/api/wiki/{*path}", get(wiki::read_wiki))
        .route("/api/wiki/{*path}", post(wiki::write_wiki))
        // Links
        .route("/api/backlinks/{title}", get(links::get_backlinks))
        .route("/api/outlinks/{title}", get(links::get_outlinks))
        .route("/api/graph", get(links::get_graph))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    let port: u16 = std::env::var("JADE_GARDEN_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let addr = format!("127.0.0.1:{port}");
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    info!("Jade Garden backend listening on http://{addr}");
    axum::serve(listener, app).await.unwrap();
}
