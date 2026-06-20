"""Keep thesis notebooks 03/04 wired to the reproducible prototype checkpoint."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIZ = ROOT.parents[1] / "data visualisation"


def source(text):
    return [line + "\n" for line in text.strip().splitlines()]


def replace_cell(notebook, index, text):
    notebook["cells"][index]["source"] = source(text)
    notebook["cells"][index]["outputs"] = []
    notebook["cells"][index]["execution_count"] = None


def sync_notebook03():
    path = VIZ / "03_graphsage_road_nodes.ipynb"
    notebook = json.loads(path.read_text())
    notebook["cells"][25]["source"] = source("""
## 7 · Train, calibrate, and publish the shared notebook checkpoint

The release checkpoint is built by `project-spark/pipeline/train_notebook_graphsage.py`. It uses
the same eight features shown above, five spatial folds, fold-local scaling, class-balanced loss,
deterministic seeds, temperature calibration, confidence/entropy abstention, and a joint-feature
domain-shift check. The same hashed artifact is written to this notebook's `outputs/` folder and
to the prototype, preventing the two surfaces from drifting again.
""")
    replace_cell(notebook, 26, """
import json, subprocess, sys, torch
from pathlib import Path

pipeline = Path("../PROTOTYPE/project-spark/pipeline").resolve()
subprocess.run([sys.executable, str(pipeline / "train_notebook_graphsage.py")], check=True)
sys.path.insert(0, str(pipeline))
import notebook_model as NM
ckpt = torch.load("outputs/graphsage_foodenv.pt", map_location="cpu", weights_only=False)
metrics = ckpt["metrics"]
model = NM.new_model(); model.load_state_dict(ckpt["state_dict"]); model.eval()
Xs = (torch.tensor(Xk, dtype=torch.float32) - torch.tensor(ckpt["mean"])) / torch.tensor(ckpt["std"])
with torch.no_grad(): pred_all = model(Xs, edge_index).argmax(1).numpy()
print(f"reproducible spatial-CV macro-F1: {metrics['spatial_cv_macro_f1']:.3f}")
print(f"calibrated ECE: {metrics['calibrated_ece']:.3f}")
print(f"selective coverage: {metrics['selective_coverage']:.1%}")
print(f"promotion: {'PASS' if ckpt['promotion_passed'] else 'FAIL'}")
print("saved -> outputs/graphsage_foodenv.pt (+ metadata/evaluation in project-spark)")
""")
    path.write_text(json.dumps(notebook, indent=1))


def sync_notebook04():
    path = VIZ / "04_transfer_mysore_scenario.ipynb"
    notebook = json.loads(path.read_text())
    notebook["cells"][0]["source"] = source("""
# 04 · Reproducible GraphSAGE Transfer to Mysuru + a Tech-Park Scenario
### apply the calibrated eight-feature checkpoint, abstain when uncertain, then simulate new infrastructure

This notebook and the prototype load the same hashed checkpoint produced by notebook 03's shared
training pipeline. Mysuru labels are model projections, never local ground truth. Low-confidence,
high-entropy, or out-of-domain nodes are reported as `unknown` rather than forced into a class.

The relative scenario change remains the most defensible signal because Mysuru has no local labels
or observed affordability data.
""")
    replace_cell(notebook, 3, """
import json, warnings, sys, numpy as np, pandas as pd, geopandas as gpd
import matplotlib.pyplot as plt
import torch
from pathlib import Path
warnings.filterwarnings("ignore"); torch.manual_seed(23)

CACHE="../PROTOTYPE/FIRST ONE/fosz_hex/cache"; OUT="outputs"
PIPELINE=Path("../PROTOTYPE/project-spark/pipeline").resolve()
sys.path.insert(0, str(PIPELINE))
sys.path.insert(0, str(Path.cwd()))
import gnn_features as G
import notebook_model as NM
from osm_features import fixed_percentile_rows
from osm_model import apply_abstention, full_edge_index, ood_scores, softmax_probabilities

PALETTE={"bg":"#F8F6F2","desert":"#D59E71","oasis":"#B9CA9D","mirage":"#FFE09D","swamp":"#3D5A80","unknown":"#C9D4E0","accent":"#64748B"}
LCOL={"food_desert":PALETTE["desert"],"food_oasis":PALETTE["oasis"],"food_mirage":PALETTE["mirage"],"food_swamp":PALETTE["swamp"],"unknown":PALETTE["unknown"]}
plt.rcParams.update({"figure.facecolor":PALETTE["bg"],"axes.facecolor":PALETTE["bg"],"savefig.facecolor":PALETTE["bg"]})

