from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

from openpyxl import Workbook

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph
)

from app.database import get_db
from app import models


router = APIRouter(
    prefix="/export",
    tags=["Export"]
)


@router.get("/vendors")
def export_vendors(
    db: Session = Depends(get_db)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Vendor Report"

    ws.append([
        "Vendor Name",
        "Category",
        "Reliability Score",
        "Risk Level",
        "Status"
    ])

    vendors = db.query(
        models.Vendor
    ).all()

    for vendor in vendors:
        ws.append([
            vendor.vendor_name,
            vendor.category,
            vendor.reliability_score,
            vendor.risk_level,
            vendor.status
        ])

    file_name = "vendor_report.xlsx"

    wb.save(file_name)

    return FileResponse(
        file_name,
        filename=file_name,
        media_type=(
            "application/"
            "vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        )
    )


@router.get("/vendor-performance")
def export_vendor_performance(
    db: Session = Depends(get_db)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Vendor Performance"

    ws.append([
        "Vendor ID",
        "Vendor Name",
        "Category",
        "Reliability Score",
        "Risk Level",
        "On-Time Deliveries",
        "Delayed Deliveries",
        "Average Quality Rating",
        "Average Response Time",
        "Average Issue Resolution Time",
        "Average Order Completion Rate",
        "Status"
    ])

    vendors = db.query(
        models.Vendor
    ).all()

    for vendor in vendors:

        performances = db.query(
            models.VendorPerformance
        ).filter(
            models.VendorPerformance.vendor_id == vendor.id
        ).all()

        total_on_time = sum(
            performance.on_time_deliveries
            for performance in performances
        )

        total_delayed = sum(
            performance.delayed_deliveries
            for performance in performances
        )

        if performances:
            average_quality = sum(
                performance.quality_rating
                for performance in performances
            ) / len(performances)

            average_response_time = sum(
                performance.response_time
                for performance in performances
            ) / len(performances)

            average_issue_resolution = sum(
                performance.issue_resolution_time
                for performance in performances
            ) / len(performances)

            average_completion_rate = sum(
                performance.order_completion_rate
                for performance in performances
            ) / len(performances)

        else:
            average_quality = 0
            average_response_time = 0
            average_issue_resolution = 0
            average_completion_rate = 0

        ws.append([
            vendor.id,
            vendor.vendor_name,
            vendor.category,
            vendor.reliability_score,
            vendor.risk_level,
            total_on_time,
            total_delayed,
            round(average_quality, 2),
            round(average_response_time, 2),
            round(average_issue_resolution, 2),
            round(average_completion_rate, 2),
            vendor.status
        ])

    file_name = "vendor_performance_report.xlsx"

    wb.save(file_name)

    return FileResponse(
        file_name,
        filename=file_name,
        media_type=(
            "application/"
            "vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        )
    )


@router.get("/vendor-performance/pdf")
def export_vendor_performance_pdf(
    db: Session = Depends(get_db)
):
    file_name = "vendor_performance_report.pdf"

    document = SimpleDocTemplate(
        file_name,
        pagesize=landscape(A4),
        rightMargin=20,
        leftMargin=20,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()

    title = Paragraph(
        "Vendor Performance Report",
        styles["Title"]
    )

    data = [[
        "Vendor",
        "Category",
        "Reliability",
        "Risk",
        "On-Time",
        "Delayed",
        "Quality",
        "Response",
        "Issue Resolution",
        "Completion",
        "Status"
    ]]

    vendors = db.query(
        models.Vendor
    ).all()

    for vendor in vendors:

        performances = db.query(
            models.VendorPerformance
        ).filter(
            models.VendorPerformance.vendor_id == vendor.id
        ).all()

        total_on_time = sum(
            performance.on_time_deliveries
            for performance in performances
        )

        total_delayed = sum(
            performance.delayed_deliveries
            for performance in performances
        )

        if performances:
            average_quality = sum(
                performance.quality_rating
                for performance in performances
            ) / len(performances)

            average_response_time = sum(
                performance.response_time
                for performance in performances
            ) / len(performances)

            average_issue_resolution = sum(
                performance.issue_resolution_time
                for performance in performances
            ) / len(performances)

            average_completion_rate = sum(
                performance.order_completion_rate
                for performance in performances
            ) / len(performances)

        else:
            average_quality = 0
            average_response_time = 0
            average_issue_resolution = 0
            average_completion_rate = 0

        data.append([
            vendor.vendor_name,
            vendor.category,
            vendor.reliability_score,
            vendor.risk_level,
            total_on_time,
            total_delayed,
            round(average_quality, 2),
            round(average_response_time, 2),
            round(average_issue_resolution, 2),
            round(average_completion_rate, 2),
            vendor.status
        ])

    table = Table(
        data,
        repeatRows=1
    )

    table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.grey
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
                "ALIGN",
                (0, 0),
                (-1, -1),
                "CENTER"
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.black
            ),
            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE"
            )
        ])
    )

    document.build([
        title,
        table
    ])

    return FileResponse(
        file_name,
        filename=file_name,
        media_type="application/pdf"
    )
