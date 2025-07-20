import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Loader2, BookOpen, ArrowLeft, FileText, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface Chapter {
  id: number;
  title: string;
  order: number;
}

interface Article {
  id: number;
  chapter_id: number;
  title: string;
  content: string | null;
  order: number;
}

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuideModal = ({ isOpen, onClose }: GuideModalProps) => {
  const isMobile = useIsMobile();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: chaptersData, error: chaptersError } = await supabase.from('guide_chapters').select('*').order('order');
    const { data: articlesData, error: articlesError } = await supabase.from('guide_articles').select('*').order('order');
    
    if (chaptersError || articlesError) {
      showError("Erreur de chargement du guide.");
    } else {
      setChapters(chaptersData || []);
      setArticles(articlesData || []);
      if (chaptersData && chaptersData.length > 0) {
        setSelectedChapter(chaptersData[0]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      setSelectedChapter(null);
      setSelectedArticle(null);
    }
  }, [isOpen, fetchData]);

  const filteredArticles = articles.filter(a => a.chapter_id === selectedChapter?.id);

  const ChapterList = (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-bold p-4 border-b border-slate-700 flex-shrink-0 text-center font-mono uppercase tracking-wider">Chapitres</h3>
      <ScrollArea className="flex-grow">
        <div className="p-2">
          {chapters.map(chapter => (
            <button key={chapter.id} onClick={() => { setSelectedChapter(chapter); setSelectedArticle(null); }} className={cn(
              "w-full text-left cursor-pointer p-3 rounded-lg flex items-center justify-between transition-colors",
              selectedChapter?.id === chapter.id ? "bg-white/10" : "hover:bg-white/5"
            )}>
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <span className="font-semibold truncate">{chapter.title}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const ArticleView = (
    <div className="flex flex-col h-full">
      {selectedArticle ? (
        <>
          <div className="p-4 border-b border-slate-700 flex-shrink-0 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelectedArticle(null)}><ArrowLeft className="w-5 h-5" /></Button>
            <h3 className="text-lg font-bold truncate">{selectedArticle.title}</h3>
          </div>
          <ScrollArea className="flex-grow">
            <article className="prose prose-invert prose-sm sm:prose-base max-w-none p-4 prose-headings:text-white prose-p:text-gray-300 prose-a:text-sky-400 prose-strong:text-white prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-300">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedArticle.content || "Contenu non disponible."}
              </ReactMarkdown>
            </article>
          </ScrollArea>
        </>
      ) : (
        <>
          <div className="p-4 border-b border-slate-700 flex-shrink-0 flex items-center gap-2">
            {isMobile && selectedChapter && <Button variant="ghost" size="icon" onClick={() => setSelectedChapter(null)}><ArrowLeft className="w-5 h-5" /></Button>}
            <h3 className="text-lg font-bold truncate">{selectedChapter?.title || "Articles"}</h3>
          </div>
          <ScrollArea className="flex-grow">
            <div className="p-2 space-y-2">
              {filteredArticles.map(article => (
                <button key={article.id} onClick={() => setSelectedArticle(article)} className="w-full text-left cursor-pointer p-3 rounded-lg flex items-center gap-3 transition-colors hover:bg-white/5 border border-slate-700 bg-white/5">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="font-semibold truncate">{article.title}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-center gap-3">
            <BookOpen className="w-7 h-7 text-white" />
            <DialogTitle className="text-white font-mono tracking-wider uppercase text-xl">Guide du Survivant</DialogTitle>
          </div>
        </DialogHeader>
        {loading ? (
          <div className="flex-grow flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <div className="flex flex-grow min-h-0">
            {isMobile ? (
              <div className="w-full h-full">
                {!selectedChapter ? ChapterList : ArticleView}
              </div>
            ) : (
              <>
                <div className="w-1/3 border-r border-slate-700 flex-shrink-0">{ChapterList}</div>
                <div className="w-2/3">{ArticleView}</div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GuideModal;