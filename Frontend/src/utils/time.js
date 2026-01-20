// Utility to format durations (seconds) into human-friendly strings
export function formatDuration(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return 'N/A';
  const seconds = Number(totalSeconds) || 0;
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remSeconds = seconds % 60;

  const parts = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  if (!hours && remSeconds) parts.push(`${remSeconds} second${remSeconds === 1 ? '' : 's'}`);

  return parts.join(' ');
}

export default formatDuration;
