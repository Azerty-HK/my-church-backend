"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGeneratorService = void 0;
const Sharing = __importStar(require("expo-sharing"));
const expo_file_system_1 = require("expo-file-system"); // NOUVELLE API
const currency_1 = require("./currency");
class ReportGeneratorService {
    static async generateAdvancedReport(data) {
        const html = this.generateHTML(data);
        const fileName = `rapport_${data.period}_${Date.now()}.html`;
        // Utilisation de la nouvelle API FileSystem
        const directory = expo_file_system_1.FileSystem.documentDirectory;
        if (!directory) {
            throw new Error('Impossible d\'accéder au répertoire de documents');
        }
        const fileUri = `${directory}${fileName}`;
        try {
            // Créer le fichier avec la nouvelle API
            await expo_file_system_1.FileSystem.writeAsStringAsync(fileUri, html, {
                encoding: expo_file_system_1.FileSystem.EncodingType.UTF8,
            });
            console.log('✅ Rapport généré:', fileUri);
            // Partager le fichier
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/html',
                    dialogTitle: 'Exporter le rapport',
                    UTI: 'public.html' // Pour iOS
                });
            }
            else {
                console.log('❌ Le partage n\'est pas disponible sur cet appareil');
                Alert.alert('Info', 'Le rapport a été généré mais le partage n\'est pas disponible');
            }
        }
        catch (error) {
            console.error('❌ Erreur génération rapport:', error);
            throw new Error(`Erreur lors de la génération du rapport: ${error}`);
        }
    }
    // Version alternative utilisant l'API Directory/File
    static async generateAdvancedReportV2(data) {
        const html = this.generateHTML(data);
        const fileName = `rapport_${data.church.name.replace(/\s+/g, '_')}_${data.period}_${Date.now()}.html`;
        try {
            // Obtenir le répertoire des documents
            const docDir = expo_file_system_1.FileSystem.documentDirectory;
            if (!docDir) {
                throw new Error('Répertoire de documents non disponible');
            }
            // Créer un sous-répertoire pour les rapports si nécessaire
            const reportsDir = `${docDir}reports/`;
            const dirInfo = await expo_file_system_1.FileSystem.getInfoAsync(reportsDir);
            if (!dirInfo.exists) {
                await expo_file_system_1.FileSystem.makeDirectoryAsync(reportsDir, {
                    intermediates: true
                });
            }
            const fileUri = `${reportsDir}${fileName}`;
            // Écrire le fichier
            await expo_file_system_1.FileSystem.writeAsStringAsync(fileUri, html, {
                encoding: expo_file_system_1.FileSystem.EncodingType.UTF8,
            });
            console.log('📄 Rapport sauvegardé:', fileUri);
            return fileUri;
        }
        catch (error) {
            console.error('❌ Erreur génération rapport V2:', error);
            throw error;
        }
    }
    // Méthode pour exporter en PDF (si besoin)
    static async exportToPDF(data) {
        try {
            // Générer le rapport HTML d'abord
            const html = this.generateHTML(data);
            // Ici, vous pourriez utiliser une bibliothèque comme react-native-html-to-pdf
            // Pour l'instant, retournons le HTML
            console.log('📊 Rapport HTML généré pour conversion PDF');
            // Simuler la conversion PDF
            const fileName = `rapport_${data.period}_${Date.now()}.pdf`;
            const fileUri = `${expo_file_system_1.FileSystem.documentDirectory}${fileName}`;
            // En attendant une vraie conversion PDF, sauvegardons en HTML
            await expo_file_system_1.FileSystem.writeAsStringAsync(fileUri, html, {
                encoding: expo_file_system_1.FileSystem.EncodingType.UTF8,
            });
            return fileUri;
        }
        catch (error) {
            console.error('❌ Erreur export PDF:', error);
            throw error;
        }
    }
    static generateHTML(data) {
        const periodLabel = {
            week: 'Semaine',
            month: 'Mois',
            year: 'Année',
        }[data.period];
        const reportTypeLabel = {
            all: 'Complet',
            financial: 'Financier',
            members: 'Membres',
            dossiers: 'Dossiers',
        }[data.reportType];
        // Calcul des soldes par devise
        const caisseFC = data.church.current_balance_fc || 0;
        const caisseUSD = data.church.current_balance_usd || 0;
        const caisseEURO = data.church.current_balance_euro || 0;
        const banqueFC = data.church.bank_balance_fc || 0;
        const banqueUSD = data.church.bank_balance_usd || 0;
        const banqueEURO = data.church.bank_balance_euro || 0;
        // Calcul des totaux en devise principale
        const totalCaisseMainCurrency = (0, currency_1.getTotalInMainCurrency)({
            FC: caisseFC,
            USD: caisseUSD,
            EURO: caisseEURO
        }, data.church.currency);
        const totalBanqueMainCurrency = (0, currency_1.getTotalInMainCurrency)({
            FC: banqueFC,
            USD: banqueUSD,
            EURO: banqueEURO
        }, data.church.currency);
        // Calcul des totaux généraux en devise principale
        const totalRevenueMainCurrency = (0, currency_1.getTotalInMainCurrency)(data.stats.totalRevenueByCurrency, data.church.currency);
        const totalExpensesMainCurrency = (0, currency_1.getTotalInMainCurrency)(data.stats.totalExpensesByCurrency, data.church.currency);
        const totalBalanceMainCurrency = (0, currency_1.getTotalInMainCurrency)(data.stats.balanceByCurrency, data.church.currency);
        // Calcul des dépenses par devise
        const expensesByCurrency = {
            FC: data.expenses.filter(e => e.currency === 'FC').reduce((sum, e) => sum + Number(e.amount), 0),
            USD: data.expenses.filter(e => e.currency === 'USD').reduce((sum, e) => sum + Number(e.amount), 0),
            EURO: data.expenses.filter(e => e.currency === 'EURO').reduce((sum, e) => sum + Number(e.amount), 0)
        };
        // Calcul des revenus par devise
        const revenuesByCurrency = {
            FC: data.dailyReports.filter(r => r.currency === 'FC').reduce((sum, r) => sum + Number(r.amount), 0),
            USD: data.dailyReports.filter(r => r.currency === 'USD').reduce((sum, r) => sum + Number(r.amount), 0),
            EURO: data.dailyReports.filter(r => r.currency === 'EURO').reduce((sum, r) => sum + Number(r.amount), 0)
        };
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Rapport ${reportTypeLabel} - ${periodLabel}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #2c3e50;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 3px solid #3498db;
      padding-bottom: 20px;
    }
    .church-name {
      font-size: 28px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .report-title {
      font-size: 22px;
      color: #3498db;
      margin-bottom: 5px;
    }
    .report-date {
      font-size: 14px;
      color: #7f8c8d;
    }
    .main-currency-badge {
      display: inline-block;
      background: linear-gradient(45deg, #f39c12, #e67e22);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-left: 10px;
      vertical-align: middle;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 15px;
      border-left: 4px solid #3498db;
      padding-left: 10px;
    }
    .main-currency-section {
      border-left: 4px solid #f39c12;
    }
    .main-currency-section .section-title {
      border-left-color: #f39c12;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f8f9fa;
      border-left: 4px solid #3498db;
      padding: 15px;
      border-radius: 5px;
    }
    .stat-card-fc {
      border-left-color: #27ae60;
    }
    .stat-card-usd {
      border-left-color: #2980b9;
    }
    .stat-card-euro {
      border-left-color: #8e44ad;
    }
    .stat-card-main {
      border-left-color: #f39c12;
      background: linear-gradient(135deg, #fff3cd, #fff);
      border: 2px solid #f39c12;
    }
    .stat-card-expense-fc {
      border-left-color: #e74c3c;
      background: #fdeaea;
    }
    .stat-card-expense-usd {
      border-left-color: #c0392b;
      background: #fdeaea;
    }
    .stat-card-expense-euro {
      border-left-color: #a93226;
      background: #fdeaea;
    }
    .dossier-stat-card {
      background: #f3e5f5;
      border-left: 4px solid #9b59b6;
    }
    .stat-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    .stat-positive {
      color: #27ae60;
    }
    .stat-negative {
      color: #e74c3c;
    }
    .stat-dossier {
      color: #9b59b6;
    }
    .stat-main {
      color: #f39c12;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #3498db;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    .currency-fc th {
      background-color: #27ae60;
    }
    .currency-usd th {
      background-color: #2980b9;
    }
    .currency-euro th {
      background-color: #8e44ad;
    }
    .main-currency-table th {
      background-color: #f39c12;
    }
    .expense-table th {
      background-color: #e74c3c;
    }
    .dossier-table th {
      background-color: #9b59b6;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ecf0f1;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    .dossier-row {
      border-left: 4px solid #9b59b6;
    }
    .amount-positive {
      color: #27ae60;
      font-weight: bold;
    }
    .amount-negative {
      color: #e74c3c;
      font-weight: bold;
    }
    .main-currency-amount {
      color: #f39c12;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
      border-top: 1px solid #ecf0f1;
      padding-top: 20px;
    }
    .currency-breakdown {
      background: #f8f9fa;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .currency-breakdown-fc {
      background: #e8f6ef;
      border-left: 4px solid #27ae60;
    }
    .currency-breakdown-usd {
      background: #ebf5fb;
      border-left: 4px solid #2980b9;
    }
    .currency-breakdown-euro {
      background: #f4ecf7;
      border-left: 4px solid #8e44ad;
    }
    .main-currency-breakdown {
      background: #fff3cd;
      border-left: 4px solid #f39c12;
      border: 2px solid #f39c12;
    }
    .expense-breakdown {
      background: #fdeaea;
      border-left: 4px solid #e74c3c;
    }
    .dossier-breakdown {
      background: #f3e5f5;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #ecf0f1;
    }
    .progress-bar {
      height: 10px;
      background: #ecf0f1;
      border-radius: 5px;
      margin: 10px 0;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3498db, #9b59b6);
      border-radius: 5px;
    }
    .progress-fill-fc {
      background: linear-gradient(90deg, #27ae60, #2ecc71);
    }
    .progress-fill-usd {
      background: linear-gradient(90deg, #2980b9, #3498db);
    }
    .progress-fill-euro {
      background: linear-gradient(90deg, #8e44ad, #9b59b6);
    }
    .progress-fill-main {
      background: linear-gradient(90deg, #f39c12, #e67e22);
    }
    .progress-fill-expense {
      background: linear-gradient(90deg, #e74c3c, #c0392b);
    }
    .document-badge {
      display: inline-block;
      background: #e8f5e9;
      color: #27ae60;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-right: 5px;
      margin-bottom: 5px;
    }
    .currency-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 5px;
    }
    .tag-fc {
      background: #e8f6ef;
      color: #27ae60;
    }
    .tag-usd {
      background: #ebf5fb;
      color: #2980b9;
    }
    .tag-euro {
      background: #f4ecf7;
      color: #8e44ad;
    }
    .tag-main {
      background: #fff3cd;
      color: #f39c12;
      border: 1px solid #f39c12;
    }
    .tag-expense {
      background: #fdeaea;
      color: #e74c3c;
      border: 1px solid #e74c3c;
    }
    .main-currency-highlight {
      background: #fff3cd;
      padding: 10px;
      border-radius: 8px;
      border: 2px solid #f39c12;
      margin: 15px 0;
      text-align: center;
    }
    .main-currency-text {
      color: #f39c12;
      font-weight: bold;
    }
    .expense-highlight {
      background: #fdeaea;
      padding: 10px;
      border-radius: 8px;
      border: 2px solid #e74c3c;
      margin: 15px 0;
      text-align: center;
    }
    .expense-text {
      color: #e74c3c;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="church-name">${data.church.name}</div>
    <div class="report-title">Rapport ${reportTypeLabel} - ${periodLabel}</div>
    <div class="report-date">
      Généré le ${new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}
    </div>
    <div class="main-currency-highlight">
      ⭐ Devise principale: <span class="main-currency-text">${data.church.currency}</span>
      <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
        Les totaux en ${data.church.currency} incluent les conversions des autres devises
      </div>
    </div>
  </div>

  ${(data.reportType === 'all' || data.reportType === 'financial') ? `
  <div class="section">
    <div class="section-title">💰 Résumé Financier Multi-Devises</div>
    
    <!-- Totaux en devise principale -->
    <div class="stats-grid">
      <div class="stat-card stat-card-main">
        <div class="stat-label">Comptes rendus totaux (${data.church.currency})</div>
        <div class="stat-value stat-main">
          ${(0, currency_1.formatCurrency)(totalRevenueMainCurrency, data.church.currency)}
        </div>
      </div>
      <div class="stat-card stat-card-main">
        <div class="stat-label">Dépenses totales (${data.church.currency})</div>
        <div class="stat-value stat-main stat-negative">
          ${(0, currency_1.formatCurrency)(totalExpensesMainCurrency, data.church.currency)}
        </div>
      </div>
      <div class="stat-card stat-card-main">
        <div class="stat-label">Solde net (${data.church.currency})</div>
        <div class="stat-value stat-main ${totalBalanceMainCurrency >= 0 ? 'stat-positive' : 'stat-negative'}">
          ${(0, currency_1.formatCurrency)(totalBalanceMainCurrency, data.church.currency)}
        </div>
      </div>
    </div>
    
    <!-- Dépenses par devise -->
    <div class="section">
      <div class="section-title">💸 Dépenses Totales par Devise</div>
      <div class="stats-grid">
        ${expensesByCurrency.FC > 0 ? `
        <div class="stat-card stat-card-expense-fc">
          <div class="stat-label">Dépenses FC</div>
          <div class="stat-value stat-negative">
            ${(0, currency_1.formatCurrency)(expensesByCurrency.FC, 'FC')}
          </div>
        </div>
        ` : ''}
        
        ${expensesByCurrency.USD > 0 ? `
        <div class="stat-card stat-card-expense-usd">
          <div class="stat-label">Dépenses USD</div>
          <div class="stat-value stat-negative">
            ${(0, currency_1.formatCurrency)(expensesByCurrency.USD, 'USD')}
          </div>
        </div>
        ` : ''}
        
        ${expensesByCurrency.EURO > 0 ? `
        <div class="stat-card stat-card-expense-euro">
          <div class="stat-label">Dépenses EURO</div>
          <div class="stat-value stat-negative">
            ${(0, currency_1.formatCurrency)(expensesByCurrency.EURO, 'EURO')}
          </div>
        </div>
        ` : ''}
        
        ${Object.values(expensesByCurrency).every(v => v === 0) ? `
        <div class="stat-card">
          <div class="stat-label">Dépenses</div>
          <div class="stat-value">Aucune dépense</div>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Détails comptes rendus par devise -->
    <div class="stats-grid">
      <div class="stat-card stat-card-fc">
        <div class="stat-label">Comptes rendus FC</div>
        <div class="stat-value stat-positive">
          ${(0, currency_1.formatCurrency)(data.stats.totalRevenueByCurrency.FC, 'FC')}
        </div>
      </div>
      <div class="stat-card stat-card-usd">
        <div class="stat-label">Comptes rendus USD</div>
        <div class="stat-value stat-positive">
          ${(0, currency_1.formatCurrency)(data.stats.totalRevenueByCurrency.USD, 'USD')}
        </div>
      </div>
      <div class="stat-card stat-card-euro">
        <div class="stat-label">Comptes rendus EURO</div>
        <div class="stat-value stat-positive">
          ${(0, currency_1.formatCurrency)(data.stats.totalRevenueByCurrency.EURO, 'EURO')}
        </div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card stat-card-fc">
        <div class="stat-label">Dépenses FC</div>
        <div class="stat-value stat-negative">
          ${(0, currency_1.formatCurrency)(data.stats.totalExpensesByCurrency.FC, 'FC')}
        </div>
      </div>
      <div class="stat-card stat-card-usd">
        <div class="stat-label">Dépenses USD</div>
        <div class="stat-value stat-negative">
          ${(0, currency_1.formatCurrency)(data.stats.totalExpensesByCurrency.USD, 'USD')}
        </div>
      </div>
      <div class="stat-card stat-card-euro">
        <div class="stat-label">Dépenses EURO</div>
        <div class="stat-value stat-negative">
          ${(0, currency_1.formatCurrency)(data.stats.totalExpensesByCurrency.EURO, 'EURO')}
        </div>
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card stat-card-fc">
        <div class="stat-label">Solde Net FC</div>
        <div class="stat-value ${data.stats.balanceByCurrency.FC >= 0 ? 'stat-positive' : 'stat-negative'}">
          ${(0, currency_1.formatCurrency)(data.stats.balanceByCurrency.FC, 'FC')}
        </div>
      </div>
      <div class="stat-card stat-card-usd">
        <div class="stat-label">Solde Net USD</div>
        <div class="stat-value ${data.stats.balanceByCurrency.USD >= 0 ? 'stat-positive' : 'stat-negative'}">
          ${(0, currency_1.formatCurrency)(data.stats.balanceByCurrency.USD, 'USD')}
        </div>
      </div>
      <div class="stat-card stat-card-euro">
        <div class="stat-label">Solde Net EURO</div>
        <div class="stat-value ${data.stats.balanceByCurrency.EURO >= 0 ? 'stat-positive' : 'stat-negative'}">
          ${(0, currency_1.formatCurrency)(data.stats.balanceByCurrency.EURO, 'EURO')}
        </div>
      </div>
    </div>

    <!-- Soldes actuels par devise -->
    <div class="section main-currency-section">
      <div class="section-title">🏦 Soldes Actuels</div>
      
      <!-- Totaux en devise principale -->
      <div class="main-currency-breakdown">
        <h3 style="margin-top: 0;">Totaux en devise principale (${data.church.currency})</h3>
        <div class="breakdown-row">
          <span>💰 Total Caisse</span>
          <strong class="main-currency-text">${(0, currency_1.formatCurrency)(totalCaisseMainCurrency, data.church.currency)}</strong>
        </div>
        <div class="breakdown-row">
          <span>🏦 Total Banque</span>
          <strong class="main-currency-text">${(0, currency_1.formatCurrency)(totalBanqueMainCurrency, data.church.currency)}</strong>
        </div>
        <div class="breakdown-row" style="border-top: 2px solid #f39c12; font-weight: bold;">
          <span>📊 Total Général</span>
          <strong class="main-currency-text">${(0, currency_1.formatCurrency)(totalCaisseMainCurrency + totalBanqueMainCurrency, data.church.currency)}</strong>
        </div>
      </div>
      
      <div class="currency-breakdown currency-breakdown-fc">
        <h3 style="margin-top: 0;">Francs Congolais (FC)</h3>
        <div class="breakdown-row">
          <span>💰 Caisse FC</span>
          <strong>${(0, currency_1.formatCurrency)(caisseFC, 'FC')}</strong>
        </div>
        <div class="breakdown-row">
          <span>🏦 Banque FC</span>
          <strong>${(0, currency_1.formatCurrency)(banqueFC, 'FC')}</strong>
        </div>
        <div class="breakdown-row" style="border-top: 2px solid #27ae60; font-weight: bold;">
          <span>📊 Total FC</span>
          <strong>${(0, currency_1.formatCurrency)(caisseFC + banqueFC, 'FC')}</strong>
        </div>
      </div>
      
      ${caisseUSD > 0 || banqueUSD > 0 ? `
      <div class="currency-breakdown currency-breakdown-usd">
        <h3 style="margin-top: 0;">Dollars US (USD)</h3>
        <div class="breakdown-row">
          <span>💰 Caisse USD</span>
          <strong>${(0, currency_1.formatCurrency)(caisseUSD, 'USD')}</strong>
        </div>
        <div class="breakdown-row">
          <span>🏦 Banque USD</span>
          <strong>${(0, currency_1.formatCurrency)(banqueUSD, 'USD')}</strong>
        </div>
        <div class="breakdown-row" style="border-top: 2px solid #2980b9; font-weight: bold;">
          <span>📊 Total USD</span>
          <strong>${(0, currency_1.formatCurrency)(caisseUSD + banqueUSD, 'USD')}</strong>
        </div>
      </div>
      ` : ''}
      
      ${caisseEURO > 0 || banqueEURO > 0 ? `
      <div class="currency-breakdown currency-breakdown-euro">
        <h3 style="margin-top: 0;">Euros (EURO)</h3>
        <div class="breakdown-row">
          <span>💰 Caisse EURO</span>
          <strong>${(0, currency_1.formatCurrency)(caisseEURO, 'EURO')}</strong>
        </div>
        <div class="breakdown-row">
          <span>🏦 Banque EURO</span>
          <strong>${(0, currency_1.formatCurrency)(banqueEURO, 'EURO')}</strong>
        </div>
        <div class="breakdown-row" style="border-top: 2px solid #8e44ad; font-weight: bold;">
          <span>📊 Total EURO</span>
          <strong>${(0, currency_1.formatCurrency)(caisseEURO + banqueEURO, 'EURO')}</strong>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Activités récentes (transactions) -->
    <div class="section">
      <div class="section-title">📊 Activités Récentes</div>
      
      <!-- Combiner et trier les transactions -->
      ${(() => {
            const allTransactions = [
                ...data.dailyReports.map(r => ({ ...r, type: 'report', date: new Date(r.date) })),
                ...data.expenses.map(e => ({ ...e, type: 'expense', date: new Date(e.date) }))
            ]
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 10);
            if (allTransactions.length === 0) {
                return '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Aucune activité récente</p>';
            }
            let html = '<table>';
            html += '<thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Devise</th><th>Montant</th></tr></thead>';
            html += '<tbody>';
            allTransactions.forEach(transaction => {
                const isReport = transaction.type === 'report';
                const amountClass = isReport ? 'amount-positive' : 'amount-negative';
                const amountSign = isReport ? '+' : '-';
                const typeLabel = isReport ? '📋 Compte rendu' : '💸 Dépense';
                const typeIcon = isReport ? '📋' : '💸';
                html += `
            <tr>
              <td>${transaction.date.toLocaleDateString('fr-FR')}</td>
              <td>${typeIcon} ${typeLabel}</td>
              <td>${transaction.description || '-'}</td>
              <td>
                <span class="currency-tag ${transaction.currency === 'FC' ? 'tag-fc' : transaction.currency === 'USD' ? 'tag-usd' : 'tag-euro'}">
                  ${transaction.currency}
                </span>
              </td>
              <td class="${amountClass}">
                ${amountSign}${(0, currency_1.formatCurrency)(Number(transaction.amount), transaction.currency)}
              </td>
            </tr>
          `;
            });
            html += '</tbody></table>';
            return html;
        })()}
    </div>

    <!-- Comptes rendus par devise -->
    ${data.dailyReports.length > 0 ? `
    <div class="section">
      <div class="section-title">📝 Comptes Rendus (${data.dailyReports.length})</div>
      
      <!-- FC -->
      ${data.dailyReports.filter(r => r.currency === 'FC').length > 0 ? `
      <h3>Francs Congolais (FC) <span class="currency-tag tag-fc">${(0, currency_1.formatCurrency)(revenuesByCurrency.FC, 'FC')}</span></h3>
      <table class="currency-fc">
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th>Collecteur</th>
            <th>Compte</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${data.dailyReports.filter(r => r.currency === 'FC').map(report => `
            <tr>
              <td>${new Date(report.date).toLocaleDateString('fr-FR')}</td>
              <td>${report.category}</td>
              <td>${report.description || '-'}</td>
              <td>${report.recorded_by}</td>
              <td>${report.payment_method === 'cash' ? 'Caisse' : 'Banque'}</td>
              <td class="amount-positive">+${(0, currency_1.formatCurrency)(report.amount, 'FC')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
      
      <!-- USD -->
      ${data.dailyReports.filter(r => r.currency === 'USD').length > 0 ? `
      <h3>Dollars US (USD) <span class="currency-tag tag-usd">${(0, currency_1.formatCurrency)(revenuesByCurrency.USD, 'USD')}</span></h3>
      <table class="currency-usd">
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th>Collecteur</th>
            <th>Compte</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${data.dailyReports.filter(r => r.currency === 'USD').map(report => `
            <tr>
              <td>${new Date(report.date).toLocaleDateString('fr-FR')}</td>
              <td>${report.category}</td>
              <td>${report.description || '-'}</td>
              <td>${report.recorded_by}</td>
              <td>${report.payment_method === 'cash' ? 'Caisse' : 'Banque'}</td>
              <td class="amount-positive">+${(0, currency_1.formatCurrency)(report.amount, 'USD')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
      
      <!-- EURO -->
      ${data.dailyReports.filter(r => r.currency === 'EURO').length > 0 ? `
      <h3>Euros (EURO) <span class="currency-tag tag-euro">${(0, currency_1.formatCurrency)(revenuesByCurrency.EURO, 'EURO')}</span></h3>
      <table class="currency-euro">
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th>Collecteur</th>
            <th>Compte</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${data.dailyReports.filter(r => r.currency === 'EURO').map(report => `
            <tr>
              <td>${new Date(report.date).toLocaleDateString('fr-FR')}</td>
              <td>${report.category}</td>
              <td>${report.description || '-'}</td>
              <td>${report.recorded_by}</td>
              <td>${report.payment_method === 'cash' ? 'Caisse' : 'Banque'}</td>
              <td class="amount-positive">+${(0, currency_1.formatCurrency)(report.amount, 'EURO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
    </div>
    ` : ''}

    <!-- Dépenses par devise -->
    ${data.expenses.length > 0 ? `
    <div class="section">
      <div class="section-title">💸 Dépenses (${data.expenses.length})</div>
      
      <!-- FC -->
      ${expensesByCurrency.FC > 0 ? `
      <h3>Francs Congolais (FC) <span class="currency-tag tag-expense">${(0, currency_1.formatCurrency)(expensesByCurrency.FC, 'FC')}</span></h3>
      <table class="expense-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th>Payé par</th>
            <th>Compte</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${data.expenses.filter(e => e.currency === 'FC').map(expense => `
            <tr>
              <td>${new Date(expense.date).toLocaleDateString('fr-FR')}</td>
              <td>${expense.category}</td>
              <td>${expense.description || '-'}</td>
              <td>${expense.recorded_by}</td>
              <td>${expense.payment_method === 'cash' ? 'Caisse' : 'Banque'}</td>
              <td class="amount-negative">-${(0, currency_1.formatCurrency)(expense.amount, 'FC')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
      
      <!-- USD -->
      ${expensesByCurrency.USD > 0 ? `
      <h3>Dollars US (USD) <span class="currency-tag tag-expense">${(0, currency_1.formatCurrency)(expensesByCurrency.USD, 'USD')}</span></h3>
      <table class="expense-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th>Payé par</th>
            <th>Compte</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${data.expenses.filter(e => e.currency === 'USD').map(expense => `
            <tr>
              <td>${new Date(expense.date).toLocaleDateString('fr-FR')}</td>
              <td>${expense.category}</td>
              <td>${expense.description || '-'}</td>
              <td>${expense.recorded_by}</td>
              <td>${expense.payment_method === 'cash' ? 'Caisse' : 'Banque'}</td>
              <td class="amount-negative">-${(0, currency_1.formatCurrency)(expense.amount, 'USD')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
      
      <!-- EURO -->
      ${expensesByCurrency.EURO > 0 ? `
      <h3>Euros (EURO) <span class="currency-tag tag-expense">${(0, currency_1.formatCurrency)(expensesByCurrency.EURO, 'EURO')}</span></h3>
      <table class="expense-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th>Payé par</th>
            <th>Compte</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          ${data.expenses.filter(e => e.currency === 'EURO').map(expense => `
            <tr>
              <td>${new Date(expense.date).toLocaleDateString('fr-FR')}</td>
              <td>${expense.category}</td>
              <td>${expense.description || '-'}</td>
              <td>${expense.recorded_by}</td>
              <td>${expense.payment_method === 'cash' ? 'Caisse' : 'Banque'}</td>
              <td class="amount-negative">-${(0, currency_1.formatCurrency)(expense.amount, 'EURO')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${(data.reportType === 'all' || data.reportType === 'members') ? `
  <div class="section">
    <div class="section-title">👥 Statistiques Membres</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Membres Total</div>
        <div class="stat-value">${data.stats.totalMembers}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Membres Actifs</div>
        <div class="stat-value stat-positive">${data.stats.activeMembers}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Membres Inactifs</div>
        <div class="stat-value stat-negative">${data.stats.totalMembers - data.stats.activeMembers}</div>
      </div>
      <div class="stat-card dossier-stat-card">
        <div class="stat-label">Avec Dossier</div>
        <div class="stat-value stat-dossier">${data.stats.totalDossiers}</div>
      </div>
    </div>
    
    ${data.stats.salaryByCurrency ? `
    <div class="section main-currency-section">
      <div class="section-title">💼 Masse Salariale par Devise</div>
      <div class="stats-grid">
        ${Object.entries(data.stats.salaryByCurrency)
            .filter(([_, amount]) => amount > 0)
            .map(([currency, amount]) => `
            <div class="stat-card stat-card-${currency.toLowerCase()}">
              <div class="stat-label">Salaires ${currency}</div>
              <div class="stat-value">${(0, currency_1.formatCurrency)(amount, currency)}</div>
            </div>
          `).join('')}
      </div>
      ${data.church.currency && data.stats.salaryByCurrency[data.church.currency] ? `
        <div class="main-currency-highlight">
          ⭐ Total salaires en ${data.church.currency}: 
          ${(0, currency_1.formatCurrency)(data.stats.salaryByCurrency[data.church.currency], data.church.currency)}
        </div>
      ` : ''}
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${(data.reportType === 'all' || data.reportType === 'dossiers') ? `
  <div class="section">
    <div class="section-title">📁 Statistiques Dossiers</div>
    <div class="stats-grid">
      <div class="stat-card dossier-stat-card">
        <div class="stat-label">Dossiers Créés</div>
        <div class="stat-value stat-dossier">${data.stats.totalDossiers}</div>
      </div>
      <div class="stat-card dossier-stat-card">
        <div class="stat-label">Taux de Complétion</div>
        <div class="stat-value stat-dossier">${data.stats.dossierCompletion}%</div>
      </div>
      <div class="stat-card dossier-stat-card">
        <div class="stat-label">Documents Totaux</div>
        <div class="stat-value stat-dossier">${data.stats.documentsCount}</div>
      </div>
    </div>

    <div class="dossier-breakdown">
      <h3 style="margin-top: 0;">Progression des dossiers:</h3>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${data.stats.dossierCompletion}%"></div>
      </div>
      <div style="text-align: center; font-size: 12px; color: #7f8c8d;">
        ${data.stats.totalDossiers} / ${data.stats.totalMembers} membres avec dossier (${data.stats.dossierCompletion}%)
      </div>
    </div>

    ${data.dossiers.length > 0 ? `
    <div class="section">
      <div class="section-title">📋 Détail des Dossiers</div>
      <table class="dossier-table">
        <thead>
          <tr>
            <th>Membre</th>
            <th>Type</th>
            <th>Documents</th>
            <th>Créé le</th>
            <th>Mis à jour</th>
          </tr>
        </thead>
        <tbody>
          ${data.dossiers.slice(0, 10).map(dossier => {
            const member = data.members.find(m => m.id === dossier.member_id);
            const memberName = member ? `${member.first_name} ${member.last_name}` : 'Membre inconnu';
            const documentCount = dossier.documents?.length || 0;
            return `
            <tr class="dossier-row">
              <td>${memberName}</td>
              <td>${dossier.dossier_type === 'personnel' ? '👔 Personnel' : '🙏 Membre'}</td>
              <td>
                ${documentCount > 0 ? `
                  <span class="document-badge">${documentCount} doc${documentCount > 1 ? 's' : ''}</span>
                  ${dossier.documents?.slice(0, 2).map(doc => `<span class="document-badge" style="background: #e3f2fd; color: #1976d2;">${doc.type}</span>`).join('')}
                  ${documentCount > 2 ? `<span class="document-badge">+${documentCount - 2}</span>` : ''}
                ` : '<span style="color: #bdc3c7; font-style: italic;">Aucun</span>'}
              </td>
              <td>${new Date(dossier.created_at).toLocaleDateString('fr-FR')}</td>
              <td>${new Date(dossier.updated_at).toLocaleDateString('fr-FR')}</td>
            </tr>
            `;
        }).join('')}
          ${data.dossiers.length > 10 ? `
            <tr>
              <td colspan="5" style="text-align: center; color: #7f8c8d; font-style: italic;">
                ... et ${data.dossiers.length - 10} autres dossiers
              </td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
    ` : ''}

    ${data.dossiers.length > 0 ? `
    <div class="section">
      <div class="section-title">📊 Analyse des Documents</div>
      <div class="dossier-breakdown">
        <h4>Types de documents les plus courants:</h4>
        ${(() => {
            const docTypes = {};
            data.dossiers.forEach(dossier => {
                dossier.documents?.forEach(doc => {
                    docTypes[doc.type] = (docTypes[doc.type] || 0) + 1;
                });
            });
            const sortedTypes = Object.entries(docTypes)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            return sortedTypes.map(([type, count]) => `
            <div class="breakdown-row">
              <span>📄 ${type}</span>
              <strong>${count} document${count > 1 ? 's' : ''}</strong>
            </div>
          `).join('');
        })()}
      </div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="footer">
    <p>Rapport généré par My Church</p>
    <p>${data.church.name} - ${data.church.address || ''}</p>
    <p style="margin-top: 10px; color: #f39c12; font-size: 11px;">
      ⭐ Devise principale: ${data.church.currency} • 📁 Système Multi-Devises • Créé par Henock Aduma
    </p>
    <p style="font-size: 10px; color: #95a5a6; margin-top: 5px;">
      Devises supportées: FC • USD • EURO • Devise principale: ${data.church.currency}
    </p>
  </div>
</body>
</html>
    `;
    }
}
exports.ReportGeneratorService = ReportGeneratorService;
