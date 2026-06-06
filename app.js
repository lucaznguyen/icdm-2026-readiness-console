import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

const AOE_DEADLINE_UTC = Date.UTC(2026, 5, 7, 11, 59, 59);
const SOURCE = {
  home: {
    label: "ICDM 2026 homepage",
    url: "https://icdm2026.neu.edu.cn/main.htm",
  },
  research: {
    label: "Official Research Track CFP",
    url: "https://icdm2026.neu.edu.cn/11661/list.htm",
  },
  applied: {
    label: "Official Applied Track CFP",
    url: "https://icdm2026.neu.edu.cn/CallforAppliedTrack/list.htm",
  },
  ieeeTemplate: {
    label: "IEEE conference templates",
    url: "https://www.ieee.org/conferences/publishing/templates.html",
  },
  cyberchair: {
    label: "ICDM 2026 CyberChair",
    url: "https://wi-lab.com/cyberchair/2026/icdm26/scripts/submit.php?subarea=DM",
  },
};

const FLOW_STEPS = [
  { key: "intake", label: "Intake", detail: "file, deadline, track" },
  { key: "format", label: "Format", detail: "pages, IEEE layout" },
  { key: "policy", label: "Policy", detail: "blind review, originality" },
  { key: "repro", label: "Reproducibility", detail: "checklist, method traces" },
  { key: "submit", label: "Submit", detail: "portal, author plan" },
];

const MANUAL_ITEMS = [
  {
    key: "originality",
    label: "Original, unpublished work; not under review elsewhere",
    detail: "Required by both Research and Applied submission guidelines.",
  },
  {
    key: "trackExclusive",
    label: "Only one ICDM 2026 track selected for this paper",
    detail: "Applied CFP states a paper should be submitted to Research or Applied, not both.",
  },
  {
    key: "reproChecklist",
    label: "Reproducibility checklist PDF is complete",
    detail: "Upload the checklist or confirm it is ready for the submission form.",
  },
  {
    key: "portalReady",
    label: "CyberChair submission is ready",
    detail: "Email submissions are not accepted by the official CFP.",
  },
  {
    key: "authorshipFinal",
    label: "Author list and title are final enough for acceptance-stage restrictions",
    detail: "Research CFP says accepted author lists and titles become final.",
  },
  {
    key: "attendancePlan",
    label: "At least one author can register and present if accepted",
    detail: "Official attendance language affects inclusion in proceedings and program.",
  },
];

const JUSTIFICATIONS = [
  {
    title: "Deadline and AoE time",
    why: "A paper can be technically ready but still miss the submission window. The checker evaluates the June 6, 2026 deadline using Anywhere on Earth time.",
    evidence:
      "The official Research and Applied pages list the June 6, 2026 submission deadline and state that deadlines use AoE timing.",
    source: SOURCE.research,
  },
  {
    title: "Originality and no parallel review",
    why: "ICDM review assumes the submission is unpublished and not simultaneously under review at another venue.",
    evidence:
      "Both official track pages require original papers that are not currently under consideration elsewhere.",
    source: SOURCE.research,
  },
  {
    title: "Online submission only",
    why: "The paper must enter the official review workflow with the right metadata, track, files, and checklist responses.",
    evidence:
      "The CFP points authors to CyberChair and says email submissions are not accepted.",
    source: SOURCE.cyberchair,
  },
  {
    title: "Ten-page IEEE format",
    why: "Formatting keeps submissions comparable and protects reviewer time; over-length papers can be desk rejected.",
    evidence:
      "Official track pages specify IEEE two-column format with a maximum of ten pages including references and appendices.",
    source: SOURCE.research,
  },
  {
    title: "Research Track anonymity",
    why: "The Research Track uses triple-blind review, so the manuscript and file package should not reveal author identities.",
    evidence:
      "The Research CFP requires author names and affiliations to be concealed and advises careful file naming.",
    source: SOURCE.research,
  },
  {
    title: "Applied Track blind policy",
    why: "Applied papers are single-blind, but the page still requires the right track selection and the same page/format baseline.",
    evidence:
      "The Applied CFP identifies the track as single-blind and says to select Applied Track in the submission page.",
    source: SOURCE.applied,
  },
  {
    title: "Reproducibility checklist",
    why: "Reviewers use the checklist and paper details to judge whether the reported results can be reproduced.",
    evidence:
      "Both track pages require the reproducibility checklist as part of submission.",
    source: SOURCE.research,
  },
  {
    title: "Scope and review criteria",
    why: "Even a polished paper can fail readiness if it does not match data mining scope or lacks clear contribution evidence.",
    evidence:
      "The official pages list data mining topics and evaluate technical quality, relevance, originality, significance, and clarity.",
    source: SOURCE.home,
  },
  {
    title: "Authorship, title, and attendance",
    why: "Acceptance-stage requirements are easier to handle before submission than after decisions arrive.",
    evidence:
      "The Research CFP describes author/title restrictions after acceptance and requires registration/presentation for accepted papers.",
    source: SOURCE.research,
  },
];

