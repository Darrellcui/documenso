import { useLingui } from '@lingui/react';
import { RecipientRole } from '@prisma/client';
import { match } from 'ts-pattern';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentReminderProps {
  recipientName: string;
  documentName: string;
  signDocumentLink: string;
  assetBaseUrl: string;
  role: RecipientRole;
}

export const TemplateDocumentReminder = ({
  recipientName,
  documentName,
  signDocumentLink,
  assetBaseUrl,
  role,
}: TemplateDocumentReminderProps) => {
  const { i18n } = useLingui();
  const isZh = i18n.locale.toLowerCase().startsWith('zh');

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center font-semibold text-foreground text-lg">
          {isZh ? '温馨提醒：请处理您的文件' : 'Reminder: your document is waiting for you'}
          <br />"{documentName}"
        </Text>
        {isZh && (
          <Text className="mx-auto mt-1 mb-0 max-w-[80%] text-center font-medium text-base text-muted-foreground">
            Reminder: your document "{documentName}" is waiting for you
          </Text>
        )}

        <Text className="mt-3 mb-0 text-center text-base text-muted-foreground">
          {isZh ? `${recipientName} 您好，` : `Hi ${recipientName},`}
        </Text>

        {isZh && (
          <Text className="mt-1 mb-0 text-center text-base text-muted-foreground">
            {match(role)
              .with(RecipientRole.SIGNER, () => '请点击下方按钮完成签署。')
              .with(RecipientRole.VIEWER, () => '请点击下方按钮查看文件。')
              .with(RecipientRole.APPROVER, () => '请点击下方按钮批准文件。')
              .with(RecipientRole.CC, () => '')
              .with(RecipientRole.ASSISTANT, () => '请点击下方按钮协助处理文件。')
              .exhaustive()}
          </Text>
        )}
        <Text className="mt-1 mb-1 text-center text-muted-foreground text-sm">
          {match(role)
            .with(RecipientRole.SIGNER, () => 'Please complete the signing below.')
            .with(RecipientRole.VIEWER, () => 'Please review the document below.')
            .with(RecipientRole.APPROVER, () => 'Please approve the document below.')
            .with(RecipientRole.CC, () => '')
            .with(RecipientRole.ASSISTANT, () => 'Please assist with the document below.')
            .exhaustive()}
        </Text>

        <Section className="mt-8 mb-6 text-center">
          <Button
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-primary-foreground text-sm no-underline"
            href={signDocumentLink}
          >
            {match(role)
              .with(RecipientRole.SIGNER, () => (isZh ? '立即签署 · Sign Document' : 'Sign Document'))
              .with(RecipientRole.VIEWER, () => (isZh ? '查看文件 · View Document' : 'View Document'))
              .with(RecipientRole.APPROVER, () => (isZh ? '批准文件 · Approve Document' : 'Approve Document'))
              .with(RecipientRole.CC, () => '')
              .with(RecipientRole.ASSISTANT, () => (isZh ? '协助处理 · Assist' : 'Assist'))
              .exhaustive()}
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentReminder;
