import { useState, useEffect, useCallback, FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Edit, Trash2, ArrowLeft, Book, FileText, GripVertical } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';
import { Label } from '@/components/ui/label';
import RichTextEditor from './RichTextEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const GuideManager = () => {
  const isMobile = useIsMobile();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

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
      <CardHeader className="flex-row items-center justify-between p-4 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg"><Book className="w-5 h-5" /> Chapitres</CardTitle>
        <Button size="sm" onClick={() => { setEditingChapter({ id: 0, title: '', order: 0 }); setIsChapterModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Ajouter</Button>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-y-auto no-scrollbar">
        {chapters.map(chapter => (
          <div key={chapter.id} onClick={() => setSelectedChapter(chapter)} className={cn("cursor-pointer p-3 flex items-center gap-3 border-b border-l-4 border-gray-700", selectedChapter?.id === chapter.id ? "bg-blue-500/10 border-l-blue-500" : "border-l-transparent hover:bg-gray-800/50")}>
            <GripVertical className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <span className="font-semibold truncate flex-1">{chapter.title}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingChapter(chapter); setIsChapterModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDeleteModal(chapter, 'chapter'); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </CardContent>
    </div>
  );

  const ArticleView = (
    <div className="flex flex-col h-full">
      {selectedChapter ? (
        <>
          <CardHeader className="flex-row items-center justify-between p-4 flex-shrink-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isMobile && <Button variant="ghost" size="icon" onClick={() => setSelectedChapter(null)}><ArrowLeft className="w-5 h-5" /></Button>}
              <FileText className="w-5 h-5" />
              <span className="truncate">{selectedChapter.title}</span>
            </CardTitle>
            <Button size="sm" onClick={() => { setEditingArticle({ id: 0, chapter_id: selectedChapter.id, title: '', content: '', order: 0 }); setIsArticleModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Ajouter</Button>
          </CardHeader>
          <CardContent className="p-0 flex-grow overflow-y-auto no-scrollbar">
            {filteredArticles.map(article => (
              <div key={article.id} onClick={() => { setEditingArticle(article); setIsArticleModalOpen(true); }} className="cursor-pointer p-3 flex items-center gap-3 border-b border-gray-700 hover:bg-gray-800/50">
                <GripVertical className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <span className="font-semibold truncate flex-1">{article.title}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDeleteModal(article, 'article'); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Sélectionnez un chapitre pour voir les articles.</p>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>;

  return (
    <>
      <div className="flex h-full bg-transparent rounded-lg overflow-hidden gap-6">
        {isMobile ? (
          <Card className="w-full bg-gray-800/50 border-gray-700 text-white">
            {selectedChapter ? ArticleView : ChapterList}
          </Card>
        ) : (
          <>
            <Card className="w-1/3 bg-gray-800/50 border-gray-700 text-white flex flex-col">{ChapterList}</Card>
            <Card className="w-2/3 bg-gray-800/50 border-gray-700 text-white flex flex-col">{ArticleView}</Card>
          </>
        )}
      </div>

      <Dialog open={isChapterModalOpen} onOpenChange={setIsChapterModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900/80 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingChapter?.id ? 'Modifier' : 'Nouveau'} Chapitre</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveChapter} className="py-4 space-y-4">
            <div><Label htmlFor="chapterTitle">Titre</Label><Input id="chapterTitle" value={editingChapter?.title || ''} onChange={(e) => setEditingChapter(prev => prev ? {...prev, title: e.target.value} : null)} required /></div>
            <DialogFooter><Button type="submit">Sauvegarder</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isArticleModalOpen} onOpenChange={setIsArticleModalOpen}>
        <DialogContent className="max-w-4xl w-full h-[90vh] bg-slate-900/80 backdrop-blur-lg text-white border border-slate-700 flex flex-col">
          <DialogHeader><DialogTitle>{editingArticle?.id ? 'Modifier' : 'Nouvel'} Article</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveArticle} className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
            <div className="flex-shrink-0">
              <Label htmlFor="articleTitle">Titre</Label>
              <Input id="articleTitle" value={editingArticle?.title || ''} onChange={(e) => setEditingArticle(prev => prev ? {...prev, title: e.target.value} : null)} required />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <Label className="flex-shrink-0 mb-2">Contenu</Label>
              <div className="flex-1 overflow-y-auto no-scrollbar -mr-4 pr-4">
                <RichTextEditor
                  value={editingArticle?.content || ''}
                  onChange={(content) => setEditingArticle(prev => prev ? { ...prev, content } : null)}
                />
              </div>
            </div>
            <DialogFooter className="flex-shrink-0 pt-4">
              <Button type="submit">Sauvegarder</Button>
            </DialogFooter>
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