import os
import json
from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel, Field

from db import conn
from auth import get_current_user, check_role, normalize_role
from ml.predict import predict_delivery_risk, get_model_metadata, get_model
from ml.explain import get_drift_baseline
from ml.retrain import (
    validate_retraining_data,
    train_candidate_model,
    promote_candidate,
    list_all_versions
)

router = APIRouter(prefix="/predictions", tags=["ML Predictions & Governance"])

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(CURRENT_DIR, "ml", "artifacts")
FEATURE_IMPORTANCE_PATH = os.path.join(ARTIFACTS_DIR, "feature_importance.json")
DRIFT_BASELINE_PATH = os.path.join(ARTIFACTS_DIR, "drift_baseline.json")
MODEL_JOB_PATH = os.path.join(ARTIFACTS_DIR, "delivery_delay_model.joblib")
METADATA_PATH = os.path.join(CURRENT_DIR, "ml", "model_metadata.json")

# ==========================================================
# Pydantic Schemas
# ==========================================================

class DeliveryRiskRequest(BaseModel):
    vendor_id: Optional[int] = Field(None, description="Database ID of the vendor")
    purchase_order_id: Optional[int] = Field(None, description="Optional linked Purchase Order ID")
    shipping_mode: Optional[str] = Field("Standard Class", description="Shipping mode (Standard Class, Second Class, First Class, Same Day)")
    days_for_shipment_scheduled: Optional[int] = Field(4, ge=0, le=30, description="Scheduled shipping days")
    category_name: Optional[str] = Field("Cleats", description="Item product category")
    order_region: Optional[str] = Field("South Asia", description="Destination region")
    order_country: Optional[str] = Field("India", description="Destination country")
    order_item_quantity: Optional[int] = Field(1, ge=1, description="Quantity of ordered item")
    order_item_product_price: Optional[float] = Field(50.0, ge=0.0, description="Product price per unit")
    order_item_total: Optional[float] = Field(50.0, ge=0.0, description="Total order amount")
    order_month: Optional[int] = Field(None, ge=1, le=12, description="Order month (1-12)")
    order_day_of_week: Optional[int] = Field(None, ge=0, le=6, description="Order day of week (0=Mon, 6=Sun)")
    order_hour: Optional[int] = Field(None, ge=0, le=23, description="Order hour (0-23)")
    vendor_reliability: Optional[float] = Field(None, ge=0.0, le=100.0, description="Vendor historical reliability score")
    vendor_on_time_rate: Optional[float] = Field(None, ge=0.0, le=100.0, description="Vendor historical on-time delivery rate")
    vendor_total_orders: Optional[int] = Field(None, ge=0, description="Vendor total historical orders")


class PredictionFeedbackRequest(BaseModel):
    actual_outcome: str = Field(..., description="Observed fulfillment delivery outcome: 'Delayed' or 'On Time'")
    notes: Optional[str] = Field(None, description="Operational notes regarding carrier or customs delivery exception")


class CandidateTrainRequest(BaseModel):
    candidate_tag: Optional[str] = Field(None, description="Optional version identifier tag for candidate model")


class CandidatePromoteRequest(BaseModel):
    candidate_id: str = Field(..., description="Unique ID of evaluated candidate model to promote")


