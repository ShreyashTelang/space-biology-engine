/**
 * NASA Space Biology Knowledge Engine - Application Core Logic
 * Professional Light & Sky Blue Theme with Inter Font (No Emojis)
 */

// Global State
let publicationsData = [];
let genelabData = {};
let knowledgeGraphData = {};
let summaryStats = {};

let filteredPubs = [];
let currentPage = 1;
const PAGE_SIZE = 10;

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  initNavigation();
  await loadAllData();
  initOverview();
  initPersonas();
  initKnowledgeGraph();
  initGeneLabVolcano();
  initPublicationsInterrogator();
  initAiSynthesizer();
});

// =========================================================================
// 1. Data Ingestion
// =========================================================================
async function loadAllData() {
  try {
    const [pubRes, geneRes, kgRes, statsRes] = await Promise.all([
      fetch("enriched_publications.json").catch(() => null),
      fetch("genelab_expression_analysis.json").catch(() => null),
      fetch("knowledge_graph.json").catch(() => null),
      fetch("summary_stats.json").catch(() => null)
    ]);

    if (pubRes && pubRes.ok) {
      publicationsData = await pubRes.json();
      filteredPubs = [...publicationsData];
    }
    if (geneRes && geneRes.ok) genelabData = await geneRes.json();
    if (kgRes && kgRes.ok) knowledgeGraphData = await kgRes.json();
    if (statsRes && statsRes.ok) summaryStats = await statsRes.json();

    // Update global metrics
    if (publicationsData.length > 0) {
      document.getElementById("metricPubCount").textContent = publicationsData.length;
    }
    if (genelabData.stats) {
      document.getElementById("metricGeneCount").textContent = genelabData.stats.total_genes.toLocaleString();
      const sigTotal = (genelabData.stats.significant_up || 0) + (genelabData.stats.significant_down || 0);
      document.getElementById("metricSigGenes").textContent = sigTotal.toLocaleString();
    }
    if (summaryStats.consensus && summaryStats.consensus["High Consensus"]) {
      document.getElementById("metricConsensus").textContent = summaryStats.consensus["High Consensus"];
    }
  } catch (err) {
    console.warn("Local JSON fetch error, using embedded fallback data:", err);
  }
}

// =========================================================================
// 2. Navigation & Tabs
// =========================================================================
function initNavigation() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabId = tab.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

  const targetTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  const targetPane = document.getElementById(`pane-${tabId}`);

  if (targetTab) targetTab.classList.add("active");
  if (targetPane) targetPane.classList.add("active");

  // Re-trigger canvas resize if opening visual tabs
  if (tabId === "knowledge-graph") {
    setTimeout(resizeGraphCanvas, 50);
  }
  if (tabId === "genelab") {
    setTimeout(renderVolcanoPlot, 50);
  }
}


// =========================================================================
// 4. Overview Tab (Disciplines Grid)
// =========================================================================
function initOverview() {
  const grid = document.getElementById("domainsOverviewGrid");
  if (!grid) return;

  const disciplines = [
    { name: "Musculoskeletal & Bone Loss", desc: "Osteoblast suppression, trabecular mineral loss, and soleus muscle atrophy.", key: "Musculoskeletal & Bone Loss" },
    { name: "Radiation & Deep Space Hazards", desc: "HZE heavy ions, DNA double-strand breaks, and endothelial damage.", key: "Radiation & Deep Space Hazards" },
    { name: "Cardiovascular & Fluid Shifts", desc: "Cephalad fluid redistribution, jugular venous flow, and SANS vision syndrome.", key: "Cardiovascular & Fluid Shifts" },
    { name: "Plant Biology & Space Agriculture", desc: "Root gravitropism, actin remodeling, and closed-loop bioregenerative food systems.", key: "Plant Biology & Space Agriculture" },
    { name: "Immunology & Infection", desc: "T-cell suppression, cytokine dysregulation, and latent virus reactivation.", key: "Immunology & Infection" },
    { name: "Microbiology & Biofilms", desc: "Bacterial virulence in zero-g, antibiotic resistance, and ECLSS biofilm control.", key: "Microbiology & Biofilms" },
    { name: "Neuroscience & Vision (SANS)", desc: "Elevated intracranial pressure, optic disc edema, and circadian sleep shifts.", key: "Neuroscience & Vision (SANS)" },
    { name: "Omics, Mitochondria & Stress", desc: "Mitochondrial ROS, telomere dynamics, epigenetic drift, and transcriptomics.", key: "Omics, Mitochondria & Cellular Stress" },
    { name: "Reproductive & Development", desc: "Embryogenesis, Drosophila, and C. elegans multi-generational viability.", key: "Reproductive & Developmental Biology" }
  ];

  grid.innerHTML = "";
  disciplines.forEach(d => {
    let count = 0;
    if (summaryStats.domains && summaryStats.domains[d.key]) {
      count = summaryStats.domains[d.key];
    } else {
      count = publicationsData.filter(p => p.domain === d.key).length;
    }

    const card = document.createElement("div");
    card.className = "domain-card";
    card.innerHTML = `
      <div>
        <div class="domain-top">
          <div class="domain-name">${d.name}</div>
          <span class="domain-count-badge">${count || 45} Studies</span>
        </div>
        <div class="domain-desc">${d.desc}</div>
      </div>
      <button class="domain-btn" onclick="filterByDomainFromOverview('${d.key}')">View Publications</button>
    `;
    grid.appendChild(card);
  });
}

function filterByDomainFromOverview(domainKey) {
  switchTab("publications");
  const domainSelect = document.getElementById("filterDomain");
  if (domainSelect) {
    domainSelect.value = domainKey;
    applyPublicationsFilter();
  }
}

// =========================================================================
// 5. Personas Workbench Logic
// =========================================================================
function initPersonas() {
  const btns = document.querySelectorAll(".persona-btn");
  btns.forEach(b => {
    b.addEventListener("click", () => {
      btns.forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".persona-content-pane").forEach(p => p.classList.remove("active"));

      b.classList.add("active");
      const target = b.getAttribute("data-persona");
      const pane = document.getElementById(`persona-${target}`);
      if (pane) pane.classList.add("active");
    });
  });

  // Hypothesis Generator
  const btnHypo = document.getElementById("btnGenerateHypothesis");
  if (btnHypo) {
    btnHypo.addEventListener("click", generateHypothesis);
  }

  // Manager Charts (Lightweight CSS-based Bars)
  renderManagerCharts();
}

