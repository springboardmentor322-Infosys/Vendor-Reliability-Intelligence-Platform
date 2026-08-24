import csv, io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.security import get_current_user

router=APIRouter(prefix='/reports',tags=['Reports & Export'])

def _rows(db, kind):
    if kind=='vendor-performance':
        return [['Vendor','On Time','Delayed','Quality','Response Hrs','Issue Resolution Hrs','Service Rating','Completion','Reliability','Overall']]+[[r.vendor_name,r.on_time_deliveries,r.delayed_deliveries,r.quality_score,r.response_time_hours,r.issue_resolution_time_hours,r.service_rating,r.order_completion_rate,r.reliability_score,r.overall_score] for r in db.query(models.VendorPerformance).all()]
    if kind in ('procurement','purchase-orders'):
        return [['PO ID','Vendor','Product','Quantity','Amount','Status']]+[[r.id,r.vendor_name,r.product_name,r.quantity,r.total_amount,r.status] for r in db.query(models.PurchaseOrder).all()]
    if kind=='compliance':
        return [['Contract ID','Vendor','Title','Expiry','Compliance','Status']]+[[r.id,r.vendor_name,r.contract_title,r.expiry_date,r.compliance_flag,r.status] for r in db.query(models.Contract).all()]
    if kind=='contracts': return _rows(db,'compliance')
    return [['Message'],['No data']]

def _csv(name, rows):
    out=io.StringIO(); csv.writer(out).writerows(rows); out.seek(0)
    return StreamingResponse(iter([out.getvalue()]),media_type='text/csv',headers={'Content-Disposition':f'attachment; filename={name}.csv'})

def _xlsx(name, rows):
    from openpyxl import Workbook
    wb=Workbook(); ws=wb.active
    for r in rows: ws.append(r)
    s=io.BytesIO(); wb.save(s); s.seek(0)
    return StreamingResponse(s,media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',headers={'Content-Disposition':f'attachment; filename={name}.xlsx'})

def _pdf(name, rows):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
    s=io.BytesIO(); doc=SimpleDocTemplate(s,pagesize=landscape(A4),rightMargin=20,leftMargin=20,topMargin=20,bottomMargin=20)
    table=Table(rows,repeatRows=1); table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#312e81')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),0.4,colors.grey),('FONTSIZE',(0,0),(-1,-1),7),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    doc.build([table]); s.seek(0)
    return StreamingResponse(s,media_type='application/pdf',headers={'Content-Disposition':f'attachment; filename={name}.pdf'})

@router.get('/{kind}.{ext}')
def export_report(kind:str, ext:str, db:Session=Depends(get_db), current_user=Depends(get_current_user)):
    if kind not in {'vendor-performance','procurement','purchase-orders','compliance','contracts'}: return {'error':'Unknown report'}
    rows=_rows(db,kind)
    if ext=='csv': return _csv(kind,rows)
    if ext=='xlsx': return _xlsx(kind,rows)
    if ext=='pdf': return _pdf(kind,rows)
    return {'error':'Unsupported export'}

@router.get('/vendor-performance')
def vendor_performance_report(db:Session=Depends(get_db),current_user=Depends(get_current_user)): return [dict((k,v) for k,v in r.__dict__.items() if not k.startswith('_')) for r in db.query(models.VendorPerformance).all()]
@router.get('/procurement')
def procurement_report(db:Session=Depends(get_db),current_user=Depends(get_current_user)): return [{'id':r.id,'vendor_name':r.vendor_name,'product_name':r.product_name,'quantity':r.quantity,'total_amount':r.total_amount,'status':r.status} for r in db.query(models.PurchaseOrder).all()]
@router.get('/compliance')
def compliance_report(db:Session=Depends(get_db),current_user=Depends(get_current_user)): return [{'id':r.id,'vendor_name':r.vendor_name,'contract_title':r.contract_title,'expiry_date':r.expiry_date,'compliance_flag':r.compliance_flag,'status':r.status} for r in db.query(models.Contract).all()]
@router.get('/contracts')
def contract_report(db:Session=Depends(get_db),current_user=Depends(get_current_user)): return compliance_report(db,current_user)
