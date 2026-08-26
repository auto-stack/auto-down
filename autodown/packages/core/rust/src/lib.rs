// AutoDown Core — Rust pilot crate (plan 016 Phase 4).
//
// The modules are a2r emissions of the .at single sources:
//   block_model  <- auto/block_model.at  (block tree, selection, ops, undo)
//   serializer   <- auto/serializer.at   (block tree -> .ad text)
//   palette_map  <- packages/engine/auto/render/palette_map.at
//                  (block type -> panel spec, the panel vocabulary single
//                  source for iced panel renderers — plan 019 / plan-450)
//
// Regenerate with the commands in rust/README.md (requires a locally built
// auto.exe from the auto-lang checkout). Do not edit the modules by hand.

pub mod block_model;
pub mod palette_map;
pub mod serializer;
