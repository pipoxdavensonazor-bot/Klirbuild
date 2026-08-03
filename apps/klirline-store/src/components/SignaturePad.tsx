import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type SignaturePadHandle = {
  clear: () => void;
  hasInk: () => boolean;
  toFile: (name?: string) => Promise<File>;
};

type Props = {
  onChange?: (hasInk: boolean) => void;
  disabled?: boolean;
};

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { onChange, disabled },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paintBlank = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 320;
      const h = 160;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#0A1C31';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ink.current = false;
      onChange?.(false);
    };

    paintBlank();
    window.addEventListener('resize', paintBlank);
    return () => window.removeEventListener('resize', paintBlank);
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ink.current = false;
      onChange?.(false);
    },
    hasInk: () => ink.current,
    toFile: (name = 'signature.png') =>
      new Promise<File>((resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas || !ink.current) {
          reject(new Error('Signature requise'));
          return;
        }
        canvas.toBlob(b => {
          if (!b) reject(new Error('Signature invalide'));
          else resolve(new File([b], name, { type: 'image/png' }));
        }, 'image/png');
      }),
  }));

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div>
      <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          className="w-full block cursor-crosshair"
          onPointerDown={e => {
            if (disabled) return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) return;
            canvas.setPointerCapture(e.pointerId);
            drawing.current = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onPointerMove={e => {
            if (!drawing.current || disabled) return;
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            if (!ink.current) {
              ink.current = true;
              onChange?.(true);
            }
          }}
          onPointerUp={() => { drawing.current = false; }}
          onPointerCancel={() => { drawing.current = false; }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-[11px] text-gray-500">Signature du client (doigt ou souris)</p>
        <button
          type="button"
          onClick={() => ref && 'current' in (ref as object) && (ref as React.RefObject<SignaturePadHandle>).current?.clear()}
          disabled={disabled}
          className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
        >
          Effacer
        </button>
      </div>
    </div>
  );
});