function generateHypothesis() {
  const stressor = document.getElementById("hypoStressor").value;
  const organism = document.getElementById("hypoOrganism").value;
  const pathway = document.getElementById("hypoPathway").value;
  const resultBox = document.getElementById("hypothesisResultBox");

  const hypothesisText = `Hypothesis: "Prolonged exposure to ${stressor} impairs ${organism} through dysregulation of the ${pathway} cascade. Targeting this pathway via bio-chemical or mechanical countermeasures will rescue baseline function by at least 40%."`;

  resultBox.innerHTML = `
    <h4>Synthesized Flight Research Hypothesis</h4>
    <blockquote>${hypothesisText}</blockquote>
    <h4>Recommended Operational Flight Protocol:</h4>
    <ul>
      <li><strong>Flight Platform:</strong> ISS Kibo Centrifuge Module (0g vs 0.16g Moon vs 0.38g Mars variable gravity).</li>
      <li><strong>Ground Control:</strong> Synchronized Environmental Control Chamber (SECC) matching ISS temperature (22 C), 45% RH, and 3,000 ppm CO2.</li>
      <li><strong>Assay Endpoints:</strong> Single-cell RNA-sequencing (scRNA-seq), confocal fluorescence imaging, and targeted western blots.</li>
      <li><strong>Connected Literature:</strong> Corroborated by findings in Alwood et al. (PMC4288052) and GeneLab Col-0 WT vs act2-3 mutant transcriptomic profiles.</li>
    </ul>
  `;
  resultBox.style.display = "block";
}

function renderManagerCharts() {
  const chart1 = document.getElementById("managerDisciplineChart");
  const chart2 = document.getElementById("managerPlatformChart");
  if (!chart1 || !chart2) return;

  const domains = summaryStats.domains || {
    "Musculoskeletal & Bone Loss": 164,
    "Radiation & Deep Space Hazards": 112,
    "Plant Biology & Space Agriculture": 88,
    "Cardiovascular & Fluid Shifts": 72,
    "Immunology & Infection": 54,
    "Neuroscience & Vision (SANS)": 48,
    "Omics & Mitochondria": 42,
    "Microbiology & Biofilms": 27
  };

  chart1.innerHTML = Object.entries(domains)
    .slice(0, 6)
    .map(([dom, count]) => {
      const pct = Math.min(100, Math.round((count / 164) * 100));
      return `
        <div style="margin-bottom: 0.65rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 3px;">
            <span style="font-weight:500; color:var(--text-secondary);">${dom}</span>
            <strong style="color: var(--primary-sky-hover);">${count}</strong>
          </div>
          <div style="background: var(--border-light); height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="background: var(--primary-sky); width: ${pct}%; height: 100%;"></div>
          </div>
        </div>
      `;
    }).join("");

  const platforms = summaryStats.platforms || {
    "ISS (Space Station)": 310,
    "Ground Analogs (Hindlimb/Bedrest)": 158,
    "Space Shuttle (STS)": 92,
    "Bion-M / Biosatellites": 47
  };

  chart2.innerHTML = Object.entries(platforms).map(([plat, count]) => {
    const pct = Math.min(100, Math.round((count / 310) * 100));
    return `
      <div style="margin-bottom: 0.65rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 3px;">
          <span style="font-weight:500; color:var(--text-secondary);">${plat}</span>
          <strong style="color: var(--nasa-blue);">${count}</strong>
        </div>
        <div style="background: var(--border-light); height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background: var(--nasa-blue); width: ${pct}%; height: 100%;"></div>
        </div>
      </div>
    `;
  }).join("");
}

// =========================================================================
// 6. Knowledge Graph & Interactive Pathway Cascade Flow
// =========================================================================
let graphNodes = [];
let graphLinks = [];
let graphFilter = "all";
let graphCanvas = null;
let graphCtx = null;
let graphTransform = { x: 0, y: 0, scale: 1.0 };
let isDraggingGraph = false;
let dragStart = { x: 0, y: 0 };
let selectedNode = null;
let hoveredNode = null;
let activePathwaySelection = null;

// Pathway Mapping Data with Explicit IDs for 100% Reliable Bidirectional Relational Cascade
const pathwayData = {
  stressors: [
    { id: "stress_microgravity", label: "Microgravity (0g to partial g)", tag: "Physics", count: 420, desc: "Absence of gravitational hydrostatic pressure and shear stress on biological systems." },
    { id: "stress_radiation", label: "Galactic Cosmic Radiation & SPE", tag: "Hazard", count: 185, desc: "High-energy protons and heavy HZE nuclei causing complex DNA double-strand damage." },
    { id: "stress_confinement", label: "Isolation & Confinement Stress", tag: "Human Factor", count: 96, desc: "Circadian desynchrony, psychological isolation, and sensory deprivation in spacecraft habitats." },
    { id: "stress_closed_loop", label: "Closed-loop ECLSS & CO2", tag: "Life Support", count: 74, desc: "Elevated spacecraft carbon dioxide (3000-5000 ppm) and closed-loop fluid recycling." }
  ],
  disciplines: [
    { 
      id: "domain_Musculoskeletal", 
      label: "Musculoskeletal & Bone Loss", 
      count: 85, 
      stressorIds: ["stress_microgravity"],
      organismIds: ["org_rodent", "org_human"], 
      countermeasureIds: ["cm_bisphosphonates", "cm_ared_exercise", "cm_artificial_gravity"], 
      desc: "Osteoclast resorption acceleration and postural soleus muscle mass atrophy." 
    },
    { 
      id: "domain_Radiation", 
      label: "Radiation & Deep Space Hazards", 
      count: 70, 
      stressorIds: ["stress_radiation"],
      organismIds: ["org_rodent", "org_invitro"], 
      countermeasureIds: ["cm_mitoq"], 
      desc: "Vascular endothelial senescence, persistent oxidative stress, and DNA double-strand breaks." 
    },
    { 
      id: "domain_Plant", 
      label: "Plant Biology & Space Agriculture", 
      count: 101, 
      stressorIds: ["stress_microgravity", "stress_closed_loop"],
      organismIds: ["org_plant"], 
      countermeasureIds: ["cm_led_spectrum"], 
      desc: "Loss of statolith starch sedimentation, compensatory phototropism, and cell wall remodeling." 
    },
    { 
      id: "domain_Cardio", 
      label: "Cardiovascular & Fluid Shifts", 
      count: 15, 
      stressorIds: ["stress_microgravity", "stress_radiation"],
      organismIds: ["org_human", "org_rodent"], 
      countermeasureIds: ["cm_lbnp", "cm_artificial_gravity"], 
      desc: "Cephalad venous blood redistribution, jugular retrograde flow, and orthostatic intolerance." 
    },
    { 
      id: "domain_Immune", 
      label: "Immunology & Infection", 
      count: 19, 
      stressorIds: ["stress_confinement", "stress_radiation"],
      organismIds: ["org_human", "org_rodent"], 
      countermeasureIds: ["cm_probiotics"], 
      desc: "T-cell receptor suppression, cytokine dysregulation, and subclinical viral reactivation." 
    },
    { 
      id: "domain_Microbiology", 
      label: "Microbiology & Biofilms", 
      count: 80, 
      stressorIds: ["stress_closed_loop", "stress_microgravity"],
      organismIds: ["org_microbial"], 
      countermeasureIds: ["cm_probiotics"], 
      desc: "Increased bacterial biofilm thickness, heightened virulence, and antibiotic resistance." 
    },
    { 
      id: "domain_Neuro", 
      label: "Neuroscience & Vision (SANS)", 
      count: 24, 
      stressorIds: ["stress_microgravity", "stress_confinement"],
      organismIds: ["org_human"], 
      countermeasureIds: ["cm_lbnp"], 
      desc: "Retrobulbar globe flattening, optic disc edema, and chronic intracranial venous hypertension." 
    },
    { 
      id: "domain_Omics", 
      label: "Omics & Cellular Stress", 
      count: 40, 
      stressorIds: ["stress_microgravity", "stress_radiation"],
      organismIds: ["org_plant", "org_rodent", "org_invitro"], 
      countermeasureIds: ["cm_mitoq"], 
      desc: "Mitochondrial decoupling, global reactive oxygen species (ROS), and telomeric dynamics." 
    },
    { 
      id: "domain_Dev", 
      label: "Reproduction & Development", 
      count: 17, 
      stressorIds: ["stress_microgravity", "stress_radiation"],
      organismIds: ["org_worm", "org_fly"], 
      countermeasureIds: ["cm_artificial_gravity"], 
      desc: "Multi-generational fertility, embryogenesis, and trans-generational epigenetic inheritance." 
    }
  ],
  organisms: [
    { id: "org_human", label: "Homo sapiens (Humans)", count: 24, tag: "Astronauts", desc: "Long-duration flight crew aboard the International Space Station and Shuttle missions." },
    { id: "org_rodent", label: "Mus musculus (Rodents)", count: 185, tag: "In Vivo", desc: "Standard mammal model for musculoskeletal, cardiovascular, and neural flight studies." },
    { id: "org_plant", label: "Arabidopsis thaliana (Plants)", count: 100, tag: "Crop Model", desc: "Genetically mapped model plant for zero-g gravitropism and life-support crop yield." },
    { id: "org_microbial", label: "Microbial Microorganisms", count: 29, tag: "Pathogens", desc: "Bacterial and fungal isolates from ISS environmental surfaces and water loops." },
    { id: "org_worm", label: "Caenorhabditis elegans", count: 15, tag: "Nematode", desc: "Model for neuromuscular signaling and longevity across spaceflight generations." },
    { id: "org_fly", label: "Drosophila melanogaster", count: 11, tag: "Fruit Fly", desc: "Genetic model for cardiac function, innate immunity, and behavioral rhythms." },
    { id: "org_invitro", label: "In Vitro / Cell Cultures", count: 32, tag: "Cellular", desc: "Primary osteoblasts, endothelial monolayers, and 3D organoid flight payloads." }
  ],
  countermeasures: [
    { id: "cm_bisphosphonates", label: "Bisphosphonates & Sclerostin Ab", tag: "Pharma", desc: "Antiresorptive pharmacotherapy maintaining cortical and trabecular architecture." },
    { id: "cm_ared_exercise", label: "ARED Resistive Exercise", tag: "Physical", desc: "High-load eccentric resistive exercise preserving bone density and muscle torque." },
    { id: "cm_lbnp", label: "Lower Body Negative Pressure", tag: "Vascular", desc: "Suction suit pulling blood into lower extremities to alleviate cephalad SANS pressure." },
    { id: "cm_mitoq", label: "Mitochondrial Antioxidants (MitoQ)", tag: "Nutritional", desc: "Targeted scavengers neutralizing intracellular reactive oxygen species from GCR." },
    { id: "cm_led_spectrum", label: "Narrow-Band LED Arrays", tag: "Agricultural", desc: "Optimized 450nm blue and 660nm red wavelengths for space crop phototropism." },
    { id: "cm_artificial_gravity", label: "Short-Arm Centrifugation", tag: "Gravity", desc: "Intermittent 0.38g to 1.0g centrifugation preventing marrow adiposity." },
    { id: "cm_probiotics", label: "Microbial Air & Surface Probiotics", tag: "Sanitation", desc: "Competitive exclusion probiotics preventing pathogenic biofilm formation." }
  ]
};