const state = {
  track: "research",
  files: [],
  analysis: null,
  checks: [],
  revealIndex: 0,
  manual: Object.fromEntries(MANUAL_ITEMS.map((item) => [item.key, false])),
  busy: false,
  error: "",
};

const els = {
  fileInput: document.querySelector("#fileInput"),
  dropzone: document.querySelector("#dropzone"),
  fileList: document.querySelector("#fileList"),
  analyzeButton: document.querySelector("#analyzeButton"),
  exportButton: document.querySelector("#exportButton"),
  resetButton: document.querySelector("#resetButton"),
  manualList: document.querySelector("#manualList"),
  checksGrid: document.querySelector("#checksGrid"),
  flowline: document.querySelector("#flowline"),
  scoreRing: document.querySelector("#scoreRing"),
  scoreValue: document.querySelector("#scoreValue"),
  verdictText: document.querySelector("#verdictText"),
  verdictDetail: document.querySelector("#verdictDetail"),
  deadlinePill: document.querySelector("#deadlinePill"),
  evidenceGrid: document.querySelector("#evidenceGrid"),
  insightStrip: document.querySelector("#insightStrip"),
  paperPreview: document.querySelector("#paperPreview"),
  emptyPreview: document.querySelector("#emptyPreview"),
  signalCanvas: document.querySelector("#signalCanvas"),
};

function hydrateIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function bytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusIcon(status) {
  if (status === "pass") return "check";
  if (status === "fail") return "x";
  if (status === "running") return "loader-2";
  return "circle";
}

