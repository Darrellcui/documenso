import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export type TemplateConfirmationEmailProps = {
  confirmationLink: string;
  assetBaseUrl: string;
};

/**
 * Layout follows the document emails (brand line, headline, body, action
 * button) but is unconditionally bilingual: document emails switch on the
 * document's language because they reach external signers, whereas this one is
 * only ever sent to staff on the allowed signup domain. It is also rendered
 * without a language hint, so the locale here is always the 'en' source anyway.
 */
export const TemplateConfirmationEmail = ({ confirmationLink, assetBaseUrl }: TemplateConfirmationEmailProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section className="flex-row items-center justify-center">
        <Text className="mx-auto mb-0 max-w-[80%] text-center font-semibold text-foreground text-lg">
          欢迎加入 Xenvera Sign
          <br />
          Welcome to Xenvera Sign
        </Text>

        <Text className="mx-auto mt-1 mb-0 text-center text-muted-foreground text-sm">
          Xenvera Innovation · 电子签署 E-Signature
        </Text>

        <Text className="my-1 text-center text-base text-muted-foreground">
          请点击下方按钮确认邮箱地址，激活您的账号。
        </Text>

        <Text className="mt-1 mb-1 text-center text-muted-foreground text-sm">
          Please confirm your email address to activate your account.
        </Text>

        <Section className="mt-8 mb-6 text-center">
          <Button
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-base text-primary-foreground no-underline"
            href={confirmationLink}
          >
            确认邮箱 · Confirm Email
          </Button>

          <Text className="mt-8 text-center text-muted-foreground text-sm italic">
            也可复制以下链接到浏览器打开（1 小时内有效）：
            <br />
            You can also copy this link into your browser (expires in 1 hour):
            <br />
            {confirmationLink}
          </Text>
        </Section>
      </Section>
    </>
  );
};
