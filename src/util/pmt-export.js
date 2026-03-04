/**
 * PMT Results PDF Export Utility
 * Exports household PMT data as PDF document using jsPDF
 */

/**
 * Export PMT household results as PDF
 * @param {Object} config - Export configuration
 * @param {Array} config.households - Array of household objects
 * @param {Object} config.filters - Active filters
 * @param {string} config.districtCode - District code
 * @param {string} config.districtName - District name
 * @param {number} config.pmtCutoff - PMT cutoff used
 * @param {Date} config.generatedDate - Report generation date
 */
export function exportPmtResultsAsPdf({
  households,
  filters,
  districtCode,
  districtName,
  pmtCutoff,
  generatedDate,
}) {
  try {
    // Dynamically import jsPDF and html2canvas
    Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]).then(([jsPDFModule, html2canvasModule]) => {
      const { jsPDF } = jsPDFModule;
      const html2canvas = html2canvasModule.default;

      // Create PDF document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 10;
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      // Set font
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('PROXY MEANS TEST (PMT) RESULTS REPORT', margin, yPosition);

      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      // Report metadata
      doc.text(`Generated Date: ${generatedDate?.toLocaleString() || 'N/A'}`, margin, yPosition);
      yPosition += 5;
      doc.text(`District: ${districtName || districtCode}`, margin, yPosition);
      yPosition += 5;
      doc.text(`PMT Cutoff: ${pmtCutoff}`, margin, yPosition);
      yPosition += 7;

      // Filter summary
      if (filters && Object.keys(filters).length > 0) {
        doc.setFont(undefined, 'bold');
        doc.text('Applied Filters:', margin, yPosition);
        yPosition += 5;
        doc.setFont(undefined, 'normal');

        if (filters.searchText) {
          doc.text(`• Search: "${filters.searchText}"`, margin + 2, yPosition);
          yPosition += 4;
        }
        if (filters.pmtClass && filters.pmtClass !== 'ALL') {
          doc.text(`• Status: ${filters.pmtClass}`, margin + 2, yPosition);
          yPosition += 4;
        }
        yPosition += 3;
      }

      // Summary statistics
      if (households && households.length > 0) {
        const poorCount = households.filter((h) => h.pmtClass === 'POOR').length;
        const nonPoorCount = households.filter((h) => h.pmtClass === 'NON_POOR').length;
        const totalCount = households.length;

        doc.setFont(undefined, 'bold');
        doc.text('Summary Statistics:', margin, yPosition);
        yPosition += 5;
        doc.setFont(undefined, 'normal');

        doc.text(`• Total Households: ${totalCount}`, margin + 2, yPosition);
        yPosition += 4;
        doc.text(
          `• Poor Households: ${poorCount} (${((poorCount / totalCount) * 100).toFixed(2)}%)`,
          margin + 2,
          yPosition
        );
        yPosition += 4;
        doc.text(
          `• Non-Poor Households: ${nonPoorCount} (${((nonPoorCount / totalCount) * 100).toFixed(2)}%)`,
          margin + 2,
          yPosition
        );
        yPosition += 7;
      }

      // Table header
      const tableTop = yPosition;
      const columns = [
        { header: 'Group Code', width: 45 },
        { header: 'Head Name', width: 30 },
        { header: 'PMT Score', width: 20 },
        { header: 'Status', width: 25 },
        { header: '# Members', width: 18 },
        { header: 'Location', width: 32 },
      ];

      doc.setFont(undefined, 'bold');
      doc.setFillColor(245, 245, 245);
      let xPosition = margin;

      columns.forEach((col) => {
        doc.rect(xPosition, tableTop, col.width, 6, 'F');
        doc.text(col.header, xPosition + 1, tableTop + 4);
        xPosition += col.width;
      });

      yPosition = tableTop + 7;
      const rowHeight = 5;
      let pageNumber = 1;

      // Add data rows
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      households.forEach((household, index) => {
        // Check if we need a new page
        if (yPosition + rowHeight > pageHeight - 10) {
          pageNumber += 1;
          doc.addPage();
          yPosition = 10;

          // Repeat header on new page
          doc.setFont(undefined, 'bold');
          doc.setFillColor(245, 245, 245);
          let headerX = margin;
          columns.forEach((col) => {
            doc.rect(headerX, yPosition, col.width, 6, 'F');
            doc.text(col.header, headerX + 1, yPosition + 4);
            headerX += col.width;
          });
          yPosition += 7;
          doc.setFont(undefined, 'normal');
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          let rectX = margin;
          columns.forEach((col) => {
            doc.rect(rectX, yPosition, col.width, rowHeight, 'F');
            rectX += col.width;
          });
        }

        // Row data
        xPosition = margin;
        const rowData = [
          household.groupCode || '-',
          household.headName || '-',
          household.pmtScore !== undefined && household.pmtScore !== null
            ? household.pmtScore.toFixed(3)
            : '-',
          household.pmtClass || '-',
          household.numberOfMembers || '-',
          household.locationName || '-',
        ];

        rowData.forEach((data, colIndex) => {
          const col = columns[colIndex];
          // Truncate text if too long
          const truncated = doc.splitTextToSize(data.toString(), col.width - 2)[0];
          doc.text(truncated, xPosition + 1, yPosition + 3.5);
          xPosition += col.width;
        });

        yPosition += rowHeight;
      });

      // Footer
      yPosition += 5;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('End of Report', margin, yPosition);

      // Page numbers
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin - 20,
          pageHeight - 5
        );
      }

      // Download
      const fileName = `PMT_Results_${districtCode}_${formatDateForFilename(generatedDate)}.pdf`;
      doc.save(fileName);
    }).catch((error) => {
      console.error('Error loading PDF libraries:', error);
      alert('Failed to export PDF. Please ensure jsPDF and html2canvas are installed.');
    });
  } catch (error) {
    console.error('Error exporting PMT results:', error);
    alert('Failed to export results. Please try again.');
  }
}

