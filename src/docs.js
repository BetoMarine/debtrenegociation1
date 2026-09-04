export const DOCUMENT_DEFS = [
  { key: "hardship_proof", required: true, minFiles: 1 },
  { key: "bank_statements", required: true, minFiles: 3 },
  { key: "identity", required: false, minFiles: 0 },
  { key: "other", required: false, minFiles: 0 },
];

const LEGACY_KEY = {
  income_change: "hardship_proof",
  payslips: "other",
  creditor_statements: "other",
  expenses: "other",
  address: "other",
  assets_liabilities: "other",
};

export function emptyDocuments() {
  return DOCUMENT_DEFS.map((def) => ({
    key: def.key,
    attachmentIds: [],
  }));
}

export function attachmentIdsOf(doc) {
  if (!doc) return [];
  if (Array.isArray(doc.attachmentIds)) return doc.attachmentIds.filter(Boolean);
  return doc.attachmentId ? [doc.attachmentId] : [];
}

export function normalizeDocuments(docs) {
  const byKey = new Map(DOCUMENT_DEFS.map((def) => [def.key, []]));
  for (const doc of docs || []) {
    const key = LEGACY_KEY[doc.key] || doc.key;
    if (!byKey.has(key)) continue;
    byKey.get(key).push(...attachmentIdsOf(doc));
  }
  return DOCUMENT_DEFS.map((def) => ({
    key: def.key,
    attachmentIds: [...new Set(byKey.get(def.key))],
  }));
}

export function missingAttachments(docs) {
  const list = normalizeDocuments(docs);
  return DOCUMENT_DEFS.filter((def) => def.required).flatMap((def) => {
    const have = list.find((d) => d.key === def.key)?.attachmentIds.length || 0;
    if (have >= def.minFiles) return [];
    return [
      {
        key: def.key,
        have,
        need: def.minFiles,
        remain: def.minFiles - have,
      },
    ];
  });
}

export function attachedMarks(docs) {
  const list = normalizeDocuments(docs);
  return DOCUMENT_DEFS.map((def) => {
    const have = list.find((d) => d.key === def.key)?.attachmentIds.length || 0;
    return {
      key: def.key,
      have,
      attached: have > 0,
    };
  });
}
