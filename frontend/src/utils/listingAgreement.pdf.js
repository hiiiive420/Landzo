import sinhalaFontUrl from "@fontsource/noto-sans-sinhala/files/noto-sans-sinhala-sinhala-400-normal.woff2?url";
import tamilFontUrl from "@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-400-normal.woff2?url";

import {
  getListingAgreementClauses,
  LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT,
} from "./listingAgreement.template.js";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 1008;
const MARGIN = 40;
const getTextRuns = (text, baseFont, fonts) => {
  const runs = [];
  let currentText = "";
  let currentFont = baseFont;

  Array.from(String(text ?? "")).forEach((character) => {
    const nextFont = /[\u0d80-\u0dff]/u.test(character)
      ? fonts.sinhala
      : /[\u0b80-\u0bff]/u.test(character)
        ? fonts.tamil
        : baseFont;
    if (nextFont !== currentFont && currentText) {
      runs.push({ text: currentText, font: currentFont });
      currentText = "";
    }
    currentText += character;
    currentFont = nextFont;
  });

  if (currentText) {
    runs.push({ text: currentText, font: currentFont });
  }
  return runs;
};

const measureText = (text, baseFont, fonts, fontSize) =>
  getTextRuns(text, baseFont, fonts).reduce(
    (width, run) => width + run.font.widthOfTextAtSize(run.text, fontSize),
    0,
  );

const wrapText = (text, baseFont, fonts, fontSize, maxWidth) => {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;

    if (measureText(candidate, baseFont, fonts, fontSize) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) {
    lines.push(line);
  }

  return lines;
};

const drawText = (page, text, x, top, baseFont, fontSize, color, fonts) => {
  let nextX = x;
  const y = PAGE_HEIGHT - top - fontSize;
  getTextRuns(text, baseFont, fonts).forEach((run) => {
    page.drawText(run.text, {
      x: nextX,
      y,
      font: run.font,
      size: fontSize,
      color,
    });
    nextX += run.font.widthOfTextAtSize(run.text, fontSize);
  });
};

const drawWrapped = (page, text, x, top, width, font, fontSize, color, fonts, lineHeight = 11) => {
  const lines = wrapText(text, font, fonts, fontSize, width);
  lines.forEach((line, index) => {
    drawText(page, line, x, top + index * lineHeight, font, fontSize, color, fonts);
  });
  return top + lines.length * lineHeight;
};

const drawHeader = (page, agreement, pageNumber, fonts, colors) => {
  drawText(page, "LANDZO", MARGIN, 28, fonts.bold, 17, colors.GREEN, fonts);
  drawText(page, agreement.serialNumber, PAGE_WIDTH - MARGIN - 155, 32, fonts.bold, 8, colors.MUTED, fonts);
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 56 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 56 },
    thickness: 1.2,
    color: colors.GOLD,
  });
  drawText(page, "EXCLUSIVE SELLER LISTING AGREEMENT", MARGIN, 70, fonts.bold, 14, colors.GREEN, fonts);
  drawText(page, "Draft for review - seek independent Sri Lankan legal advice before signing.", MARGIN, 90, fonts.regular, 8, colors.MUTED, fonts);
  page.drawLine({
    start: { x: MARGIN, y: 32 },
    end: { x: PAGE_WIDTH - MARGIN, y: 32 },
    thickness: 0.6,
    color: colors.GOLD,
  });
  drawText(page, `${agreement.serialNumber}  |  Page ${pageNumber} of 2`, MARGIN, 965, fonts.regular, 7, colors.MUTED, fonts);
};

const drawField = (page, label, value, x, top, width, fonts, colors, height = 32) => {
  page.drawRectangle({
    x,
    y: PAGE_HEIGHT - top - height,
    width,
    height,
    color: colors.WHITE,
    borderColor: colors.BORDER,
    borderWidth: 0.6,
  });
  drawText(page, label.toUpperCase(), x + 8, top + 5, fonts.bold, 6.4, colors.MUTED, fonts);
  drawWrapped(page, value || "-", x + 8, top + 15, width - 16, fonts.regular, 8, colors.DARK, fonts, 9.5);
};

const drawSectionTitle = (page, title, top, fonts, colors) => {
  drawText(page, title.toUpperCase(), MARGIN, top, fonts.bold, 8, colors.GREEN, fonts);
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - top - 12 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - top - 12 },
    thickness: 0.5,
    color: colors.GOLD,
  });
};

