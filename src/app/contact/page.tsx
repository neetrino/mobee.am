'use client';

import { Button, Input } from '@shop/ui';
import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useTranslation } from '../../lib/i18n-client';
import { phoneDisplayToTelHref, splitContactPhoneDisplay } from '../../lib/contactPhoneDisplay';
import { apiClient } from '../../lib/api-client';

// Icons
const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7292C21.7209 20.9842 21.5573 21.2131 21.3523 21.4011C21.1473 21.5891 20.9053 21.732 20.6393 21.8207C20.3733 21.9094 20.0892 21.9418 19.81 21.9159C16.7428 21.5811 13.787 20.5306 11.19 18.8499C8.77382 17.3147 6.72533 15.2662 5.19 12.8499C3.49997 10.2412 2.44824 7.27099 2.12 4.18994C2.09413 3.91078 2.12653 3.62669 2.21523 3.36069C2.30393 3.09469 2.44684 2.85273 2.63482 2.64773C2.8228 2.44273 3.05172 2.27912 3.30672 2.16753C3.56172 2.05594 3.83743 1.99899 4.116 1.99994H7.116C7.68157 1.98944 8.23512 2.16393 8.69506 2.49952C9.155 2.83512 9.49782 3.31473 9.676 3.86994C9.94479 4.78626 10.3155 5.67019 10.78 6.50994C10.9867 6.89183 11.0672 7.33164 11.01 7.76494C10.9528 8.19824 10.7608 8.60612 10.46 8.93994L9.09 10.3099C10.5144 12.7895 12.7305 15.0056 15.21 16.4299L16.58 15.0599C16.9138 14.7592 17.3217 14.5672 17.755 14.51C18.1883 14.4528 18.6281 14.5333 19.01 14.7399C19.8498 15.2045 20.7337 15.5752 21.65 15.8439C22.2052 16.0221 22.6848 16.365 23.0204 16.8249C23.356 17.2849 23.5305 17.8384 23.52 18.4039L22 16.92Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EnvelopeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MapPinIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CONTACT_FORM_FIELD_CLASS =
  '!h-12 !rounded-[14px] !border-[#e5e7eb] !bg-[#f2f2f4] !px-5 !text-sm !text-gray-900 placeholder:!text-[#767987] focus:!border-transparent focus:!ring-2 focus:!ring-[#2DB2FF]';

const CONTACT_FORM_LABEL_CLASS = 'sr-only';

export default function ContactPage() {
  const { t } = useTranslation();
  const phoneLines = splitContactPhoneDisplay(t('contact.phone'));
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await apiClient.post('/api/v1/contact', {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      }, {
        skipAuth: true, // Contact form doesn't require authentication
      });
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
      
      alert(t('contact.form.submitSuccess') || 'Ձեր հաղորդագրությունը հաջողությամբ ուղարկվեց');
    } catch (error: any) {
      console.error('Error submitting contact form:', error);
      alert(t('contact.form.submitError') || 'Սխալ: ' + (error.message || 'Չհաջողվեց ուղարկել հաղորդագրությունը'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-white">
      {/* Top Section: Contact Info and Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side: Contact Information */}
          <div className="space-y-8">
            {/* Call to Us */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <PhoneIcon />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t('contact.callToUs.title')}</h3>
              </div>
              <p className="text-gray-600 mb-2">{t('contact.callToUs.description')}</p>
              <span className="flex flex-col gap-1 font-medium tabular-nums text-[#2DB2FF]">
                {phoneLines.map((line, index) => (
                  <a
                    key={`${line}-${index}`}
                    href={phoneDisplayToTelHref(line)}
                    className="hover:text-[#2DB2FF] hover:underline"
                  >
                    {line}
                  </a>
                ))}
              </span>
            </div>

            {/* Write to Us */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <EnvelopeIcon />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t('contact.writeToUs.title')}</h3>
              </div>
              <p className="text-gray-600 mb-2">{t('contact.writeToUs.description')}</p>
              <a
                href={`mailto:${t('contact.email')}`}
                className="font-medium text-[#2DB2FF] hover:text-[#2DB2FF] hover:underline"
              >
                {t('contact.writeToUs.emailLabel')} {t('contact.email')}
              </a>
            </div>

            {/* Headquarter */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <MapPinIcon />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t('contact.headquarter.title')}</h3>
              </div>
              <div className="text-gray-600 mb-2 space-y-1">
                <p>{t('contact.headquarter.hours.weekdays')}</p>
                <p>{t('contact.headquarter.hours.saturday')}</p>
              </div>
              <p className="font-medium text-[#2DB2FF]">
                {t('contact.address')}
              </p>
            </div>
          </div>

          {/* Right Side: Contact Form */}
          <div>
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-[480px] rounded-[18px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:ml-auto"
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className={CONTACT_FORM_LABEL_CLASS}>
                    {t('contact.form.name')}
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={CONTACT_FORM_FIELD_CLASS}
                    placeholder={t('contact.form.namePlaceholder')}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={CONTACT_FORM_LABEL_CLASS}>
                    {t('contact.form.email')}
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={CONTACT_FORM_FIELD_CLASS}
                    placeholder={t('contact.form.emailPlaceholder')}
                  />
                </div>
                <div>
                  <label htmlFor="subject" className={CONTACT_FORM_LABEL_CLASS}>
                    {t('contact.form.subject')}
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className={CONTACT_FORM_FIELD_CLASS}
                    placeholder={t('contact.form.subjectPlaceholder')}
                  />
                </div>
                <div>
                  <label htmlFor="message" className={CONTACT_FORM_LABEL_CLASS}>
                    {t('contact.form.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="min-h-[140px] w-full resize-y rounded-[14px] border border-[#e5e7eb] bg-[#f2f2f4] px-5 py-4 text-sm text-gray-900 placeholder:text-[#767987] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2DB2FF]"
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="h-12 w-full !rounded-full !bg-[#2DB2FF] text-sm font-semibold uppercase tracking-wide text-white hover:!bg-[#25A0E0] focus:!ring-[#2DB2FF]"
                  disabled={submitting}
                >
                  {submitting ? (t('contact.form.submitting') || 'Ուղարկվում է...') : t('contact.form.submit')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