function statusLabel(status) {
  if (status === "pass") return "Passed";
  if (status === "fail") return "Failed";
  if (status === "running") return "Checking";
  return "Pending";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVisibleChecks() {
  return state.checks.map((check, index) => {
    if (index < state.revealIndex) return check;
    if (state.busy && index === state.revealIndex) {
      return { ...check, status: "running", reason: "Checking this gate now.", evidence: [] };
    }
    return { ...check, status: "pending", reason: "Waiting for this gate.", evidence: [] };
  });
}

function getScore(checks) {
  const blocking = checks.filter((check) => check.blocking);
  if (!blocking.length) return 0;
  const passed = blocking.filter((check) => check.status === "pass").length;
  return Math.round((passed / blocking.length) * 100);
}

function getVerdict(checks) {
  if (!state.analysis && !state.error) {
    return {
      title: "Awaiting paper",
      detail: "No submission package has been analyzed yet.",
    };
  }
  if (state.error) {
    return {
      title: "Analysis blocked",
      detail: state.error,
    };
  }
  const visible = getVisibleChecks();
  const blocking = visible.filter((check) => check.blocking);
  const hasRunning = visible.some((check) => check.status === "running");
  const hasFail = blocking.some((check) => check.status === "fail");
  const hasPending = blocking.some((check) => check.status === "pending");
  if (hasRunning) {
    return {
      title: "Checking gates",
      detail: "The checklist is being evaluated step by step.",
    };
  }
  if (hasFail) {
    return {
      title: "Not ready yet",
      detail: "At least one blocking gate failed. Review the red cards and official evidence.",
    };
  }
  if (hasPending) {
    return {
      title: "Needs evidence",
      detail: "Some gates still need a file or author attestation.",
    };
  }
  return {
    title: "Ready to submit",
    detail: `All blocking gates passed for the ${state.track === "research" ? "Research" : "Applied"} Track.`,
  };
}

function renderManualItems() {
  els.manualList.innerHTML = MANUAL_ITEMS.map(
    (item) => `
      <label class="manual-item">
        <input type="checkbox" data-manual="${item.key}" ${state.manual[item.key] ? "checked" : ""} />
        <span>
          ${escapeHtml(item.label)}
          <small>${escapeHtml(item.detail)}</small>
        </span>
      </label>
    `,
  ).join("");
}

function renderFiles() {
  if (!state.files.length) {
    els.fileList.innerHTML = `<div class="file-chip"><span>No files selected</span><small>PDF needed</small></div>`;
    return;
  }
  els.fileList.innerHTML = state.files
    .map(
      (file) => `
        <div class="file-chip">
          <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
          <small>${bytes(file.size)}</small>
        </div>
      `,
    )
    .join("");
}

function renderFlow(checks) {
  const flowStatus = Object.fromEntries(
    FLOW_STEPS.map((step) => {
      const relevant = checks.filter((check) => check.group === step.key);
      if (!relevant.length) return [step.key, "pending"];
      if (relevant.some((check) => check.status === "fail")) return [step.key, "fail"];
      if (relevant.some((check) => check.status === "running")) return [step.key, "running"];
      if (relevant.every((check) => check.status === "pass")) return [step.key, "pass"];
      return [step.key, "pending"];
    }),
  );

  els.flowline.innerHTML = FLOW_STEPS.map((step) => {
    const status = flowStatus[step.key];
    return `
      <div class="flow-step ${status}">
        <span class="status-dot"><i data-lucide="${statusIcon(status)}"></i></span>
        <strong>${escapeHtml(step.label)}</strong>
        <small>${escapeHtml(step.detail)}</small>
      </div>
    `;
  }).join("");
}

function renderChecks(checks) {
  if (!checks.length) {
    els.checksGrid.innerHTML = Array.from({ length: 6 })
      .map(
        (_, index) => `
          <article class="check-card pending">
            <span class="check-icon"><i data-lucide="circle"></i></span>
            <div>
              <h3>Gate ${index + 1}</h3>
              <p>Waiting for a submission package.</p>
              <ul class="evidence-list"><li>Neutral</li></ul>
            </div>
          </article>
        `,
      )
      .join("");
    return;
  }

  els.checksGrid.innerHTML = checks
    .map(
      (check) => `
        <article class="check-card ${check.status}">
          <span class="check-icon"><i data-lucide="${statusIcon(check.status)}"></i></span>
          <div>
            <h3>${escapeHtml(check.title)}</h3>
            <p><strong>${statusLabel(check.status)}.</strong> ${escapeHtml(check.reason)}</p>
            <ul class="evidence-list">
              ${(check.evidence?.length ? check.evidence : ["No evidence captured yet."])
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("")}
            </ul>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderInsights() {
  const analysis = state.analysis;
  if (!analysis) {
    els.insightStrip.innerHTML = `
      <div class="metric-card">
        <span>Track</span>
        <strong>${state.track === "research" ? "Research" : "Applied"}</strong>
        <small>Select the target ICDM 2026 track before analysis.</small>
      </div>
      <div class="metric-card">
        <span>Deadline</span>
        <strong>June 6</strong>
        <small>Official deadline is interpreted as 11:59 PM AoE.</small>
      </div>
      <div class="metric-card">
        <span>Policy</span>
        <strong>${state.track === "research" ? "Triple-blind" : "Single-blind"}</strong>
        <small>Policy changes with the selected track.</small>
      </div>
    `;
    return;
  }

  els.insightStrip.innerHTML = `
    <div class="metric-card">
      <span>PDF pages</span>
      <strong>${analysis.pageCount ?? "n/a"}</strong>
      <small>${escapeHtml(analysis.paperPdfName || "No parsed PDF")}</small>
    </div>
    <div class="metric-card">
      <span>Column signal</span>
      <strong>${Math.round((analysis.twoColumnScore || 0) * 100)}%</strong>
      <small>${analysis.ieeeTexDetected ? "IEEEtran detected in source files." : "Estimated from PDF text layout."}</small>
    </div>
    <div class="metric-card">
      <span>Scope hits</span>
      <strong>${analysis.scopeHits.length}</strong>
      <small>${escapeHtml(analysis.scopeHits.slice(0, 5).join(", ") || "No strong keyword match")}</small>
    </div>
    <div class="metric-card">
      <span>Anonymity flags</span>
      <strong>${analysis.identityFlags.length}</strong>
      <small>${escapeHtml(analysis.identityFlags.slice(0, 2).join("; ") || "No obvious flag found")}</small>
    </div>
  `;
}

function renderEvidence() {
  els.evidenceGrid.innerHTML = JUSTIFICATIONS.map(
    (item) => `
      <article class="evidence-card">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.why)}</p>
        <p>${escapeHtml(item.evidence)}</p>
        <a href="${item.source.url}" target="_blank" rel="noreferrer">
          <i data-lucide="external-link"></i>
          ${escapeHtml(item.source.label)}
        </a>
      </article>
    `,
  ).join("");
}

function render() {
  const visibleChecks = getVisibleChecks();
  const score = getScore(visibleChecks);
  const verdict = getVerdict(visibleChecks);
  els.scoreRing.style.setProperty("--score", score);
  els.scoreValue.textContent = `${score}%`;
  els.verdictText.textContent = verdict.title;
  els.verdictDetail.textContent = verdict.detail;
  els.exportButton.disabled = !state.analysis || state.busy;
  els.analyzeButton.disabled = state.busy;
  els.analyzeButton.innerHTML = state.busy
    ? `<i data-lucide="loader-2"></i> Checking`
    : `<i data-lucide="sparkles"></i> Analyze readiness`;
  els.deadlinePill.textContent = `Deadline: ${formatDateTime(new Date(AOE_DEADLINE_UTC))}`;
  renderFiles();
  renderManualItems();
  renderFlow(visibleChecks);
  renderChecks(visibleChecks);
  renderInsights();
  renderEvidence();
  hydrateIcons();
}

async function readTextFile(file) {
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(buffer);
}

async function renderFirstPage(pdf) {
  const page = await pdf.getPage(1);
  const natural = page.getViewport({ scale: 1 });
  const maxWidth = 360;
  const maxHeight = 330;
  const scale = Math.min(maxWidth / natural.width, maxHeight / natural.height);
  const viewport = page.getViewport({ scale });
  const canvas = els.paperPreview;
  const context = canvas.getContext("2d");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: context, viewport }).promise;
  canvas.style.display = "block";
  els.emptyPreview.style.display = "none";
}

function detectTwoColumn(pages) {
  const usablePages = pages.filter((page) => page.items.length > 24);
  if (!usablePages.length) return 0;
  let strongPages = 0;
  for (const page of usablePages) {
    let left = 0;
    let right = 0;
    for (const item of page.items) {
      const x = item.x / page.width;
      const chars = Math.max(1, item.text.length);
      if (x < 0.47) left += chars;
      if (x > 0.51) right += chars;
    }
    const ratio = Math.min(left, right) / Math.max(left, right, 1);
    if (ratio > 0.22 && left + right > 500) strongPages += 1;
  }
  return strongPages / usablePages.length;
}

function detectPageSize(pages) {
  if (!pages.length) return { label: "unknown", ok: false };
  const first = pages[0];
  const w = Math.round(first.width);
  const h = Math.round(first.height);
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  const letterLike = Math.abs(short - 612) < 28 && Math.abs(long - 792) < 28;
  const a4Like = Math.abs(short - 595) < 28 && Math.abs(long - 842) < 32;
  return {
    label: `${w} x ${h} pt`,
    ok: letterLike || a4Like,
  };
}

async function analyzePdf(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages = [];
  let fullText = "";
  const maxTextPages = Math.min(pdf.numPages, 14);

  for (let pageNumber = 1; pageNumber <= maxTextPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items = textContent.items
      .filter((item) => item.str && item.str.trim().length > 0)
      .map((item) => ({
        text: item.str,
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
      }));
    const pageText = normalizeText(items.map((item) => item.text).join(" "));
    fullText += `\n\n--- page ${pageNumber} ---\n${pageText}`;
    pages.push({
      number: pageNumber,
      width: viewport.width,
      height: viewport.height,
      text: pageText,
      items,
    });
  }

  await renderFirstPage(pdf);
  const metadata = await pdf.getMetadata().catch(() => null);
  return {
    pageCount: pdf.numPages,
    text: normalizeText(fullText),
    firstPageText: normalizeText(pages[0]?.text || ""),
    pages,
    twoColumnScore: detectTwoColumn(pages),
    pageSize: detectPageSize(pages),
    metadata,
  };
}

function inspectSources(text) {
  const ieeeTexDetected =
    /\\documentclass(?:\[[^\]]*conference[^\]]*\])?\{IEEEtran\}/i.test(text) ||
    /IEEEtran\.cls|IEEEtran/i.test(text);
  const authorBlock = text.match(/\\author\s*\{([\s\S]{0,600}?)\}/i)?.[1] || "";
  const hasAnonymousAuthor = /anonymous/i.test(authorBlock) || /\\author\s*\{\s*anonymous\s*\}/i.test(text);
  const referencesCount = (text.match(/\\bibitem\b|@\w+\s*\{/g) || []).length;
  return {
    ieeeTexDetected,
    authorBlock: normalizeText(authorBlock),
    hasAnonymousAuthor,
    referencesCount,
  };
}

function findScopeHits(text) {
  const dictionary = [
    "data mining",
    "machine learning",
    "deep learning",
    "federated learning",
    "multimodal",
    "multi-modal",
    "heterogeneous",
    "multimedia",
    "large language model",
    "large model",
    "graph",
    "streaming",
    "database",
    "big data",
    "privacy",
    "security",
    "recommendation",
    "visualization",
    "clustering",
    "classification",
    "anomaly",
    "knowledge discovery",
    "health informatics",
  ];
  const lower = text.toLowerCase();
  return dictionary.filter((keyword) => lower.includes(keyword));
}

function findIdentityFlags({ pdfText, firstPageText, sourceText, fileName, track }) {
  if (track !== "research") return [];
  const flags = [];
  const front = firstPageText.slice(0, 2600);
  const combined = `${front}\n${sourceText.slice(0, 4000)}`;
  const fileLower = fileName.toLowerCase();

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(combined)) {
    flags.push("Email-like author contact appears near the front matter.");
  }
  if (/\b(acknowledg(e)?ments?|funded by|grant no\.?|national science foundation|nsf)\b/i.test(pdfText)) {
    flags.push("Acknowledgment or funding language appears in the manuscript.");
  }
  if (
    /\b(university|institute|department|school of|college|laboratory|vinuni|hanoi|faculty of)\b/i.test(combined) &&
    !/anonymous/i.test(combined)
  ) {
    flags.push("Affiliation-like wording appears before the abstract.");
  }
  if (/\b(in our previous work|our earlier work|we previously|as we showed in)\b/i.test(pdfText)) {
    flags.push("Self-reference wording may reveal authorship.");
  }
  if (/\b(vinuni|university|author|smith|nguyen|tran|le|team|lab)\b/i.test(fileLower)) {
    flags.push("Filename may compromise Research Track anonymity.");
  }
  return flags;
}

function findReproSignals(text) {
  const signalGroups = [
    { label: "datasets", pattern: /\b(dataset|datasets|benchmark|benchmarks|publicly available)\b/i },
    { label: "code", pattern: /\b(code|repository|github|implementation)\b/i },
    { label: "hyperparameters", pattern: /\b(hyperparameter|learning rate|batch size|epochs|optimizer)\b/i },
    { label: "random seeds", pattern: /\b(seed|seeds|standard deviation|std\.?|confidence interval)\b/i },
    { label: "ablation", pattern: /\b(ablation|sensitivity|component analysis)\b/i },
    { label: "metrics", pattern: /\b(accuracy|auc|f1|precision|recall|rmse|mae|ece|brier)\b/i },
    { label: "algorithm detail", pattern: /\b(algorithm|pseudocode|proof|assumption|complexity)\b/i },
  ];
  return signalGroups.filter((item) => item.pattern.test(text)).map((item) => item.label);
}

async function analyzePackage() {
  const pdfs = state.files.filter((file) => /\.pdf$/i.test(file.name));
  const paperPdf =
    pdfs.find((file) => !/(checklist|reproduc)/i.test(file.name)) || pdfs[0] || null;
  const checklistFile = state.files.find((file) => /(checklist|reproduc)/i.test(file.name));
  const textFiles = state.files.filter((file) => /\.(tex|bib|txt)$/i.test(file.name));
  let sourceText = "";
  for (const file of textFiles) {
    sourceText += `\n\n--- ${file.name} ---\n${await readTextFile(file)}`;
  }

  if (!paperPdf) {
    return {
      error: "A PDF paper file is required for page count and layout checks.",
      analysis: null,
    };
  }

  const pdf = await analyzePdf(paperPdf);
  const source = inspectSources(sourceText);
  const combinedText = normalizeText(`${pdf.text}\n${sourceText}`);
  const scopeHits = findScopeHits(combinedText);
  const reproSignals = findReproSignals(combinedText);
  const checklistDetected =
    Boolean(checklistFile) || /reproducibility checklist|reproducibility questionnaire/i.test(combinedText);
  const hasAnonymousMarker = /anonymous/i.test(pdf.firstPageText.slice(0, 2200)) || source.hasAnonymousAuthor;
  const identityFlags = findIdentityFlags({
    pdfText: pdf.text,
    firstPageText: pdf.firstPageText,
    sourceText,
    fileName: paperPdf.name,
    track: state.track,
  });

  return {
    error: "",
    analysis: {
      paperPdfName: paperPdf.name,
      pageCount: pdf.pageCount,
      textLength: combinedText.length,
      firstPageText: pdf.firstPageText,
      twoColumnScore: pdf.twoColumnScore,
      pageSize: pdf.pageSize,
      ieeeTexDetected: source.ieeeTexDetected,
      sourceAuthorBlock: source.authorBlock,
      hasAnonymousMarker,
      identityFlags,
      checklistDetected,
      checklistFileName: checklistFile?.name || "",
      referencesCount: source.referencesCount,
      scopeHits,
      reproSignals,
      metadataTitle: pdf.metadata?.info?.Title || "",
      metadataAuthor: pdf.metadata?.info?.Author || "",
    },
  };
}

function buildChecks(analysis) {
  if (!analysis) {
    return [
      {
        title: "PDF paper uploaded",
        group: "intake",
        status: "fail",
        blocking: true,
        reason: "No parsable paper PDF was found.",
        evidence: ["Upload the full paper PDF."],
      },
    ];
  }

  const now = Date.now();
  const beforeDeadline = now <= AOE_DEADLINE_UTC;
  const formatPass =
    analysis.ieeeTexDetected ||
    (analysis.twoColumnScore >= 0.45 && analysis.pageSize.ok) ||
    state.manual.portalReady;
  const pageLimitPass = analysis.pageCount <= 10;
  const research = state.track === "research";
  const anonymityPass =
    !research ||
    (analysis.identityFlags.length === 0 &&
      (analysis.hasAnonymousMarker || state.manual.portalReady || state.manual.authorshipFinal));
  const reproducibilityPass = analysis.checklistDetected || state.manual.reproChecklist;
  const reproSignalsPass = analysis.reproSignals.length >= 4;
  const scopePass = analysis.scopeHits.length >= 2;

  return [
    {
      title: "Paper PDF is readable",
      group: "intake",
      status: "pass",
      blocking: true,
      reason: "The browser parsed the PDF package successfully.",
      evidence: [analysis.paperPdfName, `${analysis.pageCount} PDF pages`, `${analysis.textLength} text characters`],
    },
    {
      title: "Submission window",
      group: "intake",
      status: beforeDeadline ? "pass" : "fail",
      blocking: true,
      reason: beforeDeadline
        ? "The June 6, 2026 AoE deadline has not expired in this browser's current time."
        : "The June 6, 2026 AoE deadline has passed.",
      evidence: [
        `Now: ${formatDateTime(new Date(now))}`,
        `AoE cutoff: ${formatDateTime(new Date(AOE_DEADLINE_UTC))}`,
        SOURCE.research.label,
      ],
    },
    {
      title: "Track exclusivity",
      group: "intake",
      status: state.manual.trackExclusive ? "pass" : "fail",
      blocking: true,
      reason: state.manual.trackExclusive
        ? `Author confirmed this paper is targeting the ${research ? "Research" : "Applied"} Track only.`
        : "No author confirmation that the paper is not being submitted to another ICDM 2026 track.",
      evidence: [research ? "Research Track selected" : "Applied Track selected", SOURCE.applied.label],
    },
    {
      title: "Ten-page limit",
      group: "format",
      status: pageLimitPass ? "pass" : "fail",
      blocking: true,
      reason: pageLimitPass
        ? "The parsed PDF is within the official maximum."
        : "The parsed PDF exceeds the official maximum and risks rejection without review.",
      evidence: [`${analysis.pageCount} pages detected`, "Limit: 10 pages including references and appendices"],
    },
    {
      title: "IEEE two-column format",
      group: "format",
      status: formatPass ? "pass" : "fail",
      blocking: true,
      reason: formatPass
        ? "The package contains IEEEtran source or the PDF layout strongly resembles a two-column IEEE paper."
        : "The checker could not verify IEEE two-column formatting from the available files.",
      evidence: [
        analysis.ieeeTexDetected ? "IEEEtran detected in source" : `Two-column score: ${Math.round(analysis.twoColumnScore * 100)}%`,
        `Page size: ${analysis.pageSize.label}`,
        SOURCE.ieeeTemplate.label,
      ],
    },
    {
      title: research ? "Triple-blind manuscript" : "Single-blind policy",
      group: "policy",
      status: anonymityPass ? "pass" : "fail",
      blocking: true,
      reason: research
        ? anonymityPass
          ? "No obvious identity leak was found in front matter, acknowledgments, self-references, or filename."
          : "The Research Track requires concealed author identity; the checker found or could not rule out an anonymity issue."
        : "The Applied Track is single-blind, so visible author information is not treated as a blocker here.",
      evidence: research
        ? [
            analysis.hasAnonymousMarker ? "Anonymous marker detected" : "No explicit Anonymous marker detected",
            ...(analysis.identityFlags.length ? analysis.identityFlags : ["No obvious identity flag found"]),
          ]
        : ["Applied Track selected", SOURCE.applied.label],
    },
    {
      title: "Originality and no dual submission",
      group: "policy",
      status: state.manual.originality ? "pass" : "fail",
      blocking: true,
      reason: state.manual.originality
        ? "Author attestation captured."
        : "This condition cannot be proven from the PDF; author attestation is required.",
      evidence: [SOURCE.research.label, state.manual.originality ? "Confirmed by author" : "Awaiting author confirmation"],
    },
    {
      title: "ICDM scope fit",
      group: "policy",
      status: scopePass ? "pass" : "fail",
      blocking: true,
      reason: scopePass
        ? "The paper text matches multiple ICDM data mining topic signals."
        : "The checker found too few ICDM topic signals in the extracted text.",
      evidence: analysis.scopeHits.length
        ? analysis.scopeHits.slice(0, 8)
        : ["No strong data mining, ML, multimodal, heterogeneous, or systems signal detected"],
    },
    {
      title: "Reproducibility checklist",
      group: "repro",
      status: reproducibilityPass ? "pass" : "fail",
      blocking: true,
      reason: reproducibilityPass
        ? "A checklist file or author confirmation is present."
        : "Official guidelines require the reproducibility checklist at submission time.",
      evidence: [
        analysis.checklistFileName || (analysis.checklistDetected ? "Checklist text detected" : "No checklist file detected"),
        state.manual.reproChecklist ? "Confirmed by author" : "No manual confirmation",
      ],
    },
    {
      title: "Reproducible method detail",
      group: "repro",
      status: reproSignalsPass ? "pass" : "fail",
      blocking: false,
      reason: reproSignalsPass
        ? "The manuscript includes several reproducibility signals reviewers can inspect."
        : "The paper may need clearer method, data, seed, hyperparameter, or evaluation details.",
      evidence: analysis.reproSignals.length ? analysis.reproSignals : ["No strong reproducibility signals found"],
    },
    {
      title: "CyberChair route",
      group: "submit",
      status: state.manual.portalReady ? "pass" : "fail",
      blocking: true,
      reason: state.manual.portalReady
        ? "Author confirmed the submission route is prepared."
        : "The official CFP requires electronic submission through the online system.",
      evidence: [SOURCE.cyberchair.label, research ? "Research Track metadata" : "Applied Track metadata"],
    },
    {
      title: "Acceptance-stage readiness",
      group: "submit",
      status: state.manual.authorshipFinal && state.manual.attendancePlan ? "pass" : "fail",
      blocking: false,
      reason:
        state.manual.authorshipFinal && state.manual.attendancePlan
          ? "Author/title and attendance confirmations are captured."
          : "These are not submission blockers, but they matter immediately after acceptance.",
      evidence: [
        state.manual.authorshipFinal ? "Author list and title reviewed" : "Author/title confirmation missing",
        state.manual.attendancePlan ? "Attendance plan confirmed" : "Attendance plan missing",
      ],
    },
  ];
}

async function runAnalysis() {
  state.busy = true;
  state.error = "";
  state.checks = [];
  state.revealIndex = 0;
  render();

  try {
    const { analysis, error } = await analyzePackage();
    state.analysis = analysis;
    state.error = error;
    state.checks = buildChecks(analysis);
    state.revealIndex = 0;
    render();
    if (!analysis) {
      state.busy = false;
      state.revealIndex = state.checks.length;
      render();
      return;
    }
    for (let i = 0; i <= state.checks.length; i += 1) {
      state.revealIndex = i;
      render();
      await delay(i === 0 ? 120 : 210);
    }
  } catch (error) {
    console.error(error);
    state.analysis = null;
    state.error = error?.message || "The PDF could not be parsed.";
    state.checks = [];
  } finally {
    state.busy = false;
    state.revealIndex = state.checks.length;
    render();
  }
}

function exportReport() {
  if (!state.analysis) return;
  const visible = state.checks;
  const verdict = getVerdict(visible);
  const lines = [
    "# ICDM 2026 Submission Readiness Report",
    "",
    `Track: ${state.track === "research" ? "Research Track" : "Applied Track"}`,
    `Verdict: ${verdict.title}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Checks",
    "",
    ...visible.flatMap((check) => [
      `### ${statusLabel(check.status)}: ${check.title}`,
      "",
      check.reason,
      "",
      "Evidence:",
      ...check.evidence.map((item) => `- ${item}`),
      "",
    ]),
    "## Official Sources",
    "",
    ...Object.values(SOURCE).map((source) => `- ${source.label}: ${source.url}`),
    "",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "icdm-2026-readiness-report.md";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetState() {
  state.files = [];
  state.analysis = null;
  state.checks = [];
  state.revealIndex = 0;
  state.error = "";
  els.fileInput.value = "";
  const context = els.paperPreview.getContext("2d");
  context.clearRect(0, 0, els.paperPreview.width, els.paperPreview.height);
  els.paperPreview.style.display = "none";
  els.emptyPreview.style.display = "grid";
  render();
}

function setFiles(fileList) {
  state.files = Array.from(fileList).filter((file) => /\.(pdf|tex|bib|txt)$/i.test(file.name));
  state.analysis = null;
  state.checks = [];
  state.revealIndex = 0;
  state.error = "";
  render();
}

function bindEvents() {
  document.querySelectorAll("input[name='track']").forEach((input) => {
    input.addEventListener("change", () => {
      state.track = input.value;
      if (state.analysis) {
        state.checks = buildChecks(state.analysis);
        state.revealIndex = state.checks.length;
      }
      render();
    });
  });

  els.fileInput.addEventListener("change", (event) => setFiles(event.target.files));
  els.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.dropzone.classList.add("dragover");
  });
  els.dropzone.addEventListener("dragleave", () => els.dropzone.classList.remove("dragover"));
  els.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    els.dropzone.classList.remove("dragover");
    setFiles(event.dataTransfer.files);
  });
  els.analyzeButton.addEventListener("click", runAnalysis);
  els.exportButton.addEventListener("click", exportReport);
  els.resetButton.addEventListener("click", resetState);
  els.manualList.addEventListener("change", (event) => {
    const key = event.target?.dataset?.manual;
    if (!key) return;
    state.manual[key] = event.target.checked;
    if (state.analysis) {
      state.checks = buildChecks(state.analysis);
      state.revealIndex = state.checks.length;
    }
    render();
  });
}

function drawSignalCanvas() {
  const canvas = els.signalCanvas;
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let frame = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function loop() {
    frame += 0.006;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "rgba(0, 127, 115, 0.12)";
    ctx.lineWidth = 1;
    const spacing = 58;
    for (let x = -spacing; x < width + spacing; x += spacing) {
      ctx.beginPath();
      for (let y = -20; y < height + 20; y += 18) {
        const wave = Math.sin(y * 0.012 + frame + x * 0.01) * 8;
        if (y === -20) ctx.moveTo(x + wave, y);
        else ctx.lineTo(x + wave, y);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 18; i += 1) {
      const x = ((i * 137 + frame * 3000) % (width + 180)) - 90;
      const y = 80 + ((i * 89) % Math.max(220, height - 120));
      ctx.fillStyle = i % 3 === 0 ? "rgba(43, 105, 199, 0.13)" : "rgba(181, 106, 19, 0.12)";
      ctx.fillRect(x, y, 18 + (i % 4) * 8, 2);
    }
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", resize);
  loop();
}

bindEvents();
drawSignalCanvas();
render();
