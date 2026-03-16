import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Load TASAF logo from multiple possible locations
 *
 * Attempts to load the TASAF logo image from multiple paths with fallback support.
 * If logo is not found, PDF generation continues without logo (graceful degradation).
 *
 * @async
 * @returns {Promise<string|null>} Logo as base64 data URL, or null if not found
 * @throws {Error} If FileReader encounters an error
 */
async function loadLogo() {
  const paths = [
    "/front/tasafMIS.png",
    "/tasafMIS.png"
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path);

      if (response.ok) {
        const blob = await response.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;

          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      // Logo load failed, continue to next path
    }
  }

  return null;
}

/**
 * Add watermark image to PDF page
 *
 * Adds a semi-transparent TASAF logo as watermark centered on the page.
 * Watermark is only visible if logo is provided.
 *
 * @param {jsPDF} doc - jsPDF instance
 * @param {string|null} logo - Logo as base64 data URL (or null to skip)
 * @param {number} pageWidth - Width of PDF page in mm
 * @param {number} pageHeight - Height of PDF page in mm
 * @returns {void}
 */
function addWatermark(doc, logo, pageWidth, pageHeight) {
  if (!logo) return;

  const logoWidth = 150;
  const logoHeight = 130;

  const x = (pageWidth - logoWidth) / 2;
  const y = (pageHeight - logoHeight) / 2;

  doc.setGState(new doc.GState({ opacity: 0.07 }));
  doc.addImage(logo, "PNG", x, y, logoWidth, logoHeight);
  doc.setGState(new doc.GState({ opacity: 1 }));
}

/**
 * Add footer with page numbers to PDF page
 *
 * Adds a footer line separator and page number indicator (e.g., "Page 1 of 5")
 * positioned at the bottom right of each page.
 *
 * @param {jsPDF} doc - jsPDF instance
 * @param {number} pageWidth - Width of PDF page in mm
 * @param {number} pageHeight - Height of PDF page in mm
 * @returns {void}
 */
