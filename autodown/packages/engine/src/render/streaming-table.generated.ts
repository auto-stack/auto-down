/**
 * @autodown/vue — StreamingTable prop normalization.
 *
 * GENERATED FILE — do not edit by hand.
 * Source: auto/streaming_table.at (Auto language). Regenerate with: pnpm gen
 * (see auto/README.md for the pipeline and the applied post-fixes)
 */

export function normalizeTableProps(columns: any, rows: any): [string[], any[]] {
    let cols: any = columns;
    if (cols == null) {
        cols = [];
    }
    let data: any = rows;
    if (data == null) {
        data = [];
    }
    return [cols, data];
}