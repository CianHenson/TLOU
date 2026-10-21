import { Controller, Get, NotFoundException, Param, ParseIntPipe, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { actorOf, AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import { DocumentsRepository } from '../data/repositories';
import { sendStored } from './uploads';

// Booking documents are served only through this authenticated route (and every download is audited).
// Expense receipts: GET /api/expenses/:id/receipt.
@Controller('files')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private documents: DocumentsRepository, private biz: BizService) {}

  @Get('doc/:id')
  doc(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request, @Res() res: Response) {
    const d = this.documents.findById(id);
    if (!d) throw new NotFoundException();
    this.biz.audit(actorOf(user), 'document.download', 'booking', d.booking_id, d.original, req.ip ?? null);
    return sendStored(res, d.stored, d.original);
  }
}
