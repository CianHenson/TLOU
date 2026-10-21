import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { invalid } from '../common/http';
import { str } from '../common/util';
import { actorOf, AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import { MessagesRepository, SettingsRepository } from '../data/repositories';

const CONTENT_KEYS = ['business_name', 'tagline', 'location', 'phone', 'mobile', 'email', 'address', 'hours', 'facebook', 'facebook_name', 'instagram', 'about', 'mission', 'vision', 'values', 'fares_title', 'fares_note', 'fares', 'partners', 'why', 'privacy'];
const LONG_KEYS = ['privacy', 'about', 'fares', 'why', 'fares_note', 'partners', 'mission', 'vision'];
const SYSTEM_KEYS = ['retention_years'];

@Controller()
@UseGuards(AuthGuard)
@Roles('owner')
export class SettingsController {
  constructor(private settings: SettingsRepository, private messages: MessagesRepository, private biz: BizService) {}

  private pick(keys: string[]) {
    const all = this.settings.all();
    return Object.fromEntries(keys.map((k) => [k, all[k] ?? '']));
  }

  // Website Content: business details and public-site text.
  @Get('settings/content')
  content() {
    return { keys: CONTENT_KEYS, longKeys: LONG_KEYS, values: this.pick(CONTENT_KEYS) };
  }

  // System Settings: system keys plus the contact-message inbox (last 20, newest first).
  @Get('settings/system')
  system() {
    return {
      keys: SYSTEM_KEYS, longKeys: LONG_KEYS, values: this.pick(SYSTEM_KEYS),
      messages: this.messages.findAll().sort((a, b) => b.id - a.id).slice(0, 20),
      storage: 'memory',
    };
  }

  // Save one group of settings. Only keys of that group and only keys present in the body are written.
  @Put('settings')
  save(@Body() b: { mode?: string; values?: Record<string, unknown> }, @CurrentUser() user: AuthUser, @Req() req: Request) {
    if (b.mode !== 'content' && b.mode !== 'system') throw invalid({}, 'Unknown settings group.');
    const allowed = b.mode === 'content' ? CONTENT_KEYS : SYSTEM_KEYS;
    const values = b.values ?? {};
    const written = allowed.filter((k) => k in values);
    for (const k of written) this.settings.set(k, str(values[k], LONG_KEYS.includes(k) ? 6000 : 400));
    this.biz.audit(actorOf(user), 'settings.update', 'settings', b.mode, written, req.ip ?? null);
    return { ok: true, values: this.pick(allowed) };
  }

  @Post('messages/:id/handled')
  handled(@Param('id', ParseIntPipe) id: number) {
    if (!this.messages.update(id, { handled: 1 })) throw new NotFoundException();
    return { ok: true };
  }
}
