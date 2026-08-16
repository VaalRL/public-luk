#!/usr/bin/env python3
"""
生成 PDF 用的最小化字體子集
只包含發票 PDF 中實際使用的字符
"""

import os
import subprocess
from pathlib import Path

# 發票 PDF 中使用的所有字符（從 invoice-pdf.tsx 提取）
INVOICE_CHARS = """
報價單甲乙方公司名稱統一編號聯絡人電話地址
日期單據號碼服務項目內容數量單價總價備註
銷售金額未稅營業稅含稅代墊費用小計
收款資訊幣別銀行分行帳號戶名
"""

# 添加常用的數字、標點和符號
COMMON_CHARS = "0123456789$,.:：/-()（）、。；「」『』【】《》 \n"

# 英文字母
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

# 合併所有字符並去重
all_chars = set(INVOICE_CHARS + COMMON_CHARS + LETTERS)
all_chars_str = ''.join(sorted(all_chars))

print(f"總字符數: {len(all_chars)}")
print(f"字符列表: {all_chars_str}")

# 將字符轉換為 Unicode 代碼點
unicode_list = []
for char in all_chars:
    if char.strip():  # 跳過空白字符（會單獨處理）
        unicode_list.append(f"U+{ord(char):04X}")

# 添加必需的空白字符
unicode_list.extend(["U+0020", "U+000A", "U+000D"])  # 空格、換行、回車

unicodes = ",".join(unicode_list)

# 字體文件路徑
fonts_dir = Path(__file__).parent.parent / "public" / "fonts"

# 處理 400 weight
print("\n處理 400 weight 字體...")
subprocess.run([
    "pyftsubset",
    str(fonts_dir / "noto-sans-tc-chinese-traditional-400-normal.woff"),
    f"--unicodes={unicodes}",
    f"--output-file={fonts_dir / 'noto-sans-tc-400-subset.woff'}",
    "--flavor=woff",
    "--layout-features=*",  # 保留所有布局特性
    "--no-hinting",  # 移除 hinting 以減小檔案
])

# 處理 700 weight
print("\n處理 700 weight 字體...")
subprocess.run([
    "pyftsubset",
    str(fonts_dir / "noto-sans-tc-chinese-traditional-700-normal.woff"),
    f"--unicodes={unicodes}",
    f"--output-file={fonts_dir / 'noto-sans-tc-700-subset.woff'}",
    "--flavor=woff",
    "--layout-features=*",
    "--no-hinting",
])

print("\n✅ 字體子集化完成！")
print("\n請檢查檔案大小:")
for weight in ["400", "700"]:
    file_path = fonts_dir / f"noto-sans-tc-{weight}-subset.woff"
    if file_path.exists():
        size_kb = file_path.stat().st_size / 1024
        print(f"  noto-sans-tc-{weight}-subset.woff: {size_kb:.1f} KB")
