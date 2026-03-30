import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  try {
    const text = await file.text();
    let parsedData: string[][] = [];
    let summary = "";

    if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.type === "text/csv") {
      // Parse CSV/TSV
      const delimiter = file.name.endsWith(".tsv") ? "\t" : ",";
      const lines = text.split("\n").filter(l => l.trim());
      parsedData = lines.map(line => {
        const row: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; continue; }
          if (char === delimiter && !inQuotes) { row.push(current.trim()); current = ""; continue; }
          current += char;
        }
        row.push(current.trim());
        return row;
      });

      const headers = parsedData[0] || [];
      const rowCount = parsedData.length - 1;
      summary = `CSV file with ${headers.length} columns and ${rowCount} rows.\nColumns: ${headers.join(", ")}`;

      // Include first 50 rows as context (headers + data)
      const preview = parsedData.slice(0, 51);
      const previewText = preview.map(row => row.join(" | ")).join("\n");
      summary += `\n\nData preview:\n${previewText}`;

      // Basic numeric analysis
      const numericCols: number[] = [];
      if (parsedData.length > 1) {
        for (let col = 0; col < headers.length; col++) {
          const vals = parsedData.slice(1, 20).map(row => parseFloat(row[col]?.replace(/[€$,]/g, "") || ""));
          if (vals.filter(v => !isNaN(v)).length > vals.length * 0.5) {
            numericCols.push(col);
            const validVals = vals.filter(v => !isNaN(v));
            const sum = validVals.reduce((a, b) => a + b, 0);
            const avg = sum / validVals.length;
            const max = Math.max(...validVals);
            const min = Math.min(...validVals);
            summary += `\n\n${headers[col]} — Sum: ${sum.toFixed(2)}, Avg: ${avg.toFixed(2)}, Min: ${min}, Max: ${max}`;
          }
        }
      }
    } else if (file.type === "application/json" || file.name.endsWith(".json")) {
      // Parse JSON
      const data = JSON.parse(text);
      const preview = JSON.stringify(data, null, 2).slice(0, 5000);
      summary = `JSON file (${(file.size / 1024).toFixed(1)}KB).\n\nContent preview:\n${preview}`;
    } else {
      // Plain text or unsupported — send raw text
      summary = `File: ${file.name} (${file.type || "unknown type"}, ${(file.size / 1024).toFixed(1)}KB)\n\nContent:\n${text.slice(0, 8000)}`;
    }

    return NextResponse.json({
      name: file.name,
      size: file.size,
      type: file.type,
      rows: parsedData.length,
      summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to parse file: ${err.message}` }, { status: 400 });
  }
}
