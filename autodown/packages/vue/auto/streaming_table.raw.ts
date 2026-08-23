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