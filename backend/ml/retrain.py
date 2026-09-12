"""
VendorIQ — Controlled Model Retraining & Governance Pipeline
Provides an administrator-only, review-gated retraining lifecycle.
Never automatically overwrites the active production model.
"""

import os
import shutil
import json
from datetime import datetime
import psycopg2
import pandas as pd
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

from ml.predict import clear_cached_model, get_model_metadata

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(CURRENT_DIR, "artifacts")
VERSIONS_DIR = os.path.join(ARTIFACTS_DIR, "versions")
CANDIDATES_DIR = os.path.join(ARTIFACTS_DIR, "candidates")
PROD_MODEL_PATH = os.path.join(ARTIFACTS_DIR, "delivery_delay_model.joblib")
PROD_METADATA_PATH = os.path.join(CURRENT_DIR, "model_metadata.json")

os.makedirs(VERSIONS_DIR, exist_ok=True)
os.makedirs(CANDIDATES_DIR, exist_ok=True)

DB_CONFIG = {
    'dbname': 'vendor_platform',
    'user': 'postgres',
    'password': 'Amruta@9279',
    'host': 'localhost',
    'port': 5432
}

def validate_retraining_data() -> dict:
    """Validate database training dataset readiness, volume, and label distribution."""
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE late_delivery_risk = 1),
            COUNT(*) FILTER (WHERE late_delivery_risk = 0),
            COUNT(DISTINCT category_name),
            COUNT(DISTINCT shipping_mode)
        FROM dataco_raw_orders
        WHERE late_delivery_risk IS NOT NULL AND order_date IS NOT NULL
    """)
    row = cur.fetchone()
    conn.close()

    total, late, on_time, cat_count, mode_count = row
    if total < 5000:
        raise ValueError(f"Insufficient training volume: {total} records found (minimum 5,000 required).")

    late_ratio = (late / total) if total > 0 else 0
    if late_ratio < 0.1 or late_ratio > 0.9:
        raise ValueError(f"Extreme class imbalance: late delivery rate is {late_ratio*100:.1f}%.")

    return {
        "status": "Validated",
        "total_records": total,
        "late_records": late,
        "on_time_records": on_time,
        "late_rate_percentage": round(late_ratio * 100, 2),
        "distinct_categories": cat_count,
        "distinct_shipping_modes": mode_count,
        "validation_passed": True,
        "validated_at": datetime.now().isoformat()
    }

def train_candidate_model(candidate_tag: str = None) -> dict:
    """
    Trains a new candidate model on chronological split and evaluates performance.
    Saves candidate into candidates/ without affecting production.
    """
    val_report = validate_retraining_data()
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    candidate_id = f"candidate_{candidate_tag or timestamp_str}"

    conn = psycopg2.connect(**DB_CONFIG)
    query = """
        SELECT 
            d.shipping_mode,
            CAST(d.days_for_shipment_scheduled AS FLOAT) as days_for_shipment_scheduled,
            COALESCE(d.category_name, 'Standard Catalog') as category_name,
            COALESCE(d.order_region, 'Domestic') as order_region,
            COALESCE(d.order_country, 'United States') as order_country,
            CAST(COALESCE(d.order_item_quantity, 1.0) AS FLOAT) as order_item_quantity,
            CAST(COALESCE(d.order_item_product_price, 50.0) AS FLOAT) as order_item_product_price,
            CAST(COALESCE(d.order_item_total, 50.0) AS FLOAT) as order_item_total,
            EXTRACT(MONTH FROM d.order_date) as order_month,
            EXTRACT(DOW FROM d.order_date) as order_day_of_week,
            EXTRACT(HOUR FROM d.order_date) as order_hour,
            CAST(COALESCE(v.reliability_score, 70.0) AS FLOAT) as vendor_reliability,
            CAST(COALESCE(v.delivery_rate, 50.0) AS FLOAT) as vendor_on_time_rate,
            CAST(COALESCE(v.total_orders, 100) AS FLOAT) as vendor_total_orders,
            d.late_delivery_risk,
            d.order_date
        FROM dataco_raw_orders d
        LEFT JOIN purchase_orders po ON d.order_item_id = po.order_item_id
        LEFT JOIN vendors v ON po.vendor_id = v.id
        WHERE d.late_delivery_risk IS NOT NULL AND d.order_date IS NOT NULL
        ORDER BY d.order_date ASC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()

    numerical_features = [
        'days_for_shipment_scheduled', 'order_item_quantity', 'order_item_product_price',
        'order_item_total', 'order_month', 'order_day_of_week', 'order_hour',
        'vendor_reliability', 'vendor_on_time_rate', 'vendor_total_orders'
    ]
    categorical_features = ['shipping_mode', 'category_name', 'order_region', 'order_country']
    all_features = categorical_features + numerical_features

    X = df[all_features]
    y = df['late_delivery_risk'].astype(int)

    split_idx = int(len(df) * 0.8)
    X_train = X.iloc[:split_idx]
    y_train = y.iloc[:split_idx]
    X_test = X.iloc[split_idx:]
    y_test = y.iloc[split_idx:]

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
        ]
    )

    clf = HistGradientBoostingClassifier(
        max_iter=120,
        max_depth=10,
        random_state=42,
        learning_rate=0.1
    )

    pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', clf)
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc = roc_auc_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred).tolist()

    candidate_metrics = {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(roc), 4),
        "confusion_matrix": cm
    }

    # Compare to production
    prod_meta = get_model_metadata() or {}
    prod_perf = prod_meta.get("performance_metrics", {})
    prod_f1 = prod_perf.get("f1_score", 0.0)
    prod_acc = prod_perf.get("accuracy", 0.0)

    f1_diff = candidate_metrics["f1_score"] - prod_f1
    acc_diff = candidate_metrics["accuracy"] - prod_acc

    if f1_diff >= 0.0:
        recommendation = f"Candidate matches or improves F1-Score (+{f1_diff*100:.2f}%). Ready for manual administrator promotion."
        approved_for_promotion = True
    else:
        recommendation = f"Candidate F1-Score is lower ({f1_diff*100:.2f}%) than active production. Promotion discouraged."
        approved_for_promotion = False

    candidate_file = os.path.join(CANDIDATES_DIR, f"{candidate_id}.joblib")
    candidate_meta_file = os.path.join(CANDIDATES_DIR, f"{candidate_id}_meta.json")

    joblib.dump(pipeline, candidate_file)

    meta_payload = {
        "candidate_id": candidate_id,
        "candidate_version": f"v1.{timestamp_str[:8]}-candidate",
        "created_at": datetime.now().isoformat(),
        "training_dataset_size": len(df),
        "train_records": len(X_train),
        "test_records": len(X_test),
        "candidate_metrics": candidate_metrics,
        "production_metrics": prod_perf,
        "comparison": {
            "f1_delta": round(f1_diff, 4),
            "accuracy_delta": round(acc_diff, 4),
            "approved_for_promotion": approved_for_promotion,
            "recommendation": recommendation
        }
    }

    with open(candidate_meta_file, "w", encoding="utf-8") as f:
        json.dump(meta_payload, f, indent=4)

    return meta_payload

