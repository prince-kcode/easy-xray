"""DRF Serializers for Easy X-Ray API."""
from rest_framework import serializers
from .models import Patient, XRayScan


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    scan_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'first_name', 'last_name', 'full_name',
            'date_of_birth', 'age', 'gender', 'phone', 'email',
            'address', 'blood_group', 'created_at', 'scan_count',
        ]
        read_only_fields = ['id', 'patient_id', 'created_at']

    def get_scan_count(self, obj):
        return obj.scans.count()


class XRayScanSerializer(serializers.ModelSerializer):
    patient_name = serializers.ReadOnlyField(source='patient.full_name')
    patient_id_str = serializers.ReadOnlyField(source='patient.patient_id')
    image_url = serializers.SerializerMethodField()
    heatmap_url = serializers.SerializerMethodField()

    class Meta:
        model = XRayScan
        fields = [
            'id', 'scan_id', 'patient', 'patient_name', 'patient_id_str',
            'image', 'image_url', 'heatmap_image', 'heatmap_url',
            'diagnosis', 'confidence', 'severity',
            'covid_probability', 'normal_probability', 'pneumonia_probability',
            'doctor_notes', 'radiologist', 'scan_date', 'report_generated',
        ]
        read_only_fields = [
            'id', 'scan_id', 'diagnosis', 'confidence', 'severity',
            'covid_probability', 'normal_probability', 'pneumonia_probability',
            'heatmap_image', 'scan_date', 'report_generated',
        ]

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_heatmap_url(self, obj):
        request = self.context.get('request')
        if obj.heatmap_image and request:
            return request.build_absolute_uri(obj.heatmap_image.url)
        return None
