import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Book, FileText, ChevronDown } from 'lucide-react';

type Chapter = {
  id: number;
  title: string;
  icon: string;
};

type Article = {
  id: number;
  chapter_id: number;
  title: string;
  content: string;
  icon: string;
};

const GuideManager = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<Partial<Chapter>>({});
  const [currentArticle, setCurrentArticle] = useState<Partial<Article>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchChapters = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('guide_chapters').select('*').order('order');
    if (error) {
      toast.error("Erreur lors de la récupération des chapitres.");
    } else {
      setChapters(data);
      if (data.length > 0 && !selectedChapter) {
        setSelectedChapter(data[0]);
      }
    }
    setIsLoading(false);
  }, [selectedChapter]);

  const fetchArticles = useCallback(async () => {
    if (!selectedChapter) {
      setArticles([]);
      return;
    }
    const { data, error } = await supabase.from('guide_articles').select('*').eq('chapter_id', selectedChapter.id).order('order');
    if (error) {
      toast.error("Erreur lors de la récupération des articles.");
    } else {
      setArticles(data);
    }
  }, [selectedChapter]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSaveChapter = async () => {
    const { id, ...chapterData } = currentChapter;
    const query = id ? supabase.from('guide_chapters').update(chapterData).eq('id', id) : supabase.from('guide_chapters').insert(chapterData as any);
    const { error } = await query;
    if (error) {
      toast.error("Erreur lors de la sauvegarde du chapitre.");
    } else {
      toast.success("Chapitre sauvegardé.");
      setIsChapterModalOpen(false);
      fetchChapters();
    }
  };

  const handleSaveArticle = async () => {
    const { id, ...articleData } = currentArticle;
    const query = id ? supabase.from('guide_articles').update(articleData).eq('id', id) : supabase.from('guide_articles').insert(articleData as any);
    const { error } = await query;
    if (error) {
      toast.error("Erreur lors de la sauvegarde de l'article.");
    } else {
      toast.success("Article sauvegardé.");
      setIsArticleModalOpen(false);
      fetchArticles();
    }
  };

  const handleDelete = async (type: 'chapter' | 'article', id: number) => {
    const table = type === 'chapter' ? 'guide_chapters' : 'guide_articles';
    const confirmation = window.confirm(`Voulez-vous vraiment supprimer cet élément ?`);
    if (confirmation) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        toast.error("Erreur lors de la suppression.");
      } else {
        toast.success("Élément supprimé.");
        if (type === 'chapter') {
          setSelectedChapter(null);
          fetchChapters();
        } else {
          fetchArticles();
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      <div className="md:col-span-1 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg min-h-0">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold">Chapitres</h3>
          <Button onClick={() => { setCurrentChapter({}); setIsChapterModalOpen(true); }}>
            <PlusCircle className="w-4 h-4 mr-2" />Créer
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto no-scrollbar">
          {chapters.map(c => (
            <div key={c.id} onClick={() => setSelectedChapter(c)} className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 ${selectedChapter?.id === c.id ? 'bg-slate-700' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Book className="w-5 h-5 text-gray-300" />
                  <span>{c.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setCurrentChapter(c); setIsChapterModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete('chapter', c.id); }}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 h-full flex flex-col bg-gray-800/50 border border-gray-700 rounded-lg min-h-0">
        {selectedChapter && (
          <>
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold">Articles de: {selectedChapter.title}</h3>
              <Button onClick={() => { setCurrentArticle({ chapter_id: selectedChapter.id }); setIsArticleModalOpen(true); }}>
                <PlusCircle className="w-4 h-4 mr-2" />Créer
              </Button>
            </div>
            <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-2">
              {articles.map(a => (
                <div key={a.id} className="p-3 rounded-lg border border-gray-700 bg-gray-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-300" />
                      <span>{a.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setCurrentArticle(a); setIsArticleModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete('article', a.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {articles.length === 0 && <p className="text-gray-500 text-center mt-8">Aucun article dans ce chapitre.</p>}
            </div>
          </>
        )}
      </div>

      <Dialog open={isChapterModalOpen} onOpenChange={setIsChapterModalOpen}>
        <DialogContent className="sm:max-w-md bg-gray-800/90 border-gray-700 text-white backdrop-blur-sm">
          <DialogHeader><DialogTitle>{currentChapter.id ? 'Modifier' : 'Créer'} un chapitre</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label htmlFor="chapter-title" className="block text-sm font-medium text-gray-300 mb-1">Titre</label>
              <Input id="chapter-title" value={currentChapter.title || ''} onChange={e => setCurrentChapter({ ...currentChapter, title: e.target.value })} className="bg-gray-900/70 border-gray-700" />
            </div>
            <div>
              <label htmlFor="chapter-icon" className="block text-sm font-medium text-gray-300 mb-1">Icône (Lucide)</label>
              <Input id="chapter-icon" value={currentChapter.icon || ''} onChange={e => setCurrentChapter({ ...currentChapter, icon: e.target.value })} className="bg-gray-900/70 border-gray-700" />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsChapterModalOpen(false)}>Annuler</Button><Button onClick={handleSaveChapter}>Sauvegarder</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isArticleModalOpen} onOpenChange={setIsArticleModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col bg-gray-800/90 border-gray-700 text-white backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{currentArticle.id ? 'Modifier' : 'Créer'} un article</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto space-y-4 py-4 pr-4 -mr-4">
            <div>
              <label htmlFor="article-title" className="block text-sm font-medium text-gray-300 mb-1">Titre</label>
              <Input id="article-title" value={currentArticle.title || ''} onChange={e => setCurrentArticle({ ...currentArticle, title: e.target.value })} className="bg-gray-900/70 border-gray-700" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="article-chapter" className="block text-sm font-medium text-gray-300 mb-1">Chapitre</label>
                <div className="relative">
                  <select id="article-chapter" value={currentArticle.chapter_id || ''} onChange={e => setCurrentArticle({ ...currentArticle, chapter_id: Number(e.target.value) })} className="w-full appearance-none bg-gray-900/70 border border-gray-700 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label htmlFor="article-icon" className="block text-sm font-medium text-gray-300 mb-1">Icône (Lucide)</label>
                <Input id="article-icon" value={currentArticle.icon || ''} onChange={e => setCurrentArticle({ ...currentArticle, icon: e.target.value })} className="bg-gray-900/70 border-gray-700" />
              </div>
            </div>
            <div>
              <label htmlFor="article-content" className="block text-sm font-medium text-gray-300 mb-1">Contenu (Markdown)</label>
              <Textarea id="article-content" value={currentArticle.content || ''} onChange={e => setCurrentArticle({ ...currentArticle, content: e.target.value })} rows={15} className="bg-gray-900/70 border-gray-700" />
            </div>
          </div>
          <DialogFooter className="pt-4 flex-shrink-0 border-t border-gray-700">
            <Button variant="outline" onClick={() => setIsArticleModalOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveArticle}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuideManager;