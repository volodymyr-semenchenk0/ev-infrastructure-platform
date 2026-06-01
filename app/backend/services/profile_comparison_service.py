"""ProfileComparisonService — canonical two-profile comparison (spec 2.1.1, 2.3.4).

Higher-order scenario: run the full FAHP+TOPSIS cycle for two ОПР profiles from their
default pairwise matrices and compare the resulting rankings via Spearman (formula 1.18).
Evaluating from defaults — rather than a session-edited matrix — keeps the result
reproducible for §3.2.4. The math lives in mcdm/; this class only orchestrates
repositories, EvaluationService and the stateless ComparisonService.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from db.defaults import build_default_pairwise_matrix
from db.models import Criterion, Profile
from schemas.comparison import ProfileComparisonRead, ProfileRankingRead
from schemas.evaluation import EvaluationRead
from services.comparison_service import ComparisonService
from services.evaluation_service import EvaluationService
from services.repository import CriterionRepository, ProfileRepository

# Codes of the two standard profiles used when no ids are given (db/defaults.py).
_DEFAULT_PROFILE_CODES = ("municipal", "investor")


class ProfileComparisonService:
    def __init__(self, session: AsyncSession) -> None:
        self.profile_repo = ProfileRepository(session)
        self.criterion_repo = CriterionRepository(session)
        self.evaluation_service = EvaluationService(session)
        self.comparison_service = ComparisonService()

    async def compare_profiles(
        self,
        profile_a_id: int | None = None,
        profile_b_id: int | None = None,
    ) -> ProfileComparisonRead:
        """Compare two profiles by the rankings of their default matrices.

        With both ids omitted, the two standard profiles (municipal, investor) are used.

        Raises:
            ValueError: a requested profile is missing, the two standard profiles
                cannot be resolved, or a profile has no default matrix.
        """
        profile_a, profile_b = await self._resolve_profiles(profile_a_id, profile_b_id)

        # Criteria are shared by both profiles; load once.
        criteria = list(await self.criterion_repo.list_ordered())

        eval_a = await self._evaluate_default(profile_a, criteria)
        eval_b = await self._evaluate_default(profile_b, criteria)

        comparison = self.comparison_service.compare(eval_a, eval_b)

        return ProfileComparisonRead(
            profile_a=_to_profile_ranking(profile_a, eval_a),
            profile_b=_to_profile_ranking(profile_b, eval_b),
            comparison=comparison,
        )

    async def _resolve_profiles(
        self, profile_a_id: int | None, profile_b_id: int | None
    ) -> tuple[Profile, Profile]:
        if profile_a_id is None and profile_b_id is None:
            return await self._default_profile_pair()
        if profile_a_id is None or profile_b_id is None:
            raise ValueError("both profile_a and profile_b must be given, or neither")
        return await self._get_profile(profile_a_id), await self._get_profile(profile_b_id)

    async def _get_profile(self, profile_id: int) -> Profile:
        profile = await self.profile_repo.get(profile_id)
        if profile is None:
            raise ValueError(f"Profile {profile_id} not found")
        return profile

    async def _default_profile_pair(self) -> tuple[Profile, Profile]:
        by_code = {p.code: p for p in await self.profile_repo.list_all()}
        code_a, code_b = _DEFAULT_PROFILE_CODES
        try:
            return by_code[code_a], by_code[code_b]
        except KeyError as exc:
            raise ValueError(f"standard profile {exc.args[0]!r} not found") from exc

    async def _evaluate_default(
        self, profile: Profile, criteria: list[Criterion]
    ) -> EvaluationRead:
        matrix = build_default_pairwise_matrix(profile.code, criteria)
        if matrix is None:
            raise ValueError(f"profile {profile.code!r} has no default pairwise matrix")
        return await self.evaluation_service.execute_full_cycle(profile.id, matrix)


def _to_profile_ranking(profile: Profile, evaluation: EvaluationRead) -> ProfileRankingRead:
    return ProfileRankingRead(
        id=profile.id,
        code=profile.code,
        name=profile.name,
        ranking=evaluation.ranking,
    )
