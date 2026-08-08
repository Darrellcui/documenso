import {
  EnvelopeRenderProvider,
  useCurrentEnvelopeRender,
} from '@documenso/lib/client-only/providers/envelope-render-provider';
import { PDF_VIEWER_ERROR_MESSAGES } from '@documenso/lib/constants/pdf-viewer-i18n';
import { getDocumentDataUrlForPdfViewer } from '@documenso/lib/utils/envelope-download';
import { formatDocumentsPath } from '@documenso/lib/utils/teams';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { Trans } from '@lingui/react/macro';
import { type DocumentData, DocumentStatus, type EnvelopeItem, EnvelopeType } from '@prisma/client';
import { CheckCircle2, DownloadIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

import { EnvelopeDownloadDialog } from '~/components/dialogs/envelope-download-dialog';
import { EnvelopePdfViewer } from '~/components/general/pdf-viewer/envelope-pdf-viewer';
import PDFViewerLazy from '~/components/general/pdf-viewer/pdf-viewer-lazy';

import { EnvelopeRendererFileSelector } from '../envelope-editor/envelope-file-selector';
import { EnvelopeGenericPageRenderer } from '../envelope-editor/envelope-generic-page-renderer';

export type DocumentCertificateQRViewProps = {
  documentId: number;
  title: string;
  internalVersion: number;
  envelopeItems: (EnvelopeItem & { documentData: DocumentData })[];
  documentTeamUrl: string;
  recipientCount?: number;
  completedDate?: Date;
  token: string;
};

const SummaryField = ({ label, value }: { label: ReactNode; value: ReactNode }) => (
  <div className="space-y-0.5">
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="font-medium text-foreground text-sm">{value}</dd>
  </div>
);

/**
 * Professional verification summary shown when a signed document's certificate
 * QR code is scanned. Confirms the document is authentic and complete, and
 * surfaces the key audit facts above the document preview.
 */
const CertificateVerifiedSummary = ({
  title,
  recipientCount,
  formattedDate,
  downloadSlot,
}: {
  title: string;
  recipientCount: number;
  formattedDate: string;
  downloadSlot: ReactNode;
}) => (
  <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="font-semibold text-foreground text-xl leading-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">
            此文件已通过 Xenvera Innovation 电子签署验证并完成 · Verified &amp; completed via Xenvera e-signature
          </p>
        </div>
      </div>

      {downloadSlot}
    </div>

    <dl className="mt-5 grid grid-cols-2 gap-4 border-border border-t pt-5 sm:grid-cols-4">
      <SummaryField label={<Trans>Status</Trans>} value={<Trans>Completed</Trans>} />
      <SummaryField label={<Trans>Completed on</Trans>} value={formattedDate || '—'} />
      <SummaryField label={<Trans>Recipients</Trans>} value={recipientCount} />
      <SummaryField label="Xenvera Innovation" value="(HK) Limited" />
    </dl>
  </div>
);

export const DocumentCertificateQRView = ({
  documentId,
  title,
  internalVersion,
  envelopeItems,
  documentTeamUrl,
  recipientCount = 0,
  completedDate,
  token,
}: DocumentCertificateQRViewProps) => {
  const { data: documentViaUser } = trpc.document.get.useQuery({
    documentId,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(() => !!documentViaUser);

  const formattedDate = completedDate ? DateTime.fromJSDate(completedDate).toLocaleString(DateTime.DATETIME_MED) : '';

  useEffect(() => {
    if (documentViaUser) {
      setIsDialogOpen(true);
    }
  }, [documentViaUser]);

  return (
    <div className="mx-auto w-full max-w-screen-md">
      {/* Dialog for internal document link */}
      {documentViaUser && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Trans>Document found in your account</Trans>
              </DialogTitle>

              <DialogDescription>
                <Trans>
                  This document is available in your Documenso account. You can view more details, recipients, and audit
                  logs there.
                </Trans>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-row justify-end gap-2">
              <Button asChild>
                <a
                  href={`${formatDocumentsPath(documentTeamUrl)}/${documentViaUser.envelopeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Trans>Go to document</Trans>
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {internalVersion === 2 ? (
        <EnvelopeRenderProvider
          version="current"
          envelope={{
            id: envelopeItems[0].envelopeId,
            status: DocumentStatus.COMPLETED,
            type: EnvelopeType.DOCUMENT,
          }}
          envelopeItems={envelopeItems}
          token={token}
        >
          <DocumentCertificateQrV2
            title={title}
            recipientCount={recipientCount}
            formattedDate={formattedDate}
            token={token}
          />
        </EnvelopeRenderProvider>
      ) : (
        <>
          <CertificateVerifiedSummary
            title={title}
            recipientCount={recipientCount}
            formattedDate={formattedDate}
            downloadSlot={
              <EnvelopeDownloadDialog
                envelopeId={envelopeItems[0].envelopeId}
                envelopeStatus={DocumentStatus.COMPLETED}
                envelopeItems={envelopeItems}
                token={token}
                trigger={
                  <Button type="button" variant="outline" className="w-fit">
                    <DownloadIcon className="mr-2 h-5 w-5" />
                    <Trans>Download</Trans>
                  </Button>
                }
              />
            }
          />

          <div className="mt-8 w-full">
            <PDFViewerLazy
              key={envelopeItems[0]?.id}
              data={getDocumentDataUrlForPdfViewer({
                envelopeId: envelopeItems[0]?.envelopeId,
                envelopeItemId: envelopeItems[0]?.id,
                documentDataId: envelopeItems[0]?.documentDataId,
                version: 'current',
                token,
                presignToken: undefined,
              })}
              scrollParentRef="window"
            />
          </div>
        </>
      )}
    </div>
  );
};

type DocumentCertificateQrV2Props = {
  title: string;
  recipientCount: number;
  formattedDate: string;
  token: string;
};

const DocumentCertificateQrV2 = ({ title, recipientCount, formattedDate, token }: DocumentCertificateQrV2Props) => {
  const { envelopeItems } = useCurrentEnvelopeRender();

  return (
    <div className="flex min-h-screen flex-col items-start">
      <CertificateVerifiedSummary
        title={title}
        recipientCount={recipientCount}
        formattedDate={formattedDate}
        downloadSlot={
          <EnvelopeDownloadDialog
            envelopeId={envelopeItems[0].envelopeId}
            envelopeStatus={DocumentStatus.COMPLETED}
            envelopeItems={envelopeItems}
            token={token}
            trigger={
              <Button type="button" variant="outline" className="w-fit">
                <DownloadIcon className="mr-2 h-5 w-5" />
                <Trans>Download</Trans>
              </Button>
            }
          />
        }
      />

      <div className="mt-8 w-full">
        <EnvelopeRendererFileSelector className="mb-4 p-0" fields={[]} secondaryOverride={''} />

        <EnvelopePdfViewer
          scrollParentRef="window"
          customPageRenderer={EnvelopeGenericPageRenderer}
          errorMessage={PDF_VIEWER_ERROR_MESSAGES.preview}
        />
      </div>
    </div>
  );
};
