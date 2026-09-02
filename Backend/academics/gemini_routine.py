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


TIME_12_HOUR_PATTERN = r'^(?:0[1-9]|1[0-2]):[0-5]\d (?:AM|PM)$'
CREDIT_PATTERN = r'^\d{1,2}(?:\.\d{1,2})?$'
RoutineDay = Literal['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY']
DAY_ORDER = {day: index for index, day in enumerate(RoutineDay.__args__)}


class GeminiClassSchema(BaseModel):
    """Gemini-compatible output schema.

    Gemini's structured-output API rejects Pydantic's
    ``additionalProperties: false`` keyword, so this permissive model is used
    only to describe the response shape sent to Gemini. The response text is
    subsequently validated with ``ExtractedClass``, which forbids extra keys.
    """

    day_of_week: RoutineDay = Field(description='Uppercase weekday, Sunday through Thursday.')
    course_code: str = Field(
        min_length=1,
        max_length=32,
        description='Course number exactly as shown, such as CSE-347.',
    )
    course_title: str = Field(
        min_length=1,
        max_length=255,
        description='Course title matched from the syllabus/faculty table.',
    )
    credit: str = Field(
        pattern=CREDIT_PATTERN,
        description='Credit matched from the syllabus table, represented as a string.',
    )
    teacher_name: str = Field(
        min_length=1,
        max_length=255,
        description="Teacher's name matched from the syllabus/faculty table.",
    )
    start_time: str = Field(
        pattern=TIME_12_HOUR_PATTERN,
        description='Class start time in strict zero-padded 12-hour HH:MM AM/PM format.',
    )
    end_time: str = Field(
        pattern=TIME_12_HOUR_PATTERN,
        description='Class end time in strict zero-padded 12-hour HH:MM AM/PM format.',
    )
    room: str = Field(
        default='',
        max_length=100,
        description=(
            'For theory classes, use the room for the selected parent section. '
            'For sessional classes, use the matching lab name when visible. '
            'Use an empty string only when neither is available.'
        ),
    )


class GeminiScheduleSchema(RootModel[list[GeminiClassSchema]]):
    pass


class ExtractedClass(GeminiClassSchema):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, strict=True)

    @model_validator(mode='after')
    def end_must_follow_start(self):
        start = datetime.strptime(self.start_time, '%I:%M %p').time()
        end = datetime.strptime(self.end_time, '%I:%M %p').time()
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


def build_routine_extraction_prompt(user_subgroup, section_letter):
    return f"""Analyze this university class routine image carefully. The student is in Subgroup: **`{user_subgroup}`** (Parent Section: **`{section_letter}`**).

Extract ONLY the recurring classes scheduled from Sunday through Thursday that apply to this student:
1. **Theory Classes:** Extract all theory classes scheduled for Section **`{section_letter}`**.
2. **Sessional / Lab Classes:** Extract ONLY lab sessions explicitly labeled for Subgroup **`{user_subgroup}`**. If a lab is marked for a different group (e.g., B1 when user is B2), completely ignore it.
3. **Syllabus / Faculty Table Matching:** Look at the table beneath the routine grids. Match each extracted **`Course No.`** to find its corresponding **`Course Title`**, **`Credit`**, and **`Teacher's Name`**.
4. **Time Format:** Extract start and end times strictly in 12-hour AM/PM format (e.g., **`08:10 AM`**, **`01:45 PM`**, **`04:00 PM`**).
5. **Exclusions:** Exclude breaks, lunch, Class Tests (CT), exam blocks, Friday, Saturday, and empty cells.
6. **Output Format:** Return ONLY a valid, flat JSON array of objects with the following schema:

JSON
```json
[
  {{
    "day_of_week": "SUNDAY",
    "course_code": "CSE-347",
    "course_title": "Introduction to Mathematical Programming",
    "credit": "3.0",
    "teacher_name": "Annesha Das / Maisha Fahmida",
    "start_time": "09:00 AM",
    "end_time": "09:45 AM",
    "room": "3305"
  }}
]
```

Do not output markdown code blocks, backticks, or any conversational text. Return only raw JSON."""


def merge_contiguous_classes(classes):
    """Merge a single class spanning adjacent routine-table periods."""

    ordered = sorted(
        classes,
        key=lambda item: (
            DAY_ORDER[item.day_of_week],
            datetime.strptime(item.start_time, '%I:%M %p').time(),
            item.course_code,
        ),
    )
    merged = []
    for item in ordered:
        previous = merged[-1] if merged else None
        same_class = previous and (
            previous.day_of_week == item.day_of_week
            and previous.course_code.casefold() == item.course_code.casefold()
            and previous.course_title.casefold() == item.course_title.casefold()
            and previous.credit == item.credit
            and previous.teacher_name.casefold() == item.teacher_name.casefold()
            and previous.room.casefold() == item.room.casefold()
        )
        if same_class and previous.end_time == item.start_time:
            merged[-1] = previous.model_copy(update={'end_time': item.end_time})
        else:
            merged.append(item)
    return merged


def extract_schedule(image_bytes, mime_type, user_subgroup, section_letter):
    """Extract and validate a class schedule using Gemini structured output."""

    if not settings.GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY is not configured.')

    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=types.HttpOptions(
            timeout=settings.GEMINI_ROUTINE_TIMEOUT_MS,
            retry_options=types.HttpRetryOptions(
                attempts=settings.GEMINI_ROUTINE_MAX_ATTEMPTS,
                initial_delay=1,
                max_delay=4,
                exp_base=2,
                jitter=0.2,
            ),
        ),
    )
    response = client.models.generate_content(
        model=settings.GEMINI_ROUTINE_MODEL,
        contents=[
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type,
                media_resolution=types.PartMediaResolutionLevel.MEDIA_RESOLUTION_ULTRA_HIGH,
            ),
            build_routine_extraction_prompt(user_subgroup, section_letter),
        ],
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type='application/json',
            response_schema=GeminiScheduleSchema,
        ),
    )

    if response.text:
        # Validate the raw JSON with the strict application model. This catches
        # extra properties as well as invalid days, times, and empty schedules.
        validated = ExtractedSchedule.model_validate_json(response.text).root
        return merge_contiguous_classes(validated)
    raise ValueError('Gemini returned an empty routine response.')
