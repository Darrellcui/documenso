
import { Button, Heading, Text } from '../components';

export interface TemplateDocumentRejectedProps {
  documentName: string;
  recipientName: string;
  rejectionReason?: string;
  documentUrl: string;
}

export function TemplateDocumentRejected({
  documentName,
  recipientName: signerName,
  rejectionReason,
  documentUrl,
}: TemplateDocumentRejectedProps) {
  return (
    <div className="mt-4">
      <Heading className="mb-4 text-center font-semibold text-2xl text-foreground">
        文件已被拒签 · Document Rejected
      </Heading>

      <Text className="mb-1 text-base">
        {signerName} 已拒绝签署文件 "{documentName}"。
      </Text>
      <Text className="mb-4 text-muted-foreground text-sm">
        {signerName} has rejected the document "{documentName}".
      </Text>

      {rejectionReason && (
        <Text className="mb-4 text-base text-muted-foreground">
          拒签原因 / Reason: {rejectionReason}
        </Text>
      )}

      <Text className="mb-6 text-base">
        点击下方按钮可查看文件及其状态。
        <br />
        You can view the document and its status below.
      </Text>

      <Button
        href={documentUrl}
        className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-primary-foreground text-sm no-underline"
      >
        查看文件 · View Document
      </Button>
    </div>
  );
}
