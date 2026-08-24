"""initial VendorIQ schema

Revision ID: 0001_initial
"""
from alembic import op
import sqlalchemy as sa

revision='0001_initial'
down_revision=None
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('users', sa.Column('id',sa.Integer(),primary_key=True), sa.Column('full_name',sa.String(),nullable=False), sa.Column('email',sa.String(),nullable=False), sa.Column('password',sa.String(),nullable=False), sa.Column('role',sa.String(),nullable=False))
    op.create_index('ix_users_email','users',['email'],unique=True)
    op.create_table('vendors', sa.Column('id',sa.Integer(),primary_key=True), sa.Column('vendor_name',sa.String(),nullable=False), sa.Column('category',sa.String(),nullable=False), sa.Column('contact_person',sa.String(),nullable=False), sa.Column('email',sa.String(),nullable=False), sa.Column('phone',sa.String(),nullable=False), sa.Column('address',sa.String(),nullable=False), sa.Column('status',sa.String(),nullable=False))
    op.create_index('ix_vendors_email','vendors',['email'],unique=True)
    op.create_table('procurement_requests', sa.Column('id',sa.Integer(),primary_key=True), sa.Column('product_name',sa.String(),nullable=False), sa.Column('quantity',sa.Integer(),nullable=False), sa.Column('department',sa.String(),nullable=False), sa.Column('requested_by',sa.String(),nullable=False), sa.Column('priority',sa.String()), sa.Column('status',sa.String(),nullable=False))
    op.create_table('purchase_orders', sa.Column('id',sa.Integer(),primary_key=True), sa.Column('vendor_name',sa.String(),nullable=False), sa.Column('product_name',sa.String(),nullable=False), sa.Column('quantity',sa.Integer(),nullable=False), sa.Column('total_amount',sa.Integer(),nullable=False), sa.Column('status',sa.String(),nullable=False))
    op.create_table('vendor_performance', sa.Column('id',sa.Integer(),primary_key=True), sa.Column('vendor_name',sa.String(),nullable=False), sa.Column('delivery_score',sa.Integer(),nullable=False), sa.Column('quality_score',sa.Integer(),nullable=False), sa.Column('reliability_score',sa.Integer(),nullable=False), sa.Column('overall_score',sa.Integer(),nullable=False))
    op.create_table('contracts', sa.Column('id',sa.Integer(),primary_key=True), sa.Column('vendor_name',sa.String(),nullable=False), sa.Column('contract_title',sa.String(),nullable=False), sa.Column('start_date',sa.String(),nullable=False), sa.Column('expiry_date',sa.String(),nullable=False), sa.Column('renewal_notice_period',sa.Integer()), sa.Column('terms',sa.String(),nullable=False), sa.Column('compliance_flag',sa.String()), sa.Column('document_path',sa.String()), sa.Column('status',sa.String(),nullable=False))

def downgrade():
    op.drop_table('contracts'); op.drop_table('vendor_performance'); op.drop_table('purchase_orders'); op.drop_table('procurement_requests'); op.drop_index('ix_vendors_email',table_name='vendors'); op.drop_table('vendors'); op.drop_index('ix_users_email',table_name='users'); op.drop_table('users')
