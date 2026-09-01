import React, { useState } from 'react';
import { CommonTemplate, UserAccount, UserGroup } from '../types';
import { hasWritePermission } from '../utils/permissions';
import { BookOpen, Plus, Trash2, Download, Upload, Search, X, FileText, ExternalLink, Filter } from 'lucide-react';

interface ReferentielModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: CommonTemplate[];
  onSaveTemplates: (updated: CommonTemplate[]) => void;
  currentUser?: UserAccount | null;
  userGroups?: UserGroup[];
}

export default function ReferentielModal({
  isOpen,
  onClose,
  templates,
  onSaveTemplates,
  currentUser,
  userGroups = []
}: ReferentielModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cadrage & Méthodologie');
  const [description, setDescription] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fileData, setFileData] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileSize, setFileSize] = useState<string>('N/A');

  if (!isOpen) return null;

  const canEdit = !currentUser || currentUser.isAdmin || hasWritePermission(currentUser, userGroups, 'manage_templates');

  const categories = [
    'all',
    'Cadrage & Méthodologie',
    'Planification & Suivi',
    'Organisation & RACI',
    'Risques & Qualité',
    'Budget & Achats',
    'Communication & Gouvernance',
    'Clôture & REX',
    'Autre'
  ];

  const filteredTemplates = templates.filter((tmpl) => {
    const matchSearch =
      (tmpl.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tmpl.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tmpl.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'all' || tmpl.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Calculate file size in human-readable format
    const sizeInKb = Math.round(file.size / 1024);
    const readableSize = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} Mo` : `${sizeInKb} Ko`;
    setFileSize(readableSize);
    setFileName(file.name);

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTemplate: CommonTemplate = {
      id: `tmpl-${Date.now()}`,
      title: title.trim(),
      category: category.trim(),
      description: description.trim() || 'Modèle de document référentiel',
      downloadUrl: downloadUrl.trim() || undefined,
      fileData: fileData,
      fileName: fileName,
      fileSize: fileSize,
      uploadedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrateur',
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newTemplate, ...templates];
    onSaveTemplates(updated);

    // Reset form
    setTitle('');
    setDescription('');
    setDownloadUrl('');
    setFileData(undefined);
    setFileName(undefined);
    setFileSize('N/A');
    setShowAddModal(false);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (window.confirm(`Confirmez-vous la suppression du document "${name}" du référentiel ?`)) {
      const updated = templates.filter((t) => t.id !== id);
      onSaveTemplates(updated);
    }
  };

  const handleDownload = (tmpl: CommonTemplate) => {
    if (tmpl.fileData) {
      // Download Base64 file
      const link = document.createElement('a');
      link.href = tmpl.fileData;
      link.download = tmpl.fileName || `${tmpl.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (tmpl.downloadUrl) {
      window.open(tmpl.downloadUrl, '_blank');
    } else {
      alert(`Document "${tmpl.title}" : aucun fichier ou URL associé.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base font-display">
                Référentiel Commun de Documents & Modèles
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Espace partagé de modèles de documents, normes et gabarits d'ingénierie
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un document
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Search bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Rechercher un document ou gabarit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold"
            >
              <option value="all">Toutes les catégories ({templates.length})</option>
              {categories.filter(c => c !== 'all').map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({templates.filter(t => t.category === cat).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {templates.length === 0 ? 'Le référentiel est actuellement vide' : 'Aucun document ne correspond à votre recherche'}
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {templates.length === 0
                    ? 'Déposez vos propres gabarits, chartes, grilles méthodologiques et spécifications pour les partager avec l’ensemble des équipes.'
                    : 'Modifiez vos filtres ou termes de recherche pour afficher les documents correspondants.'}
                </p>
              </div>
              {canEdit && templates.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Ajouter un premier document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 hover:shadow-md transition-all flex flex-col justify-between group space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                        {tmpl.category}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Supprimer ce document du référentiel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">
                      {tmpl.title}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {tmpl.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      {tmpl.fileSize && (
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300">
                          {tmpl.fileSize}
                        </span>
                      )}
                      {tmpl.uploadedAt && <span>{tmpl.uploadedAt}</span>}
                    </div>

                    <button
                      onClick={() => handleDownload(tmpl)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer"
                    >
                      {tmpl.downloadUrl && !tmpl.fileData ? (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" /> Ouvrir
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> Télécharger
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Total : <strong>{templates.length}</strong> document(s) enregistré(s)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>

      {/* SUB-MODAL: AJOUTER UN DOCUMENT AU RÉFÉRENTIEL */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                Ajouter un Document au Référentiel
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Nom / Titre du Document (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Cahier des Charges Fonctionnel Type"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {categories.filter(c => c !== 'all').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Fichier à uploader (PDF, Word, Excel, Modèle...)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-3 text-center bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/30 transition-colors">
                  <input
                    type="file"
                    id="referentiel-file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="referentiel-file"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-slate-600 dark:text-slate-300"
                  >
                    <Upload className="w-5 h-5 text-indigo-600 mb-0.5" />
                    {fileName ? (
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {fileName} ({fileSize})
                      </span>
                    ) : (
                      <>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Cliquez pour parcourir un fichier</span>
                        <span className="text-[10px] text-slate-400">PDF, DOCX, XLSX, PPTX, etc.</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Ou Lien URL Externe (Optionnel)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... ou https://sharepoint.com/..."
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Description / Conseils d'utilisation
                </label>
                <textarea
                  rows={2}
                  placeholder="Présentation du document, contexte d'application..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Enregistrer au référentiel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
