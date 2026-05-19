"""CLI wrapper: `python -m db.seed_cli` — populates reference data and decision matrix."""

from __future__ import annotations

import asyncio

from db.seed import seed_decision_matrix, seed_reference_data
from db.session import AsyncSessionLocal


async def _main() -> None:
    async with AsyncSessionLocal() as session:
        await seed_reference_data(session)
        await seed_decision_matrix(session)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(_main())
    print("Seeded reference data + decision matrix (120 values).")
