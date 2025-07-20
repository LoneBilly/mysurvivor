import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Chapter {
  id: number;
  title: string;
  icon: string | null;
}

interface Article {
  id: number;
  chapter_id: number;
  title: string;
  content: string | null;
  icon: string | null;
}

const GuideModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('guide_chapters')
        .select('id, title, icon')
        .order('order');
      
      const { data: articlesData, error: articlesError } = await supabase
        .from('guide_articles')
        .select('id, chapter_id, title, content, icon')
        .order('order');

      if (chaptersError || articlesError) {
        showError("Erreur de chargement du guide.");
      } else {
        setChapters(chaptersData || []);
        setArticles(articlesData || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedChapter(null);
        setSelectedArticle(null);
      }, 200);
    }
  }, [isOpen]);

  const filteredArticles = articles.filter(a => a.chapter_id === selectedChapter?.id);

  const ChapterList = () => (
    <div className="space-y-3 p-4">
      {chapters.map(chapter => (
        <div key={chapter.id} onClick={() => setSelectedChapter(chapter)} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center cursor-pointer hover:bg-gray-700/50 transition-colors duration-200">
          <img src={`/icons/zones/${chapter.icon || 'book.webp'}`} alt={chapter.title} className="w-10 h-10 mr-4" />
          <h3 className="text-xl font-bold text-white">{chapter.title}</h3>
        </div>
      ))}
    </div>
  );

  const ArticleList = () => (
    <div className="p-4">
      <Button onClick={() => setSelectedChapter(null)} variant="ghost" className="mb-4 text-white">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux chapitres
      </Button>
      <h2 className="text-3xl font-bold text-center text-white mb-4">{selectedChapter?.title}</h2>
      <div className="space-y-3">
        {filteredArticles.map(article => (
          <div key={article.id} onClick={() => setSelectedArticle(article)} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center cursor-pointer hover:bg-gray-700/50 transition-colors duration-200">
            <img src={`/icons/zones/${article.icon || 'scroll.webp'}`} alt={article.title} className="w-8 h-8 mr-3" />
            <h4 className="text-lg text-white">{article.title}</h4>
          </div>
        ))}
      </div>
    </div>
  );

  const ArticleView = () => (
    <div className="p-4 md:p-6">
      <Button onClick={() => setSelectedArticle(null)} variant="ghost" className="mb-4 text-white">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux articles
      </Button>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{selectedArticle?.title}</h2>
      <div className="prose prose-invert max-w-none text-gray-300 prose-p:text-gray-300 prose-headings:text-white">
        <Markdown remarkPlugins={[remarkGfm]}>
          {selectedArticle?.content || "Contenu non disponible."}
        </Markdown>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
    }
    if (chapters.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-full text-white text-center p-4">
          <BookOpen className="h-16 w-16 mb-4 text-gray-500" />
          <h2 className="text-2xl font-bold">Le guide est en cours d'écriture...</h2>
          <p className="text-gray-400">Revenez bientôt pour découvrir tous les secrets du jeu !</p>
        </div>
      );
    }
    if (selectedArticle) return <ArticleView />;
    if (selectedChapter) return <ArticleList />;
    return <ChapterList />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700 shadow-2xl rounded-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-center gap-3">
            <BookOpen className="w-7 h-7 text-white" />
            <DialogTitle className="text-2xl font-bold text-center text-white">Guide du Survivant</DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto no-scrollbar">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuideModal;