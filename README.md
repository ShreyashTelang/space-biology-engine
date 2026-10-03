# NASA Space Biology Knowledge Engine

> **AI-Powered Synthesis & Exploration Dashboard for 608 NASA Bioscience Publications and GeneLab Transcriptomics Data**  
> *Developed for the NASA Space Apps Challenge: "Build a Space Biology Knowledge Engine"*

---

## Executive Summary & Problem Statement

As humanity prepares for long-duration interplanetary missions under the **Artemis program** (Lunar South Pole) and future crewed missions to **Mars**, understanding how biological systems adapt to microgravity, deep space ionizing radiation, and closed life-support environments is paramount.

Over several decades, NASA and international partners have conducted hundreds of space biology experiments aboard the Space Shuttle, International Space Station (ISS), Bion-M biosatellites, and ground analogs. While these findings are publicly accessible through NASA databases, synthesizing domain-specific conclusions, comparing conflicting findings across flight missions, and translating basic scientific discoveries into mission-ready operational countermeasures has historically been labor-intensive.

**The NASA Space Biology Knowledge Engine** resolves this challenge by integrating:
1. **Curated Catalog of 608 NASA Bioscience Publications**: Enriched with full-text PubMed Central (PMC) linkages, standardized research domains, and experiment platforms.
2. **NASA Open Science Data Repository (OSDR) / GeneLab Transcriptomics**: 22,810 genes from *Arabidopsis thaliana* spaceflight experiments (GLDS dataset), statistically evaluated for mechanoperception and actin cytoskeleton dynamics (*Col-0 WT* vs. *act2-3 mutant*).
3. **Dual-View Knowledge Graph Engine**:
   - **Pathway Cascade View (Default)**: A clean 4-column flow matrix (`Space Stressors` -> `Biological Disciplines` -> `Model Organisms` -> `Validated Countermeasures`) with bidirectional selection highlighting, zero label collisions, and direct links to PMC publications.
   - **Network Topology View**: Concentric guide orbits with node abbreviation badges, dynamic hover pills, zoom/pan navigation, and an evidence HUD drawer.
4. **Three Persona-Driven Workbenches**: Tailored analysis matrices for Research Scientists, Science Managers / Investors, and Mission Architects.
5. **AI Research Synthesizer**: Grounded semantic question answering with structured citations across the entire 608-publication catalog.
6. **Institutional Design System**: Professional Light and Sky-Blue workstation layout, Inter typography, and zero decorative emojis, engineered for researchers at NASA, ISRO, and partner space agencies.

---

## Repository Structure

```
Space_Bio_Engine/
├── .gitignore                   # Security & environment exclusion rules (prevents credential/cache leakage)
├── requirements.txt             # Python dependencies for FastAPI, Streamlit, and scientific processing
├── index.html                   # High-performance web dashboard (Light & Sky Blue workstation theme)
├── style.css                    # Professional responsive CSS design system (zero emojis, Inter font)
├── app.js                       # Pathway cascade, radial network, volcano plot, and client filters
├── api.py                       # FastAPI backend server with REST endpoints and static asset serving
├── nasa.py                      # Streamlit application with interactive Plotly analytics and persona views
├── process_space_bio_data.py    # Data enrichment pipeline (NLP classification and t-test statistics)
├── SB_publication_PMC.csv       # Original 608 Space Biology publications dataset from NASA
├── enriched_publications.csv    # Enriched publications catalog with domains, risks, and countermeasures
├── enriched_publications.json   # JSON representation for instant client-side querying
├── NASA_Dataset.csv             # GeneLab microarray dataset (22,810 genes, Col-0 WT vs act2-3 mutant)
├── genelab_expression_analysis.json # Precomputed fold changes, p-values, and volcano sample
├── knowledge_graph.json         # Force-directed topology nodes and relational edges
├── summary_stats.json           # Aggregated statistics across domains, platforms, and organisms
└── assets/
    └── hero.jpg                 # NASA Space Biology laboratory asset
```

---

## Datasets & Scientific Provenance

### 1. 608 NASA Bioscience Publications Catalog
- **Source**: NASA Space Biology Program / GeneLab (Curated by Dr. Jonathan Galazka).
- **Enrichment**: Standardized categorization across **9 Core Disciplines**:
  - Musculoskeletal & Bone Loss
  - Radiation & Deep Space Hazards
  - Cardiovascular & Fluid Shifts
  - Plant Biology & Space Agriculture
  - Immunology & Infection
  - Microbiology & Biofilms
  - Neuroscience & Vision (SANS)
  - Omics, Mitochondria & Cellular Stress
  - Reproductive & Developmental Biology
