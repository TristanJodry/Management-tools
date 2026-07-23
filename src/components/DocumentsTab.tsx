import React, { useState } from 'react';
import { Project, ProjectDocumentItem } from '../types';
import { FileText, Plus, Search, Trash2, Edit3, Download, Eye, FileCheck, BookOpen, ExternalLink } from 'lucide-react';
import { COMMON_TEMPLATES } from '../data';

interface DocumentsTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  canEdit?: boolean;
}

export default function DocumentsTab({ project, onUpdateProject, canEdit = true }: DocumentsTabProps) {
  const documents: ProjectDocumentItem[] = project.projectDocuments || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Cadrage & Charte');
  const [docVersion, setDocVersion] = useState('v1.0');
  const [docAuthor, setDocAuthor] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const [editingDoc, setEditingDoc] = useState<ProjectDocumentItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocumentItem | null>(null);

  const saveDocs = (updatedList: ProjectDocumentItem[]) => {
    onUpdateProject({ projectDocuments: updatedList });
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    const newDoc: ProjectDocumentItem = {
      id: `doc-${Date.now()}`,
      name: docName.trim(),
      category: docCategory,
      version: docVersion.trim() || 'v1.0',
      uploadedAt: new Date().toISOString().split('T')[0],
      fileSize: '1.2 Mo',
      uploadedBy: docAuthor.trim() || 'Équipe Projet',
      notes: docNotes.trim(),
      fileUrl: docUrl.trim()
    };

    saveDocs([...documents, newDoc]);
    setDocName('');
    setDocNotes('');
    setDocUrl('');
    setShowAddModal(false);
  };

  const handleUpdateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    const updated = documents.map((d) => (d.id === editingDoc.id ? editingDoc : d));
    saveDocs(updated);
    setEditingDoc(null);
  };

  const handleDeleteDocument = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    saveDocs(updated);
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    'Cadrage & Charte',
    'Spécifications & Architecture',
    'Procès-verbaux & Recette',
    'Rapports & Relevés',
    'Modèles & Bilan'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Espace Documents & Modèles du Projet
          </h3>
          <p className="text-xs text-slate-500">
            Stockez, catégorisez et partagez l'ensemble de la documentation projet et téléchargez nos modèles officiels.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Déposer un Document
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher un document par nom ou note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-semibold">
            {searchTerm || selectedCategory !== 'all' ? 'Aucun document ne correspond à vos critères.' : 'Aucun document déposé dans cet espace.'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 mb-4">
            Déposez des rapports, spécifications, chartes ou PV pour votre projet.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
          >
            Déposer un premier document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-xs hover:border-indigo-200 transition-colors">
              <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-2">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                    {doc.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{doc.name}</h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">{doc.version}</span>
              </div>

              {doc.notes && <p className="text-[11px] text-slate-600 line-clamp-2">{doc.notes}</p>}

              <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                <span>Par {doc.uploadedBy} • {doc.uploadedAt}</span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1 text-slate-400 hover:text-indigo-600"
                    title="Aperçu / Consulter"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => setEditingDoc(doc)}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Library Section */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          Bibliothèque de Modèles & Gabarits Types à Télécharger
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COMMON_TEMPLATES.map((tmpl) => (
            <div key={tmpl.id} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 shadow-2xs">
              <span className="text-[9px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded uppercase">
                {tmpl.category}
              </span>
              <h5 className="text-xs font-bold text-slate-900">{tmpl.title}</h5>
              <p className="text-[10px] text-slate-500 line-clamp-2">{tmpl.description}</p>
              <a
                href={tmpl.downloadUrl || '#'}
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Téléchargement du modèle "${tmpl.title}" initié !`);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 pt-1"
              >
                <Download className="w-3 h-3" /> Télécharger le gabarit
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddDocument} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Déposer un Nouveau Document</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom du Document</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Spécifications Fonctionnelles Détaillées - V1"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Catégorie</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Version</label>
                  <input
                    type="text"
                    placeholder="v1.0"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Auteur / Responsable</label>
                <input
                  type="text"
                  placeholder="ex: Jean Dupont"
                  value={docAuthor}
                  onChange={(e) => setDocAuthor(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Lien / Fichier Attaché (URL ou nom de fichier)</label>
                <input
                  type="text"
                  placeholder="ex: https://drive.google.com/doc123 ou spec.pdf"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  placeholder="Brève description du contenu..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs"
              >
                Déposer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateDocument} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900">Modifier le Document</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom du Document</label>
                <input
                  type="text"
                  required
                  value={editingDoc.name}
                  onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={editingDoc.notes || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" /> Aperçu du Document
            </h4>
            <div className="space-y-2 text-xs">
              <div><span className="font-bold text-slate-500">Nom:</span> {previewDoc.name}</div>
              <div><span className="font-bold text-slate-500">Catégorie:</span> {previewDoc.category}</div>
              <div><span className="font-bold text-slate-500">Version:</span> {previewDoc.version}</div>
              <div><span className="font-bold text-slate-500">Auteur:</span> {previewDoc.uploadedBy}</div>
              <div><span className="font-bold text-slate-500">Date:</span> {previewDoc.uploadedAt}</div>
              {previewDoc.notes && <div><span className="font-bold text-slate-500">Description:</span> {previewDoc.notes}</div>}
              {previewDoc.fileUrl && (
                <div className="pt-2">
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 font-bold underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ouvrir le document lié
                  </a>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