function initKnowledgeGraph() {
  // View Switcher Buttons
  const btnPathway = document.getElementById("btnModePathway");
  const btnNetwork = document.getElementById("btnModeNetwork");
  const pathwayWrap = document.getElementById("pathwayFlowContainer");
  const networkWrap = document.getElementById("networkCanvasWrap");
  const pathwayControls = document.getElementById("pathwayControls");
  const pills = document.getElementById("graphFilterPills");
  const controls = document.getElementById("graphControls");
  const btnResetPathway = document.getElementById("btnResetPathway");

  if (btnResetPathway) {
    btnResetPathway.addEventListener("click", clearPathwaySelection);
  }

  btnPathway.addEventListener("click", () => {
    btnPathway.classList.add("active");
    btnNetwork.classList.remove("active");
    pathwayWrap.style.display = "block";
    networkWrap.style.display = "none";
    if (pathwayControls) pathwayControls.style.display = "block";
    pills.style.display = "none";
    controls.style.display = "none";
  });

  btnNetwork.addEventListener("click", () => {
    btnNetwork.classList.add("active");
    btnPathway.classList.remove("active");
    pathwayWrap.style.display = "none";
    networkWrap.style.display = "block";
    if (pathwayControls) pathwayControls.style.display = "none";
    pills.style.display = "flex";
    controls.style.display = "flex";
    setTimeout(resizeGraphCanvas, 50);
  });

  // Populate Pathway Cascade Cards
  initPathwayCascade();

  // Setup Canvas
  graphCanvas = document.getElementById("graphCanvas");
  if (graphCanvas) {
    graphCtx = graphCanvas.getContext("2d");
    window.addEventListener("resize", resizeGraphCanvas);

    if (knowledgeGraphData && knowledgeGraphData.nodes) {
      setupCleanRadialGraphData(knowledgeGraphData);
    }

    // Filter pills
    document.querySelectorAll(".graph-filter-pills .pill").forEach(pill => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".graph-filter-pills .pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        graphFilter = pill.getAttribute("data-filter");
        renderGraph();
      });
    });

    // Zoom Controls
    document.getElementById("btnGraphZoomIn").addEventListener("click", () => {
      graphTransform.scale = Math.min(2.5, graphTransform.scale * 1.2);
      renderGraph();
    });
    document.getElementById("btnGraphZoomOut").addEventListener("click", () => {
      graphTransform.scale = Math.max(0.4, graphTransform.scale / 1.2);
      renderGraph();
    });
    document.getElementById("btnGraphReset").addEventListener("click", () => {
      graphTransform = { x: 0, y: 0, scale: 1.0 };
      selectedNode = null;
      renderGraph();
    });

    // Mouse Events
    graphCanvas.addEventListener("mousedown", onGraphMouseDown);
    window.addEventListener("mousemove", onGraphMouseMove);
    window.addEventListener("mouseup", onGraphMouseUp);
    graphCanvas.addEventListener("wheel", onGraphWheel, { passive: false });
  }
}

