# -*- coding: utf-8 -*-
# Generated by Django 1.11.20 on 2019-05-28 17:15
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('main', '0078_v360_clear_sessions_tokens_jt'),
    ]

    operations = [
        migrations.AlterField(
            model_name='oauth2application',
            name='authorization_grant_type',
            field=models.CharField(
                choices=[('authorization-code', 'Authorization code'), ('password', 'Resource owner password-based')],
                help_text='The Grant type the user must use for acquire tokens for this application.',
                max_length=32,
            ),
        ),
    ]
