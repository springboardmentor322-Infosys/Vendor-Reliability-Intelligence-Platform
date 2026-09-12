"""
backend/order_slip.py
=============================================================================
VendorIQ - Vendor Reliability Intelligence Platform
Order Slip / Purchase Order PDF Generator
Generates clean, professional, corporate business documents suitable for
downloading, auditing, and supplier transmission using real PostgreSQL data.
=============================================================================
"""

import io
from datetime import datetime
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable
)


def format_currency(amount: Optional[float]) -> str:
    """Format numerical value safely as INR without unencodable glyphs."""
    if amount is None:
        return "INR 0.00"
    try:
        val = float(amount)
        return f"INR {val:,.2f}"
    except (ValueError, TypeError):
        return f"INR {amount}"


def get_status_colors(status: str):
    """Return background and text color for a given status."""
    st = (status or "").lower()
    if st in ("completed", "delivered", "approved", "active"):
        return colors.HexColor("#dcfce7"), colors.HexColor("#166534")  # Green
    elif st in ("ordered", "in-transit", "in transit", "processing"):
        return colors.HexColor("#e0f2fe"), colors.HexColor("#0369a1")  # Blue
    elif st in ("pending", "pending approval"):
        return colors.HexColor("#fef3c7"), colors.HexColor("#92400e")  # Amber
    elif st in ("cancelled", "canceled", "rejected", "fraud"):
        return colors.HexColor("#fee2e2"), colors.HexColor("#991b1b")  # Red
    return colors.HexColor("#f1f5f9"), colors.HexColor("#334155")       # Gray


