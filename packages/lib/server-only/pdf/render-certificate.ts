import type { I18n } from '@lingui/core';
import type { Field, RecipientRole, Signature } from '@prisma/client';
import { SigningStatus } from '@prisma/client';
import Konva from 'konva';
import 'konva/skia-backend';
import fs from 'node:fs';
import path from 'node:path';
import { DateTime } from 'luxon';
import type { Canvas } from 'skia-canvas';
import { Image as SkiaImage } from 'skia-canvas';
import { renderSVG } from 'uqr';

import { NEXT_PUBLIC_WEBAPP_URL } from '../../constants/app';
import type { TDocumentAuditLogBaseSchema } from '../../types/document-audit-logs';
import { svgToPng } from '../../utils/images/svg-to-png';
import { ensureFontLibrary } from './helpers';

type BaseAuditLog = Pick<TDocumentAuditLogBaseSchema, 'createdAt' | 'ipAddress' | 'userAgent'>;

export type CertificateRecipient = {
  id: number;
  name: string;
  email: string;
  role: RecipientRole;
  rejectionReason: string | null;
  signingStatus: SigningStatus;
  signatureField?: Pick<Field, 'id' | 'secondaryId' | 'recipientId'> & {
    signature?: Pick<Signature, 'signatureImageAsBase64' | 'typedSignature'> | null;
  };
  authLevel: string;
  logs: {
    emailed: BaseAuditLog | null;
    sent: BaseAuditLog | null;
    opened: BaseAuditLog | null;
    completed: BaseAuditLog | null;
    rejected: BaseAuditLog | null;
  };
};

type GenerateCertificateOptions = {
  recipients: CertificateRecipient[];
  envelopeId: string;
  documentTitle: string;
  documentCreatedAt: Date;
  qrToken: string | null;
  hidePoweredBy: boolean;
  i18n: I18n;
  envelopeOwner: {
    name: string;
    email: string;
  };
  pageWidth: number;
  pageHeight: number;
};

// Font stack with CJK fallback. Inter has no CJK glyphs, so Chinese/Japanese/
// Korean text rendered as tofu boxes. skia-canvas falls through this list
// per-glyph; the bundled Noto Sans CJK fonts cover the missing ranges.
const fontStack = 'Inter, "Noto Sans", "Noto Sans Chinese", "Noto Sans Japanese", "Noto Sans Korean"';

const fontMedium = '500';
const brandNavy = '#003B6F';
const textForeground = '#1A1D27';
const textMuted = '#64748B';
const textMutedLight = '#929DAE';
const detailsBg = '#F4F5F8';
const detailsBorder = '#E6E8EF';

// Event icon colors.
const iconOrange = '#E8833A';
const iconBlue = '#2F80B8';
const iconGreen = '#2E7D32';
const iconRed = '#DC2626';

type IconKind = 'created' | 'emailed' | 'viewed' | 'signed' | 'rejected' | 'completed';

