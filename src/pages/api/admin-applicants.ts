/**
 * API Endpoint: GET /api/admin-applicants
 * Returns the submitted recruitment applications in the shape the /admin panel uses.
 * Requires a valid session token in the Authorization header.
 */

export const prerender = false;

import { directorArea, sessionStore } from '../../lib/session-store';
import { demoApplications } from '../../lib/recruitment/demo';
import { adminConfig } from '../../lib/recruitment/service';
import { adminApplications } from '../../lib/recruitment/service';
import { compareApplicationOrder } from '../../lib/recruitment-application-order';
import { orderVideoQuestions } from '../../lib/recruitment-question-order';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/**
 * GET handler: submitted, non-test applications filtered by area and choice; first choice, then arrival.
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
  const requestedArea = url.searchParams.get('area') || '';
  const scope = directorArea(session);
  if (scope && requestedArea && requestedArea !== scope) return json({ error: 'Solo puedes consultar postulantes de tu área.' }, 403);
  const area = scope || requestedArea;
  const option = url.searchParams.get('option') || 'all'; // 'all', 'first', 'second'
  const order = url.searchParams.get('order') || 'arrival'; // First choice always leads.

  try {
    const { applications = [] } = session.role === 'demo' ? demoApplications((await adminConfig()).config) : await adminApplications();
    let data = applications
      .filter((application) => application.submittedAt && !application.isTest)
      .map((application) => {
        const d = application.data;
        return {
          id: application.id, status: application.status, evaluation_choice: application.evaluationChoice || 1,
          evaluation_area: application.evaluationArea || (application.evaluationChoice === 2 ? d.secondChoiceArea : d.firstChoiceArea),
          first_name: d.firstName, last_name: d.lastName, email: d.email, phone: d.phone,
          university: d.university, faculty: d.faculty, career: d.career, admission_term: d.admissionTerm,
          university_semester: d.semester, availability_hours: d.availabilityHours,
          first_choice_area: d.firstChoiceArea, second_choice_area: d.secondChoiceArea || null,
          application_reason: d.motivation, short_case: d.shortCase,
          showcase: d.showcase || '', organizations: d.organizations || '', referral_source: d.referralSource || '',
          questions: orderVideoQuestions(application.questions).map((question) => question.text),
          video_url: application.video?.provider === 'drive' ? `https://drive.google.com/file/d/${application.video.fileId}/view` : null,
          has_video: Boolean(application.video),
          created_at: application.submittedAt,
        };
      });

    if (area) {
      data = data.filter((p) => p.evaluation_area === area && (option === 'first' ? p.evaluation_choice === 1
        : option === 'second' ? p.evaluation_choice === 2 : true));
    }
    data.sort((a, b) => compareApplicationOrder(
      { id: a.id, firstChoiceArea: a.first_choice_area, arrivedAt: a.created_at! },
      { id: b.id, firstChoiceArea: b.first_choice_area, arrivedAt: b.created_at! },
      area, order === 'recent',
    ));
    return json({ data, total: data.length });
  } catch {
    return json({ error: 'No se pudieron obtener las postulaciones.' }, 500);
  }
}
