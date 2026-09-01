from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.models.contract import Contract
from app.models.vendor import Vendor
from app.models.notification import Notification
from app.schemas.contract import ContractCreate

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)


router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"]
)


# ==========================================
# VALID RENEWAL STATUSES
# ==========================================

VALID_RENEWAL_STATUSES = [
    "Pending",
    "Renewed",
    "Not Renewing"
]


# ==========================================
# GET ALL CONTRACTS
# ==========================================

@router.get("/")
def get_contracts(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    contracts = (
        db.query(Contract)
        .all()
    )

    return contracts


# ==========================================
# CREATE CONTRACT
# ==========================================

@router.post("/")
def create_contract(
    data: ContractCreate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER
        )
    )
):

    # ======================================
    # CHECK VENDOR
    # ======================================

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.id == data.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # ======================================
    # CHECK CONTRACT NUMBER
    # ======================================

    existing_contract = (
        db.query(Contract)
        .filter(
            Contract.contract_number == data.contract_number
        )
        .first()
    )

    if existing_contract:
        raise HTTPException(
            status_code=400,
            detail="Contract number already exists"
        )


    # ======================================
    # VALIDATE DATES
    # ======================================

    if data.expiry_date < data.start_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date cannot be before start date"
        )


    # ======================================
    # VALIDATE RENEWAL STATUS
    # ======================================

    if data.renewal_status not in VALID_RENEWAL_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid renewal status"
        )


    # ======================================
    # VALIDATE RENEWAL DATE
    # ======================================

    if (
        data.renewal_date is not None
        and
        data.renewal_date < data.expiry_date
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Renewal date cannot be before "
                "the contract expiry date"
            )
        )


    # ======================================
    # CREATE CONTRACT
    # ======================================

    contract = Contract(
        vendor_id=data.vendor_id,
        contract_name=data.contract_name,
        contract_number=data.contract_number,
        contract_value=data.contract_value,
        start_date=data.start_date,
        expiry_date=data.expiry_date,
        status=data.status,
        renewal_status=data.renewal_status,
        renewal_date=data.renewal_date,
        compliance_status=data.compliance_status,
        description=data.description
    )

    db.add(contract)
    db.commit()
    db.refresh(contract)


    # ======================================
    # CONTRACT EXPIRY NOTIFICATION
    # ======================================

    today = date.today()

    days_remaining = (
        contract.expiry_date - today
    ).days

    if (
        contract.status == "Active"
        and
        0 <= days_remaining <= 30
    ):

        notification = Notification(
            title="Contract Expiry Alert",

            message=(
                f"Contract "
                f"{contract.contract_number} "
                f"for "
                f"{vendor.vendor_name} "
                f"expires in "
                f"{days_remaining} days."
            ),

            notification_type="Contract Expiry",

            vendor_id=contract.vendor_id,

            is_read=False
        )

        db.add(notification)
        db.commit()


    return contract


# ==========================================
# CONTRACT EXPIRY ALERTS
# ==========================================

