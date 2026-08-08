
import { Column, Img, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentPendingProps {
  documentName: string;
  assetBaseUrl: string;
}

export const TemplateDocumentPending = ({ documentName, assetBaseUrl }: TemplateDocumentPendingProps) => {
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
              <Img src={getAssetUrl('/static/clock.png')} className="-mt-0.5 mr-2 inline h-7 w-7 align-middle" alt="" />
              等待其他签署方 · Waiting for others
            </Text>
          </Column>
        </Section>

        <Text className="mb-0 text-center font-semibold text-foreground text-lg">
          您已完成签署 "{documentName}"
        </Text>
        <Text className="mt-1 mb-0 text-center font-medium text-base text-muted-foreground">
          You have signed "{documentName}"
        </Text>

        <Text className="mx-auto mt-3 mb-1 max-w-[80%] text-center text-base text-muted-foreground">
          文件仍在等待其他签署方完成，完成后我们会立即通知您。
        </Text>
        <Text className="mx-auto mt-0 mb-6 max-w-[80%] text-center text-muted-foreground text-sm">
          We're waiting for the remaining signers. You'll be notified once it's complete.
        </Text>
      </Section>
    </>
  );
};

export default TemplateDocumentPending;
