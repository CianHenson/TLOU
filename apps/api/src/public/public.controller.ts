import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { GROUPS, parseDetails } from '../common/forms';
import { invalid } from '../common/http';
import { pad, rand, str, today, now } from '../common/util';
import { BizService } from '../data/biz.service';
import {
  CustomersRepository, MessagesRepository, RequestLogRepository, RequestsRepository, ServicesRepository,
} from '../data/repositories';
import { CONTACT_METHODS, SERVICE_TYPES } from '../entities';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LIMIT = { default: { limit: 15, ttl: 15 * 60_000 } };

@Controller('public')
export class PublicController {
  constructor(
    private biz: BizService,
    private services: ServicesRepository,
    private customers: CustomersRepository,
    private requests: RequestsRepository,
    private logs: RequestLogRepository,
    private messages: MessagesRepository,
  ) {}

  @Get('site')
  site() {
    return { settings: this.biz.settings(), services: this.services.find((s) => s.active === 1).sort((a, b) => a.sort - b.sort || a.id - b.id) };
  }

  // Field definitions for the dynamic request form (the React form renders from this).
  @Get('form-schema')
  formSchema() {
    return { groups: GROUPS, serviceTypes: SERVICE_TYPES, contactMethods: CONTACT_METHODS };
  }

  @Post('contact')
  @Throttle(LIMIT)
  contact(@Body() b: Record<string, any>) {
    if (b.website) return { ok: true }; // honeypot
    const v = { name: str(b.name, 120), email: str(b.email, 160), phone: str(b.phone, 40), body: str(b.body, 3000) };
    const errors: Record<string, string> = {};
    if (!v.name) errors.name = 'Required.';
    if (!EMAIL.test(v.email)) errors.email = 'Enter a valid email.';
    if (!v.body) errors.body = 'Required.';
    if (b.consent !== true && b.consent !== 'on') errors.consent = 'Please accept the privacy notice.';
    if (Object.keys(errors).length) throw invalid(errors);
    this.messages.create({ ...v, at: now(), handled: 0 });
    return { ok: true };
  }

  @Post('requests')
  @Throttle(LIMIT)
  submit(@Body() b: Record<string, any>, @Req() req: Request) {
    if (b.website) return { ref: '' }; // honeypot
    const errors: Record<string, string> = {};
    const name = str(b.name, 120);
    const phone = str(b.phone, 40);
    const email = str(b.email, 160).toLowerCase();
    const pref = String(b.pref_contact ?? '');
    if (!name) errors.name = 'Required.';
    if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) errors.phone = 'Enter a valid contact number.';
    if (!EMAIL.test(email)) errors.email = 'Enter a valid email address.';
    if (!CONTACT_METHODS.includes(pref)) errors.pref_contact = 'Choose a contact method.';
    if (!SERVICE_TYPES.includes(b.service_type)) errors.service_type = 'Choose a service.';
    if (b.consent !== true && b.consent !== 'on') errors.consent = 'You must agree to the privacy notice.';
    const parsed = SERVICE_TYPES.includes(b.service_type) ? parseDetails(b.service_type, b) : { details: {}, errors: {} };
    Object.assign(errors, parsed.errors);
    if (Object.keys(errors).length) throw invalid(errors);

    let customer = this.customers.findOne((c) => c.email.toLowerCase() === email);
    if (!customer) {
      const id = this.customers.nextId();
      customer = this.customers.create({ code: 'CUST-' + pad(id), name, phone, email, pref_contact: pref, notes: '', created_at: now() });
    }
    let ref: string;
    do { ref = `TR-${today().replace(/-/g, '')}-${rand(4)}`; } while (this.requests.findOne((r) => r.ref === ref));
    const r = this.requests.create({
      ref, customer_id: customer.id, service_type: b.service_type, source: 'Website', status: 'Pending Review', assigned_to: null,
      details: JSON.stringify({ ...parsed.details, contact_method: pref, contact_phone: phone }), created_at: now(),
    });
    this.logs.create({ request_id: r.id, from_status: null, to_status: 'Pending Review', note: 'Submitted via website', user_id: null, at: now() });
    this.biz.audit(null, 'request.submit', 'request', r.id, ref, req.ip ?? null);
    return { ref };
  }
}
