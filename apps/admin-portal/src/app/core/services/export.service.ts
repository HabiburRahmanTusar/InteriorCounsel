import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  dataKey?: string;
}

export interface ExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  orientation?: 'portrait' | 'landscape';
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  /**
   * Export tabular data to an Excel (.xlsx) spreadsheet with Interior Counsel branding.
   */
  exportToExcel(options: ExportOptions): void {
    const { filename, title, subtitle, headers, rows } = options;

    // Build the worksheet rows starting with branded company header
    const worksheetData: (string | number | boolean | null | undefined)[][] = [
      ['INTERIOR COUNSEL — SMART INTERIOR SOLUTIONS'],
      [title],
      [`Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} ${subtitle ? ' | ' + subtitle : ''}`],
      [], // blank spacer row
      headers,
      ...rows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-calculate column widths based on maximum content length
    const colWidths = headers.map((header, colIdx) => {
      let maxLen = header.length;
      for (const row of rows) {
        const val = row[colIdx];
        if (val !== null && val !== undefined) {
          const len = String(val).length;
          if (len > maxLen) maxLen = len;
        }
      }
      return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = (title || 'Report').substring(0, 31).replace(/[:\\/?*[\]]/g, ' ');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, safeFilename);
  }

  /**
   * Export tabular data to a PDF document with Interior Counsel branding and styling.
   * Strictly adheres to zero-blue branding (Amber/Gold + Slate + Crisp White).
   */
  exportToPdf(options: ExportOptions): void {
    const { filename, title, subtitle, headers, rows } = options;
    const orientation = options.orientation || (headers.length > 6 ? 'landscape' : 'portrait');

    const doc = new jsPDF({
      orientation,
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Company Brand Header
    // Accent banner at top
    doc.setFillColor(215, 161, 60); // Interior Counsel Amber Gold (#d7a13c)
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Brand Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('INTERIOR COUNSEL', 36, 32);

    // Brand Tagline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('SMART INTERIOR SOLUTIONS — ENTERPRISE PORTAL', 36, 44);

    // Generation timestamp (right-aligned)
    const genDateStr = `Generated: ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(genDateStr, pageWidth - 36, 32, { align: 'right' });

    // Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(215, 161, 60); // Gold
    doc.text(title, 36, 68);

    // Subtitle / Filters applied
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(subtitle, 36, 82);
    }

    // Divider line
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.75);
    doc.line(36, 92, pageWidth - 36, 92);

    // 2. Render Data Table via autoTable
    const tableOptions: UserOptions = {
      startY: 102,
      margin: { left: 36, right: 36, bottom: 45 },
      head: [headers],
      body: rows.map(r => r.map(c => (c === null || c === undefined ? '—' : String(c)))),
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        font: 'helvetica',
      },
      headStyles: {
        fillColor: [30, 41, 59], // Dark Slate header
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        lineColor: [15, 23, 42],
        lineWidth: 0.75,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Slate 50
      },
      didDrawPage: (data) => {
        // Page footer on every page
        const currentPage = data.pageNumber;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);

        // Footer left: Confidentiality note
        doc.text('Interior Counsel ERP — Confidential Document', 36, pageHeight - 20);

        // Footer right: Page number
        doc.text(`Page ${currentPage}`, pageWidth - 36, pageHeight - 20, { align: 'right' });
      },
    };

    autoTable(doc, tableOptions);

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    doc.save(safeFilename);
  }
}

