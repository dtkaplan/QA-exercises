const CONFIG = Object.freeze({
  responseSheetName: 'Form Responses 1',
  assignmentSheetPrefix: 'D-',
  timestampHeader: 'Timestamp',
  emailHeader: 'Email Address',
  jsonHeader: 'Paste your assignment JSON here.',
  sourceRowHeader: 'Source response row'
});

const OUTPUT_HEADERS = [
  'Student email',
  'Submission time',
  'docID',
  'Question item ID',
  'Type',
  'Value',
  CONFIG.sourceRowHeader
];

function processNewFormSubmission(event) {
  if (!event || !event.range) {
    throw new Error('Run this function from an installable spreadsheet form-submit trigger.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sourceSheet = event.range.getSheet();
    if (sourceSheet.getName() !== CONFIG.responseSheetName) {
      return;
    }

    const lastColumn = sourceSheet.getLastColumn();
    const headers = sourceSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    const columns = getResponseColumns(headers);
    const sourceRow = event.range.getRow();
    const row = sourceSheet.getRange(sourceRow, 1, 1, lastColumn).getValues()[0];
    const submission = parseSubmission(row, sourceRow, columns);
    if (submission.answers.length > 0) {
      upsertSubmission(SpreadsheetApp.getActiveSpreadsheet(), submission);
    }
  } finally {
    lock.releaseLock();
  }
}

function installFormSubmitTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'processNewFormSubmission') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger('processNewFormSubmission')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
}

function rebuildDeduplicatedSubmissions() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const responseSheet = spreadsheet.getSheetByName(CONFIG.responseSheetName);
    if (!responseSheet) {
      throw new Error('Response sheet not found: ' + CONFIG.responseSheetName);
    }

    const values = responseSheet.getDataRange().getValues();
    if (values.length === 0) {
      throw new Error('The response sheet has no header row.');
    }
    const columns = getResponseColumns(values[0]);
    const assignments = new Map();

    for (let index = 1; index < values.length; index += 1) {
      const row = values[index];
      if (row.every(function (value) { return value === '' || value === null; })) {
        continue;
      }

      const submission = parseSubmission(row, index + 1, columns);
      let answers = assignments.get(submission.docid);
      if (!answers) {
        answers = new Map();
        assignments.set(submission.docid, answers);
      }

      submission.answers.forEach(function (answer) {
        const record = makeAnswerRecord(submission, answer);
        const key = record.email + '\u0000' + record.label;
        const previous = answers.get(key);
        if (!previous || isNewerRecord(record, previous)) {
          answers.set(key, record);
        }
      });
    }

    spreadsheet.getSheets().forEach(function (sheet) {
      if (sheet.getName().indexOf(CONFIG.assignmentSheetPrefix) === 0) {
        initializeAssignmentSheet(sheet);
      }
    });

    assignments.forEach(function (answers, docid) {
      if (answers.size === 0) {
        return;
      }
      const sheet = getAssignmentSheet(spreadsheet, docid);
      const rows = Array.from(answers.values())
        .sort(function (left, right) {
          return left.email.localeCompare(right.email) || left.label.localeCompare(right.label);
        })
        .map(answerRecordToRow);
      sheet.getRange(2, 1, rows.length, OUTPUT_HEADERS.length).setValues(rows);
    });
  } finally {
    lock.releaseLock();
  }
}

function getResponseColumns(headers) {
  const normalizedHeaders = headers.map(function (value) {
    return String(value).trim();
  });
  const columns = {
    timestamp: normalizedHeaders.indexOf(CONFIG.timestampHeader),
    email: normalizedHeaders.indexOf(CONFIG.emailHeader),
    json: normalizedHeaders.indexOf(CONFIG.jsonHeader)
  };
  Object.keys(columns).forEach(function (name) {
    if (columns[name] < 0) {
      throw new Error('Column header not found: ' + CONFIG[name + 'Header']);
    }
  });
  return columns;
}

function parseSubmission(row, sourceRow, columns) {
  const email = String(row[columns.email] || '').trim().toLowerCase();
  const jsonText = String(row[columns.json] || '').trim();
  const timestampValue = row[columns.timestamp];
  const timestamp = timestampValue instanceof Date ? timestampValue : new Date(timestampValue);

  if (!email || !jsonText || Number.isNaN(timestamp.getTime())) {
    throw new Error('Missing email, JSON, or valid timestamp on response row ' + sourceRow);
  }

  let payload;
  try {
    payload = JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Invalid JSON on response row ' + sourceRow);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Expected a JSON object on response row ' + sourceRow);
  }

  const rawDocid = payload.docid !== undefined ? payload.docid : payload.docID;
  const docid = rawDocid === undefined || rawDocid === null ? '' : String(rawDocid).trim();
  if (!docid) {
    throw new Error('Expected a JSON object with a non-empty docid or docID on response row ' + sourceRow);
  }

  ['MC', 'Essays', 'responses'].forEach(function (key) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) {
      throw new Error(key + ' must be an array on response row ' + sourceRow);
    }
  });

  return {
    email: email,
    timestamp: timestamp,
    sourceRow: sourceRow,
    docid: docid,
    answers: extractAnswers(payload, sourceRow)
  };
}

