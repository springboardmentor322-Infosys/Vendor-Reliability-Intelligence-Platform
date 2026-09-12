"""
VendorIQ — Production Machine Learning Explainability & Drift Engine
Computes real local marginal feature contributions, technical model explanations,
business operational interpretations, and input data drift detection.
"""

import os
import json
from datetime import datetime
import pandas as pd
import numpy as np

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(CURRENT_DIR, "artifacts")
BASELINE_PATH = os.path.join(ARTIFACTS_DIR, "drift_baseline.json")

_CACHED_BASELINE = None

def get_drift_baseline() -> dict:
    global _CACHED_BASELINE
    if _CACHED_BASELINE is None:
        if not os.path.exists(BASELINE_PATH):
            raise FileNotFoundError(f"Drift baseline artifact not found at {BASELINE_PATH}")
        with open(BASELINE_PATH, "r", encoding="utf-8") as f:
            _CACHED_BASELINE = json.load(f)
    return _CACHED_BASELINE

def check_feature_drift(input_features: dict) -> dict:
    """
    Evaluates incoming input features against training baseline statistics
    to detect statistical outliers and out-of-distribution categories.
    """
    baseline = get_drift_baseline()
    num_dists = baseline.get("numerical_distributions", {})
    cat_dists = baseline.get("categorical_distributions", {})
    
    flagged = []
    
    # 1. Numerical Z-score and range check
    for col, stats in num_dists.items():
        if col in input_features and input_features[col] is not None:
            val = float(input_features[col])
            mean = stats["mean"]
            std = stats["std"] if stats["std"] > 0 else 1.0
            z_score = abs((val - mean) / std)
            if z_score > 3.5:
                flagged.append({
                    "feature": col,
                    "type": "Numerical Outlier",
                    "value": val,
                    "expected_mean": mean,
                    "z_score": round(z_score, 2),
                    "reason": f"Value {val} deviates by {z_score:.1f} standard deviations from training mean ({mean})"
                })
            elif val > stats["max"] * 1.5 or (stats["min"] >= 0 and val < 0):
                flagged.append({
                    "feature": col,
                    "type": "Range Violation",
                    "value": val,
                    "training_range": [stats["min"], stats["max"]],
                    "reason": f"Value {val} outside training operational boundaries [{stats['min']}, {stats['max']}]"
                })

    # 2. Categorical distribution check
    for col, freq_map in cat_dists.items():
        if col in input_features and input_features[col] is not None:
            cat_val = str(input_features[col])
            if cat_val not in freq_map:
                flagged.append({
                    "feature": col,
                    "type": "Unseen Category",
                    "value": cat_val,
                    "reason": f"Category '{cat_val}' was never observed in training records"
                })

    return {
        "drift_detected": len(flagged) > 0,
        "flagged_count": len(flagged),
        "flagged_features": flagged,
        "evaluated_at": datetime.now().isoformat()
    }

