import type { Church, DailyReport, Expense, Member, Archive, MemberDossier, DossierMetrics } from '../types/database';
import { formatAmount, getCurrencySymbol, formatCurrency } from './currency';

export interface ReportOptions {
  includeDetails?: boolean;
  includeCharts?: boolean;
  includeDossiers?: boolean;
  format?: 'text' | 'html' | 'json';
}

export class ReportGenerator {
  static generateFinancialReport(
    church: Church,
    dailyReports: DailyReport[],
    expenses: Expense[],
    period: string,
    options: ReportOptions = {}
  ): string {
    const { includeDetails = true, format = 'text', includeDossiers = false } = options;
    
    const approvedExpenses = expenses.filter(expense => expense.is_approved);
    const pendingExpenses = expenses.filter(expense => !expense.is_approved);
    
    const totalIncome = dailyReports.reduce((sum, report) => sum + Number(report.amount), 0);
    const totalExpenses = approvedExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const pendingAmount = pendingExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const balance = totalIncome - totalExpenses;

    const currencySymbol = getCurrencySymbol(church.currency);

    if (format === 'json') {
      return JSON.stringify({
        generatedBy: church.name,
        church: church.name,
        period,
        currency: church.currency,
        summary: {
          totalIncome,
          totalExpenses,
          pendingAmount,
          balance,
          transactionCount: dailyReports.length + expenses.length
        },
        details: includeDetails ? {
          dailyReports,
          approvedExpenses,
          pendingExpenses
        } : undefined,
        generatedAt: new Date().toISOString()
      }, null, 2);
    }

    const report = `
╔══════════════════════════════════════════════════════════════╗
║                    RAPPORT FINANCIER                         ║
║                      ${period}                               ║
╚══════════════════════════════════════════════════════════════╝

Ce rapport a été généré par : ${church.name}

ÉGLISE: ${church.name}
ADRESSE: ${church.address || 'Non spécifiée'}
EMAIL: ${church.email}
TÉLÉPHONE: ${church.phone || 'Non spécifié'}
DEVISE: ${church.currency} (${currencySymbol})

═══════════════════════════════════════════════════════════════
                        RÉSUMÉ FINANCIER
═══════════════════════════════════════════════════════════════

💰 REVENUS TOTAUX:           ${formatAmount(totalIncome, church.currency)}
💸 DÉPENSES APPROUVÉES:      ${formatAmount(totalExpenses, church.currency)}
⏳ DÉPENSES EN ATTENTE:      ${formatAmount(pendingAmount, church.currency)}
📊 SOLDE NET:               ${formatAmount(balance, church.currency)}
🏦 SOLDE CAISSE ACTUEL:     ${formatAmount(church.current_balance, church.currency)}
🏛️ SOLDE BANQUE ACTUEL:     ${formatAmount(church.bank_balance, church.currency)}

📈 NOMBRE DE TRANSACTIONS:   ${dailyReports.length + expenses.length}
   • Comptes rendus: ${dailyReports.length}
   • Dépenses: ${expenses.length} (${approvedExpenses.length} approuvées, ${pendingExpenses.length} en attente)

${includeDetails ? `
═══════════════════════════════════════════════════════════════
                    DÉTAIL DES COMPTES RENDUS
═══════════════════════════════════════════════════════════════

${dailyReports.length > 0 ? dailyReports.map(report => {
  let line = `📅 ${new Date(report.date).toLocaleDateString('fr-FR')} | ${formatAmount(Number(report.amount), church.currency)} | ${report.description} | ${report.category} | Par: ${report.recorded_by}`;
  
  if (report.bills_breakdown && report.bills_breakdown.length > 0) {
    const billsDetail = report.bills_breakdown.filter(b => b.quantity > 0).map(b => `${b.quantity}×${b.bill_label}`).join(', ');
    line += ` | 🧮 Billets: ${billsDetail}`;
  }
  
  return line;
}).join('\n') : 'Aucun compte rendu enregistré'}

═══════════════════════════════════════════════════════════════
                    DÉTAIL DES DÉPENSES APPROUVÉES
═══════════════════════════════════════════════════════════════

${approvedExpenses.length > 0 ? approvedExpenses.map(expense => 
  `📅 ${new Date(expense.date).toLocaleDateString('fr-FR')} | ${formatAmount(Number(expense.amount), church.currency)} | ${expense.description} | Catégorie: ${expense.category || 'Général'} | Par: ${expense.recorded_by}${expense.approved_by ? ` | Approuvé par: ${expense.approved_by}` : ''}`
).join('\n') : 'Aucune dépense approuvée'}

${pendingExpenses.length > 0 ? `
═══════════════════════════════════════════════════════════════
                    DÉPENSES EN ATTENTE D'APPROBATION
═══════════════════════════════════════════════════════════════

${pendingExpenses.map(expense => 
  `📅 ${new Date(expense.date).toLocaleDateString('fr-FR')} | ${formatAmount(Number(expense.amount), church.currency)} | ${expense.description} | Catégorie: ${expense.category || 'Général'} | Par: ${expense.recorded_by}`
).join('\n')}` : ''}
` : ''}

═══════════════════════════════════════════════════════════════
                        INFORMATIONS
═══════════════════════════════════════════════════════════════

📊 Rapport généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
🏛️ Application: My Church - Gestion d'Église
⛪ Église: ${church.name}
📧 Contact: ${church.email}
🔑 API Key: ${church.api_key}
🔄 Update Code: ${church.update_code}

═══════════════════════════════════════════════════════════════
    `.trim();

    return report;
  }

