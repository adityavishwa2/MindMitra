# Automatic PDF conversion and MCQ/MSQ practice

PDF upload automatically queues extraction. The worker extracts embedded text, OCRs image-only pages when needed, detects supported numbered questions/options and creates the import JSON. No separate conversion command or manual transcription is needed for supported layouts.

## Question type detection

- **MCQ:** one selected answer, using a single radio-like option choice.
- **MSQ:** one or more selected answers. Explicit phrases such as “select all that apply”, “one or more correct”, “more than one option”, labeled MSQ/multiple-select sections and supported Hindi instructions mark a draft as MSQ.
- A labeled MCQ section or explicit “choose one answer” instruction returns to single-selection behavior.

Question type is not guessed from an ambiguous question alone. Review inferred types, mathematical symbols, options, diagrams and actual marking rules against the original. Scans and unusual layouts can require corrections. Existing pending PDF drafts can be regenerated from the review screen using **Reconvert PDF (replaces draft)**. Save any manual JSON edits elsewhere before replacing a draft.

Automatic conversion is **PDF → editable JSON → MCQ/MSQ draft**, with private review before publication. It does not invent answers, independently verify the source's answer key or automatically publish an unreviewed paper. Without a reliable verified answer key, questions remain unscored.

## MSQ import JSON

Use zero-based option indexes. Keep the legacy single `answer` null for an MSQ and place its key choices in `correctAnswers`:

```json
{
  "number": 1,
  "text": "Select all prime numbers",
  "type": "MSQ",
  "options": ["2", "4", "3"],
  "subject": "Mathematics",
  "topic": "Primes",
  "language": "en",
  "sourcePage": 1,
  "answer": null,
  "correctAnswers": [0, 2],
  "keyStatus": "VERIFIED",
  "keyReference": "A reliable reviewed key reference"
}
```

This is a synthetic example, not real PYQ material. PDF-generated drafts start with `correctAnswers: []`, `answer: null` and `keyStatus: "UNAVAILABLE"`. A verified MSQ needs a nonempty, unique, in-range key and a reference; an MSQ may have only one correct choice. MCQs continue using the existing scalar `answer`. The CSV helper supports an optional `correctAnswers` column containing a JSON array.

## Scoring and recovery

MSQs use **exact-set scoring with no partial credit**. Selecting all and only the keyed options earns the paper's full marks, in any order. An incomplete or extra selection receives the configured incorrect-answer penalty. No selection is unattempted. Missing/disputed keys and descriptive questions are excluded from automatic scoring.

Check the original exam's marking scheme before publishing: partial-credit schemes are not implemented. Selections persist in the database and reconnect cache; clearing, navigation, reload recovery, result explanations and private progress analytics all handle multiple selections. Active quiz HTML does not receive correct-answer arrays. Sessions copy their answer-key arrays and question snapshots so later source corrections do not change an existing attempt.

## Upgrade

Keep `.env` and back up the database, then run:

```sh
npm ci
npm run db:migrate
npm run build
npm run start
```

The new migration adds array columns without changing existing MCQ answers or recorded results. The PDF worker starts with `dev` and `start`; it must have Poppler and, for scans, Tesseract available. See [PDF/OCR setup](pdf-conversion.md) and [Windows video setup](windows-media-setup.md).