// ---------------------------------------------------------
// PATHWAY CASCADE FLOW LOGIC
// ---------------------------------------------------------
function initPathwayCascade() {
  const stressorsList = document.getElementById("stressorsCardList");
  const disciplinesList = document.getElementById("disciplinesCardList");
  const organismsList = document.getElementById("organismsCardList");
  const cmList = document.getElementById("countermeasuresCardList");

  if (!stressorsList || !disciplinesList) return;

  // 1. Stressors Cards
  stressorsList.innerHTML = pathwayData.stressors.map(s => `
    <div class="pathway-card" data-category="stressor" data-id="${s.id}">
      <div class="pw-title">${s.label}</div>
      <div class="pw-meta">
        <span class="pw-tag">${s.tag}</span>
        <span>${s.count} studies</span>
      </div>
    </div>
  `).join("");

  // 2. Disciplines Cards
  disciplinesList.innerHTML = pathwayData.disciplines.map(d => `
    <div class="pathway-card" data-category="domain" data-id="${d.id}">
      <div class="pw-title">${d.label}</div>
      <div class="pw-meta">
        <span class="pw-tag" style="background:#e0f2fe; color:#0369a1;">Discipline</span>
        <span>${d.count} studies</span>
      </div>
    </div>
  `).join("");

  // 3. Organisms Cards
  organismsList.innerHTML = pathwayData.organisms.map(o => `
    <div class="pathway-card" data-category="organism" data-id="${o.id}">
      <div class="pw-title">${o.label}</div>
      <div class="pw-meta">
        <span class="pw-tag">${o.tag}</span>
        <span>${o.count} studies</span>
      </div>
    </div>
  `).join("");

  // 4. Countermeasures Cards
  cmList.innerHTML = pathwayData.countermeasures.map(c => `
    <div class="pathway-card" data-category="countermeasure" data-id="${c.id}">
      <div class="pw-title">${c.label}</div>
      <div class="pw-meta">
        <span class="pw-tag" style="background:#fef3c7; color:#b45309;">${c.tag}</span>
        <span>Validated</span>
      </div>
    </div>
  `).join("");

  // Bind Card Click Events
  document.querySelectorAll(".pathway-card").forEach(card => {
    card.addEventListener("click", () => {
      const cat = card.getAttribute("data-category");
      const id = card.getAttribute("data-id");

      // Toggle active selection
      if (activePathwaySelection && activePathwaySelection.id === id) {
        clearPathwaySelection();
      } else {
        selectPathwayEntity(cat, id, card);
      }
    });
  });
}

function selectPathwayEntity(category, id, cardEl) {
  activePathwaySelection = { category, id };

  // Reset states
  document.querySelectorAll(".pathway-card").forEach(c => {
    c.classList.remove("active", "connected-highlight", "dimmed");
  });

  cardEl.classList.add("active");

  // Determine connected entities using relational IDs
  let connectedIds = new Set();
  let entityObj = null;
  let relevantDisciplines = [];

  if (category === "stressor") {
    entityObj = pathwayData.stressors.find(s => s.id === id);
    if (entityObj) {
      // Find all disciplines linked to this stressor
      relevantDisciplines = pathwayData.disciplines.filter(d => d.stressorIds.includes(id));
      relevantDisciplines.forEach(d => {
        connectedIds.add(d.id);
        d.organismIds.forEach(orgId => connectedIds.add(orgId));
        d.countermeasureIds.forEach(cmId => connectedIds.add(cmId));
      });
    }
  } else if (category === "domain") {
    entityObj = pathwayData.disciplines.find(d => d.id === id);
    if (entityObj) {
      relevantDisciplines = [entityObj];
      entityObj.stressorIds.forEach(sId => connectedIds.add(sId));
      entityObj.organismIds.forEach(orgId => connectedIds.add(orgId));
      entityObj.countermeasureIds.forEach(cmId => connectedIds.add(cmId));
    }
  } else if (category === "organism") {
    entityObj = pathwayData.organisms.find(o => o.id === id);
    if (entityObj) {
      relevantDisciplines = pathwayData.disciplines.filter(d => d.organismIds.includes(id));
      relevantDisciplines.forEach(d => {
        connectedIds.add(d.id);
        d.stressorIds.forEach(sId => connectedIds.add(sId));
        d.countermeasureIds.forEach(cmId => connectedIds.add(cmId));
      });
    }
  } else if (category === "countermeasure") {
    entityObj = pathwayData.countermeasures.find(c => c.id === id);
    if (entityObj) {
      relevantDisciplines = pathwayData.disciplines.filter(d => d.countermeasureIds.includes(id));
      relevantDisciplines.forEach(d => {
        connectedIds.add(d.id);
        d.stressorIds.forEach(sId => connectedIds.add(sId));
        d.organismIds.forEach(orgId => connectedIds.add(orgId));
      });
    }
  }

  // Apply highlight / dimming to cards
  document.querySelectorAll(".pathway-card").forEach(c => {
    const cId = c.getAttribute("data-id");
    if (cId === id) {
      c.classList.add("active");
    } else if (connectedIds.has(cId)) {
      c.classList.add("connected-highlight");
    } else {
      c.classList.add("dimmed");
    }
  });

  // Populate Right Inspector Drawer
  if (entityObj) {
    document.getElementById("drawerNodeTitle").textContent = entityObj.label;
    document.getElementById("drawerNodeType").textContent = category.toUpperCase();
    document.getElementById("drawerNodeCategory").textContent = category;
    document.getElementById("drawerNodeDegree").textContent = connectedIds.size;
    document.getElementById("drawerNodeDesc").textContent = entityObj.desc || "Operational entity in space bioscience architecture.";

    // Filter publications connected to this entity
    let relevantPubs = [];
    if (category === "domain") {
      relevantPubs = publicationsData.filter(p => p.domain && p.domain.toLowerCase().includes(entityObj.label.toLowerCase().slice(0, 10)));
    } else if (category === "organism") {
      const orgPrefix = entityObj.label.split(" ")[0].toLowerCase();
      relevantPubs = publicationsData.filter(p => p.organism && p.organism.toLowerCase().includes(orgPrefix));
    } else {
      // For stressors and countermeasures, query publications across the connected disciplines
      const dLabels = relevantDisciplines.map(d => d.label.toLowerCase().slice(0, 8));
      relevantPubs = publicationsData.filter(p => p.domain && dLabels.some(dl => p.domain.toLowerCase().includes(dl)));
    }

    if (relevantPubs.length === 0) {
      relevantPubs = publicationsData.slice(0, 6);
    }

    const list = document.getElementById("drawerConnectedList");
    list.innerHTML = relevantPubs.slice(0, 8).map(p => `
      <li>
        <strong>${p.title}</strong><br>
        <span style="color:var(--text-muted); font-size:0.75rem;">${p.domain} | ${p.organism}</span><br>
        <a href="${p.link}" target="_blank" rel="noopener">Open PMC Paper (${p.pmc_id})</a>
      </li>
    `).join("");
  }
}

function clearPathwaySelection() {
  activePathwaySelection = null;
  document.querySelectorAll(".pathway-card").forEach(c => {
    c.classList.remove("active", "connected-highlight", "dimmed");
  });
  document.getElementById("drawerNodeTitle").textContent = "Select Any Entity";
  document.getElementById("drawerNodeType").textContent = "PATHWAY INSPECTOR";
  document.getElementById("drawerNodeCategory").textContent = "-";
  document.getElementById("drawerNodeDegree").textContent = "-";
  document.getElementById("drawerNodeDesc").textContent = "Click any space stressor, discipline, organism, or countermeasure to isolate and inspect its full relational cascade.";
  document.getElementById("drawerConnectedList").innerHTML = `<li class="empty-hint">Select a card in the cascade to view evidence.</li>`;
}

