import React, { useRef, useState } from 'react';
import { Upload, Camera, FileText, X, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface FilePickerProps {
  onFileSelect: (url: string) => void;
  onClear: () => void;
  label?: string;
  initialUrl?: string;
}

export const FilePicker: React.FC<FilePickerProps> = ({ onFileSelect, onClear, label, initialUrl }) => {
  const [preview, setPreview] = useState<string | null>(initialUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // In a real app, we would upload to Firebase Storage here
    // For this demo, we'll convert to base64 or object URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onFileSelect(base64);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onClear();
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {label}
        </label>
      )}
      
      <div className="flex gap-2">
        {preview ? (
          <div className="relative group w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center overflow-hidden">
              {preview.startsWith('data:image/') ? (
                <img src={preview} alt="Document" className="w-full h-full object-cover" />
              ) : (
                <FileText size={20} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">Documento Anexado</p>
              <p className="text-[8px] text-emerald-500 font-bold flex items-center gap-0.5">
                <CheckCircle2 size={8} /> PRONTO PARA SALVAR
              </p>
            </div>
            <button 
              type="button"
              onClick={clearFile}
              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <Upload size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Upload Arquivo</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <Camera size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Tirar Foto</span>
            </button>
          </>
        )}
      </div>

      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*,application/pdf"
        className="hidden" 
        onChange={handleFileChange}
      />
      
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*"
        capture="environment"
        className="hidden" 
        onChange={handleFileChange}
      />
      
      {uploading && (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Processando...</span>
        </div>
      )}
    </div>
  );
};
