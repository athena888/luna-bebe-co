# Outreach research intake

The daily cloud research routine commits one JSON file here per run
(`YYYY-MM-DD.json`). The nightly `outreach-prospect` cron ingests any file not
yet marked in `outreach_config.intake_ingested` (files stay in git as the
audit trail; the marker prevents re-processing).

Shape:

```json
{
  "seeds": [
    {"company": "...", "domain": "example.com", "metro": "Seattle",
     "industry": "law|tech|consulting|finance|real_estate", "employee_est": 120}
  ],
  "leads": [
    {"domain": "example.com", "person_name": "First Last",
     "title": "exact published title",
     "source_url": "https://... where the person is listed",
     "bio_url": "https://... their bio page if different",
     "evidence_text": "exact quoted benefits sentence(s)",
     "evidence_url": "https://..."}
  ]
}
```

**This repo is public: intake files must NEVER contain email addresses.**
Leads carry only facts already public at `source_url`; the site extracts a
published address from those pages server-side, verifies it, and only then
stores it. Any `email` field in a committed file is discarded unread
(`lib/outreach/intake.ts`).