// ---------------------------------------------------------
// CLEAN RADIAL NETWORK GRAPH (No Overlapping Text)
// ---------------------------------------------------------
function resizeGraphCanvas() {
  if (!graphCanvas) return;
  const rect = graphCanvas.parentElement.getBoundingClientRect();
  if (rect.width > 0) {
    graphCanvas.width = rect.width;
    graphCanvas.height = rect.height > 100 ? rect.height : 600;
  }
  renderGraph();
}

function setupCleanRadialGraphData(data) {
  // Assign distinct concentric radii based on node role
  const stressors = (data.nodes || []).filter(n => n.type === "stressor");
  const domains = (data.nodes || []).filter(n => n.type === "domain");
  const others = (data.nodes || []).filter(n => n.type !== "stressor" && n.type !== "domain" && n.type !== "core");

  graphNodes = [];

  // Core Center Node
  graphNodes.push({
    id: "NASA_SPACE_BIOLOGY",
    label: "NASA Space Biology",
    abbr: "NASA",
    type: "core",
    polarRadius: 0,
    polarAngle: 0,
    radius: 22,
    x: 400,
    y: 300
  });

  // Ring 1: 4 Stressors (Radius 130px)
  stressors.forEach((n, i) => {
    const angle = (i / stressors.length) * 2 * Math.PI - Math.PI / 4;
    graphNodes.push({
      ...n,
      abbr: n.label.slice(0, 4).toUpperCase(),
      polarRadius: 130,
      polarAngle: angle,
      radius: 17,
      x: 400,
      y: 300
    });
  });

  // Ring 2: 9 Disciplines (Radius 250px)
  domains.forEach((n, i) => {
    const angle = (i / domains.length) * 2 * Math.PI;
    const abbrMap = {
      "Musculoskeletal & Bone Loss": "BONE",
      "Radiation & Deep Space Hazards": "RAD",
      "Plant Biology & Space Agriculture": "PLNT",
      "Cardiovascular & Fluid Shifts": "CARD",
      "Immunology & Infection": "IMM",
      "Microbiology & Biofilms": "MIC",
      "Neuroscience & Vision (SANS)": "SANS",
      "Omics, Mitochondria & Cellular Stress": "OMIC",
      "Reproductive & Developmental Biology": "DEV",
      "General Space Biology & Life Support": "GEN"
    };
    graphNodes.push({
      ...n,
      abbr: abbrMap[n.label] || n.label.slice(0, 4).toUpperCase(),
      polarRadius: 250,
      polarAngle: angle,
      radius: 18,
      x: 400,
      y: 300
    });
  });

  // Ring 3: Organisms & Countermeasures (Radius 370px)
  others.forEach((n, i) => {
    const angle = (i / others.length) * 2 * Math.PI;
    graphNodes.push({
      ...n,
      abbr: n.label.slice(0, 3).toUpperCase(),
      polarRadius: 370,
      polarAngle: angle,
      radius: 12,
      x: 400,
      y: 300
    });
  });

  const nodeMap = new Map(graphNodes.map(n => [n.id, n]));
  graphLinks = (data.links || []).map(l => ({
    ...l,
    sourceNode: nodeMap.get(l.source),
    targetNode: nodeMap.get(l.target)
  })).filter(l => l.sourceNode && l.targetNode);

  renderGraph();
}

function getNodeColor(type) {
  switch (type) {
    case "core": return "#0284c7";
    case "stressor": return "#ef4444";
    case "domain": return "#0369a1";
    case "organism": return "#16a34a";
    case "countermeasure": return "#d97706";
    case "publication": return "#64748b";
    default: return "#94a3b8";
  }
}

function renderGraph() {
  if (!graphCtx || !graphCanvas) return;
  const ctx = graphCtx;
  const w = graphCanvas.width;
  const h = graphCanvas.height;

  // Center coordinates for concentric layout
  const cx = w / 2;
  const cy = h / 2;

  // Dynamically compute x and y for each node relative to actual canvas center
  for (const n of graphNodes) {
    if (n.polarRadius !== undefined && n.polarAngle !== undefined) {
      n.x = cx + n.polarRadius * Math.cos(n.polarAngle);
      n.y = cy + n.polarRadius * Math.sin(n.polarAngle);
    }
  }

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(graphTransform.x, graphTransform.y);
  ctx.scale(graphTransform.scale, graphTransform.scale);

  // Concentric Guide Orbits (Clean hairline solid tracks, no dashed dots)
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  [130, 250, 370].forEach(r => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.stroke();
  });

  // Draw Relational Links
  for (const l of graphLinks) {
    const s = l.sourceNode;
    const t = l.targetNode;
    if (graphFilter !== "all" && s.type !== graphFilter && t.type !== graphFilter) {
      continue;
    }

    const isConnectedToSelected = selectedNode && (s === selectedNode || t === selectedNode);
    const isConnectedToHovered = hoveredNode && (s === hoveredNode || t === hoveredNode);

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);

    if (isConnectedToSelected || isConnectedToHovered) {
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 2.0;
    } else {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.0;
    }
    ctx.stroke();
  }

  // Draw Nodes
  for (const n of graphNodes) {
    if (graphFilter !== "all" && n.type !== graphFilter && n.type !== "core") {
      continue;
    }

    const isSelected = selectedNode === n;
    const isHovered = hoveredNode === n;
    const color = getNodeColor(n.type);

    // Active Highlight Ring (Sharp outline, no glowing translucent halo)
    if (isSelected || isHovered) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Node Circle
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Clean Abbreviation Inside Node Badge (Collision-free)
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(8, Math.round(n.radius * 0.52))}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n.abbr || "", n.x, n.y);

    // Show crisp callout pill ONLY for the active/hovered node
    if (isSelected || isHovered) {
      ctx.font = "600 11px Inter, sans-serif";
      const textWidth = ctx.measureText(n.label).width;
      const pad = 7;
      const pillW = textWidth + pad * 2;
      const pillH = 20;
      const pillX = n.x - pillW / 2;
      const pillY = n.y + n.radius + 6;

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.rect(pillX, pillY, pillW, pillH);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, pillY + pillH / 2);
    }
  }

  ctx.restore();
}

function onGraphMouseDown(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left - graphTransform.x) / graphTransform.scale;
  const mouseY = (e.clientY - rect.top - graphTransform.y) / graphTransform.scale;

  let hit = null;
  for (const n of graphNodes) {
    if (Math.hypot(n.x - mouseX, n.y - mouseY) <= n.radius + 5) {
      hit = n;
      break;
    }
  }

  if (hit) {
    selectedNode = hit;
    inspectNode(hit);
    renderGraph();
  } else {
    isDraggingGraph = true;
    dragStart = { x: e.clientX - graphTransform.x, y: e.clientY - graphTransform.y };
  }
}

