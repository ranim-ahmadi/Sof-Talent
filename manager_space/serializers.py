from rest_framework import serializers
from .models import UploadedFile

class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ['id', 'user', 'file', 'file_name', 'is_job_description', 'matching_results']
        read_only_fields = ['id', 'user', 'file_name', 'is_job_description', 'matching_results']