function extractAnswers(payload, sourceRow) {
  const answers = new Map();

  (payload.responses || []).forEach(function (response) {
    if (!response || typeof response !== 'object' || !response.label) {
      throw new Error('Response without a label on response row ' + sourceRow);
    }
    if (hasAnswerValue(response.value)) {
      answers.set(String(response.label), {
        label: String(response.label),
        type: response.type || inferAnswerType(response.value),
        value: response.value,
        duration: response.duration
      });
    }
  });

  (payload.MC || []).forEach(function (answer) {
    if (!answer || typeof answer !== 'object' || !answer.itemid) {
      throw new Error('Answer without an itemid in MC on response row ' + sourceRow);
    }
    const itemId = String(answer.itemid);
    const label = itemId.replace(/(?:-\d+|\.null)$/i, '');
    const skipped = String(answer.w).toLowerCase() === 'skipped' || /\.null$/i.test(itemId);
    if (!skipped && hasAnswerValue(answer.contents)) {
      answers.set(label, { label: label, type: 'selection', value: answer.contents });
    }
  });

  (payload.Essays || []).forEach(function (answer) {
    if (!answer || typeof answer !== 'object' || !answer.itemid) {
      throw new Error('Answer without an itemid in Essays on response row ' + sourceRow);
    }
    const label = String(answer.itemid);
    if (hasAnswerValue(answer.contents)) {
      answers.set(label, {
        label: label,
        type: 'text',
        value: answer.contents,
        duration: answer.duration
      });
    }
  });

  return Array.from(answers.values());
}

function hasAnswerValue(value) {
  return value !== undefined
    && value !== null
    && !(typeof value === 'string' && value.trim() === '')
    && !(Array.isArray(value) && value.length === 0);
}

function inferAnswerType(value) {
  if (Array.isArray(value)) {
    return 'selection';
  }
  return typeof value === 'string' ? 'text' : typeof value;
}

function makeAnswerRecord(submission, answer) {
  return {
    email: submission.email,
    timestamp: submission.timestamp,
    docid: submission.docid,
    label: answer.label,
    type: answer.type,
    value: serializeAnswerValue(answer),
    sourceRow: submission.sourceRow
  };
}

function serializeAnswerValue(answer) {
  if (answer.type === 'text') {
    const textAnswer = { value: answer.value };
    if (answer.duration !== undefined && answer.duration !== null) {
      textAnswer.duration = answer.duration;
    }
    return JSON.stringify(textAnswer);
  }
  return answer.value !== null && typeof answer.value === 'object'
    ? JSON.stringify(answer.value)
    : String(answer.value);
}

function isNewerRecord(incoming, previous) {
  const incomingTime = incoming.timestamp.getTime();
  const previousTime = previous.timestamp.getTime();
  return incomingTime > previousTime
    || (incomingTime === previousTime && incoming.sourceRow >= previous.sourceRow);
}

function upsertSubmission(spreadsheet, submission) {
  const sheet = getAssignmentSheet(spreadsheet, submission.docid);
  const existingByLabel = findStudentAnswers(sheet, submission.email);
  const additions = [];

  submission.answers.forEach(function (answer) {
    const incoming = makeAnswerRecord(submission, answer);
    const existing = existingByLabel.get(answer.label);
    if (!existing) {
      existingByLabel.set(answer.label, { row: 0, record: incoming });
      additions.push(answerRecordToRow(incoming));
    } else if (isNewerRecord(incoming, existing.record)) {
      sheet.getRange(existing.row, 1, 1, OUTPUT_HEADERS.length)
        .setValues([answerRecordToRow(incoming)]);
      existing.record = incoming;
    }
  });

  if (additions.length > 0) {
    const firstNewRow = sheet.getLastRow() + 1;
    sheet.getRange(firstNewRow, 1, additions.length, OUTPUT_HEADERS.length).setValues(additions);
  }
}

function findStudentAnswers(sheet, email) {
  const answers = new Map();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return answers;
  }

  const matches = sheet.getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(email)
    .matchEntireCell(true)
    .findAll();
  matches.forEach(function (match) {
    const rowNumber = match.getRow();
    const row = sheet.getRange(rowNumber, 1, 1, OUTPUT_HEADERS.length).getValues()[0];
    const label = String(row[3]);
    const record = answerRecordFromRow(row);
    const previous = answers.get(label);
    if (!previous || isNewerRecord(record, previous.record)) {
      answers.set(label, { row: rowNumber, record: record });
    }
  });
  return answers;
}

function answerRecordFromRow(row) {
  const rawTimestamp = row[1];
  return {
    email: String(row[0]).trim().toLowerCase(),
    timestamp: rawTimestamp instanceof Date ? rawTimestamp : new Date(rawTimestamp),
    docid: String(row[2]),
    label: String(row[3]),
    type: String(row[4]),
    value: String(row[5]),
    sourceRow: Number(row[6]) || 0
  };
}

function answerRecordToRow(record) {
  return [
    record.email,
    record.timestamp,
    record.docid,
    record.label,
    record.type,
    record.value,
    record.sourceRow
  ];
}

function getAssignmentSheet(spreadsheet, docid) {
  const name = assignmentSheetName(docid);
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    initializeAssignmentSheet(sheet);
  }
  return sheet;
}

function initializeAssignmentSheet(sheet) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, OUTPUT_HEADERS.length).setValues([OUTPUT_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.hideColumns(OUTPUT_HEADERS.length);
}

function assignmentSheetName(docid) {
  const prefix = CONFIG.assignmentSheetPrefix;
  const suffix = '-' + shortHash(docid);
  const safeDocid = String(docid)
    .replace(/[\u0000-\u001f\u007f]/g, '_')
    .replace(/[\\\/?*:\[\]]/g, '_')
    .replace(/^'+|'+$/g, '')
    .trim() || 'untitled';
  const maxDocidLength = 100 - prefix.length - suffix.length;
  return prefix + safeDocid.substring(0, maxDocidLength) + suffix;
}

function shortHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}