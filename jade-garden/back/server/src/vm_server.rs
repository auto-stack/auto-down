// vm_server.rs — Plan 022 Phase 3: serve the /api/* surface from the
// AutoVM (Plan 442-c2 pattern).
//
// JADE_GARDEN_SERVER=vm switches main() onto this path. The host
// registers one bridge function (Plan 060 M3 host bridge) and runs
// back/auto/server.at via auto_lang::run_file on a dedicated thread:
// the .at builds the axum Router (adapter route table) and, when routes
// are installed, run_file auto-starts the AutoVM HTTP server on
// AUTO_HTTP_PORT and never returns. Front-end contract unchanged.

use crate::state::AppState;
use auto_lang::vm::host_bridge;
use std::sync::Arc;

pub fn serve(state: Arc<AppState>) -> Result<(), String> {
    let dispatch_state = state.clone();
    host_bridge::register_host_call(
        "jade.api",
        std::sync::Arc::new(move |args: &str| {
            crate::vm_dispatch::dispatch(&dispatch_state, args)
        }),
    );

    // The e2e/runtime wiring speaks JADE_GARDEN_PORT; the AutoVM server
    // reads AUTO_HTTP_PORT (run_file default 8080).
    let port = std::env::var("JADE_GARDEN_PORT").unwrap_or_else(|_| "18181".into());
    // Startup-only single write; the AutoVM server reads it inside run_file.
    // SAFETY: no other thread reads the environment concurrently.
    unsafe {
        std::env::set_var("AUTO_HTTP_PORT", &port);
    }

    let server_at = server_at_path();
    tracing::info!("VM server: loading {server_at} on port {port}");

    // run_file blocks for the process lifetime once the HTTP server starts
    // (the VM is !Send and the server takes over the thread). A dedicated
    // big-stack thread keeps us clear of the ambient tokio runtime.
    std::thread::Builder::new()
        .stack_size(8 * 1024 * 1024)
        .spawn(move || match auto_lang::run_file(&server_at) {
            Ok(_) => tracing::info!("VM server: run_file returned"),
            Err(e) => tracing::error!("VM server: run_file failed: {e:?}"),
        })
        .map_err(|e| format!("failed to spawn VM thread: {e}"))?;

    // Block the main thread; the process lives as long as the server does.
    loop {
        std::thread::sleep(std::time::Duration::from_secs(3600));
    }
}

/// Locate back/auto/server.at: explicit env override first, then the
/// build-tree relative path (dev/e2e run the exe from the build tree, so
/// CARGO_MANIFEST_DIR of the build machine still resolves).
fn server_at_path() -> String {
    if let Ok(p) = std::env::var("JADE_SERVER_AT") {
        return p;
    }
    let manifest = option_env!("CARGO_MANIFEST_DIR").unwrap_or(".");
    let p = format!("{manifest}/../auto/server.at");
    // run_file's reader chokes on mixed separators — hand it a clean path.
    std::path::Path::new(&p)
        .canonicalize()
        .map(|c| c.to_string_lossy().to_string())
        .unwrap_or(p)
}
