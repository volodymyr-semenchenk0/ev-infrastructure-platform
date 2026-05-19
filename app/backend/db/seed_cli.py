"""CLI обгортка: `python -m db.seed_cli` — заповнює довідники."""

from __future__ import annotations

import asyncio

from db.seed import seed_reference_data
from db.session import AsyncSessionLocal


async def _main() -> None:
    async with AsyncSessionLocal() as session:
        await seed_reference_data(session)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(_main())
    print("Reference data seeded (2 profiles, 10 criteria, 12 locations).")
