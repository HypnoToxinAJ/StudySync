"""
Google Calendar & Drive integration for StudySync assessments.

Uses the Google REST API directly (matching the existing codebase pattern
in GoogleCalendarSyncView) rather than the heavyweight google-api-python-client.
"""

from datetime import datetime, timedelta
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Custom exception hierarchy
# ---------------------------------------------------------------------------


class GoogleAPIError(Exception):
    """Base exception for all Google API integration errors."""

    def __init__(self, message, status_code=None, detail=None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


class GoogleTokenExpiredError(GoogleAPIError):
    """The Google access token has expired or been revoked."""
    pass


class GooglePermissionDeniedError(GoogleAPIError):
    """The user has not granted the required Google scope."""
    pass


class GoogleQuotaError(GoogleAPIError):
    """The Google API rate limit or quota has been exceeded."""
    pass


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _google_request(url, method='GET', data=None, access_token=None, content_type='application/json'):
    """Make an authenticated request to a Google REST API endpoint."""
    headers = {}
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    if content_type:
        headers['Content-Type'] = content_type
    headers['Accept'] = 'application/json'

    body = None
    if data is not None:
        if isinstance(data, (dict, list)):
            body = json.dumps(data).encode('utf-8')
        elif isinstance(data, bytes):
            body = data
        else:
            body = str(data).encode('utf-8')

    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            response_body = resp.read().decode('utf-8', errors='ignore')
            if response_body:
                return json.loads(response_body)
            return {}
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='ignore') if exc.fp else ''
        _raise_typed_error(exc.code, error_body)
    except urllib.error.URLError as exc:
        raise GoogleAPIError(f'Network error contacting Google API: {exc.reason}') from exc


def _raise_typed_error(status_code, error_body):
    """Translate an HTTP error code into the appropriate exception type."""
    detail = ''
    try:
        parsed = json.loads(error_body)
        detail = parsed.get('error', {}).get('message', error_body[:500])
    except (json.JSONDecodeError, AttributeError):
        detail = error_body[:500]

    if status_code == 401:
        raise GoogleTokenExpiredError(
            'Your Google session has expired. Please sign in with Google again.',
            status_code=401,
            detail=detail,
        )
    if status_code == 403:
        raise GooglePermissionDeniedError(
            'Google permission denied. Please grant Calendar and Drive access.',
            status_code=403,
            detail=detail,
        )
    if status_code == 429:
        raise GoogleQuotaError(
            'Google API rate limit exceeded. Please try again in a moment.',
            status_code=429,
            detail=detail,
        )
    raise GoogleAPIError(
        f'Google API error (HTTP {status_code}): {detail}',
        status_code=status_code,
        detail=detail,
    )


def _multipart_upload(url, file_metadata, file_bytes, mime_type, access_token):
    """Perform a multipart upload to Google Drive."""
    boundary = '===StudySyncBoundary==='
    body_parts = []

    # Part 1: JSON metadata
    body_parts.append(f'--{boundary}\r\n'.encode())
    body_parts.append(b'Content-Type: application/json; charset=UTF-8\r\n\r\n')
    body_parts.append(json.dumps(file_metadata).encode('utf-8'))
    body_parts.append(b'\r\n')

    # Part 2: File content
    body_parts.append(f'--{boundary}\r\n'.encode())
    body_parts.append(f'Content-Type: {mime_type}\r\n\r\n'.encode())
    body_parts.append(file_bytes)
    body_parts.append(b'\r\n')

    body_parts.append(f'--{boundary}--\r\n'.encode())
    body = b''.join(body_parts)

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': f'multipart/related; boundary={boundary}',
            'Accept': 'application/json',
        },
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode('utf-8', errors='ignore'))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='ignore') if exc.fp else ''
        _raise_typed_error(exc.code, error_body)
    except urllib.error.URLError as exc:
        raise GoogleAPIError(f'Network error during file upload: {exc.reason}') from exc


