
import { useLingui } from '@lingui/react';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export type TemplateRecipientExpiredProps = {
  documentName: string;
  recipientName: string;
  recipientEmail: string;
  documentLink: string;
  assetBaseUrl: string;
};

export const TemplateRecipientExpired = ({
  documentName,
  recipientName,
  recipientEmail,
  documentLink,
  assetBaseUrl,
}: TemplateRecipientExpiredProps) => {
  const { i18n } = useLingui();
  const isZh = i18n.locale.toLowerCase().startsWith('zh');

  const displayName = recipientName || recipientEmail;

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center font-semibold text-foreground text-lg">
          {isZh ? `${displayName} 的签署期限已过期` : `Signing window expired for ${displayName}`}
          <br />"{documentName}"
        </Text>
        {isZh && (
          <Text className="mx-auto mt-1 mb-0 max-w-[80%] text-center font-medium text-base text-muted-foreground">
            Signing window expired for {displayName} on "{documentName}"
          </Text>
        )}

        {isZh && (
          <Text className="mt-3 mb-0 text-center text-base text-muted-foreground">
            {displayName} 在此文件上的签署期限已过，您可重新发送以延长期限，或取消该文件。
          </Text>
        )}
        <Text className="mt-1 mb-1 text-center text-muted-foreground text-sm">
          You can resend the document to extend the deadline, or cancel it.
        </Text>

        <Section className="my-4 text-center">
          <Button
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-primary-foreground text-sm no-underline"
            href={documentLink}
          >
            {isZh ? '查看文件 · View Document' : 'View Document'}
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateRecipientExpired;
