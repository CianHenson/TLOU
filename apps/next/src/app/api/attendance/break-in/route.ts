import { api } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { clockStep } from '@/lib/queries/clock';

export const POST = api(async (req) => clockStep(req, await apiUser(), 'break_in'));
