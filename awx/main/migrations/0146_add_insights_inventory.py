# Generated by Django 2.2.16 on 2021-06-08 18:59

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('main', '0145_deregister_managed_ee_objs'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='host',
            name='insights_system_id',
        ),
        migrations.AlterField(
            model_name='inventorysource',
            name='source',
            field=models.CharField(
                choices=[
                    ('file', 'File, Directory or Script'),
                    ('scm', 'Sourced from a Project'),
                    ('ec2', 'Amazon EC2'),
                    ('gce', 'Google Compute Engine'),
                    ('azure_rm', 'Microsoft Azure Resource Manager'),
                    ('vmware', 'VMware vCenter'),
                    ('satellite6', 'Red Hat Satellite 6'),
                    ('openstack', 'OpenStack'),
                    ('rhv', 'Red Hat Virtualization'),
                    ('tower', 'Ansible Tower'),
                    ('insights', 'Red Hat Insights'),
                ],
                default=None,
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name='inventoryupdate',
            name='source',
            field=models.CharField(
                choices=[
                    ('file', 'File, Directory or Script'),
                    ('scm', 'Sourced from a Project'),
                    ('ec2', 'Amazon EC2'),
                    ('gce', 'Google Compute Engine'),
                    ('azure_rm', 'Microsoft Azure Resource Manager'),
                    ('vmware', 'VMware vCenter'),
                    ('satellite6', 'Red Hat Satellite 6'),
                    ('openstack', 'OpenStack'),
                    ('rhv', 'Red Hat Virtualization'),
                    ('tower', 'Ansible Tower'),
                    ('insights', 'Red Hat Insights'),
                ],
                default=None,
                max_length=32,
            ),
        ),
    ]