# ---------------------------------------------------------------------------
# Reminder helpers
# ---------------------------------------------------------------------------

_REMINDER_MINUTES_MAP = {
    'none': None,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '6h': 360,
    '12h': 720,
    '24h': 1440,
    '48h': 2880,
    '1w': 10080,
}


def _reminder_minutes(reminder_time):
    """Convert a StudySync reminder string to minutes for Google Calendar."""
    return _REMINDER_MINUTES_MAP.get(str(reminder_time or '').strip().lower(), 1440)


# ---------------------------------------------------------------------------
# Calendar API
# ---------------------------------------------------------------------------

CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'


def _build_event_title(assessment):
    """Generate a dynamic Calendar event title from assessment data."""
    title = assessment.title or ''
    course_code = assessment.course_code or ''
    course_title = assessment.course_title or ''

    parts = [p for p in [title, course_code, course_title] if p]
    if len(parts) >= 2:
        return ' — '.join(parts)
    return parts[0] if parts else 'StudySync Assessment'


def _build_event_description(assessment):
    """Build the event description from assessment fields."""
    lines = []
    lines.append('📚 StudySync Assessment')
    lines.append('')

    if assessment.assessment_type:
        type_label = dict(assessment.AssessmentType.choices if hasattr(assessment, 'AssessmentType') else {}).get(
            assessment.assessment_type, assessment.assessment_type
        )
        lines.append(f'Type: {type_label}')

    if assessment.course_code:
        lines.append(f'Course: {assessment.course_title} ({assessment.course_code})')

    if assessment.syllabus:
        lines.append(f'\nSyllabus:\n{assessment.syllabus}')

    if assessment.notes:
        lines.append(f'\nNotes:\n{assessment.notes}')

    if assessment.marks is not None:
        lines.append(f'\nTotal Marks: {assessment.marks}')

    if assessment.priority:
        lines.append(f'Priority: {assessment.priority.capitalize()}')

    # Include related links in description
    if hasattr(assessment, 'links'):
        links = assessment.links.all()
        if links:
            lines.append('\nRelated Links:')
            for link in links:
                lines.append(f'  • {link.label}: {link.url}')

    return '\n'.join(lines)


def _build_event_payload(assessment):
    """Build the Google Calendar event JSON payload."""
    title = _build_event_title(assessment)
    description = _build_event_description(assessment)
    timezone = 'Asia/Dhaka'

    payload = {
        'summary': title,
        'description': description,
    }

    # Determine start/end from assessment type
    is_assignment = assessment.assessment_type == 'assignment'

    if is_assignment:
        # Assignment — use deadline date & time
        if assessment.deadline_date:
            d_time_str = '23:59:00'
            if assessment.deadline_time:
                d_time_str = (
                    assessment.deadline_time.strftime('%H:%M:%S')
                    if hasattr(assessment.deadline_time, 'strftime')
                    else str(assessment.deadline_time)
                )
            d_time_clean = d_time_str if len(d_time_str) == 8 else f'{d_time_str[:5]}:00'
            try:
                dt_start = datetime.strptime(f'{assessment.deadline_date} {d_time_clean}', '%Y-%m-%d %H:%M:%S')
                dt_end = dt_start + timedelta(minutes=30)
                payload['start'] = {
                    'dateTime': dt_start.strftime('%Y-%m-%dT%H:%M:%S+06:00'),
                    'timeZone': timezone,
                }
                payload['end'] = {
                    'dateTime': dt_end.strftime('%Y-%m-%dT%H:%M:%S+06:00'),
                    'timeZone': timezone,
                }
            except Exception:
                payload['start'] = {'dateTime': f'{assessment.deadline_date}T{d_time_clean}+06:00', 'timeZone': timezone}
                payload['end'] = {'dateTime': f'{assessment.deadline_date}T23:59:59+06:00', 'timeZone': timezone}
    else:
        # CT / Examination — use date + start/end time (defaults to 1 hour if end_time missing)
        if assessment.date and assessment.start_time:
            s_time_str = (
                assessment.start_time.strftime('%H:%M:%S')
                if hasattr(assessment.start_time, 'strftime')
                else str(assessment.start_time)
            )
            s_time_clean = s_time_str if len(s_time_str) == 8 else f'{s_time_str[:5]}:00'

            if assessment.end_time:
                e_time_str = (
                    assessment.end_time.strftime('%H:%M:%S')
                    if hasattr(assessment.end_time, 'strftime')
                    else str(assessment.end_time)
                )
                e_time_clean = e_time_str if len(e_time_str) == 8 else f'{e_time_str[:5]}:00'
            else:
                try:
                    dt_start = datetime.strptime(f'{assessment.date} {s_time_clean}', '%Y-%m-%d %H:%M:%S')
                    dt_end = dt_start + timedelta(hours=1)
                    e_time_clean = dt_end.strftime('%H:%M:%S')
                except Exception:
                    e_time_clean = s_time_clean

            payload['start'] = {
                'dateTime': f'{assessment.date}T{s_time_clean}+06:00',
                'timeZone': timezone,
            }
            payload['end'] = {
                'dateTime': f'{assessment.date}T{e_time_clean}+06:00',
                'timeZone': timezone,
            }

    # Reminders
    minutes = _reminder_minutes(assessment.reminder_time)
    if minutes is not None:
        payload['reminders'] = {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': minutes},
            ],
        }
    else:
        payload['reminders'] = {'useDefault': False, 'overrides': []}

    return payload


