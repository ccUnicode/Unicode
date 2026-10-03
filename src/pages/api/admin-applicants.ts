/**
 * API Endpoint: GET /api/admin-applicants
 * Returns the submitted recruitment applications in the shape the /admin panel uses.
 * Requires a valid session token in the Authorization header.
 */

export const prerender = false;

import { managesRecruitment, sessionStore } from '../../lib/session-store';
import { adminApplications } from '../../lib/recruitment/service';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/**
 * GET handler: submitted, non-test applications filtered by area and choice, newest first.
 *
 * @async
 * @param {Object} context - Request context containing the request object.
 * @param {Request} context.request - The API request object.
 * @returns {Promise<Response>} API Response with applicants dataset.
 */
export async function GET({ request }: { request: Request }) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
  const session = await sessionStore.verify(token);
  if (!session) return json({ error: 'No autorizado. Inicia sesión nuevamente.' }, 401);

  const url = new URL(request.url);
  // Directors outside GTH only ever see their own area, whatever the request asks for.
  const area = managesRecruitment(session) ? url.searchParams.get('area') || '' : session.role === 'director' ? session.area : '';
  const option = url.searchParams.get('option') || 'all'; // 'all', 'first', 'second'
  const order = url.searchParams.get('order') || 'recent'; // 'recent', 'priority'

  try {
    const { applications = [] } = await adminApplications();
    let data = applications
      .filter((application) => application.submittedAt && !application.isTest)
      .map((application) => {
        const d = application.data;
        return {
          id: application.id, status: application.status,
          first_name: d.firstName, last_name: d.lastName, email: d.email, phone: d.phone,
          university: d.university, faculty: d.faculty, career: d.career, admission_term: d.admissionTerm,
          university_semester: d.semester, availability_hours: d.availabilityHours,
          first_choice_area: d.firstChoiceArea, second_choice_area: d.secondChoiceArea || null,
          application_reason: d.motivation, short_case: d.shortCase,
          questions: application.questions.map((question) => question.text),
          video_url: application.video?.provider === 'drive' ? `https://drive.google.com/file/d/${application.video.fileId}/view` : null,
          has_video: Boolean(application.video),
          created_at: application.submittedAt,
        };
      });

    if (area) {
      data = data.filter((p) => option === 'first' ? p.first_choice_area === area
        : option === 'second' ? p.second_choice_area === area
        : p.first_choice_area === area || p.second_choice_area === area);
    }
    data.sort((a, b) => {
      if (area && order === 'priority') {
        const aFirst = a.first_choice_area === area; const bFirst = b.first_choice_area === area;
        if (aFirst !== bFirst) return aFirst ? -1 : 1;
      }
      return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime();
    });
    return json({ data, total: data.length });
  } catch {
    return json({ error: 'No se pudieron obtener las postulaciones.' }, 500);
  }
}
