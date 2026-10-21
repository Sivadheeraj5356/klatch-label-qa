const assert = require('node:assert/strict');
const { audit, parseRows } = require('./app.js');
const rows = parseRows('image_id,label,confidence\nimg-1,crop,0.95\nimg-1,,0.62\nimg-2,weed,0.91');
const result = audit(rows);
assert.equal(result.rowCount, 3);
assert.ok(result.issues.some((issue) => issue.issue.includes('missing a label')));
assert.ok(result.issues.some((issue) => issue.issue.includes('appears on rows')));
console.log('3 tests passed');