def create_calendar_event(access_token, assessment):
    """
    Create a Google Calendar event for the given assessment.
    Returns (event_id, event_html_link).
    """
    payload = _build_event_payload(assessment)

    if 'start' not in payload:
        logger.info('Skipping Calendar event creation: no date/time set on assessment %s', assessment.pk)
        return None, None

    result = _google_request(CALENDAR_BASE, method='POST', data=payload, access_token=access_token)
    event_id = result.get('id', '')
    event_url = result.get('htmlLink', '')
    logger.info('Created Calendar event %s for assessment %s', event_id, assessment.pk)
    return event_id, event_url


def update_calendar_event(access_token, event_id, assessment):
    """
    Update an existing Google Calendar event.
    Returns (event_id, event_html_link).
    """
    payload = _build_event_payload(assessment)
    url = f'{CALENDAR_BASE}/{urllib.parse.quote(event_id)}'

    result = _google_request(url, method='PUT', data=payload, access_token=access_token)
    updated_url = result.get('htmlLink', '')
    logger.info('Updated Calendar event %s for assessment %s', event_id, assessment.pk)
    return event_id, updated_url


def delete_calendar_event(access_token, event_id):
    """Delete a Google Calendar event. Silently succeeds if already deleted."""
    url = f'{CALENDAR_BASE}/{urllib.parse.quote(event_id)}'
    try:
        _google_request(url, method='DELETE', access_token=access_token)
        logger.info('Deleted Calendar event %s', event_id)
    except GoogleAPIError as exc:
        if exc.status_code == 404 or exc.status_code == 410:
            logger.info('Calendar event %s already deleted.', event_id)
        else:
            raise


# ---------------------------------------------------------------------------
# Drive API
# ---------------------------------------------------------------------------

DRIVE_FILES_BASE = 'https://www.googleapis.com/drive/v3/files'
DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files'


