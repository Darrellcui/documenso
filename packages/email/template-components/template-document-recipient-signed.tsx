
import { useLingui } from '@lingui/react';

import { Column, Img, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentRecipientSignedProps {
  documentName: string;
  recipientName: string;
  recipientEmail: string;
  assetBaseUrl: string;
}

export const TemplateDocumentRecipientSigned = ({
  documentName,
  recipientName,
  recipientEmail,
  assetBaseUrl,
}: TemplateDocumentRecipientSignedProps) => {
  const getAssetUrl = (path: string) => {
    return new URL(path, assetBaseUrl).toString();
  };

  const { i18n } = useLingui();
  const isZh = i18n.locale.toLowerCase().startsWith('zh');

  const recipientReference = recipientName || recipientEmail;

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Section className="mb-4">
          <Column align="center">
            <Text className="font-semibold text-base text-foreground">
              <Img
                src={getAssetUrl('/static/completed.png')}
                className="-mt-0.5 mr-2 inline h-7 w-7 align-middle"
                alt=""
              />
              {isZh ? '已签署 · Signed' : 'Signed'}
            </Text>
          </Column>
        </Section>

        <Text className="mb-0 text-center font-semibold text-foreground text-lg">
          {isZh ? `${recipientReference} 已签署 "${documentName}"` : `${recipientReference} has signed "${documentName}"`}
        </Text>
        {isZh && (
          <Text className="mt-1 mb-0 text-center font-medium text-base text-muted-foreground">
            {recipientReference} has signed "{documentName}"
          </Text>
        )}

        <Text className="mx-auto mt-3 mb-6 max-w-[80%] text-center text-muted-foreground text-sm">
          {isZh ? '该签署方已完成签署。 · This recipient has completed signing.' : 'This recipient has completed signing.'}
        </Text>
      </Section>
    </>
  );
};

export default TemplateDocumentRecipientSigned;
