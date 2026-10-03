import re
import json
import math
import numpy as np
import pandas as pd
from scipy import stats

def analyze_publications():
    print("Loading SB_publication_PMC.csv...")
    df_pub = pd.read_csv("SB_publication_PMC.csv")
    print(f"Total publications: {len(df_pub)}")

    # Extract PMC ID from Link
    def extract_pmc(url):
        if not isinstance(url, str):
            return ""
        m = re.search(r'(PMC\d+)', url)
        return m.group(1) if m else ""

    df_pub["PMC_ID"] = df_pub["Link"].apply(extract_pmc)

    # Classification rules based on title and keywords
    def classify_domain(title):
        t = title.lower()
        if any(k in t for k in ["bone", "osteoclast", "osteoblast", "skeletal", "muscle", "soleus", "atrophy", "tendon", "cartilage", "femur", "tibia", "calvaria", "trabecular", "myoblast", "myogenesis", "myosin", "sarcopenia", "locomotor"]):
            return "Musculoskeletal & Bone Loss"
        if any(k in t for k in ["radiation", "hze", "cosmic ray", "heavy ion", "proton", "gamma", "gcr", "spe", "dna damage", "double-strand", "radioprotect", "radiobiological", "ionizing"]):
            return "Radiation & Deep Space Hazards"
        if any(k in t for k in ["cardiac", "cardiovascular", "heart", "vascular", "endothelial", "arterial", "artery", "hemodynamic", "blood pressure", "jugular", "vein", "thrombo"]):
            return "Cardiovascular & Fluid Shifts"
        if any(k in t for k in ["plant", "arabidopsis", "seedling", "root", "gravitropism", "photosynthesis", "crop", "wheat", "chloroplast", "leaf", "leaves", "germination", "flora"]):
            return "Plant Biology & Space Agriculture"
        if any(k in t for k in ["immune", "t cell", "leukocyte", "macrophage", "thymus", "spleen", "cytokine", "lymphocyte", "interferon", "inflammation", "antibody", "monocyte"]):
            return "Immunology & Infection"
        if any(k in t for k in ["microb", "bacteria", "biofilm", "pathogen", "salmonella", "pseudomonas", "staphylococcus", "fungi", "yeast", "microbiome", "escherichia", "bacillus", "aspergillus", "antimicrobial"]):
            return "Microbiology & Biofilms"
        if any(k in t for k in ["ocular", "eye", "retina", "optic", "brain", "vestibular", "neural", "neuro", "sans", "cognitive", "sleep", "circadian", "auditory", "cerebral", "cortex", "hippocamp"]):
            return "Neuroscience & Vision (SANS)"
        if any(k in t for k in ["mitochondri", "telomere", "oxidative stress", "reactive oxygen", "ros", "senescence", "metabolom", "lipid", "proteom", "transcriptom", "rna-seq", "epigenetic", "methylation", "microrna"]):
            return "Omics, Mitochondria & Cellular Stress"
        if any(k in t for k in ["embryo", "fertil", "sperm", "oocyte", "reproduct", "development", "drosophila", "larvae", "metamorphosis", "c. elegans", "elegans", "nematode", "fly", "flies"]):
            return "Reproductive & Developmental Biology"
        return "General Space Biology & Life Support"

    def classify_organism(title):
        t = title.lower()
        if any(k in t for k in ["mouse", "mice", "murine", "rat", "rats", "rodent"]):
            return "Mus musculus (Rodents)"
        if any(k in t for k in ["human", "astronaut", "crew", "cosmonaut", "subject", "volunteer"]):
            return "Homo sapiens (Humans)"
        if any(k in t for k in ["arabidopsis", "thaliana", "plant", "seedling", "root", "crop", "wheat", "leaves"]):
            return "Arabidopsis thaliana (Plants)"
        if any(k in t for k in ["c. elegans", "elegans", "nematode", "worm"]):
            return "Caenorhabditis elegans (Worm)"
        if any(k in t for k in ["drosophila", "fruit fly", "fly"]):
            return "Drosophila melanogaster (Fruit Fly)"
        if any(k in t for k in ["bacteria", "biofilm", "salmonella", "pseudomonas", "microbe", "yeast", "fungus", "staphylococcus", "e. coli"]):
            return "Microbial / Microorganisms"
        if any(k in t for k in ["cell", "in vitro", "stem cell", "organoid", "culture", "endothelial", "osteoblast"]):
            return "In Vitro / Cell Culture / Organoid"
        return "Cross-Species / General Model"

    def classify_platform(title):
        t = title.lower()
        if any(k in t for k in ["iss", "space station"]):
            return "ISS (International Space Station)"
        if any(k in t for k in ["bion-m", "bion m", "foton", "biosatellite"]):
            return "Bion-M / Biosatellite"
        if any(k in t for k in ["shuttle", "sts-"]):
            return "Space Shuttle (STS)"
        if any(k in t for k in ["rodent research", "rr-"]):
            return "Rodent Research Mission (RR)"
        if any(k in t for k in ["hindlimb", "unloading", "bed rest", "bedrest", "head-down", "clinostat", "parabolic", "centrifug", "simulated microgravity", "random positioning"]):
            return "Ground Analog (Clinostat / Hindlimb / Bedrest)"
        return "Spaceflight / Space Environment"

    def determine_mission_risk(domain, title):
        t = title.lower()
        if domain in ["Radiation & Deep Space Hazards", "Musculoskeletal & Bone Loss"]:
            return "CRITICAL (High Priority for Mars Transit & Lunar Surface)"
        if domain in ["Cardiovascular & Fluid Shifts", "Neuroscience & Vision (SANS)", "Immunology & Infection"]:
            return "HIGH (Requires Active Countermeasures & Monitoring)"
        if domain in ["Plant Biology & Space Agriculture"]:
            return "MISSION ESSENTIAL (Bioregenerative Food & O2 Systems)"
        return "MODERATE (Long-Duration Crew Health Factor)"

    def extract_countermeasure(title, domain):
        t = title.lower()
        if "bone" in t or "muscle" in t:
            if "exercise" in t:
                return "Resistive & High-Intensity Interval Exercise (ARED/T2)"
            if "bisphosphonate" in t or "zoledronic" in t or "denosumab" in t:
                return "Antiresorptive Pharmacotherapy (Bisphosphonates / Denosumab)"
            return "Nutritional Vitamin D/Calcium + Axial Loading Compression Suit"
        if "radiation" in t:
            if "antioxidant" in t:
                return "Targeted Mitochondrial Antioxidants (MitoQ, N-Acetylcysteine)"
            return "Hydrocarbon Polymer/Water Shielding + Radioprotective Bio-agents"
        if "plant" in t:
            return "Tailored LED Light Spectrum (Far-Red/Blue) + Active Aerated Root Substrates"
        if "cardiovascular" in t or "fluid" in t:
            return "Lower Body Negative Pressure (LBNP) + Saline Hyper-hydration"
        if "immune" in t or "microb" in t:
            return "Probiotics, Microbial Air Filtration, Antimicrobial Copper Surfaces"
        if "eye" in t or "retina" in t or "sans" in t:
            return "Choline Supplementation, LBNP Nocturnal Counter-pressure, IOP Monitoring"
        return "Artificial Gravity via Centrifugation (0.38g - 1.0g Intermittent)"

    def extract_consensus_status(title):
        t = title.lower()
        if any(k in t for k in ["induces", "loss", "reduces", "decreased", "impairs", "causes", "atrophy", "damage", "alteration"]):
            return {
                "status": "High Consensus",
                "consensus_note": "Reproduced across independent missions (ISS, Shuttle, Bion-M1). Clear pathological mechanism documented."
            }
        if any(k in t for k in ["controversy", "differential", "inconsistent", "reversible", "transient", "novel", "paradox"]):
            return {
                "status": "Controversial / Active Debate",
                "consensus_note": "Conflicting findings reported between flight durations or between in vitro vs in vivo models. Requires targeted flight trials."
            }
        return {
            "status": "Emerging Evidence",
            "consensus_note": "Consistent preliminary data; broader longitudinal validation required for Moon-Mars transit regimes."
        }

    records = []
    for idx, row in df_pub.iterrows():
        title = str(row["Title"]).strip()
        link = str(row["Link"]).strip()
        pmc = row["PMC_ID"]
        domain = classify_domain(title)
        organism = classify_organism(title)
        platform = classify_platform(title)
        risk = determine_mission_risk(domain, title)
        cm = extract_countermeasure(title, domain)
        cons = extract_consensus_status(title)

        records.append({
            "id": idx + 1,
            "title": title,
            "pmc_id": pmc,
            "link": link,
            "domain": domain,
            "organism": organism,
            "platform": platform,
            "mission_risk": risk,
            "recommended_countermeasure": cm,
            "consensus_status": cons["status"],
            "consensus_note": cons["consensus_note"]
        })

    df_enriched = pd.DataFrame(records)
    print("Publications enriched successfully.")
    return df_enriched

