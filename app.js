const form = document.querySelector('#biodata-form');
const message = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-button');
const photoInput = document.querySelector('#candidate-photo');
const photoPreview = document.querySelector('#photo-preview');
const submissionDialog = document.querySelector('#submission-dialog');
const submissionMessage = document.querySelector('#submission-message');
const downloadPdfLink = document.querySelector('#download-pdf-link');
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw_ByR1ZQNm6epQJO_il60VSCJ0ZjGBhW6gczq4KwqPudp_KJg74T7knkWrYwi5lbYw/exec';
let applicantPhoto = null;
let activePdfUrl = '';
const fields = [
  ['unit_name', 'Name of the Unit'],
  ['name', 'Name'],
  ['father_husband_name', "Father's / Husband's Name"],
  ['dob_age', 'DOB / Age'],
  ['blood_group', 'Blood Group'],
  ['education', 'Education / Technical Qualification'],
  ['previous_employment', 'Previous post, organization & phone number'],
  ['phone', 'Phone No.'],
  ['marital_status', 'Marital Status'],
  ['permanent_address', 'Permanent Address'],
  ['permanent_phone', 'Permanent Phone No.'],
  ['permanent_police_station', 'Permanent Police Station'],
  ['present_address', 'Present Address'],
  ['present_phone', 'Present Phone No.'],
  ['present_police_station', 'Present Police Station'],
  ['vaccination_details', 'Vaccination Details'],
  ['aadhaar_original', 'Aadhaar Card - Original'],
  ['aadhaar_photocopy', 'Aadhaar Card - Photo copy'],
  ['aadhaar_remarks', 'Aadhaar Card - Remarks'],
  ['current_address_proof_original', 'Current Address Proof - Original'],
  ['current_address_proof_photocopy', 'Current Address Proof - Photo copy'],
  ['current_address_proof_remarks', 'Current Address Proof - Remarks'],
  ['esi_no_original', 'ESI No. - Original'],
  ['esi_no_photocopy', 'ESI No. - Photo copy'],
  ['esi_no_remarks', 'ESI No. - Remarks'],
  ['pf_no_original', 'PF No. - Original'],
  ['pf_no_photocopy', 'PF No. - Photo copy'],
  ['pf_no_remarks', 'PF No. - Remarks'],
  ['bank_account_details_original', 'Bank Account Details - Original'],
  ['bank_account_details_photocopy', 'Bank Account Details - Photo copy'],
  ['bank_account_details_remarks', 'Bank Account Details - Remarks'],
  ['educational_certificates_original', 'Educational Certificates - Original'],
  ['educational_certificates_photocopy', 'Educational Certificates - Photo copy'],
  ['educational_certificates_remarks', 'Educational Certificates - Remarks'],
  ['declaration', 'Declaration'],
  ['signature', 'Employee Signature / Thumb Print'],
  ['doj', 'Date of Joining'],
  ['operations_officer', 'Name of the Operations Officer'],
  ['operations_date', 'Operations Date'],
];

function showMessage(text, success) {
  message.textContent = text;
  message.className = `form-message ${success ? 'success' : 'error'}`;
  message.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.querySelector('#close-submission-dialog').addEventListener('click', () => {
  submissionDialog.close();
  if (activePdfUrl) {
    window.setTimeout(() => {
      URL.revokeObjectURL(activePdfUrl);
      activePdfUrl = '';
    }, 60000);
  }
});

photoInput.addEventListener('change', async () => {
  const file = photoInput.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    photoInput.value = '';
    applicantPhoto = null;
    photoPreview.innerHTML = '<span>No photo selected</span>';
    showMessage('Choose a JPG or PNG image.', false);
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    photoInput.value = '';
    applicantPhoto = null;
    photoPreview.innerHTML = '<span>No photo selected</span>';
    showMessage('Choose a photo smaller than 8 MB.', false);
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = imageUrl;
    });
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpegData = canvas.toDataURL('image/jpeg', 0.88);
    const base64 = jpegData.slice(jpegData.indexOf(',') + 1);
    const jpegBytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    applicantPhoto = { jpegBytes, width: canvas.width, height: canvas.height };
    photoPreview.replaceChildren(Object.assign(document.createElement('img'), {
      src: jpegData,
      alt: 'Selected candidate photo',
    }));
  } catch (_error) {
    applicantPhoto = null;
    photoInput.value = '';
    photoPreview.innerHTML = '<span>No photo selected</span>';
    showMessage('The selected photo could not be opened. Please choose another image.', false);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
});

