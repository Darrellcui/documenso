
import { Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentCancelProps {
  inviterName: string;
  inviterEmail: string;
  documentName: string;
  assetBaseUrl: string;
  cancellationReason?: string;
}

export const TemplateDocumentCancel = ({
  inviterName,
  documentName,
  assetBaseUrl,
  cancellationReason,
}: TemplateDocumentCancelProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center font-semibold text-foreground text-lg">
          {inviterName} 已取消文件
          <br />"{documentName}"
        </Text>
        <Text className="mx-auto mt-1 mb-0 max-w-[80%] text-center font-medium text-base text-muted-foreground">
          {inviterName} has cancelled the document "{documentName}"
        </Text>

        <Text className="mt-3 mb-0 text-center text-base text-muted-foreground">
          所有签名均已作废，您无需再签署此文件。
        </Text>
        <Text className="mt-0 mb-1 text-center text-muted-foreground text-sm">
          All signatures have been voided — no further action is required.
        </Text>

        {cancellationReason && (
          <Text className="mt-4 text-center text-base">
            取消原因 / Reason: {cancellationReason}
          </Text>
        )}
      </Section>
    </>
  );
};

export default TemplateDocumentCancel;