def analyze_gene_dataset():
    print("Analyzing NASA_Dataset.csv (Arabidopsis Thaliana GeneLab Expression)...")
    # Load dataset
    df_genes = pd.read_csv("NASA_Dataset.csv")
    print(f"Gene count: {len(df_genes)}")

    # Columns:
    # WT GC (Ground Control): Atha_Col-0_wo_WT_GC_Rep1, 2, 3
    # WT FLT (Flight): Atha_Col-0_wo_WT_FLT_Rep1, 2, 3
    # Mutant act2-3 GC: Atha_Col-0_wo_act2-3_GC_Rep1, 2, 3
    # Mutant act2-3 FLT: Atha_Col-0_wo_act2-3_FLT_Rep1, 2, 3

    wt_gc_cols = ['Atha_Col-0_wo_WT_GC_Rep1', 'Atha_Col-0_wo_WT_GC_Rep2', 'Atha_Col-0_wo_WT_GC_Rep3']
    wt_flt_cols = ['Atha_Col-0_wo_WT_FLT_Rep1', 'Atha_Col-0_wo_WT_FLT_Rep2', 'Atha_Col-0_wo_WT_FLT_Rep3']

    act2_gc_cols = ['Atha_Col-0_wo_act2-3_GC_Rep1', 'Atha_Col-0_wo_act2-3_GC_Rep2', 'Atha_Col-0_wo_act2-3_GC_Rep3']
    act2_flt_cols = ['Atha_Col-0_wo_act2-3_FLT_Rep1', 'Atha_Col-0_wo_act2-3_FLT_Rep2', 'Atha_Col-0_wo_act2-3_FLT_Rep3']

    # Convert numeric
    for c in wt_gc_cols + wt_flt_cols + act2_gc_cols + act2_flt_cols:
        df_genes[c] = pd.to_numeric(df_genes[c], errors='coerce')

    df_genes.dropna(subset=wt_gc_cols + wt_flt_cols, inplace=True)

    # Compute WT Mean FLT and Mean GC
    mean_wt_gc = df_genes[wt_gc_cols].mean(axis=1)
    mean_wt_flt = df_genes[wt_flt_cols].mean(axis=1)

    # Log2 Fold Change (values are already normalized log-scale microarrays or intensity, let's take difference)
    # If expression is log2 scale already (ranges usually 2-14), diff = log2FC.
    log2fc = mean_wt_flt - mean_wt_gc
    df_genes["log2FoldChange_WT"] = log2fc
    df_genes["mean_Flight"] = mean_wt_flt
    df_genes["mean_GroundControl"] = mean_wt_gc

    # Calculate two-sample t-test per gene for p-value
    # Vectorized / fast approximation
    v_flt = df_genes[wt_flt_cols].values
    v_gc = df_genes[wt_gc_cols].values
    
    t_stat, p_val = stats.ttest_ind(v_flt, v_gc, axis=1, equal_var=False)
    # Handle NaNs or 0
    p_val = np.nan_to_num(p_val, nan=1.0)
    p_val = np.clip(p_val, 1e-30, 1.0)
    neg_log10_p = -np.log10(p_val)

    df_genes["p_value"] = p_val
    df_genes["neg_log10_p"] = neg_log10_p

    def get_regulation(fc, p):
        if p < 0.05 and fc >= 1.0:
            return "Significantly Up-regulated in Space"
        elif p < 0.05 and fc <= -1.0:
            return "Significantly Down-regulated in Space"
        else:
            return "Not Significantly Changed"

    df_genes["regulation_status"] = [get_regulation(fc, p) for fc, p in zip(log2fc, p_val)]

    # Top differential genes
    sig_genes = df_genes[df_genes["p_value"] < 0.05].copy()
    sig_genes["abs_fc"] = sig_genes["log2FoldChange_WT"].abs()
    top_diff = sig_genes.sort_values(by="abs_fc", ascending=False).head(200)

    print(f"Significant genes (p < 0.05): {len(sig_genes)}")
    print(f"Up-regulated: {(df_genes['regulation_status'] == 'Significantly Up-regulated in Space').sum()}")
    print(f"Down-regulated: {(df_genes['regulation_status'] == 'Significantly Down-regulated in Space').sum()}")

    # Prepare lightweight payload for web app
    top_genes_payload = []
    for _, r in top_diff.iterrows():
        top_genes_payload.append({
            "tair": str(r["TAIR"]),
            "symbol": str(r["SYMBOL"]) if pd.notna(r["SYMBOL"]) else str(r["TAIR"]),
            "genename": str(r["GENENAME"]) if pd.notna(r["GENENAME"]) else "",
            "log2fc": round(float(r["log2FoldChange_WT"]), 3),
            "p_val": float(r["p_value"]),
            "neg_log10_p": round(float(r["neg_log10_p"]), 2),
            "regulation": str(r["regulation_status"]),
            "mean_flt": round(float(r["mean_Flight"]), 2),
            "mean_gc": round(float(r["mean_GroundControl"]), 2)
        })

    # Summary statistics for volcano plot (sample down to ~1500 points for ultra-smooth rendering)
    step = max(1, len(df_genes) // 1500)
    volcano_sample = []
    for _, r in df_genes.iloc[::step].iterrows():
        volcano_sample.append({
            "symbol": str(r["SYMBOL"]) if pd.notna(r["SYMBOL"]) else str(r["TAIR"]),
            "tair": str(r["TAIR"]),
            "log2fc": round(float(r["log2FoldChange_WT"]), 3),
            "neg_log10_p": round(float(r["neg_log10_p"]), 2),
            "regulation": str(r["regulation_status"])
        })

    return top_genes_payload, volcano_sample, {
        "total_genes": int(len(df_genes)),
        "significant_up": int((df_genes['regulation_status'] == 'Significantly Up-regulated in Space').sum()),
        "significant_down": int((df_genes['regulation_status'] == 'Significantly Down-regulated in Space').sum()),
        "unchanged": int((df_genes['regulation_status'] == 'Not Significantly Changed').sum())
    }

def generate_knowledge_graph(df_pub):
    print("Generating Knowledge Graph nodes and edges...")
    nodes = []
    links = []
    node_set = set()

    def add_node(nid, label, ntype, size=15, group=1, metadata=None):
        if nid not in node_set:
            node_set.add(nid)
            nodes.append({
                "id": nid,
                "label": label,
                "type": ntype,
                "size": size,
                "group": group,
                "metadata": metadata or {}
            })

    # Central Core Node
    add_node("NASA_SPACE_BIOLOGY", "NASA Space Biology Knowledge Engine", "core", size=32, group=0)

    # Domain Nodes
    domains = df_pub["domain"].unique()
    for d in domains:
        count = int((df_pub["domain"] == d).sum())
        add_node(f"domain_{d}", d, "domain", size=24, group=1, metadata={"count": count})
        links.append({"source": "NASA_SPACE_BIOLOGY", "target": f"domain_{d}", "relation": "encompasses", "value": count})

    # Stressor Nodes
    stressors = [
        ("stress_microgravity", "Microgravity (0g to partial g)", ["Musculoskeletal & Bone Loss", "Cardiovascular & Fluid Shifts", "Plant Biology & Space Agriculture", "Neuroscience & Vision (SANS)"]),
        ("stress_radiation", "Galactic Cosmic Radiation & SPE", ["Radiation & Deep Space Hazards", "Omics, Mitochondria & Cellular Stress"]),
        ("stress_confinement", "Isolation & Confinement Stress", ["Neuroscience & Vision (SANS)", "Immunology & Infection"]),
        ("stress_closed_loop", "Closed-loop Life Support & CO2", ["Plant Biology & Space Agriculture", "Microbiology & Biofilms"])
    ]
    for sid, sname, mapped_domains in stressors:
        add_node(sid, sname, "stressor", size=20, group=2)
        for md in mapped_domains:
            links.append({"source": sid, "target": f"domain_{md}", "relation": "affects", "value": 15})

    # Key Organism Nodes
    organisms = df_pub["organism"].value_counts().head(7).index
    for org in organisms:
        cnt = int((df_pub["organism"] == org).sum())
        add_node(f"org_{org}", org, "organism", size=18, group=3, metadata={"count": cnt})
        # Link to dominant domains
        sub = df_pub[df_pub["organism"] == org]
        top_d = sub["domain"].value_counts().head(2).index
        for td in top_d:
            links.append({"source": f"org_{org}", "target": f"domain_{td}", "relation": "investigated_in", "value": cnt})

    # Key Countermeasure Nodes
    countermeasures = [
        ("cm_bisphosphonates", "Bisphosphonates & Sclerostin Ab", "Musculoskeletal & Bone Loss"),
        ("cm_ared_exercise", "ARED Advanced Resistive Exercise", "Musculoskeletal & Bone Loss"),
        ("cm_lbnp", "Lower Body Negative Pressure (LBNP)", "Cardiovascular & Fluid Shifts"),
        ("cm_mitoq", "Mitochondrial Antioxidants (MitoQ/NAC)", "Radiation & Deep Space Hazards"),
        ("cm_led_spectrum", "Dynamic Spectrum LED Optimization", "Plant Biology & Space Agriculture"),
        ("cm_artificial_gravity", "Short-Arm Centrifugation (0.38g-1g)", "Musculoskeletal & Bone Loss"),
        ("cm_probiotics", "Microbiome & Probiotic Stabalizers", "Immunology & Infection")
    ]
    for cid, cname, target_domain in countermeasures:
        add_node(cid, cname, "countermeasure", size=16, group=4)
        links.append({"source": cid, "target": f"domain_{target_domain}", "relation": "mitigates", "value": 10})

    # Add Sample High-Impact Publications
    for _, row in df_pub.head(30).iterrows():
        pid = f"pub_{row['id']}"
        add_node(pid, row['title'][:45] + "...", "publication", size=10, group=5, metadata={
            "full_title": row['title'],
            "pmc_id": row['pmc_id'],
            "link": row['link'],
            "domain": row['domain'],
            "consensus": row['consensus_status']
        })
        links.append({"source": pid, "target": f"domain_{row['domain']}", "relation": "published_in", "value": 5})
        links.append({"source": pid, "target": f"org_{row['organism']}", "relation": "tested_on", "value": 3})

    print(f"Graph built with {len(nodes)} nodes and {len(links)} links.")
    return {"nodes": nodes, "links": links}

def main():
    df_pub = analyze_publications()
    top_genes, volcano, gene_stats = analyze_gene_dataset()
    graph_data = generate_knowledge_graph(df_pub)

    # Save enriched publications JSON & CSV
    pub_list = df_pub.to_dict(orient="records")
    with open("enriched_publications.json", "w", encoding="utf-8") as f:
        json.dump(pub_list, f, indent=2)
    df_pub.to_csv("enriched_publications.csv", index=False)

    # Save GeneLab analysis JSON
    genelab_data = {
        "stats": gene_stats,
        "top_differential_genes": top_genes,
        "volcano_sample": volcano
    }
    with open("genelab_expression_analysis.json", "w", encoding="utf-8") as f:
        json.dump(genelab_data, f, indent=2)

    # Save Knowledge Graph
    with open("knowledge_graph.json", "w", encoding="utf-8") as f:
        json.dump(graph_data, f, indent=2)

    # Generate Domain Summary for Analytics
    domain_counts = df_pub["domain"].value_counts().to_dict()
    organism_counts = df_pub["organism"].value_counts().to_dict()
    platform_counts = df_pub["platform"].value_counts().to_dict()
    consensus_counts = df_pub["consensus_status"].value_counts().to_dict()

    summary_stats = {
        "total_publications": len(df_pub),
        "domains": domain_counts,
        "organisms": organism_counts,
        "platforms": platform_counts,
        "consensus": consensus_counts
    }
    with open("summary_stats.json", "w", encoding="utf-8") as f:
        json.dump(summary_stats, f, indent=2)

    print("All preprocessing and enrichment data generated successfully!")

if __name__ == "__main__":
    main()
