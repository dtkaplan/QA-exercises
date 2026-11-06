const CONFIG = Object.freeze({
  responseSheetName: 'Form Responses 1',
  outputSheetName: 'Deduplicated',
  timestampHeader: 'Timestamp',
  emailHeader: 'Email Address',
  jsonHeader: 'Paste your assignment JSON here.'
});

function rebuildDeduplicatedSubmissions() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const responseSheet = spreadsheet.getSheetByName(CONFIG.responseSheetName);
  if (!responseSheet) {
    throw new Error('Response sheet not found: ' + CONFIG.responseSheetName);
  }

  const values = responseSheet.getDataRange().getValues();
  if (values.length === 0) {
    throw new Error('The response sheet has no header row.');
  }

  const headers = values[0].map(function (value) {
    return String(value).trim();
  });
  const columns = {
    timestamp: headers.indexOf(CONFIG.timestampHeader),
    email: headers.indexOf(CONFIG.emailHeader),
    json: headers.indexOf(CONFIG.jsonHeader)
  };
  Object.keys(columns).forEach(function (name) {
    if (columns[name] < 0) {
      throw new Error('Column header not found: ' + CONFIG[name + 'Header']);
    }
  });

  const submissions = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (row.every(function (value) { return value === '' || value === null; })) {
      continue;
    }

    const email = String(row[columns.email]).trim().toLowerCase();
    const jsonText = String(row[columns.json]).trim();
    const timestamp = row[columns.timestamp] instanceof Date
      ? row[columns.timestamp]
      : new Date(row[columns.timestamp]);

    if (!email || !jsonText || Number.isNaN(timestamp.getTime())) {
      throw new Error('Missing email, JSON, or valid timestamp on response row ' + (rowIndex + 1));
    }

    let payload;
    try {
      payload = JSON.parse(jsonText);
    } catch (error) {
      throw new Error('Invalid JSON on response row ' + (rowIndex + 1));
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Expected a JSON object on response row ' + (rowIndex + 1));
    }
    const rawDocid = payload.docid !== undefined ? payload.docid : payload.docID;
    const docid = rawDocid === undefined || rawDocid === null ? '' : String(rawDocid).trim();
    if (!docid) {
      throw new Error('Expected a JSON object with a non-empty docid or docID on response row ' + (rowIndex + 1));
    }

    ['MC', 'Essays', 'responses'].forEach(function (key) {
      if (payload[key] !== undefined && !Array.isArray(payload[key])) {
        throw new Error(key + ' must be an array on response row ' + (rowIndex + 1));
      }
    });

    submissions.push({
      email: email,
      timestamp: timestamp,
      rowNumber: rowIndex + 1,
      docid: docid,
      payload: payload
    });
  }

  submissions.sort(function (left, right) {
    return left.timestamp.getTime() - right.timestamp.getTime() || left.rowNumber - right.rowNumber;
  });

  const grouped = new Map();
  submissions.forEach(function (submission) {
    const docid = submission.docid;
    const groupKey = submission.email + '\u0000' + docid;
    let group = grouped.get(groupKey);
    if (!group) {
      group = {
        email: submission.email,
        docid: docid,
        latestSubmission: submission.timestamp,
        latestPayload: {},
        responseAnswers: new Map(),
        mcAnswers: new Map(),
        essayAnswers: new Map()
      };
      grouped.set(groupKey, group);
    }

    group.latestSubmission = submission.timestamp;
    group.latestPayload = submission.payload;
    mergeResponses(group.responseAnswers, submission.payload.responses || [], submission.rowNumber);
    mergeAnswers(group.mcAnswers, submission.payload.MC || [], 'MC', submission.rowNumber);
    mergeAnswers(group.essayAnswers, submission.payload.Essays || [], 'Essays', submission.rowNumber);
  });

  const outputRows = Array.from(grouped.values())
    .sort(function (left, right) {
      return left.email.localeCompare(right.email) || left.docid.localeCompare(right.docid);
    })
    .map(function (group) {
      const payload = Object.assign({}, group.latestPayload);
      if (Object.prototype.hasOwnProperty.call(payload, 'docID')) {
        payload.docID = group.docid;
        delete payload.docid;
      } else {
        payload.docid = group.docid;
        delete payload.docID;
      }
      if (Array.isArray(group.latestPayload.responses) || group.responseAnswers.size > 0) {
        payload.responses = Array.from(group.responseAnswers.values());
      }
      if (Array.isArray(group.latestPayload.MC) || group.mcAnswers.size > 0) {
        payload.MC = Array.from(group.mcAnswers.values());
      }
      if (Array.isArray(group.latestPayload.Essays) || group.essayAnswers.size > 0) {
        payload.Essays = Array.from(group.essayAnswers.values());
      }
      return [group.email, group.docid, group.latestSubmission, JSON.stringify(payload)];
    });

  let outputSheet = spreadsheet.getSheetByName(CONFIG.outputSheetName);
  if (!outputSheet) {
    outputSheet = spreadsheet.insertSheet(CONFIG.outputSheetName);
  }
  outputSheet.clearContents();
  outputSheet.getRange(1, 1, 1, 4).setValues([[
    'Student email', 'Assignment', 'Latest submission', 'De-duplicated JSON'
  ]]);
  if (outputRows.length > 0) {
    outputSheet.getRange(2, 1, outputRows.length, 4).setValues(outputRows);
  }
  outputSheet.setFrozenRows(1);
}

function mergeResponses(responseMap, responses, rowNumber) {
  responses.forEach(function (response) {
    if (!response || typeof response !== 'object' || !response.label) {
      throw new Error('Response without a label on response row ' + rowNumber);
    }

    const value = response.value;
    const unanswered = value === undefined
      || value === null
      || (typeof value === 'string' && value.trim() === '')
      || (Array.isArray(value) && value.length === 0);
    if (!unanswered) {
      responseMap.set(String(response.label), response);
    }
  });
}

function mergeAnswers(answerMap, answers, section, rowNumber) {
  answers.forEach(function (answer) {
    if (!answer || typeof answer !== 'object' || !answer.itemid) {
      throw new Error('Answer without an itemid in ' + section + ' on response row ' + rowNumber);
    }

    const itemId = String(answer.itemid);
    const blankContents = answer.contents === undefined
      || answer.contents === null
      || String(answer.contents).trim() === '';
    const skippedChoice = section === 'MC'
      && (String(answer.w).toLowerCase() === 'skipped' || /\.null$/i.test(itemId));
    const unanswered = blankContents || skippedChoice;
    if (unanswered) {
      return;
    }

    const answerKey = section === 'MC'
      ? itemId.replace(/(?:-\d+|\.null)$/i, '')
      : itemId;
    answerMap.set(answerKey || itemId, answer);
  });
}