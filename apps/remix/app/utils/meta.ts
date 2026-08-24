import { i18n, type MessageDescriptor } from '@lingui/core';

/**
 * Meta tags for every app page.
 *
 * This is an internal Xenvera system rather than a public product, so the
 * upstream marketing copy, Twitter card and Open Graph preview are gone and
 * robots are told to stay out — the signing portal has no reason to appear in
 * search results.
 */
export const appMetaTags = (title?: MessageDescriptor) => {
  return [
    {
      title: title ? `${i18n._(title)} - Xenvera Sign` : 'Xenvera Sign',
    },
    {
      name: 'description',
      content: 'Xenvera Sign — internal e-signature system of Xenvera Innovation.',
    },
    {
      name: 'author',
      content: 'Xenvera Innovation',
    },
    {
      name: 'robots',
      content: 'noindex, nofollow',
    },
    {
      property: 'og:title',
      content: 'Xenvera Sign',
    },
    {
      property: 'og:type',
      content: 'website',
    },
  ];
};