const iconSvgs: Record<IconKind, string> = {
  created: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 2h8l4 4v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill="${iconOrange}"/><path d="M14 2v4h4z" fill="#B96324"/><rect x="8" y="11" width="8" height="1.6" rx="0.8" fill="#fff"/><rect x="8" y="14.4" width="8" height="1.6" rx="0.8" fill="#fff"/></svg>`,
  emailed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" fill="${iconBlue}"/><path d="M4 8l8 5.5L20 8" stroke="#fff" stroke-width="1.6" fill="none" stroke-linejoin="round"/></svg>`,
  viewed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 5C6.5 5 3 12 3 12s3.5 7 9 7 9-7 9-7-3.5-7-9-7z" fill="${iconOrange}"/><circle cx="12" cy="12" r="3" fill="#fff"/></svg>`,
  signed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 20l3.5-.7L18.3 8.5l-2.8-2.8L4.7 16.5z" fill="${iconGreen}"/><path d="M15.5 5.7l2.8 2.8 1.4-1.4a1 1 0 0 0 0-1.4l-1.4-1.4a1 1 0 0 0-1.4 0z" fill="#1B5E20"/></svg>`,
  rejected: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${iconRed}"/><path d="M8 8l8 8M16 8l-8 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  completed: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="${iconGreen}"/><path d="M7 12.2l3.3 3.3L17 8.8" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

const fmtDateTime = (date: Date) =>
  DateTime.fromJSDate(date).setZone('utc').toFormat('yyyy-MM-dd HH:mm:ss') + ' (UTC)';

const fmtDate = (date: Date) => DateTime.fromJSDate(date).setZone('utc').toFormat('yyyy-MM-dd');

const displayName = (recipient: { name: string; email: string }) =>
  recipient.name ? `${recipient.name} (${recipient.email})` : recipient.email;

type TimelineEvent = {
  date: Date;
  icon: IconKind;
  title: string;
  meta: string;
};

const buildTimelineEvents = (options: {
  recipients: CertificateRecipient[];
  envelopeOwner: { name: string; email: string };
  documentCreatedAt: Date;
}): TimelineEvent[] => {
  const { recipients, envelopeOwner, documentCreatedAt } = options;

  const events: TimelineEvent[] = [];

  // Document created.
  events.push({
    date: documentCreatedAt,
    icon: 'created',
    title: `${displayName(envelopeOwner)} 已建立文件 · Created the document`,
    meta: fmtDateTime(documentCreatedAt),
  });

  let latestCompletedAt: Date | null = null;
  let anyRejected = false;

  for (const recipient of recipients) {
    const who = displayName(recipient);

    if (recipient.logs.emailed) {
      events.push({
        date: recipient.logs.emailed.createdAt,
        icon: 'emailed',
        title: `已通过电子邮件发送给 ${who} 进行签署 · Emailed for signing`,
        meta: fmtDateTime(recipient.logs.emailed.createdAt),
      });
    }

    if (recipient.logs.opened) {
      events.push({
        date: recipient.logs.opened.createdAt,
        icon: 'viewed',
        title: `${who} 已查看文件 · Viewed the document`,
        meta:
          fmtDateTime(recipient.logs.opened.createdAt) +
          (recipient.logs.opened.ipAddress ? ` · IP: ${recipient.logs.opened.ipAddress}` : ''),
      });
    }

    if (recipient.logs.rejected) {
      anyRejected = true;
      events.push({
        date: recipient.logs.rejected.createdAt,
        icon: 'rejected',
        title: `${who} 已拒绝签署 · Rejected the document`,
        meta:
          fmtDateTime(recipient.logs.rejected.createdAt) +
          (recipient.logs.rejected.ipAddress ? ` · IP: ${recipient.logs.rejected.ipAddress}` : '') +
          (recipient.rejectionReason ? ` · 原因/Reason: ${recipient.rejectionReason}` : ''),
      });
    } else if (recipient.logs.completed) {
      const at = recipient.logs.completed.createdAt;

      if (!latestCompletedAt || at > latestCompletedAt) {
        latestCompletedAt = at;
      }

      events.push({
        date: at,
        icon: 'signed',
        title: `${who} 已对文件进行电子签署 · Electronically signed`,
        meta:
          `签名日期/Signed: ${fmtDateTime(at)}` +
          (recipient.logs.completed.ipAddress ? ` · IP: ${recipient.logs.completed.ipAddress}` : ''),
      });
    }
  }

  // Agreement completed (only when nobody rejected and at least one signature landed).
  if (!anyRejected && latestCompletedAt) {
    events.push({
      date: latestCompletedAt,
      icon: 'completed',
      title: '已完成协议 · Agreement completed',
      meta: fmtDateTime(latestCompletedAt),
    });
  }

  // Chronological order; ties keep insertion order (created before its own emails).
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => a.event.date.getTime() - b.event.date.getTime() || a.index - b.index)
    .map(({ event }) => event);
};

const ellipsize = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

