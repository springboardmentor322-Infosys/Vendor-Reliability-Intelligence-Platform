"""Add phase 4 contract fields

Revision ID: 1674eb77c68b
Revises: 9ff360c5e4df
Create Date: 2026-08-06 15:47:04.761764

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1674eb77c68b'
down_revision: Union[str, None] = '9ff360c5e4df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to contracts table
    op.add_column('contracts', sa.Column('contract_number', sa.String(), nullable=True))
    op.add_column('contracts', sa.Column('purchase_order_id', sa.Integer(), nullable=True))
    op.add_column('contracts', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('contracts', sa.Column('contract_type', sa.String(), nullable=True))
    op.add_column('contracts', sa.Column('renewal_date', sa.Date(), nullable=True))
    op.add_column('contracts', sa.Column('renewal_notice_period', sa.Integer(), server_default='30', nullable=True))
    op.add_column('contracts', sa.Column('contract_value', sa.Float(), nullable=True))
    op.add_column('contracts', sa.Column('currency', sa.String(), server_default='USD', nullable=True))
    op.add_column('contracts', sa.Column('terms', sa.Text(), nullable=True))
    op.add_column('contracts', sa.Column('compliance_flags', sa.JSON(), nullable=True))
    op.add_column('contracts', sa.Column('renewal_required', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('contracts', sa.Column('auto_renew', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('contracts', sa.Column('uploaded_document_path', sa.String(), nullable=True))
    op.add_column('contracts', sa.Column('uploaded_document_name', sa.String(), nullable=True))
    op.add_column('contracts', sa.Column('uploaded_at', sa.DateTime(), nullable=True))
    op.add_column('contracts', sa.Column('created_by', sa.Integer(), nullable=True))
    op.add_column('contracts', sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Create indexes and foreign keys
    op.create_index(op.f('ix_contracts_contract_number'), 'contracts', ['contract_number'], unique=True)
    op.create_foreign_key('fk_contracts_po_id', 'contracts', 'purchase_orders', ['purchase_order_id'], ['id'])
    op.create_foreign_key('fk_contracts_user_id', 'contracts', 'users', ['created_by'], ['id'])

def downgrade() -> None:
    # Drop foreign keys and indexes
    op.drop_constraint('fk_contracts_user_id', 'contracts', type_='foreignkey')
    op.drop_constraint('fk_contracts_po_id', 'contracts', type_='foreignkey')
    op.drop_index(op.f('ix_contracts_contract_number'), table_name='contracts')
    
    # Drop columns
    columns_to_drop = [
        'updated_at', 'created_by', 'uploaded_at', 'uploaded_document_name', 
        'uploaded_document_path', 'auto_renew', 'renewal_required', 'compliance_flags', 
        'terms', 'currency', 'contract_value', 'renewal_notice_period', 'renewal_date', 
        'contract_type', 'description', 'purchase_order_id', 'contract_number'
    ]
    for col in columns_to_drop:
        op.drop_column('contracts', col)
