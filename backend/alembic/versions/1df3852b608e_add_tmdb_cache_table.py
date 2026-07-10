"""add tmdb cache table

Revision ID: 1df3852b608e
Revises: 9c4ea2353381
Create Date: 2026-07-10 19:37:26.403948

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1df3852b608e'
down_revision: Union[str, Sequence[str], None] = '9c4ea2353381'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'tmdb_cache',
        sa.Column('cache_key', sa.String(length=255), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('cached_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('cache_key'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('tmdb_cache')
