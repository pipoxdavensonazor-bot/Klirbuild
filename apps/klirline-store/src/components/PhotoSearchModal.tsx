import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { prepareVisualImage, VISUAL_COPY } from '../lib/visualSearch';

interface PhotoSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSearch: (file: File) => Promise<{ error: string | null }>;
}

export function PhotoSearchModal({ open, onClose, onSearch }: PhotoSearchModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrl = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  const clearPreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  };

  const reset = () => {
    stopCamera();
    clearPreview();
    setFile(null);
    setError('');
    setBusy(false);
  };

  useEffect(() => {
    if (!open) reset();
    return () => {
      stopCamera();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    };
    // Reset only when the dialog opens or unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const showFile = (next: File) => {
    clearPreview();
    const url = URL.createObjectURL(next);
    previewUrl.current = url;
    setFile(next);
    setPreview(url);
    setError('');
    stopCamera();
  };

  const onPick = async (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    const prepared = await prepareVisualImage(picked);
    if (!prepared.ok) {
      setError(prepared.error);
      setFile(null);
      clearPreview();
      return;
    }
    showFile(prepared.file);
  };

  const startCamera = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(VISUAL_COPY.cameraDenied);
      }
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setError(VISUAL_COPY.cameraDenied);
      stopCamera();
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError(VISUAL_COPY.cameraDenied);
      return;
    }
    const canvas = document.createElement('canvas');
    const maxEdge = 768;
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError(VISUAL_COPY.cameraDenied);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.86);
    });
    if (!blob) {
      setError(VISUAL_COPY.cameraDenied);
      return;
    }
    const snapped = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    const prepared = await prepareVisualImage(snapped);
    if (!prepared.ok) {
      setError(prepared.error);
      return;
    }
    showFile(prepared.file);
  };

  const submit = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await onSearch(file);
      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }
      reset();
      onClose();
    } catch {
      setError(VISUAL_COPY.config);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-3" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-search-title"
        className="w-full max-w-md bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 id="photo-search-title" className="font-semibold text-brand-dark">
            Rechercher par photo
          </h2>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Fermer"
            disabled={busy}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            JPEG, PNG ou WebP, 2 Mo maximum. La photo n’est pas enregistrée.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              <ImagePlus className="w-4 h-4" />
              Importer une photo
            </button>
            <button
              type="button"
              onClick={cameraOn ? capture : startCamera}
              disabled={busy}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              <Camera className="w-4 h-4" />
              {cameraOn ? 'Capturer' : 'Prendre une photo'}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              void onPick(event.target.files);
              event.target.value = '';
            }}
          />
          {cameraOn && (
            <video ref={videoRef} className="w-full rounded-lg bg-black aspect-[4/3] object-cover" playsInline muted />
          )}
          {preview && (
            <img src={preview} alt="Aperçu de la photo" className="w-full max-h-56 object-contain rounded-lg bg-gray-50 border" />
          )}
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          {busy && (
            <p className="text-sm font-medium text-brand flex items-center gap-2" role="status">
              <Loader2 className="w-4 h-4 animate-spin" />
              {VISUAL_COPY.busy}
            </p>
          )}
          <button
            type="button"
            onClick={() => { void submit(); }}
            disabled={!file || busy}
            className="w-full bg-brand hover:bg-brand-mid disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold"
          >
            Chercher des produits
          </button>
        </div>
      </div>
    </div>
  );
}
