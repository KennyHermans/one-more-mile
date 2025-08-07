import { useRef, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
}

export interface RichTextEditorRef {
  focus: () => void;
  blur: () => void;
  insertText: (text: string) => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, maxLength, disabled }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      blur: () => editorRef.current?.blur(),
      insertText: (text: string) => {
        if (editorRef.current) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          handleInput();
        }
      }
    }));

    const handleInput = () => {
      if (editorRef.current && !disabled) {
        const content = editorRef.current.innerHTML;
        onChange(content);
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    };

    const formatText = (command: string, value?: string) => {
      if (disabled) return;
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleInput();
    };

    const createLink = () => {
      if (disabled) return;
      const url = prompt('Enter URL:');
      if (url) {
        formatText('createLink', url);
      }
    };

    const insertList = (ordered: boolean) => {
      if (disabled) return;
      formatText(ordered ? 'insertOrderedList' : 'insertUnorderedList');
    };

    return (
      <div className={cn("border border-input rounded-md", className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
          <button
            type="button"
            onClick={() => formatText('bold')}
            disabled={disabled}
            className="p-2 rounded hover:bg-accent disabled:opacity-50"
            title="Bold"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4a1 1 0 011-1h3a3 3 0 013 3v1a3 3 0 01-1 2.236 3 3 0 112-4.236V10a3 3 0 01-3 3H6a1 1 0 01-1-1V4zm2 1v5h3a1 1 0 001-1V6a1 1 0 00-1-1H7z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={() => formatText('italic')}
            disabled={disabled}
            className="p-2 rounded hover:bg-accent disabled:opacity-50"
            title="Italic"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 2a1 1 0 011 1v1.586l-2 2V3a1 1 0 011-1zM6 7.414l7-7A1 1 0 0114.414 1L8.586 6.586 6 9.172V7.414zm8 4.172L10.414 15H14a1 1 0 001-1v-2.414zM8.586 17L2 10.414V17a1 1 0 001 1h5.586z" clipRule="evenodd" />
            </svg>
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          <button
            type="button"
            onClick={() => insertList(false)}
            disabled={disabled}
            className="p-2 rounded hover:bg-accent disabled:opacity-50"
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => insertList(true)}
            disabled={disabled}
            className="p-2 rounded hover:bg-accent disabled:opacity-50"
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={createLink}
            disabled={disabled}
            className="p-2 rounded hover:bg-accent disabled:opacity-50"
            title="Insert Link"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onPaste={handlePaste}
          className={cn(
            "min-h-[120px] p-3 focus:outline-none",
            "prose prose-sm max-w-none dark:prose-invert",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          dangerouslySetInnerHTML={{ __html: value }}
          data-placeholder={placeholder}
        />

        {maxLength && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t">
            {value.length} / {maxLength} characters
          </div>
        )}
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";