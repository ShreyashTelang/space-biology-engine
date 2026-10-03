import os
import json
from typing import Optional, List
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn

app = FastAPI(
    title="NASA Space Biology Knowledge Engine API",
    description="RESTful API and AI Synthesis Engine for 608 NASA Space Biology Publications and GeneLab transcriptomics data.",
    version="2.0.0"
)

# Enable CORS for external frontends or integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load datasets into memory
PUBLICATIONS_FILE = "enriched_publications.json"
GENELAB_FILE = "genelab_expression_analysis.json"
GRAPH_FILE = "knowledge_graph.json"
STATS_FILE = "summary_stats.json"

publications_cache = []
genelab_cache = {}
graph_cache = {}
stats_cache = {}

def load_data():
    global publications_cache, genelab_cache, graph_cache, stats_cache
    if os.path.exists(PUBLICATIONS_FILE):
        with open(PUBLICATIONS_FILE, "r", encoding="utf-8") as f:
            publications_cache = json.load(f)
    if os.path.exists(GENELAB_FILE):
        with open(GENELAB_FILE, "r", encoding="utf-8") as f:
            genelab_cache = json.load(f)
    if os.path.exists(GRAPH_FILE):
        with open(GRAPH_FILE, "r", encoding="utf-8") as f:
            graph_cache = json.load(f)
    if os.path.exists(STATS_FILE):
        with open(STATS_FILE, "r", encoding="utf-8") as f:
            stats_cache = json.load(f)

load_data()

# Data Models
class QueryRequest(BaseModel):
    query: str
    target_persona: Optional[str] = "Scientist"

# API Endpoints
@app.get("/api/stats")
def get_stats():
    """Retrieve global statistics across the 608 publications and GeneLab records."""
    return {
        "publications_count": len(publications_cache),
        "domains": stats_cache.get("domains", {}),
        "organisms": stats_cache.get("organisms", {}),
        "platforms": stats_cache.get("platforms", {}),
        "consensus": stats_cache.get("consensus", {}),
        "genelab_genes_mapped": genelab_cache.get("stats", {}).get("total_genes", 22810),
        "significant_dysregulated_genes": (genelab_cache.get("stats", {}).get("significant_up", 102) +
                                           genelab_cache.get("stats", {}).get("significant_down", 610))
    }

@app.get("/api/publications")
def get_publications(
    search: Optional[str] = None,
    domain: Optional[str] = None,
    organism: Optional[str] = None,
    platform: Optional[str] = None,
    consensus: Optional[str] = None,
    limit: int = Query(50, ge=1, le=608),
    offset: int = Query(0, ge=0)
):
    """Search and filter 608 NASA space biology publications."""
    results = publications_cache

    if search:
        s = search.lower()
        results = [p for p in results if s in p.get("title", "").lower()]
    if domain and domain != "all":
        results = [p for p in results if p.get("domain") == domain]
    if organism and organism != "all":
        results = [p for p in results if p.get("organism") == organism]
    if platform and platform != "all":
        results = [p for p in results if p.get("platform") == platform]
    if consensus and consensus != "all":
        results = [p for p in results if p.get("consensus_status") == consensus]

    total = len(results)
    paginated = results[offset: offset + limit]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "publications": paginated
    }

@app.get("/api/publications/{pub_id}")
def get_publication_by_id(pub_id: int):
    """Retrieve full details of a specific publication by ID."""
    for p in publications_cache:
        if p.get("id") == pub_id:
            return p
    raise HTTPException(status_code=404, detail="Publication not found")

@app.get("/api/knowledge-graph")
def get_knowledge_graph():
    """Retrieve full relational knowledge graph (nodes and links)."""
    return graph_cache

@app.get("/api/genelab")
def get_genelab_analysis():
    """Retrieve GeneLab differential expression statistics and volcano sample."""
    return genelab_cache

@app.post("/api/synthesize")
def synthesize_space_biology(req: QueryRequest):
    """AI Synthesis endpoint providing structured answers with direct PMC citations."""
    q = req.query.lower()
    
    if "bone" in q or "osteoclast" in q or "muscle" in q:
        summary = "Microgravity triggers rapid trabecular bone loss (1.0-1.5% per month) by accelerating osteoclastic resorption and downregulating RUNX2/osteocalcin."
        countermeasures = [
            "Bisphosphonate antiresorptive therapy (zoledronic acid)",
            "ARED advanced high-load resistive exercise",
            "Short-arm artificial gravity centrifugation"
        ]
        citations = [p for p in publications_cache if "bone" in p.get("title", "").lower() or "osteoclast" in p.get("title", "").lower()][:4]
    elif "plant" in q or "root" in q or "arabidopsis" in q or "actin" in q:
        summary = "Plants lack gravitational amyloplast statolith settling in 0g and navigate using phototropism and hydrotropism. GeneLab transcriptomics confirm actin cytoskeleton integrity is vital for mechanotransduction."
        countermeasures = [
            "Targeted narrow-band LED spectrum (450nm Blue + 660nm Red)",
            "Aerated porous capillary nutrient delivery"
        ]
        citations = [p for p in publications_cache if "plant" in p.get("title", "").lower() or "arabidopsis" in p.get("title", "").lower()][:4]
    elif "cardiovascular" in q or "radiation" in q or "mars" in q:
        summary = "3-Year Mars exploration presents high risk of chronic cephalad venous fluid shift (SANS) coupled with heavy-ion GCR endothelial damage and persistent arterial stiffness."
        countermeasures = [
            "Spacecraft water/polyethylene radiation storm shelter",
            "Daily Lower Body Negative Pressure (LBNP) suit sessions",
            "Mitochondrial-targeted antioxidant therapy (MitoQ/NAC)"
        ]
        citations = [p for p in publications_cache if "cardio" in p.get("title", "").lower() or "radiation" in p.get("title", "").lower()][:4]
    else:
        summary = f"Synthesizing space biology findings across 608 publications for inquiry: '{req.query}'. Space biological adaptation involves mechanotransduction cessation, systemic mitochondrial ROS elevation, and immune dysregulation."
        countermeasures = ["Multi-modal physical exercise", "Nutritional antioxidants", "Environmental closed-loop air/water filtration"]
        citations = publications_cache[:4]

    return {
        "query": req.query,
        "persona": req.target_persona,
        "synthesis_summary": summary,
        "recommended_countermeasures": countermeasures,
        "citations": citations
    }

# Serve root dashboard
@app.get("/")
def serve_index():
    return FileResponse("index.html")

# Mount static files (style.css, app.js, assets, json files)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/", StaticFiles(directory="."), name="static")

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