const drawClause = (page, clause, index, top, fonts, colors) => {
  drawText(page, `${index + 1}. ${clause.heading}`, MARGIN, top, fonts.bold, 8.3, colors.GREEN, fonts);
  return drawWrapped(
    page,
    clause.text,
    MARGIN + 15,
    top + 12,
    PAGE_WIDTH - MARGIN * 2 - 15,
    fonts.regular,
    7.7,
    colors.DARK,
    fonts,
    9.2,
  ) + 6;
};

const drawSignatureBlock = (page, title, details, x, top, width, fonts, colors) => {
  const height = 132;
  page.drawRectangle({
    x,
    y: PAGE_HEIGHT - top - height,
    width,
    height,
    color: colors.WHITE,
    borderColor: colors.BORDER,
    borderWidth: 0.8,
  });
  drawText(page, title, x + 10, top + 9, fonts.bold, 8, colors.GREEN, fonts);
  drawText(page, "Signature", x + 10, top + 62, fonts.regular, 7, colors.MUTED, fonts);
  page.drawLine({
    start: { x: x + 48, y: PAGE_HEIGHT - top - 74 },
    end: { x: x + width - 10, y: PAGE_HEIGHT - top - 74 },
    thickness: 0.6,
    color: colors.MUTED,
  });
  drawText(page, details, x + 10, top + 83, fonts.regular, 6.5, colors.MUTED, fonts);
  drawText(page, "Date: ____________________", x + 10, top + 108, fonts.regular, 6.5, colors.MUTED, fonts);
};

const drawPageOne = (page, agreement, clauses, fonts, colors) => {
  drawHeader(page, agreement, 1, fonts, colors);
  const columnGap = 8;
  const columnWidth = (PAGE_WIDTH - MARGIN * 2 - columnGap) / 2;

  drawSectionTitle(page, "Agreement details", 116, fonts, colors);
  drawField(page, "Agreement date", agreement.agreementDate, MARGIN, 134, columnWidth, fonts, colors);
  drawField(page, "Commencement", agreement.commencementDate, MARGIN + columnWidth + columnGap, 134, columnWidth, fonts, colors);
  drawField(page, "Expiry", agreement.expiryDate, MARGIN, 170, columnWidth, fonts, colors);
  drawField(page, "Exclusive term", `${agreement.exclusivePeriodDays} days`, MARGIN + columnWidth + columnGap, 170, columnWidth, fonts, colors);

  drawSectionTitle(page, "Seller information", 218, fonts, colors);
  drawField(page, "Seller 1 / full legal name", agreement.seller1.fullName, MARGIN, 236, columnWidth, fonts, colors);
  drawField(page, "NIC / passport", agreement.seller1.identificationNumber, MARGIN + columnWidth + columnGap, 236, columnWidth, fonts, colors);
  drawField(page, "Address", agreement.seller1.address, MARGIN, 272, columnWidth, fonts, colors);
  drawField(page, "Phone / mobile", [agreement.seller1.phone, agreement.seller1.mobilePhone].filter(Boolean).join(" / "), MARGIN + columnWidth + columnGap, 272, columnWidth, fonts, colors);
  drawField(page, "Seller 2 / full legal name (if applicable)", agreement.seller2?.fullName, MARGIN, 308, columnWidth, fonts, colors);
  drawField(page, "NIC / passport", agreement.seller2?.identificationNumber, MARGIN + columnWidth + columnGap, 308, columnWidth, fonts, colors);

  drawSectionTitle(page, "Property and commercial terms", 356, fonts, colors);
  drawField(page, "Property", `${agreement.propertyInformation} (${agreement.propertyCode})`, MARGIN, 374, columnWidth, fonts, colors, 42);
  drawField(page, "Property address", agreement.propertyAddress, MARGIN + columnWidth + columnGap, 374, columnWidth, fonts, colors, 42);
  drawField(page, "Deed number", agreement.deedNumber, MARGIN, 420, columnWidth, fonts, colors);
  drawField(page, "Judicial zone", agreement.judicialZone, MARGIN + columnWidth + columnGap, 420, columnWidth, fonts, colors);
  drawField(page, "Minimum selling price", `${agreement.currency} ${Number(agreement.minimumSellingPrice).toLocaleString("en-US")}`, MARGIN, 456, columnWidth, fonts, colors);
  drawField(page, "Commission", `${agreement.commissionPercentage}%`, MARGIN + columnWidth + columnGap, 456, columnWidth, fonts, colors);
  if (agreement.totalValuation) {
    drawText(page, `Optional total valuation: ${agreement.currency} ${Number(agreement.totalValuation).toLocaleString("en-US")}`, MARGIN, 495, fonts.regular, 7.5, colors.MUTED, fonts);
  }

  drawSectionTitle(page, "Terms and conditions", 512, fonts, colors);
  let top = 530;
  clauses.slice(0, LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT).forEach((clause, index) => {
    top = drawClause(page, clause, index, top, fonts, colors);
  });
};