/**
 * Format date for filename (YYYY-MM-DD_HHMM)
 */
function formatDateForFilename(date) {
  if (!date) return 'unknown';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}${minutes}`;
}

/**
 * Load logo image as data URL
 * Tries multiple paths to locate the logo
 */
async function loadLogoAsDataUrl() {
  const paths = [
    '/front/tasafMIS.png', // Production with /front base path
    '/tasafMIS.png', // Root deployment
  ];

  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            console.log('Logo successfully loaded from:', path);
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.warn(`Failed to load logo from ${path}:`, error);
      continue;
    }
  }

  console.warn('Logo not found at any expected path:', paths);
  return null;
}

/**
 * Export PMT enrollment list as PDF
 * @param {Object} config - Export configuration
 * @param {Array} config.households - Array of household objects
 * @param {Object} config.filters - Active filters
 * @param {string} config.districtCode - District code
 * @param {number} config.pmtCutoff - PMT cutoff used
 * @param {Date} config.generatedDate - Report generation date
 */
export async function exportPmtEnrollmentListAsPdf({
  households,
  filters,
  districtCode,
  pmtCutoff,
  generatedDate,
}) {
  try {
    console.log('Starting PDF export...');
    // Load logo first
    console.log('Loading logo...');
    const logoDataUrl = await loadLogoAsDataUrl();
    console.log('Logo loaded:', logoDataUrl ? 'Success' : 'Failed - will generate PDF without logo');

    // Dynamically import jsPDF
    const [jsPDFModule] = await Promise.all([
      import('jspdf'),
    ]);
    const { jsPDF } = jsPDFModule;

    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 0;
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;

    // Professional Header Section
    doc.setFillColor(0, 102, 102); // Dark teal background
    doc.rect(0, 0, pageWidth, 40, 'F'); // Increased height for logo

    // Add TASAF Logo on the right side
    if (logoDataUrl) {
      try {
        console.log('Adding logo to PDF...');
        const logoSize = 28;
        const logoX = pageWidth - margin - logoSize - 8; // More padding from right edge
        const logoY = 6;
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
        // Add circular border around logo
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 0.5);
        console.log('Logo added successfully to PDF');
      } catch (error) {
        console.error('Failed to add logo image to PDF:', error);
      }
    } else {
      console.log('Logo not available, skipping logo addition');
    }

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('PMT ENROLLMENT LIST REPORT', margin, 18);

    // Header Subtitle
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Proxy Means Test - Household Enrollment Report', margin, 26);

    // Decorative line under header
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.line(margin, 34, pageWidth - margin, 34);

    yPosition = 48;

    // Metadata Section with better formatting
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Create info boxes for metadata
    const metadataItems = [
      { label: 'Generated Date:', value: generatedDate?.toLocaleString() || 'N/A' },
      { label: 'District:', value: districtCode || 'N/A' },
      { label: 'PMT Cutoff:', value: pmtCutoff?.toFixed(2) || 'N/A' },
    ];

    const colWidth = (contentWidth - 6) / 3;
    let metaX = margin;

    metadataItems.forEach((item) => {
      // Light background for metadata boxes
      doc.setFillColor(240, 248, 248);
      doc.rect(metaX, yPosition, colWidth, 14, 'F');
      doc.setDrawColor(0, 102, 102);
      doc.rect(metaX, yPosition, colWidth, 14);

      // Label
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text(item.label, metaX + 2, yPosition + 5);

      // Value
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(item.value.toString(), metaX + 2, yPosition + 11);

      metaX += colWidth + 3;
    });

    yPosition += 20;

    // Summary Statistics Section
    if (households && households.length > 0) {
      const poorCount = households.filter((h) => h.pmtClass === 'POOR').length;
      const nonPoorCount = households.filter((h) => h.pmtClass === 'NON_POOR').length;
      const totalCount = households.length;

      // Summary background
      doc.setFillColor(230, 245, 245);
      doc.rect(margin, yPosition, contentWidth, 16, 'F');
      doc.setDrawColor(0, 102, 102);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, contentWidth, 16);

      // Summary title
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Summary Statistics', margin + 3, yPosition + 5);

      // Summary stats in one line
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      const summaryText = `Total Households: ${totalCount} | Poor: ${poorCount} (${((poorCount / totalCount) * 100).toFixed(1)}%) | Non-Poor: ${nonPoorCount} (${((nonPoorCount / totalCount) * 100).toFixed(1)}%)`;
      doc.text(summaryText, margin + 3, yPosition + 12);

      yPosition += 20;
    }

    // Table Section
    const tableTop = yPosition;
    const columns = [
      { header: 'Group Code', width: 50, align: 'left' },
      { header: 'Head Name', width: 45, align: 'left' },
      { header: 'Village', width: 40, align: 'left' },
      { header: 'PMT Score', width: 25, align: 'left' },
      { header: 'Status', width: 25, align: 'left' },
    ];

    // Table header background
    doc.setFillColor(0, 102, 102);
    doc.rect(margin, tableTop, contentWidth, 8, 'F');

    // Table header text
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    let xPosition = margin;

    columns.forEach((col) => {
      doc.text(col.header, xPosition + 1.5, tableTop + 5.5, { align: col.align });
      xPosition += col.width;
    });

    yPosition = tableTop + 9;
    const rowHeight = 6;

    // Add data rows
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8.5);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);

    households.forEach((household, index) => {
      // Check if we need a new page
      if (yPosition + rowHeight > pageHeight - 15) {
        // Footer on current page
        addFooter(doc, pageWidth, pageHeight);

        // New page
        doc.addPage();
        yPosition = 10;

        // Repeat header on new page
        doc.setFillColor(0, 102, 102);
        doc.rect(margin, yPosition, contentWidth, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        let headerX = margin;
        columns.forEach((col) => {
          doc.text(col.header, headerX + 1.5, yPosition + 5.5, { align: col.align });
          headerX += col.width;
        });
        yPosition += 10;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8.5);
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, yPosition, contentWidth, rowHeight, 'F');
      }

      // Draw row borders
      xPosition = margin;
      columns.forEach((col) => {
        doc.rect(xPosition, yPosition, col.width, rowHeight);
        xPosition += col.width;
      });

      // Row data
      xPosition = margin;
      const rowData = [
        household.groupCode || '-',
        household.headName || '-',
        household.locationName || '-',
        household.pmtScore !== undefined && household.pmtScore !== null
          ? household.pmtScore.toFixed(2)
          : '-',
        household.pmtClass || '-',
      ];

      rowData.forEach((data, colIndex) => {
        const col = columns[colIndex];
        doc.text(data.toString(), xPosition + 1.5, yPosition + 4, { align: col.align, maxWidth: col.width - 3 });
        xPosition += col.width;
      });

      yPosition += rowHeight;
    });

    // Footer on last page
    addFooter(doc, pageWidth, pageHeight);

    // Download
    const fileName = `PMT_Enrollment_${districtCode}_${formatDateForFilename(generatedDate)}.pdf`;
    doc.save(fileName);
    console.log('PDF saved successfully:', fileName);
  } catch (error) {
    console.error('Error exporting PMT enrollment list:', error);
    alert('Failed to export results. Please try again.');
  }
}

/**
 * Add footer to PDF page
 */
function addFooter(doc, pageWidth, pageHeight) {
  const pageCount = doc.internal.pages.length - 1;

  // Separator line
  doc.setDrawColor(0, 102, 102);
  doc.setLineWidth(0.5);
  doc.line(12, pageHeight - 10, pageWidth - 12, pageHeight - 10);

  // Footer text
  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);

  // Left: Report info
  doc.text('PMT Enrollment Report', 12, pageHeight - 5);

  // Right: Page numbers
  doc.text(
    `Page ${doc.internal.getNumberOfPages()} of ${pageCount}`,
    pageWidth - 35,
    pageHeight - 5,
    { align: 'right' }
  );
}