  static generateMembersReport(
    church: Church, 
    members: Member[], 
    period: string,
    options: ReportOptions = {}
  ): string {
    const { includeDetails = true, format = 'text', includeDossiers = true } = options;
    
    const personnelMembers = members.filter(m => m.member_type === 'Personnel');
    const regularMembers = members.filter(m => m.member_type === 'Membre');
    
    // Statistiques par département
    const departmentStats = new Map<string, number>();
    members.forEach(member => {
      member.departments?.forEach(dept => {
        if (dept.trim()) {
          departmentStats.set(dept, (departmentStats.get(dept) || 0) + 1);
        }
      });
    });

    // Statistiques par poste
    const positionStats = new Map<string, number>();
    personnelMembers.forEach(member => {
      if (member.position) {
        positionStats.set(member.position, (positionStats.get(member.position) || 0) + 1);
      }
    });

    // Statistiques des dossiers
    const membersWithDossier = members.filter(m => m.has_dossier).length;
    const dossierStatusStats = {
      complet: members.filter(m => m.dossier_status === 'complet').length,
      en_revision: members.filter(m => m.dossier_status === 'en_revision').length,
      incomplet: members.filter(m => m.dossier_status === 'incomplet').length,
      archive: members.filter(m => m.dossier_status === 'archive').length,
    };

    if (format === 'json') {
      return JSON.stringify({
        generatedBy: church.name,
        church: church.name,
        period,
        summary: {
          totalMembers: members.length,
          personnel: personnelMembers.length,
          regularMembers: regularMembers.length,
          withDossier: membersWithDossier,
          dossierStats: dossierStatusStats,
          departments: Object.fromEntries(departmentStats),
          positions: Object.fromEntries(positionStats)
        },
        details: includeDetails ? {
          personnel: personnelMembers,
          members: regularMembers
        } : undefined,
        generatedAt: new Date().toISOString()
      }, null, 2);
    }

    const dossierSection = includeDossiers ? `
═══════════════════════════════════════════════════════════════
                       STATISTIQUES DOSSIERS
═══════════════════════════════════════════════════════════════

📁 MEMBRES AVEC DOSSIER:     ${membersWithDossier} / ${members.length} (${Math.round((membersWithDossier / members.length) * 100)}%)
📊 STATUT DES DOSSIERS:
   • ✅ Complets: ${dossierStatusStats.complet}
   • 📝 En révision: ${dossierStatusStats.en_revision}
   • ⚠️ Incomplets: ${dossierStatusStats.incomplet}
   • 🗄️ Archivés: ${dossierStatusStats.archive}

💡 Taux de complétion: ${Math.round((dossierStatusStats.complet / Math.max(membersWithDossier, 1)) * 100)}%
` : '';

    const report = `
╔══════════════════════════════════════════════════════════════╗
║                    RAPPORT DES MEMBRES                      ║
║                      ${period}                               ║
╚══════════════════════════════════════════════════════════════╝

Ce rapport a été généré par : ${church.name}

ÉGLISE: ${church.name}
ADRESSE: ${church.address || 'Non spécifiée'}
EMAIL: ${church.email}

═══════════════════════════════════════════════════════════════
                    STATISTIQUES GÉNÉRALES
═══════════════════════════════════════════════════════════════

👥 TOTAL DES MEMBRES:        ${members.length}
👔 PERSONNEL:               ${personnelMembers.length}
🙏 MEMBRES RÉGULIERS:       ${regularMembers.length}

${dossierSection}

📊 RÉPARTITION PAR DÉPARTEMENT:
${Array.from(departmentStats.entries()).map(([dept, count]) => 
  `   • ${dept}: ${count} membre${count > 1 ? 's' : ''}`
).join('\n') || '   Aucun département défini'}

👔 RÉPARTITION PAR POSTE (Personnel):
${Array.from(positionStats.entries()).map(([position, count]) => 
  `   • ${position}: ${count} personne${count > 1 ? 's' : ''}`
).join('\n') || '   Aucun poste défini'}

${includeDetails ? `
═══════════════════════════════════════════════════════════════
                        PERSONNEL
═══════════════════════════════════════════════════════════════

${personnelMembers.length > 0 ? personnelMembers.map(member => 
  `👔 ${member.first_name} ${member.last_name}
   📧 Email: ${member.email}
   📞 Téléphone: ${member.phone || 'Non spécifié'}
   🏢 Poste: ${member.position || 'Non spécifié'}
   📋 Départements: ${member.departments?.join(', ') || 'Aucun'}
   💰 Salaire: ${member.salary ? formatAmount(member.salary, church.currency) : 'Non spécifié'}
   📱 QR Code: ${member.qr_code || 'Non généré'}
   📁 Dossier: ${member.has_dossier ? (member.dossier_status ? `✅ ${member.dossier_status.charAt(0).toUpperCase() + member.dossier_status.slice(1)}` : '✅ Disponible') : '❌ Non créé'}
   📅 Inscrit le: ${new Date(member.created_at || '').toLocaleDateString('fr-FR')}
`).join('\n') : 'Aucun personnel enregistré'}

═══════════════════════════════════════════════════════════════
                      MEMBRES RÉGULIERS
═══════════════════════════════════════════════════════════════

${regularMembers.length > 0 ? regularMembers.map(member => 
  `🙏 ${member.first_name} ${member.last_name}
   📧 Email: ${member.email}
   📞 Téléphone: ${member.phone || 'Non spécifié'}
   🏠 Adresse: ${member.address || 'Non spécifiée'}
   📋 Départements: ${member.departments?.join(', ') || 'Aucun'}
   📱 QR Code: ${member.qr_code || 'Non généré'}
   📁 Dossier: ${member.has_dossier ? (member.dossier_status ? `✅ ${member.dossier_status.charAt(0).toUpperCase() + member.dossier_status.slice(1)}` : '✅ Disponible') : '❌ Non créé'}
   📅 Inscrit le: ${new Date(member.created_at || '').toLocaleDateString('fr-FR')}
`).join('\n') : 'Aucun membre régulier enregistré'}
` : ''}

═══════════════════════════════════════════════════════════════
                        INFORMATIONS
═══════════════════════════════════════════════════════════════

📊 Rapport généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
🏛️ Application: My Church - Gestion d'Église
⛪ Église: ${church.name}
📧 Contact: ${church.email}
📁 Système de dossiers: ${church.dossier_auto_create ? '✅ Activé' : '❌ Désactivé'}

═══════════════════════════════════════════════════════════════
    `.trim();

    return report;
  }

