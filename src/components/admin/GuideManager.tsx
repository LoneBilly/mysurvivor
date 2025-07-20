import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import ActionModal from '../ActionModal';
import { Label } from '@/components/ui/label';
import MarkdownToolbar from './MarkdownToolbar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

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
    <div className="flex flex-col h-full bg-gray-900/30">
      <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
        <h3 className="text-lg font-bold">Chapitres</h3>
        <Button size="sm" onClick={() => { setEditingChapter({ id: 0, title: '', order: 0 }); setIsChapterModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Ajouter</Button>
      </div>
      <div className="flex-grow overflow-y-auto no-scrollbar">
        {chapters.map(chapter => (
          <div key={chapter.id} onClick={() => setSelectedChapter(chapter)} className={cn("cursor-pointer p-3 flex items-center justify-between border-b border-l-4 border-gray-700", selectedChapter?.id === chapter.id ? "bg-blue-500/20 border-l-blue-500" : "border-l-transparent hover:bg-gray-800/50")}>
            <span className="font-semibold truncate">{chapter.title}</span>
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
    <div className="flex flex-col h-full bg-gray-900/30">
      {selectedChapter ? (
        <>
          <div className="p-4 border-b border-gray-700 flex-shrink-0 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isMobile && <Button variant="ghost" size="icon" onClick={() => setSelectedChapter(null)}><ArrowLeft className="w-5 h-5" /></Button>}
              <h3 className="text-lg font-bold truncate">{selectedChapter.title}</h3>
            </div>
            <Button size="sm" onClick={() => { setEditingArticle({ id: 0, chapter_id: selectedChapter.id, title: '', content: '', order: 0 }); setIsArticleModalOpen(true); }}><PlusCircle className="w-4 h-4 mr-2" />Ajouter</Button>
          </div>
          <div className="flex-grow overflow-y-auto no-scrollbar">
            {filteredArticles.map(article => (
              <div key={article.id} className="p-3 flex items-center justify-between border-b border-gray-700 hover:bg-gray-800/50">
                <span className="font-semibold truncate flex-grow">{article.title}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" title="Modifier" onClick={() => { setEditingArticle(article); setIsArticleModalOpen(true); }}><Edit className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" title="Supprimer" onClick={(e) => { e.stopPropagation(); openDeleteModal(article, 'article'); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
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
      {isMobile ? (
        <div className="flex h-full bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          {selectedChapter ? ArticleView : ChapterList}
        </div>
      ) : (
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden"
        >
          <ResizablePanel defaultSize={33} minSize={25}>
            {ChapterList}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={67} minSize={30}>
            {ArticleView}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <Dialog open={isChapterModalOpen} onOpenChange={setIsChapterModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingChapter?.id ? 'Modifier' : 'Nouveau'} Chapitre</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveChapter} className="py-4 space-y-4">
            <div><Label>Titre</Label><Input value={editingChapter?.title || ''} onChange={(e) => setEditingChapter(prev => prev ? {...prev, title: e.target.value} : null)} required /></div>
            <DialogFooter><Button type="submit">Sauvegarder</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isArticleModalOpen} onOpenChange={setIsArticleModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-800/70 backdrop-blur-lg text-white border border-slate-700">
          <DialogHeader><DialogTitle>{editingArticle?.id ? 'Modifier' : 'Nouvel'} Article</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveArticle} className="py-4 space-y-4">
            <div><Label>Titre</Label><Input value={editingArticle?.title || ''} onChange={(e) => setEditingArticle(prev => prev ? {...prev, title: e.target.value} : null)} required /></div>
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