import { settings } from '@/lib/biz';
import { ContactForm } from '../_components/contact-form';
import { ContactCard, PrivacyLink } from '../_components/parts';

export const metadata = { title: 'Contact Us' };

export default async function Contact() {
  const S = await settings();
  return (
    <section className="section"><div className="wrap grid g2" style={{ alignItems: 'start' }}>
      <div>
        <h1>Contact Us</h1>
        <ContactCard S={S} />
        <PrivacyLink />
      </div>
      <ContactForm />
    </div></section>
  );
}
