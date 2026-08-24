import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export type TemplateConfirmationEmailProps = {
  confirmationLink: string;
  assetBaseUrl: string;
};

export const TemplateConfirmationEmail = ({ confirmationLink, assetBaseUrl }: TemplateConfirmationEmailProps) => {
  const { i18n } = useLingui();

  // Matches the document emails: Chinese locales get a bilingual body, everyone
  // else gets English only.
  const isZh = i18n.locale.toLowerCase().startsWith('zh');

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section className="flex-row items-center justify-center">
        <Text className="mx-auto mb-0 max-w-[80%] text-center font-semibold text-foreground text-lg">
          {isZh ? '欢迎加入 Xenvera Sign' : 'Welcome to Xenvera Sign'}
        </Text>

        <Text className="mx-auto mt-1 mb-0 text-center text-muted-foreground text-sm">
          {isZh ? 'Xenvera Innovation · 电子签署 E-Signature' : 'Xenvera Innovation · E-Signature'}
        </Text>

        {isZh && (
          <Text className="my-1 text-center text-base text-muted-foreground">
            请点击下方按钮确认邮箱地址，即可开始使用。
          </Text>
        )}

        <Text className="mt-1 mb-1 text-center text-muted-foreground text-sm">
          Please confirm your email address to activate your account.
        </Text>

        <Section className="mt-8 mb-6 text-center">
          <Button
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-base text-primary-foreground no-underline"
            href={confirmationLink}
          >
            {isZh ? '确认邮箱 · Confirm Email' : 'Confirm Email'}
          </Button>

          <Text className="mt-8 text-center text-muted-foreground text-sm italic">
            <Trans>
              You can also copy and paste this link into your browser: {confirmationLink} (link expires in 1 hour)
            </Trans>
          </Text>
        </Section>
      </Section>
    </>
  );
};
