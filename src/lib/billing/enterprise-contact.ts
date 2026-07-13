import { hasDatabase } from "@/lib/auth/auth-service";
import { sendEmail } from "@/lib/email/email-service";
import { prisma } from "@/lib/db";

export function enterpriseSalesInbox() {
  return (
    process.env.ENTERPRISE_CONTACT_EMAIL?.trim() ||
    process.env.KLIRLINE_SALES_EMAIL?.trim() ||
    "Contact@klirline.ca"
  );
}

export async function sendEnterpriseInquiry(input: {
  companyId: string;
  requesterEmail: string;
  companyName: string;
  subject: string;
  message: string;
}) {
  const companyName = input.companyName.trim();
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!companyName || !subject || !message) {
    return { error: "Tous les champs sont requis." as const };
  }

  let requesterName = input.requesterEmail;
  if (hasDatabase()) {
    const user = await prisma.user.findUnique({
      where: { email: input.requesterEmail },
      select: { name: true, email: true },
    });
    if (user?.name) requesterName = user.name;
  }

  const to = enterpriseSalesInbox();
  const emailSubject = `[KlirBuild Enterprise] ${subject}`;
  const text = [
    "Nouvelle demande de plan Enterprise",
    "",
    `Entreprise : ${companyName}`,
    `Contact : ${requesterName} <${input.requesterEmail}>`,
    "",
    "Message :",
    message,
  ].join("\n");

  const html = `
    <h2>Demande plan Enterprise — KlirBuild</h2>
    <p><strong>Entreprise :</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Contact :</strong> ${escapeHtml(requesterName)} &lt;${escapeHtml(input.requesterEmail)}&gt;</p>
    <p><strong>Objet :</strong> ${escapeHtml(subject)}</p>
    <hr />
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;

  const sent = await sendEmail({
    companyId: input.companyId,
    to,
    subject: emailSubject,
    html,
    text,
  });

  if ("error" in sent && sent.error) return { error: sent.error as string };
  if ("simulated" in sent && sent.simulated) {
    return {
      error: "Envoi automatique indisponible — configurez RESEND_API_KEY sur Netlify.",
    };
  }

  return { ok: true as const, to };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
