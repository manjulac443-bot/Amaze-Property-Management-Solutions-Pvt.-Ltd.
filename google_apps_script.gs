const SHEET_ID = '1zb4gbbTeS_iQhaIupQN8k_COBpejDw4F1AllcHxzXCU';

const COLUMNS = [
  ['Submission Date', 'submission_date'],
  ['Submitted At', 'submitted_at'],
  ['Name of the Unit', 'unit_name'],
  ['Name', 'name'],
  ["Father's/Husband's Name", 'father_husband_name'],
  ['DOB/Age', 'dob_age'],
  ['Blood Group', 'blood_group'],
  ['Education/Technical Qualification', 'education'],
  ['Previous post, organization & phone', 'previous_employment'],
  ['Phone No.', 'phone'],
  ['Marital Status', 'marital_status'],
  ['Permanent Address', 'permanent_address'],
  ['Permanent Phone', 'permanent_phone'],
  ['Permanent Police Station', 'permanent_police_station'],
  ['Present Address with Door No.', 'present_address'],
  ['Present Phone', 'present_phone'],
  ['Present Police Station', 'present_police_station'],
  ['Vaccination Details', 'vaccination_details'],
  ['Aadhaar Card - Original', 'aadhaar_original'],
  ['Aadhaar Card - Photo Copy', 'aadhaar_photocopy'],
  ['Aadhaar Card - Remarks', 'aadhaar_remarks'],
  ['Current Address Proof - Original', 'current_address_proof_original'],
  ['Current Address Proof - Photo Copy', 'current_address_proof_photocopy'],
  ['Current Address Proof - Remarks', 'current_address_proof_remarks'],
  ['ESI No. - Original', 'esi_no_original'],
  ['ESI No. - Photo Copy', 'esi_no_photocopy'],
  ['ESI No. - Remarks', 'esi_no_remarks'],
  ['PF No. - Original', 'pf_no_original'],
  ['PF No. - Photo Copy', 'pf_no_photocopy'],
  ['PF No. - Remarks', 'pf_no_remarks'],
  ['Bank Account Details - Original', 'bank_account_details_original'],
  ['Bank Account Details - Photo Copy', 'bank_account_details_photocopy'],
  ['Bank Account Details - Remarks', 'bank_account_details_remarks'],
  ['Educational Certificates - Original', 'educational_certificates_original'],
  ['Educational Certificates - Photo Copy', 'educational_certificates_photocopy'],
  ['Educational Certificates - Remarks', 'educational_certificates_remarks'],
  ['Declaration', 'declaration'],
  ['Employee Signature/Thumb Print', 'signature'],
  ['DOJ', 'doj'],
  ['Operations Officer', 'operations_officer'],
  ['Operations Date', 'operations_date'],
];

function doPost(e) {
  if (!e || !e.parameter) {
    return jsonResponse({
      ok: false,
      message: 'doPost must be called by a POST request. Deploy this script as a web app and submit the form to test it.',
    });
  }

  const requestId = e.parameter.requestId || '';
  try {
    const data = JSON.parse(e.parameter.payload || e.postData.contents);
    const missingFields = REQUIRED_FIELDS.filter(function(key) {
      return !String(data[key] || '').trim();
    });
    if (missingFields.length) {
      return responseHtml(requestId, false, 'Please complete all required fields.');
    }

    const invalidPhones = ['phone', 'permanent_phone', 'present_phone'].some(function(key) {
      return !/^[0-9]{10}$/.test(String(data[key] || '').trim());
    });
    if (invalidPhones) {
      return responseHtml(requestId, false, 'Phone numbers must contain exactly 10 digits.');
    }

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map(function(column) {
        return column[0];
      })]);
    }
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);

    const row = COLUMNS.map(function(column) {
      return safeCellValue(data[column[1]]);
    });
    sheet.appendRow(row);
    return responseHtml(requestId, true, 'Submitted successfully. Your details are now recorded.');
  } catch (error) {
    console.error(error);
    return responseHtml(requestId, false, 'Unable to save this submission to the spreadsheet.');
  }
}

const REQUIRED_FIELDS = [
  'unit_name', 'name', 'father_husband_name', 'dob_age', 'education', 'phone',
  'marital_status', 'permanent_address', 'permanent_phone',
  'permanent_police_station', 'present_address', 'present_phone',
  'present_police_station', 'vaccination_details', 'declaration', 'signature',
  'doj', 'operations_officer', 'operations_date',
];

function safeCellValue(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function responseHtml(requestId, ok, message) {
  const response = JSON.stringify({
    channel: 'biodata-spreadsheet',
    requestId: requestId,
    ok: ok,
    message: message,
  });
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><body><script>window.parent.postMessage(' +
      response +
      ', "*");</script></body></html>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet() {
  return jsonResponse({ ok: true, message: 'Biodata receiver is active.' });
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
