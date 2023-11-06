from django.db import models


__all__ = ['UpdateFirewallStatus']


FIREWALL_STATUS_CHOICES = (
    ('waiting', 'waiting'),
    ('processing', 'processing'),
    ('installing', 'installing'),
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