const drawPageTwo = (page, agreement, clauses, fonts, colors) => {
  drawHeader(page, agreement, 2, fonts, colors);
  drawSectionTitle(page, "Terms and conditions (continued)", 116, fonts, colors);
  let top = 136;
  clauses.slice(LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT).forEach((clause, index) => {
    top = drawClause(page, clause, index + LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT, top, fonts, colors);
  });

  const signaturesTop = Math.max(top + 12, 570);
  drawSectionTitle(page, "Acknowledgement and signatures", signaturesTop, fonts, colors);
  drawWrapped(
    page,
    "The parties confirm that they have read and understood this agreement and sign it voluntarily. Each party should retain a signed copy.",
    MARGIN,
    signaturesTop + 18,
    PAGE_WIDTH - MARGIN * 2,
    fonts.regular,
    7.5,
    colors.MUTED,
    fonts,
    9.5,
  );
  const blockTop = signaturesTop + 46;
  const gap = 12;
  const blockWidth = (PAGE_WIDTH - MARGIN * 2 - gap) / 2;
  drawSignatureBlock(page, "SELLER 1", "Print name: ____________________", MARGIN, blockTop, blockWidth, fonts, colors);
  drawSignatureBlock(page, "SELLER 2 (IF APPLICABLE)", "Print name: ____________________", MARGIN + blockWidth + gap, blockTop, blockWidth, fonts, colors);
  drawSignatureBlock(page, "LANDZO AUTHORIZED REPRESENTATIVE", "Name / position: _______________", MARGIN, blockTop + 144, blockWidth, fonts, colors);
  drawSignatureBlock(page, "WITNESS / ATTORNEY / NOTARY", "Name / NIC / registration: _______", MARGIN + blockWidth + gap, blockTop + 144, blockWidth, fonts, colors);
};

export const createListingAgreementPdf = async (agreement) => {
  await import("regenerator-runtime/runtime");
  const [{ PDFDocument, StandardFonts, rgb }, fontkitModule] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkitModule.default);
  pdf.setTitle(`LANDZO Listing Agreement ${agreement.serialNumber}`);
  pdf.setSubject(`Exclusive seller listing agreement for ${agreement.propertyCode}`);
  pdf.setAuthor("LANDZO");
  pdf.setProducer("LANDZO Admin");
  const [sinhalaResponse, tamilResponse] = await Promise.all([
    fetch(sinhalaFontUrl),
    fetch(tamilFontUrl),
  ]);
  if (!sinhalaResponse.ok || !tamilResponse.ok) {
    throw new Error("The agreement fonts could not be loaded.");
  }
  const [sinhalaBytes, tamilBytes] = await Promise.all([
    sinhalaResponse.arrayBuffer(),
    tamilResponse.arrayBuffer(),
  ]);
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    sinhala: await pdf.embedFont(sinhalaBytes, { subset: true }),
    tamil: await pdf.embedFont(tamilBytes, { subset: true }),
  };
  const colors = {
    GREEN: rgb(0.09, 0.19, 0.15),
    DARK: rgb(0.13, 0.17, 0.15),
    MUTED: rgb(0.37, 0.41, 0.38),
    GOLD: rgb(0.76, 0.61, 0.32),
    WHITE: rgb(1, 1, 1),
    BORDER: rgb(0.86, 0.84, 0.77),
  };
  const clauses = getListingAgreementClauses(agreement);
  const firstPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageOne(firstPage, agreement, clauses, fonts, colors);
  const secondPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawPageTwo(secondPage, agreement, clauses, fonts, colors);

  return pdf.save();
};

export const downloadListingAgreementPdf = async (agreement) => {
  const bytes = await createListingAgreementPdf(agreement);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${agreement.serialNumber}-${agreement.propertyCode}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
