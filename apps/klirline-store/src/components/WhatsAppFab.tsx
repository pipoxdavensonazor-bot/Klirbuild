import { MessageCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { supportWhatsAppUrl } from '../lib/whatsapp';

export function WhatsAppFab() {
  const { locale, t } = useI18n();
  return (
    <a
      href={supportWhatsAppUrl(locale)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg transition-colors"
      aria-label={t('whatsappHelp')}
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline">{t('whatsappHelp')}</span>
    </a>
  );
}