  static generateDossierReport(
    church: Church,
    dossiers: MemberDossier[],
    members: Member[],
    dossierMetrics: DossierMetrics,
    period: string
  ): string {
    const totalMembers = members.length;
    const membersWithDossier = dossiers.length;
    const dossierPercentage = totalMembers > 0 ? Math.round((membersWithDossier / totalMembers) * 100) : 0;

    const getMemberName = (memberId: string): string => {
      const member = members.find(m => m.id === memberId);
      return member ? `${member.first_name} ${member.last_name}` : 'Membre inconnu';
    };

    return `
╔══════════════════════════════════════════════════════════════╗
║                   RAPPORT DES DOSSIERS                      ║
║                      ${period}                               ║
╚══════════════════════════════════════════════════════════════╝

Ce rapport a été généré par : ${church.name}

ÉGLISE: ${church.name}
ADRESSE: ${church.address || 'Non spécifiée'}
EMAIL: ${church.email}

═══════════════════════════════════════════════════════════════
                    STATISTIQUES GLOBALES
═══════════════════════════════════════════════════════════════

📊 TOTAL MEMBRES:            ${totalMembers}
📁 AVEC DOSSIER:            ${membersWithDossier} (${dossierPercentage}%)
📄 DOCUMENTS TOTAUX:        ${dossierMetrics.totalDocuments}
📈 MOYENNE DOCS/DOSSIER:    ${dossierMetrics.averageDocumentsPerDossier.toFixed(1)}
🎯 TAUX COMPLÉTION:         ${dossierMetrics.dossierCompletionRate}%

═══════════════════════════════════════════════════════════════
                  RÉPARTITION PAR TYPE
═══════════════════════════════════════════════════════════════

👔 PERSONNEL:               ${dossierMetrics.dossiersByType.personnel || 0} dossiers
🙏 MEMBRES:                 ${dossierMetrics.dossiersByType.member || 0} dossiers

═══════════════════════════════════════════════════════════════
                 RÉPARTITION PAR STATUT
═══════════════════════════════════════════════════════════════

✅ COMPLETS:                ${dossierMetrics.dossiersByStatus.complet || 0}
📝 EN RÉVISION:             ${dossierMetrics.dossiersByStatus.en_revision || 0}
⚠️ INCOMPLETS:              ${dossierMetrics.dossiersByStatus.incomplet || 0}
🗄️ ARCHIVÉS:                ${dossierMetrics.dossiersByStatus.archive || 0}

═══════════════════════════════════════════════════════════════
              TYPES DE DOCUMENTS LES PLUS COURANTS
═══════════════════════════════════════════════════════════════

${Object.entries(dossierMetrics.documentsByType)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([type, count]) => 
    `📄 ${type}: ${count} document${count > 1 ? 's' : ''}`
  ).join('\n')}

═══════════════════════════════════════════════════════════════
                      DOSSIERS RÉCENTS
═══════════════════════════════════════════════════════════════

${dossiers.slice(0, 5).map(dossier => {
  const memberName = getMemberName(dossier.member_id);
  const docCount = dossier.documents?.length || 0;
  const statusIcon = {
    'complet': '✅',
    'en_revision': '📝',
    'incomplet': '⚠️',
    'archive': '🗄️'
  }[dossier.status] || '❓';
  
  return `${statusIcon} ${memberName} | ${dossier.dossier_type === 'personnel' ? '👔 Personnel' : '🙏 Membre'} | ${docCount} doc${docCount > 1 ? 's' : ''} | ${new Date(dossier.updated_at).toLocaleDateString('fr-FR')}`;
}).join('\n')}

${dossiers.length > 5 ? `... et ${dossiers.length - 5} autres dossiers` : ''}

═══════════════════════════════════════════════════════════════
                      ACTIVITÉ RÉCENTE
═══════════════════════════════════════════════════════════════

${dossierMetrics.recentActivity.slice(0, 5).map(activity => {
  const memberName = getMemberName(activity.member_id);
  const activityIcons = {
    'document_upload': '📄',
    'status_change': '🔄',
    'note_added': '📝',
    'verification': '✅',
    'payment': '💰'
  };
  
  const icon = activityIcons[activity.transaction_type] || '📋';
  const date = new Date(activity.created_at).toLocaleDateString('fr-FR');
  
  return `${icon} ${date} - ${memberName}: ${activity.description}`;
}).join('\n')}

═══════════════════════════════════════════════════════════════
                        RECOMMANDATIONS
═══════════════════════════════════════════════════════════════

${this.generateDossierRecommendations(dossierMetrics, totalMembers, membersWithDossier)}

═══════════════════════════════════════════════════════════════
                        INFORMATIONS
═══════════════════════════════════════════════════════════════

📊 Rapport généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
🏛️ Application: My Church - Système de Dossiers
⛪ Église: ${church.name}
📧 Contact: ${church.email}
⚙️ Dossiers auto: ${church.dossier_auto_create ? '✅ Activé' : '❌ Désactivé'}
📋 Dossier requis personnel: ${church.dossier_required_for_personnel ? '✅ Oui' : '❌ Non'}

═══════════════════════════════════════════════════════════════
    `.trim();
  }

