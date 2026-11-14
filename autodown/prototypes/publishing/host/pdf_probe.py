"""PLAN-082 — PDF 检查（页数/尺寸/正文文本/栏位几何/PNG 渲染），输出 JSON 供 verify.mjs 断言。

栏位判定用正文字符左边界聚簇（排除页眉/页脚带），供 verify 区分单栏与双栏；
中文没有空格，用字符而非 word 边界更稳定。
"""
import json
import sys

import fitz

TOP_BAND = 55.0
BOTTOM_BAND = 50.0
CLUSTER_GAP = 8.0


def line_start_clusters(page):
    """按正文行的行首 x 聚簇（排除页眉/页脚带）：单栏的行首集中在一处，双栏分成两处。

    中文没有词间空格，用词边界不稳定；行首位置对栏位判定更直接。
    """
    width = page.rect.width
    height = page.rect.height
    starts = []
    raw = page.get_text("rawdict")
    for block in raw.get("blocks", []):
        for line in block.get("lines", []):
            first = None
            for span in line.get("spans", []):
                for ch in span.get("chars", []):
                    if ch.get("c", "").strip() == "":
                        continue
                    x0, y0, x1, y1 = ch["bbox"]
                    if y0 < TOP_BAND or y1 > height - BOTTOM_BAND:
                        continue
                    first = x0
                    break
                if first is not None:
                    break
            if first is not None:
                starts.append(first)
    if not starts:
        return []
    starts.sort()
    clusters = []
    current = [starts[0]]
    for x in starts[1:]:
        if x - current[-1] > CLUSTER_GAP:
            clusters.append(current)
            current = [x]
        else:
            current.append(x)
    clusters.append(current)
    total = len(starts)
    return [
        {"x0": round(c[0], 2), "x1": round(c[-1], 2), "share": round(len(c) / total, 3), "lines": len(c)}
        for c in clusters
        if len(c) / total >= 0.05
    ]


def char_x_clusters(page):
    width = page.rect.width
    height = page.rect.height
    xs = []
    raw = page.get_text("rawdict")
    for block in raw.get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                for ch in span.get("chars", []):
                    c = ch.get("c", "")
                    if c.strip() == "":
                        continue
                    x0, y0, x1, y1 = ch["bbox"]
                    if y0 < TOP_BAND or y1 > height - BOTTOM_BAND:
                        continue
                    xs.append(x0)
    if not xs:
        return []
    xs.sort()
    clusters = []
    current = [xs[0]]
    for x in xs[1:]:
        if x - current[-1] > CLUSTER_GAP:
            clusters.append(current)
            current = [x]
        else:
            current.append(x)
    clusters.append(current)
    total = len(xs)
    return [
        {"x0": round(c[0], 2), "x1": round(c[-1], 2), "share": round(len(c) / total, 3)}
        for c in clusters
        if len(c) / total >= 0.05
    ]


def main():
    pdf_path = sys.argv[1]
    out_path = sys.argv[2]
    png_dir = sys.argv[3] if len(sys.argv) > 3 else None
    doc = fitz.open(pdf_path)
    pages = []
    for index, page in enumerate(doc):
        text = page.get_text("text")
        pages.append(
            {
                "index": index + 1,
                "width": round(page.rect.width, 2),
                "height": round(page.rect.height, 2),
                "text": text,
                "chars": len(text),
                "x_clusters": line_start_clusters(page),
                "char_clusters": char_x_clusters(page),
            }
        )
        if png_dir:
            pix = page.get_pixmap(dpi=110)
            pix.save(f"{png_dir}/page-{index + 1}.png")
    result = {
        "path": pdf_path,
        "page_count": len(pages),
        "page_sizes": sorted({(p["width"], p["height"]) for p in pages}),
        "pages": pages,
        "text": "\n".join(p["text"] for p in pages),
        "config": doc.metadata,
    }
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
    print(
        json.dumps(
            {"page_count": result["page_count"], "page_sizes": result["page_sizes"], "chars": len(result["text"])},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
