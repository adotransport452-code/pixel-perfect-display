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

export type ExtraTitle = { text: string; fill?: "green" | "none"; height?: number };

export async function exportStyledExcel(opts: {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  extraTitles?: ExtraTitle[]; // additional merged rows between header image and table headers
}) {
  const { filename, sheetName = "Sheet1", headers, rows, extraTitles = [] } = opts;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: HEADER_ROWS }] });

  // Reserve column count
  const colCount = Math.max(headers.length, 1);
  ws.columns = headers.map((h) => ({ header: "", key: h, width: Math.max(14, Math.min(32, h.length + 6)) }));

  // Add image spanning first HEADER_ROWS rows
  const b64 = await loadHeaderBase64();
  const imgId = wb.addImage({ base64: b64, extension: "png" });
  // Make first rows shorter to fit logo properly
  for (let r = 1; r <= HEADER_ROWS; r++) ws.getRow(r).height = 16;
  ws.addImage(imgId, {
    tl: { col: 0, row: 0 } as any,
    br: { col: colCount, row: HEADER_ROWS } as any,
    editAs: "oneCell",
  });
  // Merge header banner area
  ws.mergeCells(1, 1, HEADER_ROWS, colCount);

  let curRow = HEADER_ROWS + 1;

  // Extra title rows
  for (const t of extraTitles) {
    ws.mergeCells(curRow, 1, curRow, colCount);
    const cell = ws.getCell(curRow, 1);
    cell.value = t.text;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    if (t.fill === "green") cell.fill = GREEN_FILL;
    cell.border = BORDER;
    ws.getRow(curRow).height = t.height ?? 24;
    curRow++;
  }

  // Header row (blue, bold, centered)
  const headerRow = ws.getRow(curRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
  });
  headerRow.height = 26;
  curRow++;

  // Data rows
  for (const r of rows) {
    const row = ws.getRow(curRow);
    for (let i = 0; i < headers.length; i++) {
      const cell = row.getCell(i + 1);
      cell.value = (r[i] ?? "") as any;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = BORDER;
    }
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