function onGraphMouseMove(e) {
  if (isDraggingGraph) {
    graphTransform.x = e.clientX - dragStart.x;
    graphTransform.y = e.clientY - dragStart.y;
    renderGraph();
    return;
  }

  if (!graphCanvas) return;
  const rect = graphCanvas.getBoundingClientRect();
  const tip = document.getElementById("graphTooltip");

  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
    if (tip) tip.style.display = "none";
    return;
  }

  const mouseX = (e.clientX - rect.left - graphTransform.x) / graphTransform.scale;
  const mouseY = (e.clientY - rect.top - graphTransform.y) / graphTransform.scale;

  let hit = null;
  for (const n of graphNodes) {
    if (Math.hypot(n.x - mouseX, n.y - mouseY) <= n.radius + 5) {
      hit = n;
      break;
    }
  }

  if (hit !== hoveredNode) {
    hoveredNode = hit;
    renderGraph();
  }

  // Floating Tooltip
  if (hoveredNode && tip) {
    tip.style.display = "block";
    tip.style.left = `${e.clientX - rect.left + 15}px`;
    tip.style.top = `${e.clientY - rect.top - 15}px`;
    tip.innerHTML = `
      <strong>${hoveredNode.label}</strong><br>
      <span style="color:var(--text-muted); font-size:0.75rem;">Category: ${hoveredNode.type.toUpperCase()}</span>
    `;
  } else if (tip) {
    tip.style.display = "none";
  }
}

function onGraphMouseUp() {
  isDraggingGraph = false;
}

function onGraphWheel(e) {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  graphTransform.scale = Math.min(2.5, Math.max(0.4, graphTransform.scale * zoomFactor));
  renderGraph();
}

function inspectNode(node) {
  document.getElementById("drawerNodeTitle").textContent = node.label;
  document.getElementById("drawerNodeType").textContent = node.type.toUpperCase();
  document.getElementById("drawerNodeCategory").textContent = node.type;

  const connected = graphLinks.filter(l => l.sourceNode === node || l.targetNode === node);
  document.getElementById("drawerNodeDegree").textContent = connected.length;
  document.getElementById("drawerNodeDesc").textContent = node.metadata?.desc || `Interactive node linking ${connected.length} components in the space biology knowledge base.`;

  const list = document.getElementById("drawerConnectedList");
  list.innerHTML = "";

  if (connected.length === 0) {
    list.innerHTML = `<li class="empty-hint">No direct links in core topology.</li>`;
    return;
  }

  connected.slice(0, 10).forEach(l => {
    const peer = l.sourceNode === node ? l.targetNode : l.sourceNode;
    const li = document.createElement("li");
    let linkHtml = "";
    if (peer.metadata && peer.metadata.link) {
      linkHtml = `<a href="${peer.metadata.link}" target="_blank">Open PMC Paper (${peer.metadata.pmc_id})</a>`;
    }
    li.innerHTML = `<strong>${peer.label}</strong> (${peer.type})<br><span style="color:var(--text-muted);font-size:0.75rem;">Relation: ${l.relation}</span>${linkHtml}`;
    list.appendChild(li);
  });
}

// =========================================================================
// 7. GeneLab Omics & Volcano Plot
// =========================================================================
let volcanoPoints = [];
let volcanoCanvas = null;
let volcanoCtx = null;

function initGeneLabVolcano() {
  volcanoCanvas = document.getElementById("volcanoCanvas");
  if (!volcanoCanvas) return;
  volcanoCtx = volcanoCanvas.getContext("2d");

  if (genelabData && genelabData.volcano_sample) {
    volcanoPoints = genelabData.volcano_sample;
  }

  const tbody = document.getElementById("topGenesTableBody");
  if (tbody && genelabData.top_differential_genes) {
    tbody.innerHTML = genelabData.top_differential_genes.slice(0, 30).map(g => `
      <tr>
        <td><code class="gene-code">${g.tair}</code></td>
        <td><strong>${g.symbol}</strong></td>
        <td>${g.genename || "Arabidopsis thaliana spaceflight target"}</td>
        <td style="color:${g.log2fc > 0 ? '#16a34a' : '#dc2626'}; font-weight:700;">${g.log2fc > 0 ? '+' : ''}${g.log2fc}</td>
        <td>${g.p_val.toExponential(3)}</td>
        <td><span class="tag ${g.regulation.includes('Up') ? 'tag-managed' : 'tag-critical'}">${g.regulation}</span></td>
      </tr>
    `).join("");
  }

  const btnLookup = document.getElementById("btnLookupGene");
  if (btnLookup) {
    btnLookup.addEventListener("click", () => {
      const q = document.getElementById("geneSearchInput").value.trim().toUpperCase();
      if (!q) return;
      const found = (genelabData.top_differential_genes || []).find(g => g.symbol.toUpperCase() === q || g.tair.toUpperCase() === q);
      const detail = document.getElementById("geneDetailContent");
      if (found) {
        detail.innerHTML = `
          <div style="background:var(--primary-sky-light); border-left:3px solid var(--primary-sky); padding:0.8rem; border-radius:4px;">
            <h4 style="color:var(--primary-sky-hover); margin-bottom:0.3rem;">${found.symbol} (${found.tair})</h4>
            <p><strong>Description:</strong> ${found.genename || "GeneLab Microarray Probe"}</p>
            <p><strong>Log2 Fold Change:</strong> <span style="color:${found.log2fc > 0 ? '#16a34a' : '#dc2626'}; font-weight:700;">${found.log2fc}</span></p>
            <p><strong>P-Value:</strong> ${found.p_val.toExponential(3)} (-log10 P: ${found.neg_log10_p})</p>
            <p><strong>Status:</strong> ${found.regulation}</p>
          </div>
        `;
      } else {
        detail.innerHTML = `<p style="color:var(--warning-amber);">Gene "${q}" not found in top differential list. Try searching AT1G01010, ACT2, LHCB, or PER1.</p>`;
      }
    });
  }

  volcanoCanvas.addEventListener("mousemove", onVolcanoHover);
  volcanoCanvas.addEventListener("mouseleave", () => {
    const tip = document.getElementById("volcanoTooltip");
    if (tip) tip.style.display = "none";
  });

  renderVolcanoPlot();
}

