# ICDM 2026 Readiness Console

A static, client-side web app for checking whether a paper package looks ready for IEEE ICDM 2026 submission.

The app analyzes uploaded PDF/TeX/BibTeX/TXT files in the browser and visualizes each submission gate as neutral, passed, or failed. It also includes a policy evidence panel with official ICDM 2026 sources.

## What It Checks

- PDF readability and page count
- June 6, 2026 AoE submission window
- Research vs Applied Track selection
- Ten-page limit including references and appendices
- IEEE two-column signal from source or PDF layout
- Research Track triple-blind identity risks
- Originality and no parallel-review author attestation
- ICDM scope keyword evidence
- Reproducibility checklist readiness
- CyberChair submission route
- Acceptance-stage author/title and attendance reminders

## Run Locally

Open `index.html` directly in a browser, or serve the folder:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Deploy To GitHub Pages

This repository includes a GitHub Actions workflow in `.github/workflows/pages.yml`.

1. Push this folder to a GitHub repository.
2. In the repository settings, enable Pages with "GitHub Actions" as the source.
3. The workflow publishes the static site on every push to `main`.

## Official Sources

- Research Track CFP: https://icdm2026.neu.edu.cn/11661/list.htm
- Applied Track CFP: https://icdm2026.neu.edu.cn/CallforAppliedTrack/list.htm
- ICDM 2026 homepage: https://icdm2026.neu.edu.cn/main.htm
- IEEE conference templates: https://www.ieee.org/conferences/publishing/templates.html
- CyberChair submission system: https://wi-lab.com/cyberchair/2026/icdm26/scripts/submit.php?subarea=DM

## Notes

The checker is a readiness assistant, not an official validator. Some gates, such as originality and parallel submission status, require author attestation because they cannot be proven from uploaded files alone.
