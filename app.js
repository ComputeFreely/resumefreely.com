const STORAGE_KEY = "resumefreely.document.v1";

const templates = {
  ats: {
    label: "ATS Classic",
    note: "Single-column layout with conservative headings and no sidebars.",
  },
  modern: {
    label: "Modern Compact",
    note: "Two-column visual balance while keeping all content as selectable text.",
  },
  technical: {
    label: "Technical",
    note: "Skills and projects move higher for engineering and product roles.",
  },
  student: {
    label: "Student",
    note: "Education and projects move up for internships and early-career roles.",
  },
  executive: {
    label: "Executive",
    note: "Centered header and stronger summary treatment for senior roles.",
  },
};

const fontPairs = {
  system: {
    label: "ATS safe system",
    note: "Uses familiar installed sans-serif fonts like Aptos, Arial, Helvetica, or Segoe UI.",
  },
  carlito: {
    label: "Carlito",
    note: "Calibri-like open font with a familiar corporate resume feel and efficient spacing.",
  },
  classic: {
    label: "Source Serif + Sans",
    note: "A coordinated Adobe serif/sans family for a polished traditional document.",
  },
  garamond: {
    label: "EB Garamond + Carlito",
    note: "Formal serif tone for academic, legal, editorial, and executive resumes.",
  },
  technical: {
    label: "IBM Plex Sans + Mono",
    note: "Precise technical style with coordinated sans text and mono metadata.",
  },
  accessible: {
    label: "Atkinson Hyperlegible",
    note: "High-legibility letterforms for a clear, practical, accessible resume.",
  },
};

const actionVerbs = [
  "achieved",
  "automated",
  "built",
  "created",
  "delivered",
  "designed",
  "drove",
  "improved",
  "increased",
  "launched",
  "led",
  "managed",
  "migrated",
  "optimized",
  "reduced",
  "shipped",
  "streamlined",
];

let state = loadState();
let activeMode = "resume";
let saveTimer = null;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  hydrateTemplateControls();
  renderEditor();
  renderPreview();
  renderChecks();
  bindEvents();
});

function cacheElements() {
  [
    "saveStatus",
    "resumeEditor",
    "letterEditor",
    "basicsFields",
    "summaryInput",
    "experienceList",
    "projectsList",
    "educationList",
    "skillsList",
    "certificationsList",
    "letterFields",
    "letterBodyInput",
    "printCurrentButton",
    "templateSelect",
    "fontPairSelect",
    "densitySelect",
    "accentInput",
    "templateNotes",
    "scoreBadge",
    "checkList",
    "resumePreview",
    "letterPreview",
    "pagePreviewWrap",
    "documentMeta",
    "importInput",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;

    if (target.dataset.path) {
      setPath(target.dataset.path, target.value);
      afterEdit();
      return;
    }

    if (target.dataset.section && target.dataset.field) {
      const section = target.dataset.section;
      const index = Number(target.dataset.index);
      const field = target.dataset.field;
      if (state.resume[section] && state.resume[section][index]) {
        state.resume[section][index][field] = target.value;
        afterEdit();
      }
    }
  });

  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    if (!button) return;

    if (button.dataset.add) {
      addEntry(button.dataset.add);
      return;
    }

    if (button.dataset.remove) {
      removeEntry(button.dataset.remove, Number(button.dataset.index));
      return;
    }

    if (button.dataset.move) {
      moveEntry(button.dataset.move, Number(button.dataset.index), Number(button.dataset.delta));
      return;
    }
  });

  els.printCurrentButton.addEventListener("click", () => printDocument(activeMode));
  document.getElementById("copyTextButton").addEventListener("click", copyActiveText);
  document.getElementById("exportButton").addEventListener("click", exportJson);
  document.getElementById("sampleButton").addEventListener("click", () => replaceState(sampleState(), "Sample loaded"));
  document.getElementById("blankButton").addEventListener("click", () => replaceState(blankState(), "Blank draft ready"));
  document.getElementById("clearStorageButton").addEventListener("click", clearLocalDraft);

  els.templateSelect.addEventListener("change", () => {
    state.settings.template = els.templateSelect.value;
    afterEdit();
    renderTemplateNote();
  });
  els.fontPairSelect.addEventListener("change", () => {
    state.settings.fontPair = els.fontPairSelect.value;
    afterEdit();
    renderTemplateNote();
  });
  els.densitySelect.addEventListener("change", () => {
    state.settings.density = els.densitySelect.value;
    afterEdit();
  });
  els.accentInput.addEventListener("input", () => {
    state.settings.accent = els.accentInput.value;
    afterEdit();
  });

  els.importInput.addEventListener("change", importJson);

  window.addEventListener("afterprint", () => {
    document.body.removeAttribute("data-print-mode");
  });
}

