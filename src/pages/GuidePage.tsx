import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowLeft, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as LucideIcons from "lucide-react";

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

const getIconComponent = (iconName: string | null, fallback: React.ElementType) => {
  if (!iconName) return fallback;
  const Icon = (LucideIcons as any)[iconName];
  return Icon && typeof Icon.render === 'function' ? Icon : fallback;
};

const GuidePage = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const filteredArticles = articles.filter(a => a.chapter_id === selectedChapter?.id);

  const ChapterList = () => (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold text-center text-white">Guide du Jeu</h2>
      {chapters.map(chapter => {
        const Icon = getIconComponent(chapter.icon, BookOpen);
        return (
          <div key={chapter.id} onClick={() => setSelectedChapter(chapter)} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center cursor-pointer hover:bg-gray-700/50 transition-colors duration-200">
            <Icon className="w-10 h-10 mr-4 text-gray-300" />
            <h3 className="text-xl font-bold text-white">{chapter.title}</h3>
          </div>
        );
      })}
    </div>
  );

  const ArticleList = () => (
    <div>
      <Button onClick={() => setSelectedChapter(null)} variant="ghost" className="mb-4 text-white">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux chapitres
      </Button>
      <h2 className="text-3xl font-bold text-center text-white mb-4">{selectedChapter?.title}</h2>
      <div className="space-y-3">
        {filteredArticles.map(article => {
          const Icon = getIconComponent(article.icon, FileText);
          return (
            <div key={article.id} onClick={() => setSelectedArticle(article)} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center cursor-pointer hover:bg-gray-700/50 transition-colors duration-200">
              <Icon className="w-8 h-8 mr-3 text-gray-400" />
              <h4 className="text-lg text-white">{article.title}</h4>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ArticleView = () => (
    <div>
      <Button onClick={() => setSelectedArticle(null)} variant="ghost" className="mb-4 text-white">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des articles
      </Button>
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-3xl font-bold text-white mb-4">{selectedArticle?.title}</h2>
        <div className="prose prose-invert max-w-none text-gray-300">
          <Markdown remarkPlugins={[remarkGfm]}>
            {selectedArticle?.content || "Contenu non disponible."}
          </Markdown>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-white">
        <BookOpen className="h-16 w-16 mb-4 text-gray-500" />
        <h2 className="text-2xl font-bold">Le guide est en cours d'écriture...</h2>
        <p className="text-gray-400">Revenez bientôt pour découvrir tous les secrets du jeu !</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        {selectedArticle ? <ArticleView /> : selectedChapter ? <ArticleList /> : <ChapterList />}
      </div>
    </div>
  );
};

export default GuidePage;