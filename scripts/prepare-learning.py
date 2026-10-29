#!/usr/bin/env python3
"""验证受版本控制的人工整理目录，不覆盖它。 / Validate the curated catalog without overwriting it."""
import runpy
from pathlib import Path


def main():
    # JSON 是唯一维护源；旧生成表会丢失已审核的分类、补充结构和穴位关联。
    # JSON is canonical; legacy generation tables lose reviewed categories, supplements and point links.
    runpy.run_path(str(Path(__file__).with_name("validate-learning.py")), run_name="__main__")
    print("保留人工整理学习目录，无写入。 / Curated learning catalog preserved without writes.")


if __name__ == "__main__":
    main()
