"""Seed script to populate Easy X-Ray with demo patients and sample X-ray scans."""
import os
import shutil
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'easyxray.settings')
django.setup()

from django.conf import settings
from xrayapp.models import Patient, XRayScan
from xrayapp.ml_model import predict_xray

def run_seed():
    print("[Easy X-Ray] Seeding clinical demo data...")
    media_scans = os.path.join(settings.MEDIA_ROOT, 'scans')
    os.makedirs(media_scans, exist_ok=True)

    # 1. Create Patients
    patients_data = [
        {
            'patient_id': 'PID-A74921',
            'first_name': 'Marcus',
            'last_name': 'Vance',
            'date_of_birth': date(1972, 4, 15),
            'gender': 'M',
            'blood_group': 'O+',
            'phone': '+1 (555) 234-8901',
            'email': 'm.vance@example.com',
            'address': '742 Evergreen Terrace, Springfield',
        },
        {
            'patient_id': 'PID-B83104',
            'first_name': 'Elena',
            'last_name': 'Rostova',
            'date_of_birth': date(1994, 9, 22),
            'gender': 'F',
            'blood_group': 'A+',
            'phone': '+1 (555) 876-5432',
            'email': 'elena.rostova@example.com',
            'address': '128 Pinecrest Way, Seattle, WA',
        },
        {
            'patient_id': 'PID-C19052',
            'first_name': 'David',
            'last_name': 'Kim',
            'date_of_birth': date(1980, 11, 3),
            'gender': 'M',
            'blood_group': 'B+',
            'phone': '+1 (555) 345-6789',
            'email': 'dkim.md@example.com',
            'address': '550 Mission Blvd, San Francisco, CA',
        },
    ]

    created_patients = []
    for pdata in patients_data:
        patient, created = Patient.objects.get_or_create(
            patient_id=pdata['patient_id'],
            defaults=pdata
        )
        created_patients.append(patient)
        status_str = "Created" if created else "Found"
        print(f"  {status_str} patient: {patient.full_name} ({patient.patient_id})")

    # 2. Seed Sample Scans
    sample_dir = os.path.join(settings.BASE_DIR, 'sample_scans')
    sample_files = [f for f in os.listdir(sample_dir) if f.endswith('.png')] if os.path.exists(sample_dir) else []

    if sample_files and XRayScan.objects.count() == 0:
        for idx, (patient, fname) in enumerate(zip(created_patients, sample_files[:3])):
            src = os.path.join(sample_dir, fname)
            dst_name = f"demo_{fname}"
            dst = os.path.join(media_scans, dst_name)
            shutil.copy2(src, dst)

            scan_rel_path = f"scans/{dst_name}"
            scan_id = f"SCN-2026-{idx+1:04d}"
            
            # Predict
            result = predict_xray(dst)
            diag = result['diagnosis']
            conf = result['confidence']

            severity = 'Normal' if diag == 'Normal' else ('Severe' if conf > 0.85 else 'Moderate')

            scan = XRayScan.objects.create(
                patient=patient,
                scan_id=scan_id,
                image=scan_rel_path,
                heatmap_image=result.get('heatmap_path', ''),
                diagnosis=diag,
                confidence=conf,
                severity=severity,
                covid_probability=result['probabilities']['COVID-19'],
                normal_probability=result['probabilities']['Normal'],
                pneumonia_probability=result['probabilities']['Pneumonia'],
                radiologist='Dr. Sarah Jenkins, MD',
                doctor_notes='Routine pulmonary radiograph evaluated via AI automated triage pipeline.',
            )
            print(f"  Created scan: {scan.scan_id} for {patient.full_name} -> {diag} ({conf*100:.1f}%)")

    print(f"[Easy X-Ray] Seeding complete! Patients: {Patient.objects.count()}, Scans: {XRayScan.objects.count()}")

if __name__ == '__main__':
    run_seed()