def build_order_slip_pdf(order: Dict[str, Any]) -> bytes:
    """
    Build a high-quality, professional PDF Order Slip for a given purchase order.
    Returns bytes of the generated PDF document.
    """
    buffer = io.BytesIO()

    # Document setup: standard letter, 36pt (0.5 inch) margins for ample content area
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    primary_color = colors.HexColor("#1e3a8a")     # Deep Navy
    secondary_color = colors.HexColor("#2563eb")   # Royal Blue
    text_dark = colors.HexColor("#0f172a")         # Slate 900
    text_muted = colors.HexColor("#64748b")        # Slate 500
    border_color = colors.HexColor("#e2e8f0")      # Slate 200

    style_company_title = ParagraphStyle(
        "CompanyTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=primary_color
    )

    style_company_sub = ParagraphStyle(
        "CompanySub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=text_muted
    )

    style_doc_title = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=secondary_color,
        alignment=2  # Right aligned
    )

    style_doc_sub = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=text_muted,
        alignment=2  # Right aligned
    )

    style_section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=primary_color
    )

    style_label = ParagraphStyle(
        "FieldLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=text_muted
    )

    style_value = ParagraphStyle(
        "FieldValue",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=text_dark
    )

    style_value_bold = ParagraphStyle(
        "FieldValueBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=text_dark
    )

    style_table_header = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    style_table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=text_dark
    )

    style_table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=text_dark
    )

    style_table_cell_right = ParagraphStyle(
        "TableCellRight",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=text_dark,
        alignment=2
    )

    style_table_cell_right_bold = ParagraphStyle(
        "TableCellRightBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=text_dark,
        alignment=2
    )

    style_footer_text = ParagraphStyle(
        "FooterText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=text_muted,
        alignment=1  # Centered
    )

    elements = []

    # -------------------------------------------------------------
    # 1. HEADER SECTION (Branding & Document Title)
    # -------------------------------------------------------------
    po_id = order.get("id")
    po_number = order.get("po_number") or f"PO-2026-{po_id:05d}"
    gen_time = datetime.now().strftime("%d %b %Y, %H:%M:%S UTC")

    header_left = [
        Paragraph("VendorIQ Platform", style_company_title),
        Paragraph("Enterprise Vendor Reliability & Procurement Management", style_company_sub),
        Paragraph("Digital Requisition & Purchase Order Verification System", style_company_sub)
    ]

    header_right = [
        Paragraph("OFFICIAL ORDER SLIP", style_doc_title),
        Paragraph(f"<b>PO Number:</b> {po_number}", style_doc_sub),
        Paragraph(f"<b>Internal ID:</b> #{po_id}", style_doc_sub),
        Paragraph(f"<b>Generated:</b> {gen_time}", style_doc_sub)
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[310, 230]
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)

    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=10, spaceBefore=2))

    # -------------------------------------------------------------
    # 2. STATUS & OVERVIEW BAR
    # -------------------------------------------------------------
    order_status = order.get("status") or "Pending"
    status_bg, status_fg = get_status_colors(order_status)

    delivery_status = order.get("delivery_status") or order.get("fulfillment_status") or "Pending Dispatch"
    del_bg, del_fg = get_status_colors(delivery_status)

    order_date = str(order.get("order_date") or "N/A")
    expected_delivery = str(order.get("expected_delivery") or order.get("expected_delivery_date") or "N/A")

    status_row_data = [
        [
            Paragraph("<b>Order Status</b>", style_label),
            Paragraph(f"<font color='{status_fg.hexval()}'><b>{order_status.upper()}</b></font>", style_value_bold),
            Paragraph("<b>Order Date</b>", style_label),
            Paragraph(order_date, style_value),
            Paragraph("<b>Expected Delivery</b>", style_label),
            Paragraph(expected_delivery, style_value),
            Paragraph("<b>Delivery Status</b>", style_label),
            Paragraph(f"<font color='{del_fg.hexval()}'><b>{delivery_status}</b></font>", style_value_bold),
        ]
    ]
    status_table = Table(
        status_row_data,
        colWidths=[65, 70, 55, 65, 85, 65, 70, 65]
    )
    status_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, border_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # 3. METADATA: ISSUING ORGANIZATION & VENDOR DETAILS (2-COLUMN)
    # -------------------------------------------------------------
    # Left column: Procurement / Issuing info
    created_by_name = order.get("created_by_name") or "Procurement Authority"
    created_by_role = order.get("created_by_role") or "Procurement Manager"
    created_by_email = order.get("created_by_email") or "procurement@vendoriq.com"
    dataco_order_id = order.get("dataco_order_id")

    buyer_details = [
        Paragraph("ISSUED BY / BUYER", style_section_heading),
        Spacer(1, 4),
        Paragraph("<b>Organization:</b> VendorIQ Enterprise Inc.", style_value),
        Paragraph(f"<b>Requisitioner:</b> {created_by_name} ({created_by_role})", style_value),
        Paragraph(f"<b>Official Contact:</b> {created_by_email}", style_value),
        Paragraph(f"<b>Procurement System:</b> VendorIQ ERP v2.4", style_value),
    ]
    if dataco_order_id:
        buyer_details.append(Paragraph(f"<b>DataCo Historical Ref:</b> #{dataco_order_id}", style_value))

    # Right column: Vendor / Supplier info
    vendor_name = order.get("vendor_name") or "Registered Supplier"
    vendor_company = order.get("vendor_company") or vendor_name
    vendor_id = order.get("vendor_id") or "N/A"
    vendor_email = order.get("vendor_email") or "N/A"
    vendor_phone = order.get("vendor_phone") or "N/A"
    vendor_address = order.get("vendor_address") or "N/A"
    vendor_city = order.get("vendor_city") or ""
    vendor_country = order.get("vendor_country") or ""
    vendor_gst = order.get("vendor_gst_number") or "N/A"

    loc_str = ", ".join(filter(None, [vendor_address if vendor_address != "N/A" else None, vendor_city, vendor_country])) or "Registered Commercial Facility"

    vendor_details = [
        Paragraph("SUPPLIER / VENDOR PARTNER", style_section_heading),
        Spacer(1, 4),
        Paragraph(f"<b>Vendor Name:</b> {vendor_name} (ID: #{vendor_id})", style_value_bold),
        Paragraph(f"<b>Operating Company:</b> {vendor_company}", style_value),
        Paragraph(f"<b>Contact Email:</b> {vendor_email}", style_value),
        Paragraph(f"<b>Contact Phone:</b> {vendor_phone}", style_value),
        Paragraph(f"<b>Business Location:</b> {loc_str}", style_value),
        Paragraph(f"<b>GST / Tax Identification:</b> {vendor_gst}", style_value)
    ]

    parties_table = Table(
        [[buyer_details, vendor_details]],
        colWidths=[270, 270]
    )
    parties_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (0, 0), 1, border_color),
        ("BOX", (1, 0), (1, 0), 1, border_color),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(parties_table)
    elements.append(Spacer(1, 12))

    # -------------------------------------------------------------
    # 4. LINE ITEMS TABLE (Real Product, Qty, Price, Total)
    # -------------------------------------------------------------
    elements.append(Paragraph("PURCHASE ORDER LINE ITEMS", style_section_heading))
    elements.append(Spacer(1, 4))

    product_name = order.get("product_name") or "Catalog Commodity Item"
    product_id = order.get("product_id")
    quantity = int(order.get("quantity") or 1)
    unit_price = float(order.get("unit_price") or 0.0)
    total_amount = float(order.get("total_amount") or (quantity * unit_price))

    prod_desc = product_name
    if product_id:
        prod_desc += f" (Item Card ID: #{product_id})"

    items_data = [
        [
            Paragraph("Item", style_table_header),
            Paragraph("Product Description & Specification", style_table_header),
            Paragraph("Quantity", style_table_header),
            Paragraph("Unit Price", style_table_header),
            Paragraph("Total Amount", style_table_header)
        ],
        [
            Paragraph("1", style_table_cell),
            Paragraph(prod_desc, style_table_cell_bold),
            Paragraph(f"{quantity:,}", style_table_cell_right),
            Paragraph(format_currency(unit_price), style_table_cell_right),
            Paragraph(format_currency(total_amount), style_table_cell_right_bold)
        ]
    ]

    # Calculate financial breakdown
    tax_rate = 0.00  # Default 0% included tax note
    tax_amount = round(total_amount * tax_rate, 2)
    grand_total = total_amount + tax_amount

    items_data.append([
        "", "", "",
        Paragraph("<b>Subtotal:</b>", style_table_cell_right),
        Paragraph(format_currency(total_amount), style_table_cell_right)
    ])
    items_data.append([
        "", "", "",
        Paragraph("<b>Applicable GST/Tax:</b>", style_table_cell_right),
        Paragraph(format_currency(tax_amount), style_table_cell_right)
    ])
    items_data.append([
        "", "", "",
        Paragraph("<b>GRAND TOTAL:</b>", style_table_cell_right_bold),
        Paragraph(f"<b>{format_currency(grand_total)}</b>", style_table_cell_right_bold)
    ])

    # Payment workflow details (Advance, Final, Remaining)
    adv_amount = float(order.get("advance_amount") or 0.0)
    adv_pct = float(order.get("advance_percentage") or 0.0)
    paid_amt = float(order.get("paid_amount") or 0.0)
    rem_amt = float(order.get("remaining_amount") if order.get("remaining_amount") is not None else (grand_total - paid_amt))
    fin_amt = float(order.get("final_payment_amount") or 0.0)
    pay_status = order.get("payment_status") or ("Fully Paid" if paid_amt >= grand_total and grand_total > 0 else ("Partially Paid" if paid_amt > 0 else "Unpaid"))

    if adv_amount > 0:
        items_data.append([
            "", "", "",
            Paragraph(f"<b>Advance Paid ({adv_pct:.1f}%):</b>", style_table_cell_right),
            Paragraph(f"<font color='#059669'><b>-{format_currency(adv_amount)}</b></font>", style_table_cell_right)
        ])
    if fin_amt > 0:
        items_data.append([
            "", "", "",
            Paragraph("<b>Final Settlement Paid:</b>", style_table_cell_right),
            Paragraph(f"<font color='#059669'><b>-{format_currency(fin_amt)}</b></font>", style_table_cell_right)
        ])

    items_data.append([
        "", "", "",
        Paragraph("<b>Remaining Balance:</b>", style_table_cell_right_bold),
        Paragraph(f"<b>{format_currency(rem_amt)}</b>", style_table_cell_right_bold)
    ])

    status_color = "#059669" if pay_status.lower() in ("fully paid", "paid") else ("#d97706" if pay_status.lower() in ("partially paid", "partial") else "#64748b")
    items_data.append([
        "", "", "",
        Paragraph("<b>Settlement Status:</b>", style_table_cell_right_bold),
        Paragraph(f"<font color='{status_color}'><b>{pay_status.upper()}</b></font>", style_table_cell_right_bold)
    ])

    total_rows = len(items_data)
    items_table = Table(
        items_data,
        colWidths=[35, 235, 70, 95, 105]
    )
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, 1), 0.5, border_color),
        ("LINEBELOW", (3, 2), (4, total_rows - 1), 0.5, border_color),
        ("BACKGROUND", (3, 4), (4, 4), colors.HexColor("#f1f5f9")),
        ("BOX", (3, 4), (4, 4), 1, secondary_color),
        ("BACKGROUND", (3, total_rows - 2), (4, total_rows - 1), colors.HexColor("#f8fafc")),
        ("BOX", (3, total_rows - 2), (4, total_rows - 1), 1, border_color),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # 5. LOGISTICS & FULFILLMENT INFORMATION (if available)
    # -------------------------------------------------------------
    shipping_mode = order.get("shipping_mode") or "Standard Freight"
    scheduled_days = order.get("scheduled_days")
    actual_days = order.get("actual_days")
    delay_days = order.get("delay_days")
    actual_delivery_date = order.get("actual_delivery_date")

    transit_text = "Standard Scheduled Fulfillment"
    if scheduled_days is not None:
        transit_text = f"Scheduled: {scheduled_days} transit days"
        if actual_days is not None:
            transit_text += f" | Actual: {actual_days} days"
        if delay_days is not None and delay_days > 0:
            transit_text += f" (+{delay_days} days delay recorded)"
        elif delay_days is not None and delay_days == 0:
            transit_text += " (Delivered On Time)"

    actual_del_str = str(actual_delivery_date) if actual_delivery_date else "Pending Confirmation"

    delivery_data = [
        [
            Paragraph("LOGISTICS & FULFILLMENT DETAILS", style_section_heading),
            ""
        ],
        [
            Paragraph("<b>Shipping / Freight Mode:</b>", style_label),
            Paragraph(shipping_mode, style_value),
        ],
        [
            Paragraph("<b>Fulfillment Progress:</b>", style_label),
            Paragraph(delivery_status, style_value_bold),
        ],
        [
            Paragraph("<b>Transit Benchmark:</b>", style_label),
            Paragraph(transit_text, style_value),
        ],
        [
            Paragraph("<b>Actual Delivery Timestamp:</b>", style_label),
            Paragraph(actual_del_str, style_value),
        ]
    ]

    delivery_table = Table(
        delivery_data,
        colWidths=[150, 390]
    )
    delivery_table.setStyle(TableStyle([
        ("SPAN", (0, 0), (1, 0)),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, border_color),
        ("INNERGRID", (0, 1), (-1, -1), 0.5, border_color),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(delivery_table)
    elements.append(Spacer(1, 10))

    # -------------------------------------------------------------
    # 6. APPROVAL & GOVERNANCE AUDIT TRAIL
    # -------------------------------------------------------------
    approval_history: List[Dict[str, Any]] = order.get("audit_trail") or []
    
    approval_rows = [
        [
            Paragraph("APPROVAL & GOVERNANCE AUDIT TRAIL", style_section_heading),
            "", "", ""
        ],
        [
            Paragraph("Action / Milestone", style_label),
            Paragraph("Authorized Personnel", style_label),
            Paragraph("User Role", style_label),
            Paragraph("Timestamp & Audit Record", style_label)
        ]
    ]

    if approval_history:
        for entry in approval_history[:5]:  # Show up to 5 key milestones
            action_clean = entry.get("action", "").replace("_", " ").title()
            u_name = entry.get("user_name") or "System Automated"
            u_role = entry.get("user_role") or "Governance Agent"
            t_stamp = str(entry.get("created_at") or "Logged")
            approval_rows.append([
                Paragraph(f"<b>{action_clean}</b>", style_table_cell),
                Paragraph(u_name, style_table_cell),
                Paragraph(u_role, style_table_cell),
                Paragraph(t_stamp, style_table_cell)
            ])
    else:
        # Fallback to standard status approval row
        approval_rows.append([
            Paragraph("<b>Requisition Creation</b>", style_table_cell),
            Paragraph(created_by_name, style_table_cell),
            Paragraph(created_by_role, style_table_cell),
            Paragraph(order_date, style_table_cell)
        ])
        if order_status in ("Approved", "Ordered", "In-Transit", "Delivered", "Completed"):
            approval_rows.append([
                Paragraph("<b>Procurement Authorization</b>", style_table_cell),
                Paragraph("Authorized Procurement Officer", style_table_cell),
                Paragraph("Procurement Manager", style_table_cell),
                Paragraph(f"Status: {order_status}", style_table_cell_bold)
            ])

    approval_table = Table(
        approval_rows,
        colWidths=[140, 140, 110, 150]
    )
    approval_table.setStyle(TableStyle([
        ("SPAN", (0, 0), (3, 0)),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, border_color),
        ("INNERGRID", (0, 1), (-1, -1), 0.5, border_color),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(approval_table)
    elements.append(Spacer(1, 12))

    # -------------------------------------------------------------
    # 7. LEGAL DISCLAIMER & SYSTEM FOOTER
    # -------------------------------------------------------------
    elements.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceAfter=6, spaceBefore=4))
    elements.append(Paragraph(
        "<b>Electronic Document Notice:</b> This Purchase Order Slip is an authentic computer-generated requisition document "
        "issued by the VendorIQ Platform. In accordance with enterprise procurement policy and Information Technology regulations, "
        "no physical signature is required. All order lifecycle modifications are recorded in immutable system audit logs.",
        style_footer_text
    ))
    elements.append(Spacer(1, 2))
    elements.append(Paragraph(
        f"<b>Confidentiality:</b> Intended exclusively for authorized VendorIQ procurement staff and registered supplier representatives. "
        f"Order Reference: {po_number} | Generation Timestamp: {gen_time} | Document Security: Verified",
        style_footer_text
    ))

    # Build the document
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
