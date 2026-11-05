/**
 * One CSV cell. Quotes values containing separators, quotes or line breaks,
 * and prefixes values a spreadsheet would run as a formula (leading = + - @,
 * tab or carriage return) with an apostrophe, so text typed into a note or
 * property name can't execute when the export is opened in Excel or Sheets.
 */
export function csvEscape(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}