function hydrateTemplateControls() {
  els.templateSelect.innerHTML = Object.entries(templates)
    .map(([value, template]) => `<option value="${value}">${escapeHtml(template.label)}</option>`)
    .join("");
  els.fontPairSelect.innerHTML = Object.entries(fontPairs)
    .map(([value, fontPair]) => `<option value="${value}">${escapeHtml(fontPair.label)}</option>`)
    .join("");
  els.templateSelect.value = state.settings.template;
  els.fontPairSelect.value = state.settings.fontPair;
  els.densitySelect.value = state.settings.density;
  els.accentInput.value = state.settings.accent;
  renderTemplateNote();
}

function renderEditor() {
  renderBasics();
  els.summaryInput.value = state.resume.summary || "";
  renderCollection("experience", els.experienceList, renderExperienceEntry);
  renderCollection("projects", els.projectsList, renderProjectEntry);
  renderCollection("education", els.educationList, renderEducationEntry);
  renderCollection("skills", els.skillsList, renderSkillEntry);
  renderCollection("certifications", els.certificationsList, renderCertificationEntry);
  renderLetterFields();
  els.letterBodyInput.value = state.letter.body || "";
}

function renderBasics() {
  const fields = [
    ["name", "Name"],
    ["headline", "Target role"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["location", "Location"],
    ["website", "Website"],
    ["linkedin", "LinkedIn"],
    ["github", "GitHub or portfolio"],
  ];

  els.basicsFields.innerHTML = fields
    .map(([key, label]) => fieldHtml(label, state.resume.basics[key], `resume.basics.${key}`))
    .join("");
}

function renderLetterFields() {
  const fields = [
    ["company", "Company"],
    ["role", "Role"],
    ["hiringManager", "Hiring manager"],
    ["date", "Date"],
    ["city", "Your city"],
    ["recipientLocation", "Company location"],
  ];

  els.letterFields.innerHTML = fields
    .map(([key, label]) => fieldHtml(label, state.letter[key], `letter.${key}`))
    .join("");
}

function renderCollection(section, container, renderer) {
  const entries = state.resume[section] || [];
  if (!entries.length) {
    container.innerHTML = `<p class="empty-entry">No ${sectionLabel(section).toLowerCase()} yet.</p>`;
    return;
  }
  container.innerHTML = entries.map((entry, index) => renderer(entry, index)).join("");
}

function renderExperienceEntry(entry, index) {
  return entryShell("experience", index, entry.role || "Experience", `
    <div class="field-grid two">
      ${collectionField("experience", index, "role", "Role", entry.role)}
      ${collectionField("experience", index, "company", "Company", entry.company)}
      ${collectionField("experience", index, "location", "Location", entry.location)}
      ${collectionField("experience", index, "dates", "Dates", entry.dates)}
    </div>
    ${collectionTextarea("experience", index, "bullets", "Impact bullets", entry.bullets, 5)}
  `);
}

function renderProjectEntry(entry, index) {
  return entryShell("projects", index, entry.name || "Project", `
    <div class="field-grid two">
      ${collectionField("projects", index, "name", "Project", entry.name)}
      ${collectionField("projects", index, "role", "Context", entry.role)}
      ${collectionField("projects", index, "link", "Link", entry.link)}
      ${collectionField("projects", index, "dates", "Dates", entry.dates)}
    </div>
    ${collectionTextarea("projects", index, "bullets", "Project bullets", entry.bullets, 4)}
  `);
}

function renderEducationEntry(entry, index) {
  return entryShell("education", index, entry.school || "Education", `
    <div class="field-grid two">
      ${collectionField("education", index, "school", "School", entry.school)}
      ${collectionField("education", index, "degree", "Degree", entry.degree)}
      ${collectionField("education", index, "location", "Location", entry.location)}
      ${collectionField("education", index, "dates", "Dates", entry.dates)}
    </div>
    ${collectionTextarea("education", index, "details", "Details", entry.details, 3)}
  `);
}

function renderSkillEntry(entry, index) {
  return entryShell("skills", index, entry.name || "Skill group", `
    <div class="field-grid two">
      ${collectionField("skills", index, "name", "Group", entry.name)}
      ${collectionField("skills", index, "items", "Skills", entry.items)}
    </div>
  `);
}

function renderCertificationEntry(entry, index) {
  return entryShell("certifications", index, entry.name || "Certification", `
    <div class="field-grid two">
      ${collectionField("certifications", index, "name", "Name", entry.name)}
      ${collectionField("certifications", index, "issuer", "Issuer", entry.issuer)}
      ${collectionField("certifications", index, "date", "Date", entry.date)}
      ${collectionField("certifications", index, "details", "Details", entry.details)}
    </div>
  `);
}

function entryShell(section, index, title, body) {
  const entries = state.resume[section] || [];
  return `
    <article class="entry-card">
      <div class="entry-head">
        <h3 class="entry-title">${escapeHtml(title)}</h3>
        <div class="entry-actions">
          <button class="mini-button" type="button" data-move="${section}" data-index="${index}" data-delta="-1" ${index === 0 ? "disabled" : ""}>Up</button>
          <button class="mini-button" type="button" data-move="${section}" data-index="${index}" data-delta="1" ${index === entries.length - 1 ? "disabled" : ""}>Down</button>
          <button class="mini-button danger" type="button" data-remove="${section}" data-index="${index}">Remove</button>
        </div>
      </div>
      ${body}
    </article>
  `;
}

function fieldHtml(label, value, path) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="text" value="${attr(value)}" data-path="${escapeHtml(path)}" autocomplete="off">
    </label>
  `;
}

function collectionField(section, index, field, label, value) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="text" value="${attr(value)}" data-section="${section}" data-index="${index}" data-field="${field}" autocomplete="off">
    </label>
  `;
}