def explain_prediction(model, input_row_dict: dict, current_delay_prob: float) -> dict:
    """
    Generates deterministic, mathematically sound local feature explanations
    using Empirical Counterfactual Marginal Contributions against the training baseline.
    """
    baseline = get_drift_baseline()
    ref_medians = baseline.get("reference_medians", {})
    
    # Evaluate marginal delta for each of the 14 features
    contributions = []
    
    for feat_name, orig_val in input_row_dict.items():
        base_val = ref_medians.get(feat_name, orig_val)
        
        # If feature matches baseline value, contribution is effectively neutral
        if str(orig_val).strip().lower() == str(base_val).strip().lower():
            contributions.append({
                "feature": feat_name,
                "value": orig_val,
                "baseline_value": base_val,
                "contribution_score": 0.0,
                "impact": "Low",
                "direction": "Neutral / Baseline",
                "human_summary": f"Feature '{feat_name}' is aligned with historical median ({orig_val})."
            })
            continue

        # Perturb single feature to baseline counterfactual
        cf_row = input_row_dict.copy()
        cf_row[feat_name] = base_val
        cf_df = pd.DataFrame([cf_row])
        
        try:
            cf_prob = float(model.predict_proba(cf_df)[0][1])
            delta = current_delay_prob - cf_prob
        except Exception:
            delta = 0.0

        abs_delta = abs(delta)
        if abs_delta >= 0.05:
            impact_level = "High"
        elif abs_delta >= 0.015:
            impact_level = "Medium"
        else:
            impact_level = "Low"

        if delta > 0.005:
            direction = "Increases Delay Risk"
            summary_txt = f"{feat_name} ('{orig_val}') shifts delay risk by +{delta*100:.1f}% relative to reference baseline."
        elif delta < -0.005:
            direction = "Decreases Delay Risk"
            summary_txt = f"{feat_name} ('{orig_val}') mitigates delay risk by {delta*100:.1f}% relative to reference baseline."
        else:
            direction = "Neutral / Baseline"
            summary_txt = f"{feat_name} ('{orig_val}') exhibits negligible sensitivity relative to baseline."

        contributions.append({
            "feature": feat_name,
            "value": orig_val,
            "baseline_value": base_val,
            "contribution_score": round(delta, 4),
            "impact": impact_level,
            "direction": direction,
            "human_summary": summary_txt
        })

    # Sort by absolute contribution magnitude descending
    contributions.sort(key=lambda x: abs(x["contribution_score"]), reverse=True)
    top_factors = contributions[:5]

    # Synthesize Technical Model Explanation
    top_positives = [c for c in top_factors if c["contribution_score"] > 0]
    top_negatives = [c for c in top_factors if c["contribution_score"] < 0]

    if current_delay_prob >= 0.67:
        risk_str = "High Delay Risk"
    elif current_delay_prob >= 0.34:
        risk_str = "Moderate Delay Risk"
    else:
        risk_str = "Low Delay Risk"

    model_exp_lines = [
        f"Model classified this shipment as {risk_str} with calibrated delay probability {current_delay_prob*100:.1f}%."
    ]
    if top_positives:
        lead = top_positives[0]
        model_exp_lines.append(
            f"The primary risk driver is {lead['feature']} ('{lead['value']}'), exerting a marginal probability shift of +{lead['contribution_score']*100:.1f}%."
        )
    if top_negatives:
        lead_neg = top_negatives[0]
        model_exp_lines.append(
            f"Conversely, {lead_neg['feature']} ('{lead_neg['value']}') acts as a stabilizing factor ({lead_neg['contribution_score']*100:.1f}%)."
        )
    technical_explanation = " ".join(model_exp_lines)

    # Synthesize Business Operational Interpretation
    shipping_mode = input_row_dict.get("shipping_mode", "Standard Class")
    sched_days = input_row_dict.get("days_for_shipment_scheduled", 4)
    v_rel = input_row_dict.get("vendor_reliability", 70)
    region = input_row_dict.get("order_region", "Regional")

    if current_delay_prob >= 0.67:
        business_interpretation = (
            f"Logistics feasibility is strained. Demanding a {sched_days}-day scheduled fulfillment window under "
            f"'{shipping_mode}' routing across {region} exceeds historical carrier reliability margins. "
            f"Recommendation: Engage premium expedited air freight or request supplier advance buffer of 24-48 hours."
        )
    elif current_delay_prob >= 0.34:
        business_interpretation = (
            f"Logistics profile is manageable with moderate transit volatility. Supplier reliability ({v_rel:.1f}%) "
            f"and '{shipping_mode}' scheduling present acceptable risk. "
            f"Recommendation: Require automated milestone tracking and carrier handover alerts."
        )
    else:
        business_interpretation = (
            f"Optimal routing conditions detected. The scheduled {sched_days}-day window and carrier class '{shipping_mode}' "
            f"exhibit strong historical compliance with low logistics friction. Standard dispatch handling is approved."
        )

    # Check drift on this input
    drift_status = check_feature_drift(input_row_dict)

    return {
        "top_factors": top_factors,
        "all_contributions": contributions,
        "model_explanation": technical_explanation,
        "business_interpretation": business_interpretation,
        "drift_status": drift_status
    }
