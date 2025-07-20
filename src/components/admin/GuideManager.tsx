import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Edit, Trash2, ArrowLeft, BookHeart } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import ActionModal from '../ActionModal';
import { Label } from '@/components/ui/label';
import MarkdownToolbar from './MarkdownToolbar';

interface Chapter {
  id: number;
  title: string;
  order: number;
  icon: string | null;
}

interface Article {
  id: number;
  chapter_id: number;
  title: string;
  content: string | null;
  order: number;
  icon: string | null;
}

const GuideManager = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const articleTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'chapter' | 'article'; item: Chapter | Article | null }>({ isOpen: false, type: 'chapter', item: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: chaptersData, error: chaptersError } = await supabase.from('guide_chapters').select('*').order('order');
    const { data: articlesData, error: articlesError } = await supabase.from('guide_articles').select('*').order('order');
    
    if (chaptersError || articlesError) {
      showError("Erreur de chargement des données du guide.");
    } else {
      setChapters(chaptersData || []);
      setArticles(articlesData || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveChapter = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingChapter || !editingChapter.title.trim()) return;

    const { id, ...dataToSave } = editingChapter;
    const promise = id ? supabase.from('guide_chapters').update(dataToSave).eq('id', id) : supabase.from('guide_chapters').insert(dataToSave);
    
    const { error } = await promise;
    if (error) showError(error.message);
    else {
      showSuccess(`Chapitre ${id ? 'mis à jour' : 'créé'}.`);
      setIsChapterModalOpen(false);
      setEditingChapter(null);
      fetchData();
    }
  };

  const handleSaveArticle = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editingArticle.title.trim() || !selectedChapter) return;

    const { id, ...dataToSave } = { ...editingArticle, chapter_id: selectedChapter.id };
    const promise = id ? supabase.from('guide_articles').update(dataToSave).eq('id', id) : supabase.from('guide_articles').insert(dataToSave);
    
    const { error } = await promise;
    if (error) showError(error.message);
    else {
      showSuccess(`Article ${id ? 'mis à jour' : 'créé'}.`);
      setIsArticleModalOpen(false);
      setEditingArticle(null);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    const fromTable = deleteModal.type === 'chapter' ? 'guide_chapters' : 'guide_articles';
    const { error } = await supabase.from(fromTable).delete().eq('id', deleteModal.item.id);
    
    if (error) showError(error.message);
    else {
      showSuccess(`${deleteModal.type === 'chapter' ? 'Chapitre' : 'Article'} supprimé.`);
      if (deleteModal.type === 'chapter' && selectedChapter?.id === deleteModal.item.id) {
        setSelectedChapter(null);
      }
      setDeleteModal({ isOpen: false, type: 'chapter', item: null });
      fetchData();
    }
  };

  const openDeleteModal = (item: Chapter | Article, type: 'chapter' | 'article') => {
    setDeleteModal({ isOpen: true, item, type });
  };

  const filteredArticles = articles.filter(a => a.chapter_id === selectedChapter?.id);

  const ChapterList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h3 className="text-lg font-bold">Chapitres</h3>
        <Button size="sm" onClick={() => { setEditingChapter({ id: 0, title: '', order: chapters.length, icon: '' }); setIsChapterModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Ajouter</Button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar">
        {chapters.map(chapter => (
          <div key={chapter.id} onClick={() => setSelectedChapter(chapter)} className="cursor-pointer p-3 flex items-center justify-between border-b border-gray-700 hover:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <img src={`/icons/zones/${chapter.icon || 'book.webp'}`} alt={chapter.title} className="w-8 h-8" />
              <span className="font-semibold truncate">{chapter.title}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" title="Modifier" onClick={(e) => { e.stopPropagation(); setEditingChapter(chapter); setIsChapterModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" title="Supprimer" onClick={(e) => { e.stopPropagation(); openDeleteModal(chapter, 'chapter'); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ArticleView = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChapter(null)} title="Retour aux chapitres">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h3 className="text-lg font-bold truncate">{selectedChapter?.title || 'Chapitre'}</h3>
        </div>
        <Button size="sm" onClick={() => { setEditingArticle({ id: 0, chapter_id: selectedChapter!.id, title: '', content: '', order: filteredArticles.length, icon: '' }); setIsArticleModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Ajouter un article</Button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar">
        {filteredArticles.length > 0 ? filteredArticles.map(article => (
          <div key={article.id} className="p-3 flex items-center justify-between border-b border-gray-700 hover:bg-gray-800/50">
            <div className="flex items-center gap-3 flex-grow truncate">
              <img src={`/icons/zones/${article.icon || 'scroll.webp'}`} alt={article.title} className="w-6 h-6" />
              <span className="font-semibold truncate">{article.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" title="Modifier" onClick={() => { setEditingArticle(article); setIsArticleModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" title="Supprimer" onClick={(e) => { e.stopPropagation(); openDeleteModal(article, 'article'); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        )) : (
          <div className="p-4 text-center text-gray-400">Aucun article dans ce chapitre.</div>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  return (
    <>
      <div className="flex flex-col h-full bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <BookHeart className="w-16 h-16 text-gray-500 mb-4" />
            <h2 className="text-2xl font-bold">Gestion du Guide</h2>
            <p className="mt-2 text-gray-400">Commencez par créer votre premier chapitre.</p>
            <Button className="mt-4" onClick={() => { setEditingChapter({ id: 0, title: '', order: 0, icon: '' }); setIsChapterModalOpen(true); }}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Créer un chapitre
            </Button>
          </div>
        ) : selectedChapter ? (
          ArticleView
        ) : (
          ChapterList
        )}
      </div>

      <Dialog open={isChapterModalOpen} onOpenChange={(isOpen) => { setIsChapterModalOpen(isOpen); if (!isOpen) setEditingChapter(null); }}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingChapter?.id ? 'Modifier' : 'Nouveau'} Chapitre</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveChapter} className="py-4 space-y-4">
            <div><Label>Titre</Label><Input value={editingChapter?.title || ''} onChange={(e) => setEditingChapter(prev => prev ? {...prev, title: e.target.value} : null)} required /></div>
            <div><Label>Icône (ex: `forest.webp`)</Label><Input value={editingChapter?.icon || ''} onChange={(e) => setEditingChapter(prev => prev ? {...prev, icon: e.target.value} : null)} placeholder="book.webp" /></div>
            <DialogFooter><Button type="submit">Sauvegarder</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isArticleModalOpen} onOpenChange={(isOpen) => { setIsArticleModalOpen(isOpen); if (!isOpen) setEditingArticle(null); }}>
        <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingArticle?.id ? 'Modifier' : 'Nouvel'} Article</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveArticle} className="py-4 space-y-4">
            <div><Label>Titre</Label><Input value={editingArticle?.title || ''} onChange={(e) => setEditingArticle(prev => prev ? {...prev, title: e.target.value} : null)} required /></div>
            <div><Label>Icône (ex: `scroll.webp`)</Label><Input value={editingArticle?.icon || ''} onChange={(e) => setEditingArticle(prev => prev ? {...prev, icon: e.target.value} : null)} placeholder="scroll.webp" /></div>
            <div>
              <Label>Contenu (Markdown)</Label>
              <MarkdownToolbar textareaRef={articleTextareaRef} onContentChange={(value) => setEditingArticle(prev => prev ? {...prev, content: value} : null)} />
              <Textarea ref={articleTextareaRef} value={editingArticle?.content || ''} onChange={(e) => setEditingArticle(prev => prev ? {...prev, content: e.target.value} : null)} rows={15} className="rounded-t-none border-gray-700" />
            </div>
            <DialogFooter><Button type="submit">Sauvegarder</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'chapter', item: null })}
        title={`Supprimer ${deleteModal.type === 'chapter' ? 'le chapitre' : 'l\'article'}`}
        description={`Êtes-vous sûr de vouloir supprimer "${deleteModal.item?.title}" ? Cette action est irréversible.`}
        actions={[{ label: "Supprimer", onClick: handleDelete, variant: "destructive" }, { label: "Annuler", onClick: () => setDeleteModal({ isOpen: false, type: 'chapter', item: null }), variant: "secondary" }]}
      />
    </>
  );
};

export default GuideManager;