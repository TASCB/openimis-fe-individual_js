import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Load TASAF logo from public paths
 *
 * @async
 * @returns {Promise<string|null>}
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
      // continue to next path
    }
  }

  return null;
}

/**
 * Load government logo from public paths
 *
 * Put the file in:
 * - public/front/serikali-logo.png
 * or
 * - public/serikali-logo.png
 *
 * @async
 * @returns {Promise<string|null>}
 */
async function loadGovernmentLogo() {
  const paths = [
    "/front/bibiNabwana.png",
    "/bibiNabwana.png"
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
      // continue to next path
    }
  }

  return null;
}

/**
 * Draw common report header
 *
 * Layout:
 * - government logo on the left
 * - titles centered
 * - TASAF logo on the right
 *
 * @param {Object} config
 * @param {jsPDF} config.doc
 * @param {number} config.pageWidth
 * @param {number} config.margin
 * @param {string|null} config.rightLogo
 * @param {string|null} config.leftLogo
 */
function drawHeader({
  doc,
  pageWidth,
  margin,
  rightLogo,
  leftLogo
}) {
  const headerHeight = 40;

  doc.setFillColor(0, 102, 102);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Left logo (government logo)
  if (leftLogo) {
    try {
      const leftLogoWidth = 24;
      const leftLogoHeight = 24;
      const leftLogoX = margin;
      const leftLogoY = 8;

      doc.addImage(
        leftLogo,
        "PNG",
        leftLogoX,
        leftLogoY,
        leftLogoWidth,
        leftLogoHeight
      );
    } catch (error) {
      console.warn("Failed to add government logo to PDF header:", error);
    }
  }

  // Right logo (TASAF)
  if (rightLogo) {
    try {
      const rightLogoWidth = 33;
      const rightLogoHeight = 28;
      const rightLogoX = pageWidth - margin - rightLogoWidth;
      const rightLogoY = 6;

      doc.addImage(
        rightLogo,
        "PNG",
        rightLogoX,
        rightLogoY,
        rightLogoWidth,
        rightLogoHeight
      );
    } catch (error) {
      console.warn("Failed to add TASAF logo to PDF header:", error);
    }
  }

  const centerX = pageWidth / 2;

  doc.setTextColor(255, 255, 255);

  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text(
    "MFUKO WA MAENDELEO YA JAMII (TASAF III)",
    centerX,
    12,
    { align: "center" }
  );

  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text(
    "MPANGO WA KUNUSURU KAYA MASIKINI",
    centerX,
    18,
    { align: "center" }
  );

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(
    "ORODHA YA KAYA MASIKINI YA KIJIJI/MTAA/SHEHIA",
    centerX,
    24,
    { align: "center" }
  );

  doc.setTextColor(0, 0, 0);
}

/**
 * Add watermark image to PDF page
 *
 * @param {jsPDF} doc
 * @param {string|null} logo
 * @param {number} pageWidth
 * @param {number} pageHeight
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
 * Add footer with page numbers
 *
 * @param {jsPDF} doc
 * @param {number} pageWidth
 * @param {number} pageHeight
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
 * Draw metadata information boxes on first page
 *
 * @param {Object} config
 * @param {jsPDF} config.doc
 * @param {number} config.margin
 * @param {number} config.pageWidth
 * @param {number} config.startY
 * @param {Date} config.generatedDate
 * @param {string} config.districtCode
 * @param {number} config.pmtCutoff
 * @returns {number}
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
 * Draw summary statistics box on first page
 *
 * @param {Object} config
 * @param {jsPDF} config.doc
 * @param {number} config.margin
 * @param {number} config.pageWidth
 * @param {number} config.startY
 * @param {Array} config.households
 * @returns {number}
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
 * @async
 * @param {Object} config
 * @param {Array} config.households
 * @param {string} config.districtCode
 * @param {number} config.pmtCutoff
 * @param {Date} config.generatedDate
 * @param {number} [config.totalCount]
 * @param {number} [config.currentPage]
 * @returns {Promise<void>}
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
  const governmentLogo = await loadGovernmentLogo();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // First page header
  drawHeader({
    doc,
    pageWidth,
    margin,
    rightLogo: logo,
    leftLogo: governmentLogo
  });

  // First page metadata + summary
  let contentY = 48;

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

  addWatermark(
    doc,
    logo,
    pageWidth,
    pageHeight
  );

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

    margin: {
      left: 12,
      right: 12,
      top: 40
    },

    didDrawPage: function () {
      const currentPageNumber = doc.getCurrentPageInfo().pageNumber;

      if (currentPageNumber > 1) {
        drawHeader({
          doc,
          pageWidth,
          margin,
          rightLogo: logo,
          leftLogo: governmentLogo
        });
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