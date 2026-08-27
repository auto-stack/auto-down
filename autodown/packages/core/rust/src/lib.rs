// AutoDown Core — Rust pilot crate (plan 016 Phase 4).
//
// The modules are a2r emissions of the .at single sources:
//   block_model  <- auto/block_model.at  (block tree, selection, ops, undo)
//   ial          <- auto/ial.at          (table IAL extraction, plan 019)
//   markdown_parser <- auto/markdown_parser.at (weak-tree parser + strong
//                     block-tree converter, plan 019 Phase 1)
//   serializer   <- auto/serializer.at   (block tree -> .ad text)
//   palette_map  <- packages/engine/auto/render/palette_map.at
//                  (block type -> panel spec, the panel vocabulary single
//                  source for iced panel renderers — plan 019 / plan-450)
//
// Regenerate with the commands in rust/README.md (requires a locally built
// auto.exe from the auto-lang checkout). Do not edit the modules by hand.

pub mod block_model;
pub mod ial;
pub mod markdown_parser;
pub mod palette_map;
pub mod serializer;