  static generateComprehensiveReport(
    church: Church,
    members: Member[],
    dailyReports: DailyReport[],
    expenses: Expense[],
    archives: Archive[],
    dossiers: MemberDossier[],
    dossierMetrics: DossierMetrics,
    period: string
  ): string {
    const financialReport = this.generateFinancialReport(church, dailyReports, expenses, period, { includeDetails: false });
    const membersReport = this.generateMembersReport(church, members, period, { includeDetails: false, includeDossiers: true });
    const dossierReport = this.generateDossierReport(church, dossiers, members, dossierMetrics, period);
    
    const totalSalaries = members
      .filter(m => m.member_type === 'Personnel' && m.salary)
      .reduce((sum, m) => sum + Number(m.salary || 0), 0);

    return `
╔══════════════════════════════════════════════════════════════╗
║                 RAPPORT COMPLET D'ÉGLISE                    ║
║                      ${period}                               ║
╚══════════════════════════════════════════════════════════════╝

Ce rapport a été généré par : ${church.name}

${financialReport}

═══════════════════════════════════════════════════════════════
                    ANALYSE DES SALAIRES
═══════════════════════════════════════════════════════════════

💼 MASSE SALARIALE TOTALE:   ${formatAmount(totalSalaries, church.currency)}
👔 PERSONNEL RÉMUNÉRÉ:       ${members.filter(m => m.salary && m.salary > 0).length}

${membersReport}

${dossierReport}

═══════════════════════════════════════════════════════════════
                      HISTORIQUE D'ARCHIVES
═══════════════════════════════════════════════════════════════

📁 ARCHIVES DISPONIBLES:     ${archives.length}
   • Mensuelles: ${archives.filter(a => a.archive_type === 'monthly').length}
   • Annuelles: ${archives.filter(a => a.archive_type === 'yearly').length}

${archives.slice(0, 5).map(archive => 
  `📁 ${archive.archive_type === 'monthly' ? 'Mensuelle' : 'Annuelle'} ${archive.period}: ${formatAmount(archive.balance || 0, church.currency)}`
).join('\n')}

═══════════════════════════════════════════════════════════════
                        RECOMMANDATIONS
═══════════════════════════════════════════════════════════════

${this.generateRecommendations(church, dailyReports, expenses, members, dossiers)}

═══════════════════════════════════════════════════════════════
                        INFORMATIONS SYSTÈME
═══════════════════════════════════════════════════════════════

🔑 API Key: ${church.api_key}
🔄 Update Code: ${church.update_code}
🎨 Thème: ${church.theme}
💰 Limite dépenses: ${formatAmount(church.expense_limit || 0, church.currency)}
📁 Dossiers auto: ${church.dossier_auto_create ? '✅ Activé' : '❌ Désactivé'}
📋 Dossier requis personnel: ${church.dossier_required_for_personnel ? '✅ Oui' : '❌ Non'}

═══════════════════════════════════════════════════════════════
    `.trim();

    return report;
  }

