import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

const CONTENT_ROOT = path.resolve(config.media.contentRoot);

const CONTENT_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.avi': 'video/x-msvideo',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pps': 'application/vnd.ms-powerpoint',
  '.ppsx': 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.rtf': 'application/rtf',
};

// Types that play/render in the browser; everything else is sent as a download.
const INLINE_TYPES = new Set(['.mp4', '.m4v', '.mov', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.wav']);
const VIDEO_EXTS = new Set(['.mp4', '.m4v', '.mov', '.wmv', '.avi']);

export function extOf(filename) {
  return path.extname(String(filename || '')).toLowerCase();
}

export function contentTypeFor(filename) {
  return CONTENT_TYPES[extOf(filename)] || 'application/octet-stream';
}

export function isInline(filename) {
  return INLINE_TYPES.has(extOf(filename));
}

export function isVideo(filename) {
  return VIDEO_EXTS.has(extOf(filename));
}

/**
 * Resolve a course_material.filename (e.g. "uploads/Folder/clip.mp4") to an
 * absolute path inside CONTENT_ROOT, then stat it. Returns { file, size } or
 * null. Guards against path traversal — anything resolving outside CONTENT_ROOT
 * is rejected.
 */
export async function resolveContentFile(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const rel = filename.replace(/^\/+/, '');
  const abs = path.resolve(CONTENT_ROOT, rel);
  if (abs !== CONTENT_ROOT && !abs.startsWith(CONTENT_ROOT + path.sep)) return null;
  try {
    const st = await stat(abs);
    if (!st.isFile()) return null;
    return { file: abs, size: st.size };
  } catch {
    return null;
  }
}

/** Serve a file with HTTP Range support (video seeking) + correct content type. */
export function streamFile(req, reply, { file, size }, { filename, download = false } = {}) {
  const name = filename || path.basename(file);
  const type = contentTypeFor(name);
  const range = req.headers.range;

  reply.header('Accept-Ranges', 'bytes');
  reply.header('Content-Type', type);
  reply.header('Cache-Control', 'private, no-store');
  const disposition = download || !isInline(name) ? 'attachment' : 'inline';
  reply.header('Content-Disposition', `${disposition}; filename="${sanitizeName(name)}"`);

  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m) {
      let start = m[1] === '' ? null : Number(m[1]);
      let end = m[2] === '' ? null : Number(m[2]);
      if (start === null) {
        start = Math.max(0, size - (end ?? 0));
        end = size - 1;
      } else {
        end = end === null ? size - 1 : Math.min(end, size - 1);
      }
      if (start >= size || start > end) {
        reply.code(416).header('Content-Range', `bytes */${size}`);
        return reply.send();
      }
      reply.code(206);
      reply.header('Content-Range', `bytes ${start}-${end}/${size}`);
      reply.header('Content-Length', end - start + 1);
      return reply.send(createReadStream(file, { start, end }));
    }
  }
  reply.header('Content-Length', size);
  return reply.send(createReadStream(file));
}

function sanitizeName(name) {
  return path.basename(name).replace(/["\\\r\n]/g, '_');
}
