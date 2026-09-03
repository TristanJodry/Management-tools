import React, { useState, useMemo } from 'react';
import { 
  Project, 
  Kpi 
} from '../types';
import { 
  Target, 
  Download, 
  Plus, 
  BookOpen, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Sparkles, 
  Layers, 
  Filter, 
  Search, 
  Clock, 
  DollarSign, 
  Users, 
  Award,
  Info
} from 'lucide-react';
import { KpiTemplateModal } from './KpiTemplateModal';
import { KpiTemplate, RECOMMENDED_KPI_TEMPLATES, convertTemplateToKpi } from '../config/kpiTemplates';

interface KpisTabProps {
  project: Project;
  canEdit: boolean;
  onUpdateProject: (updates: Partial<Project>) => void;
  onExportPdf?: () => void;
}

export const KpisTab: React.FC<KpisTabProps> = ({
  project,
  canEdit,
  onUpdateProject,
  onExportPdf
}) => {
  const kpis: Kpi[] = useMemo(() => project.kpis || [], [project.kpis]);

  // Modal states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);

  // Quick form states
  const [kpiName, setKpiName] = useState('');
  const [kpiCategory, setKpiCategory] = useState('Délais & Planning');
  const [kpiType, setKpiType] = useState<Kpi['metricType']>('percentage');
  const [kpiUnit, setKpiUnit] = useState('%');
  const [kpiCurrent, setKpiCurrent] = useState('');
  const [kpiTarget, setKpiTarget] = useState('');
  const [kpiScore, setKpiScore] = useState<'ok' | 'warning' | 'alert'>('ok');
  const [kpiDescription, setKpiDescription] = useState('');

  // Filtering states
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'warning' | 'alert'>('all');

  // Add new manual KPI
  const handleAddKpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpiName.trim()) return;

    // Calculate approximate percent compliance if both are numeric
    const curNum = parseFloat(kpiCurrent.replace(',', '.'));
    const tgtNum = parseFloat(kpiTarget.replace(',', '.'));
    let compPercent = 100;
    if (!isNaN(curNum) && !isNaN(tgtNum) && tgtNum > 0) {
      compPercent = Math.min(100, Math.max(0, Math.round((curNum / tgtNum) * 100)));
    }

    const newK: Kpi = {
      id: `kpi-${Date.now()}`,
      name: kpiName.trim(),
      category: kpiCategory,
      metricType: kpiType,
      unit: kpiUnit,
      currentValue: kpiCurrent.trim() || '0',
      targetValue: kpiTarget.trim() || '100',
      statusScore: kpiScore,
      status: compPercent,
      description: kpiDescription.trim() || undefined
    };

    const updated = [...kpis, newK];
    onUpdateProject({ kpis: updated });

    // Reset form
    setKpiName('');
    setKpiCurrent('');
    setKpiTarget('');
    setKpiDescription('');
  };

  // Add multiple KPIs from template library
  const handleAddKpisFromTemplate = (newKpis: Kpi[]) => {
    const updated = [...kpis, ...newKpis];
    onUpdateProject({ kpis: updated });
  };

  // Pre-fill form from a template to customize before adding
  const handleCustomizeTemplate = (tpl: KpiTemplate) => {
    setKpiName(tpl.name);
    setKpiCategory(tpl.categoryLabel);
    setKpiType(tpl.metricType);
    setKpiUnit(tpl.unit);
    setKpiCurrent(tpl.defaultCurrent);
    setKpiTarget(tpl.defaultTarget);
    setKpiScore(tpl.statusScore);
    setKpiDescription(tpl.description);
  };

  // Add recommended pack
  const handleAddRecommendedPack = () => {
    const existingNames = new Set(kpis.map((k) => k.name.trim().toLowerCase()));
    const toAdd = RECOMMENDED_KPI_TEMPLATES.filter(
      (tpl) => !existingNames.has(tpl.name.trim().toLowerCase())
    ).map(convertTemplateToKpi);

    if (toAdd.length > 0) {
      const updated = [...kpis, ...toAdd];
      onUpdateProject({ kpis: updated });
    }
  };

  // Save edited KPI
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKpi) return;

    const curNum = parseFloat(editingKpi.currentValue.replace(',', '.'));
    const tgtNum = parseFloat(editingKpi.targetValue.replace(',', '.'));
    let compPercent = editingKpi.status ?? 100;
    if (!isNaN(curNum) && !isNaN(tgtNum) && tgtNum > 0) {
      compPercent = Math.min(100, Math.max(0, Math.round((curNum / tgtNum) * 100)));
    }

    const updated = kpis.map((k) =>
      k.id === editingKpi.id ? { ...editingKpi, status: compPercent } : k
    );
    onUpdateProject({ kpis: updated });
    setEditingKpi(null);
  };

  // Delete KPI
  const handleDeleteKpi = (id: string) => {
    const updated = kpis.filter((k) => k.id !== id);
    onUpdateProject({ kpis: updated });
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = kpis.length;
    let okCount = 0;
    let warningCount = 0;
    let alertCount = 0;
    let sumPercent = 0;

    kpis.forEach((k) => {
      const score = k.statusScore || (k.status && k.status >= 80 ? 'ok' : k.status && k.status >= 50 ? 'warning' : 'alert');
      if (score === 'ok') okCount++;
      else if (score === 'warning') warningCount++;
      else alertCount++;

      const p = k.status ?? (score === 'ok' ? 100 : score === 'warning' ? 50 : 25);
      sumPercent += p;
    });

    const averagePercent = total > 0 ? Math.round(sumPercent / total) : 100;

    return { total, okCount, warningCount, alertCount, averagePercent };
  }, [kpis]);

  // Filtered KPIs list
  const filteredKpis = useMemo(() => {
    return kpis.filter((k) => {
      const matchSearch =
        !searchFilter.trim() ||
        k.name.toLowerCase().includes(searchFilter.toLowerCase().trim()) ||
        (k.category && k.category.toLowerCase().includes(searchFilter.toLowerCase().trim())) ||
        (k.description && k.description.toLowerCase().includes(searchFilter.toLowerCase().trim()));

      const matchCategory =
        categoryFilter === 'all' || (k.category || 'Autre') === categoryFilter;

      const score = k.statusScore || (k.status && k.status >= 80 ? 'ok' : k.status && k.status >= 50 ? 'warning' : 'alert');
      const matchStatus = statusFilter === 'all' || score === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [kpis, searchFilter, categoryFilter, statusFilter]);

  // Unique categories list for filters
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    kpis.forEach((k) => {
      if (k.category) set.add(k.category);
    });
    return Array.from(set);
  }, [kpis]);

  const getCategoryIcon = (cat?: string) => {
    if (!cat) return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    const lower = cat.toLowerCase();
    if (lower.includes('délai') || lower.includes('planning')) return <Clock className="w-3.5 h-3.5 text-indigo-500" />;
    if (lower.includes('budget') || lower.includes('finance') || lower.includes('coût')) return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
    if (lower.includes('qualité') || lower.includes('livrable')) return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
    if (lower.includes('équipe') || lower.includes('ressource') || lower.includes('charge')) return <Users className="w-3.5 h-3.5 text-purple-500" />;
    if (lower.includes('risque') || lower.includes('blocage')) return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    if (lower.includes('satisfaction') || lower.includes('adoption')) return <Award className="w-3.5 h-3.5 text-rose-500" />;
    return <Layers className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Indicateurs de Performance (KPI)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {kpis.length} actif{kpis.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configurez vos métriques stratégiques, comparez la valeur actuelle à la cible et piochez dans les modèles éprouvés.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Ouvrir la bibliothèque de modèles de KPI"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bibliothèque de Templates</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-extrabold ml-0.5">
                18
              </span>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Télécharger la fiche des KPIs en PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Indicateurs
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">{summaryMetrics.total}</span>
            <span className="text-xs text-slate-500 font-medium">KPIs suivis</span>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
            Conformes (OK)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{summaryMetrics.okCount}</span>
            <span className="text-xs text-slate-500 font-medium">dans les clous</span>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
            Vigilance
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{summaryMetrics.warningCount}</span>
            <span className="text-xs text-slate-500 font-medium">à surveiller</span>
          </div>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
            Alerte Critique
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{summaryMetrics.alertCount}</span>
            <span className="text-xs text-slate-500 font-medium">action requise</span>
          </div>
        </div>
      </div>

      {/* Main Container: Form + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add Form (when editable) */}
        {canEdit && (
          <div className="space-y-4">
            <form 
              onSubmit={handleAddKpi} 
              className="bg-slate-50 dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  Nouveau KPI Personnalisé
                </h4>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3 h-3" />
                  Depuis un template
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Intitulé du KPI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Taux de respect des délais, CPI..."
                  value={kpiName}
                  onChange={(e) => setKpiName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Category & Metric Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Catégorie
                  </label>
                  <select
                    value={kpiCategory}
                    onChange={(e) => setKpiCategory(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                  >
                    <option value="Délais & Planning">⏱️ Délais & Planning</option>
                    <option value="Budget & Finance">💰 Budget & Finance</option>
                    <option value="Qualité & Livrables">🎯 Qualité & Livrables</option>
                    <option value="Équipe & Charge">👥 Équipe & Charge</option>
                    <option value="Risques & Blocages">⚠️ Risques & Blocages</option>
                    <option value="Satisfaction & Adoption">⭐ Satisfaction & Adoption</option>
                    <option value="Gouvernance">🏛️ Gouvernance</option>
                    <option value="Autre">📦 Autre</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Type & Unité
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={kpiType}
                      onChange={(e) => {
                        const val = e.target.value as Kpi['metricType'];
                        setKpiType(val);
                        if (val === 'percentage') setKpiUnit('%');
                        else if (val === 'currency') setKpiUnit('€');
                        else if (val === 'time') setKpiUnit('jours');
                      }}
                      className="w-2/3 text-xs px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="percentage">% Pourcent</option>
                      <option value="number">Nombre</option>
                      <option value="currency">€ Devise</option>
                      <option value="time">⏱️ Durée</option>
                      <option value="text">Texte</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Unité"
                      value={kpiUnit}
                      onChange={(e) => setKpiUnit(e.target.value)}
                      className="w-1/3 text-xs px-1.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center"
                      title="Unité d'affichage"
                    />
                  </div>
                </div>
              </div>

              {/* Current vs Target */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Valeur Actuelle
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 85"
                    value={kpiCurrent}
                    onChange={(e) => setKpiCurrent(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Valeur Cible
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 100"
                    value={kpiTarget}
                    onChange={(e) => setKpiTarget(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Status Score */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Évaluation du Statut
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setKpiScore('ok')}
                    className={`py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
                      kpiScore === 'ok'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ✓ Conforme
                  </button>
                  <button
                    type="button"
                    onClick={() => setKpiScore('warning')}
                    className={`py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
                      kpiScore === 'warning'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ⚠ Vigilance
                  </button>
                  <button
                    type="button"
                    onClick={() => setKpiScore('alert')}
                    className={`py-1 text-[11px] font-bold rounded-md border transition-all cursor-pointer ${
                      kpiScore === 'alert'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ✕ Alerte
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Méthode de calcul / Note (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Formule EV/PV ou périodicité..."
                  value={kpiDescription}
                  onChange={(e) => setKpiDescription(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Consigner le KPI
              </button>
            </form>

            {/* Quick Helper Box */}
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Conseil Méthodologique</span>
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                Limitez votre tableau de bord à <strong>5 à 8 KPIs clés</strong> pour assurer une visibilité opérationnelle maximale lors des Comités de Pilotage (COPIL).
              </p>
            </div>
          </div>
        )}

        {/* Right column: KPIs List & Filters */}
        <div className={`${canEdit ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer les KPI..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Category filter */}
              {uniqueCategories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
                >
                  <option value="all">Toutes catégories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
              >
                <option value="all">Tous statuts</option>
                <option value="ok">Conformes (OK)</option>
                <option value="warning">Vigilance</option>
                <option value="alert">Alerte</option>
              </select>
            </div>
          </div>

          {/* Empty State */}
          {kpis.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Target className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Aucun indicateur de performance configuré
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gagnez du temps en piochant directement parmi notre bibliothèque de templates standards (Jalons, Délais SPI, Coûts CPI, Qualité, Satisfaction).
                </p>
              </div>

              {canEdit && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    Parcourir la Bibliothèque de Templates
                  </button>

                  <button
                    type="button"
                    onClick={handleAddRecommendedPack}
                    className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Ajouter le Pack Essentiel (5 KPI)
                  </button>
                </div>
              )}
            </div>
          ) : filteredKpis.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Filter className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Aucun KPI ne correspond aux filtres sélectionnés</p>
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setCategoryFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredKpis.map((k) => {
                const score = k.statusScore || (k.status && k.status >= 80 ? 'ok' : k.status && k.status >= 50 ? 'warning' : 'alert');

                // Try to compute progress ratio
                const curValNum = parseFloat(k.currentValue.replace(',', '.'));
                const tgtValNum = parseFloat(k.targetValue.replace(',', '.'));
                let visualProgress = k.status ?? 100;
                if (!isNaN(curValNum) && !isNaN(tgtValNum) && tgtValNum > 0) {
                  visualProgress = Math.min(100, Math.max(0, Math.round((curValNum / tgtValNum) * 100)));
                }

                return (
                  <div
                    key={k.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      {/* Category & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {getCategoryIcon(k.category)}
                            <span>{k.category || 'Général'}</span>
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            score === 'ok'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : score === 'warning'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}>
                            {score === 'ok' ? '✓ Conforme' : score === 'warning' ? '⚠ Vigilance' : '✕ Alerte'}
                          </span>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingKpi(k)}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Modifier ce KPI"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKpi(k.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                              title="Supprimer ce KPI"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* KPI Title */}
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {k.name}
                      </h5>

                      {/* Description if present */}
                      {k.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {k.description}
                        </p>
                      )}
                    </div>

                    {/* Values & Progress Bar */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex justify-between items-baseline font-mono">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Actuel
                          </span>
                          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                            {k.currentValue} {k.unit !== 'ratio' && k.unit !== 'score' && k.unit}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Cible
                          </span>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {k.targetValue} {k.unit !== 'ratio' && k.unit !== 'score' && k.unit}
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            score === 'ok'
                              ? 'bg-emerald-500'
                              : score === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${visualProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPI Template Library Modal */}
      <KpiTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        existingKpis={kpis}
        onAddKpis={handleAddKpisFromTemplate}
        onCustomizeTemplate={handleCustomizeTemplate}
      />

      {/* KPI Edit Modal */}
      {editingKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Modifier le KPI
              </h4>
              <button
                type="button"
                onClick={() => setEditingKpi(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Intitulé du KPI *
                </label>
                <input
                  type="text"
                  required
                  value={editingKpi.name}
                  onChange={(e) => setEditingKpi({ ...editingKpi, name: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={editingKpi.category || ''}
                    onChange={(e) => setEditingKpi({ ...editingKpi, category: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Unité d'affichage
                  </label>
                  <input
                    type="text"
                    value={editingKpi.unit || ''}
                    onChange={(e) => setEditingKpi({ ...editingKpi, unit: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-center"
                    placeholder="%, €, jours..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Valeur Actuelle *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingKpi.currentValue}
                    onChange={(e) => setEditingKpi({ ...editingKpi, currentValue: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Valeur Cible *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingKpi.targetValue}
                    onChange={(e) => setEditingKpi({ ...editingKpi, targetValue: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Évaluation Statut
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingKpi({ ...editingKpi, statusScore: 'ok' })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      editingKpi.statusScore === 'ok'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ✓ Conforme
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingKpi({ ...editingKpi, statusScore: 'warning' })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      editingKpi.statusScore === 'warning'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ⚠ Vigilance
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingKpi({ ...editingKpi, statusScore: 'alert' })}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      editingKpi.statusScore === 'alert'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    ✕ Alerte
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Méthode de calcul / Notes
                </label>
                <textarea
                  rows={2}
                  value={editingKpi.description || ''}
                  onChange={(e) => setEditingKpi({ ...editingKpi, description: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingKpi(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KpisTab;
