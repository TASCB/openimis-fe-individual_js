import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const getImageFormat = (mimeType) => {
  const normalized = (mimeType || "").toLowerCase();
  if (normalized.includes("png")) return "PNG";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "JPEG";
  if (normalized.includes("webp")) return "WEBP";
  return null;
};

async function loadImageAsset(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path);

      if (response.ok) {
        const mimeType = response.headers.get("content-type") || "";
        const format = getImageFormat(mimeType);

        if (!format) continue;

        const blob = await response.blob();

        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        return { data, format };
      }
    } catch (e) {
    }
  }

  return null;
}

async function loadLogo() {
  return loadImageAsset([
    "/front/tasafMIS.png",
    "/tasafMIS.png"
  ]);
}

async function loadGovernmentLogo() {
  return loadImageAsset([
    "/front/bibiNabwana.png",
    "/bibiNabwana.png"
  ]);
}

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

  if (leftLogo) {
    try {
      const leftLogoWidth = 24;
      const leftLogoHeight = 24;
      const leftLogoX = margin;
      const leftLogoY = 8;

      doc.addImage(
        leftLogo.data,
        leftLogo.format,
        leftLogoX,
        leftLogoY,
        leftLogoWidth,
        leftLogoHeight
      );
    } catch (error) {
      console.warn("Failed to add government logo to PDF header:", error);
    }
  }

  if (rightLogo) {
    try {
      const rightLogoWidth = 33;
      const rightLogoHeight = 28;
      const rightLogoX = pageWidth - margin - rightLogoWidth;
      const rightLogoY = 6;

      doc.addImage(
        rightLogo.data,
        rightLogo.format,
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

function addWatermark(doc, logo, pageWidth, pageHeight) {
  if (!logo) return;

  const logoWidth = 150;
  const logoHeight = 130;

  const x = (pageWidth - logoWidth) / 2;
  const y = (pageHeight - logoHeight) / 2;

  doc.setGState(new doc.GState({ opacity: 0.07 }));
  doc.addImage(logo.data, logo.format, x, y, logoWidth, logoHeight);
  doc.setGState(new doc.GState({ opacity: 1 }));
}

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

  drawHeader({
    doc,
    pageWidth,
    margin,
    rightLogo: logo,
    leftLogo: governmentLogo
  });

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
