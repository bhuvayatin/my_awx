from django.db import models
from django.utils import timezone


__all__ = ['UpdateFirewallStatus']


FIREWALL_STATUS_CHOICES = (
    ('waiting', 'waiting'),
    ('downloading', 'downloading'),
    ('solar_wind_mute', 'solar_wind_mute'),
    ('backup', 'backup'),
    ('installing', 'installing'),
    ('rebooting', 'rebooting'),
    ('commit', 'commit'),
    ('ping', 'ping'),
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