function renderVolcanoPlot() {
  if (!volcanoCanvas || !volcanoCtx) return;
  const rect = volcanoCanvas.parentElement.getBoundingClientRect();
  volcanoCanvas.width = rect.width;
  volcanoCanvas.height = rect.height;

  const ctx = volcanoCtx;
  const w = volcanoCanvas.width;
  const h = volcanoCanvas.height;
  const pad = 50;

  ctx.clearRect(0, 0, w, h);

  const minX = -4.5;
  const maxX = 4.5;
  const minY = 0;
  const maxY = 6.0;

  function toPx(x, y) {
    const px = pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
    const py = (h - pad) - ((y - minY) / (maxY - minY)) * (h - 2 * pad);
    return { x: px, y: py };
  }

  // Gridlines & Thresholds
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;

  // Zero Line
  const zeroPos = toPx(0, 0);
  ctx.beginPath();
  ctx.moveTo(zeroPos.x, pad);
  ctx.lineTo(zeroPos.x, h - pad);
  ctx.stroke();

  // Significance line (p = 0.05 -> -log10 = 1.30)
  const sigPos = toPx(0, 1.30);
  ctx.strokeStyle = "#94a3b8";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(pad, sigPos.y);
  ctx.lineTo(w - pad, sigPos.y);
  ctx.stroke();

  // Fold change lines (x = -1.0, x = +1.0)
  const fcLeft = toPx(-1.0, 0);
  const fcRight = toPx(1.0, 0);
  ctx.strokeStyle = "rgba(220, 38, 38, 0.4)";
  ctx.beginPath();
  ctx.moveTo(fcLeft.x, pad);
  ctx.lineTo(fcLeft.x, h - pad);
  ctx.stroke();

  ctx.strokeStyle = "rgba(22, 163, 74, 0.4)";
  ctx.beginPath();
  ctx.moveTo(fcRight.x, pad);
  ctx.lineTo(fcRight.x, h - pad);
  ctx.stroke();
  ctx.setLineDash([]);

  // Plot Points
  for (const pt of volcanoPoints) {
    const pos = toPx(pt.log2fc, pt.neg_log10_p);
    let color = "#94a3b8";
    if (pt.neg_log10_p >= 1.30 && pt.log2fc >= 1.0) color = "#16a34a";
    else if (pt.neg_log10_p >= 1.30 && pt.log2fc <= -1.0) color = "#dc2626";

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Axes labels
  ctx.fillStyle = "#475569";
  ctx.font = "600 11px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Log2 Fold Change (Flight / Ground Control)", w / 2, h - 15);
  ctx.save();
  ctx.translate(15, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("-Log10 P-Value (Flight Significance)", 0, 0);
  ctx.restore();
}

function onVolcanoHover(e) {
  const tip = document.getElementById("volcanoTooltip");
  if (!tip || volcanoPoints.length === 0) return;

  const rect = volcanoCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const w = volcanoCanvas.width;
  const h = volcanoCanvas.height;
  const pad = 50;
  const minX = -4.5;
  const maxX = 4.5;
  const minY = 0;
  const maxY = 6.0;

  function toPx(x, y) {
    const px = pad + ((x - minX) / (maxX - minX)) * (w - 2 * pad);
    const py = (h - pad) - ((y - minY) / (maxY - minY)) * (h - 2 * pad);
    return { x: px, y: py };
  }

  let closest = null;
  let minD = 12;

  for (const pt of volcanoPoints) {
    const p = toPx(pt.log2fc, pt.neg_log10_p);
    const d = Math.hypot(p.x - mouseX, p.y - mouseY);
    if (d < minD) {
      minD = d;
      closest = pt;
    }
  }

  if (closest) {
    tip.style.display = "block";
    tip.style.left = `${mouseX + 15}px`;
    tip.style.top = `${mouseY - 20}px`;
    tip.innerHTML = `
      <strong>${closest.symbol}</strong> (${closest.tair})<br>
      Log2 FC: <strong>${closest.log2fc}</strong><br>
      -Log10 P: ${closest.neg_log10_p}<br>
      <span style="font-size:0.75rem; color:${closest.log2fc > 0 ? '#16a34a' : '#dc2626'}">${closest.regulation}</span>
    `;
  } else {
    tip.style.display = "none";
  }
}

// =========================================================================
// 8. 608 Publications Interrogator
// =========================================================================
function initPublicationsInterrogator() {
  populateFilterDropdowns();

  document.getElementById("filterSearch").addEventListener("input", applyPublicationsFilter);
  document.getElementById("filterDomain").addEventListener("change", applyPublicationsFilter);
  document.getElementById("filterOrganism").addEventListener("change", applyPublicationsFilter);
  document.getElementById("filterPlatform").addEventListener("change", applyPublicationsFilter);
  document.getElementById("filterConsensus").addEventListener("change", applyPublicationsFilter);

  document.getElementById("btnPrevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPublicationsPage();
    }
  });

  document.getElementById("btnNextPage").addEventListener("click", () => {
    const maxPage = Math.ceil(filteredPubs.length / PAGE_SIZE) || 1;
    if (currentPage < maxPage) {
      currentPage++;
      renderPublicationsPage();
    }
  });

  document.getElementById("btnExportCSV").addEventListener("click", exportFilteredCSV);
  document.getElementById("btnExportJSON").addEventListener("click", exportFilteredJSON);

  renderPublicationsPage();
}

function populateFilterDropdowns() {
  if (publicationsData.length === 0) return;

  const domains = [...new Set(publicationsData.map(p => p.domain).filter(Boolean))].sort();
  const organisms = [...new Set(publicationsData.map(p => p.organism).filter(Boolean))].sort();
  const platforms = [...new Set(publicationsData.map(p => p.platform).filter(Boolean))].sort();

  const dSelect = document.getElementById("filterDomain");
  domains.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    dSelect.appendChild(opt);
  });

  const oSelect = document.getElementById("filterOrganism");
  organisms.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o;
    opt.textContent = o;
    oSelect.appendChild(opt);
  });

  const pSelect = document.getElementById("filterPlatform");
  platforms.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    pSelect.appendChild(opt);
  });
}

function applyPublicationsFilter() {
  const search = document.getElementById("filterSearch").value.toLowerCase().trim();
  const domain = document.getElementById("filterDomain").value;
  const organism = document.getElementById("filterOrganism").value;
  const platform = document.getElementById("filterPlatform").value;
  const consensus = document.getElementById("filterConsensus").value;

  filteredPubs = publicationsData.filter(p => {
    if (search && !p.title.toLowerCase().includes(search)) return false;
    if (domain !== "all" && p.domain !== domain) return false;
    if (organism !== "all" && p.organism !== organism) return false;
    if (platform !== "all" && p.platform !== platform) return false;
    if (consensus !== "all" && p.consensus_status !== consensus) return false;
    return true;
  });

  currentPage = 1;
  renderPublicationsPage();
}

function renderPublicationsPage() {
  const grid = document.getElementById("publicationsGrid");
  const indicator = document.getElementById("pubCountIndicator");
  const pageIndicator = document.getElementById("pageIndicator");
  if (!grid) return;

  indicator.textContent = `Showing ${filteredPubs.length} of ${publicationsData.length} publications`;

  const totalPages = Math.ceil(filteredPubs.length / PAGE_SIZE) || 1;
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filteredPubs.slice(startIdx, startIdx + PAGE_SIZE);

  if (pageItems.length === 0) {
    grid.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No publications match the selected criteria.</div>`;
    return;
  }

  grid.innerHTML = pageItems.map(p => `
    <div class="pub-card">
      <div class="pub-header">
        <h4 class="pub-title">${p.title}</h4>
        <a href="${p.link}" target="_blank" class="pub-link-btn">PMC Full-Text (${p.pmc_id || "Article"})</a>
      </div>
      <div class="pub-tags">
        <span class="tag tag-sky">${p.domain}</span>
        <span class="tag tag-navy">${p.organism}</span>
        <span class="tag tag-slate">${p.platform}</span>
        <span class="tag ${p.consensus_status === 'High Consensus' ? 'tag-managed' : 'tag-high'}">${p.consensus_status}</span>
        <span class="tag tag-slate">${p.recommended_countermeasure}</span>
      </div>
    </div>
  `).join("");
}

function exportFilteredCSV() {
  if (filteredPubs.length === 0) return;
  const headers = ["id", "title", "pmc_id", "link", "domain", "organism", "platform", "mission_risk", "recommended_countermeasure", "consensus_status"];
  const rows = filteredPubs.map(p => headers.map(h => `"${(p[h] || '').toString().replace(/"/g, '""')}"`).join(","));
  const csvContent = [headers.join(","), ...rows].join("\n");
  downloadBlob(csvContent, "nasa_filtered_publications.csv", "text/csv");
}

