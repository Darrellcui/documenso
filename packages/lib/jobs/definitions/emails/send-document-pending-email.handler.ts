import { DocumentPendingEmailTemplate } from '@documenso/email/templates/document-pending';
import { unsafeBuildEnvelopeIdQuery } from '@documenso/lib/utils/envelope';
import { prisma } from '@documenso/prisma';
import { EnvelopeType } from '@prisma/client';
import { createElement } from 'react';
import { NEXT_PUBLIC_WEBAPP_URL } from '../../../constants/app';
import { getEmailContext } from '../../../server-only/email/get-email-context';
import { extractDerivedDocumentEmailSettings } from '../../../types/document-email';
import { isRecipientEmailValidForSending } from '../../../utils/recipients';
import { renderEmailWithI18N } from '../../../utils/render-email-with-i18n';
import type { JobRunIO } from '../../client/_internal/job';
import type { TSendDocumentPendingEmailJobDefinition } from './send-document-pending-email';

export const run = async ({ payload }: { payload: TSendDocumentPendingEmailJobDefinition; io: JobRunIO }) => {
  const { envelopeId, recipientId } = payload;

  const envelope = await prisma.envelope.findFirst({
    where: {
      ...unsafeBuildEnvelopeIdQuery({ type: 'envelopeId', id: envelopeId }, EnvelopeType.DOCUMENT),
      recipients: {
        some: {
          id: recipientId,
        },
      },
    },
    include: {
      recipients: {
        where: {
          id: recipientId,
        },
      },
      documentMeta: true,
    },
  });

  if (!envelope || envelope.recipients.length === 0) {
    return;
  }

  const { branding, emailLanguage, senderEmail, replyToEmail, emailsDisabled, emailTransport } = await getEmailContext({
    emailType: 'RECIPIENT',
    source: {
      type: 'team',
      teamId: envelope.teamId,
    },
    meta: envelope.documentMeta,
  });

  // Don't send any emails if the organisation has email sending disabled.
  if (emailsDisabled) {
    return;
  }

  const isDocumentPendingEmailEnabled = extractDerivedDocumentEmailSettings(envelope.documentMeta).documentPending;

  if (!isDocumentPendingEmailEnabled) {
    return;
  }

  const [recipient] = envelope.recipients;

  const { email, name } = recipient;

  // Skip sending email if recipient has no email address
  if (!isRecipientEmailValidForSending(recipient)) {
    return;
  }

  const assetBaseUrl = NEXT_PUBLIC_WEBAPP_URL() || 'http://localhost:3000';

  const template = createElement(DocumentPendingEmailTemplate, {
    documentName: envelope.title,
    assetBaseUrl,
  });

  const [html, text] = await Promise.all([
    renderEmailWithI18N(template, { lang: emailLanguage, branding }),
    renderEmailWithI18N(template, {
      lang: emailLanguage,
      branding,
      plainText: true,
    }),
  ]);


  await emailTransport.sendMail({
    to: {
      address: email,
      name,
    },
    from: senderEmail,
    replyTo: replyToEmail,
    subject: `等待其他签署方完成 · Waiting for others to sign`,
    html,
    text,
  });
};