# ==========================================================
# 1. POST /predictions/delivery-risk
# Inference + Explainability + Drift Monitoring + Audit Log
# ==========================================================
@router.post("/delivery-risk")
def predict_order_delivery_risk(
    payload: DeliveryRiskRequest,
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Vendor", "Finance Officer", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Unauthorized role for delivery risk prediction"
        )

    # Multi-tenant isolation for Vendor role
    vendor_id = payload.vendor_id
    user_vendor_id = current_user.get("vendor_id")

    if user_role == "Vendor":
        if not user_vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your vendor account is not associated with an authorized vendor profile."
            )
        if vendor_id is not None and vendor_id != user_vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: Vendors are strictly restricted to predicting delivery risk for their own organization."
            )
        vendor_id = user_vendor_id

    # Auto-populate vendor historical stats from database if vendor_id provided
    vendor_name = None
    vendor_reliability = payload.vendor_reliability
    vendor_on_time_rate = payload.vendor_on_time_rate
    vendor_total_orders = payload.vendor_total_orders

    if vendor_id:
        try:
            conn.rollback()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, vendor_name, reliability_score, delivery_rate, total_orders
                    FROM vendors
                    WHERE id = %s
                """, (vendor_id,))
                vrow = cur.fetchone()
                if vrow:
                    vendor_name = vrow[1]
                    if vendor_reliability is None:
                        vendor_reliability = float(vrow[2]) if vrow[2] is not None else 75.0
                    if vendor_on_time_rate is None:
                        vendor_on_time_rate = float(vrow[3]) if vrow[3] is not None else 75.0
                    if vendor_total_orders is None:
                        vendor_total_orders = int(vrow[4]) if vrow[4] is not None else 50
        except Exception as e:
            conn.rollback()
            print(f"Error fetching vendor {vendor_id} stats:", e)

    # Fallback defaults if unlinked
    if vendor_reliability is None:
        vendor_reliability = 75.0
    if vendor_on_time_rate is None:
        vendor_on_time_rate = 75.0
    if vendor_total_orders is None:
        vendor_total_orders = 50

    now = datetime.now()
    order_month = payload.order_month if payload.order_month is not None else now.month
    order_day_of_week = payload.order_day_of_week if payload.order_day_of_week is not None else now.weekday()
    order_hour = payload.order_hour if payload.order_hour is not None else now.hour

    input_data = {
        "shipping_mode": payload.shipping_mode,
        "category_name": payload.category_name,
        "order_region": payload.order_region,
        "order_country": payload.order_country,
        "days_for_shipment_scheduled": payload.days_for_shipment_scheduled,
        "order_item_quantity": payload.order_item_quantity,
        "order_item_product_price": payload.order_item_product_price,
        "order_item_total": payload.order_item_total,
        "order_month": order_month,
        "order_day_of_week": order_day_of_week,
        "order_hour": order_hour,
        "vendor_reliability": vendor_reliability,
        "vendor_on_time_rate": vendor_on_time_rate,
        "vendor_total_orders": vendor_total_orders
    }

    # Execute inference + explainability pipeline
    try:
        prediction_output = predict_delivery_risk(input_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Machine learning inference error: {str(e)}"
        )

    # Persist prediction into PostgreSQL prediction_audit_logs
    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO prediction_audit_logs (
                    user_id,
                    user_email,
                    vendor_id,
                    purchase_order_id,
                    prediction_result,
                    delay_probability,
                    risk_level,
                    model_version,
                    input_features,
                    created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING id
            """, (
                current_user.get("id"),
                current_user.get("email"),
                vendor_id,
                payload.purchase_order_id,
                prediction_output["prediction"],
                prediction_output["delay_probability"],
                prediction_output["risk_level"],
                prediction_output["model_version"],
                json.dumps(input_data)
            ))
            log_id = cur.fetchone()[0]
            conn.commit()
    except Exception as e:
        conn.rollback()
        print("Prediction audit log error:", e)
        log_id = None

    return {
        "status": "success",
        "audit_log_id": log_id,
        "vendor_id": vendor_id,
        "vendor_name": vendor_name,
        "purchase_order_id": payload.purchase_order_id,
        "prediction": prediction_output["prediction"],
        "is_delayed_predicted": prediction_output["is_delayed_predicted"],
        "delay_probability": prediction_output["delay_probability"],
        "on_time_probability": prediction_output["on_time_probability"],
        "risk_level": prediction_output["risk_level"],
        "confidence_percentage": prediction_output["confidence_percentage"],
        "key_factors": prediction_output["key_factors"],
        "top_factors": prediction_output["top_factors"],
        "explanation": prediction_output["explanation"],
        "business_interpretation": prediction_output["business_interpretation"],
        "drift_status": prediction_output["drift_status"],
        "recommendation": prediction_output["recommendation"],
        "model_version": prediction_output["model_version"],
        "model_type": prediction_output["model_type"],
        "evaluated_accuracy": prediction_output["evaluated_accuracy"],
        "evaluated_f1": prediction_output["evaluated_f1"],
        "evaluated_at": prediction_output["evaluated_at"],
        "input_features": input_data
    }


