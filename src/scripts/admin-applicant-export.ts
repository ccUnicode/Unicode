import ExcelJS from 'exceljs';
import type { Applicant } from './admin-applicant-view';
import { AREA_NAMES } from '../lib/recruitment/types';

const labels: Record<string, string> = {
  submitted: 'Inscripción completa', profile_validated: 'Avanza de etapa', profile_rejected: 'No avanza',
  selected: 'Seleccionado', not_selected: 'No seleccionado', draft: 'Borrador', incomplete: 'Incompleto', expired: 'Plazo vencido',
  withdrawn: 'Retirado', test_sent: 'Prueba enviada', test_completed: 'Prueba completada', awaiting_second_review: 'Pendiente de revisión',
  interview_eligible: 'Habilitado para entrevista', interview_ineligible: 'No habilitado para entrevista', interview_scheduled: 'Entrevista programada',
  interviewed: 'Entrevista realizada', group_eligible: 'Habilitado para dinámica', group_scheduled: 'Dinámica programada', group_completed: 'Dinámica completada',
  conditional_selected: 'Selección condicionada', waitlisted: 'Lista de espera', onboarding_sent: 'Inducción enviada', buddy_assigned: 'Buddy asignado', integrated: 'Integrado', discarded: 'Descartado',
};
const areaName = (value?: string | null) => value ? AREA_NAMES[value] || value : 'Sin segunda opción';
// Excel has no timezone: write the actual Lima wall-clock as a date value, not the machine's timezone.
const limaDate = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value) - 5 * 60 * 60 * 1000) : null;

export async function exportApplicants(applicants: Applicant[], area: string, now = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UNICODE'; workbook.created = now; workbook.modified = now;
  const sheet = workbook.addWorksheet('Postulantes', { views: [{ state: 'frozen', xSplit: 2, ySplit: 4, showGridLines: false }] });
  const headers = ['Nombres', 'Apellidos', 'Correo', 'Teléfono', 'Universidad', 'Facultad', 'Carrera', 'Ingreso', 'Ciclo', 'Horas por semana',
    'Primera opción', 'Segunda opción', 'Área que evalúa', 'Opción en evaluación', 'Estado', 'Motivación', 'Caso breve', 'Algo que hizo', 'Otras organizaciones', 'Cómo conoció UNICODE', 'Video', 'Envío (hora de Lima)'];
  const widths = [22, 24, 36, 18, 26, 26, 35, 14, 14, 18, 32, 32, 32, 22, 26, 60, 60, 60, 48, 30, 22, 25];
  sheet.columns = widths.map(width => ({ width }));
  sheet.mergeCells(1, 1, 1, headers.length);
  sheet.getCell('A1').value = 'UNICODE · Postulantes';
  sheet.getCell('A1').font = { name: 'Calibri', size: 19, bold: true, color: { argb: 'FF75D32D' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  sheet.getRow(1).height = 38;
  sheet.mergeCells(2, 1, 2, headers.length);
  sheet.getCell('A2').value = `${areaName(area)} · ${applicants.length} postulantes · Exportado ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(now)} · Se incluyen los filtros de pantalla`;
  sheet.getCell('A2').font = { name: 'Calibri', size: 11, color: { argb: 'FF666666' } };
  sheet.getRow(2).height = 24;
  sheet.getRow(4).values = headers;
  sheet.getRow(4).height = 32;
  sheet.getRow(4).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF75D32D' } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF111111' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  applicants.forEach((p, index) => {
    // All applicant strings remain text, including strings starting with =,+,- or @.
    const row = sheet.addRow([p.first_name, p.last_name, p.email, String(p.phone || ''), p.university, p.faculty, p.career,
      String(p.admission_term || ''), p.university_semester === 0 || p.university_semester === '0' ? 'Egresado' : String(p.university_semester || ''),
      p.availability_hours, areaName(p.first_choice_area), areaName(p.second_choice_area), areaName(p.evaluation_area || p.first_choice_area),
      p.evaluation_choice === 2 ? 'Segunda opción' : 'Primera opción', labels[p.status || ''] || p.status || '',
      p.application_reason || '', p.short_case || '', p.showcase || '', p.organizations || '', p.referral_source || '',
      p.has_video ? 'Disponible en el panel' : 'Sin video', limaDate(p.created_at)]);
    row.height = 72;
    row.eachCell({ includeEmpty: true }, cell => {
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF27272A' } };
      cell.alignment = { vertical: 'top', wrapText: true };
      if (index % 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7F1' } };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFE4E4E7' } } };
    });
    row.getCell(4).numFmt = '@'; row.getCell(8).numFmt = '@'; row.getCell(22).numFmt = 'dd/mm/yyyy hh:mm';
    // Link to the authenticated panel, rather than exporting private storage capabilities.
    if (p.has_video) row.getCell(21).value = { text: 'Abrir panel de UNICODE', hyperlink: 'https://www.ccunicode.org/admin' };
    if (p.status === 'selected') row.getCell(15).font = { bold: true, color: { argb: 'FF166534' } };
    if (p.status === 'not_selected' || p.status === 'profile_rejected') row.getCell(15).font = { color: { argb: 'FF9F1239' } };
  });
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, applicants.length + 4), column: headers.length } };
  sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:4' };
  const buffer = await workbook.xlsx.writeBuffer() as unknown as ArrayBuffer | Uint8Array;
  return buffer instanceof Uint8Array ? Uint8Array.from(buffer) : new Uint8Array(buffer);
}
