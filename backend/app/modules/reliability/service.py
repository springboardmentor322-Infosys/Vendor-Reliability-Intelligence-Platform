from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.modules.vendors.models import Vendor
from app.modules.procurement.models import PurchaseOrder, Delivery, QualityInspection
from app.modules.contracts.models import Contract

async def calculate_vendor_reliability(db: AsyncSession, vendor_id: int):
    # 1. Delivery Performance (50%)
    # Find all POs for this vendor
    pos_res = await db.execute(select(PurchaseOrder.id).filter(PurchaseOrder.vendor_id == vendor_id))
    po_ids = [row[0] for row in pos_res.all()]
    
    delivery_score = 100.0
    if po_ids:
        total_deliveries = await db.scalar(select(func.count(Delivery.id)).filter(Delivery.po_id.in_(po_ids)))
        if total_deliveries and total_deliveries > 0:
            # Late if late_risk_flag == 1 or days_real > days_scheduled
            on_time_deliveries = await db.scalar(
                select(func.count(Delivery.id))
                .filter(Delivery.po_id.in_(po_ids))
                .filter(Delivery.late_risk_flag == 0)
            )
            delivery_score = (on_time_deliveries / total_deliveries) * 100.0

    # 2. Quality Performance (30%)
    quality_score = 100.0
    if po_ids:
        total_inspections = await db.scalar(select(func.count(QualityInspection.id)).filter(QualityInspection.po_id.in_(po_ids)))
        if total_inspections and total_inspections > 0:
            passed_inspections = await db.scalar(
                select(func.count(QualityInspection.id))
                .filter(QualityInspection.po_id.in_(po_ids))
                .filter(QualityInspection.status.ilike('Passed'))
            )
            quality_score = (passed_inspections / total_inspections) * 100.0

    # 3. Contract Compliance (20%)
    contract_score = 100.0
    total_contracts = await db.scalar(select(func.count(Contract.id)).filter(Contract.vendor_id == vendor_id))
    if total_contracts and total_contracts > 0:
        contracts_res = await db.execute(select(Contract.compliance_flags).filter(Contract.vendor_id == vendor_id))
        compliant_count = 0
        for row in contracts_res.all():
            flags = row[0]
            if not flags or len(flags) == 0:
                compliant_count += 1
        contract_score = (compliant_count / total_contracts) * 100.0

    final_score = (delivery_score * 0.50) + (quality_score * 0.30) + (contract_score * 0.20)
    
    return {
        "score": round(final_score, 2),
        "delivery_score": round(delivery_score, 2),
        "quality_score": round(quality_score, 2),
        "contract_score": round(contract_score, 2)
    }
