# Resume Freely

Resume Freely is a free local browser resume builder with printable ATS-friendly templates.

Live site: https://resumefreely.com/

## Features

- Edit structured resume sections for contact details, summary, experience, projects, education, skills, and certifications.
- Choose ATS Classic, Modern Compact, Technical, Student, or Executive templates.
- Print or save a PDF from the browser without a signup, watermark, or download gate.
- Build a matching cover letter.
- Use local autosave, JSON import/export, plain-text copy, and sample or blank starting points.
- Check for common resume issues such as missing contact details, weak bullets, missing metrics, and overly long content.

## Run Locally

This is a static site. From this directory:

```sh
python3 -m http.server 4177
```

Then open `http://localhost:4177`.

## Notes

- Resume data is stored in your browser's local storage.
- PDF output uses the browser print dialog, so final pagination can vary by browser and print settings.
- The templates are designed to be readable and applicant-tracking-system friendly, but every employer and ATS can parse documents differently.

## License

CC0-1.0. See `LICENSE`.
