import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Project } from '../types';
import TimeEatsLogo from './TimeEatsLogo';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  ExternalLink,
  X,
  Share2,
  Sparkles,
  HeartHandshake,
  Smartphone,
  ShieldCheck,
  Layers
} from 'lucide-react';

interface RexQrCodeModalProps {
  project?: Project | null;
  projects?: Project[];
  isOpen: boolean;
  onClose: () => void;
}

export default function RexQrCodeModal({
  project,
  projects = [],
  isOpen,
  onClose
}: RexQrCodeModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(project?.id || 'all');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Selected project object if any
  const currentProject = selectedProjectId === 'all' 
    ? null 
    : projects.find((p) => p.id === selectedProjectId) || (project?.id === selectedProjectId ? project : null);

  // Target base URL specified by the user
  const baseUrl = 'https://app.homelabtj.fr/rex';
  
  // Computed target URL with query params
  const targetUrl = currentProject
    ? `${baseUrl}?project=${encodeURIComponent(currentProject.id)}`
    : baseUrl;

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download QR Code as PNG
  const handleDownloadQR = () => {
    const svgElement = document.getElementById('rex-qr-code-svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 50, 50, 500, 500);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR-REX-${currentProject ? currentProject.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Portail-General'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  // Print Flyer / Poster for REX
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                QR Code & Portail REX Flash
              </h3>
              <p className="text-xs text-slate-300">
                Accès direct pour recueillir les retours d'expérience et constats
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Project Selector if multiple projects available */}
          {projects.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Projet Cible pour le REX :
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">🌐 Portail REX Global (Choix du projet libre)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name} {p.clientName ? `(${p.clientName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Printable Flyer Card Preview */}
          <div
            ref={printRef}
            className="bg-gradient-to-b from-indigo-50/50 via-white to-slate-50 dark:from-slate-850 dark:via-slate-900 dark:to-slate-850 p-6 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 shadow-xs flex flex-col items-center text-center space-y-4 relative"
          >
            {/* Top Brand */}
            <div className="flex items-center gap-2">
              <TimeEatsLogo className="h-6 w-auto" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono">
                Portail Retour d'Expérience
              </span>
            </div>

            {/* Target title */}
            <div className="space-y-1 max-w-sm">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {currentProject ? currentProject.name : 'Tous les Projets de l’Organisation'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scannez le QR code avec votre smartphone pour partager un succès, une difficulté ou une recommandation (anonyme ou signé).
              </p>
            </div>

            {/* Rendered QR Code */}
            <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 inline-block">
              <QRCodeSVG
                id="rex-qr-code-svg"
                value={targetUrl}
                size={180}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: '/icon.png',
                  x: undefined,
                  y: undefined,
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
            </div>

            {/* URL Display Pill */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 max-w-full truncate">
              <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{targetUrl}</span>
            </div>

            {/* Bottom badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                <ShieldCheck className="w-3 h-3" /> Soumission Anonyme ou Identifiée
              </span>
              <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-semibold">
                <Sparkles className="w-3 h-3" /> Intégration Immédiate
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Lien copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copier le Lien</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadQR}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger QR (PNG)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer l'Affiche</span>
            </button>
          </div>

          {/* Direct Link Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Tester l'accès direct au formulaire dans votre navigateur :
            </span>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              Ouvrir le portail <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