def promote_candidate(candidate_id: str, admin_email: str) -> dict:
    """
    Explicit Administrator Promotion:
    1. Archives current production model to versions/
    2. Promotes candidate to production
    3. Updates model_metadata.json
    4. Invalidates in-memory model cache
    """
    candidate_file = os.path.join(CANDIDATES_DIR, f"{candidate_id}.joblib")
    candidate_meta_file = os.path.join(CANDIDATES_DIR, f"{candidate_id}_meta.json")

    if not os.path.exists(candidate_file) or not os.path.exists(candidate_meta_file):
        raise FileNotFoundError(f"Candidate '{candidate_id}' artifacts not found in {CANDIDATES_DIR}")

    with open(candidate_meta_file, "r", encoding="utf-8") as f:
        cand_meta = json.load(f)

    # 1. Archive current production model
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    prod_meta = get_model_metadata() or {}
    cur_version = prod_meta.get("model_version", "1.0.0")

    archived_model_file = os.path.join(VERSIONS_DIR, f"v{cur_version}_{timestamp_str}_model.joblib")
    archived_meta_file = os.path.join(VERSIONS_DIR, f"v{cur_version}_{timestamp_str}_meta.json")

    if os.path.exists(PROD_MODEL_PATH):
        shutil.copyfile(PROD_MODEL_PATH, archived_model_file)
    if os.path.exists(PROD_METADATA_PATH):
        shutil.copyfile(PROD_METADATA_PATH, archived_meta_file)

    # 2. Promote candidate artifact to production path
    shutil.copyfile(candidate_file, PROD_MODEL_PATH)

    # 3. Update model_metadata.json
    new_version_num = cand_meta.get("candidate_version", f"1.1.0").replace("-candidate", "").replace("v", "")
    updated_prod_meta = prod_meta.copy()
    updated_prod_meta["model_version"] = new_version_num
    updated_prod_meta["promoted_at"] = datetime.now().isoformat()
    updated_prod_meta["promoted_by"] = admin_email
    updated_prod_meta["previous_version"] = cur_version
    updated_prod_meta["performance_metrics"] = cand_meta.get("candidate_metrics", updated_prod_meta.get("performance_metrics"))

    with open(PROD_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(updated_prod_meta, f, indent=4)

    # 4. Invalidate singleton cache in predict.py
    clear_cached_model()

    return {
        "status": "Promoted Successfully",
        "new_active_version": new_version_num,
        "archived_previous_version": cur_version,
        "promoted_by": admin_email,
        "promoted_at": updated_prod_meta["promoted_at"],
        "performance_metrics": updated_prod_meta["performance_metrics"]
    }

def list_all_versions() -> dict:
    """List current active production model, archived versions, and pending candidate models."""
    prod_meta = get_model_metadata() or {}

    archived = []
    if os.path.exists(VERSIONS_DIR):
        for fname in os.listdir(VERSIONS_DIR):
            if fname.endswith("_meta.json"):
                fpath = os.path.join(VERSIONS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        archived.append(json.load(f))
                except Exception:
                    pass

    candidates = []
    if os.path.exists(CANDIDATES_DIR):
        for fname in os.listdir(CANDIDATES_DIR):
            if fname.endswith("_meta.json"):
                fpath = os.path.join(CANDIDATES_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        candidates.append(json.load(f))
                except Exception:
                    pass

    return {
        "active_production_model": {
            "version": prod_meta.get("model_version", "1.0.0"),
            "model_type": prod_meta.get("model_type", "HistGradientBoosting"),
            "trained_at": prod_meta.get("trained_at"),
            "promoted_at": prod_meta.get("promoted_at"),
            "promoted_by": prod_meta.get("promoted_by"),
            "performance_metrics": prod_meta.get("performance_metrics", {})
        },
        "archived_versions_count": len(archived),
        "archived_versions": archived,
        "candidate_models_count": len(candidates),
        "candidate_models": candidates
    }