# ==========================================================
# 2. GET /predictions/model-feature-importance
# Real global permutation feature importances
# ==========================================================
@router.get("/model-feature-importance")
def get_model_feature_importance(current_user: dict = Depends(get_current_user)):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Vendor", "Finance Officer", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied"
        )

    if os.path.exists(FEATURE_IMPORTANCE_PATH):
        with open(FEATURE_IMPORTANCE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    # Fallback to model_metadata.json
    metadata = get_model_metadata()
    if metadata and "global_feature_importance" in metadata:
        return {
            "model_version": metadata.get("model_version", "1.0.0"),
            "methodology": "Permutation Importance",
            "features": metadata["global_feature_importance"]
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Feature importance artifact not found. Please run feature importance computation."
    )


# ==========================================================
# 3. GET /predictions/model-health
# Production Model Monitoring & Telemetry
# ==========================================================
@router.get("/model-health")
def get_model_health(current_user: dict = Depends(get_current_user)):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Model health telemetry is restricted to operations and audit roles."
        )

    meta = get_model_metadata() or {}
    
    # 1. Inspect Artifacts on Disk
    model_exists = os.path.exists(MODEL_JOB_PATH)
    meta_exists = os.path.exists(METADATA_PATH)
    baseline_exists = os.path.exists(DRIFT_BASELINE_PATH)
    feat_imp_exists = os.path.exists(FEATURE_IMPORTANCE_PATH)
    model_size = os.path.getsize(MODEL_JOB_PATH) if model_exists else 0

    # Test in-memory model load
    try:
        m = get_model()
        loadable = m is not None
    except Exception:
        loadable = False

    # 2. Database Prediction Statistics
    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(*) FILTER (WHERE risk_level = 'High'),
                    COUNT(*) FILTER (WHERE risk_level = 'Medium'),
                    COUNT(*) FILTER (WHERE risk_level = 'Low'),
                    AVG(delay_probability),
                    COUNT(*) FILTER (WHERE actual_outcome IS NOT NULL),
                    COUNT(*) FILTER (WHERE actual_outcome = 'Delayed'),
                    COUNT(*) FILTER (WHERE actual_outcome = 'On Time'),
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 HOURS')
                FROM prediction_audit_logs
            """)
            row = cur.fetchone()
            total_preds = row[0] or 0
            high_count = row[1] or 0
            med_count = row[2] or 0
            low_count = row[3] or 0
            avg_prob = float(row[4]) if row[4] is not None else 0.0
            feedback_count = row[5] or 0
            delayed_actual = row[6] or 0
            ontime_actual = row[7] or 0
            last_24h = row[8] or 0

            # Compute concordance on feedback
            cur.execute("""
                SELECT COUNT(*)
                FROM prediction_audit_logs
                WHERE actual_outcome IS NOT NULL
                  AND (
                    (prediction_result IN ('High Delay Risk', 'Moderate Delay Risk') AND actual_outcome = 'Delayed')
                    OR (prediction_result = 'On-Time Expected' AND actual_outcome = 'On Time')
                  )
            """)
            concordant_count = cur.fetchone()[0] or 0

    except Exception as e:
        conn.rollback()
        total_preds, high_count, med_count, low_count, avg_prob = 0, 0, 0, 0, 0.0
        feedback_count, delayed_actual, ontime_actual, last_24h, concordant_count = 0, 0, 0, 0, 0

    feedback_accuracy = round(concordant_count / feedback_count, 4) if feedback_count > 0 else None

    # 3. Overall Health Evaluation
    if model_exists and loadable and meta_exists and baseline_exists:
        overall_status = "Healthy (Production Active)"
    elif model_exists and loadable:
        overall_status = "Degraded (Governance Artifacts Missing)"
    else:
        overall_status = "Critical (Model Artifact Unavailable)"

    return {
        "status": overall_status,
        "model_version": meta.get("model_version", "1.0.0"),
        "model_type": meta.get("model_type", "HistGradientBoosting"),
        "framework": meta.get("framework", "scikit-learn"),
        "trained_at": meta.get("trained_at"),
        "promoted_at": meta.get("promoted_at"),
        "promoted_by": meta.get("promoted_by"),
        "training_dataset": meta.get("dataset", {
            "total_records": 180519,
            "train_records": 144415,
            "test_records": 36104
        }),
        "performance_metrics": meta.get("performance_metrics", {}),
        "artifacts_integrity": {
            "model_binary_exists": model_exists,
            "model_binary_path": MODEL_JOB_PATH,
            "model_binary_size_bytes": model_size,
            "model_loadable": loadable,
            "metadata_json_exists": meta_exists,
            "drift_baseline_exists": baseline_exists,
            "feature_importance_exists": feat_imp_exists
        },
        "inference_telemetry": {
            "total_predictions_logged": total_preds,
            "predictions_last_24h": last_24h,
            "average_delay_probability": round(avg_prob, 4),
            "risk_distribution": {
                "high_risk": high_count,
                "medium_risk": med_count,
                "low_risk": low_count
            }
        },
        "feedback_loop": {
            "feedbacks_recorded": feedback_count,
            "observed_delayed": delayed_actual,
            "observed_on_time": ontime_actual,
            "concordant_predictions": concordant_count,
            "observed_accuracy": feedback_accuracy
        },
        "drift_monitoring": {
            "baseline_training_records": 144415,
            "baseline_features_profiled": 14,
            "drift_detection_status": "Active (Empirical Z-Score & Out-of-Distribution Check)"
        },
        "checked_at": datetime.now().isoformat()
    }


# ==========================================================
# 4. GET /predictions/drift-baseline
# Inspect training baseline statistical distribution
# ==========================================================
@router.get("/drift-baseline")
def get_drift_baseline_data(current_user: dict = Depends(get_current_user)):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied"
        )

    try:
        return get_drift_baseline()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Drift baseline error: {str(e)}"
        )


# ==========================================================
# 5. POST /predictions/{audit_id}/feedback
# Record actual observed delivery outcome for closed orders
# ==========================================================
@router.post("/{audit_id}/feedback")
def submit_prediction_feedback(
    audit_id: int,
    payload: PredictionFeedbackRequest,
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Vendor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied: Role not authorized to record fulfillment outcome feedback."
        )

    clean_outcome = payload.actual_outcome.strip()
    if clean_outcome.lower() in ("delayed", "late"):
        outcome_val = "Delayed"
    elif clean_outcome.lower() in ("on time", "ontime", "on-time"):
        outcome_val = "On Time"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid actual_outcome. Must be 'Delayed' or 'On Time'."
        )

    try:
        conn.rollback()
        with conn.cursor() as cur:
            # Check existing record
            cur.execute("""
                SELECT id, vendor_id, prediction_result, delay_probability
                FROM prediction_audit_logs
                WHERE id = %s
            """, (audit_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Prediction audit record #{audit_id} does not exist."
                )

            pred_vendor_id = row[1]
            pred_result = row[2]

            # Multi-tenant isolation: Vendor can only record feedback for their own company
            if user_role == "Vendor":
                user_vendor_id = current_user.get("vendor_id")
                if not user_vendor_id or user_vendor_id != pred_vendor_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access Denied: Vendors may only submit outcome feedback for their own deliveries."
                    )

            # Update PostgreSQL audit log with feedback
            cur.execute("""
                UPDATE prediction_audit_logs
                SET actual_outcome = %s,
                    feedback_user_id = %s,
                    feedback_user_email = %s,
                    feedback_notes = %s,
                    feedback_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (
                outcome_val,
                current_user.get("id"),
                current_user.get("email"),
                payload.notes,
                audit_id
            ))
            conn.commit()

        # Check prediction concordance
        is_delayed_predicted = pred_result in ("High Delay Risk", "Moderate Delay Risk")
        is_delayed_actual = outcome_val == "Delayed"
        concordant = (is_delayed_predicted == is_delayed_actual)

        return {
            "status": "Feedback Recorded",
            "audit_id": audit_id,
            "actual_outcome": outcome_val,
            "predicted_result": pred_result,
            "prediction_concordance": concordant,
            "feedback_submitted_by": current_user.get("email"),
            "feedback_at": datetime.now().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error recording feedback: {str(e)}"
        )


