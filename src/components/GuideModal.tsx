import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Loader2, BookOpen, FileText, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const GuideModal = ({ isOpen, onClose }: GuideModalProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: chaptersData, error: chaptersError } = await supabase.from('guide_chapters').select('*').order('order');
      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);

      const { data: articlesData, error: articlesError } = await supabase.from('guide_articles').select('*').order('order');
      if (articlesError) throw articlesError;
      setArticles(articlesData || []);

      if ((chaptersData?.length || 0) > 0 && (articlesData?.length || 0) > 0) {
        const firstArticle = articlesData.find(a => a.chapter_id === chaptersData[0].id);
        setSelectedArticle(firstArticle || articlesData[0]);
      }
    } catch (error) {
      console.error("Erreur de chargement du guide:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] bg-slate-900/80 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-0 flex overflow-hidden">
        {loading ? (
          <div className="w-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Chapters Panel */}
            <div className="w-full md:w-1/3 border-r border-slate-700 flex flex-col">
              <DialogHeader className="p-4 border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-center gap-3">
                  <BookOpen className="w-7 h-7 text-white" />
                  <h2 className="text-xl font-bold text-white">Guide du Survivant</h2>
                </div>
              </DialogHeader>
              <div className="overflow-y-auto flex-1 no-scrollbar">
                {chapters.map(chapter => (
                  <div key={chapter.id}>
                    <h3 className="font-bold text-lg p-3 bg-slate-800/50 sticky top-0 backdrop-blur-sm z-10">{chapter.title}</h3>
                    <ul>
                      {articles.filter(a => a.chapter_id === chapter.id).map(article => (
                        <li key={article.id}>
                          <button 
                            onClick={() => setSelectedArticle(article)} 
                            className={cn(
                              "w-full text-left p-3 flex items-center gap-2 transition-colors duration-200",
                              selectedArticle?.id === article.id 
                                ? "bg-blue-500/20 text-white" 
                                : "hover:bg-slate-800/70 text-slate-300"
                            )}
                          >
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 truncate">{article.title}</span>
                            <ChevronRight className={cn("w-4 h-4 transition-transform", selectedArticle?.id === article.id && "transform-none")} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Article Panel */}
            <div className="hidden md:block w-2/3 flex-1 flex-col overflow-y-auto no-scrollbar">
              {selectedArticle ? (
                <div className="p-6 lg:p-8">
                  <div
                    className="prose prose-lg prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-li:text-slate-300"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content || '' }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p>Sélectionnez un article à lire.</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GuideModal;