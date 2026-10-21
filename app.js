(function (root) {
  function parseCsv(text) {
    const lines = String(text || '').trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(',').map((cell) => cell.trim());
      return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
    });
  }

  function parseRows(text) {
    const input = String(text || '').trim();
    if (!input) return [];
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row === 'object') : [];
    } catch (_) {
      return parseCsv(input);
    }
  }

  function audit(rows) {
    const issues = [];
    const classCounts = new Map();
    const seenImages = new Map();
    let lowConfidence = 0;
    rows.forEach((row, index) => {
      const line = index + 1;
      const image = String(row.image_id || row.image || row.file || '').trim();
      const label = String(row.label || row.class || row.category || '').trim();
      const confidence = Number(row.confidence);
      if (!image) issues.push({ severity: 'high', issue: `Row ${line} is missing an image id`, action: 'Reject or re-open the task before export.' });
      if (!label) issues.push({ severity: 'high', issue: `Row ${line} is missing a label`, action: 'Send back to annotation with the taxonomy instructions.' });
      if (image) {
        if (seenImages.has(image)) issues.push({ severity: 'medium', issue: `Image "${image}" appears on rows ${seenImages.get(image)} and ${line}`, action: 'Confirm whether this is an intentional second label or a duplicate task.' });
        seenImages.set(image, line);
      }
      if (label) classCounts.set(label, (classCounts.get(label) || 0) + 1);
      if (Number.isFinite(confidence) && confidence < 0.7) {
        lowConfidence += 1;
        issues.push({ severity: 'medium', issue: `Row ${line} confidence ${confidence} is below 0.70`, action: 'Route to a reviewer before model training or delivery.' });
      }
    });
    const distribution = [...classCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
    if (distribution.length > 1) {
      const total = rows.length;
      const top = distribution[0];
      if (top.count / total > 0.7) issues.push({ severity: 'medium', issue: `Class "${top.label}" is ${Math.round((top.count / total) * 100)}% of the batch`, action: 'Check sampling balance before benchmark scoring.' });
    }
    const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + (issue.severity === 'high' ? 18 : 8), 0));
    return { rowCount: rows.length, lowConfidence, distribution, score, issues };
  }

  function render(result) {
    const output = document.querySelector('#results');
    if (!output) return;
    if (!result.rowCount) {
      output.innerHTML = '<p class="empty-state">Paste annotation JSON or CSV to audit a batch.</p>';
      return;
    }
    const issueItems = result.issues.length ? result.issues.map((issue) => `<li><strong>${issue.severity.toUpperCase()}:</strong> ${issue.issue}<br><span>${issue.action}</span></li>`).join('') : '<li>No blocking annotation issues found.</li>';
    const classes = result.distribution.map((item) => `${item.label}: ${item.count}`).join(' | ') || 'No labels parsed';
    output.innerHTML = `<article><div class="score-row"><h4>Batch QA score</h4><span class="score">${result.score}/100</span></div><p>${result.rowCount} annotations inspected. ${classes}</p><ul>${issueItems}</ul></article>`;
  }

  function boot() {
    const input = document.querySelector('#annotationInput');
    const button = document.querySelector('#auditButton');
    if (!input || !button) return;
    button.addEventListener('click', () => render(audit(parseRows(input.value))));
  }

  const api = { audit, parseRows, parseCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root.document) root.KlatchLabelQA = api;
  if (root.document) root.addEventListener('DOMContentLoaded', boot);
})(typeof window !== 'undefined' ? window : globalThis);