function collectionTextarea(section, index, field, label, value, rows) {
  return `
    <label class="field full">
      <span>${escapeHtml(label)}</span>
      <textarea rows="${rows}" data-section="${section}" data-index="${index}" data-field="${field}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderPreview() {
  renderResumePreview();
  renderLetterPreview();
  els.documentMeta.textContent = activeMode === "resume" ? "Resume" : "Cover letter";
  els.resumePreview.hidden = activeMode !== "resume";
  els.letterPreview.hidden = activeMode !== "letter";
}

function renderResumePreview() {
  const { resume, settings } = state;
  const accent = safeColor(settings.accent);
  els.resumePreview.className = `resume-document ${settings.density} template-${settings.template} font-${settings.fontPair}`;
  els.resumePreview.style.setProperty("--doc-accent", accent);

  const contact = [
    resume.basics.email,
    resume.basics.phone,
    resume.basics.location,
    resume.basics.website,
    resume.basics.linkedin,
    resume.basics.github,
  ].filter(Boolean);

  const sectionHtml = {
    summary: summarySection(resume.summary),
    experience: experienceSection(resume.experience),
    projects: projectSection(resume.projects),
    education: educationSection(resume.education),
    skills: skillsSection(resume.skills),
    certifications: certificationSection(resume.certifications),
  };

  const sections = settings.template === "modern"
    ? modernResumeSections(sectionHtml)
    : [
      sectionHtml.summary,
      sectionHtml.experience,
      sectionHtml.projects,
      sectionHtml.education,
      sectionHtml.skills,
      sectionHtml.certifications,
    ].filter(Boolean).join("");

  els.resumePreview.innerHTML = `
    <header class="resume-header">
      <h1>${escapeHtml(resume.basics.name || "Your Name")}</h1>
      ${resume.basics.headline ? `<p class="resume-title">${escapeHtml(resume.basics.headline)}</p>` : ""}
      ${contact.length ? `<div class="contact-line">${contact.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
    </header>
    ${sections}
  `;
}

function modernResumeSections(sectionHtml) {
  const main = [sectionHtml.summary, sectionHtml.experience, sectionHtml.projects].filter(Boolean).join("");
  const side = [sectionHtml.skills, sectionHtml.education, sectionHtml.certifications].filter(Boolean).join("");
  return `
    ${main ? `<div class="resume-main-column">${main}</div>` : ""}
    ${side ? `<aside class="resume-side-column" aria-label="Skills, education, and certifications">${side}</aside>` : ""}
  `;
}

function summarySection(summary) {
  if (!trim(summary)) return "";
  return `
    <section class="resume-section" data-section="summary">
      <h2>Summary</h2>
      <p>${escapeHtml(summary)}</p>
    </section>
  `;
}

function experienceSection(entries) {
  const items = entries.filter((entry) => trim(entry.role) || trim(entry.company) || trim(entry.bullets));
  if (!items.length) return "";
  return `
    <section class="resume-section" data-section="experience">
      <h2>Experience</h2>
      ${items.map((entry) => resumeEntry({
        title: [entry.role, entry.company].filter(Boolean).join(", "),
        meta: entry.dates,
        subtitle: entry.location,
        bullets: entry.bullets,
      })).join("")}
    </section>
  `;
}

function projectSection(entries) {
  const items = entries.filter((entry) => trim(entry.name) || trim(entry.bullets));
  if (!items.length) return "";
  return `
    <section class="resume-section" data-section="projects">
      <h2>Projects</h2>
      ${items.map((entry) => resumeEntry({
        title: [entry.name, entry.role].filter(Boolean).join(" - "),
        meta: entry.dates,
        subtitle: entry.link,
        bullets: entry.bullets,
      })).join("")}
    </section>
  `;
}

function educationSection(entries) {
  const items = entries.filter((entry) => trim(entry.school) || trim(entry.degree));
  if (!items.length) return "";
  return `
    <section class="resume-section" data-section="education">
      <h2>Education</h2>
      ${items.map((entry) => resumeEntry({
        title: [entry.degree, entry.school].filter(Boolean).join(", "),
        meta: entry.dates,
        subtitle: [entry.location, entry.details].filter(Boolean).join(" - "),
        bullets: "",
      })).join("")}
    </section>
  `;
}

function skillsSection(entries) {
  const items = entries.filter((entry) => trim(entry.name) || trim(entry.items));
  if (!items.length) return "";
  return `
    <section class="resume-section" data-section="skills">
      <h2>Skills</h2>
      <div class="skill-grid">
        ${items.map((entry) => `
          <div class="skill-row">
            <strong>${escapeHtml(entry.name || "Skills")}</strong>
            <span>${escapeHtml(entry.items)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function certificationSection(entries) {
  const items = entries.filter((entry) => trim(entry.name) || trim(entry.issuer));
  if (!items.length) return "";
  return `
    <section class="resume-section" data-section="certifications">
      <h2>Certifications</h2>
      ${items.map((entry) => resumeEntry({
        title: [entry.name, entry.issuer].filter(Boolean).join(", "),
        meta: entry.date,
        subtitle: entry.details,
        bullets: "",
      })).join("")}
    </section>
  `;
}

function resumeEntry({ title, meta, subtitle, bullets }) {
  const bulletItems = lines(bullets);
  return `
    <article class="resume-entry">
      <div class="resume-entry-head">
        <h3>${escapeHtml(title || "Untitled")}</h3>
        ${meta ? `<span class="resume-entry-meta">${escapeHtml(meta)}</span>` : ""}
      </div>
      ${subtitle ? `<p class="resume-subtitle">${escapeHtml(subtitle)}</p>` : ""}
      ${bulletItems.length ? `<ul>${bulletItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </article>
  `;
}

function renderLetterPreview() {
  const { resume, letter, settings } = state;
  const accent = safeColor(settings.accent);
  els.letterPreview.className = `letter-document ${settings.density} font-${settings.fontPair}`;
  els.letterPreview.style.setProperty("--doc-accent", accent);
  const body = paragraphLines(letter.body || "");
  const recipient = [
    letter.hiringManager || "Hiring Team",
    letter.company,
    letter.recipientLocation,
  ].filter(Boolean);

  els.letterPreview.innerHTML = `
    <header class="letter-head">
      <h1>${escapeHtml(resume.basics.name || "Your Name")}</h1>
      <p class="letter-meta">${escapeHtml([resume.basics.email, resume.basics.phone, resume.basics.location].filter(Boolean).join(" / "))}</p>
    </header>
    <p class="letter-meta">${escapeHtml(letter.date || todayLabel())}</p>
    ${recipient.length ? `<p class="letter-recipient">${recipient.map(escapeHtml).join("<br>")}</p>` : ""}
    <p>Dear ${escapeHtml(letter.hiringManager || "Hiring Team")},</p>
    <div class="letter-body">
      ${body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    </div>
    <p>Sincerely,<br>${escapeHtml(resume.basics.name || "Your Name")}</p>
  `;
}

function renderChecks() {
  const checks = getChecks();
  const passed = checks.filter((check) => check.passed).length;
  els.scoreBadge.textContent = `${passed}/${checks.length}`;
  els.checkList.innerHTML = checks
    .map((check) => `<li class="${check.passed ? "" : check.level}">${escapeHtml(check.text)}</li>`)
    .join("");

  els.saveStatus.classList.toggle("danger", passed <= checks.length * 0.45);
  els.saveStatus.classList.toggle("warn", passed > checks.length * 0.45 && passed < checks.length * 0.75);
}

function getChecks() {
  const resume = state.resume;
  const allBullets = [
    ...resume.experience.flatMap((entry) => lines(entry.bullets)),
    ...resume.projects.flatMap((entry) => lines(entry.bullets)),
  ];
  const words = resumeWordCount();
  const actionCount = allBullets.filter((bullet) => actionVerbs.some((verb) => bullet.toLowerCase().startsWith(`${verb} `))).length;
  const metricCount = allBullets.filter((bullet) => /(\d|%|\$|x\b|minutes?|hours?|days?|weeks?|months?)/i.test(bullet)).length;
  const skillTerms = resume.skills.flatMap((entry) => `${entry.name} ${entry.items}`.split(/[,;/\n]+/)).map(trim).filter(Boolean);

  return [
    {
      passed: Boolean(trim(resume.basics.name) && (trim(resume.basics.email) || trim(resume.basics.phone))),
      level: "bad",
      text: "Add your name and at least one contact method.",
    },
    {
      passed: wordCount(resume.summary) >= 25 && wordCount(resume.summary) <= 85,
      level: "warn",
      text: "Keep the summary specific, usually 25 to 85 words.",
    },
    {
      passed: resume.experience.some((entry) => trim(entry.role) && trim(entry.company)),
      level: "bad",
      text: "Add at least one role with a title and organization.",
    },
    {
      passed: allBullets.length >= 4,
      level: "warn",
      text: "Use bullets for evidence; four or more is a good starting point.",
    },
    {
      passed: allBullets.length > 0 && actionCount / allBullets.length >= 0.5,
      level: "warn",
      text: "Start most bullets with clear action verbs.",
    },
    {
      passed: metricCount >= 2,
      level: "warn",
      text: "Add measurable impact where truthful: numbers, scale, speed, cost, or quality.",
    },
    {
      passed: skillTerms.length >= 8,
      level: "warn",
      text: "Include relevant skill keywords for the target role.",
    },
    {
      passed: words > 280 && words < 900,
      level: "warn",
      text: "Aim for enough substance without overloading the page.",
    },
  ];
}

function renderTemplateNote() {
  const template = templates[state.settings.template] || templates.ats;
  const fontPair = fontPairs[state.settings.fontPair] || fontPairs.classic;
  els.templateNotes.innerHTML = `
    <p class="template-note"><strong>${escapeHtml(template.label)}:</strong> ${escapeHtml(template.note)}</p>
    <p class="template-note"><strong>${escapeHtml(fontPair.label)}:</strong> ${escapeHtml(fontPair.note)}</p>
  `;
}

function setMode(mode) {
  activeMode = mode === "letter" ? "letter" : "resume";
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === activeMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.resumeEditor.hidden = activeMode !== "resume";
  els.letterEditor.hidden = activeMode !== "letter";
  renderPreview();
}

function afterEdit() {
  renderPreview();
  renderChecks();
  scheduleSave();
}

function scheduleSave() {
  els.saveStatus.textContent = "Saving";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      els.saveStatus.textContent = "Autosaved";
      els.saveStatus.classList.remove("danger");
    } catch {
      els.saveStatus.textContent = "Autosave unavailable";
      els.saveStatus.classList.add("danger");
    }
  }, 220);
}

function addEntry(section) {
  state.resume[section].push(newEntry(section));
  renderEditor();
  afterEdit();
}

function removeEntry(section, index) {
  state.resume[section].splice(index, 1);
  renderEditor();
  afterEdit();
}

function moveEntry(section, index, delta) {
  const entries = state.resume[section];
  const next = index + delta;
  if (next < 0 || next >= entries.length) return;
  const [entry] = entries.splice(index, 1);
  entries.splice(next, 0, entry);
  renderEditor();
  afterEdit();
}

function newEntry(section) {
  const defaults = {
    experience: { role: "", company: "", location: "", dates: "", bullets: "" },
    projects: { name: "", role: "", link: "", dates: "", bullets: "" },
    education: { school: "", degree: "", location: "", dates: "", details: "" },
    skills: { name: "", items: "" },
    certifications: { name: "", issuer: "", date: "", details: "" },
  };
  return { ...defaults[section] };
}

function replaceState(nextState, message) {
  state = normalizeState(nextState);
  hydrateTemplateControls();
  renderEditor();
  afterEdit();
  els.saveStatus.textContent = message;
}

function clearLocalDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Local storage can be disabled in locked-down browser contexts.
  }
  state = blankState();
  hydrateTemplateControls();
  renderEditor();
  renderPreview();
  renderChecks();
  els.saveStatus.textContent = "Local draft cleared";
}

function printDocument(mode) {
  setMode(mode);
  document.body.dataset.printMode = mode;
  window.print();
}

async function copyActiveText() {
  const text = activeMode === "letter" ? letterText() : resumeText();
  try {
    await navigator.clipboard.writeText(text);
    els.saveStatus.textContent = "Copied text";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    els.saveStatus.textContent = "Copied text";
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const name = (state.resume.basics.name || "resume").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
  link.href = url;
  link.download = `${name}-resumefreely.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  els.saveStatus.textContent = "JSON exported";
}

function importJson() {
  const [file] = els.importInput.files || [];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      replaceState(parsed, "JSON imported");
    } catch {
      els.saveStatus.textContent = "Import failed";
      els.saveStatus.classList.add("danger");
    } finally {
      els.importInput.value = "";
    }
  });
  reader.readAsText(file);
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeState(JSON.parse(stored));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return sampleState();
}

function normalizeState(input) {
  input = input && typeof input === "object" ? input : {};
  const base = blankState();
  const merged = {
    settings: { ...base.settings, ...(input.settings || {}) },
    resume: {
      basics: { ...base.resume.basics, ...((input.resume && input.resume.basics) || {}) },
      summary: (input.resume && input.resume.summary) || base.resume.summary,
      experience: normalizeArray(input.resume && input.resume.experience, "experience"),
      projects: normalizeArray(input.resume && input.resume.projects, "projects"),
      education: normalizeArray(input.resume && input.resume.education, "education"),
      skills: normalizeArray(input.resume && input.resume.skills, "skills"),
      certifications: normalizeArray(input.resume && input.resume.certifications, "certifications"),
    },
    letter: { ...base.letter, ...(input.letter || {}) },
  };
  merged.settings.template = templates[merged.settings.template] ? merged.settings.template : "ats";
  merged.settings.fontPair = fontPairs[merged.settings.fontPair] ? merged.settings.fontPair : "carlito";
  merged.settings.density = ["compact", "standard", "roomy"].includes(merged.settings.density) ? merged.settings.density : "standard";
  merged.settings.accent = safeColor(merged.settings.accent);
  return merged;
}

function normalizeArray(value, section) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({ ...newEntry(section), ...(entry || {}) }));
}

