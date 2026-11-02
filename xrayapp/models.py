"""Models for Easy X-Ray Application."""
from django.db import models
import os


class Patient(models.Model):
    """Patient record model."""
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]

    patient_id = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    blood_group = models.CharField(max_length=5, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient_id} - {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )


class XRayScan(models.Model):
    """X-Ray scan and diagnosis model."""
    DIAGNOSIS_CHOICES = [
        ('COVID-19', 'COVID-19'),
        ('Normal', 'Normal'),
        ('Pneumonia', 'Pneumonia'),
        ('Pending', 'Pending'),
    ]
    SEVERITY_CHOICES = [
        ('Mild', 'Mild'),
        ('Moderate', 'Moderate'),
        ('Severe', 'Severe'),
        ('Normal', 'Normal'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='scans')
    scan_id = models.CharField(max_length=20, unique=True)
    image = models.ImageField(upload_to='uploads/')
    heatmap_image = models.ImageField(upload_to='heatmaps/', blank=True, null=True)
    diagnosis = models.CharField(max_length=20, choices=DIAGNOSIS_CHOICES, default='Pending')
    confidence = models.FloatField(default=0.0)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, blank=True)
    covid_probability = models.FloatField(default=0.0)
    normal_probability = models.FloatField(default=0.0)
    pneumonia_probability = models.FloatField(default=0.0)
    doctor_notes = models.TextField(blank=True)
    radiologist = models.CharField(max_length=100, blank=True)
    scan_date = models.DateTimeField(auto_now_add=True)
    report_generated = models.BooleanField(default=False)

    class Meta:
        ordering = ['-scan_date']

    def __str__(self):
        return f"Scan {self.scan_id} - {self.patient.full_name} - {self.diagnosis}"

    def delete(self, *args, **kwargs):
        # Delete image files when scan is deleted
        if self.image and os.path.isfile(self.image.path):
            os.remove(self.image.path)
        if self.heatmap_image and os.path.isfile(self.heatmap_image.path):
            os.remove(self.heatmap_image.path)
        super().delete(*args, **kwargs)
