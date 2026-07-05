import { spawn } from 'node:child_process';
import { config } from '../config.js';

/**
 * Minimal mail delivery through the local MTA (postfix sendmail).
 * Plain-text + simple HTML multipart; no external dependencies.
 */
export function sendMail({ to, subject, text, html, replyTo }) {
  return new Promise((resolve, reject) => {
    const from = config.mail.from;
    const boundary = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const lines = [
      `From: ${config.mail.fromName} <${from}>`,
      `To: ${to}`,
      ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
    ];
    if (html) {
      lines.push(
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        text || '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        html,
        `--${boundary}--`,
      );
    } else {
      lines.push('Content-Type: text/plain; charset=utf-8', '', text || '');
    }

    const child = spawn('/usr/sbin/sendmail', ['-t', '-f', from], { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`sendmail exited ${code}: ${stderr}`));
    });
    child.stdin.write(lines.join('\r\n'));
    child.stdin.end('\r\n');
  });
}