function blankState() {
  return {
    settings: {
      template: "ats",
      fontPair: "carlito",
      density: "standard",
      accent: "#0f948c",
    },
    resume: {
      basics: {
        name: "",
        headline: "",
        email: "",
        phone: "",
        location: "",
        website: "",
        linkedin: "",
        github: "",
      },
      summary: "",
      experience: [],
      projects: [],
      education: [],
      skills: [],
      certifications: [],
    },
    letter: {
      company: "",
      role: "",
      hiringManager: "",
      date: todayLabel(),
      city: "",
      recipientLocation: "",
      body: "",
    },
  };
}

function sampleState() {
  return {
    settings: {
      template: "ats",
      fontPair: "carlito",
      density: "standard",
      accent: "#0f948c",
    },
    resume: {
      basics: {
        name: "Jordan Lee",
        headline: "Product Operations Manager",
        email: "jordan@example.com",
        phone: "(555) 014-2088",
        location: "Seattle, WA",
        website: "jordanlee.example",
        linkedin: "linkedin.com/in/jordanlee",
        github: "",
      },
      summary: "Product operations manager with 7 years of experience improving launch workflows, customer feedback loops, and cross-functional planning. Known for turning ambiguous goals into reliable systems, reducing manual work, and helping product, design, engineering, and support teams make faster decisions with better data.",
      experience: [
        {
          role: "Product Operations Manager",
          company: "Northstar Labs",
          location: "Seattle, WA",
          dates: "2022 - Present",
          bullets: "Reduced quarterly launch planning cycle time by 34% by replacing ad hoc spreadsheets with a reusable intake and readiness system.\nBuilt a voice-of-customer tagging model used by 6 product teams to prioritize roadmap themes from 12,000 support tickets.\nLed cross-functional release reviews for 18 major launches with product, engineering, marketing, legal, and support stakeholders.",
        },
        {
          role: "Senior Program Manager",
          company: "Brightline Software",
          location: "Remote",
          dates: "2019 - 2022",
          bullets: "Automated weekly executive reporting and saved 8 hours per week across product operations and analytics.\nImproved beta feedback response time from 5 days to 36 hours by creating a triage workflow and ownership rubric.\nManaged migration of 42 internal teams to a unified roadmap process with documented milestones and risk checkpoints.",
        },
      ],
      projects: [
        {
          name: "Launch Health Dashboard",
          role: "Product analytics",
          link: "portfolio.example/launch-health",
          dates: "2024",
          bullets: "Created a launch readiness score combining adoption, support volume, customer sentiment, and blocked dependencies.\nShipped dashboard with role-based views for executives, product leads, and support managers.",
        },
      ],
      education: [
        {
          school: "University of Washington",
          degree: "B.A. Business Administration",
          location: "Seattle, WA",
          dates: "2015",
          details: "Coursework in operations, statistics, and organizational communication",
        },
      ],
      skills: [
        { name: "Product Ops", items: "launch readiness, roadmap operations, customer feedback systems, stakeholder management" },
        { name: "Tools", items: "SQL, Looker, Jira, Airtable, Notion, Zendesk, Salesforce" },
        { name: "Methods", items: "process design, KPI reporting, experiment tracking, change management" },
      ],
      certifications: [
        { name: "Certified Scrum Product Owner", issuer: "Scrum Alliance", date: "2021", details: "" },
      ],
    },
    letter: {
      company: "Acme Products",
      role: "Product Operations Lead",
      hiringManager: "Hiring Team",
      date: todayLabel(),
      city: "Seattle, WA",
      recipientLocation: "Remote",
      body: "I am excited to apply for the Product Operations Lead role at Acme Products. My background is strongest where product teams need clearer operating systems, better customer feedback loops, and launch processes that reduce risk without slowing good work.\n\nIn my current role, I reduced quarterly launch planning cycle time by 34%, built a voice-of-customer tagging model across 12,000 support tickets, and led readiness reviews for 18 major releases. I enjoy working across product, engineering, design, marketing, and support because durable product operations only work when every team can trust the process.\n\nI would value the chance to bring that operating discipline to Acme Products and help your teams ship with better visibility, stronger prioritization, and fewer last-minute surprises.",
    },
  };
}

