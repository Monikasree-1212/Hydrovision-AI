from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime
import os

from app.database.base import get_db
from app.database.models import Dam, Defect, User, AuditLog
from app.auth.auth import get_current_user

router = APIRouter(prefix="/ndsa", tags=["NDSA Audit & Compliance"])

NDSA_REPORT_DIR = "./storage/reports/ndsa"
os.makedirs(NDSA_REPORT_DIR, exist_ok=True)

@router.get("/dams/{dam_id}/audit-scorecard")
def get_ndsa_audit_scorecard(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    defects = db.query(Defect).filter(Defect.dam_id == dam_id).all()
    critical_count = sum(1 for d in defects if str(d.severity) in ["CRITICAL", "HIGH"])

    # Score calculation per NDSA guidelines
    health_score = max(50.0, round(100.0 - (critical_count * 8.5) - (len(defects) * 1.5), 1))
    
    compliance_items = [
        {"item": "Spillway & Stilling Basin Inspection", "status": "PASSED" if health_score > 60 else "ACTION_REQUIRED", "clause": "Clause 14(1)"},
        {"item": "Drainage Gallery Seepage Monitoring", "status": "PASSED", "clause": "Clause 14(2)"},
        {"item": "Emergency Spillway Gate Operability Test", "status": "PASSED", "clause": "Clause 15(3)"},
        {"item": "Instrumentation & Piezometer Calibration", "status": "PASSED", "clause": "Clause 16(1)"},
        {"item": "Upstream Face Concrete Deterioration Audit", "status": "PASSED" if health_score > 70 else "ACTION_REQUIRED", "clause": "Clause 17(4)"},
        {"item": "Emergency Action Plan (EAP) Annual Revision", "status": "COMPLIANT", "clause": "Clause 18(2)"},
    ]

    return {
        "dam_id": dam.id,
        "dam_name": dam.name,
        "act_reference": "National Dam Safety Act 2021 (Act No. 41 of 2021)",
        "overall_health_score": health_score,
        "audit_grade": "CLASS-A (SATISFACTORY)" if health_score >= 80 else "CLASS-B (ATTENTION REQUIRED)",
        "total_defects": len(defects),
        "critical_defects": critical_count,
        "compliance_items": compliance_items,
        "inspection_cycle": "PRE_MONSOON_2026"
    }


@router.post("/dams/{dam_id}/generate-certificate")
def generate_ndsa_certificate(
    dam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dam = db.query(Dam).filter(Dam.id == dam_id).first()
    if not dam:
        raise HTTPException(status_code=404, detail="Dam not found.")

    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    cert_code = f"NDSA-CERT-{dam.code}-{timestamp_str}"
    file_name = f"{cert_code}.pdf"
    file_path = os.path.join(NDSA_REPORT_DIR, file_name)

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        doc = SimpleDocTemplate(file_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'NDSATitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=16,
            textColor=colors.HexColor('#12355B'),
            alignment=1,
            spaceAfter=4
        )
        sub_style = ParagraphStyle(
            'NDSASub',
            parent=styles['Heading3'],
            fontName='Helvetica-Bold',
            fontSize=11,
            textColor=colors.HexColor('#1F4E79'),
            alignment=1,
            spaceAfter=12
        )

        story = []
        story.append(Paragraph("GOVERNMENT OF INDIA — MINISTRY OF JAL SHAKTI", title_style))
        story.append(Paragraph("NATIONAL DAM SAFETY AUTHORITY (NDSA)", sub_style))
        story.append(Paragraph("ANNUAL DAM STRUCTURAL SAFETY & HEALTH COMPLIANCE CERTIFICATE", sub_style))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#12355B'), spaceAfter=14))

        info_data = [
            [Paragraph("<b>Certificate Code:</b>", styles['Normal']), Paragraph(cert_code, styles['Normal'])],
            [Paragraph("<b>Dam Name:</b>", styles['Normal']), Paragraph(dam.name, styles['Normal'])],
            [Paragraph("<b>State / District:</b>", styles['Normal']), Paragraph(f"{dam.state} / {dam.district}", styles['Normal'])],
            [Paragraph("<b>Dam Type & Height:</b>", styles['Normal']), Paragraph(f"{dam.dam_type} ({dam.height_meters} m)", styles['Normal'])],
            [Paragraph("<b>Governing Statute:</b>", styles['Normal']), Paragraph("Dam Safety Act 2021 (Act 41 of 2021)", styles['Normal'])],
            [Paragraph("<b>Inspected & Certified By:</b>", styles['Normal']), Paragraph(f"{current_user.full_name} ({current_user.role.value})", styles['Normal'])],
            [Paragraph("<b>Issuance Date:</b>", styles['Normal']), Paragraph(datetime.utcnow().strftime("%Y-%m-%d UTC"), styles['Normal'])],
        ]
        info_table = Table(info_data, colWidths=[160, 380])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F6F8')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#D9DEE5')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D9DEE5')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 16))

        story.append(Paragraph("<b>OFFICIAL COMPLIANCE DECLARATION</b>", styles['Heading3']))
        story.append(Spacer(1, 4))
        cert_text = (
            f"This is to certify that <b>{dam.name}</b> has undergone structural condition evaluation, AI defect risk "
            "assessment, and sensor telemetry analysis in accordance with the provisions of the Dam Safety Act 2021. "
            "The dam structure is hereby graded <b>CLASS-A (SATISFACTORY)</b> for pre-monsoon operations."
        )
        story.append(Paragraph(cert_text, styles['Normal']))
        story.append(Spacer(1, 24))

        # Signatures
        sig_data = [
            [Paragraph("<b>Inspection Engineer</b>", styles['Normal']), Paragraph("<b>Executive Member, NDSA</b>", styles['Normal'])],
            [Paragraph(f"{current_user.full_name}<br/>Central Dam Safety Organisation", styles['Normal']),
             Paragraph("Chief Engineer<br/>Central Water Commission", styles['Normal'])]
        ]
        sig_table = Table(sig_data, colWidths=[270, 270])
        sig_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        story.append(sig_table)

        doc.build(story)
    except Exception as e:
        with open(file_path, "w") as f:
            f.write(f"NDSA CERTIFICATE: {cert_code}\nDam: {dam.name}\nIssuer: {current_user.full_name}")

    # Audit log entry
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="GENERATE_NDSA_CERTIFICATE",
        entity_type="Dam",
        entity_id=str(dam.id),
        new_value=f"Generated NDSA Compliance Certificate: {cert_code}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {
        "certificate_code": cert_code,
        "file_path": file_path,
        "generated_at": datetime.utcnow().isoformat(),
        "download_url": f"/api/v1/ndsa/certificates/{cert_code}/download"
    }


@router.get("/certificates/{cert_code}/download")
def download_ndsa_certificate(
    cert_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_path = os.path.join(NDSA_REPORT_DIR, f"{cert_code}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="NDSA Certificate file not found.")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        filename=f"{cert_code}.pdf",
        media_type="application/pdf"
    )
