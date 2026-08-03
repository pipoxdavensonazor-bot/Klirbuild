import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, Loader2, RefreshCw, X } from 'lucide-react';
import { resolveKycUrl, uploadKycDocument } from '../lib/kyc-upload';

interface SelfieCaptureFieldProps {
  label?: string;
  hint?: string;
  required?: boolean;
  value: string;
  onChange: (storagePath: string) => void;
}

/**
 * Live front-camera selfie for vendor KYC.
 * Gallery / file picker is intentionally disabled — seller must capture in-app.
 */
export function SelfieCaptureField({
  label = 'Selfie de vérification',
  hint = 'Tenez votre pièce d’identité à côté de votre visage. La caméra frontale s’ouvre automatiquement.',
  required = true,
  value,
  onChange,
}: SelfieCaptureFieldProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
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
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setError('');
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Caméra non supportée sur cet appareil. Utilisez Chrome ou Safari sur mobile.');
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraOn(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Autorisez l’accès à la caméra pour prendre votre selfie de vérification.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('Aucune caméra trouvée. Réessayez sur un téléphone avec caméra frontale.');
      } else {
        setError(e instanceof Error ? e.message : 'Impossible d’ouvrir la caméra.');
      }
      stopCamera();
    } finally {
      setStarting(false);
    }
  };

  const captureAndUpload = async () => {
    const video = videoRef.current;
    if (!video || !cameraOn) return;
    setError('');
    setUploading(true);
    try {
      const w = video.videoWidth || 720;
      const h = video.videoHeight || 960;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Capture impossible.');
      // Mirror like a selfie preview
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, w, h);

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85),
      );
      if (!blob) throw new Error('Échec de la capture.');

      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const path = await uploadKycDocument('selfie', file);
      onChange(path);
      stopCamera();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’envoi du selfie.');
    } finally {
      setUploading(false);
    }
  };

  const clear = () => {
    onChange('');
    setPreview(null);
    setError('');
    stopCamera();
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}

      {preview && !cameraOn ? (
        <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
          <img src={preview} alt="Selfie vérification" className="w-full h-56 object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
            aria-label="Supprimer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 bg-green-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Selfie vérifié (envoyé)
          </div>
          <button
            type="button"
            onClick={() => {
              clear();
              void startCamera();
            }}
            className="absolute bottom-2 right-2 bg-white/95 text-brand text-xs font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reprendre
          </button>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-brand/40 bg-brand-50/40 overflow-hidden">
          <div className="relative bg-black aspect-[3/4] max-h-72 mx-auto">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover ${cameraOn ? 'block' : 'hidden'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/90 px-4 text-center">
                <Camera className="w-10 h-10 text-accent" />
                <p className="text-sm font-medium">Selfie obligatoire avec pièce d’identité</p>
                <p className="text-xs text-white/70">Visage + document lisible dans le cadre</p>
              </div>
            )}
            {cameraOn && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-hidden
              >
                <div className="w-[58%] max-w-[220px] aspect-[3/4] rounded-[45%] border-2 border-accent/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}
          </div>

          <div className="p-3 flex flex-col gap-2">
            {!cameraOn ? (
              <button
                type="button"
                disabled={starting}
                onClick={() => void startCamera()}
                className="w-full flex items-center justify-center gap-2 bg-brand text-white font-semibold text-sm py-3 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {starting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                Ouvrir la caméra frontale
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={stopCamera}
                  className="py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void captureAndUpload()}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-accent text-brand-dark font-semibold text-sm hover:brightness-95 disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  Prendre le selfie
                </button>
              </div>
            )}
            <p className="text-[11px] text-gray-500 text-center">
              Pas de photo depuis la galerie — capture live uniquement.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