function setPath(path, value) {
  const parts = path.split(".");
  let target = state;
  while (parts.length > 1) {
    target = target[parts.shift()];
  }
  target[parts[0]] = value;
}

function resumeText() {
  const r = state.resume;
  const chunks = [
    r.basics.name,
    r.basics.headline,
    [r.basics.email, r.basics.phone, r.basics.location, r.basics.website, r.basics.linkedin, r.basics.github].filter(Boolean).join(" | "),
    "",
    "SUMMARY",
    r.summary,
    "",
    "EXPERIENCE",
    ...r.experience.flatMap((entry) => [
      [entry.role, entry.company, entry.location, entry.dates].filter(Boolean).join(" | "),
      ...lines(entry.bullets).map((line) => `- ${line}`),
      "",
    ]),
    "PROJECTS",
    ...r.projects.flatMap((entry) => [
      [entry.name, entry.role, entry.link, entry.dates].filter(Boolean).join(" | "),
      ...lines(entry.bullets).map((line) => `- ${line}`),
      "",
    ]),
    "EDUCATION",
    ...r.education.map((entry) => [entry.degree, entry.school, entry.location, entry.dates, entry.details].filter(Boolean).join(" | ")),
    "",
    "SKILLS",
    ...r.skills.map((entry) => `${entry.name}: ${entry.items}`),
    "",
    "CERTIFICATIONS",
    ...r.certifications.map((entry) => [entry.name, entry.issuer, entry.date, entry.details].filter(Boolean).join(" | ")),
  ];
  return chunks.filter((line, index, array) => line || array[index - 1]).join("\n").trim();
}

function letterText() {
  const r = state.resume;
  const l = state.letter;
  return [
    r.basics.name,
    [r.basics.email, r.basics.phone, r.basics.location].filter(Boolean).join(" | "),
    "",
    l.date || todayLabel(),
    l.hiringManager || "Hiring Team",
    l.company,
    l.recipientLocation,
    "",
    `Dear ${l.hiringManager || "Hiring Team"},`,
    "",
    l.body,
    "",
    "Sincerely,",
    r.basics.name,
  ].filter(Boolean).join("\n");
}

function resumeWordCount() {
  return wordCount(resumeText());
}

function sectionLabel(section) {
  return {
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
  }[section] || section;
}

function lines(value) {
  return String(value || "")
    .split(/\n+/)
    .map(trim)
    .filter(Boolean);
}

function paragraphLines(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function trim(value) {
  return String(value || "").trim();
}

function todayLabel() {
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(new Date());
}

function safeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#0f948c";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function attr(value) {
  return escapeHtml(value);
}
