from datetime import datetime
from typing import Literal

# pyrefly: ignore [missing-import]
from django.conf import settings
# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field, RootModel, model_validator


TIME_PATTERN = r'^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$'
RoutineDay = Literal['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']


class GeminiClassSchema(BaseModel):
    """Gemini-compatible output schema.

    Gemini's structured-output API rejects Pydantic's
    ``additionalProperties: false`` keyword, so this permissive model is used
    only to describe the response shape sent to Gemini. The response text is
    subsequently validated with ``ExtractedClass``, which forbids extra keys.
    """

    day_of_week: RoutineDay = Field(
        description='Uppercase weekday for the class, Sunday through Thursday only.'
    )
    course_name: str = Field(
        min_length=1,
        max_length=255,
        description='Complete visible course code and course name from the routine cell.',
    )
    start_time: str = Field(
        pattern=TIME_PATTERN,
        description='Class start time in strict 24-hour HH:MM:SS format.',
    )
    end_time: str = Field(
        pattern=TIME_PATTERN,
        description='Class end time in strict 24-hour HH:MM:SS format.',
    )
    room: str = Field(
        default='',
        max_length=100,
        description='Room or lab exactly as shown; empty string when absent.',
    )


class GeminiScheduleSchema(RootModel[list[GeminiClassSchema]]):
    pass


class ExtractedClass(GeminiClassSchema):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

    @model_validator(mode='after')
    def end_must_follow_start(self):
        start = datetime.strptime(self.start_time, '%H:%M:%S').time()
        end = datetime.strptime(self.end_time, '%H:%M:%S').time()
        if end <= start:
            raise ValueError('end_time must be later than start_time')
        return self


class ExtractedSchedule(RootModel[list[ExtractedClass]]):
    @model_validator(mode='after')
    def require_reasonable_schedule(self):
        if not self.root:
            raise ValueError('No classes were found in the uploaded image.')
        if len(self.root) > 100:
            raise ValueError('The image contains too many routine entries.')
        return self


ROUTINE_EXTRACTION_PROMPT = """
Read this university class-routine image carefully, including all column and row
headers. Extract only recurring classes scheduled from Sunday through Thursday.
Ignore Friday, Saturday, breaks, lunch periods, exam notices, legends, headings,
and cells that do not represent a class.

Associate each class with the correct weekday and time interval. Convert every
time to strict 24-hour HH:MM:SS format. Preserve the visible course code/name in
course_name and the visible room or lab in room. Use an empty room string only
when no room is visible. Do not guess unreadable classes and do not return
explanations, markdown, or additional fields.
""".strip()


def extract_schedule(image_bytes, mime_type):
    """Extract and validate a class schedule using Gemini structured output."""

    if not settings.GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY is not configured.')

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_ROUTINE_MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ROUTINE_EXTRACTION_PROMPT,
        ],
        config=types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type='application/json',
            response_schema=GeminiScheduleSchema,
        ),
    )

    if response.text:
        # Validate the raw JSON with the strict application model. This catches
        # extra properties as well as invalid days, times, and empty schedules.
        return ExtractedSchedule.model_validate_json(response.text).root
    raise ValueError('Gemini returned an empty routine response.')
