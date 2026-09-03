import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  BookOpen, 
  Check, 
  Plus, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Award, 
  Sparkles,
  Info,
  Layers
} from 'lucide-react';
import { Kpi } from '../types';
import { 
  KPI_TEMPLATES, 
  KPI_CATEGORIES, 
  KpiTemplate, 
  convertTemplateToKpi, 
  RECOMMENDED_KPI_TEMPLATES 
} from '../config/kpiTemplates';

interface KpiTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingKpis: Kpi[];
  onAddKpis: (newKpis: Kpi[]) => void;
  onCustomizeTemplate?: (template: KpiTemplate) => void;
}

export const KpiTemplateModal: React.FC<KpiTemplateModalProps> = ({
  isOpen,
  onClose,
  existingKpis,
  onAddKpis,
  onCustomizeTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [justAddedIds, setJustAddedIds] = useState<string[]>([]);

  // Set of names already present in the project to detect duplicates
  const existingNamesSet = useMemo(() => {
    return new Set(existingKpis.map((k) => k.name.trim().toLowerCase()));
  }, [existingKpis]);

  // Filter templates based on category & search query
  const filteredTemplates = useMemo(() => {
    return KPI_TEMPLATES.filter((tpl) => {
      const matchCategory = selectedCategory === 'all' || tpl.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.categoryLabel.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.formulaOrAdvice.toLowerCase().includes(q) ||
        tpl.unit.toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  // Toggle selection for batch addition
  const toggleSelectTemplate = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Add single template
  const handleAddSingle = (tpl: KpiTemplate) => {
    const newKpi = convertTemplateToKpi(tpl);
    onAddKpis([newKpi]);
    setJustAddedIds((prev) => [...prev, tpl.id]);
    setTimeout(() => {
      setJustAddedIds((prev) => prev.filter((i) => i !== tpl.id));
    }, 2000);
  };

  // Batch add selected templates
  const handleAddSelected = () => {
    const toAdd = KPI_TEMPLATES.filter((tpl) => selectedTemplateIds.includes(tpl.id)).map(convertTemplateToKpi);
    if (toAdd.length === 0) return;
    onAddKpis(toAdd);
    setSelectedTemplateIds([]);
    onClose();
  };

  // Add recommended pack in 1 click
  const handleAddRecommendedPack = () => {
    // Only add recommended ones not already existing
    const toAdd = RECOMMENDED_KPI_TEMPLATES.filter(
      (tpl) => !existingNamesSet.has(tpl.name.trim().toLowerCase())
    ).map(convertTemplateToKpi);

    if (toAdd.length > 0) {
      onAddKpis(toAdd);
    }
    onClose();
  };

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'delais':
        return <Clock className="w-3.5 h-3.5 text-indigo-500" />;
      case 'budget':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
      case 'qualite':
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
      case 'ressources':
        return <Users className="w-3.5 h-3.5 text-purple-500" />;
      case 'risques':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      case 'satisfaction':
        return <Award className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Bibliothèque de Templates KPI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/60">
                  {KPI_TEMPLATES.length} modèles éprouvés
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sélectionnez les indicateurs de performance standards les plus utilisés dans le management de projet.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action bar: Search & Pack Essentiel */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un KPI (nom, formule, métrique)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Recommend Action */}
          <button
            type="button"
            onClick={handleAddRecommendedPack}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Ajouter en 1 clic les 5 KPI standards indispensables (Jalons, SPI, CPI, Qualité, CSAT)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ajouter le Pack Essentiel (5 KPI Recommandés)
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-indigo-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            Tous les KPI ({KPI_TEMPLATES.length})
          </button>

          {KPI_CATEGORIES.map((cat) => {
            const count = KPI_TEMPLATES.filter((t) => t.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Templates Grid Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <Search className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Aucun modèle de KPI ne correspond à votre recherche</p>
              <p className="text-[11px] text-slate-400 mt-1">Essayez d'ajuster les filtres de catégorie ou vos mots-clés.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => {
                const isAlreadyPresent = existingNamesSet.has(tpl.name.trim().toLowerCase());
                const isSelected = selectedTemplateIds.includes(tpl.id);
                const wasJustAdded = justAddedIds.includes(tpl.id);

                return (
                  <div
                    key={tpl.id}
                    className={`rounded-xl border p-4 transition-all duration-150 relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-sm'
                        : isAlreadyPresent
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-90'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Badges & Select Checkbox */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600/80">
                            {getCategoryIcon(tpl.category)}
                            <span>{tpl.categoryLabel}</span>
                          </span>

                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                            {tpl.metricType === 'percentage' ? '%' : tpl.metricType === 'currency' ? '€ Devise' : tpl.metricType === 'time' ? '⏱ Durée' : 'Nombre'} ({tpl.unit})
                          </span>

                          {tpl.isRecommended && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ⭐ Recommandé
                            </span>
                          )}

                          {isAlreadyPresent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-2.5 h-2.5" /> Déjà dans le projet
                            </span>
                          )}
                        </div>

                        {/* Checkbox for batch select */}
                        <button
                          type="button"
                          onClick={() => toggleSelectTemplate(tpl.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-700'
                          }`}
                          title="Sélectionner pour ajout groupé"
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {tpl.name}
                      </h4>

                      {/* Description */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {tpl.description}
                      </p>

                      {/* Formula & Target Info Box */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Valeur cible suggérée :</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {tpl.defaultTarget} {tpl.unit !== 'ratio' && tpl.unit !== 'score' && tpl.unit}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                          <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">
                            <strong className="text-slate-600 dark:text-slate-300">Méthode :</strong> {tpl.formulaOrAdvice}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action buttons */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {onCustomizeTemplate ? (
                        <button
                          type="button"
                          onClick={() => {
                            onCustomizeTemplate(tpl);
                            onClose();
                          }}
                          className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          Personnaliser avant d'ajouter
                        </button>
                      ) : (
                        <span />
                      )}

                      <button
                        type="button"
                        onClick={() => handleAddSingle(tpl)}
                        disabled={wasJustAdded}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          wasJustAdded
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isAlreadyPresent
                            ? 'bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                        }`}
                      >
                        {wasJustAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Ajouté !
                          </>
                        ) : isAlreadyPresent ? (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter à nouveau
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter ce KPI
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Batch Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedTemplateIds.length > 0 ? (
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {selectedTemplateIds.length} modèle{selectedTemplateIds.length > 1 ? 's' : ''} sélectionné{selectedTemplateIds.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span>Cochez plusieurs modèles pour les ajouter simultanément au projet.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Fermer
            </button>

            {selectedTemplateIds.length > 0 && (
              <button
                type="button"
                onClick={handleAddSelected}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter les {selectedTemplateIds.length} KPI sélectionnés
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiTemplateModal;
