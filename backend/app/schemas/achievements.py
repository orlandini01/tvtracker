from pydantic import BaseModel


class AchievementOut(BaseModel):
    id: str
    earned: bool
    progress: int
    target: int


class AchievementsResponse(BaseModel):
    results: list[AchievementOut]