# ==========================================================
# 6. GET /predictions/feedback-stats
# Aggregated ground truth feedback statistics
# ==========================================================
@router.get("/feedback-stats")
def get_prediction_feedback_stats(current_user: dict = Depends(get_current_user)):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied"
        )

    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COUNT(*) as total_feedback,
                    COUNT(*) FILTER (WHERE actual_outcome = 'Delayed') as actual_delayed,
                    COUNT(*) FILTER (WHERE actual_outcome = 'On Time') as actual_on_time,
                    COUNT(*) FILTER (
                        WHERE (prediction_result IN ('High Delay Risk', 'Moderate Delay Risk') AND actual_outcome = 'Delayed')
                           OR (prediction_result = 'On-Time Expected' AND actual_outcome = 'On Time')
                    ) as concordant,
                    COUNT(*) FILTER (
                        WHERE prediction_result IN ('High Delay Risk', 'Moderate Delay Risk') AND actual_outcome = 'On Time'
                    ) as false_positives,
                    COUNT(*) FILTER (
                        WHERE prediction_result = 'On-Time Expected' AND actual_outcome = 'Delayed'
                    ) as false_negatives
                FROM prediction_audit_logs
                WHERE actual_outcome IS NOT NULL
            """)
            r = cur.fetchone()
            total = r[0] or 0
            delayed = r[1] or 0
            on_time = r[2] or 0
            concordant = r[3] or 0
            fp = r[4] or 0
            fn = r[5] or 0

            acc = round(concordant / total, 4) if total > 0 else 0.0

        return {
            "total_feedbacks_recorded": total,
            "actual_delayed_count": delayed,
            "actual_on_time_count": on_time,
            "concordant_predictions": concordant,
            "false_positives": fp,
            "false_negatives": fn,
            "empirical_model_accuracy": acc,
            "evaluated_at": datetime.now().isoformat()
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error aggregating feedback stats: {str(e)}"
        )


# ==========================================================
# 7. POST /predictions/retrain/evaluate-candidate
# Administrator Controlled Retraining Evaluation
# ==========================================================
@router.post("/retrain/evaluate-candidate")
def evaluate_candidate_retraining(
    payload: CandidateTrainRequest = None,
    current_user: dict = Depends(check_role(["Administrator"]))
):
    try:
        tag = payload.candidate_tag if payload else None
        res = train_candidate_model(candidate_tag=tag)
        return {
            "status": "Candidate Evaluated Successfully",
            "candidate_id": res["candidate_id"],
            "candidate_version": res["candidate_version"],
            "candidate_metrics": res["candidate_metrics"],
            "production_metrics": res["production_metrics"],
            "comparison": res["comparison"],
            "note": "Candidate artifact is isolated in candidates/ directory. Production model was NOT modified.",
            "next_step": f"To promote this candidate to active production, call POST /predictions/retrain/promote-candidate with candidate_id '{res['candidate_id']}'."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Candidate retraining evaluation failed: {str(e)}"
        )


# ==========================================================
# 8. POST /predictions/retrain/promote-candidate
# Administrator Explicit Model Promotion & Archiving
# ==========================================================
@router.post("/retrain/promote-candidate")
def promote_candidate_to_production(
    payload: CandidatePromoteRequest,
    current_user: dict = Depends(check_role(["Administrator"]))
):
    try:
        admin_email = current_user.get("email", "admin@vendoriq.com")
        res = promote_candidate(payload.candidate_id, admin_email=admin_email)
        return {
            "status": "Success",
            "message": f"Candidate '{payload.candidate_id}' promoted to production active version {res['new_active_version']}.",
            "details": res
        }
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Promotion failed: {str(e)}"
        )


# ==========================================================
# 9. GET /predictions/retrain/versions
# List Active, Archived, and Candidate Models
# ==========================================================
@router.get("/retrain/versions")
def get_model_versions_ledger(current_user: dict = Depends(check_role(["Administrator", "Auditor"]))):
    try:
        return list_all_versions()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list model versions: {str(e)}"
        )


# ==========================================================
# 10. GET /predictions/model-info
# Model governance and performance metadata
# ==========================================================
@router.get("/model-info")
def get_model_info(current_user: dict = Depends(get_current_user)):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Vendor", "Finance Officer", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied"
        )

    metadata = get_model_metadata()
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model metadata not found."
        )
    return metadata


# ==========================================================
# 11. GET /predictions/vendor-risk/{vendor_id}
# Prospective delivery risk assessment with explainability
# ==========================================================
@router.get("/vendor-risk/{vendor_id}")
def get_vendor_predictive_risk(
    vendor_id: int,
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Vendor", "Finance Officer", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied"
        )

    # Multi-tenant isolation for Vendor role
    if user_role == "Vendor":
        user_vendor_id = current_user.get("vendor_id")
        if not user_vendor_id or user_vendor_id != vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: Vendors may only inspect risk predictions for their own organization."
            )

    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, vendor_name, email, phone, city, state, country,
                       reliability_score, delivery_rate, quality_score, total_orders
                FROM vendors
                WHERE id = %s
            """, (vendor_id,))
            vrow = cur.fetchone()
            if not vrow:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Vendor with ID {vendor_id} was not found."
                )

            vendor_data = {
                "id": vrow[0],
                "vendor_name": vrow[1],
                "email": vrow[2],
                "phone": vrow[3],
                "city": vrow[4],
                "state": vrow[5],
                "country": vrow[6] or "United States",
                "reliability_score": float(vrow[7]) if vrow[7] is not None else 75.0,
                "on_time_delivery_rate": float(vrow[8]) if vrow[8] is not None else 75.0,
                "quality_score": float(vrow[9]) if vrow[9] is not None else 80.0,
                "total_orders": int(vrow[10]) if vrow[10] is not None else 0
            }

            # Inspect typical order metrics
            cur.execute("""
                SELECT total_amount
                FROM purchase_orders
                WHERE vendor_id = %s
                ORDER BY created_at DESC
                LIMIT 5
            """, (vendor_id,))
            recent_pos = cur.fetchall()

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error loading vendor: {str(e)}"
        )

    typical_shipping_mode = "Standard Class"
    typical_days = 4
    typical_amount = float(recent_pos[0][0]) if recent_pos and recent_pos[0][0] is not None else 150.0

    now = datetime.now()
    sim_features = {
        "shipping_mode": typical_shipping_mode,
        "category_name": "Sporting Goods",
        "order_region": "Central America",
        "order_country": vendor_data["country"],
        "days_for_shipment_scheduled": typical_days,
        "order_item_quantity": 2,
        "order_item_product_price": round(typical_amount / 2.0, 2),
        "order_item_total": typical_amount,
        "order_month": now.month,
        "order_day_of_week": now.weekday(),
        "order_hour": now.hour,
        "vendor_reliability": vendor_data["reliability_score"],
        "vendor_on_time_rate": vendor_data["on_time_delivery_rate"],
        "vendor_total_orders": vendor_data["total_orders"]
    }

    prediction = predict_delivery_risk(sim_features)

    if vendor_data["reliability_score"] >= 80:
        perf_tier = "High Reliability"
    elif vendor_data["reliability_score"] >= 65:
        perf_tier = "Moderate Reliability"
    else:
        perf_tier = "Underperforming"

    return {
        "vendor_id": vendor_data["id"],
        "vendor_name": vendor_data["vendor_name"],
        "country": vendor_data["country"],
        "historical_metrics": {
            "reliability_score": vendor_data["reliability_score"],
            "on_time_delivery_rate": vendor_data["on_time_delivery_rate"],
            "quality_score": vendor_data["quality_score"],
            "total_orders": vendor_data["total_orders"],
            "performance_tier": perf_tier
        },
        "predictive_metrics": {
            "predicted_delay_probability": prediction["delay_probability"],
            "predicted_risk_level": prediction["risk_level"],
            "confidence_percentage": prediction["confidence_percentage"],
            "risk_summary": prediction["prediction"],
            "key_risk_drivers": prediction["key_factors"],
            "top_factors": prediction["top_factors"],
            "model_explanation": prediction["explanation"],
            "business_interpretation": prediction["business_interpretation"],
            "recommendation": prediction["recommendation"],
            "metric_distinction": (
                "Historical Reliability Score reflects past contractual completion; "
                "Predicted Future Delivery Risk estimates the probability of logistics delays "
                "on upcoming orders using machine learning."
            )
        },
        "model_metadata": {
            "model_version": prediction["model_version"],
            "model_type": prediction["model_type"],
            "evaluated_accuracy": prediction["evaluated_accuracy"],
            "evaluated_f1": prediction["evaluated_f1"]
        }
    }


