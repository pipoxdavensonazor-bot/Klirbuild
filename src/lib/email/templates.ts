import { formatCurrency, formatDate } from "@/lib/utils";

export function quoteEmailHtml(input: {
  companyName: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  currency: string;
  validUntil: string;
  appUrl: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a365d">
      <h2 style="color:#004F6E">Soumission ${input.quoteNumber}</h2>
      <p>Bonjour ${input.clientName},</p>
      <p><strong>${input.companyName}</strong> vous envoie une soumission.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Montant total</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">${formatCurrency(input.total, input.currency)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Valide jusqu'au</td>
            <td style="padding:8px;border:1px solid #e2e8f0">${formatDate(input.validUntil)}</td></tr>
      </table>
      <p>Pour toute question, répondez à ce courriel.</p>
      <p style="font-size:12px;color:#64748b">— ${input.companyName}</p>
    </div>
  `;
}

export function invoiceEmailHtml(input: {
  companyName: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: string;
  appUrl: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a365d">
      <h2 style="color:#004F6E">Facture ${input.invoiceNumber}</h2>
      <p>Bonjour ${input.clientName},</p>
      <p><strong>${input.companyName}</strong> vous envoie une facture.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Montant dû</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">${formatCurrency(input.total, input.currency)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Date d'échéance</td>
            <td style="padding:8px;border:1px solid #e2e8f0">${formatDate(input.dueDate)}</td></tr>
      </table>
      <p>Merci de procéder au paiement avant la date d'échéance.</p>
      <p style="font-size:12px;color:#64748b">— ${input.companyName}</p>
    </div>
  `;
}

export function quoteEmailText(input: {
  companyName: string;
  clientName: string;
  quoteNumber: string;
  total: number;
  currency: string;
  validUntil: string;
}) {
  return `Bonjour ${input.clientName},\n\n${input.companyName} vous envoie la soumission ${input.quoteNumber}.\nMontant: ${formatCurrency(input.total, input.currency)}\nValide jusqu'au: ${formatDate(input.validUntil)}\n\n— ${input.companyName}`;
}

export function invoiceEmailText(input: {
  companyName: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: string;
}) {
  return `Bonjour ${input.clientName},\n\n${input.companyName} vous envoie la facture ${input.invoiceNumber}.\nMontant: ${formatCurrency(input.total, input.currency)}\nÉchéance: ${formatDate(input.dueDate)}\n\n— ${input.companyName}`;
}

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: "Administrateur",
  MANAGER: "Gestionnaire",
  EMPLOYEE: "Employé",
};

export function inviteEmailHtml(input: {
  companyName: string;
  inviteUrl: string;
  role: string;
  invitedByEmail: string;
  expiresAt: string;
  appUrl: string;
}) {
  const roleLabel = ROLE_LABELS[input.role] ?? input.role;
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a365d">
      <h2 style="color:#004F6E">Invitation — ${input.companyName}</h2>
      <p>Bonjour,</p>
      <p><strong>${input.invitedByEmail}</strong> vous invite à rejoindre <strong>${input.companyName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Rôle</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">${roleLabel}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Expire le</td>
            <td style="padding:8px;border:1px solid #e2e8f0">${formatDate(input.expiresAt)}</td></tr>
      </table>
      <p style="margin:24px 0">
        <a href="${input.inviteUrl}" style="display:inline-block;background:#004F6E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
          Accepter l'invitation
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">Ou copiez ce lien :<br><a href="${input.inviteUrl}">${input.inviteUrl}</a></p>
      <p style="font-size:12px;color:#64748b">— ${input.companyName}</p>
    </div>
  `;
}

export function inviteEmailText(input: {
  companyName: string;
  inviteUrl: string;
  role: string;
  invitedByEmail: string;
  expiresAt: string;
}) {
  const roleLabel = ROLE_LABELS[input.role] ?? input.role;
  return `Bonjour,\n\n${input.invitedByEmail} vous invite à rejoindre ${input.companyName}.\n\nRôle: ${roleLabel}\nExpire le: ${formatDate(input.expiresAt)}\n\nAcceptez l'invitation ici:\n${input.inviteUrl}\n\n— ${input.companyName}`;
}

export function receiptEmailHtml(input: {
  companyName: string;
  clientName: string;
  amount: number;
  currency: string;
  invoiceNumber?: string;
  projectName?: string;
  method: string;
  paidAt: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a365d">
      <h2 style="color:#004F6E">Reçu de paiement</h2>
      <p>Bonjour ${input.clientName},</p>
      <p><strong>${input.companyName}</strong> confirme la réception de votre paiement.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Montant reçu</td>
            <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">${formatCurrency(input.amount, input.currency)}</td></tr>
        ${input.invoiceNumber ? `<tr><td style="padding:8px;border:1px solid #e2e8f0">Facture</td><td style="padding:8px;border:1px solid #e2e8f0">${input.invoiceNumber}</td></tr>` : ""}
        ${input.projectName ? `<tr><td style="padding:8px;border:1px solid #e2e8f0">Projet</td><td style="padding:8px;border:1px solid #e2e8f0">${input.projectName}</td></tr>` : ""}
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Mode</td>
            <td style="padding:8px;border:1px solid #e2e8f0">${input.method}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0">Date</td>
            <td style="padding:8px;border:1px solid #e2e8f0">${formatDate(input.paidAt)}</td></tr>
      </table>
      <p>Merci pour votre confiance.</p>
      <p style="font-size:12px;color:#64748b">— ${input.companyName}</p>
    </div>
  `;
}

export function receiptEmailText(input: {
  companyName: string;
  clientName: string;
  amount: number;
  currency: string;
  invoiceNumber?: string;
  projectName?: string;
  method: string;
  paidAt: string;
}) {
  return `Bonjour ${input.clientName},\n\n${input.companyName} confirme la réception de ${formatCurrency(input.amount, input.currency)}.\n${input.invoiceNumber ? `Facture: ${input.invoiceNumber}\n` : ""}${input.projectName ? `Projet: ${input.projectName}\n` : ""}Mode: ${input.method}\nDate: ${formatDate(input.paidAt)}\n\nMerci.\n— ${input.companyName}`;
}
