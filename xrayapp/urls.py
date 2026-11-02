"""API URL patterns for xrayapp."""
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard_stats, name='api_dashboard'),

    # Patients
    path('patients/', views.patient_list, name='api_patient_list'),
    path('patients/create/', views.patient_create, name='api_patient_create'),
    path('patients/<int:pk>/', views.patient_detail, name='api_patient_detail'),

    # Scans
    path('scans/', views.scan_list, name='api_scan_list'),
    path('scans/validate/', views.validate_xray_image, name='api_validate_xray'),
    path('scans/upload/', views.scan_upload, name='api_scan_upload'),
    path('scans/<int:pk>/', views.scan_detail, name='api_scan_detail'),
    path('scans/<int:pk>/report/', views.scan_report, name='api_scan_report'),
]
