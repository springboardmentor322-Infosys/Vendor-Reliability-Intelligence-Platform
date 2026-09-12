"""
VendorIQ — Predictive Machine Learning Inference Engine
Serves real predictions for purchase order delivery delay risk, vendor forecasting,
and model explainability.
"""

import os
import json
from datetime import datetime
import pandas as pd
import numpy as np
import joblib

from ml.explain import explain_prediction

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(CURRENT_DIR, "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "delivery_delay_model.joblib")
METADATA_PATH = os.path.join(CURRENT_DIR, "model_metadata.json")

# Global singleton model cache
_CACHED_MODEL = None
_CACHED_METADATA = None

def get_model():
    """Load and cache the trained scikit-learn pipeline artifact."""
    global _CACHED_MODEL
    if _CACHED_MODEL is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model artifact not found at {MODEL_PATH}. Please run train_model.py first."
            )
        _CACHED_MODEL = joblib.load(MODEL_PATH)
    return _CACHED_MODEL

def get_model_metadata():
    """Load cached metadata and evaluation metrics."""
    global _CACHED_METADATA
    if _CACHED_METADATA is None:
        if not os.path.exists(METADATA_PATH):
            raise FileNotFoundError(
                f"Model metadata not found at {METADATA_PATH}. Please run train_model.py first."
            )
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _CACHED_METADATA = json.load(f)
    return _CACHED_METADATA

def clear_cached_model():
    """Invalidates the in-memory cached model and metadata (used upon candidate promotion)."""
    global _CACHED_MODEL, _CACHED_METADATA
    _CACHED_MODEL = None
    _CACHED_METADATA = None

def predict_delivery_risk(features: dict) -> dict:
    """
    Generate real machine learning prediction for delivery delay risk.
    Features must only contain pre-fulfillment information.
    Includes real local feature contributions, explanations, and drift check.
    """
    model = get_model()
    metadata = get_model_metadata()
    now = datetime.now()
    
    # Standardize input dictionary with safe defaults
    feature_row = {
        'shipping_mode': str(features.get('shipping_mode', 'Standard Class')),
        'days_for_shipment_scheduled': float(features.get('days_for_shipment_scheduled', 4.0)),
        'category_name': str(features.get('category_name', 'Standard Catalog')),
        'order_region': str(features.get('order_region', 'Domestic')),
        'order_country': str(features.get('order_country', 'United States')),
        'order_item_quantity': float(features.get('order_item_quantity', 1.0)),
        'order_item_product_price': float(features.get('order_item_product_price', 50.0)),
        'order_item_total': float(features.get('order_item_total', 50.0)),
        'order_month': float(features.get('order_month', now.month)),
        'order_day_of_week': float(features.get('order_day_of_week', now.weekday())),
        'order_hour': float(features.get('order_hour', now.hour)),
        'vendor_reliability': float(features.get('vendor_reliability', 70.0)),
        'vendor_on_time_rate': float(features.get('vendor_on_time_rate', 50.0)),
        'vendor_total_orders': float(features.get('vendor_total_orders', 100.0))
    }
    
    # Construct 1-row DataFrame
    input_df = pd.DataFrame([feature_row])
    
    # Model inference: call predict_proba for calibrated probability
    probabilities = model.predict_proba(input_df)[0]
    delay_prob = float(probabilities[1])
    on_time_prob = float(probabilities[0])
    
    # Transparent risk level classification based on probability
    # 0.00 - 0.33: Low Risk
    # 0.34 - 0.66: Medium Risk
    # 0.67 - 1.00: High Risk
    if delay_prob >= 0.67:
        risk_level = "High"
        prediction_label = "High Delay Risk"
        recommendation = "Expedite shipment mode or reallocate order to a higher-reliability supplier partner."
    elif delay_prob >= 0.34:
        risk_level = "Medium"
        prediction_label = "Moderate Delay Risk"
        recommendation = "Monitor logistics milestones closely and request advance carrier tracking."
    else:
        risk_level = "Low"
        prediction_label = "On-Time Expected"
        recommendation = "Order routing meets scheduled delivery expectations under standard handling."
        
    confidence_score = round(abs(delay_prob - 0.5) * 200, 1) # 0 to 100% certainty relative to decision boundary
    
    # Generate real mathematical explainability and drift analysis
    explainability_res = explain_prediction(model, feature_row, delay_prob)
    top_factors = explainability_res["top_factors"]
    model_explanation = explainability_res["model_explanation"]
    business_interpretation = explainability_res["business_interpretation"]
    drift_status = explainability_res["drift_status"]

    # Preserve backward-compatible string list for key_factors
    key_factors = [
        f["human_summary"] for f in top_factors if abs(f["contribution_score"]) > 0.005
    ]
    if not key_factors:
        key_factors = ["Standard logistics routing parameters align with baseline expectations."]

    return {
        "prediction": prediction_label,
        "is_delayed_predicted": bool(delay_prob >= 0.5),
        "delay_probability": round(delay_prob, 4),
        "on_time_probability": round(on_time_prob, 4),
        "risk_level": risk_level,
        "confidence_percentage": confidence_score,
        "key_factors": key_factors,
        "top_factors": top_factors,
        "explanation": model_explanation,
        "business_interpretation": business_interpretation,
        "drift_status": drift_status,
        "model_version": metadata.get("model_version", "1.0.0"),
        "model_type": metadata.get("model_type", "HistGradientBoostingClassifier"),
        "evaluated_accuracy": metadata.get("performance_metrics", {}).get("accuracy", 0.0),
        "evaluated_f1": metadata.get("performance_metrics", {}).get("f1_score", 0.0),
        "recommendation": recommendation,
        "evaluated_at": datetime.now().isoformat()
    }