export async function renderCertificate({
  recipients,
  envelopeId,
  documentTitle,
  documentCreatedAt,
  qrToken,
  hidePoweredBy,
  envelopeOwner,
  pageWidth,
  pageHeight,
}: Omit<GenerateCertificateOptions, 'i18n'> & { i18n?: I18n }) {
  ensureFontLibrary();

  const frameInset = 22;
  const padX = 46;
  const padTop = 44;
  const padBottom = 40;
  const contentX = padX;
  const contentWidth = pageWidth - padX * 2;

  // Rasterise icons + Xenvera logo once.
  const iconImages = {} as Record<IconKind, HTMLImageElement | null>;

  for (const kind of Object.keys(iconSvgs) as IconKind[]) {
    try {
      const png = await svgToPng(iconSvgs[kind]);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      iconImages[kind] = new SkiaImage(png) as unknown as HTMLImageElement;
    } catch {
      iconImages[kind] = null;
    }
  }

  let logoImage: HTMLImageElement | null = null;

  try {
    const svg = fs.readFileSync(path.join(process.cwd(), 'public/xenvera.svg'), 'utf8');
    const png = await svgToPng(svg);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    logoImage = new SkiaImage(png) as unknown as HTMLImageElement;
  } catch {
    logoImage = null;
  }

  const anyRejected = recipients.some((recipient) => recipient.logs.rejected);
  const statusText = anyRejected ? '已拒签 · Rejected' : '已签署 · Signed';

  const events = buildTimelineEvents({ recipients, envelopeOwner, documentCreatedAt });

  // Page frame.
  const buildFrame = () =>
    new Konva.Rect({
      x: frameInset,
      y: frameInset,
      width: pageWidth - frameInset * 2,
      height: pageHeight - frameInset * 2,
      stroke: brandNavy,
      strokeWidth: 1.5,
      cornerRadius: 6,
    });

  // Header + document details (page 1 only). Returns the y where the timeline
  // can start.
  const buildHeader = (group: Konva.Group) => {
    const title = new Konva.Text({
      x: contentX,
      y: padTop,
      text: ellipsize(documentTitle || envelopeId, 48),
      width: contentWidth - 130,
      fontFamily: fontStack,
      fontSize: 20,
      fontStyle: '700',
      fill: brandNavy,
      wrap: 'none',
      ellipsis: true,
    });
    group.add(title);

    group.add(
      new Konva.Text({
        x: contentX,
        y: padTop + 28,
        text: '最终稽核报告 · Final Audit Report',
        fontFamily: fontStack,
        fontSize: 10,
        fontStyle: fontMedium,
        fill: textMuted,
      }),
    );

    group.add(
      new Konva.Text({
        x: contentX,
        y: padTop + 2,
        width: contentWidth,
        align: 'right',
        text: fmtDate(documentCreatedAt),
        fontFamily: fontStack,
        fontSize: 11,
        fill: textMuted,
      }),
    );

    // Details box.
    const boxY = padTop + 56;
    const boxPad = 14;
    const rowH = 20;
    const labelW = 96;

    const rows: [string, string][] = [
      ['建立日期 · Created', fmtDate(documentCreatedAt)],
      ['作者 · Author', displayName(envelopeOwner)],
      ['状态 · Status', statusText],
      ['交易 ID · Transaction ID', envelopeId],
    ];

    const boxHeight = boxPad * 2 + rowH * rows.length;

    group.add(
      new Konva.Rect({
        x: contentX,
        y: boxY,
        width: contentWidth,
        height: boxHeight,
        fill: detailsBg,
        stroke: detailsBorder,
        strokeWidth: 1,
        cornerRadius: 6,
      }),
    );

    rows.forEach(([label, value], index) => {
      const rowY = boxY + boxPad + index * rowH;

      group.add(
        new Konva.Text({
          x: contentX + boxPad,
          y: rowY,
          width: labelW,
          text: label,
          fontFamily: fontStack,
          fontSize: 9,
          fontStyle: fontMedium,
          fill: textMuted,
        }),
      );
      group.add(
        new Konva.Text({
          x: contentX + boxPad + labelW,
          y: rowY,
          width: contentWidth - boxPad * 2 - labelW,
          text: value,
          fontFamily: fontStack,
          fontSize: 9,
          fill: textForeground,
          wrap: 'char',
        }),
      );
    });

    // Section title for the activity log.
    const sectionY = boxY + boxHeight + 26;

    group.add(
      new Konva.Text({
        x: contentX,
        y: sectionY,
        text: `「${ellipsize(documentTitle || envelopeId, 30)}」操作记录 · Activity`,
        fontFamily: fontStack,
        fontSize: 13,
        fontStyle: '700',
        fill: brandNavy,
      }),
    );

    return sectionY + 26;
  };

  // A single timeline event (icon + title + meta). Returns its group and height.
  const buildEvent = (event: TimelineEvent) => {
    const g = new Konva.Group();
    const iconSize = 16;
    const textX = iconSize + 12;
    const textW = contentWidth - textX;

    const icon = iconImages[event.icon];

    if (icon) {
      g.add(
        new Konva.Image({
          image: icon,
          x: 0,
          y: 0,
          width: iconSize,
          height: iconSize,
        }),
      );
    }

    const title = new Konva.Text({
      x: textX,
      y: 0,
      width: textW,
      text: event.title,
      fontFamily: fontStack,
      fontSize: 10,
      fontStyle: fontMedium,
      fill: textForeground,
      wrap: 'word',
      lineHeight: 1.3,
    });
    g.add(title);

    g.add(
      new Konva.Text({
        x: textX,
        y: title.getClientRect().height + 3,
        width: textW,
        text: event.meta,
        fontFamily: fontStack,
        fontSize: 8,
        fill: textMuted,
        wrap: 'word',
        lineHeight: 1.3,
      }),
    );

    return g;
  };

  const buildFooterBranding = async () => {
    const group = new Konva.Group();

    const qrSize = qrToken ? 68 : 0;

    if (qrToken) {
      const qrSvg = renderSVG(`${NEXT_PUBLIC_WEBAPP_URL()}/share/${qrToken}`, { ecc: 'Q' });
      const qrPng = await svgToPng(qrSvg);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const qrImage = new SkiaImage(qrPng) as unknown as HTMLImageElement;

      group.add(
        new Konva.Image({
          image: qrImage,
          x: contentWidth - qrSize,
          y: 0,
          width: qrSize,
          height: qrSize,
        }),
      );
    }

    // Xenvera logo + provider text, bottom-left.
    const logoY = qrSize > 0 ? qrSize - 26 : 0;

    if (logoImage) {
      const logoH = 26;
      const logoW = logoH * (logoImage.width / logoImage.height);

      group.add(
        new Konva.Image({
          image: logoImage,
          x: 0,
          y: logoY,
          width: logoW,
          height: logoH,
        }),
      );
      group.add(
        new Konva.Text({
          x: logoW + 10,
          y: logoY + 8,
          text: '由 Xenvera Innovation (HK) Limited 提供',
          fontFamily: fontStack,
          fontSize: 8,
          fontStyle: fontMedium,
          fill: textMuted,
        }),
      );
    }

    return { group, height: Math.max(qrSize, 26) };
  };

  // ---- Paginate the timeline ----
  const eventGap = 15;

  // Build all event groups once to measure heights.
  const eventGroups = events.map((event) => {
    const group = buildEvent(event);

    return { group, height: group.getClientRect().height };
  });

  const footer = await buildFooterBranding();
  const footerBlockHeight = hidePoweredBy ? 0 : footer.height + 24;

  // Page 1 has header; measure its consumed height with a scratch group.
  const scratch = new Konva.Group();
  const firstTimelineY = buildHeader(scratch);
  scratch.destroy();

  const usableBottom = pageHeight - padBottom;

  // Group events into pages.
  const pagesOfEvents: { group: Konva.Group; height: number }[][] = [[]];
  let pageIndex = 0;
  let cursorY = firstTimelineY;

  for (const item of eventGroups) {
    // Reserve footer room on every page tail conservatively so the branding
    // block never collides with the last event.
    if (cursorY + item.height > usableBottom - footerBlockHeight && pagesOfEvents[pageIndex].length > 0) {
      pageIndex += 1;
      pagesOfEvents[pageIndex] = [];
      cursorY = padTop;
    }

    pagesOfEvents[pageIndex].push(item);
    cursorY += item.height + eventGap;
  }

  // ---- Render pages ----
  let stage: Konva.Stage | null = new Konva.Stage({ width: pageWidth, height: pageHeight });
  const pages: Uint8Array[] = [];

  for (const [index, pageEvents] of pagesOfEvents.entries()) {
    stage.destroyChildren();
    const layer = new Konva.Layer();
    const group = new Konva.Group();

    group.add(buildFrame());

    let y: number;

    if (index === 0) {
      y = buildHeader(group);
    } else {
      // Continuation header.
      group.add(
        new Konva.Text({
          x: contentX,
          y: padTop,
          text: '最终稽核报告 · Final Audit Report（续 · continued）',
          fontFamily: fontStack,
          fontSize: 12,
          fontStyle: '700',
          fill: brandNavy,
        }),
      );
      y = padTop + 28;
    }

    for (const item of pageEvents) {
      item.group.setAttrs({ x: contentX, y } satisfies Partial<Konva.GroupConfig>);
      group.add(item.group);
      y += item.height + eventGap;
    }

    // Footer branding on the last page.
    if (index === pagesOfEvents.length - 1 && !hidePoweredBy) {
      footer.group.setAttrs({
        x: contentX,
        y: pageHeight - padBottom - footer.height,
      } satisfies Partial<Konva.GroupConfig>);
      group.add(footer.group);
    }

    // Envelope ID line, bottom-left inside the frame.
    group.add(
      new Konva.Text({
        x: contentX,
        y: pageHeight - frameInset - 16,
        text: `Transaction ID: ${envelopeId}`,
        fontFamily: fontStack,
        fontSize: 7,
        fill: textMutedLight,
      }),
    );

    layer.add(group);
    stage.add(layer);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const canvas = layer.canvas._canvas as unknown as Canvas;
    const buffer = await canvas.toBuffer('pdf');
    pages.push(new Uint8Array(buffer));
  }

  stage.destroy();
  stage = null;

  return pages;
}
