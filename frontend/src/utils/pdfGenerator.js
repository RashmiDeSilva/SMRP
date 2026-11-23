import { jsPDF } from 'jspdf';
import { Platform } from 'react-native';

/**
 * Generates an official, 100% valid PDF document for Boarding Rental Agreements.
 * @param {Object} boardingData - Details of the boarding place
 * @returns {Object} { pdfDataUri, fileName, downloadPdf }
 */
export function generateRealContractPdf(boardingData) {
  const title = boardingData.boardingName || 'Boarding Place';
  const location = boardingData.location || 'Colombo, Sri Lanka';
  const priceNum = parseInt(boardingData.pricePerMonth || 0, 10);
  const priceStr = priceNum ? priceNum.toLocaleString() : '15,000';
  const bedsPerRoom = boardingData.bedsPerRoom || 'One Room per Bed (1 Bed/Room)';
  const contact = boardingData.contactNumber || '077 123 4567';
  const rules = boardingData.rules || '• Quiet hours between 10:00 PM and 6:00 AM.\n• Keep common areas, kitchen, and bathroom clean.\n• Switch off lights, fans, and AC when leaving rooms.';
  const totalRooms = boardingData.totalRooms || '1';
  const totalBeds = boardingData.totalBeds || '1';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Rental_Agreement.pdf`;

  // Create jsPDF document instance (A4 size, mm units)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // ── Header Banner ──────────────────────────────────────
  doc.setFillColor(109, 40, 217); // Purple (#6D28D9)
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('OFFICIAL BOARDING RENTAL AGREEMENT', 105, 15, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`SMRP NESTORA PLATFORM • ISSUED ON ${dateStr.toUpperCase()}`, 105, 24, { align: 'center' });

  let y = 45;

  // ── Section 1: Property & Owner Details ────────────────
  doc.setTextColor(15, 23, 42); // Dark slate
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. PROPERTY & OWNER SPECIFICATIONS', 15, y);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(15, y + 2, 195, y + 2);
  y += 10;

  doc.setFontSize(10);
  
  // Grid Box 1: Property Name
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 86, 16, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('BOARDING PROPERTY NAME', 18, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title.substring(0, 32), 18, y + 12);

  // Grid Box 2: Location
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(109, y, 86, 16, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('LOCATION / ADDRESS', 112, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(location.substring(0, 32), 112, y + 12);

  y += 20;

  // Grid Box 3: Contact Number
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 86, 16, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CONTACT PHONE NUMBER', 18, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(contact, 18, y + 12);

  // Grid Box 4: Room Configuration
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(109, y, 86, 16, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ROOM CONFIGURATION', 112, y + 5);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(bedsPerRoom.substring(0, 32), 112, y + 12);

  y += 26;

  // ── Section 2: Financial & Tenancy Terms ──────────────
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. FINANCIAL & TENANCY TERMS', 15, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  // Grid Box 5: Rent per Month
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 86, 14, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('MONTHLY RENT (PER BED)', 18, y + 4.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(109, 40, 217);
  doc.text(`Rs. ${priceStr} / month`, 18, y + 10.5);

  // Grid Box 6: Key Money (1 Month Deposit)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(109, y, 86, 14, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('KEY MONEY (SECURITY DEPOSIT)', 112, y + 4.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${priceStr} (1 Month Rent)`, 112, y + 10.5);

  y += 18;

  // Grid Box 7: Full 1st Month Move-In (Double Payment)
  doc.setFillColor(245, 243, 255);
  doc.setDrawColor(192, 132, 252);
  doc.roundedRect(15, y, 86, 14, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(109, 40, 217);
  doc.text('1ST MONTH MOVE-IN (DOUBLE PAYMENT)', 18, y + 4.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(109, 40, 217);
  doc.text(`Rs. ${(priceNum * 2 || 30000).toLocaleString()} (Rent + Key Money)`, 18, y + 10.5);

  // Grid Box 8: Notice Period
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(109, y, 86, 14, 2, 2, 'FD');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('MOVE-OUT NOTICE PERIOD', 112, y + 4.5);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2 Months (60 Days Written Notice)', 112, y + 10.5);

  y += 20;

  // ── Section 3: Boarding Agreement & Key Money Rules ───
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. BOARDING AGREEMENT & KEY MONEY RULES (MANDATORY TERMS)', 15, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  const keyMoneyRules = [
    {
      title: '1. 1st Month Double Payment (Key Money)',
      desc: `Upon move-in, the 1st month payment includes 1 month rent (Rs. ${priceStr}) + 1 month Key Money security deposit (Rs. ${priceStr}) = Full Move-In Payment: Rs. ${(priceNum * 2 || 30000).toLocaleString()}.`
    },
    {
      title: '2. 2-Month Move-Out Notice Required',
      desc: 'The tenant must inform the boarding owner at least 2 full months (60 days) in advance before vacating or leaving the boarding place.'
    },
    {
      title: '3. 1-Year Minimum Stay Requirement',
      desc: 'Key money benefits, deposit rollover, and final-month rent coverage are valid strictly if the tenant completes a minimum stay of 1 year (12 months).'
    },
    {
      title: '4. Last Month Rent Free (After Completing 1 Year)',
      desc: 'When the tenant completes a full 1-year stay, no rental fee is required for the final month as it is covered by the initial key money deposit.'
    },
    {
      title: '5. Early Departure Policy (Under 1 Year)',
      desc: 'If the tenant departs or leaves the boarding place before completing 1 full year, the key money deposit cannot be refunded, returned, or credited.'
    }
  ];

  doc.setFillColor(254, 252, 232); // Warm light amber (#FEFCE8)
  doc.setDrawColor(250, 204, 21);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, y, 180, 56, 2, 2, 'FD');

  let ruleY = y + 5;
  keyMoneyRules.forEach((rule) => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(113, 63, 18); // Dark amber/brown
    doc.text(rule.title, 18, ruleY);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(68, 64, 60);
    const splitDesc = doc.splitTextToSize(rule.desc, 172);
    doc.text(splitDesc, 18, ruleY + 4);
    ruleY += 10;
  });

  y += 62;

  // ── Section 4: House Rules ─────────────────────────────
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('4. HOUSE RULES & REGULATIONS', 15, y);
  doc.line(15, y + 2, 195, y + 2);
  y += 8;

  doc.setFillColor(243, 232, 255); // Light purple (#F3E8FF)
  doc.setDrawColor(109, 40, 217);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, y, 180, 24, 2, 2, 'FD');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(76, 29, 149);

  const splitRules = doc.splitTextToSize(rules, 172);
  doc.text(splitRules, 18, y + 5.5);

  y += 32;

  // ── Section 5: Signatures ──────────────────────────────
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  
  // Owner Signature Line
  doc.line(20, y + 8, 85, y + 8);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('BOARDING OWNER SIGNATURE', 52.5, y + 13, { align: 'center' });

  // Tenant Signature Line
  doc.line(125, y + 8, 190, y + 8);
  doc.text('TENANT / STUDENT SIGNATURE', 157.5, y + 13, { align: 'center' });

  // ── Footer ─────────────────────────────────────────────
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This document is an officially generated boarding rental agreement powered by SMRP Nestora.', 105, 290, { align: 'center' });

  // Output as Data URI string (100% valid PDF 1.4 binary stream)
  const pdfDataUri = doc.output('datauristring');

  const downloadPdf = () => {
    try {
      if (Platform.OS === 'web') {
        doc.save(fileName);
      } else {
        doc.save(fileName);
      }
    } catch (e) {
      console.log('PDF Download error:', e);
    }
  };

  return {
    doc,
    pdfDataUri,
    fileName,
    downloadPdf,
  };
}
