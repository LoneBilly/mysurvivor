import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, Link, Heading1, Heading2, List, ListOrdered, Quote, Code } from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onContentChange: (value: string) => void;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ textareaRef, onContentChange }) => {
  const applyStyle = (syntax: string, placeholder: string, isBlock = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = selectedText || placeholder;

    let newText;
    if (isBlock) {
      newText = `${syntax} ${textToInsert}`;
    } else {
      newText = `${syntax}${textToInsert}${syntax}`;
    }
    
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    onContentChange(`${before}${newText}${after}`);

    textarea.focus();
    setTimeout(() => {
      if (selectedText) {
        textarea.setSelectionRange(start + syntax.length, start + syntax.length + textToInsert.length);
      } else {
        textarea.setSelectionRange(start + syntax.length, start + syntax.length + placeholder.length);
      }
    }, 0);
  };

  const applyLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || 'texte du lien';
    const url = prompt("Entrez l'URL du lien :", "https://");

    if (url) {
      const newText = `[${selectedText}](${url})`;
      const before = textarea.value.substring(0, start);
      const after = textarea.value.substring(end);
      onContentChange(`${before}${newText}${after}`);
      textarea.focus();
      setTimeout(() => {
        textarea.setSelectionRange(start + 1, start + 1 + selectedText.length);
      }, 0);
    }
  };

  const buttons = [
    { icon: Bold, onClick: () => applyStyle('**', 'texte en gras'), label: 'Gras' },
    { icon: Italic, onClick: () => applyStyle('*', 'texte en italique'), label: 'Italique' },
    { icon: Strikethrough, onClick: () => applyStyle('~~', 'texte barré'), label: 'Barré' },
    { icon: Link, onClick: applyLink, label: 'Lien' },
    { icon: Heading1, onClick: () => applyStyle('#', 'Titre 1', true), label: 'Titre 1' },
    { icon: Heading2, onClick: () => applyStyle('##', 'Titre 2', true), label: 'Titre 2' },
    { icon: List, onClick: () => applyStyle('-', 'Élément de liste', true), label: 'Liste' },
    { icon: ListOrdered, onClick: () => applyStyle('1.', 'Élément de liste', true), label: 'Liste ordonnée' },
    { icon: Quote, onClick: () => applyStyle('>', 'Citation', true), label: 'Citation' },
    { icon: Code, onClick: () => applyStyle('`', 'code', false), label: 'Code' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-900/50 border border-b-0 border-gray-700 rounded-t-lg">
      {buttons.map(({ icon: Icon, onClick, label }) => (
        <Button key={label} type="button" variant="ghost" size="icon" onClick={onClick} title={label}>
          <Icon className="w-4 h-4" />
        </Button>
      ))}
    </div>
  );
};

export default MarkdownToolbar;