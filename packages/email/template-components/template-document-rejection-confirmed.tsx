
import { useLingui } from '@lingui/react';

import { Container, Heading, Section, Text } from '../components';

interface TemplateDocumentRejectionConfirmedProps {
  recipientName: string;
  documentName: string;
  documentOwnerName: string;
  reason?: string;
}

export function TemplateDocumentRejectionConfirmed({
  recipientName,
  documentName,
  documentOwnerName,
  reason,
}: TemplateDocumentRejectionConfirmedProps) {
  const { i18n } = useLingui();
  const isZh = i18n.locale.toLowerCase().startsWith('zh');

  return (
    <Container>
      <Section>
        <Heading className="font-semibold text-2xl">
          {isZh ? '拒签已确认 · Rejection Confirmed' : 'Rejection Confirmed'}
        </Heading>

        {isZh && (
          <Text className="text-base text-foreground">
            此邮件确认您已拒绝签署由 {documentOwnerName} 发送的文件{' '}
            <strong className="font-bold">"{documentName}"</strong>。
          </Text>
        )}
        <Text className="text-base text-foreground">
          This confirms that you have rejected "{documentName}" sent by {documentOwnerName}.
        </Text>

        {reason && (
          <Text className="font-medium text-base text-muted-foreground">
            {isZh ? '拒签原因' : 'Reason'} / Reason: {reason}
          </Text>
        )}

        {isZh && (
          <Text className="text-base">
            文件所有者已收到通知，您当前无需再做任何操作；如有疑问，对方可能会与您联系。
          </Text>
        )}
        <Text className="text-base text-muted-foreground">
          The document owner has been notified. No further action is required from you.
        </Text>
      </Section>
    </Container>
  );
}
