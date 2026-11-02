"""REST API Views for Easy X-Ray."""
import os
import uuid
from datetime import datetime

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import Patient, XRayScan
from .serializers import PatientSerializer, XRayScanSerializer
from .ml_model import predict_xray, classify_is_xray
from .pdf_generator import generate_scan_report


# ════════════════════════════════════════════════════════════
#  DASHBOARD
# ════════════════════════════════════════════════════════════

@api_view(['GET'])
def dashboard_stats(request):
    """Return summary statistics for the dashboard."""
    total_patients = Patient.objects.count()
    total_scans = XRayScan.objects.count()
    covid = XRayScan.objects.filter(diagnosis='COVID-19').count()
    pneumonia = XRayScan.objects.filter(diagnosis='Pneumonia').count()
    normal = XRayScan.objects.filter(diagnosis='Normal').count()

    recent_scans = XRayScan.objects.select_related('patient').order_by('-scan_date')[:8]
    recent_patients = Patient.objects.order_by('-created_at')[:5]

    return Response({
        'total_patients': total_patients,
        'total_scans': total_scans,
        'covid_cases': covid,
        'pneumonia_cases': pneumonia,
        'normal_cases': normal,
        'recent_scans': XRayScanSerializer(recent_scans, many=True, context={'request': request}).data,
        'recent_patients': PatientSerializer(recent_patients, many=True).data,
    })


# ════════════════════════════════════════════════════════════
#  PATIENTS
# ════════════════════════════════════════════════════════════

@api_view(['GET'])
def patient_list(request):
    """List all patients with optional search."""
    query = request.query_params.get('q', '')
    patients = Patient.objects.all()
    if query:
        from django.db.models import Q
        patients = patients.filter(
            Q(first_name__icontains=query) | Q(last_name__icontains=query) |
            Q(patient_id__icontains=query) | Q(email__icontains=query)
        )
    serializer = PatientSerializer(patients, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def patient_create(request):
    """Register a new patient."""
    data = request.data.copy()
    data['patient_id'] = f"PID-{uuid.uuid4().hex[:6].upper()}"
    serializer = PatientSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def patient_detail(request, pk):
    """Get, update, or delete a patient."""
    patient = get_object_or_404(Patient, pk=pk)

    if request.method == 'GET':
        scans = patient.scans.all()
        return Response({
            'patient': PatientSerializer(patient).data,
            'scans': XRayScanSerializer(scans, many=True, context={'request': request}).data,
        })

    elif request.method == 'PUT':
        serializer = PatientSerializer(patient, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        patient.delete()
        return Response({'message': 'Patient deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ════════════════════════════════════════════════════════════
#  SCANS
# ════════════════════════════════════════════════════════════

@api_view(['GET'])
def scan_list(request):
    """List all scans with optional filters."""
    query = request.query_params.get('q', '')
    diagnosis = request.query_params.get('diagnosis', '')
    patient_id = request.query_params.get('patient_id', '')
    scans = XRayScan.objects.select_related('patient').all()

    if patient_id:
        scans = scans.filter(patient__patient_id=patient_id)
    if query:
        from django.db.models import Q
        scans = scans.filter(
            Q(scan_id__icontains=query) |
            Q(patient__first_name__icontains=query) |
            Q(patient__last_name__icontains=query)
        )
    if diagnosis:
        scans = scans.filter(diagnosis=diagnosis)

    serializer = XRayScanSerializer(scans, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def validate_xray_image(request):
    """Real-time gatekeeper validation: Verify whether uploaded image is a valid chest X-ray."""
    xray_file = request.FILES.get('xray_image')
    if not xray_file:
        return Response({'error': 'xray_image file is required.'}, status=status.HTTP_400_BAD_REQUEST)

    temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_val')
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"val_{uuid.uuid4().hex[:8]}_{xray_file.name}")

    with open(temp_path, 'wb') as f:
        for chunk in xray_file.chunks():
            f.write(chunk)

    try:
        check = classify_is_xray(temp_path)
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

    return Response(check)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def scan_upload(request):
    """Upload X-ray image and run AI inference (with X-ray gatekeeper validation)."""
    patient_id = request.data.get('patient_id')
    xray_file = request.FILES.get('xray_image')

    if not patient_id:
        return Response({'error': 'patient_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not xray_file:
        return Response({'error': 'xray_image file is required.'}, status=status.HTTP_400_BAD_REQUEST)

    patient = get_object_or_404(Patient, pk=patient_id)

    scan_id = f"SCN-{uuid.uuid4().hex[:8].upper()}"
    scan = XRayScan.objects.create(
        patient=patient,
        scan_id=scan_id,
        image=xray_file,
        doctor_notes=request.data.get('doctor_notes', ''),
        radiologist=request.data.get('radiologist', ''),
    )

    image_path = os.path.join(settings.MEDIA_ROOT, str(scan.image))

    # ── Step 1: Gatekeeper Model Verification (Is it a Chest X-Ray?) ───────
    check = classify_is_xray(image_path)
    if not check['is_xray']:
        scan.delete()  # Remove invalid non-medical file
        conf_pct = check['confidence'] * 100
        return Response({
            'error': f"Image Validation Failed: The uploaded image is NOT a valid chest X-ray ({check['reason']}). Detector Confidence: {conf_pct:.1f}%.",
            'is_xray': False,
            'details': check,
        }, status=status.HTTP_400_BAD_REQUEST)

    # ── Step 2: ResNet-50 Disease Classification & Grad-CAM Heatmap ────────
    result = predict_xray(image_path)

    # Determine severity
    confidence = result['confidence']
    diagnosis = result['diagnosis']
    if diagnosis == 'Normal':
        severity = 'Normal'
    elif confidence >= 0.85:
        severity = 'Severe'
    elif confidence >= 0.65:
        severity = 'Moderate'
    else:
        severity = 'Mild'

    scan.diagnosis = diagnosis
    scan.confidence = confidence
    scan.severity = severity
    scan.covid_probability = result['probabilities']['COVID-19']
    scan.normal_probability = result['probabilities']['Normal']
    scan.pneumonia_probability = result['probabilities']['Pneumonia']
    if result.get('heatmap_path'):
        scan.heatmap_image = result['heatmap_path']
    scan.save()

    return Response(
        XRayScanSerializer(scan, context={'request': request}).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['GET'])
def scan_detail(request, pk):
    """Retrieve a single scan."""
    scan = get_object_or_404(XRayScan.objects.select_related('patient'), pk=pk)
    serializer = XRayScanSerializer(scan, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def scan_report(request, pk):
    """Generate and download PDF report."""
    scan = get_object_or_404(XRayScan.objects.select_related('patient'), pk=pk)
    pdf_bytes = generate_scan_report(scan)
    scan.report_generated = True
    scan.save(update_fields=['report_generated'])
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="EasyXRay_{scan.scan_id}.pdf"'
    response['Access-Control-Expose-Headers'] = 'Content-Disposition'
    return response
