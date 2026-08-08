import { Column, Img, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentSelfSignedProps {
  documentName: string;
  assetBaseUrl: string;
}

export const TemplateDocumentSelfSigned = ({ documentName, assetBaseUrl }: TemplateDocumentSelfSignedProps) => {
  const getAssetUrl = (path: string) => {
    return new URL(path, assetBaseUrl).toString();
  };

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section className="flex-row items-center justify-center">
        <Section>
          <Column align="center">
            <Text className="font-semibold text-base text-foreground">
              <Img
                src={getAssetUrl('/static/completed.png')}
                className="-mt-0.5 mr-2 inline h-7 w-7 align-middle"
                alt=""
              />
              已完成 · Completed
            </Text>
          </Column>
        </Section>

        <Text className="mt-6 mb-0 text-center font-semibold text-foreground text-lg">
          您已签署 "{documentName}"
        </Text>
        <Text className="mt-1 mb-0 text-center font-medium text-base text-muted-foreground">
          You have signed "{documentName}"
        </Text>

        <Text className="mx-auto mt-3 mb-6 max-w-[80%] text-center text-muted-foreground text-sm">
          签署完成的文件已附在本邮件中，请注意查收。
          <br />
          A copy of the signed document is attached to this email.
        </Text>
      </Section>
    </>
  );
};

export default TemplateDocumentSelfSigned;