# ==========================================================
# 12. GET /predictions/audit-logs
# View past prediction inference logs (Admin & Auditor)
# ==========================================================
@router.get("/audit-logs")
def get_prediction_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    vendor_id: Optional[int] = Query(None),
    risk_level: Optional[str] = Query(None),
    current_user: dict = Depends(check_role(["Administrator", "Auditor"]))
):
    offset = (page - 1) * limit
    try:
        conn.rollback()
        with conn.cursor() as cur:
            where_clauses = []
            params = []

            if vendor_id is not None:
                where_clauses.append("pal.vendor_id = %s")
                params.append(vendor_id)

            if risk_level:
                where_clauses.append("LOWER(pal.risk_level) = LOWER(%s)")
                params.append(risk_level)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            cur.execute(f"""
                SELECT COUNT(*)
                FROM prediction_audit_logs pal
                {where_sql}
            """, tuple(params))
            total_count = cur.fetchone()[0]

            cur.execute(f"""
                SELECT 
                    pal.id,
                    pal.user_id,
                    pal.user_email,
                    pal.vendor_id,
                    v.vendor_name,
                    pal.purchase_order_id,
                    pal.prediction_result,
                    pal.delay_probability,
                    pal.risk_level,
                    pal.model_version,
                    pal.input_features,
                    pal.actual_outcome,
                    pal.feedback_at,
                    pal.feedback_notes,
                    pal.created_at
                FROM prediction_audit_logs pal
                LEFT JOIN vendors v ON pal.vendor_id = v.id
                {where_sql}
                ORDER BY pal.created_at DESC
                LIMIT %s OFFSET %s
            """, tuple(params + [limit, offset]))
            rows = cur.fetchall()

        logs = []
        for r in rows:
            logs.append({
                "id": r[0],
                "user_id": r[1],
                "user_email": r[2],
                "vendor_id": r[3],
                "vendor_name": r[4],
                "purchase_order_id": r[5],
                "prediction_result": r[6],
                "delay_probability": float(r[7]),
                "risk_level": r[8],
                "model_version": r[9],
                "input_features": r[10] if isinstance(r[10], dict) else (json.loads(r[10]) if r[10] else {}),
                "actual_outcome": r[11],
                "feedback_at": r[12].isoformat() if r[12] else None,
                "feedback_notes": r[13],
                "created_at": r[14].isoformat() if r[14] else None
            })

        return {
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1,
            "logs": logs
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error fetching prediction audit logs: {str(e)}"
        )


