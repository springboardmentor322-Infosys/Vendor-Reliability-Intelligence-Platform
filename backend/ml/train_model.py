"""
VendorIQ — Real Machine Learning Pipeline
Model Training for Delivery Delay Risk & Vendor Risk Prediction
"""

import os
import sys
import json
from datetime import datetime
import psycopg2
import pandas as pd
import numpy as np
import joblib

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

sys.stdout.reconfigure(encoding='utf-8')

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(CURRENT_DIR, "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

MODEL_PATH = os.path.join(ARTIFACTS_DIR, "delivery_delay_model.joblib")
METADATA_PATH = os.path.join(CURRENT_DIR, "model_metadata.json")

# Database configuration
DB_CONFIG = {
    "dbname": "vendor_platform",
    "user": "postgres",
    "password": "Amruta@9279",
    "host": "localhost",
    "port": 5432
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def load_data_from_db():
    log("Connecting to PostgreSQL database to extract features...")
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
        ORDER BY d.order_date ASC;
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()
    log(f"Extracted {len(df):,} rows from database.")
    return df

def train_and_evaluate():
    df = load_data_from_db()
    
    # Define categorical and numerical features
    categorical_features = [
        'shipping_mode',
        'category_name',
        'order_region',
        'order_country'
    ]
    
    numerical_features = [
        'days_for_shipment_scheduled',
        'order_item_quantity',
        'order_item_product_price',
        'order_item_total',
        'order_month',
        'order_day_of_week',
        'order_hour',
        'vendor_reliability',
        'vendor_on_time_rate',
        'vendor_total_orders'
    ]
    
    all_features = categorical_features + numerical_features
    X = df[all_features]
    y = df['late_delivery_risk'].astype(int)
    
    # Chronological train/test split (First 80% train, last 20% test)
    split_idx = int(len(df) * 0.8)
    X_train = X.iloc[:split_idx]
    y_train = y.iloc[:split_idx]
    X_test = X.iloc[split_idx:]
    y_test = y.iloc[split_idx:]
    
    log(f"Chronological Split: Training on {len(X_train):,} past records, Testing on {len(X_test):,} future records.")
    log(f"Train Late Rate: {y_train.mean()*100:.2f}%, Test Late Rate: {y_test.mean()*100:.2f}%")
    
    # Build Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
        ]
    )
    
    # Candidate Models
    candidates = {
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "DecisionTree": DecisionTreeClassifier(max_depth=10, min_samples_leaf=20, random_state=42),
        "HistGradientBoosting": HistGradientBoostingClassifier(max_iter=120, max_depth=10, random_state=42, learning_rate=0.1)
    }
    
    model_evaluations = []
    best_model_name = None
    best_f1 = -1.0
    best_pipeline = None
    best_metrics = None
    
    log("\n==================================================")
    log("TRAINING & EVALUATING CANDIDATE MODELS")
    log("==================================================")
    
    for name, clf in candidates.items():
        log(f"\n--- Training {name} ---")
        pipeline = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', clf)
        ])
        
        pipeline.fit(X_train, y_train)
        
        # Predictions
        y_pred = pipeline.predict(X_test)
        y_proba = pipeline.predict_proba(X_test)[:, 1] if hasattr(pipeline, "predict_proba") else None
        
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        roc = roc_auc_score(y_test, y_proba) if y_proba is not None else 0.0
        cm = confusion_matrix(y_test, y_pred).tolist()
        
        metrics = {
            "model_name": name,
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(roc), 4),
            "confusion_matrix": cm
        }
        model_evaluations.append(metrics)
        
        log(f"  {name} Results:")
        log(f"    Accuracy:  {acc*100:.2f}%")
        log(f"    Precision: {prec*100:.2f}%")
        log(f"    Recall:    {rec*100:.2f}%")
        log(f"    F1 Score:  {f1*100:.2f}%")
        log(f"    ROC-AUC:   {roc:.4f}")
        log(f"    Confusion Matrix: {cm}")
        
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_pipeline = pipeline
            best_metrics = metrics
            
    log(f"\n🏆 Best Selected Model: {best_model_name} with F1-Score: {best_f1*100:.2f}%")
    
    # Save the best trained pipeline artifact
    log(f"Saving serialized model pipeline to: {MODEL_PATH}")
    joblib.dump(best_pipeline, MODEL_PATH)
    
    # Compile Model Metadata
    metadata = {
        "model_version": "1.0.0",
        "trained_at": datetime.now().isoformat(),
        "model_type": best_model_name,
        "framework": "scikit-learn",
        "dataset": {
            "name": "DataCo Supply Chain Historical Dataset",
            "total_records": len(df),
            "train_records": len(X_train),
            "test_records": len(X_test),
            "split_strategy": "Chronological Split (80% Train, 20% Test)",
            "target_variable": "late_delivery_risk",
            "target_classes": {"0": "On-Time Delivery", "1": "Late Delivery"}
        },
        "features": {
            "all_features": all_features,
            "categorical_features": categorical_features,
            "numerical_features": numerical_features,
            "excluded_leakage_features": [
                "days_for_shipping_real",
                "delivery_status",
                "shipping_date",
                "order_status"
            ]
        },
        "performance_metrics": best_metrics,
        "candidate_comparisons": model_evaluations,
        "risk_thresholds": {
            "low_risk": "probability < 0.33",
            "medium_risk": "0.33 <= probability < 0.67",
            "high_risk": "probability >= 0.67"
        }
    }
    
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)
        
    log(f"Saved model metadata to: {METADATA_PATH}")
    log("ML Pipeline Training Completed Successfully!")
    return metadata

if __name__ == "__main__":
    train_and_evaluate()
