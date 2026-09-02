import React, { useState, useRef } from 'react';
import { Project, ProjectDocumentItem } from '../types';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit3,
  Download,
  Eye,
  Upload,
  File,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
  HardDrive,
  FolderOpen,
  X,
  Sparkles
} from 'lucide-react';

interface DocumentsTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
  canEdit?: boolean;
}

const CATEGORIES = [
  'Cadrage & Charte',
  'Spécifications & Architecture',
  'Procès-verbaux & Recette',
  'Rapports & Relevés',
  'Modèles & Bilan',
  'Autres Pièces Jointes'
];

export default function DocumentsTab({ project, onUpdateProject, canEdit = true }: DocumentsTabProps) {
  const documents: ProjectDocumentItem[] = project.projectDocuments || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Cadrage & Charte');
  const [docVersion, setDocVersion] = useState('v1.0');
  const [docAuthor, setDocAuthor] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docUrl, setDocUrl] = useState('');
  
  // Local File Uploaded in Modal
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: string;
    type: string;
    dataUrl: string;
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ProjectDocumentItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocumentItem | null>(null);

  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  const saveDocs = (updatedList: ProjectDocumentItem[]) => {
    onUpdateProject({ projectDocuments: updatedList });
  };

  // Format File Size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Octet';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to read file to DataURL
  const readFileAsDataUrl = (file: globalThis.File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Guess category based on file name/extension
  const guessCategory = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes('charte') || lower.includes('cadrage') || lower.includes('note')) return 'Cadrage & Charte';
    if (lower.includes('spec') || lower.includes('archi') || lower.includes('tech')) return 'Spécifications & Architecture';
    if (lower.includes('pv') || lower.includes('recette') || lower.includes('test')) return 'Procès-verbaux & Recette';
    if (lower.includes('rapport') || lower.includes('releve') || lower.includes('cr')) return 'Rapports & Relevés';
    if (lower.includes('bilan') || lower.includes('rex') || lower.includes('modele')) return 'Modèles & Bilan';
    return 'Autres Pièces Jointes';
  };

  // Handle direct file upload (from dropzone or button)
  const handleDirectFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDocuments: ProjectDocumentItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        
        newDocuments.push({
          id: `doc-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          category: guessCategory(file.name),
          version: 'v1.0',
          uploadedAt: new Date().toISOString().split('T')[0],
          fileSize: formatFileSize(file.size),
          uploadedBy: 'Import PC',
          notes: `Fichier local importé (${file.type || 'Fichier'})`,
          fileName: file.name,
          fileType: file.type,
          fileData: dataUrl
        });
      } catch (err) {
        console.error('Erreur lecture fichier:', err);
      }
    }

    if (newDocuments.length > 0) {
      saveDocs([...newDocuments, ...documents]);
    }
  };

  // Handle file chosen in Add Modal
  const handleModalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachedFile({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        dataUrl
      });

      if (!docName.trim()) {
        setDocName(file.name);
      }
      if (docCategory === 'Cadrage & Charte') {
        setDocCategory(guessCategory(file.name));
      }
    } catch (err) {
      console.error('Erreur lecture fichier modal:', err);
    }
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    const newDoc: ProjectDocumentItem = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: docName.trim(),
      category: docCategory,
      version: docVersion.trim() || 'v1.0',
      uploadedAt: new Date().toISOString().split('T')[0],
      fileSize: attachedFile ? attachedFile.size : '1.0 Mo',
      uploadedBy: docAuthor.trim() || 'Équipe Projet',
      notes: docNotes.trim(),
      fileUrl: docUrl.trim(),
      fileName: attachedFile?.name,
      fileType: attachedFile?.type,
      fileData: attachedFile?.dataUrl
    };

    saveDocs([newDoc, ...documents]);
    
    // Reset Form
    setDocName('');
    setDocNotes('');
    setDocUrl('');
    setDocAuthor('');
    setAttachedFile(null);
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
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      const updated = documents.filter((d) => d.id !== id);
      saveDocs(updated);
    }
  };

  // Download a document to user's PC
  const handleDownloadDocument = (doc: ProjectDocumentItem) => {
    if (doc.fileData) {
      const link = document.createElement('a');
      link.href = doc.fileData;
      link.download = doc.fileName || doc.name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Create a fallback text summary download
      const content = `DOCUMENT DU PROJET ${project.name}\n\nNom: ${doc.name}\nCatégorie: ${doc.category}\nVersion: ${doc.version}\nAuteur: ${doc.uploadedBy}\nDate: ${doc.uploadedAt}\nNotes: ${doc.notes || 'Aucune note'}\n`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.name.replace(/\s+/g, '_')}_fiche.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Get file icon according to type or extension
  const getFileIcon = (doc: ProjectDocumentItem) => {
    const name = (doc.fileName || doc.name || '').toLowerCase();
    const type = (doc.fileType || '').toLowerCase();

    if (type.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp') || name.endsWith('.svg')) {
      return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    }
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    }
    if (type.includes('json') || type.includes('javascript') || type.includes('typescript') || name.endsWith('.json') || name.endsWith('.ts') || name.endsWith('.sql')) {
      return <FileCode className="w-5 h-5 text-purple-600" />;
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    return <File className="w-5 h-5 text-indigo-600" />;
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input for Direct Upload */}
      <input
        type="file"
        ref={directFileInputRef}
        onChange={(e) => handleDirectFilesUpload(e.target.files)}
        multiple
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Espace Documents & Pièces Jointes du Projet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Importez des fichiers depuis votre ordinateur (PDF, Word, Excel, Images...) ou référencez des liens externes.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => directFileInputRef.current?.click()}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Sélectionner directement un ou plusieurs fichiers sur votre ordinateur"
            >
              <Upload className="w-4 h-4 text-indigo-400" /> Importer depuis le PC
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nouveau Document
            </button>
          </div>
        )}
      </div>

      {/* Drag & Drop Import Zone */}
      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleDirectFilesUpload(e.dataTransfer.files);
          }}
          onClick={() => directFileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-800/30'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Glissez-déposez des fichiers depuis votre PC ici, ou <span className="text-indigo-600 dark:text-indigo-400 underline">parcourez vos dossiers</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Supporte tous formats : PDF, DOCX, XLSX, PPTX, Images (PNG, JPG), ZIP, TXT...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Rechercher par nom de fichier, auteur ou note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-bold px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="all">Toutes les catégories ({documents.length})</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat} ({documents.filter((d) => d.category === cat).length})
            </option>
          ))}
        </select>
      </div>

      {/* Document Grid / List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
            {searchTerm || selectedCategory !== 'all'
              ? 'Aucun document ne correspond à vos critères de recherche.'
              : 'Aucun document déposé dans ce projet pour le moment.'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 mb-4">
            Importez votre premier fichier depuis votre ordinateur pour le conserver dans le projet.
          </p>
          {canEdit && (
            <button
              onClick={() => directFileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Importer un fichier maintenant
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Header Badge & Version */}
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 shrink-0">
                      {getFileIcon(doc)}
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[9px] font-bold uppercase text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800 inline-block truncate max-w-full">
                        {doc.category}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                    {doc.version}
                  </span>
                </div>

                {/* File Title */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1" title={doc.name}>
                    {doc.name}
                  </h4>
                  {doc.fileName && doc.fileName !== doc.name && (
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                      Fichier: {doc.fileName}
                    </p>
                  )}
                </div>

                {/* Notes */}
                {doc.notes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    {doc.notes}
                  </p>
                )}

                {/* Local file indicator / Size */}
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-semibold">
                    <HardDrive className="w-3 h-3 text-slate-400" />
                    {doc.fileSize || 'Taille non renseignée'}
                  </span>
                  {doc.fileData && (
                    <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded text-[9px] font-bold border border-emerald-200/50 dark:border-emerald-800">
                      Fichier PC stocké
                    </span>
                  )}
                </div>
              </div>

              {/* Actions and Footer */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700/60 pt-2.5 mt-2">
                <span className="truncate max-w-[120px]" title={`Ajouté par ${doc.uploadedBy}`}>
                  Par {doc.uploadedBy} • {doc.uploadedAt}
                </span>

                <div className="flex items-center gap-1">
                  {/* Download Button */}
                  <button
                    onClick={() => handleDownloadDocument(doc)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Télécharger sur votre ordinateur"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Preview Button */}
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Aperçu / Consulter les détails"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {canEdit && (
                    <>
                      <button
                        onClick={() => setEditingDoc(doc)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
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

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDocument}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> Déposer un Nouveau Document
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAttachedFile(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Select file from PC */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                1. Importer un fichier depuis le PC
              </label>

              <input
                type="file"
                ref={modalFileInputRef}
                onChange={handleModalFileChange}
                className="hidden"
              />

              {attachedFile ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                        {attachedFile.name}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                        {attachedFile.size} • Fichier prêt à être enregistré
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 text-emerald-700 hover:text-rose-600 cursor-pointer"
                    title="Retirer ce fichier"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => modalFileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 rounded-xl text-center bg-indigo-50/40 dark:bg-indigo-950/30 cursor-pointer transition-colors"
                >
                  <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Cliquez pour choisir un fichier sur votre ordinateur
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    PDF, Word, Excel, PowerPoint, Images, ZIP...
                  </p>
                </div>
              )}
            </div>

            {/* Document metadata fields */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  2. Nom d'affichage du Document *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Spécifications Fonctionnelles Détaillées - V1"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    placeholder="v1.0"
                    value={docVersion}
                    onChange={(e) => setDocVersion(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Auteur / Responsable
                </label>
                <input
                  type="text"
                  placeholder="ex: Tristan Jodry"
                  value={docAuthor}
                  onChange={(e) => setDocAuthor(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Lien Externe Optionnel (Google Drive, SharePoint, etc.)
                </label>
                <input
                  type="text"
                  placeholder="ex: https://drive.google.com/file/..."
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Description / Remarques
                </label>
                <textarea
                  rows={2}
                  placeholder="Précisions sur l'objet ou la portée de ce document..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setAttachedFile(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Enregistrer le Document
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateDocument}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" /> Modifier le Document
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom du Document</label>
                <input
                  type="text"
                  required
                  value={editingDoc.name}
                  onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Catégorie</label>
                  <select
                    value={editingDoc.category}
                    onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Version</label>
                  <input
                    type="text"
                    value={editingDoc.version}
                    onChange={(e) => setEditingDoc({ ...editingDoc, version: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  value={editingDoc.notes || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, notes: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
              >
                Enregistrer les Modifications
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview & Download Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {getFileIcon(previewDoc)} {previewDoc.name}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview if applicable */}
            {previewDoc.fileData && (previewDoc.fileType?.startsWith('image/') || previewDoc.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i)) && (
              <div className="max-h-60 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-950/20">
                <img
                  src={previewDoc.fileData}
                  alt={previewDoc.name}
                  className="max-h-60 w-auto object-contain rounded-lg"
                />
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-2 text-xs border border-slate-200/60 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Catégorie :</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{previewDoc.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Version :</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{previewDoc.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Taille du Fichier :</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{previewDoc.fileSize || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Auteur / Source :</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{previewDoc.uploadedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">Date d'Import :</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{previewDoc.uploadedAt}</span>
              </div>

              {previewDoc.notes && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-500 block mb-1">Description :</span>
                  <p className="text-slate-600 dark:text-slate-300 italic">{previewDoc.notes}</p>
                </div>
              )}

              {previewDoc.fileUrl && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 font-bold underline flex items-center gap-1 hover:text-indigo-500"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ouvrir le lien distant associé
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => handleDownloadDocument(previewDoc)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" /> Télécharger le Fichier sur le PC
              </button>

              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
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
