import { RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { OrganisationType, RecipientRole } from '@prisma/client';
import { match, P } from 'ts-pattern';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentInviteProps {
  inviterName: string;
  inviterEmail: string;
  documentName: string;
  signDocumentLink: string;
  assetBaseUrl: string;
  role: RecipientRole;
  selfSigner: boolean;
  teamName?: string;
  includeSenderDetails?: boolean;
  organisationType?: OrganisationType;
}

export const TemplateDocumentInvite = ({
  inviterName,
  documentName,
  signDocumentLink,
  assetBaseUrl,
  role,
  selfSigner,
  teamName,
  includeSenderDetails,
  organisationType,
}: TemplateDocumentInviteProps) => {
  const { _ } = useLingui();

  const { actionVerb } = RECIPIENT_ROLES_DESCRIPTION[role];

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center font-semibold text-foreground text-lg">
          {match({ selfSigner, organisationType, includeSenderDetails, teamName })
            .with({ selfSigner: true }, () => (
              <Trans>
                Please {_(actionVerb).toLowerCase()} your document
                <br />"{documentName}"
              </Trans>
            ))
            .with(
              {
                organisationType: OrganisationType.ORGANISATION,
                includeSenderDetails: true,
                teamName: P.string,
              },
              () => (
                <Trans>
                  {inviterName} on behalf of "{teamName}" has invited you to {_(actionVerb).toLowerCase()}
                  <br />"{documentName}"
                </Trans>
              ),
            )
            .with({ organisationType: OrganisationType.ORGANISATION, teamName: P.string }, () => (
              <Trans>
                {teamName} has invited you to {_(actionVerb).toLowerCase()}
                <br />"{documentName}"
              </Trans>
            ))
            .otherwise(() => (
              <Trans>
                {inviterName} has invited you to {_(actionVerb).toLowerCase()}
                <br />"{documentName}"
              </Trans>
            ))}
        </Text>

        <Text className="mx-auto mt-1 mb-0 text-center text-muted-foreground text-sm">
          Xenvera Innovation · 电子签署 E-Signature
        </Text>

        {/* Bilingual (中/EN) instruction line — Xenvera suppliers span both. */}
        <Text className="my-1 text-center text-base text-muted-foreground">
          {match(role)
            .with(RecipientRole.SIGNER, () => '请点击下方按钮查看并签署文件。')
            .with(RecipientRole.VIEWER, () => '请点击下方按钮查看文件。')
            .with(RecipientRole.APPROVER, () => '请点击下方按钮查看并批准文件。')
            .with(RecipientRole.CC, () => '')
            .with(RecipientRole.ASSISTANT, () => '请点击下方按钮协助处理文件。')
            .exhaustive()}
        </Text>
        <Text className="mt-0 mb-1 text-center text-muted-foreground text-sm">
          {match(role)
            .with(RecipientRole.SIGNER, () => 'Please review and sign the document below.')
            .with(RecipientRole.VIEWER, () => 'Please review the document below.')
            .with(RecipientRole.APPROVER, () => 'Please review and approve the document below.')
            .with(RecipientRole.CC, () => '')
            .with(RecipientRole.ASSISTANT, () => 'Please assist with the document below.')
            .exhaustive()}
        </Text>

        <Section className="mt-8 mb-6 text-center">
          <Button
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-center font-medium text-base text-primary-foreground no-underline"
            href={signDocumentLink}
          >
            {match(role)
              .with(RecipientRole.SIGNER, () => '查看并签署 · View & Sign')
              .with(RecipientRole.VIEWER, () => '查看文件 · View Document')
              .with(RecipientRole.APPROVER, () => '查看并批准 · View & Approve')
              .with(RecipientRole.CC, () => '')
              .with(RecipientRole.ASSISTANT, () => '协助处理 · Assist')
              .exhaustive()}
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentInvite;