function addFooter(doc, pageWidth, pageHeight) {
  const pageNumber = doc.getCurrentPageInfo().pageNumber;
  const totalPages = doc.getNumberOfPages();

  doc.setDrawColor(0, 102, 102);
  doc.line(
    12,
    pageHeight - 10,
    pageWidth - 12,
    pageHeight - 10
  );

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Page ${pageNumber} of ${totalPages}`,
    pageWidth - 12,
    pageHeight - 5,
    { align: "right" }
  );
}

/**
 * Draw metadata information boxes on first page of PDF
 *
 * Creates three information boxes displaying Generated Date, District, and PMT Cutoff.
 * Boxes are arranged horizontally with light background and teal borders.
 *
 * @param {Object} config - Configuration object
 * @param {jsPDF} config.doc - jsPDF instance
 * @param {number} config.margin - Left/right margin in mm
 * @param {number} config.pageWidth - Page width in mm
 * @param {number} config.startY - Y position to start drawing in mm
 * @param {Date} config.generatedDate - Report generation timestamp
 * @param {string} config.districtCode - Name of district (e.g., "Monduli")
 * @param {number} config.pmtCutoff - PMT cutoff value (e.g., 11.01)
 * @returns {number} Y position after metadata boxes
 */
function drawMetadataBoxes({
  doc,
  margin,
  pageWidth,
  startY,
  generatedDate,
  districtCode,
  pmtCutoff
}) {
  const contentWidth = pageWidth - (margin * 2);
  const gap = 3;
  const boxHeight = 14;
  const boxWidth = (contentWidth - (gap * 2)) / 3;

  const metadataItems = [
    {
      label: "Generated Date:",
      value: generatedDate?.toLocaleString() || "-"
    },
    {
      label: "District:",
      value: districtCode || "-"
    },
    {
      label: "PMT Cutoff:",
      value: pmtCutoff ?? "-"
    }
  ];

  let x = margin;

  metadataItems.forEach((item) => {
    doc.setFillColor(240, 248, 248);
    doc.rect(x, startY, boxWidth, boxHeight, "F");

    doc.setDrawColor(0, 102, 102);
    doc.rect(x, startY, boxWidth, boxHeight);

    doc.setTextColor(0, 0, 0);

    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text(item.label, x + 2, startY + 5);

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");

    const valueLines = doc.splitTextToSize(
      String(item.value),
      boxWidth - 4
    );

    doc.text(valueLines[0] || "-", x + 2, startY + 11);

    x += boxWidth + gap;
  });

  return startY + boxHeight;
}

/**
 * Draw summary statistics box on first page of PDF
 *
 * Creates a summary box displaying total households and breakdown by PMT status (Poor/Non-Poor).
 * Includes percentage calculations for each category.
 *
 * @param {Object} config - Configuration object
 * @param {jsPDF} config.doc - jsPDF instance
 * @param {number} config.margin - Left/right margin in mm
 * @param {number} config.pageWidth - Page width in mm
 * @param {number} config.startY - Y position to start drawing in mm
 * @param {Array} config.households - Array of household objects to analyze
 * @returns {number} Y position after summary box
 */
function drawSummaryBox({
  doc,
  margin,
  pageWidth,
  startY,
  households
}) {
  const contentWidth = pageWidth - (margin * 2);
  const poor = households.filter((h) => h.pmtClass === "POOR").length;
  const nonPoor = households.filter((h) => h.pmtClass === "NON_POOR").length;
  const total = households.length;

  const poorPct = total ? ((poor / total) * 100).toFixed(1) : "0.0";
  const nonPoorPct = total ? ((nonPoor / total) * 100).toFixed(1) : "0.0";

  doc.setFillColor(230, 245, 245);
  doc.rect(margin, startY, contentWidth, 16, "F");

  doc.setDrawColor(0, 102, 102);
  doc.setLineWidth(0.5);
  doc.rect(margin, startY, contentWidth, 16);

  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("Summary Statistics", margin + 3, startY + 5);

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");

  const summaryText =
    `Total Households: ${total} | Poor: ${poor} (${poorPct}%) | Non-Poor: ${nonPoor} (${nonPoorPct}%)`;

  doc.text(summaryText, margin + 3, startY + 12);

  return startY + 16;
}

/**
 * Generate and download PMT Enrollment List as PDF
 *
 * Creates a professional PDF report containing:
 * - TASAF header with logo and Swahili titles
 * - Metadata boxes (Generated Date, District, PMT Cutoff)
 * - Summary statistics (Total, Poor%, Non-Poor%)
 * - Table of all households matching filters
 * - Consistent header and footer on all pages
 * - Page numbers and watermark
 *
 * The PDF is automatically downloaded to the user's device with filename "PMT_Enrollment_List.pdf"
 *
 * @async
 * @param {Object} config - Configuration object
 * @param {Array} config.households - Array of household objects to export
 * @param {string} config.districtCode - District name for metadata display (e.g., "Monduli")
 * @param {number} config.pmtCutoff - PMT cutoff value used for filtering (e.g., 11.01)
 * @param {Date} config.generatedDate - Report generation timestamp
 * @param {number} [config.totalCount] - Total count of households (optional, calculated from households array)
 * @param {number} [config.currentPage] - Current page number (optional, not currently used)
 * @returns {Promise<void>} Triggers PDF download to browser
 * @throws {Error} If jsPDF or autoTable encounters rendering error
 *
 * @example
 * await exportPmtEnrollmentPdf({
 *   households: [{ groupCode: 'P3-001', headName: 'John', ... }],
 *   districtCode: 'Monduli',
 *   pmtCutoff: 11.01,
 *   generatedDate: new Date()
 * });
 */
export async function exportPmtEnrollmentPdf({
  households = [],
  districtCode,
  pmtCutoff,
  generatedDate,
  totalCount,
  currentPage
}) {
  const logo = await loadLogo();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 12;

  /**
   * Header
   */
  doc.setFillColor(0, 102, 102);
  doc.rect(
    0,
    0,
    pageWidth,
    40,
    "F"
  );

  if (logo) {
    const logoWidth = 33;
    const logoHeight = 28;
    const logoX = pageWidth - margin - logoWidth - 8;

    doc.addImage(
      logo,
      "PNG",
      logoX,
      6,
      logoWidth,
      logoHeight
    );
  }

  doc.setTextColor(255, 255, 255);

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(
    "MFUKO WA MAENDELEO YA JAMII (TASAF III)",
    margin,
    12
  );

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text(
    "MPANGO WA KUNUSURU KAYA MASIKINI",
    margin,
    18
  );

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(
    "ORODHA YA KAYA MASIKINI YA KIJIJI/MTAA/SHEHIA",
    margin,
    24
  );

  doc.setTextColor(0, 0, 0);

  /**
   * Metadata boxes + summary box
   */
  let contentY = 48;

  /**
   * Metadata boxes + summary box on first page only
   */
  contentY = drawMetadataBoxes({
    doc,
    margin,
    pageWidth,
    startY: contentY,
    generatedDate,
    districtCode,
    pmtCutoff
  });

  contentY += 6;

  contentY = drawSummaryBox({
    doc,
    margin,
    pageWidth,
    startY: contentY,
    households
  });

  contentY += 8;

  /**
   * Watermark
   */
  addWatermark(
    doc,
    logo,
    pageWidth,
    pageHeight
  );

  /**
   * Table Data
   */
  const columns = [
    "Group Code",
    "Head Name",
    "Village",
    "PMT Score",
    "Status"
  ];

  const rows = households.map((h) => [
    h.groupCode || "-",
    h.headName || "-",
    h.locationName || "-",
    h.pmtScore !== undefined && h.pmtScore !== null
      ? Number(h.pmtScore).toFixed(2)
      : "-",
    h.pmtClass || "-"
  ]);

  /**
   * Table
   */
  autoTable(doc, {
    startY: contentY,

    head: [columns],
    body: rows,

    theme: "grid",

    styles: {
      fontSize: 9,
      cellPadding: 2,
      valign: "middle"
    },

    headStyles: {
      fillColor: [0, 102, 102],
      textColor: 255,
      fontStyle: "bold"
    },

    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },

    margin: { left: 12, right: 12, top: 40 },

    didDrawPage: function (data) {
      const pageNumber = doc.internal.getNumberOfPages();

      // For pages after the first, redraw the complete header (same as page 1)
      if (pageNumber > 1) {
        // Dark teal background header
        doc.setFillColor(0, 102, 102);
        doc.rect(0, 0, pageWidth, 32, "F");

        // Logo if available
        if (logo) {
          const logoWidth = 33;
          const logoHeight = 28;
          const logoX = pageWidth - margin - logoWidth - 8;
          doc.addImage(logo, "PNG", logoX, 2, logoWidth, logoHeight);
        }

        // White text for Swahili titles
        doc.setTextColor(255, 255, 255);

        doc.setFontSize(16);
        doc.setFont(undefined, "bold");
        doc.text(
          "MFUKO WA MAENDELEO YA JAMII (TASAF III)",
          margin,
          10
        );

        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(
          "MPANGO WA KUNUSURU KAYA MASIKINI",
          margin,
          16
        );

        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(
          "ORODHA YA KAYA MASIKINI YA KIJIJI/MTAA/SHEHIA",
          margin,
          22
        );

        doc.setTextColor(0, 0, 0);
      }

      addWatermark(
        doc,
        logo,
        pageWidth,
        pageHeight
      );

      addFooter(
        doc,
        pageWidth,
        pageHeight
      );
    }
  });

  doc.save("PMT_Enrollment_List.pdf");
}



