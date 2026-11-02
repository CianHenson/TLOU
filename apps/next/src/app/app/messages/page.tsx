import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat, paginate, where } from '@/lib/list';
import { str } from '@/lib/util';
import { Page, Pager } from '@/components/ui';
import { TableFilters } from '@/components/list-filters';
import { MessagesTable, type MessageRow } from '@/components/messages-table';

export const metadata = { title: 'Messages' };

/** Owner / admin: the messages visitors send from the landing page's contact form. */
export default async function Messages(props: PageProps<'/app/messages'>) {
  await requireUser('messages');
  const q = flat(await props.searchParams);
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR body LIKE ?)', l, l, l, l); }
  if (q.status === 'new') w.add('handled=0');
  if (q.status === 'handled') w.add('handled=1');
  const list = await paginate(q, `SELECT * FROM messages ${w.sql} ORDER BY handled ASC, id DESC`, w.p, 25);
  return (
    <Page title="Messages">
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search name, email, phone or message" dropdowns={[
          { key: 'status', label: 'Status', value: q.status || '', options: [['', 'All messages'], ['new', 'New'], ['handled', 'Handled']] },
        ]} />
        <MessagesTable rows={list.rows as MessageRow[]} total={list.total} />
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
