"""add_po_and_audit_notification

Revision ID: 9ff360c5e4df
Revises: 774f6f383dac
Create Date: 2026-08-06 13:52:15.763838

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ff360c5e4df'
down_revision: Union[str, None] = '774f6f383dac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to purchase_orders
    op.add_column('purchase_orders', sa.Column('po_number', sa.String(), nullable=True))
    op.add_column('purchase_orders', sa.Column('invoice_file_path', sa.String(), nullable=True))
    op.add_column('purchase_orders', sa.Column('receipt_file_path', sa.String(), nullable=True))
    op.create_index(op.f('ix_purchase_orders_po_number'), 'purchase_orders', ['po_number'], unique=True)

    # Create audit_logs table
    op.create_table('audit_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('action', sa.String(), nullable=False),
    sa.Column('entity_type', sa.String(), nullable=True),
    sa.Column('entity_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)

    # Create notifications table
    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('message', sa.String(), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_id'), table_name='notifications')
    op.drop_table('notifications')
    
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_table('audit_logs')
    
    op.drop_index(op.f('ix_purchase_orders_po_number'), table_name='purchase_orders')
    op.drop_column('purchase_orders', 'receipt_file_path')
    op.drop_column('purchase_orders', 'invoice_file_path')
    op.drop_column('purchase_orders', 'po_number')
