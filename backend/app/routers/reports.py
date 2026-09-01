from io import BytesIO
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.vendor import Vendor
from app.models.order import Order
from app.models.procurement_request import ProcurementRequest
from app.models.invoice import Invoice
from app.models.contract import Contract
from app.models.vendor_performance import VendorPerformance

from app.utils.permissions import (
    require_roles,
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)

from app.utils.reliability import (
    calculate_reliability_score,
    get_risk_level
)


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


# =========================================================
# ALLOWED ROLES
# =========================================================

REPORT_ROLES = (
    ADMINISTRATOR,
    PROCUREMENT_MANAGER,
    SUPPLY_CHAIN_MANAGER,
    VENDOR,
    FINANCE_OFFICER,
    AUDITOR
)


# =========================================================
# HELPER - VENDOR NAME
# =========================================================

def get_vendor_name(
    db: Session,
    vendor_id: int
) -> str:

    vendor = db.query(
        Vendor
    ).filter(
        Vendor.id == vendor_id
    ).first()

    if vendor:
        return vendor.vendor_name

    return f"Vendor #{vendor_id}"


# =========================================================
# 1. REPORT SUMMARY
# =========================================================

@router.get("/summary")
def get_report_summary(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    total_vendors = db.query(
        Vendor
    ).count()

    total_orders = db.query(
        Order
    ).count()

    total_procurement_requests = db.query(
        ProcurementRequest
    ).count()

    total_invoices = db.query(
        Invoice
    ).count()

    total_contracts = db.query(
        Contract
    ).count()

    total_performance_records = db.query(
        VendorPerformance
    ).count()


    # -----------------------------------------------------
    # ORDER TOTAL
    # -----------------------------------------------------

    orders = db.query(
        Order
    ).all()

    total_order_value = sum(
        order.amount or 0
        for order in orders
    )


    # -----------------------------------------------------
    # PROCUREMENT TOTAL
    # -----------------------------------------------------

    procurement_requests = db.query(
        ProcurementRequest
    ).all()

    total_procurement_value = sum(
        request.estimated_amount or 0
        for request in procurement_requests
    )


    # -----------------------------------------------------
    # INVOICE TOTAL
    # -----------------------------------------------------

    invoices = db.query(
        Invoice
    ).all()

    total_invoice_value = sum(
        invoice.amount or 0
        for invoice in invoices
    )


    # -----------------------------------------------------
    # CONTRACT TOTAL
    # -----------------------------------------------------

    contracts = db.query(
        Contract
    ).all()

    total_contract_value = sum(
        contract.contract_value or 0
        for contract in contracts
    )


    return {

        "vendors": {
            "total": total_vendors
        },

        "orders": {
            "total": total_orders,
            "total_value": total_order_value
        },

        "procurement": {
            "total_requests":
                total_procurement_requests,

            "total_value":
                total_procurement_value
        },

        "invoices": {
            "total":
                total_invoices,

            "total_value":
                total_invoice_value
        },

        "contracts": {
            "total":
                total_contracts,

            "total_value":
                total_contract_value
        },

        "vendor_performance": {
            "total_records":
                total_performance_records
        }

    }


# =========================================================
# 2. VENDOR PERFORMANCE REPORT
# =========================================================

@router.get("/vendor-performance")
def get_vendor_performance_report(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    performances = db.query(
        VendorPerformance
    ).order_by(
        VendorPerformance.performance_date.desc()
    ).all()


    result = []


    for performance in performances:

        vendor = db.query(
            Vendor
        ).filter(
            Vendor.id ==
            performance.vendor_id
        ).first()


        score = calculate_reliability_score(
            performance
        )


        total_deliveries = (
            performance.on_time_deliveries
            +
            performance.delayed_deliveries
        )


        delivery_percentage = (

            (
                performance.on_time_deliveries
                / total_deliveries
            ) * 100

            if total_deliveries > 0
            else 0

        )


        result.append({

            "id":
                performance.id,

            "vendor_id":
                performance.vendor_id,

            "vendor_name":
                vendor.vendor_name
                if vendor
                else
                f"Vendor #{performance.vendor_id}",

            "on_time_deliveries":
                performance.on_time_deliveries,

            "delayed_deliveries":
                performance.delayed_deliveries,

            "delivery_percentage":
                round(
                    delivery_percentage,
                    2
                ),

            "quality_rating":
                performance.quality_rating,

            "response_time":
                performance.response_time,

            "issue_resolution_time":
                performance.issue_resolution_time,

            "order_completion_rate":
                performance.order_completion_rate,

            "service_rating":
                performance.service_rating,

            "reliability_score":
                score,

            "risk_level":
                get_risk_level(score),

            "performance_date":
                performance.performance_date

        })


    return result


# =========================================================
# 3. PROCUREMENT REPORT
# =========================================================

@router.get("/procurement")
def get_procurement_report(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    requests = db.query(
        ProcurementRequest
    ).order_by(
        ProcurementRequest.id.desc()
    ).all()


    result = []


    for request in requests:

        result.append({

            "id":
                request.id,

            "vendor_id":
                request.vendor_id,

            "vendor_name":
                get_vendor_name(
                    db,
                    request.vendor_id
                ),

            "product_name":
                request.product_name,

            "quantity":
                request.quantity,

            "estimated_amount":
                request.estimated_amount,

            "status":
                request.status

        })


    return result


# =========================================================
# 4. PURCHASE ORDER STATUS SUMMARY
# =========================================================

@router.get("/orders/status-summary")
def get_order_status_summary_report(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):
    """Return status counts directly from the database.

    This avoids loading all 65k+ DataCo orders just to calculate
    dashboard/report status cards.
    """
    statuses = [
        "Pending",
        "Approved",
        "Ordered",
        "Delivered",
        "Completed",
        "Cancelled"
    ]

    counts = {status: 0 for status in statuses}

    rows = (
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )

    for status, count in rows:
        if status in counts:
            counts[status] = int(count)

    return counts


# =========================================================
# 5. PURCHASE ORDER REPORT
# =========================================================

@router.get("/orders")
def get_order_report(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    orders = db.query(
        Order
    ).order_by(
        Order.id.desc()
    ).offset(offset).limit(limit).all()


    result = []


    for order in orders:

        result.append({

            "id":
                order.id,

            "vendor_id":
                order.vendor_id,

            "vendor_name":
                get_vendor_name(
                    db,
                    order.vendor_id
                ),

            "product_name":
                order.product_name,

            "quantity":
                order.quantity,

            "amount":
                order.amount,

            "status":
                order.status,

            "expected_delivery_date":
                order.expected_delivery_date

        })


    return result


# =========================================================
# 5. CONTRACT REPORT
# =========================================================

@router.get("/contracts")
def get_contract_report(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    contracts = db.query(
        Contract
    ).order_by(
        Contract.expiry_date.asc()
    ).all()


    result = []


    for contract in contracts:

        vendor = db.query(
            Vendor
        ).filter(
            Vendor.id ==
            contract.vendor_id
        ).first()


        result.append({

            "id":
                contract.id,

            "vendor_id":
                contract.vendor_id,

            "vendor_name":
                vendor.vendor_name
                if vendor
                else
                f"Vendor #{contract.vendor_id}",

            "contract_name":
                contract.contract_name,

            "contract_number":
                contract.contract_number,

            "contract_value":
                contract.contract_value,

            "start_date":
                contract.start_date,

            "expiry_date":
                contract.expiry_date,

            "status":
                contract.status,

            "compliance_status":
                contract.compliance_status,

            "description":
                contract.description

        })


    return result


# =========================================================
# 6. COMPLIANCE REPORT
# =========================================================

@router.get("/compliance")
def get_compliance_report(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    contracts = db.query(
        Contract
    ).all()


    result = []


    for contract in contracts:

        vendor = db.query(
            Vendor
        ).filter(
            Vendor.id ==
            contract.vendor_id
        ).first()


        result.append({

            "contract_id":
                contract.id,

            "contract_name":
                contract.contract_name,

            "contract_number":
                contract.contract_number,

            "vendor_id":
                contract.vendor_id,

            "vendor_name":
                vendor.vendor_name
                if vendor
                else
                f"Vendor #{contract.vendor_id}",

            "compliance_status":
                contract.compliance_status,

            "contract_status":
                contract.status,

            "start_date":
                contract.start_date,

            "expiry_date":
                contract.expiry_date

        })


    return result


# =========================================================
# 7. INVOICE REPORT
# =========================================================

@router.get("/invoices")
def get_invoice_report(
    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    invoices = db.query(
        Invoice
    ).order_by(
        Invoice.invoice_date.desc()
    ).all()


    result = []


    for invoice in invoices:

        result.append({

            "id":
                invoice.id,

            "invoice_number":
                invoice.invoice_number,

            "order_id":
                invoice.order_id,

            "vendor_id":
                invoice.vendor_id,

            "vendor_name":
                get_vendor_name(
                    db,
                    invoice.vendor_id
                ),

            "amount":
                invoice.amount,

            "status":
                invoice.status,

            "invoice_date":
                invoice.invoice_date,

            "due_date":
                invoice.due_date

        })


    return result


# =========================================================
# 8. EXPORT REPORT AS EXCEL
# =========================================================

@router.get("/export/excel")
def export_excel(
    report_type: str = "summary",

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    try:

        from openpyxl import Workbook

    except ImportError:

        raise HTTPException(
            status_code=500,
            detail=(
                "openpyxl is not installed. "
                "Run: pip install openpyxl"
            )
        )


    workbook = Workbook()

    sheet = workbook.active

    sheet.title = "VendorIQ Report"


    # -----------------------------------------------------
    # SELECT REPORT
    # -----------------------------------------------------

    if report_type == "vendor-performance":

        data = get_vendor_performance_report(
            db,
            current_user
        )

        title = "Vendor Performance Report"


    elif report_type == "procurement":

        data = get_procurement_report(
            db,
            current_user
        )

        title = "Procurement Report"


    elif report_type == "orders":

        data = get_order_report(
            db=db,
            current_user=current_user,
            limit=500
        )

        title = "Purchase Order Report"


    elif report_type == "contracts":

        data = get_contract_report(
            db,
            current_user
        )

        title = "Contract Report"


    elif report_type == "compliance":

        data = get_compliance_report(
            db,
            current_user
        )

        title = "Compliance Report"


    elif report_type == "invoices":

        data = get_invoice_report(
            db,
            current_user
        )

        title = "Invoice Report"


    elif report_type == "summary":

        summary = get_report_summary(
            db,
            current_user
        )

        title = "VendorIQ Report Summary"

        sheet.append([
            "Category",
            "Metric",
            "Value"
        ])


        for category, values in summary.items():

            for metric, value in values.items():

                sheet.append([
                    category,
                    metric,
                    value
                ])


        data = None


    else:

        raise HTTPException(
            status_code=400,
            detail="Invalid report type."
        )


    # -----------------------------------------------------
    # WRITE NORMAL REPORT
    # -----------------------------------------------------

    if data is not None:

        if not data:

            sheet.append([
                "No records found."
            ])

        else:

            headers = list(
                data[0].keys()
            )

            sheet.append(headers)


            for row in data:

                sheet.append([

                    (
                        value.isoformat()
                        if isinstance(
                            value,
                            date
                        )
                        else value
                    )

                    for value in row.values()

                ])


    # -----------------------------------------------------
    # FORMAT
    # -----------------------------------------------------

    for column in sheet.columns:

        max_length = 0

        column_letter = (
            column[0].column_letter
        )


        for cell in column:

            if cell.value is not None:

                max_length = max(
                    max_length,
                    len(str(cell.value))
                )


        sheet.column_dimensions[
            column_letter
        ].width = min(
            max_length + 2,
            40
        )


    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    output = BytesIO()

    workbook.save(output)

    output.seek(0)


    filename = (
        f"{report_type}-report.xlsx"
    )


    return StreamingResponse(

        output,

        media_type=(
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),

        headers={

            "Content-Disposition":
                f'attachment; filename="{filename}"'

        }

    )


# =========================================================
# 9. EXPORT REPORT AS PDF
# =========================================================

@router.get("/export/pdf")
def export_pdf(
    report_type: str = "summary",

    db: Session = Depends(get_db),

    current_user=Depends(
        require_roles(*REPORT_ROLES)
    )
):

    try:

        from reportlab.lib import colors

        from reportlab.lib.pagesizes import A4, landscape

        from reportlab.lib.styles import getSampleStyleSheet

        from reportlab.platypus import (
            SimpleDocTemplate,
            Table,
            TableStyle,
            Paragraph,
            Spacer
        )

    except ImportError:

        raise HTTPException(
            status_code=500,
            detail=(
                "reportlab is not installed. "
                "Run: pip install reportlab"
            )
        )


    # -----------------------------------------------------
    # GET DATA
    # -----------------------------------------------------

    if report_type == "vendor-performance":

        data = get_vendor_performance_report(
            db,
            current_user
        )

        title = "Vendor Performance Report"


    elif report_type == "procurement":

        data = get_procurement_report(
            db,
            current_user
        )

        title = "Procurement Report"


    elif report_type == "orders":

        data = get_order_report(
            db=db,
            current_user=current_user,
            limit=500
        )

        title = "Purchase Order Report"


    elif report_type == "contracts":

        data = get_contract_report(
            db,
            current_user
        )

        title = "Contract Report"


    elif report_type == "compliance":

        data = get_compliance_report(
            db,
            current_user
        )

        title = "Compliance Report"


    elif report_type == "invoices":

        data = get_invoice_report(
            db,
            current_user
        )

        title = "Invoice Report"


    elif report_type == "summary":

        summary = get_report_summary(
            db,
            current_user
        )

        title = "VendorIQ Report Summary"


        data = []


        for category, values in summary.items():

            for metric, value in values.items():

                data.append({

                    "category":
                        category,

                    "metric":
                        metric,

                    "value":
                        value

                })


    else:

        raise HTTPException(
            status_code=400,
            detail="Invalid report type."
        )


    # -----------------------------------------------------
    # CREATE PDF
    # -----------------------------------------------------

    output = BytesIO()


    document = SimpleDocTemplate(

        output,

        pagesize=landscape(A4),

        rightMargin=25,

        leftMargin=25,

        topMargin=25,

        bottomMargin=25

    )


    styles = getSampleStyleSheet()

    elements = []


    elements.append(
        Paragraph(
            "VendorIQ",
            styles["Title"]
        )
    )


    elements.append(
        Paragraph(
            title,
            styles["Heading2"]
        )
    )


    elements.append(
        Spacer(
            1,
            15
        )
    )


    if not data:

        elements.append(
            Paragraph(
                "No records found.",
                styles["Normal"]
            )
        )

    else:

        headers = list(
            data[0].keys()
        )


        table_data = [
            headers
        ]


        for row in data:

            values = []


            for value in row.values():

                if isinstance(
                    value,
                    date
                ):

                    value = value.isoformat()


                if value is None:

                    value = ""


                values.append(
                    str(value)
                )


            table_data.append(
                values
            )


        table = Table(
            table_data,
            repeatRows=1
        )


        table.setStyle(

            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor(
                        "#1e293b"
                    )
                ),

                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white
                ),

                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold"
                ),

                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    7
                ),

                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE"
                ),

                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor(
                            "#f8fafc"
                        )
                    ]
                )

            ])

        )


        elements.append(table)


    document.build(elements)

    output.seek(0)


    filename = (
        f"{report_type}-report.pdf"
    )


    return StreamingResponse(

        output,

        media_type="application/pdf",

        headers={

            "Content-Disposition":
                f'attachment; filename="{filename}"'

        }

    )