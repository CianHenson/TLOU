// Clickable contact rows with icons (WhatsApp, email, phone, Facebook, location), used in the contact section and the footer.
import type { ReactNode } from 'react';
import type { Settings } from '@/lib/biz';

const isUrl = (s: string) => /^https?:\/\//.test(s);
/** "0951 672 3814" -> "639516723814" for wa.me links (Philippine numbers). */
const waNumber = (s: string) => {
  const d = String(s).replace(/\D/g, '');
  return d.startsWith('0') ? '63' + d.slice(1) : d;
};

const Filled = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d={d} /></svg>;
const Stroked = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const WHATSAPP = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const FACEBOOK = 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z';

export const mapUrl = (S: Settings) => (isUrl(S.map_url || '') ? S.map_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address)}`);

interface Item { key: string; label: string; text: string; href?: string; icon: ReactNode }

export function contactItems(S: Settings): Item[] {
  const items: Item[] = [];
  if (S.mobile) items.push({ key: 'whatsapp', label: 'WhatsApp', text: S.mobile, href: `https://wa.me/${waNumber(S.mobile)}`, icon: <Filled d={WHATSAPP} /> });
  if (S.email) items.push({ key: 'email', label: 'Email', text: S.email, href: `mailto:${S.email}`, icon: <Stroked><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></Stroked> });
  if (S.phone) items.push({ key: 'phone', label: 'Phone', text: S.phone, href: `tel:${S.phone.replace(/[^\d+]/g, '')}`, icon: <Stroked><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Stroked> });
  if (S.facebook_name || isUrl(S.facebook)) items.push({ key: 'facebook', label: 'Facebook', text: S.facebook_name || S.facebook, href: isUrl(S.facebook) ? S.facebook : undefined, icon: <Filled d={FACEBOOK} /> });
  if (S.address) items.push({ key: 'address', label: 'Location', text: S.address, href: mapUrl(S), icon: <Stroked><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Stroked> });
  return items;
}

/** Icon + text rows; icon and text are both links when the item has a URL. */
export function ContactList({ S, className = '' }: { S: Settings; className?: string }) {
  return (
    <ul className={`cl ${className}`}>
      {contactItems(S).map((i) => {
        const body = <><span className="ic">{i.icon}</span><span>{i.text}</span></>;
        return (
          <li key={i.key}>
            {i.href
              ? <a href={i.href} target={i.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" aria-label={`${i.label}: ${i.text}`}>{body}</a>
              : <span className="row">{body}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Footer variant: a horizontal row of clickable icons, with the address (also a Maps link) underneath. */
export function ContactIcons({ S }: { S: Settings }) {
  const items = contactItems(S);
  return (
    <>
      <ul className="cl dark icons">
        {items.map((i) => (
          <li key={i.key}>
            <a href={i.href} target={i.href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" aria-label={`${i.label}: ${i.text}`} title={`${i.label}: ${i.text}`}>
              <span className="ic">{i.icon}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}