ckpt, model = NM.load_checkpoint(f"{OUT}/graphsage_foodenv.pt")
mu=torch.tensor(ckpt["mean"]); sd=torch.tensor(ckpt["std"])
print("loaded reproducible checkpoint:", ckpt["model_version"])
print("features:", ckpt["feature_names"])
print(f"spatial-CV macro-F1={ckpt['metrics']['spatial_cv_macro_f1']:.3f}; calibrated ECE={ckpt['metrics']['calibrated_ece']:.3f}")
""")
    replace_cell(notebook, 5, """
print("FROZEN knowledge carried over from Bengaluru:")
for name, value in ckpt["state_dict"].items():
    print(f"   {name:24s} weight shape {tuple(value.shape)}")
print()
print(f"   feature order : {ckpt['feature_names']}")
print(f"   scaler mean   : {np.round(np.array(ckpt['mean']),1)}")
print(f"   scaler std    : {np.round(np.array(ckpt['std']),1)}")
print(f"   honest CV F1  : {ckpt['metrics']['spatial_cv_macro_f1']:.3f}")
print(f"   selective coverage: {ckpt['metrics']['selective_coverage']:.1%}")
print()
print("Recomputed for Mysuru below: graph, raw features, fixed ECDF, probabilities, and abstention.")
""")
    notebook["cells"][6]["source"] = source("""
## 1 · Load the canonical Mysuru road graph

The notebook reads the exact graph artifact served by the prototype. This removes the former split
between a stale 19,138-node notebook cache and the 19,116-node published graph.
""")
    notebook["cells"][7]["source"] = source("""
### EXTRACT — one graph artifact for notebook and product
Road coordinates, edges, and the matched raw feature matrix come from
`project-spark/public/data/mysuru_graph.json`. Rebuilding the OSM extraction is a separate,
timestamped pipeline step; inference never silently downloads a different snapshot.
""")
    replace_cell(notebook, 8, """
from shapely.geometry import MultiPoint
graph_path=Path("../PROTOTYPE/project-spark/public/data/mysuru_graph.json")
graph=json.loads(graph_path.read_text())
coords=np.asarray(graph["lonlat"],dtype=float)
E=[tuple(edge) for edge in graph["edges"]]
inside=np.ones(len(coords),dtype=bool)
boundary=MultiPoint(coords).convex_hull
print(f"Mysuru canonical graph: {len(coords):,} nodes, {len(E):,} edges")
""")
    notebook["cells"][9]["source"] = source("""
## 2 · Canonical eight-feature matrix
The raw matrix uses the exact feature order saved in the checkpoint and published graph metadata.
""")
    notebook["cells"][10]["source"] = source("""
### WEIGHT — fixed within-city ECDF
Baseline rows receive average-rank percentiles. Scenario rows are scored against those same frozen
baseline columns, so a local intervention does not rerank the rest of Mysuru.
""")
    replace_cell(notebook, 11, """
from pyproj import Transformer
feature_index={name:index for index,name in enumerate(graph["model_feature_names"])}
X=np.asarray(graph["model_features_raw"],dtype=np.float32)[:,[feature_index[name] for name in NM.NOTEBOOK_FEATURES]]
transformer=Transformer.from_crs(4326,32643,always_xy=True)
node_xy=np.asarray(transformer.transform(coords[:,0],coords[:,1])).T
print(f"feature matrix {X.shape} · schema {NM.NOTEBOOK_SCHEMA_VERSION}")
pd.DataFrame(X,columns=NM.NOTEBOOK_FEATURES).describe().round(2).T[["mean","min","50%","max"]]
""")
    replace_cell(notebook, 13, """
# kept-node subgraph (intersections inside the Mysuru boundary)
inside_idx=np.where(inside)[0]
old2new={o:n for n,o in enumerate(inside_idx)}
ei=[(old2new[u],old2new[v]) for u,v in E if u in old2new and v in old2new]
eidx=full_edge_index(ei)

Xin=X[inside]; ck=coords[inside]; xyk=node_xy[inside]
_sortcols=[np.sort(Xin[:,j]) for j in range(Xin.shape[1])]
label_to_id={key.replace("food_",""):value for key,value in G.LABELS.items()}
label_to_id["unknown"]=-1
def label_name(value):
    return "unknown" if int(value) < 0 else G.ID2LABEL[int(value)]
