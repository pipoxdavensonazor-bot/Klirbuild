import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, Loader2, Upload, X } from 'lucide-react';
import { resolveKycUrl, uploadKycDocument, type KycDocType } from '../lib/kyc-upload';

interface DocUploadFieldProps {
  label: string;
  hint?: string;
  required?: boolean;
  docType: KycDocType;
  value: string;
  onChange: (storagePath: string) => void;
  capture?: 'user' | 'environment';
  acceptPdf?: boolean;
}

export function DocUploadField({
  label,
  hint,
  required,
  docType,
  value,
  onChange,
  capture,
  acceptPdf = true,
}: DocUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!value) {
        setPreview(null);
        return;
      }
      const url = await resolveKycUrl(value);
      if (!cancelled) setPreview(url);
    })();
    return () => { cancelled = true; };
  }, [value]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const path = await uploadKycDocument(docType, file);
      onChange(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’envoi');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => {
    onChange('');
    setPreview(null);
    setError('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}

      {preview ? (
        <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
          {preview.toLowerCase().includes('.pdf') || value.endsWith('.pdf') ? (
            <div className="p-4 text-sm text-gray-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Document PDF envoyé
            </div>
          ) : (
            <img src={preview} alt={label} className="w-full h-36 object-cover" />
          )}
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
            aria-label="Supprimer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 bg-green-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Envoyé
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.setAttribute('capture', capture || 'environment');
                inputRef.current.click();
              }
            }}
            className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 hover:border-brand rounded-xl py-5 px-2 text-sm font-medium text-gray-700 hover:bg-brand-50 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin text-brand" /> : <Camera className="w-5 h-5 text-brand" />}
            Prendre une photo
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.removeAttribute('capture');
                inputRef.current.click();
              }
            }}
            className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 hover:border-brand rounded-xl py-5 px-2 text-sm font-medium text-gray-700 hover:bg-brand-50 transition-colors disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin text-brand" /> : <Upload className="w-5 h-5 text-brand" />}
            Choisir un fichier
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptPdf ? 'image/*,application/pdf' : 'image/*'}
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