# ==========================================================
# 13. GET /predictions/summary
# Predictive risk aggregated statistics
# ==========================================================
@router.get("/summary")
def get_predictions_summary(
    current_user: dict = Depends(get_current_user)
):
    user_role = normalize_role(current_user.get("role"))
    allowed_roles = {"Administrator", "Procurement Manager", "Supply Chain Manager", "Auditor"}
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Denied"
        )

    try:
        conn.rollback()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COUNT(*),
                    COUNT(*) FILTER (WHERE risk_level = 'High'),
                    COUNT(*) FILTER (WHERE risk_level = 'Medium'),
                    COUNT(*) FILTER (WHERE risk_level = 'Low'),
                    AVG(delay_probability)
                FROM prediction_audit_logs
            """)
            row = cur.fetchone()
            total_predictions = row[0] or 0
            high_risk = row[1] or 0
            medium_risk = row[2] or 0
            low_risk = row[3] or 0
            avg_prob = float(row[4]) if row[4] is not None else 0.0

            cur.execute("""
                SELECT pal.vendor_id, v.vendor_name, COUNT(*), AVG(pal.delay_probability) as avg_prob
                FROM prediction_audit_logs pal
                JOIN vendors v ON pal.vendor_id = v.id
                GROUP BY pal.vendor_id, v.vendor_name
                ORDER BY avg_prob DESC
                LIMIT 5
            """)
            top_risk_vendors = [
                {
                    "vendor_id": r[0],
                    "vendor_name": r[1],
                    "evaluation_count": r[2],
                    "avg_delay_probability": round(float(r[3]), 4)
                }
                for r in cur.fetchall()
            ]

        meta = get_model_metadata() or {}
        return {
            "total_predictions_logged": total_predictions,
            "risk_breakdown": {
                "high_risk": high_risk,
                "medium_risk": medium_risk,
                "low_risk": low_risk
            },
            "average_delay_probability": round(avg_prob, 4),
            "top_at_risk_vendors": top_risk_vendors,
            "active_model": {
                "version": meta.get("model_version", "1.0.0"),
                "type": meta.get("model_type", "HistGradientBoosting"),
                "accuracy": meta.get("performance_metrics", {}).get("accuracy", 0.716),
                "f1_score": meta.get("performance_metrics", {}).get("f1_score", 0.6955)
            }
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error computing predictions summary: {str(e)}"
        )