- **Linkages**: All entries mapped directly to PubMed Central IDs for verifiable open-access reading.

### 2. NASA OSDR / GeneLab GLDS Transcriptomic Dataset
- **Experiment**: Spaceflight microgravity vs. ground control evaluation of *Arabidopsis thaliana*.
- **Biological Focus**: Mechanosensitive role of the actin cytoskeleton in root gravitropism and oxidative stress response (Wild-Type Col-0 vs. *act2-3* mutant).
- **Statistical Pipeline**: Two-sample Student's t-test, log2 fold change, and -log10 p-value computations across all 22,810 genes.
- **Key Output**: 712 significantly dysregulated spaceflight genes (p < 0.05, FC > 2.0x) rendered in an interactive 60 FPS Canvas Volcano plot.

---

## Installation & Quickstart

### Prerequisites
- Python 3.9 or higher
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 1. Clone the Repository
```bash
git clone https://github.com/ShreyashTelang/space-biology-engine.git
cd space-biology-engine
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Launch the Application

#### Option A: High-Performance Web Dashboard (Recommended)
Launches the FastAPI backend and serves the unified web workstation:
```bash
python -m uvicorn api:app --port 8000 --host 127.0.0.1
```
Open your browser and navigate to:
```
http://127.0.0.1:8000/
```

#### Option B: Streamlit Analytics Workbench
Launches the Python-native Streamlit dashboard with interactive Plotly visualizers:
```bash
streamlit run nasa.py
```
The application will open automatically at:
```
http://localhost:8501
```

#### Option C: Re-run Preprocessing Pipeline (Optional)
To re-evaluate statistical metrics or alter discipline taxonomy:
```bash
python process_space_bio_data.py
```

---

## REST API Reference

The FastAPI backend exposes the following endpoints for programmatic data access:

| Endpoint | Method | Parameters | Description |
|---|---|---|---|
| `/api/stats` | GET | None | Aggregated counts for publications, mapped genes, platforms, and consensus items. |
| `/api/publications` | GET | `search`, `domain`, `organism`, `platform`, `page`, `page_size` | Paginated search and filtering across all 608 studies. |
| `/api/publications/{id}` | GET | `id` (path) | Retrieve individual publication metadata and PubMed Central link. |
| `/api/knowledge-graph` | GET | None | Complete node and edge topology for pathway and network rendering. |
| `/api/genelab` | GET | None | Volcano plot sample points, statistical thresholds, and top dysregulated genes. |
| `/api/synthesize` | POST | JSON body `{ "query": string }` | Semantic synthesis endpoint delivering grounded findings with citations. |

---

## Target Persona Workbenches

| Persona | Operational Focus | Key Capabilities | Primary Deliverable |
|---|---|---|---|
| **Research Scientist & PI** | Mechanistic biology & gene expression | Volcano plot inspection, hypothesis generator, consensus vs. debate analyzer | Testable flight hypothesis protocol and gene target lists |
| **Research Manager & Investor** | Portfolio balance & capability readiness | Portfolio distribution, NASA Task Book grant allocations, platform utilization | NASA Task Book funding solicitations and gap reports |
| **Mission Architect** | Moon-to-Mars crew health & life support | Deep-space hazard matrices, transit-phase checklists, bio-regenerative food arrays | Actionable countermeasure checklists (ARED, LBNP, shielding) |

---

## Data Privacy, Security & Zero-Leakage Guarantee

- **100% Open Access**: Built exclusively on publicly available datasets from the NASA Open Science Data Repository (OSDR), GeneLab, and PubMed Central.
- **Local Execution**: All statistical models, semantic search functions, and API services run locally without requiring external cloud accounts or transmitting telemetry.
- **Zero API Key Requirements**: Does not depend on third-party proprietary LLM keys or external database connections.
- **Clean Repository Standards**: Strict `.gitignore` rules prevent accidental commits of virtual environments, local caches (`__pycache__`), environment secrets (`.env`), or operating system artifacts.

---

## External NASA Portals & Data References

- [NASA Open Science Data Repository (OSDR)](https://www.nasa.gov/osdr/)
- [NASA GeneLab Data Repository](https://genelab.nasa.gov/)
- [NASA Space Life Sciences Library (NSLSL)](https://public.ksc.nasa.gov/nslsl/)
- [NASA Task Book: Biological & Physical Sciences](https://taskbook.nasaprs.com/tbp/welcome.cfm)
- [PubMed Central Open Access Subset](https://www.ncbi.nlm.nih.gov/pmc/)

---

## License

This project is developed for educational, open-science, and research exploration purposes in connection with the NASA International Space Apps Challenge. All underlying scientific publications and datasets remain the property of NASA and their respective authors under open-access public licensing.