function collectPayload() {
  const payload = Object.fromEntries(new FormData(form).entries());
  for (const input of form.querySelectorAll('input[type="checkbox"]')) {
    payload[input.name] = input.checked ? (input.value === 'on' ? 'Yes' : input.value) : 'No';
  }
  const submittedAt = new Date();
  payload.submitted_at = submittedAt.toISOString();
  payload.submission_date = submittedAt.toLocaleDateString('en-CA');
  return payload;
}

function createPdf(payload, photo = null) {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 50;
  const right = 545;
  const contentWidth = right - left;
  const gap = 12;
  const columnWidth = (contentWidth - gap * 3) / 4;
  const pages = [[], []];
  let commands = pages[0];

  function addText(text, x, baseline, font = 'F1', size = 9, color = '0 0 0') {
    const ascii = String(text).normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
    const escaped = ascii.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
    commands.push(`${color} rg BT /${font} ${size} Tf ${x} ${baseline} Td (${escaped}) Tj ET`);
  }

  function line(x1, y1, x2, y2, color = '0.85 0.88 0.85', width = 0.6) {
    commands.push(`${color} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  function rectangle(x, y, width, height, stroke = '0.78 0.82 0.79', fill = null) {
    if (fill) commands.push(`${fill} rg ${x} ${y} ${width} ${height} re f`);
    commands.push(`${stroke} RG 0.6 w ${x} ${y} ${width} ${height} re S`);
  }

  function sectionHeading(page, number, title, subtitle, y) {
    commands = pages[page];
    addText(number, left, y, 'F2', 11, '1 0.46 0.36');
    addText(title, left + 27, y, 'F2', 15, '0.09 0.14 0.12');
    addText(subtitle, left + 27, y - 15, 'F1', 8, '0.39 0.44 0.42');
    line(left, y - 27, right, y - 27, '0.85 0.88 0.85');
  }

  function documentHeader(page, firstPage = false) {
    commands = pages[page];
    addText('AMAZE PROPERTY MANAGEMENT SOLUTIONS PVT. LTD.', left, 812, 'F2', 8, '0.06 0.42 0.33');
    addText('On-site recruitment sheet', left, 787, 'F2', 19, '0.09 0.14 0.12');
    if (firstPage) {
      addText('CANDIDATE INTAKE / 01', left, 764, 'F2', 7, '1 0.46 0.36');
      addText('Build your profile once.', left, 744, 'F2', 12, '0.09 0.14 0.12');
      addText("We'll take it from here.", left, 728, 'F2', 12, '0.06 0.42 0.33');
    } else {
      line(left, 773, right, 773, '0.85 0.88 0.85');
    }
  }

  function fieldBox(x, top, width, key, label, height = 43, multiline = false) {
    const bottom = top - height;
    const labelLines = wrapText(label, Math.max(12, Math.floor((width - 4) / 4.3))).slice(0, 2);
    labelLines.forEach((labelLine, index) => {
      addText(labelLine, x, top - 10 - index * 9, 'F2', 7.2, '0.23 0.29 0.26');
    });
    line(x, bottom, x + width, bottom, '0.72 0.77 0.73');
    const value = String(payload[key] || '-').replaceAll('\r', ' ').replaceAll('\t', ' ');
    const valueFontSize = width < 140 ? 7.5 : 9;
    const charsPerLine = Math.max(12, Math.floor((width - 10) / (valueFontSize * 0.52)));
    const valueLines = value.split('\n').flatMap((part) => wrapText(part, charsPerLine));
    const maxLines = multiline ? Math.max(1, Math.floor((height - 18) / 11)) : 2;
    const valueTop = labelLines.length > 1 ? top - 29 : top - 25;
    valueLines.slice(0, maxLines).forEach((valueLine, index) => {
      addText(valueLine, x + 3, valueTop - index * 10, 'F1', valueFontSize, '0.09 0.14 0.12');
    });
    return bottom;
  }

  function spanWidth(columns) {
    return columnWidth * columns + gap * (columns - 1);
  }

  function columnX(column) {
    return left + column * (columnWidth + gap);
  }

  function drawCertificateTable() {
    const top = 600;
    const headerHeight = 24;
    const rowHeight = 37;
    const widths = [212, 72, 82, contentWidth - 366];
    const xPositions = [left, left + widths[0], left + widths[0] + widths[1], left + widths[0] + widths[1] + widths[2]];
    rectangle(left, top - headerHeight, contentWidth, headerHeight, '0.09 0.14 0.12', '0.09 0.14 0.12');
    ['Certificate', 'Original', 'Photo copy', 'Remarks'].forEach((heading, index) => {
      addText(heading, xPositions[index] + 8, top - 15, 'F2', 7.5, '1 1 1');
    });
    const certificates = [
      ['Aadhaar Card', 'aadhaar_original', 'aadhaar_photocopy', 'aadhaar_remarks'],
      ['Current Address Proof', 'current_address_proof_original', 'current_address_proof_photocopy', 'current_address_proof_remarks'],
      ['ESI No. (Back Office Responsibility)', 'esi_no_original', 'esi_no_photocopy', 'esi_no_remarks'],
      ['PF No. (Back Office Responsibility)', 'pf_no_original', 'pf_no_photocopy', 'pf_no_remarks'],
      ['Bank Account Details', 'bank_account_details_original', 'bank_account_details_photocopy', 'bank_account_details_remarks'],
      ['Educational Certificates', 'educational_certificates_original', 'educational_certificates_photocopy', 'educational_certificates_remarks'],
    ];
    certificates.forEach((certificate, rowIndex) => {
      const rowTop = top - headerHeight - rowIndex * rowHeight;
      const rowBottom = rowTop - rowHeight;
      rectangle(left, rowBottom, contentWidth, rowHeight, '0.85 0.88 0.85', rowIndex % 2 ? '1 1 1' : '0.98 0.98 0.96');
      addText(certificate[0], left + 8, rowTop - 22, 'F1', 7.3, '0.09 0.14 0.12');
      for (let checkIndex = 0; checkIndex < 2; checkIndex += 1) {
        const checkX = xPositions[checkIndex + 1] + 9;
        const checkY = rowTop - 22;
        rectangle(checkX, checkY - 3, 8, 8, '0.48 0.54 0.5');
        if (payload[certificate[checkIndex + 1]] === 'Yes') {
          commands.push(`0.06 0.42 0.33 RG 1.3 w ${checkX + 1} ${checkY} m ${checkX + 3} ${checkY - 2} l ${checkX + 7} ${checkY + 4} l S`);
        }
        addText('Yes', checkX + 13, checkY, 'F1', 7, '0.39 0.44 0.42');
      }
      const remark = String(payload[certificate[3]] || '');
      if (remark) {
        wrapText(remark, 22).slice(0, 2).forEach((remarkLine, lineIndex) => {
          addText(remarkLine, xPositions[3] + 7, rowTop - 16 - lineIndex * 10, 'F1', 7, '0.09 0.14 0.12');
        });
      }
    });
  }

  documentHeader(0, true);
  sectionHeading(0, '01', 'Identity & role', 'Start with the details we use to identify your application.', 700);
  if (photo) {
    const boxWidth = 62;
    const boxHeight = 78;
    const scale = Math.min(boxWidth / photo.width, boxHeight / photo.height);
    const width = photo.width * scale;
    const height = photo.height * scale;
    commands.push(`q ${width} 0 0 ${height} ${right - width} 610 cm /Im1 Do Q`);
  }
  const twoColumns = spanWidth(2);
  fieldBox(left, 590, twoColumns, 'unit_name', 'Name of the Unit *');
  fieldBox(left + twoColumns + gap, 590, twoColumns, 'name', 'Name *');
  fieldBox(left, 538, twoColumns, "father_husband_name", "Father's / Husband's Name *");
  fieldBox(columnX(2), 538, columnWidth, 'dob_age', 'DOB / Age *');
  fieldBox(columnX(3), 538, columnWidth, 'blood_group', 'Blood Group');
  fieldBox(left, 486, twoColumns, 'education', 'Education / Technical Qualification *');
  fieldBox(left + twoColumns + gap, 486, twoColumns, 'previous_employment', 'Previous post, organization & phone number');
  fieldBox(left, 434, columnWidth, 'phone', 'Phone No. *');
  fieldBox(columnX(1), 434, columnWidth, 'marital_status', 'Marital Status *');

  sectionHeading(0, '02', 'Addresses & verification', 'Complete address details for the field team to verify.', 372);
  addText('Permanent address', left, 340, 'F2', 9, '0.06 0.42 0.33');
  fieldBox(left, 329, twoColumns, 'permanent_address', 'Permanent Address *', 59, true);
  fieldBox(columnX(2), 329, columnWidth, 'permanent_phone', 'Phone No. *');
  fieldBox(columnX(3), 329, columnWidth, 'permanent_police_station', 'Police Station *');
  addText('Present address with door no.', left, 252, 'F2', 9, '0.06 0.42 0.33');
  fieldBox(left, 241, twoColumns, 'present_address', 'Present Address *', 59, true);
  fieldBox(columnX(2), 241, columnWidth, 'present_phone', 'Phone No. *');
  fieldBox(columnX(3), 241, columnWidth, 'present_police_station', 'Police Station *');

  commands = pages[1];
  documentHeader(1);
  sectionHeading(1, '03', 'Health & certificates', 'Mark the documents you can submit with your application.', 738);
  fieldBox(left, 680, contentWidth, 'vaccination_details', 'Are you vaccinated? If so, furnish details *', 52, true);
  drawCertificateTable();

  sectionHeading(1, '04', 'Declaration & handover', 'Confirm the information and tell us when the role begins.', 320);
  rectangle(left, 266, 10, 10, '0.48 0.54 0.5');
  if (payload.declaration && payload.declaration !== 'No') {
    commands.push(`0.06 0.42 0.33 RG 1.3 w ${left + 1} 271 m ${left + 4} 268 l ${left + 9} 275 l S`);
  }
  addText('I declare that the information furnished by me is true and correct to the best of my knowledge.', left + 18, 271, 'F1', 8, '0.27 0.32 0.29');
  fieldBox(left, 242, columnWidth, 'signature', 'Signature / Thumb Print of Employee *', 44);
  fieldBox(columnX(1), 242, columnWidth, 'doj', 'DOJ *', 44);
  fieldBox(columnX(2), 242, columnWidth, 'operations_officer', 'Name of the Operations Officer *', 44);
  fieldBox(columnX(3), 242, columnWidth, 'operations_date', 'Date *', 44);

  pages.forEach((page, index) => {
    commands = page;
    addText(`Amaze Property Management Solutions Pvt. Ltd.  ·  ${index + 1} / ${pages.length}`, left, 26, 'F1', 7, '0.39 0.44 0.42');
  });

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  const pageReferences = [];
  const imageObject = photo ? 5 : null;
  if (photo) {
    objects.push(joinBytes(
      encodeText(`<< /Type /XObject /Subtype /Image /Width ${photo.width} /Height ${photo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${photo.jpegBytes.length} >>\nstream\n`),
      photo.jpegBytes,
      encodeText('\nendstream'),
    ));
  }
  pages.forEach((page, index) => {
    const content = page.join('\n');
    const pageObject = 5 + (photo ? 1 : 0) + index * 2;
    const contentObject = pageObject + 1;
    pageReferences.push(`${pageObject} 0 R`);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> ` +
      `${index === 0 && photo ? `/XObject << /Im1 ${imageObject} 0 R >> ` : ''}>> ` +
      `/Contents ${contentObject} 0 R >>`,
      joinBytes(
        encodeText(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n`),
        encodeText(content),
        encodeText('\nendstream'),
      ),
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${pageReferences.join(' ')}] /Count ${pages.length} >>`;
  return assemblePdf(objects);
}

function joinBytes(...parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}

function encodeText(text) {
  return new TextEncoder().encode(text);
}

function assemblePdf(objects) {
  const chunks = [encodeText('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n')];
  let length = chunks[0].length;
  const offsets = [0];
  objects.forEach((object, index) => {
    const prefix = encodeText(`${index + 1} 0 obj\n`);
    const body = typeof object === 'string' ? encodeText(object) : object;
    const suffix = encodeText('\nendobj\n');
    offsets.push(length);
    chunks.push(prefix, body, suffix);
    length += prefix.length + body.length + suffix.length;
  });
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(encodeText(xref));
  return new Blob(chunks, { type: 'application/pdf' });
}

function wrapText(text, width) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const originalWord of words) {
    let word = originalWord;
    while (word.length > width) {
      if (line) {
        lines.push(line);
        line = '';
      }
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (line && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function downloadPdf(payload, photo) {
  if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
  activePdfUrl = URL.createObjectURL(createPdf(payload, photo));
  const filename = payload.name.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'candidate';
  downloadPdfLink.href = activePdfUrl;
  downloadPdfLink.download = `biodata-${filename}.pdf`;
}

function sendToSpreadsheet(payload) {
  const requestId = crypto.randomUUID();
  const iframe = document.createElement('iframe');
  const formElement = document.createElement('form');

  iframe.name = `biodata-sheet-${requestId}`;
  iframe.title = 'Spreadsheet submission';
  iframe.hidden = true;
  formElement.method = 'POST';
  formElement.action = APPS_SCRIPT_URL;
  formElement.target = iframe.name;
  formElement.hidden = true;
  const dataInput = document.createElement('input');
  dataInput.type = 'hidden';
  dataInput.name = 'payload';
  dataInput.value = JSON.stringify(payload);
  const requestInput = document.createElement('input');
  requestInput.type = 'hidden';
  requestInput.name = 'requestId';
  requestInput.value = requestId;
  formElement.append(dataInput, requestInput);

  let iframeLoaded = false;
  const cleanup = () => {
    iframe.remove();
    formElement.remove();
  };
  iframe.addEventListener('load', () => {
    if (iframeLoaded) cleanup();
    else iframeLoaded = true;
  });
  document.body.append(iframe, formElement);
  formElement.submit();
  window.setTimeout(cleanup, 60000);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  submitButton.disabled = true;
  submitButton.innerHTML = 'Submitting… <span>↗</span>';
  const payload = collectPayload();
  const photoForPdf = applicantPhoto;
  try {
    downloadPdf(payload, photoForPdf);
    sendToSpreadsheet(payload);
    submissionMessage.textContent = `${payload.name}, your form has been submitted. Please share your document copy with HR. Your PDF should download automatically; if it does not, click Download PDF copy.`;
    submissionDialog.showModal();
    downloadPdfLink.click();
    form.reset();
    applicantPhoto = null;
    photoPreview.innerHTML = '<span>No photo selected</span>';
    showMessage('Your PDF download has started. Please share the downloaded copy with HR.', true);
  } catch (error) {
    showMessage(`The PDF could not be created: ${error.message}`, false);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit application <span>→</span>';
  }
});
