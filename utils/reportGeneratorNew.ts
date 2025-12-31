import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatCurrency } from './currency';
import type { Church, DailyReport, Expense, Member, MemberDossier } from '../types/database';

interface AdvancedReportData {
  church: Church;
  period: 'week' | 'month' | 'year';
  reportType: 'all' | 'financial' | 'members' | 'dossiers';
  stats: {
    totalRevenue: number;
    totalExpenses: number;
    balance: number;
    byBank: Record<string, number>;
    totalMembers: number;
    activeMembers: number;
    totalDossiers: number;
    dossierCompletion: number;
    documentsCount: number;
  };
  dailyReports: DailyReport[];
  expenses: Expense[];
  members: Member[];
  dossiers: MemberDossier[];
}

export class ReportGeneratorService {
  static async generateAdvancedReport(data: AdvancedReportData): Promise<void> {
    const html = this.generateHTML(data);
    const fileName = `rapport_${data.period}_${Date.now()}.pdf`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    try {
      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Exporter le rapport',
        });
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      throw error;
    }
  }

  private static generateHTML(data: AdvancedReportData): string {
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
    .footer {
      margin-top: 50px;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
      border-top: 1px solid #ecf0f1;
      padding-top: 20px;
    }
    .bank-breakdown {
      background: #f8f9fa;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
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
  </style>
</head>
<body>
  <div class="header">
    <div class="church-name">${data.church.name}</div>
    <div class="report-title">Rapport ${reportTypeLabel} - ${periodLabel}</div>
    <div class="report-date">Généré le ${new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}</div>
  </div>

  ${(data.reportType === 'all' || data.reportType === 'financial') ? `
  <div class="section">
    <div class="section-title">💰 Résumé Financier</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Revenus Totaux</div>
        <div class="stat-value stat-positive">
          ${formatCurrency(data.stats.totalRevenue, data.church.currency)}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Dépenses Totales</div>
        <div class="stat-value stat-negative">
          ${formatCurrency(data.stats.totalExpenses, data.church.currency)}
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Solde Net</div>
        <div class="stat-value ${data.stats.balance >= 0 ? 'stat-positive' : 'stat-negative'}">
          ${formatCurrency(data.stats.balance, data.church.currency)}
        </div>
      </div>
    </div>

    <div class="bank-breakdown">
      <h3 style="margin-top: 0;">Répartition par compte:</h3>
      ${Object.entries(data.stats.byBank).map(([bank, amount]) => `
        <div class="breakdown-row">
          <span>${bank}</span>
          <strong>${formatCurrency(amount, data.church.currency)}</strong>
        </div>
      `).join('')}
    </div>
  </div>

  ${data.dailyReports.length > 0 ? `
  <div class="section">
    <div class="section-title">📝 Comptes Rendus (${data.dailyReports.length})</div>
    <table>
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
        ${data.dailyReports.map(report => `
          <tr>
            <td>${new Date(report.date).toLocaleDateString('fr-FR')}</td>
            <td>${report.category}</td>
            <td>${report.description || '-'}</td>
            <td>${report.collected_by}</td>
            <td>${report.payment_type}</td>
            <td class="amount-positive">+${formatCurrency(report.amount, data.church.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${data.expenses.length > 0 ? `
  <div class="section">
    <div class="section-title">💸 Dépenses (${data.expenses.length})</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Catégorie</th>
          <th>Description</th>
          <th>Payé à</th>
          <th>Compte</th>
          <th>Montant</th>
        </tr>
      </thead>
      <tbody>
        ${data.expenses.map(expense => `
          <tr>
            <td>${new Date(expense.date).toLocaleDateString('fr-FR')}</td>
            <td>${expense.category}</td>
            <td>${expense.description || '-'}</td>
            <td>${expense.paid_to || '-'}</td>
            <td>${expense.payment_method}</td>
            <td class="amount-negative">-${formatCurrency(expense.amount, data.church.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
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
                  ${dossier.documents?.slice(0, 2).map(doc => 
                    `<span class="document-badge" style="background: #e3f2fd; color: #1976d2;">${doc.type}</span>`
                  ).join('')}
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
          const docTypes: Record<string, number> = {};
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
    <p style="margin-top: 10px; color: #9b59b6; font-size: 11px;">
      📁 Système de Dossiers intégré • Créé par Henock Aduma
    </p>
  </div>
</body>
</html>
    `;
  }
} 