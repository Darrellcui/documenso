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
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center font-semibold text-foreground text-lg">
          温馨提醒：请处理您的文件
          <br />"{documentName}"
        </Text>
        <Text className="mx-auto mt-1 mb-0 max-w-[80%] text-center font-medium text-base text-muted-foreground">
          Reminder: your document "{documentName}" is waiting for you
        </Text>

        <Text className="mt-3 mb-0 text-center text-base text-muted-foreground">
          {recipientName} 您好，
        </Text>

        <Text className="mt-1 mb-0 text-center text-base text-muted-foreground">
          {match(role)
            .with(RecipientRole.SIGNER, () => '请点击下方按钮完成签署。')
            .with(RecipientRole.VIEWER, () => '请点击下方按钮查看文件。')
            .with(RecipientRole.APPROVER, () => '请点击下方按钮批准文件。')
            .with(RecipientRole.CC, () => '')
            .with(RecipientRole.ASSISTANT, () => '请点击下方按钮协助处理文件。')
            .exhaustive()}
        </Text>
        <Text className="mt-0 mb-1 text-center text-muted-foreground text-sm">
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
              .with(RecipientRole.SIGNER, () => '立即签署 · Sign Document')
              .with(RecipientRole.VIEWER, () => '查看文件 · View Document')
              .with(RecipientRole.APPROVER, () => '批准文件 · Approve Document')
              .with(RecipientRole.CC, () => '')
              .with(RecipientRole.ASSISTANT, () => '协助处理 · Assist')
              .exhaustive()}
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentReminder;
