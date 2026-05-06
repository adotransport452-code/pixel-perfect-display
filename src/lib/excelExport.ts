import ExcelJS from "exceljs";
import headerImg from "@/assets/export-header.png";

const HEADER_ROWS = 9; // image occupies first 9 rows

let cachedImageB64: string | null = null;
async function loadHeaderBase64(): Promise<string> {
  if (cachedImageB64) return cachedImageB64;
  const res = await fetch(headerImg);
  const blob = await res.blob();
  cachedImageB64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return cachedImageB64;
}

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E88E5" }, // blue
};
const GREEN_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF22C55E" },
};
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFBFBFBF" } },
  left: { style: "thin", color: { argb: "FFBFBFBF" } },
  right: { style: "thin", color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
};

export type ExtraTitle = { text: string; fill?: "green" | "blue" | "none"; height?: number; color?: string };
export type Section = { titles?: ExtraTitle[]; headers: string[]; rows: (string | number | null | undefined)[][] };

export async function exportStyledExcel(opts: {
  filename: string;
  sheetName?: string;
  headers?: string[];
  rows?: (string | number | null | undefined)[][];
  extraTitles?: ExtraTitle[];
  sections?: Section[];
}) {
  const { filename, sheetName = "Sheet1" } = opts;
  const sections: Section[] = opts.sections
    ? opts.sections
    : [{ titles: opts.extraTitles || [], headers: opts.headers || [], rows: opts.rows || [] }];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  // Determine widest header set for columns
  const colCount = Math.max(1, ...sections.map((s) => s.headers.length));
  const widthsByIdx: number[] = [];
  for (const s of sections) s.headers.forEach((h, i) => {
    widthsByIdx[i] = Math.max(widthsByIdx[i] || 14, Math.min(32, h.length + 6));
  });
  ws.columns = Array.from({ length: colCount }, (_, i) => ({ header: "", width: widthsByIdx[i] || 16 }));

  // Header image
  const b64 = await loadHeaderBase64();
  const imgId = wb.addImage({ base64: b64, extension: "png" });
  for (let r = 1; r <= HEADER_ROWS; r++) ws.getRow(r).height = 16;
  ws.addImage(imgId, {
    tl: { col: 0, row: 0 } as any,
    br: { col: colCount, row: HEADER_ROWS } as any,
    editAs: "oneCell",
  });
  ws.mergeCells(1, 1, HEADER_ROWS, colCount);

  let curRow = HEADER_ROWS + 1;

  for (const sec of sections) {
    for (const t of sec.titles || []) {
      ws.mergeCells(curRow, 1, curRow, colCount);
      const cell = ws.getCell(curRow, 1);
      cell.value = t.text;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { bold: true, size: 13, color: { argb: t.color || "FFFFFFFF" } };
      if (t.fill === "green") cell.fill = GREEN_FILL;
      else if (t.fill === "blue") cell.fill = HEADER_FILL;
      else cell.font = { bold: true, size: 13, color: { argb: "FF111111" } };
      cell.border = BORDER;
      ws.getRow(curRow).height = t.height ?? 24;
      curRow++;
    }

    const headerRow = ws.getRow(curRow);
    sec.headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = HEADER_FILL;
      cell.border = BORDER;
    });
    headerRow.height = 26;
    curRow++;

    for (const r of sec.rows) {
      const row = ws.getRow(curRow);
      for (let i = 0; i < sec.headers.length; i++) {
        const cell = row.getCell(i + 1);
        cell.value = (r[i] ?? "") as any;
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = BORDER;
      }
      curRow++;
    }
    // spacer row between sections
    curRow++;
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Helper: convert array of objects to headers + rows
export function objectsToTable(objects: Record<string, any>[]): { headers: string[]; rows: any[][] } {
  if (!objects.length) return { headers: [], rows: [] };
  const headers = Object.keys(objects[0]);
  const rows = objects.map((o) => headers.map((h) => o[h]));
  return { headers, rows };
}
