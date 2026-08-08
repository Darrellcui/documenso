import { Fragment } from 'react';

import { Link, Section, Text } from '../components';
import { useBranding } from '../providers/branding';

export type TemplateFooterProps = {
  isDocument?: boolean;
  reportUrl?: string;
};

export const TemplateFooter = ({ isDocument = true, reportUrl }: TemplateFooterProps) => {
  const branding = useBranding();

  return (
    <Section>
      {reportUrl && (
        <Text className="my-4 text-base text-muted-foreground">
          没想到会收到此邮件？
          <Link className="text-primary" href={reportUrl}>
            点此举报发件人
          </Link>
          。请勿签署您不认识或非预期的文件。
          <br />
          Not expecting this email?{' '}
          <Link className="text-primary" href={reportUrl}>
            Report the sender
          </Link>
          . Never sign a document you don't recognize.
        </Text>
      )}

      {branding.brandingEnabled && branding.brandingCompanyDetails && (
        <Text className="my-8 text-muted-foreground text-sm">
          {branding.brandingCompanyDetails.split('\n').map((line, idx) => {
            return (
              <Fragment key={idx}>
                {idx > 0 && <br />}
                {line}
              </Fragment>
            );
          })}
        </Text>
      )}

    </Section>
  );
};

export default TemplateFooter;
