from django.db import models
from django.utils import timezone


__all__ = ['UpdateFirewallStatus', 'UpdateFirewallStatusLogs']


FIREWALL_STATUS_CHOICES = (
    ('waiting', 'waiting'),
    ('solar_wind_mute', 'solar_wind_mute'),
    ('backup', 'backup'),
    ('cleanup','cleanup'),
    ('download', 'download'),
    ('install', 'install'),
    ('reboot', 'reboot'),
    ('login', 'login'),
    ('solar_wind_unmute', 'solar_wind_unmute'),
    ('updated', 'updated')
)

class UpdateFirewallStatus(models.Model):
    job_id = models.PositiveIntegerField(
        null=True,
        default=None,
        db_index=True,
    )
    group_name = models.CharField(max_length=256, null=True, blank=True)
    ip_address = models.CharField(max_length=256)
    status = models.CharField(
        max_length=24,
        choices=FIREWALL_STATUS_CHOICES,
        default="waiting"
        )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    sequence = models.BooleanField(default=False)
    name = models.CharField(max_length=256, null=True)
    update_version = models.CharField(max_length=50, null=True)
    current_version = models.CharField(max_length=50, null=True)
    api_key = models.CharField(max_length=256, null=True)


class UpdateFirewallStatusLogs(models.Model):
    job_id = models.PositiveIntegerField(
        null=True,
        default=None,
        db_index=True,
    )
    ip_address = models.CharField(max_length=256)
    text = models.CharField(max_length=250, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


class UpdateFirewallBackupFile(models.Model):
    job_id = models.PositiveIntegerField(
        null=True,
        default=None,
        db_index=True,
    )
    ip_address = models.CharField(max_length=256)
    file_name = models.CharField(max_length=250, null=True)
    xml_content = models.TextField(null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)