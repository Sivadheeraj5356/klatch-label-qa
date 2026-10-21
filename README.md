# Klatch Label QA

A client-side annotation quality tool for Klatch-style data-labeling workflows. Paste JSON or CSV annotation records and the tool flags missing image IDs or labels, duplicate assets, low-confidence rows and class imbalance, then assigns a batch QA score. It runs entirely in the browser and stores no dataset.

## Run

Open `index.html` in a browser. No server, dependency, or API key is required.

## Test

```bash
node test.js
```
