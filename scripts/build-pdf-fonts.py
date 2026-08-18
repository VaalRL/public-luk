#!/usr/bin/env python3
"""
產生報價單 PDF 用的字型檔（public/fonts/noto-sans-tc-pdf-{400,700}.woff）

為什麼需要這支腳本
------------------
@fontsource/noto-sans-tc 把字型切成一百多個 unicode-range 子集，瀏覽器
會按需求載入；但 PDF 產生器只能吃「一個檔案」，沒有 unicode-range 這回事。
過去的作法是拿其中一個「chinese-traditional」子集直接用，那個子集裡
**沒有全形標點**（：（）， ！？；％／…），這些字會從印出來的單據上
無聲無息地消失 —— 客戶收到的報價單少了標點，沒人會發現是字型問題。

所以這裡把「基底子集 + 補齊標點所需的其他子集」合併成單一檔案。

為什麼輸出 woff 而不是 woff2
---------------------------
@react-pdf/renderer 內嵌 woff2 會在瀏覽器端失敗（需要以 data: URI 載入
brotli WebAssembly，被本專案的 CSP 擋下；即使放行也解析不出字型），
使用者只會看到「PDF 生成失敗」。詳見 src/lib/pdf-fonts.ts 的註解。

使用方式
--------
    pip install fonttools
    npm install            # 需要 node_modules/@fontsource/noto-sans-tc
    python3 scripts/build-pdf-fonts.py

字型為 Noto Sans TC，SIL Open Font License 1.1，
授權條款見 public/fonts/LICENSE-Noto-Sans-TC.txt。
"""

import glob
import os
import sys
import tempfile
from pathlib import Path

try:
    from fontTools.ttLib import TTFont
    from fontTools.merge import Merger
except ImportError:
    sys.exit("需要 fonttools：pip install fonttools")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "node_modules" / "@fontsource" / "noto-sans-tc" / "files"
FONTS = ROOT / "public" / "fonts"

# 基底：涵蓋常用漢字的子集
BASE = "noto-sans-tc-chinese-traditional-{weight}-normal.woff"

# 一定要有的字元範圍：全形標點、CJK 標點、一般標點、基本拉丁
REQUIRED = (
    set(range(0xFF01, 0xFF61))   # 全形 ！＂＃…～
    | set(range(0x3000, 0x3040))  # 　、。〈〉「」…
    | set(range(0x2010, 0x2030))  # – — ‘ ’ “ ” …
    | set(range(0x0020, 0x007F))  # ASCII
)

WEIGHTS = ("400", "700")


def build(weight: str) -> None:
    base_path = FONTS / BASE.format(weight=weight)
    if not base_path.exists():
        sys.exit(f"找不到基底字型：{base_path}")
    if not SRC.exists():
        sys.exit(f"找不到 @fontsource 字型來源：{SRC}（請先執行 npm install）")

    base = TTFont(base_path)
    missing = REQUIRED - set(base.getBestCmap().keys())

    # 挑出「有補到缺字」的子集，其餘不合併，避免檔案無謂變大。
    # 同時記錄上游全部子集的涵蓋範圍 —— 驗收要比對的是「上游有的都補進來了」，
    # 而不是整段 Unicode 區塊；Noto Sans TC 本來就沒有其中幾十個罕用符號。
    picks = []
    upstream = set()
    for path in sorted(glob.glob(str(SRC / f"*-{weight}-normal.woff"))):
        font = TTFont(path)
        cmap = set(font.getBestCmap().keys())
        upstream |= cmap
        if cmap & missing:
            picks.append(path)
        font.close()

    target = REQUIRED & upstream
    unavailable = REQUIRED - upstream
    print(f"[{weight}] 基底缺 {len(missing)} 個必要字元，需合併 {len(picks)} 個子集"
          f"（上游本身沒有的 {len(unavailable)} 個字元不列入驗收）")

    with tempfile.TemporaryDirectory() as tmp:
        # Merger 只吃磁碟上的 ttf，先把 woff 解壓成 ttf
        parts = []
        for index, path in enumerate([str(base_path)] + picks):
            font = TTFont(path)
            font.flavor = None
            out = os.path.join(tmp, f"part-{index}.ttf")
            font.save(out)
            font.close()
            parts.append(out)

        merged = Merger().merge(parts)
        merged.flavor = "woff"
        dest = FONTS / f"noto-sans-tc-pdf-{weight}.woff"
        merged.save(dest)

        still_missing = target - set(merged.getBestCmap().keys())
        merged.close()

    if still_missing:
        sys.exit(f"[{weight}] 合併後仍缺 {len(still_missing)} 個字元，請檢查來源字型")

    print(f"[{weight}] -> {dest.relative_to(ROOT)} ({dest.stat().st_size / 1024 / 1024:.2f} MB)")


if __name__ == "__main__":
    for w in WEIGHTS:
        build(w)
    print("完成。記得用實際帳單產一份 PDF 確認標點有印出來。")
