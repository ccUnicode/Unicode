import type { APIRoute } from 'astro';
import { signOutCmsUser } from '../../../../lib/cms/auth';
import { cmsResponse } from '../../../../lib/cms/client';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  await signOutCmsUser(cookies);
  return cmsResponse({ message: 'Sesión finalizada correctamente.' }, 200);
};