def predict_pct(X_inside):
    pct=fixed_percentile_rows(_sortcols, X_inside)
    Xs=(torch.tensor(pct)-mu)/sd
    with torch.no_grad(): logits=model(Xs, eidx).cpu().numpy()
    probabilities=softmax_probabilities(logits, ckpt["temperature"])
    ood=ood_scores(pct, ckpt["ood_location"], ckpt["ood_precision"])
    labels, confidence, entropy, accepted, reasons=apply_abstention(
        probabilities, ood, ckpt["confidence_threshold"], ckpt["entropy_threshold"], ckpt["ood_threshold"])
    ids=np.array([label_to_id[label] for label in labels], dtype=int)
    return ids, probabilities, confidence, entropy, ood, reasons

pred, pred_prob, pred_conf, pred_entropy, pred_ood, pred_reasons=predict_pct(Xin)
print("Mysuru calibrated projection:", pd.Series([label_name(v) for v in pred]).value_counts().to_dict())
""")
    replace_cell(notebook, 16, """
from scipy.spatial import cKDTree
desert_xy=xyk[pred==G.LABELS["food_desert"]]
hub=desert_xy.mean(0) if len(desert_xy) else xyk.mean(0)
RAD=2000.0
d=cKDTree(xyk).query_ball_point(hub,RAD)
mask_local=np.zeros(len(xyk),bool); mask_local[d]=True
print(f"tech-park hub affects {mask_local.sum()} intersections within {RAD/1000:.0f} km")

Xsc=Xin.copy(); fi={f:i for i,f in enumerate(G.FEATS)}
Xsc[mask_local,fi["food_800m"]]+=12
Xsc[mask_local,fi["food_1500m"]]+=25
Xsc[mask_local,fi["nearest_food_km"]]=np.minimum(Xsc[mask_local,fi["nearest_food_km"]],0.15)
Xsc[mask_local,fi["inter_density_1km"]]*=1.4
pred_sc, pred_sc_prob, pred_sc_conf, pred_sc_entropy, pred_sc_ood, pred_sc_reasons=predict_pct(Xsc)

changed=pred_sc!=pred
print(f"label changes: {(changed & mask_local).sum()} inside + {(changed & ~mask_local).sum()} graph spillover")
tab=pd.crosstab(pd.Series([label_name(v) for v in pred[mask_local]],name="before"),
                pd.Series([label_name(v) for v in pred_sc[mask_local]],name="after"))
print(tab)
""")
    notebook["cells"][17]["source"] = [
        line.replace("G.ID2LABEL[v]", "label_name(v)").replace(
            "Patch(facecolor=LCOL[k],label=k.replace('food_','')) for k in LCOL",
            "Patch(facecolor=LCOL[k],label=k.replace('food_','')) for k in LCOL",
        )
        for line in notebook["cells"][17]["source"]
    ]
    notebook["cells"][18]["source"] = [
        line.replace("G.ID2LABEL[int(v)]", "label_name(v)")
        for line in notebook["cells"][18]["source"]
    ]
    notebook["cells"][20]["source"] = [
        line.replace("G.ID2LABEL[pred[j]]", "label_name(pred[j])")
        .replace("G.ID2LABEL[pred_sc[j]]", "label_name(pred_sc[j])")
        .replace("pct(Xin)", "fixed_percentile_rows(_sortcols, Xin)")
        .replace("pct(Xsc)", "fixed_percentile_rows(_sortcols, Xsc)")
        for line in notebook["cells"][20]["source"]
    ]
    notebook["cells"][21]["source"] = source("""
## 5 · Read-out
- **Baseline**: the shared calibrated model projects all four classes and explicitly abstains to
  `unknown` when confidence, entropy, or joint-feature domain-shift checks fail.
- **Scenario**: food counts, nearest-food distance, and intersection density change inside the hub;
  the complete graph is rerun, so connected nodes may change through real message passing.
- **Limits**: Mysuru has no local ground truth or affordability observations. Mirage and oasis are
  learned Bengaluru patterns, and relative scenario movement is more defensible than absolute labels.
""")
    path.write_text(json.dumps(notebook, indent=1))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--notebook", choices=["03", "04", "all"], default="all")
    args = parser.parse_args()
    if args.notebook in ("03", "all"):
        sync_notebook03()
    if args.notebook in ("04", "all"):
        sync_notebook04()
    print(f"synchronized notebook selection: {args.notebook}")
