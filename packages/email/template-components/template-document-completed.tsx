import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';

import { Button, Column, Img, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentCompletedProps {
  downloadLink: string;
  documentName: string;
  assetBaseUrl: string;
  customBody?: string;
}

export const TemplateDocumentCompleted = ({
  downloadLink,
  documentName,
  assetBaseUrl,
  customBody,
}: TemplateDocumentCompletedProps) => {
  // Chinese documents get a bilingual email; all other languages get English.
  const { i18n } = useLingui();
  const isZh = i18n.locale.toLowerCase().startsWith('zh');

  const getAssetUrl = (path: string) => {
    return new URL(path, assetBaseUrl).toString();
  };

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
              <Trans>Completed</Trans>
            </Text>
          </Column>
        </Section>

        <Text className="mb-0 text-center font-semibold text-foreground text-lg">
          {customBody || (isZh ? `"${documentName}" 已由所有签署方完成签署` : `"${documentName}" was signed by all signers`)}
        </Text>

        {isZh && (
          <Text className="mt-1 mb-0 text-center text-base text-muted-foreground">
            文件已由所有签署方完成签署，请点击下方按钮下载。
          </Text>
        )}
        <Text className="mt-1 mb-1 text-center text-muted-foreground text-sm">
          The document has been signed by all parties. Download it below.
        </Text>

        <Section className="mt-8 mb-6 text-center">
          <Button
            className="rounded-lg border border-border border-solid px-4 py-2 text-center font-medium text-foreground text-sm no-underline"
            href={downloadLink}
          >
            <Img src={getAssetUrl('/static/download.png')} className="mr-2 mb-0.5 inline h-5 w-5 align-middle" alt="" />
            {isZh ? '下载文件 · Download' : 'Download'}
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentCompleted;
