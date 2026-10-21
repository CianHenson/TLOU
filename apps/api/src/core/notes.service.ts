import { Injectable } from '@nestjs/common';
import { Note } from '../entities';
import { now } from '../common/util';
import { NotesRepository, UsersRepository } from '../data/repositories';

@Injectable()
export class NotesService {
  constructor(private notes: NotesRepository, private users: UsersRepository) {}

  /** Internal notes of one record, newest first, with the author's name. */
  forEntity(entity: Note['entity'], entityId: number) {
    return this.notes.find((n) => n.entity === entity && n.entity_id === entityId)
      .sort((a, b) => b.id - a.id)
      .map((n) => ({ ...n, author: this.users.findById(n.user_id)?.name ?? null }));
  }

  add(entity: Note['entity'], entityId: number, body: string, userId: number) {
    return this.notes.create({ entity, entity_id: entityId, body, user_id: userId, at: now() });
  }
}
