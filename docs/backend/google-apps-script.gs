const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME = "responses";
const NOTIFICATION_EMAIL = "";

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "Survey endpoint is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = parsePayload(e);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getOrCreateSheet(spreadsheet, SHEET_NAME);

    ensureHeader(sheet);
    sheet.appendRow([
      new Date(),
      payload.submission && payload.submission.id,
      payload.submission && payload.submission.submittedAt,
      payload.answers && payload.answers.interview_id,
      payload.answers && payload.answers.interview_date,
      payload.answers && payload.answers.respondent_role,
      payload.answers && payload.answers.experience,
      payload.answers && payload.answers.primary_media,
      JSON.stringify(payload)
    ]);

    if (NOTIFICATION_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFICATION_EMAIL,
        subject: "[Style Survey] 새 응답이 도착했습니다",
        body: [
          "새 전문가 스타일 편집 설문 응답이 저장되었습니다.",
          "",
          "Interview ID: " + valueOrBlank(payload.answers && payload.answers.interview_id),
          "Respondent role: " + valueOrBlank(payload.answers && payload.answers.respondent_role),
          "Submitted at: " + valueOrBlank(payload.submission && payload.submission.submittedAt)
        ].join("\n")
      });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body.");
  }
  return JSON.parse(e.postData.contents);
}

function getOrCreateSheet(spreadsheet, sheetName) {
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    "received_at",
    "submission_id",
    "submitted_at",
    "interview_id",
    "interview_date",
    "respondent_role",
    "experience",
    "primary_media",
    "payload_json"
  ]);
}

function valueOrBlank(value) {
  return value || "";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
