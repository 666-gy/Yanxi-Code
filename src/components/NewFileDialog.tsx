import { useState } from 'react';
import { X, FilePlus } from 'lucide-react';
import { useStore } from '../store/useStore';

export function NewFileDialog() {
  const { newFileDialogOpen, closeNewFileDialog, createNewFile } = useStore();
  const [fileName, setFileName] = useState('');

  if (!newFileDialogOpen) return null;

  const handleCreate = async () => {
    if (fileName.trim()) {
      await createNewFile(fileName.trim());
      setFileName('');
      closeNewFileDialog();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') closeNewFileDialog();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-cyber-950/80 backdrop-blur-sm animate-fade-in"
        onClick={closeNewFileDialog}
      />
      
      <div className="relative w-[400px] bg-cyber-800 rounded-xl border border-cyber-600 shadow-2xl overflow-hidden animate-slide-in-up">
        <div className="h-12 border-b border-cyber-700 flex items-center justify-between px-5">
          <h2 className="text-base font-semibold text-scholar-text flex items-center gap-2">
            <FilePlus size={18} className="text-amber-400" />
            新建文件
          </h2>
          <button
            onClick={closeNewFileDialog}
            className="p-1.5 rounded-md hover:bg-cyber-700 transition-colors text-scholar-muted hover:text-scholar-text"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <label className="text-xs text-scholar-muted block mb-1.5">文件名</label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如: main.py, app.js"
            autoFocus
            className="w-full px-3 py-2 bg-cyber-900 border border-cyber-600 rounded-lg text-sm text-scholar-text placeholder-scholar-subtle focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
          />
          <p className="text-xs text-scholar-subtle mt-2">
            支持的语言: .py, .js, .ts, .html, .css, .java, .cpp, .c, .md, .txt
          </p>
        </div>

        <div className="h-12 border-t border-cyber-700 flex items-center justify-end gap-3 px-5">
          <button
            onClick={closeNewFileDialog}
            className="px-3 py-1.5 rounded-lg text-sm text-scholar-muted hover:text-scholar-text hover:bg-cyber-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!fileName.trim()}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-cyber-950 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}