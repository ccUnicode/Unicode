import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createServer } from 'vite';
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => server.close());
const { exportApplicants } = await server.ssrLoadModule('/src/scripts/admin-applicant-export.ts');

test('export is a real XLSX with correct columns, text safety, Lima dates and native filtering', async () => {
  const person = { id: 'test', first_name: '=HYPERLINK("evil")', last_name: 'Castro', email: 'test@example.invalid', phone: '001234567',
    university: 'UNI', faculty: 'FIIS', career: 'Ingeniería de Sistemas', admission_term: '2024-1', university_semester: 0, availability_hours: 6,
    first_choice_area: 'ID', second_choice_area: 'GTH', evaluation_area: 'GTH', evaluation_choice: 2, status: 'selected',
    application_reason: 'Primera línea\nSegunda línea', short_case: '', showcase: 'Proyecto', organizations: 'Equipo', referral_source: 'Instagram',
    has_video: true, video_url: 'https://private.example.invalid/signed-secret', created_at: '2026-10-12T01:30:00Z' };
  const bytes = await exportApplicants([person], 'GTH', new Date('2026-10-12T02:00:00Z'));
  assert.deepEqual([...bytes.slice(0, 2)], [80, 75]);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(Buffer.from(bytes));
  const sheet = workbook.getWorksheet('Postulantes');
  assert.equal(sheet.columnCount, 22); assert.equal(sheet.rowCount, 5);
  assert.equal(sheet.getCell('D5').value, '001234567');
  assert.equal(sheet.getCell('A5').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('I5').value, 'Egresado');
  assert.equal(sheet.getCell('J5').value, 6);
  assert.equal(sheet.getCell('M5').value, 'Gestión del Talento Humano');
  assert.equal(sheet.getCell('N5').value, 'Segunda opción');
  assert.equal(sheet.getCell('O5').value, 'Seleccionado');
  assert.equal(sheet.getCell('P5').value, person.application_reason);
  const date = sheet.getCell('V5').value; assert.ok(date instanceof Date);
  assert.equal(date.toISOString(), '2026-10-11T20:30:00.000Z');
  assert.equal(sheet.getCell('U5').value.hyperlink, 'https://www.ccunicode.org/admin');
  assert.equal(sheet.autoFilter, 'A4:V5');
  assert.equal(sheet.views[0].ySplit, 4);
  assert.ok(sheet.getColumn(16).width >= 50);
});
