"""PDF Report generator for Easy X-Ray scans."""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image as RLImage
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
import os


# ── Color Palette ──────────────────────────────────────────────────────────────
NAVY = colors.HexColor('#0a1628')
BLUE = colors.HexColor('#1a73e8')
CYAN = colors.HexColor('#00bcd4')
GREEN = colors.HexColor('#00c853')
RED = colors.HexColor('#f44336')
ORANGE = colors.HexColor('#ff9800')
GRAY_LIGHT = colors.HexColor('#f5f7fa')
GRAY = colors.HexColor('#9e9e9e')
WHITE = colors.white

DIAGNOSIS_COLORS = {
    'Normal': GREEN,
    'COVID-19': RED,
    'Pneumonia': ORANGE,
    'Pending': GRAY,
}


def diagnosis_color(diagnosis):
    return DIAGNOSIS_COLORS.get(diagnosis, GRAY)


def generate_scan_report(scan) -> bytes:
    """Generate a professional PDF report for an X-ray scan."""
    buffer = io.BytesIO()
    patient = scan.patient

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title=f"Easy X-Ray Report — {scan.scan_id}",
        author="Easy X-Ray AI System",
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ─────────────────────────────────────────────────────────────────
    header_style = ParagraphStyle(
        'Header', parent=styles['Normal'],
        fontSize=22, fontName='Helvetica-Bold',
        textColor=WHITE, alignment=TA_CENTER,
    )
    sub_header_style = ParagraphStyle(
        'SubHeader', parent=styles['Normal'],
        fontSize=10, fontName='Helvetica',
        textColor=colors.HexColor('#b0bec5'), alignment=TA_CENTER,
    )

    header_data = [[
        Paragraph('<b>🫁 Easy X-Ray</b>', ParagraphStyle(
            'AppName', parent=styles['Normal'],
            fontSize=20, fontName='Helvetica-Bold', textColor=WHITE
        )),
        Paragraph(
            f'<b>Diagnostic Report</b><br/>'
            f'<font size="9" color="#b0bec5">Scan ID: {scan.scan_id}</font>',
            ParagraphStyle('RptTitle', parent=styles['Normal'],
                           fontSize=14, fontName='Helvetica-Bold',
                           textColor=WHITE, alignment=TA_RIGHT)
        ),
    ]]
    header_table = Table(header_data, colWidths=[10*cm, 7*cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.4*cm))

    # ── Diagnosis Banner ───────────────────────────────────────────────────────
    diag_color = diagnosis_color(scan.diagnosis)
    confidence_pct = f"{scan.confidence * 100:.1f}%"
    banner_style = ParagraphStyle(
        'Banner', parent=styles['Normal'],
        fontSize=16, fontName='Helvetica-Bold',
        textColor=WHITE, alignment=TA_CENTER,
    )
    banner_data = [[
        Paragraph(f'DIAGNOSIS: {scan.diagnosis}', banner_style),
        Paragraph(f'Confidence: {confidence_pct}', ParagraphStyle(
            'ConfStyle', parent=styles['Normal'],
            fontSize=14, fontName='Helvetica',
            textColor=WHITE, alignment=TA_RIGHT,
        )),
    ]]
    banner_table = Table(banner_data, colWidths=[10*cm, 7*cm])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), diag_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Section helper ─────────────────────────────────────────────────────────
    section_style = ParagraphStyle(
        'SectionTitle', parent=styles['Normal'],
        fontSize=12, fontName='Helvetica-Bold',
        textColor=NAVY, spaceBefore=6, spaceAfter=4,
    )
    normal_style = ParagraphStyle(
        'NormalText', parent=styles['Normal'],
        fontSize=9, fontName='Helvetica', textColor=colors.HexColor('#37474f'),
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'],
        fontSize=8, fontName='Helvetica-Bold',
        textColor=GRAY,
    )
    value_style = ParagraphStyle(
        'Value', parent=styles['Normal'],
        fontSize=9, fontName='Helvetica',
        textColor=NAVY,
    )

    def section_title(text):
        story.append(Paragraph(f'▌ {text}', section_style))
        story.append(HRFlowable(width='100%', thickness=1, color=BLUE, spaceAfter=6))

    # ── Patient Information ────────────────────────────────────────────────────
    section_title('Patient Information')
    pat_data = [
        ['Patient ID', patient.patient_id, 'Full Name', patient.full_name],
        ['Date of Birth', str(patient.date_of_birth), 'Age', f"{patient.age} years"],
        ['Gender', patient.get_gender_display(), 'Blood Group', patient.blood_group or 'N/A'],
        ['Phone', patient.phone or 'N/A', 'Email', patient.email or 'N/A'],
    ]
    pat_table_data = []
    for row in pat_data:
        pat_table_data.append([
            Paragraph(row[0], label_style), Paragraph(row[1], value_style),
            Paragraph(row[2], label_style), Paragraph(row[3], value_style),
        ])

    pat_table = Table(pat_table_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 4.5*cm])
    pat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_LIGHT),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#e3f2fd')),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHITE, GRAY_LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(pat_table)
    story.append(Spacer(1, 0.4*cm))

    # ── Scan Information ───────────────────────────────────────────────────────
    section_title('Scan Information')
    scan_data = [
        [Paragraph('Scan ID', label_style), Paragraph(scan.scan_id, value_style),
         Paragraph('Date', label_style), Paragraph(scan.scan_date.strftime('%d %b %Y, %I:%M %p'), value_style)],
        [Paragraph('Radiologist', label_style), Paragraph(scan.radiologist or 'AI System', value_style),
         Paragraph('Severity', label_style), Paragraph(scan.severity or 'N/A', value_style)],
    ]
    scan_table = Table(scan_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 4.5*cm])
    scan_table.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [WHITE, GRAY_LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(scan_table)
    story.append(Spacer(1, 0.4*cm))

    # ── AI Probability Results ─────────────────────────────────────────────────
    section_title('AI Diagnosis Results')

    prob_data = [
        [Paragraph('<b>Condition</b>', label_style),
         Paragraph('<b>Probability</b>', label_style),
         Paragraph('<b>Assessment</b>', label_style)],
        [Paragraph('COVID-19', value_style),
         Paragraph(f"{scan.covid_probability * 100:.1f}%", value_style),
         Paragraph('Positive' if scan.covid_probability > 0.5 else 'Negative', value_style)],
        [Paragraph('Normal', value_style),
         Paragraph(f"{scan.normal_probability * 100:.1f}%", value_style),
         Paragraph('Clear' if scan.normal_probability > 0.5 else 'N/A', value_style)],
        [Paragraph('Pneumonia', value_style),
         Paragraph(f"{scan.pneumonia_probability * 100:.1f}%", value_style),
         Paragraph('Detected' if scan.pneumonia_probability > 0.5 else 'Negative', value_style)],
    ]
    prob_table = Table(prob_data, colWidths=[5*cm, 5*cm, 7*cm])
    prob_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_LIGHT]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e0e0e0')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(prob_table)
    story.append(Spacer(1, 0.4*cm))

    # ── X-Ray Images ──────────────────────────────────────────────────────────
    section_title('X-Ray Images')
    img_row = []

    from django.conf import settings as django_settings

    # Original image
    orig_path = os.path.join(django_settings.MEDIA_ROOT, str(scan.image))
    if os.path.exists(orig_path):
        try:
            rl_img = RLImage(orig_path, width=8*cm, height=8*cm)
            img_row.append([Paragraph('Original X-Ray', label_style), rl_img])
        except Exception:
            img_row.append([Paragraph('Original X-Ray', label_style), Paragraph('(Image not available)', normal_style)])
    else:
        img_row.append([Paragraph('Original X-Ray', label_style), Paragraph('(Image not available)', normal_style)])

    # Heatmap image
    if scan.heatmap_image:
        heatmap_path = os.path.join(django_settings.MEDIA_ROOT, str(scan.heatmap_image))
        if os.path.exists(heatmap_path):
            try:
                rl_heatmap = RLImage(heatmap_path, width=8*cm, height=8*cm)
                img_row.append([Paragraph('AI Heatmap (Grad-CAM)', label_style), rl_heatmap])
            except Exception:
                img_row.append([Paragraph('AI Heatmap', label_style), Paragraph('(Not available)', normal_style)])
        else:
            img_row.append([Paragraph('AI Heatmap', label_style), Paragraph('(Not available)', normal_style)])

    if len(img_row) == 2:
        img_table_data = [
            [img_row[0][0], img_row[1][0]],
            [img_row[0][1], img_row[1][1]],
        ]
        img_table = Table(img_table_data, colWidths=[8.5*cm, 8.5*cm])
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(img_table)
    elif len(img_row) == 1:
        story.append(img_row[0][1])

    story.append(Spacer(1, 0.4*cm))

    # ── Doctor Notes ──────────────────────────────────────────────────────────
    if scan.doctor_notes:
        section_title('Clinical Notes')
        story.append(Paragraph(scan.doctor_notes, normal_style))
        story.append(Spacer(1, 0.3*cm))

    # ── Disclaimer ────────────────────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=GRAY))
    disclaimer = ParagraphStyle(
        'Disclaimer', parent=styles['Normal'],
        fontSize=7, fontName='Helvetica-Oblique',
        textColor=GRAY, alignment=TA_CENTER,
    )
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        '⚠️  This report is generated by the Easy X-Ray AI system for screening purposes only. '
        'It is NOT a substitute for professional medical diagnosis. '
        'Always consult a qualified radiologist or physician for clinical decisions. '
        f'Report generated on {datetime.now().strftime("%d %B %Y at %I:%M %p")}.',
        disclaimer
    ))

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.read()
