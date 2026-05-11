import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const getImageFormat = (mimeType) => {
  const normalized = (mimeType || "").toLowerCase();
  if (normalized.includes("png")) return "PNG";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "JPEG";
  if (normalized.includes("webp")) return "WEBP";
  return null;
};

const DEFAULT_ENROLLMENT_TITLE = "ORODHA YA KAYA ZILIZOTAMBULIWA";

const getEnrollmentPdfTitle = (pmtClass) => {
  if (pmtClass === "POOR") {
    return "ORODHA YA KAYA MASIKINI";
  }
  if (pmtClass === "NON_POOR") {
    return "ORODHA YA KAYA ZILIZOKOSA VIGEZO";
  }
  return DEFAULT_ENROLLMENT_TITLE;
};

const getEnrollmentPdfFileName = (pmtClass) => {
  if (pmtClass === "POOR") {
    return "PMT_Enrollment_List_Poor.pdf";
  }
  if (pmtClass === "NON_POOR") {
    return "PMT_Enrollment_List_Non_Poor.pdf";
  }
  return "PMT_Enrollment_List.pdf";
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
  leftLogo,
  title = DEFAULT_ENROLLMENT_TITLE
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
    title,
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
  villageName
}) {
  const contentWidth = pageWidth - (margin * 2);
  const gap = 3;
  const boxHeight = 14;
  const boxWidth = (contentWidth - (gap * 2)) / 3;

  const metadataItems = [
    {
      label: "Tarehe:",
      value: generatedDate?.toLocaleString() || "-"
    },
    {
      label: "Wilaya:",
      value: districtCode || "-"
    },
    {
      label: "Kijiji:",
      value: villageName || "-"
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

const getExportVillageName = (households) => {
  const villages = new Set((households || []).map((household) => household?.locationName).filter(Boolean));
  if (villages.size === 1) {
    return [...villages][0];
  }
  if (villages.size > 1) {
    return "Vijiji Mbalimbali";
  }
  return null;
};

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
  doc.text("Muhtasari", margin + 3, startY + 5);

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");

  const summaryText =
    `Jumla ya Kaya: ${total} | Masikini: ${poor} (${poorPct}%) | Wasio na vigezo: ${nonPoor} (${nonPoorPct}%)`;

  doc.text(summaryText, margin + 3, startY + 12);

  return startY + 16;
}

export async function exportPmtEnrollmentPdf({
  households = [],
  districtCode,
  pmtCutoff,
  generatedDate,
  totalCount,
  currentPage,
  pmtClass
}) {
  const logo = await loadLogo();
  const governmentLogo = await loadGovernmentLogo();
  const title = getEnrollmentPdfTitle(pmtClass);
  const fileName = getEnrollmentPdfFileName(pmtClass);
  const villageName = getExportVillageName(households);

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
    leftLogo: governmentLogo,
    title
  });

  let contentY = 48;

  contentY = drawMetadataBoxes({
    doc,
    margin,
    pageWidth,
    startY: contentY,
    generatedDate,
    districtCode,
    villageName
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
    "Na.",
    "NAMBA YA UTAMBUZI",
    "JINA LA MWAKILISHI",
    "JINA LA MKUU WA KAYA"
  ];

  const rows = households.map((h, index) => [
    index + 1,
    h.groupCode || "-",
    h.hhRep || "-",
    h.headName || "-",
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
      top: 52
    },

    didDrawPage: function () {
      const currentPageNumber = doc.getCurrentPageInfo().pageNumber;

      if (currentPageNumber > 1) {
        drawHeader({
          doc,
          pageWidth,
          margin,
          rightLogo: logo,
          leftLogo: governmentLogo,
          title
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

  doc.save(fileName);
}

const NON_CONSENTED_TITLE = "KAYA AMBAZO HAZIJAHOJIWA";

export async function exportNonConsentedHouseholdsPdf({
  households = [],
  districtName,
  villageName,
  generatedDate,
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
    leftLogo: governmentLogo,
    title: NON_CONSENTED_TITLE
  });

  let contentY = 48;

  contentY = drawMetadataBoxes({
    doc,
    margin,
    pageWidth,
    startY: contentY,
    generatedDate,
    districtCode: districtName,
    villageName
  });

  contentY += 6;

  const contentWidth = pageWidth - (margin * 2);
  doc.setFillColor(230, 245, 245);
  doc.rect(margin, contentY, contentWidth, 16, "F");
  doc.setDrawColor(0, 102, 102);
  doc.setLineWidth(0.5);
  doc.rect(margin, contentY, contentWidth, 16);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("Muhtasari", margin + 3, contentY + 5);
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(`Jumla ya Kaya: ${households.length}`, margin + 3, contentY + 12);

  contentY += 24;

  addWatermark(doc, logo, pageWidth, pageHeight);

  const columns = [
    "Na.",
    "JINA LA MKUU WA KAYA",
    "WILAYA",
    "KIJIJI",
    "UFUNGUO WA USAILI",
    "SABABU",
  ];

  const rows = households.map((h, index) => [
    index + 1,
    h.headName || "-",
    h.districtName || "-",
    h.villageName || "-",
    h.interviewKey || "-",
    h.interviewReason || "-",
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
      top: 52
    },
    didDrawPage: function () {
      const currentPageNumber = doc.getCurrentPageInfo().pageNumber;
      if (currentPageNumber > 1) {
        drawHeader({
          doc,
          pageWidth,
          margin,
          rightLogo: logo,
          leftLogo: governmentLogo,
          title: NON_CONSENTED_TITLE
        });
        addWatermark(doc, logo, pageWidth, pageHeight);
      }
      addFooter(doc, pageWidth, pageHeight);
    }
  });

  doc.save("Non_Consented_Households.pdf");
}
