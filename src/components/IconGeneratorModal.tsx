import React, { useRef, useState, useEffect } from 'react';
import { X, RefreshCw, Upload, Check, Sparkles } from 'lucide-react';

interface IconGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (dataUrl: string) => void;
  initialName: string;
  initialColor: string;
}

export const IconGeneratorModal: React.FC<IconGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
  initialName,
  initialColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState<string>(initialName.slice(0, 2).toUpperCase() || 'AP');
  const [bgColor, setBgColor] = useState<string>(initialColor || '#1e293b');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [shape, setShape] = useState<'squircle' | 'circle' | 'square'>('squircle');
  const [symbol, setSymbol] = useState<'none' | 'globe' | 'mobile' | 'code' | 'bolt'>('none');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialName) {
      const initials = initialName
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      setText(initials || initialName.slice(0, 2).toUpperCase());
    }
  }, [initialName]);

  useEffect(() => {
    drawIcon();
  }, [text, bgColor, textColor, shape, symbol, uploadedImage]);

  const drawIcon = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 512;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    // If custom image uploaded, draw it clipped to shape
    if (uploadedImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        clipShape(ctx, size, shape);
        ctx.drawImage(img, 0, 0, size, size);
        ctx.restore();
      };
      img.src = uploadedImage;
      return;
    }

    // Background shape
    ctx.save();
    clipShape(ctx, size, shape);

    // Create subtle linear gradient
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, adjustColor(bgColor, -35));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle inner border glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Render Center Icon / Text
    if (symbol !== 'none') {
      ctx.fillStyle = textColor;
      drawSymbol(ctx, symbol, size / 2, size / 2, 140);
      if (text) {
        ctx.font = 'bold 56px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, size / 2, size - 85);
      }
    } else {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 180px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, size / 2, size / 2 + 10);
    }

    ctx.restore();
  };

  const clipShape = (ctx: CanvasRenderingContext2D, size: number, currentShape: 'squircle' | 'circle' | 'square') => {
    ctx.beginPath();
    if (currentShape === 'circle') {
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    } else if (currentShape === 'squircle') {
      const r = 110;
      ctx.roundRect(8, 8, size - 16, size - 16, r);
    } else {
      ctx.rect(8, 8, size - 16, size - 16);
    }
    ctx.clip();
  };

  const drawSymbol = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, rad: number) => {
    ctx.beginPath();
    if (s === 'globe') {
      ctx.arc(x, y - 20, rad / 2, 0, Math.PI * 2);
      ctx.lineWidth = 14;
      ctx.strokeStyle = textColor;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y - 20, rad / 4, rad / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - rad / 2, y - 20);
      ctx.lineTo(x + rad / 2, y - 20);
      ctx.stroke();
    } else if (s === 'mobile') {
      ctx.roundRect(x - 50, y - 90, 100, 150, 18);
      ctx.lineWidth = 12;
      ctx.strokeStyle = textColor;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + 36, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (s === 'bolt') {
      ctx.moveTo(x + 10, y - 80);
      ctx.lineTo(x - 45, y - 10);
      ctx.lineTo(x + 5, y - 10);
      ctx.lineTo(x - 10, y + 70);
      ctx.lineTo(x + 45, y);
      ctx.lineTo(x - 5, y);
      ctx.closePath();
      ctx.fill();
    } else if (s === 'code') {
      ctx.font = 'bold 120px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('</>', x, y - 15);
    }
  };

  const adjustColor = (col: string, amt: number) => {
    let usePound = false;
    if (col[0] === '#') {
      col = col.slice(1);
      usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00ff) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000ff) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSelectIcon(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-slate-100">Android App Icon Studio</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Canvas Preview Area */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <canvas ref={canvasRef} className="w-44 h-44 shadow-xl rounded-2xl" />
            <span className="text-xs text-slate-500 mt-4">Generates 512x512 Master Icon (HD)</span>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <label className="text-xs font-medium text-slate-400">Icon Monogram (1-2 chars)</label>
              <input
                type="text"
                maxLength={3}
                value={text}
                onChange={(e) => {
                  setUploadedImage(null);
                  setText(e.target.value.toUpperCase());
                }}
                className="mt-1 w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-400">Background</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => {
                      setUploadedImage(null);
                      setBgColor(e.target.value);
                    }}
                    className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs text-slate-400 font-mono">{bgColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Shape</label>
                <select
                  value={shape}
                  onChange={(e) => setShape(e.target.value as any)}
                  className="mt-1 w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="squircle">Squircle (Android)</option>
                  <option value="circle">Round</option>
                  <option value="square">Square</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">Badge Symbol</label>
              <div className="grid grid-cols-5 gap-1.5 mt-1">
                {(['none', 'globe', 'mobile', 'bolt', 'code'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setSymbol(s);
                    }}
                    className={`px-2 py-1.5 rounded-md text-xs font-medium capitalize border transition-colors ${
                      symbol === s
                        ? 'border-sky-500 bg-sky-950/60 text-sky-300'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Custom Image (PNG/JPG)
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
          >
            <Check className="w-4 h-4" />
            Apply App Icon
          </button>
        </div>
      </div>
    </div>
  );
};
