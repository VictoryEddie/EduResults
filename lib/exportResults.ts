interface ScoreRow {
  subject: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
}

interface ExportData {
  studentName: string;
  className: string;
  term: string;
  year: string;
  teacherName: string;
  scores: ScoreRow[];
  remark: string;
  position: string;
  schoolName?: string;
  motto?: string;
  location?: string;
  logo?: string | null;
}

export type ExportFormat = "csv" | "xlsx" | "pdf";

export async function exportResult(data: ExportData, format: ExportFormat) {
  const filename = `${data.studentName}-${data.term}-${data.year}`;

  if (format === "csv") {
    const rows = [
      ["Student Name", data.studentName],
      ["Class", data.className],
      ["Term", data.term],
      ["Year", data.year],
      ["Teacher", data.teacherName],
      ["Position", data.position],
      [],
      ["Subject", "C/A", "Exam", "Total", "Grade"],
      ...data.scores.map((s) => [s.subject, s.ca, s.exam, s.total, s.grade]),
      [],
      ["Teacher's Remark", data.remark],
    ];
    const csv = rows.map((r) => r.length === 0 ? "" : toCsvRow(r)).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), `${filename}.csv`);
  }

  if (format === "xlsx") {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.aoa_to_sheet([
      ["Student Name", data.studentName],
      ["Class", data.className],
      ["Term", data.term],
      ["Year", data.year],
      ["Teacher", data.teacherName],
      ["Position", data.position],
      [],
      ["Subject", "C/A", "Exam", "Total", "Grade"],
      ...data.scores.map((s) => [s.subject, s.ca, s.exam, s.total, s.grade]),
      [],
      ["Teacher's Remark", data.remark],
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Result");
    writeFile(wb, `${filename}.xlsx`);
  }

  if (format === "pdf") {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(27, 43, 75);
    doc.text(data.schoolName ?? "EduResults — Student Academic Report", 14, 20);

    doc.setFontSize(8);
    doc.setTextColor(150);
    if (data.location) doc.text(data.location, 14, 26);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Student: ${data.studentName}`, 14, 34);
    doc.text(`Class: ${data.className}`, 14, 38);
    doc.text(`Term: ${data.term} ${data.year}`, 14, 44);
    doc.text(`Teacher: ${data.teacherName}`, 14, 50);
    doc.text(`Position: ${data.position}`, 14, 56);

    autoTable(doc, {
      startY: 64,
      head: [["Subject", "C/A", "Exam", "Total", "Grade"]],
      body: data.scores.map((s) => [s.subject, s.ca, s.exam, s.total, s.grade]),
      headStyles: { fillColor: [27, 43, 75] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Teacher's Remark:", 14, finalY);
    doc.setTextColor(50);
    doc.text(data.remark, 14, finalY + 6, { maxWidth: 180 });

    doc.save(`${filename}.pdf`);
  }
}

/**
 * Exports a summary list of student results (e.g. for a whole class).
 */
export async function exportClassResults(dataList: ExportData[], format: ExportFormat) {
  if (dataList.length === 0) return;
  const first = dataList[0];
  const filename = `Class-Results-${first.className}-${first.term}-${first.year}`;

  /* Get a unique list of all subjects across all students */
  const allSubjects = Array.from(new Set(dataList.flatMap(d => d.scores.map(s => s.subject)))).sort();

  if (format === "csv" || format === "xlsx") {
    const header = ["Student Name", ...allSubjects, "Total", "Position"];
    const rows = dataList.map(d => {
      const studentRow: (string | number)[] = [d.studentName];
      allSubjects.forEach(sub => {
        const score = d.scores.find(s => s.subject === sub);
        studentRow.push(score ? score.total : "-");
      });
      const total = d.scores.reduce((sum, s) => sum + s.total, 0);
      studentRow.push(total);
      studentRow.push(d.position);
      return studentRow;
    });

    if (format === "csv") {
      const csv = [header, ...rows].map(toCsvRow).join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv" }), `${filename}.csv`);
    } else {
      const { utils, writeFile } = await import("xlsx");
      const ws = utils.aoa_to_sheet([header, ...rows]);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Class Results");
      writeFile(wb, `${filename}.xlsx`);
    }
  }

  if (format === "pdf") {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF("landscape"); // Landscape for broad tables

    doc.setFontSize(16);
    doc.setTextColor(27, 43, 75);
    doc.text(`Class Results Summary: ${first.className}`, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${first.term} ${first.year} — Teacher: ${first.teacherName}`, 14, 30);

    const head = [["Student Name", ...allSubjects, "Total", "Pos"]];
    const body = dataList.map(d => {
      const total = d.scores.reduce((sum, s) => sum + s.total, 0);
      const scores = allSubjects.map(sub => d.scores.find(s => s.subject === sub)?.total ?? "-");
      return [d.studentName, ...scores, total, d.position];
    });

    autoTable(doc, {
      startY: 40,
      head,
      body,
      headStyles: { fillColor: [27, 43, 75], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });

    doc.save(`${filename}.pdf`);
  }
}


function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* Wraps a CSV cell value in quotes and escapes internal quotes */
function csvCell(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(row: (string | number)[]): string {
  return row.map(csvCell).join(",");
}
