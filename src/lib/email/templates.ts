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
      <p style="font-size:12px;color:#64748b">Envoyé via <a href="${input.appUrl}">KlirBuild</a></p>
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
      <p style="font-size:12px;color:#64748b">Envoyé via <a href="${input.appUrl}">KlirBuild</a></p>
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
  return `Bonjour ${input.clientName},\n\n${input.companyName} vous envoie la soumission ${input.quoteNumber}.\nMontant: ${formatCurrency(input.total, input.currency)}\nValide jusqu'au: ${formatDate(input.validUntil)}\n\n— KlirBuild`;
}

export function invoiceEmailText(input: {
  companyName: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  dueDate: string;
}) {
  return `Bonjour ${input.clientName},\n\n${input.companyName} vous envoie la facture ${input.invoiceNumber}.\nMontant: ${formatCurrency(input.total, input.currency)}\nÉchéance: ${formatDate(input.dueDate)}\n\n— KlirBuild`;
}
