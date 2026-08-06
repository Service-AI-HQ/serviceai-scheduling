import { createSign } from "node:crypto";
import type { Transport } from "nodemailer";
import type MailMessage from "nodemailer/lib/mailer/mail-message";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

type SentMessageInfo = {
  messageId?: string;
  envelope?: ReturnType<MailMessage["message"]["getEnvelope"]>;
  accepted?: string[];
  rejected?: string[];
};

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(
  clientEmail: string,
  privateKey: string,
  impersonate: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      sub: impersonate,
      scope: GMAIL_SEND_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(privateKey));
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Gmail service account token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Nodemailer transport that sends through the Gmail API using a Google
 * service account with domain-wide delegation. Avoids SMTP entirely, so the
 * narrow gmail.send scope is sufficient and no app passwords are needed.
 */
export function createGmailServiceAccountTransport(
  keyJson: string,
  impersonate: string
): Transport<SentMessageInfo> {
  const key = JSON.parse(keyJson) as { client_email: string; private_key: string };
  return {
    name: "GmailServiceAccountTransport",
    version: "1.0.0",
    send(mail: MailMessage<SentMessageInfo>, callback: (err: Error | null, info: SentMessageInfo) => void) {
      // Bcc headers are stripped by nodemailer at build time unless keepBcc is
      // set; the property exists at runtime but is missing from MimeNode types.
      (mail.message as unknown as { keepBcc: boolean }).keepBcc = true;
      mail.message.build((buildErr: Error | null, message: Buffer) => {
        if (buildErr) return callback(buildErr, {});
        getAccessToken(key.client_email, key.private_key, impersonate)
          .then(async (token) => {
            const res = await fetch(GMAIL_SEND_URL, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ raw: base64url(message) }),
            });
            if (!res.ok) {
              throw new Error(`Gmail API send failed: ${res.status} ${await res.text()}`);
            }
            const data = (await res.json()) as { id: string };
            callback(null, {
              messageId: data.id,
              envelope: mail.message.getEnvelope(),
              accepted: [],
              rejected: [],
            });
          })
          .catch((err: Error) => callback(err, {}));
      });
    },
  };
}
