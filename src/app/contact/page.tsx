'use client';

import Image from 'next/image';
import { Button, Input } from '@shop/ui';
import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useTranslation } from '../../lib/i18n-client';
import { phoneDisplayToTelHref, splitContactPhoneDisplay } from '../../lib/contactPhoneDisplay';
import { apiClient } from '../../lib/api-client';
import {
  CONTACT_ICON_EMAIL_SRC,
  CONTACT_ICON_LOCATION_SRC,
  CONTACT_ICON_PHONE_SRC,
} from '../../lib/constants/contact-icons.constants';

const CONTACT_FORM_FIELD_CLASS =
  '!h-12 !rounded-[14px] !border-[#e5e7eb] !bg-[#f2f2f4] !px-5 !text-sm !text-gray-900 placeholder:!text-[#767987] focus:!border-transparent focus:!ring-2 focus:!ring-[#2DB2FF]';

const CONTACT_FORM_LABEL_CLASS = 'sr-only';

/** Contact info row icons — slightly smaller than heading line height for balance. */
const CONTACT_INFO_ICON_PX = 40;

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
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
                  <Image
                    src={CONTACT_ICON_PHONE_SRC}
                    alt=""
                    width={CONTACT_INFO_ICON_PX}
                    height={CONTACT_INFO_ICON_PX}
                    className="h-full w-full object-cover"
                    sizes={`${CONTACT_INFO_ICON_PX}px`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t('contact.callToUs.title')}</h3>
              </div>
              <p className="text-gray-600 mb-2">{t('contact.callToUs.description')}</p>
              <span className="flex flex-col items-start gap-1 font-medium tabular-nums text-[#2DB2FF]">
                {phoneLines.map((line, index) => (
                  <a
                    key={`${line}-${index}`}
                    href={phoneDisplayToTelHref(line)}
                    className="w-fit max-w-full hover:text-[#2DB2FF] hover:underline"
                  >
                    {line}
                  </a>
                ))}
              </span>
            </div>

            {/* Write to Us */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
                  <Image
                    src={CONTACT_ICON_EMAIL_SRC}
                    alt=""
                    width={CONTACT_INFO_ICON_PX}
                    height={CONTACT_INFO_ICON_PX}
                    className="h-full w-full object-cover"
                    sizes={`${CONTACT_INFO_ICON_PX}px`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t('contact.writeToUs.title')}</h3>
              </div>
              <p className="text-gray-600 mb-2">{t('contact.writeToUs.description')}</p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-[#2DB2FF]">{t('contact.writeToUs.emailLabel')}</span>
                <a
                  href={`mailto:${t('contact.email')}`}
                  className="font-medium text-[#2DB2FF] hover:text-[#2DB2FF] hover:underline"
                >
                  {t('contact.email')}
                </a>
              </div>
            </div>

            {/* Headquarter */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5">
                  <Image
                    src={CONTACT_ICON_LOCATION_SRC}
                    alt=""
                    width={CONTACT_INFO_ICON_PX}
                    height={CONTACT_INFO_ICON_PX}
                    className="h-full w-full object-cover"
                    sizes={`${CONTACT_INFO_ICON_PX}px`}
                  />
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
