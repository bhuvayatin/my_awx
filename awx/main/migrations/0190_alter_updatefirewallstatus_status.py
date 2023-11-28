# Generated by Django 4.2.5 on 2023-11-09 09:59

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('main', '0189_updatefirewallstatus_group_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='updatefirewallstatus',
            name='status',
            field=models.CharField(
                choices=[
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
                    ('updated', 'updated'),
                ],
                default='waiting',
                max_length=24,
            ),
        ),
    ]