def _find_or_create_folder(access_token, folder_name, parent_id=None):
    """Find an existing folder by name (and parent), or create one."""
    query_parts = [
        f"name = '{folder_name}'",
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
    ]
    if parent_id:
        query_parts.append(f"'{parent_id}' in parents")
    query = ' and '.join(query_parts)

    search_url = f'{DRIVE_FILES_BASE}?q={urllib.parse.quote(query)}&fields=files(id,name)&pageSize=1'
    result = _google_request(search_url, method='GET', access_token=access_token)
    files = result.get('files', [])
    if files:
        return files[0]['id']

    # Create the folder
    metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder',
    }
    if parent_id:
        metadata['parents'] = [parent_id]

    created = _google_request(DRIVE_FILES_BASE, method='POST', data=metadata, access_token=access_token)
    logger.info('Created Drive folder "%s" (id=%s)', folder_name, created.get('id'))
    return created['id']


def _ensure_folder_structure(access_token, course_code):
    """
    Create or find the folder hierarchy:
      My Drive / StudySync / Assessments / {course_code}
    Returns the course_code folder ID.
    """
    root_id = _find_or_create_folder(access_token, 'StudySync')
    assessments_id = _find_or_create_folder(access_token, 'Assessments', parent_id=root_id)
    course_folder_id = _find_or_create_folder(access_token, course_code, parent_id=assessments_id)
    return course_folder_id


def upload_to_drive(access_token, file_bytes, file_name, mime_type, course_code):
    """
    Upload a file to the user's Google Drive under:
      StudySync / Assessments / {course_code} /
    Returns (file_id, web_view_link).
    """
    folder_id = _ensure_folder_structure(access_token, course_code or 'General')

    file_metadata = {
        'name': file_name,
        'parents': [folder_id],
    }

    upload_url = f'{DRIVE_UPLOAD_BASE}?uploadType=multipart&fields=id,webViewLink,name'
    result = _multipart_upload(upload_url, file_metadata, file_bytes, mime_type, access_token)

    file_id = result.get('id', '')
    file_url = result.get('webViewLink', '')
    logger.info('Uploaded file "%s" to Drive (id=%s)', file_name, file_id)
    return file_id, file_url


def delete_drive_file(access_token, file_id):
    """Delete a file from Google Drive. Silently succeeds if already deleted."""
    url = f'{DRIVE_FILES_BASE}/{urllib.parse.quote(file_id)}'
    try:
        _google_request(url, method='DELETE', access_token=access_token)
        logger.info('Deleted Drive file %s', file_id)
    except GoogleAPIError as exc:
        if exc.status_code == 404:
            logger.info('Drive file %s already deleted.', file_id)
        else:
            raise


def get_token_scopes(access_token):
    """
    Inspect a Google OAuth access token using Google's tokeninfo endpoint.
    Returns:
      {
        'valid': bool,
        'has_calendar': bool,
        'has_drive': bool,
        'scopes': list[str],
        'email': str,
        'error': str,
      }
    """
    if not access_token:
        return {
            'valid': False,
            'has_calendar': False,
            'has_drive': False,
            'scopes': [],
            'email': '',
            'error': 'No access token provided',
        }

    url = f'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token={urllib.parse.quote(access_token)}'
    req = urllib.request.Request(url, headers={'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8', errors='ignore'))
            scopes_str = data.get('scope', '')
            scopes = scopes_str.split()
            has_calendar = any('calendar' in s for s in scopes)
            has_drive = any('drive' in s for s in scopes)
            return {
                'valid': True,
                'has_calendar': has_calendar,
                'has_drive': has_drive,
                'scopes': scopes,
                'email': data.get('email', ''),
                'error': '',
            }
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode('utf-8', errors='ignore') if exc.fp else ''
        logger.warning('Google tokeninfo inspection failed (%s): %s', exc.code, err_body)
        return {
            'valid': False,
            'has_calendar': False,
            'has_drive': False,
            'scopes': [],
            'email': '',
            'error': 'Token expired or invalid',
        }
    except Exception as exc:
        logger.warning('Network error inspecting Google token: %s', exc)
        return {
            'valid': False,
            'has_calendar': False,
            'has_drive': False,
            'scopes': [],
            'email': '',
            'error': str(exc),
        }