  private static generateDossierRecommendations(
    metrics: DossierMetrics,
    totalMembers: number,
    membersWithDossier: number
  ): string {
    const recommendations: string[] = [];
    
    const dossierRate = (membersWithDossier / totalMembers) * 100;
    if (dossierRate < 50) {
      recommendations.push('📁 Moins de 50% des membres ont un dossier. Encouragez la création de dossiers.');
    }
    
    if (metrics.dossiersByStatus.incomplet > metrics.dossiersByStatus.complet) {
      recommendations.push('⚠️ Plus de dossiers incomplets que complets. Priorisez la complétion des dossiers.');
    }
    
    if (metrics.averageDocumentsPerDossier < 2) {
      recommendations.push('📄 Faible nombre moyen de documents par dossier. Incitez à ajouter plus de documents.');
    }
    
    if (metrics.dossiersByStatus.en_revision > 5) {
      recommendations.push('📝 Plusieurs dossiers en révision. Planifiez des sessions de révision.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Excellente gestion des dossiers ! Continuez sur cette voie.');
    }
    
    return recommendations.join('\n');
  }

  private static generateRecommendations(
    church: Church,
    reports: DailyReport[],
    expenses: Expense[],
    members: Member[],
    dossiers: MemberDossier[] = []
  ): string {
    const recommendations: string[] = [];
    
    const totalIncome = reports.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalExpenses = expenses.filter(e => e.is_approved).reduce((sum, e) => sum + Number(e.amount), 0);
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    if (expenseRatio > 80) {
      recommendations.push('⚠️  Ratio dépenses/revenus élevé (>80%). Considérez réduire les dépenses.');
    }

    if (church.current_balance < 0) {
      recommendations.push('🚨 Solde caisse négatif. Planifiez des activités génératrices de revenus.');
    }

    if (church.bank_balance < 0) {
      recommendations.push('🏦 Solde banque négatif. Vérifiez les découverts autorisés.');
    }

    if (expenses.filter(e => !e.is_approved).length > 5) {
      recommendations.push('📋 Plusieurs dépenses en attente d\'approbation. Vérifiez les demandes.');
    }

    if (members.length < 10) {
      recommendations.push('👥 Peu de membres enregistrés. Encouragez l\'inscription des membres.');
    }

    const membersWithoutDepartments = members.filter(m => !m.departments || m.departments.length === 0);
    if (membersWithoutDepartments.length > members.length * 0.3) {
      recommendations.push('📋 Plus de 30% des membres sans département. Organisez l\'affectation.');
    }

    // Recommandations pour les dossiers
    if (dossiers.length > 0) {
      const membersWithDossier = members.filter(m => m.has_dossier).length;
      if (membersWithDossier < members.length * 0.5) {
        recommendations.push('📁 Moins de 50% des membres ont un dossier. Activez la création automatique.');
      }
      
      const incompleteDossiers = dossiers.filter(d => d.status === 'incomplet').length;
      if (incompleteDossiers > dossiers.length * 0.3) {
        recommendations.push('⚠️ Plus de 30% des dossiers sont incomplets. Planifiez leur complétion.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Excellente gestion ! Continuez sur cette voie.');
    }

    return recommendations.join('\n');
  }

  static exportToCSV(data: any[], filename: string): string {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }

  static exportDossierToPDF(dossier: MemberDossier, member: Member, church: Church): string {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .church-name { font-size: 24px; font-weight: bold; }
          .report-title { font-size: 18px; color: #666; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333; border-left: 4px solid #4CAF50; padding-left: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .info-item { margin-bottom: 10px; }
          .info-label { font-weight: bold; color: #666; }
          .document-list { list-style: none; padding: 0; }
          .document-item { padding: 10px; border-bottom: 1px solid #eee; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church-name">${church.name}</div>
          <div class="report-title">📁 DOSSIER DU MEMBRE</div>
          <div>${member.first_name} ${member.last_name}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Informations du Membre</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nom complet:</div>
              <div>${member.first_name} ${member.last_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Type:</div>
              <div>${member.member_type}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email:</div>
              <div>${member.email}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Téléphone:</div>
              <div>${member.phone || 'Non spécifié'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Statut dossier:</div>
              <div>${dossier.status}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Numéro dossier:</div>
              <div>${dossier.dossier_number}</div>
            </div>
          </div>
        </div>
        
        ${dossier.documents && dossier.documents.length > 0 ? `
        <div class="section">
          <div class="section-title">Documents (${dossier.documents.length})</div>
          <ul class="document-list">
            ${dossier.documents.map(doc => `
              <li class="document-item">
                <strong>${doc.title}</strong> (${doc.document_type})<br>
                <small>Ajouté le ${new Date(doc.created_at).toLocaleDateString('fr-FR')} par ${doc.uploaded_by}</small>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${dossier.notes ? `
        <div class="section">
          <div class="section-title">Notes</div>
          <p>${dossier.notes}</p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')} • My Church - Système de Dossiers</p>
          <p>${church.name} • ${church.address || ''} • ${church.email}</p>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
} 