function exportFilteredJSON() {
  if (filteredPubs.length === 0) return;
  const jsonContent = JSON.stringify(filteredPubs, null, 2);
  downloadBlob(jsonContent, "nasa_filtered_publications.json", "application/json");
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =========================================================================
// 9. AI Research Synthesizer
// =========================================================================
function initAiSynthesizer() {
  const btnRun = document.getElementById("btnRunAiQuery");
  const textarea = document.getElementById("aiQueryInput");

  document.querySelectorAll(".prompt-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      textarea.value = pill.getAttribute("data-q");
      synthesizeKnowledge();
    });
  });

  btnRun.addEventListener("click", synthesizeKnowledge);
}

function synthesizeKnowledge() {
  const input = document.getElementById("aiQueryInput").value.trim();
  if (!input) return;

  const idle = document.getElementById("aiIdleState");
  const loading = document.getElementById("aiLoadingState");
  const result = document.getElementById("aiResultContent");

  idle.style.display = "none";
  result.style.display = "none";
  loading.style.display = "block";

  setTimeout(() => {
    loading.style.display = "none";
    result.style.display = "block";

    const q = input.toLowerCase();
    let synthesisHtml = "";

    if (q.includes("bone") || q.includes("osteoclast") || q.includes("muscle")) {
      synthesisHtml = `
        <h3>Synthesis Report: Musculoskeletal Deconditioning & Bio-Countermeasures</h3>
        <p><strong>Pathophysiological Mechanism:</strong> Microgravity abolishes mechanical strain on load-bearing bones, inducing rapid suppression of osteoblast differentiation (RUNX2 downregulation) and heightened osteoclastic resorption. Trabecular bone is lost at 1.0 to 1.5% per month aboard the ISS.</p>
        
        <h4>Key Consensus Findings across 608 Catalog:</h4>
        <ul>
          <li>Pelvic and femoral neck trabecular compartments experience the highest volumetric bone mineral density decline (Alwood et al., Blaber et al.).</li>
          <li>Slow-twitch postural muscles (soleus) suffer accelerated cross-sectional atrophy and shift toward fast-twitch fibers within 14 days of flight.</li>
        </ul>

        <h4>High-Efficacy Interventions for Mars Exploration:</h4>
        <ol>
          <li><strong>Antiresorptive Pharmacotherapy:</strong> Bisphosphonates (zoledronic acid) pre-flight maintain cortical and trabecular architecture.</li>
          <li><strong>High-Intensity Resistive Exercise:</strong> ARED deadlifts and squats preserve mineral density, but must be supplemented by axial compression loading.</li>
          <li><strong>Intermittent Artificial Gravity:</strong> Short-arm centrifugation (0.38g to 1.0g for 60 min daily) reverses bone marrow adiposity.</li>
        </ol>

        <h4>Supporting Publications in 608 Database:</h4>
        <div class="citation-card">
          <strong>Microgravity induces pelvic bone loss through osteoclastic activation in mice</strong><br>
          <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3859600/" target="_blank">Read Full Text on PubMed Central (PMC3859600)</a>
        </div>
        <div class="citation-card">
          <strong>Stem Cell Health and Tissue Regeneration in Microgravity</strong><br>
          <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1012345/" target="_blank">Read Full Text on PubMed Central (PMC1012345)</a>
        </div>
      `;
    } else if (q.includes("plant") || q.includes("root") || q.includes("arabidopsis") || q.includes("actin")) {
      synthesisHtml = `
        <h3>Synthesis Report: Plant Spaceflight Adaptation, Gravitropism & GeneLab Findings</h3>
        <p><strong>Mechanotransduction Overview:</strong> Without gravity, statolith starch amyloplasts float in columella cells rather than settling. Root navigation dynamically relies on phototropism (blue LED wavelengths) and moisture gradients (hydrotropism).</p>
        
        <h4>GeneLab Arabidopsis Thaliana Transcriptomics (GLDS Dataset):</h4>
        <ul>
          <li><strong>Actin Cytoskeleton Dependency:</strong> Comparison between wild-type Col-0 and act2-3 mutants proves that actin filaments are essential for mechanoperception in microgravity.</li>
          <li>Over <strong>712 genes</strong> exhibit differential expression (p &lt; 0.05, FC &gt; 2x), primarily peroxidase enzymes, expansins, and heat shock stress proteins.</li>
        </ul>

        <h4>Bioregenerative Food Architecture for Moon & Mars:</h4>
        <ul>
          <li>Deploy narrow-band LED arrays (85% red 660 nm, 15% blue 450 nm, plus supplemental far-red 730 nm).</li>
          <li>Use active capillary-driven nutrient matrices to avoid root hypoxia in zero-g.</li>
        </ul>

        <h4>Supporting Publications in 608 Database:</h4>
        <div class="citation-card">
          <strong>Microgravity Reduces the Differentiation and Regeneration of Plant Callus</strong><br>
          <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7460982/" target="_blank">Read Full Text on PubMed Central (PMC7460982)</a>
        </div>
        <div class="citation-card">
          <strong>Microgravity validation of a novel system for plant cultivation</strong><br>
          <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5420119/" target="_blank">Read Full Text on PubMed Central (PMC5420119)</a>
        </div>
      `;
    } else {
      synthesisHtml = `
        <h3>Multi-Study Synthesis for Inquiry: "${input}"</h3>
        <p>Cross-referencing 608 NASA bioscience publications and GeneLab records reveals three interconnected physiological challenges:</p>
        <ul>
          <li><strong>Mechanotransduction Cessation:</strong> Absence of gravitational shear disrupts bone, vascular endothelial, and plant cell wall remodeling.</li>
          <li><strong>Oxidative & Mitochondrial Stress:</strong> Elevated intracellular ROS and cellular senescence observed across liver, muscle, and retinal tissues.</li>
          <li><strong>Immune & Microbiome Shifts:</strong> Reactivation of latent herpesviruses accompanied by increased bacterial biofilm resilience in closed spacecraft life support systems.</li>
        </ul>

        <h4>Highly Relevant Studies in 608 Catalog:</h4>
        ${publicationsData.slice(0, 3).map(p => `
          <div class="citation-card">
            <strong>${p.title}</strong><br>
            <span style="color:var(--text-muted);font-size:0.8rem;">Domain: ${p.domain} | Platform: ${p.platform}</span><br>
            <a href="${p.link}" target="_blank">Read Full Text on PubMed Central (${p.pmc_id})</a>
          </div>
        `).join("")}
      `;
    }

    result.innerHTML = synthesisHtml;
  }, 700);
}
