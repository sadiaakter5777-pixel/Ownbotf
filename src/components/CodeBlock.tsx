import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ children, className }) => {
  const [copied, setCopied] = useState(false);
  
  // Extract the code string from children
  const code = String(children).replace(/\n$/, '');
  const language = className?.replace('language-', '') || 'text';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-4 rounded-lg overflow-hidden border border-[#00FF41]/20 bg-[#050505]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0A0A0A] border-b border-[#00FF41]/10">
        <span className="text-[10px] font-mono text-[#00FF41]/40 uppercase tracking-widest">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-[#00FF41]/60 hover:text-[#00FF41] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              COPIED
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              COPY_CODE
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto custom-scrollbar">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
};
