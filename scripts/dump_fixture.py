"""Dump a workbook to the row-array JSON shape the TypeScript parser consumes.

The Sheets API returns each tab as an array of row arrays of strings, so the
fixture we test the parser against has to be that same shape -- not xlsx.

Usage: python3 scripts/dump_fixture.py <workbook.xlsx> <out.json>
"""

import json
import sys

import openpyxl


def dump(src: str, dest: str) -> None:
    wb = openpyxl.load_workbook(src, data_only=True)
    out = {}

    for ws in wb.worksheets:
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append(["" if cell is None else str(cell) for cell in row])

        # Trailing blank rows carry no meaning and bloat the fixture.
        while rows and not any(cell.strip() for cell in rows[-1]):
            rows.pop()

        out[ws.title] = rows

    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    print(f"{len(out)} sheets, {sum(len(r) for r in out.values())} rows -> {dest}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        raise SystemExit(2)
    dump(sys.argv[1], sys.argv[2])
