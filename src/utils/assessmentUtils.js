export const combineLocalDateTime = (date, time) => {
  if (!date || !time) return null;
  const value = `${date}T${time}:00`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : value;
};

export const getAssessmentDateTime = (assessment) => {
  if (assessment?.type === 'assignment') {
    return assessment.deadlineAt || combineLocalDateTime(assessment.deadlineDate, assessment.deadlineTime);
  }
  return assessment?.startAt || combineLocalDateTime(assessment?.date, assessment?.startTime);
};

export const normalizeHttpUrl = (rawUrl) => {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { error: 'Enter a URL.' };

  const explicitProtocol = trimmed.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  if (explicitProtocol && !['http', 'https'].includes(explicitProtocol)) {
    return { error: 'Only HTTP and HTTPS links are allowed.' };
  }

  const candidate = explicitProtocol ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      return { error: 'Enter a valid HTTP or HTTPS URL.' };
    }
    return { value: parsed.toString() };
  } catch {
    return { error: 'Enter a valid web address.' };
  }
};

export const formatTime = (time) => {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return time;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(2000, 0, 1, hours, minutes));
};

export const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime || endTime <= startTime) return null;
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  const totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${hours}h ${minutes}m`;
};

export const getAssignmentStatus = (assessment, now = new Date()) => {
  const deadline = getAssessmentDateTime(assessment);
  if (!deadline) return 'Deadline not set';
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) return 'Deadline not set';
  const difference = deadlineDate.getTime() - now.getTime();
  const absoluteMinutes = Math.max(1, Math.round(Math.abs(difference) / 60000));
  const days = Math.floor(absoluteMinutes / 1440);
  const hours = Math.floor((absoluteMinutes % 1440) / 60);
  const amount = days ? `${days}d${hours ? ` ${hours}h` : ''}` : hours ? `${hours}h` : `${absoluteMinutes}m`;
  return difference < 0 ? `Overdue by ${amount}` : `${amount} remaining`;
};