@router.get("/alerts/expiry")
def get_expiry_alerts(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    today = date.today()

    contracts = (
        db.query(Contract)
        .filter(
            Contract.expiry_date >= today,
            Contract.status == "Active"
        )
        .all()
    )

    alerts = []

    for contract in contracts:

        days_remaining = (
            contract.expiry_date - today
        ).days

        # ==================================
        # EXPIRING WITHIN 30 DAYS
        # ==================================

        if days_remaining <= 30:

            vendor = (
                db.query(Vendor)
                .filter(
                    Vendor.id == contract.vendor_id
                )
                .first()
            )

            alerts.append({

                "contract_id": contract.id,

                "contract_name": contract.contract_name,

                "contract_number": contract.contract_number,

                "vendor_id": contract.vendor_id,

                "vendor_name": (
                    vendor.vendor_name
                    if vendor
                    else f"Vendor #{contract.vendor_id}"
                ),

                "expiry_date": contract.expiry_date,

                "days_remaining": days_remaining,

                "renewal_status": contract.renewal_status,

                "renewal_date": contract.renewal_date,

                "alert_type": "Contract Expiring Soon"

            })


    # ======================================
    # SOONEST EXPIRY FIRST
    # ======================================

    alerts.sort(
        key=lambda item: item["days_remaining"]
    )

    return alerts


# ==========================================
# CONTRACT SUMMARY
# ==========================================

@router.get("/summary")
def get_contract_summary(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    today = date.today()

    contracts = (
        db.query(Contract)
        .all()
    )


    # ======================================
    # INITIAL COUNTS
    # ======================================

    total_contracts = 0

    active_contracts = 0

    expired_contracts = 0

    expiring_soon = 0

    compliant_contracts = 0

    non_compliant_contracts = 0

    pending_compliance = 0

    pending_renewals = 0

    renewed_contracts = 0

    not_renewing_contracts = 0


    # ======================================
    # CALCULATE SUMMARY
    # ======================================

    for contract in contracts:

        total_contracts += 1


        # ==================================
        # EXPIRED
        # ==================================

        if contract.expiry_date < today:

            expired_contracts += 1


        # ==================================
        # ACTIVE
        # ==================================

        elif contract.status == "Active":

            active_contracts += 1


        # ==================================
        # EXPIRING SOON
        # ==================================

        if (
            contract.expiry_date >= today
            and
            (
                contract.expiry_date - today
            ).days <= 30
            and
            contract.status == "Active"
        ):

            expiring_soon += 1


        # ==================================
        # COMPLIANCE
        # ==================================

        if (
            contract.compliance_status ==
            "Compliant"
        ):

            compliant_contracts += 1

        elif (
            contract.compliance_status ==
            "Non-Compliant"
        ):

            non_compliant_contracts += 1

        elif (
            contract.compliance_status ==
            "Pending"
        ):

            pending_compliance += 1


        # ==================================
        # RENEWAL
        # ==================================

        if (
            contract.renewal_status ==
            "Pending"
        ):

            pending_renewals += 1

        elif (
            contract.renewal_status ==
            "Renewed"
        ):

            renewed_contracts += 1

        elif (
            contract.renewal_status ==
            "Not Renewing"
        ):

            not_renewing_contracts += 1


    # ======================================
    # RESPONSE
    # ======================================

    return {

        "total_contracts":
            total_contracts,

        "active_contracts":
            active_contracts,

        "expired_contracts":
            expired_contracts,

        "expiring_soon":
            expiring_soon,

        "compliant_contracts":
            compliant_contracts,

        "non_compliant_contracts":
            non_compliant_contracts,

        "pending_compliance":
            pending_compliance,

        "pending_renewals":
            pending_renewals,

        "renewed_contracts":
            renewed_contracts,

        "not_renewing_contracts":
            not_renewing_contracts

    }


# ==========================================
# GET SINGLE CONTRACT
# ==========================================

@router.get("/{contract_id}")
def get_contract(
    contract_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER,
            VENDOR,
            FINANCE_OFFICER,
            AUDITOR
        )
    )
):

    contract = (
        db.query(Contract)
        .filter(
            Contract.id == contract_id
        )
        .first()
    )

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )

    return contract


# ==========================================
# UPDATE CONTRACT
# ==========================================

@router.put("/{contract_id}")
def update_contract(
    contract_id: int,

    data: ContractCreate,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR,
            PROCUREMENT_MANAGER,
            SUPPLY_CHAIN_MANAGER
        )
    )
):

    # ======================================
    # FIND CONTRACT
    # ======================================

    contract = (
        db.query(Contract)
        .filter(
            Contract.id == contract_id
        )
        .first()
    )

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )


    # ======================================
    # CHECK VENDOR
    # ======================================

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.id == data.vendor_id
        )
        .first()
    )

    if not vendor:
        raise HTTPException(
            status_code=404,
            detail="Vendor not found"
        )


    # ======================================
    # CHECK DUPLICATE CONTRACT NUMBER
    # ======================================

    existing_contract = (
        db.query(Contract)
        .filter(
            Contract.contract_number == data.contract_number,
            Contract.id != contract_id
        )
        .first()
    )

    if existing_contract:
        raise HTTPException(
            status_code=400,
            detail="Contract number already exists"
        )


    # ======================================
    # VALIDATE DATES
    # ======================================

    if data.expiry_date < data.start_date:
        raise HTTPException(
            status_code=400,
            detail="Expiry date cannot be before start date"
        )


    # ======================================
    # VALIDATE RENEWAL STATUS
    # ======================================

    if data.renewal_status not in VALID_RENEWAL_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid renewal status"
        )


    # ======================================
    # VALIDATE RENEWAL DATE
    # ======================================

    if (
        data.renewal_date is not None
        and
        data.renewal_date < data.expiry_date
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Renewal date cannot be before "
                "the contract expiry date"
            )
        )


    # ======================================
    # UPDATE CONTRACT
    # ======================================

    contract.vendor_id = data.vendor_id

    contract.contract_name = data.contract_name

    contract.contract_number = data.contract_number

    contract.contract_value = data.contract_value

    contract.start_date = data.start_date

    contract.expiry_date = data.expiry_date

    contract.status = data.status

    contract.renewal_status = data.renewal_status

    contract.renewal_date = data.renewal_date

    contract.compliance_status = data.compliance_status

    contract.description = data.description


    db.commit()

    db.refresh(contract)

    return contract


# ==========================================
# DELETE CONTRACT
# ==========================================

@router.delete("/{contract_id}")
def delete_contract(
    contract_id: int,

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(
            ADMINISTRATOR
        )
    )
):

    # ======================================
    # FIND CONTRACT
    # ======================================

    contract = (
        db.query(Contract)
        .filter(
            Contract.id == contract_id
        )
        .first()
    )

    if not contract:
        raise HTTPException(
            status_code=404,
            detail="Contract not found"
        )


    # ======================================
    # DELETE
    # ======================================

    db.delete(contract)

    db.commit()


    return {
        "message":
            "Contract deleted successfully"
    }