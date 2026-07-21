interface ScoreRow {
  subject: string;
  ca: number;
  exam: number;
  total: number;
  grade: string;
}

export interface ExportData {
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const primaryColor: [number, number, number] = [37, 99, 235]; // Tailwind blue-600
    const slate900: [number, number, number] = [15, 23, 42];
    const slate500: [number, number, number] = [100, 116, 139];
    const slate100: [number, number, number] = [241, 245, 249];

    // Watermark (Faint text across background)
    doc.setFontSize(60);
    doc.setTextColor(241, 245, 249); // Tailwind slate-100
    const watermarkText = data.schoolName || "OFFICIAL";
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });

    // Header Background Accent Line
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 8, "F");

    let startY = 24;

    // School Name & Header
    if (data.logo && data.logo.startsWith("data:image")) {
      doc.addImage(data.logo, "PNG", 14, 12, 16, 16);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text(data.schoolName ?? "EduResults", 34, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      if (data.location) doc.text(data.location, 34, 28);
      startY = 40;
    } else {
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text(data.schoolName ?? "EduResults", 14, 22);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      if (data.location) doc.text(data.location, 14, 28);
      startY = 40;
    }

    // "Official Academic Report" Badge
    doc.setFillColor(slate900[0], slate900[1], slate900[2]);
    doc.roundedRect(pageWidth - 70, 16, 56, 8, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("ACADEMIC REPORT", pageWidth - 42, 21.5, { align: "center" });

    // Student Info Card
    doc.setFillColor(slate100[0], slate100[1], slate100[2]);
    doc.roundedRect(14, startY, pageWidth - 28, 36, 4, 4, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text("Student Name:", 20, startY + 8);
    doc.setFont("helvetica", "normal");
    doc.text(data.studentName, 50, startY + 8);

    doc.setFont("helvetica", "bold");
    doc.text("Class:", 20, startY + 16);
    doc.setFont("helvetica", "normal");
    doc.text(data.className, 50, startY + 16);

    doc.setFont("helvetica", "bold");
    doc.text("Term:", 120, startY + 8);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.term} ${data.year}`, 150, startY + 8);

    doc.setFont("helvetica", "bold");
    doc.text("Position:", 120, startY + 16);
    doc.setFont("helvetica", "normal");
    doc.text(data.position, 150, startY + 16);

    doc.setFont("helvetica", "bold");
    doc.text("Teacher:", 20, startY + 24);
    doc.setFont("helvetica", "normal");
    doc.text(data.teacherName, 50, startY + 24);

    // Calculate total score and average
    const totalObtained = data.scores.reduce((sum, s) => sum + s.total, 0);
    const average = data.scores.length > 0 ? (totalObtained / data.scores.length).toFixed(1) : "0.0";

    doc.setFont("helvetica", "bold");
    doc.text("Average:", 120, startY + 24);
    doc.setFont("helvetica", "normal");
    doc.text(`${average}%`, 150, startY + 24);

    const tableStartY = startY + 44;

    autoTable(doc, {
      startY: tableStartY,
      head: [["Subject", "C/A", "Exam", "Total", "Grade"]],
      body: data.scores.map((s) => [s.subject, s.ca, s.exam, s.total, s.grade]),
      headStyles: { fillColor: primaryColor, fontStyle: "bold", halign: "left" },
      bodyStyles: { textColor: slate900 },
      columnStyles: {
        0: { halign: "left", fontStyle: "bold" },
        1: { halign: "center" },
        2: { halign: "center" },
        3: { halign: "center", fontStyle: "bold" },
        4: { halign: "center", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: slate100 },
      theme: "grid",
      styles: {
        lineWidth: 0.1,
        lineColor: [226, 232, 240], // slate-200
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Remarks Section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text("Teacher's Remark:", 14, finalY);

    doc.setFillColor(slate100[0], slate100[1], slate100[2]);
    doc.rect(14, finalY + 4, 2, 12, "F"); // Left accent border
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(`"${data.remark || "No additional remarks provided."}"`, 20, finalY + 12, { maxWidth: 170 });

    // Signatures
    const sigY = finalY + 40;
    doc.setDrawColor(slate900[0], slate900[1], slate900[2]);
    doc.setLineWidth(0.5);

    // Teacher Signature
    doc.line(14, sigY, 70, sigY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text("Class Teacher Signature", 42, sigY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(data.teacherName, 42, sigY + 10, { align: "center" });

    // Principal Signature
    doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text("Principal / Head Teacher", pageWidth - 42, sigY + 5, { align: "center" });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(
      `Official Academic Report • Generated by EduResults on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

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
  const allSubjects = Array.from(new Set(dataList.flatMap((d) => d.scores.map((s) => s.subject)))).sort();

  if (format === "csv" || format === "xlsx") {
    const header = ["Student Name", ...allSubjects, "Total", "Position"];
    const rows = dataList.map((d) => {
      const studentRow: (string | number)[] = [d.studentName];
      allSubjects.forEach((sub) => {
        const score = d.scores.find((s) => s.subject === sub);
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const primaryColor: [number, number, number] = [37, 99, 235]; // Tailwind blue-600
    const slate900: [number, number, number] = [15, 23, 42];
    const slate500: [number, number, number] = [100, 116, 139];

    // Watermark
    doc.setFontSize(80);
    doc.setTextColor(241, 245, 249); // slate-100
    const watermarkText = first.schoolName || "OFFICIAL";
    doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });

    // Header Background Accent Line
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 8, "F");

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text(`Class Results Summary: ${first.className}`, 14, 24);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(`${first.term} ${first.year} — Teacher: ${first.teacherName}`, 14, 32);

    const head = [["Student Name", ...allSubjects, "Total", "Pos"]];
    const body = dataList.map((d) => {
      const total = d.scores.reduce((sum, s) => sum + s.total, 0);
      const scores = allSubjects.map((sub) => d.scores.find((s) => s.subject === sub)?.total ?? "-");
      return [d.studentName, ...scores, total, d.position];
    });

    autoTable(doc, {
      startY: 40,
      head,
      body,
      headStyles: { fillColor: primaryColor, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: slate900 },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      theme: "grid",
      styles: { lineWidth: 0.1, lineColor: [226, 232, 240] },
    });

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(
      `Official Academic Report • Generated by EduResults on ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

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
