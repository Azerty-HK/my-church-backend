"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const currency_1 = require("./currency");
class ReportGenerator {
    static generateFinancialReport(church, dailyReports, expenses, period, options = {}) {
        const { includeDetails = true, format = 'text', includeDossiers = false, showAllCurrencies = true } = options;
        const approvedExpenses = expenses.filter(expense => expense.is_approved);
        const pendingExpenses = expenses.filter(expense => !expense.is_approved);
        // Calculs par devise
        const calculateByCurrency = (items) => {
            const result = {
                FC: 0,
                USD: 0,
                EURO: 0,
                total: 0
            };
            items.forEach(item => {
                const amount = Number(item.amount) || 0;
                if (item.currency === 'FC')
                    result.FC += amount;
                else if (item.currency === 'USD')
                    result.USD += amount;
                else if (item.currency === 'EURO')
                    result.EURO += amount;
                result.total += amount;
            });
            return result;
        };
        const totalIncome = calculateByCurrency(dailyReports);
        const totalExpenses = calculateByCurrency(approvedExpenses);
        const pendingAmount = calculateByCurrency(pendingExpenses);
        // Balance par devise
        const balanceFC = totalIncome.FC - totalExpenses.FC;
        const balanceUSD = totalIncome.USD - totalExpenses.USD;
        const balanceEURO = totalIncome.EURO - totalExpenses.EURO;
        // Calcul du total en devise principale
        const totalBalanceMainCurrency = (0, currency_1.getTotalInMainCurrency)({
            FC: balanceFC,
            USD: balanceUSD,
            EURO: balanceEURO
        }, church.currency);
        // Soldes actuels de l'église
        const churchBalanceFC = (church.current_balance_fc || 0) + (church.bank_balance_fc || 0);
        const churchBalanceUSD = (church.current_balance_usd || 0) + (church.bank_balance_usd || 0);
        const churchBalanceEURO = (church.current_balance_euro || 0) + (church.bank_balance_euro || 0);
        // Total général en devise principale
        const totalChurchBalance = (0, currency_1.getTotalInMainCurrency)({
            FC: churchBalanceFC,
            USD: churchBalanceUSD,
            EURO: churchBalanceEURO
        }, church.currency);
        if (format === 'json') {
            return JSON.stringify({
                generatedBy: church.name,
                church: church.name,
                period,
                mainCurrency: church.currency,
                summary: {
                    totalIncome: totalIncome.total,
                    totalIncomeByCurrency: totalIncome,
                    totalExpenses: totalExpenses.total,
                    totalExpensesByCurrency: totalExpenses,
                    pendingAmount: pendingAmount.total,
                    pendingAmountByCurrency: pendingAmount,
                    balanceByCurrency: {
                        FC: balanceFC,
                        USD: balanceUSD,
                        EURO: balanceEURO
                    },
                    totalBalanceMainCurrency,
                    transactionCount: dailyReports.length + expenses.length
                },
                currentBalances: {
                    cash: {
                        FC: church.current_balance_fc || 0,
                        USD: church.current_balance_usd || 0,
                        EURO: church.current_balance_euro || 0
                    },
                    bank: {
                        FC: church.bank_balance_fc || 0,
                        USD: church.bank_balance_usd || 0,
                        EURO: church.bank_balance_euro || 0
                    },
                    totalByCurrency: {
                        FC: churchBalanceFC,
                        USD: churchBalanceUSD,
                        EURO: churchBalanceEURO
                    },
                    totalMainCurrency: totalChurchBalance
                },
                details: includeDetails ? {
                    dailyReports,
                    approvedExpenses,
                    pendingExpenses
                } : undefined,
                generatedAt: new Date().toISOString()
            }, null, 2);
        }
        // Calcul des totaux caisse et banque
        const totalCaisse = (church.current_balance_fc || 0) + (church.current_balance_usd || 0) + (church.current_balance_euro || 0);
        const totalBanque = (church.bank_balance_fc || 0) + (church.bank_balance_usd || 0) + (church.bank_balance_euro || 0);
        const report = `
╔══════════════════════════════════════════════════════════════╗
║                    RAPPORT FINANCIER                         ║
║                      ${period}                               ║
╚══════════════════════════════════════════════════════════════╝

Ce rapport a été généré par : ${church.name}

ÉGLISE: ${church.name}
DEVISE PRINCIPALE: ${church.currency} ⭐
EMAIL: ${church.email}
${church.phone ? `TÉLÉPHONE: ${church.phone}` : ''}
${church.address ? `ADRESSE: ${church.address}` : ''}

═══════════════════════════════════════════════════════════════
                  RÉSUMÉ FINANCIER MULTI-DEVISES
═══════════════════════════════════════════════════════════════

💰 REVENUS TOTAUX:           ${(0, currency_1.formatAmount)(totalIncome.total, church.currency)}
   • FC: ${(0, currency_1.formatAmount)(totalIncome.FC, 'FC')}
   • USD: ${(0, currency_1.formatAmount)(totalIncome.USD, 'USD')}
   • EURO: ${(0, currency_1.formatAmount)(totalIncome.EURO, 'EURO')}

💸 DÉPENSES APPROUVÉES:      ${(0, currency_1.formatAmount)(totalExpenses.total, church.currency)}
   • FC: ${(0, currency_1.formatAmount)(totalExpenses.FC, 'FC')}
   • USD: ${(0, currency_1.formatAmount)(totalExpenses.USD, 'USD')}
   • EURO: ${(0, currency_1.formatAmount)(totalExpenses.EURO, 'EURO')}

⏳ DÉPENSES EN ATTENTE:      ${(0, currency_1.formatAmount)(pendingAmount.total, church.currency)}
   • FC: ${(0, currency_1.formatAmount)(pendingAmount.FC, 'FC')}
   • USD: ${(0, currency_1.formatAmount)(pendingAmount.USD, 'USD')}
   • EURO: ${(0, currency_1.formatAmount)(pendingAmount.EURO, 'EURO')}

📊 SOLDE NET PAR DÉPART:
   • FC: ${(0, currency_1.formatAmount)(balanceFC, 'FC')}
   • USD: ${(0, currency_1.formatAmount)(balanceUSD, 'USD')}
   • EURO: ${(0, currency_1.formatAmount)(balanceEURO, 'EURO')}

📈 TOTAL NET (${church.currency}): ${(0, currency_1.formatAmount)(totalBalanceMainCurrency, church.currency)}

═══════════════════════════════════════════════════════════════
                    SOLDES ACTUELS PAR DÉPART
═══════════════════════════════════════════════════════════════

💰 CAISSE:
   • FC: ${(0, currency_1.formatAmount)(church.current_balance_fc || 0, 'FC')}
   • USD: ${(0, currency_1.formatAmount)(church.current_balance_usd || 0, 'USD')}
   • EURO: ${(0, currency_1.formatAmount)(church.current_balance_euro || 0, 'EURO')}

🏦 BANQUE:
   • FC: ${(0, currency_1.formatAmount)(church.bank_balance_fc || 0, 'FC')}
   • USD: ${(0, currency_1.formatAmount)(church.bank_balance_usd || 0, 'USD')}
   • EURO: ${(0, currency_1.formatAmount)(church.bank_balance_euro || 0, 'EURO')}

═══════════════════════════════════════════════════════════════
                    DÉTAIL DES DÉPENSES PAR DEVISE
═══════════════════════════════════════════════════════════════

${approvedExpenses.length > 0 ? `
📊 DÉPENSES FC: ${(0, currency_1.formatAmount)(totalExpenses.FC, 'FC')}
📊 DÉPENSES USD: ${(0, currency_1.formatAmount)(totalExpenses.USD, 'USD')}
📊 DÉPENSES EURO: ${(0, currency_1.formatAmount)(totalExpenses.EURO, 'EURO')}
` : 'Aucune dépense approuvée'}

═══════════════════════════════════════════════════════════════
                    TOTAL GÉNÉRAL PAR DÉPART
═══════════════════════════════════════════════════════════════

📊 TOTAL CAISSE:            ${(0, currency_1.formatAmount)(totalCaisse, church.currency)}
📊 TOTAL BANQUE:            ${(0, currency_1.formatAmount)(totalBanque, church.currency)}
📊 TOTAL GÉNÉRAL:          ${(0, currency_1.formatAmount)(totalChurchBalance, church.currency)}

📈 NOMBRE DE TRANSACTIONS:   ${dailyReports.length + expenses.length}
   • Comptes rendus: ${dailyReports.length}
   • Dépenses: ${expenses.length} (${approvedExpenses.length} approuvées, ${pendingExpenses.length} en attente)

${includeDetails ? `
═══════════════════════════════════════════════════════════════
                    DÉTAIL DES TRANSACTIONS PAR DEVISE
═══════════════════════════════════════════════════════════════

=== COMPTES RENDUS ===

${dailyReports.length > 0 ? dailyReports.map(report => {
            const currencySymbol = (0, currency_1.getCurrencySymbol)(report.currency);
            let line = `📅 ${new Date(report.date).toLocaleDateString('fr-FR')} | ${(0, currency_1.formatAmount)(Number(report.amount), report.currency)} | ${report.description} | ${report.category} | ${report.currency} | Par: ${report.recorded_by}`;
            if (report.bills_breakdown && report.bills_breakdown.length > 0) {
                const billsDetail = report.bills_breakdown.filter(b => b.quantity > 0).map(b => `${b.quantity}×${b.bill_label}`).join(', ');
                line += ` | 🧮 Billets: ${billsDetail}`;
            }
            return line;
        }).join('\n') : 'Aucun compte rendu enregistré'}

=== DÉPENSES APPROUVÉES ===

${approvedExpenses.length > 0 ? approvedExpenses.map(expense => {
            const currencySymbol = (0, currency_1.getCurrencySymbol)(expense.currency);
            return `📅 ${new Date(expense.date).toLocaleDateString('fr-FR')} | ${(0, currency_1.formatAmount)(Number(expense.amount), expense.currency)} | ${expense.description} | Catégorie: ${expense.category || 'Général'} | ${expense.currency} | Par: ${expense.recorded_by}${expense.approved_by ? ` | Approuvé par: ${expense.approved_by}` : ''}`;
        }).join('\n') : 'Aucune dépense approuvée'}

${pendingExpenses.length > 0 ? `
=== DÉPENSES EN ATTENTE ===

${pendingExpenses.map(expense => {
            const currencySymbol = (0, currency_1.getCurrencySymbol)(expense.currency);
            return `📅 ${new Date(expense.date).toLocaleDateString('fr-FR')} | ${(0, currency_1.formatAmount)(Number(expense.amount), expense.currency)} | ${expense.description} | Catégorie: ${expense.category || 'Général'} | ${expense.currency} | Par: ${expense.recorded_by}`;
        }).join('\n')}` : ''}
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
    static generateMembersReport(church, members, period, options = {}) {
        const { includeDetails = true, format = 'text', includeDossiers = true } = options;
        const personnelMembers = members.filter(m => m.member_type === 'Personnel');
        const regularMembers = members.filter(m => m.member_type === 'Membre');
        // Statistiques par département
        const departmentStats = new Map();
        members.forEach(member => {
            member.departments?.forEach(dept => {
                if (dept.trim()) {
                    departmentStats.set(dept, (departmentStats.get(dept) || 0) + 1);
                }
            });
        });
        // Statistiques par poste
        const positionStats = new Map();
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
        // Calcul de la masse salariale par devise
        const salaryByCurrency = { FC: 0, USD: 0, EURO: 0 };
        personnelMembers.forEach(member => {
            if (member.salary && member.currency) {
                const currency = member.currency.toUpperCase();
                if (salaryByCurrency.hasOwnProperty(currency)) {
                    salaryByCurrency[currency] += Number(member.salary) || 0;
                }
            }
        });
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
                    positions: Object.fromEntries(positionStats),
                    salaryByCurrency
                },
                details: includeDetails ? {
                    personnel: personnelMembers,
                    members: regularMembers
                } : undefined,
                generatedAt: new Date().toISOString()
            }, null, 2);
        }
        const salarySection = personnelMembers.length > 0 ? `
═══════════════════════════════════════════════════════════════
                       MASSE SALARIALE PAR DEVISE
═══════════════════════════════════════════════════════════════

💼 TOTAL SALAIRES:
${Object.entries(salaryByCurrency)
            .filter(([_, amount]) => amount > 0)
            .map(([currency, amount]) => `   • ${currency}: ${(0, currency_1.formatAmount)(amount, currency)}`)
            .join('\n') || '   • Aucun salaire enregistré'}

💼 TOTAL (${church.currency}): ${(0, currency_1.formatAmount)((0, currency_1.getTotalInMainCurrency)(salaryByCurrency, church.currency), church.currency)}
` : '';
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
DEVISE PRINCIPALE: ${church.currency} ⭐
EMAIL: ${church.email}

═══════════════════════════════════════════════════════════════
                    STATISTIQUES GÉNÉRALES
═══════════════════════════════════════════════════════════════

👥 TOTAL DES MEMBRES:        ${members.length}
👔 PERSONNEL:               ${personnelMembers.length}
🙏 MEMBRES RÉGULIERS:       ${regularMembers.length}

${salarySection}

${dossierSection}

📊 RÉPARTITION PAR DÉPARTEMENT:
${Array.from(departmentStats.entries()).map(([dept, count]) => `   • ${dept}: ${count} membre${count > 1 ? 's' : ''}`).join('\n') || '   Aucun département défini'}

👔 RÉPARTITION PAR POSTE (Personnel):
${Array.from(positionStats.entries()).map(([position, count]) => `   • ${position}: ${count} personne${count > 1 ? 's' : ''}`).join('\n') || '   Aucun poste défini'}

${includeDetails ? `
═══════════════════════════════════════════════════════════════
                        PERSONNEL
═══════════════════════════════════════════════════════════════

${personnelMembers.length > 0 ? personnelMembers.map(member => `👔 ${member.first_name} ${member.last_name}
   📧 Email: ${member.email}
   📞 Téléphone: ${member.phone || 'Non spécifié'}
   🏢 Poste: ${member.position || 'Non spécifié'}
   📋 Départements: ${member.departments?.join(', ') || 'Aucun'}
   💰 Salaire: ${member.salary ? (0, currency_1.formatAmount)(member.salary, member.currency || church.currency) : 'Non spécifié'}
   📱 QR Code: ${member.qr_code || 'Non généré'}
   📁 Dossier: ${member.has_dossier ? (member.dossier_status ? `✅ ${member.dossier_status.charAt(0).toUpperCase() + member.dossier_status.slice(1)}` : '✅ Disponible') : '❌ Non créé'}
   📅 Inscrit le: ${new Date(member.created_at || '').toLocaleDateString('fr-FR')}
`).join('\n') : 'Aucun personnel enregistré'}

═══════════════════════════════════════════════════════════════
                      MEMBRES RÉGULIERS
═══════════════════════════════════════════════════════════════

${regularMembers.length > 0 ? regularMembers.map(member => `🙏 ${member.first_name} ${member.last_name}
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
📋 Dossier requis personnel: ${church.dossier_required_for_personnel ? '✅ Oui' : '❌ Non'}

═══════════════════════════════════════════════════════════════
    `.trim();
        return report;
    }
    static generateDossierReport(church, dossiers, members, dossierMetrics, period) {
        const totalMembers = members.length;
        const membersWithDossier = dossiers.length;
        const dossierPercentage = totalMembers > 0 ? Math.round((membersWithDossier / totalMembers) * 100) : 0;
        const getMemberName = (memberId) => {
            const member = members.find(m => m.id === memberId);
            return member ? `${member.first_name} ${member.last_name}` : 'Membre inconnu';
        };
        // Calcul des statistiques financières des dossiers par devise
        const dossierFinancialStats = {
            totalPayments: { FC: 0, USD: 0, EURO: 0 },
            averagePayment: { FC: 0, USD: 0, EURO: 0 }
        };
        dossiers.forEach(dossier => {
            if (dossier.documents) {
                dossier.documents.forEach(doc => {
                    if (doc.amount && doc.currency) {
                        const currency = doc.currency.toUpperCase();
                        if (dossierFinancialStats.totalPayments.hasOwnProperty(currency)) {
                            dossierFinancialStats.totalPayments[currency] += Number(doc.amount) || 0;
                        }
                    }
                });
            }
        });
        // Calcul des moyennes
        Object.keys(dossierFinancialStats.totalPayments).forEach(currency => {
            const key = currency;
            const count = dossiers.filter(d => d.documents?.some(doc => doc.currency?.toUpperCase() === key && doc.amount)).length;
            dossierFinancialStats.averagePayment[key] = count > 0 ?
                dossierFinancialStats.totalPayments[key] / count : 0;
        });
        // Calcul du total en devise principale
        const totalPaymentsMainCurrency = (0, currency_1.getTotalInMainCurrency)(dossierFinancialStats.totalPayments, church.currency);
        const averagePaymentMainCurrency = (0, currency_1.getTotalInMainCurrency)(dossierFinancialStats.averagePayment, church.currency);
        return `
╔══════════════════════════════════════════════════════════════╗
║                   RAPPORT DES DOSSIERS                      ║
║                      ${period}                               ║
╚══════════════════════════════════════════════════════════════╝

Ce rapport a été généré par : ${church.name}

ÉGLISE: ${church.name}
DEVISE PRINCIPALE: ${church.currency} ⭐
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
              STATISTIQUES FINANCIÈRES DES DOSSIERS
═══════════════════════════════════════════════════════════════

💰 PAIEMENTS TOTAUX:
${Object.entries(dossierFinancialStats.totalPayments)
            .filter(([_, amount]) => amount > 0)
            .map(([currency, amount]) => `   • ${currency}: ${(0, currency_1.formatAmount)(amount, currency)}`).join('\n') || '   Aucun paiement enregistré'}

💰 TOTAL (${church.currency}): ${(0, currency_1.formatAmount)(totalPaymentsMainCurrency, church.currency)}

📊 MOYENNE PAR DOSSIER:
${Object.entries(dossierFinancialStats.averagePayment)
            .filter(([_, amount]) => amount > 0)
            .map(([currency, amount]) => `   • ${currency}: ${(0, currency_1.formatAmount)(amount, currency)}`).join('\n') || '   Aucune moyenne disponible'}

📊 MOYENNE (${church.currency}): ${(0, currency_1.formatAmount)(averagePaymentMainCurrency, church.currency)}

═══════════════════════════════════════════════════════════════
              TYPES DE DOCUMENTS LES PLUS COURANTS
═══════════════════════════════════════════════════════════════

${Object.entries(dossierMetrics.documentsByType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => `📄 ${type}: ${count} document${count > 1 ? 's' : ''}`).join('\n')}

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
    static generateComprehensiveReport(church, members, dailyReports, expenses, archives, dossiers, dossierMetrics, period) {
        const financialReport = this.generateFinancialReport(church, dailyReports, expenses, period, {
            includeDetails: false,
            showAllCurrencies: true
        });
        const membersReport = this.generateMembersReport(church, members, period, {
            includeDetails: false,
            includeDossiers: true
        });
        const dossierReport = this.generateDossierReport(church, dossiers, members, dossierMetrics, period);
        // Calcul de la masse salariale par devise
        const salaryByCurrency = { FC: 0, USD: 0, EURO: 0 };
        members
            .filter(m => m.member_type === 'Personnel' && m.salary)
            .forEach(member => {
            const currency = member.currency?.toUpperCase() || 'FC';
            if (salaryByCurrency.hasOwnProperty(currency)) {
                salaryByCurrency[currency] += Number(member.salary) || 0;
            }
        });
        // Calcul du total en devise principale
        const totalSalariesMainCurrency = (0, currency_1.getTotalInMainCurrency)(salaryByCurrency, church.currency);
        return `
╔══════════════════════════════════════════════════════════════╗
║                 RAPPORT COMPLET D'ÉGLISE                    ║
║                      ${period}                               ║
╚══════════════════════════════════════════════════════════════╝

Ce rapport a été généré par : ${church.name}

${financialReport}

═══════════════════════════════════════════════════════════════
                    ANALYSE DES SALAIRES PAR DEVISE
═══════════════════════════════════════════════════════════════

💼 MASSE SALARIALE PAR DEVISE:
${Object.entries(salaryByCurrency)
            .filter(([_, amount]) => amount > 0)
            .map(([currency, amount]) => `   • ${currency}: ${(0, currency_1.formatAmount)(amount, currency)}`).join('\n') || '   Aucun salaire enregistré'}

💼 TOTAL (${church.currency}): ${(0, currency_1.formatAmount)(totalSalariesMainCurrency, church.currency)}
👔 PERSONNEL RÉMUNÉRÉ:       ${members.filter(m => m.salary && m.salary > 0).length}

${membersReport}

${dossierReport}

═══════════════════════════════════════════════════════════════
                      HISTORIQUE D'ARCHIVES
═══════════════════════════════════════════════════════════════

📁 ARCHIVES DISPONIBLES:     ${archives.length}
   • Mensuelles: ${archives.filter(a => a.archive_type === 'monthly').length}
   • Annuelles: ${archives.filter(a => a.archive_type === 'yearly').length}

${archives.slice(0, 5).map(archive => `📁 ${archive.archive_type === 'monthly' ? 'Mensuelle' : 'Annuelle'} ${archive.period}: ${(0, currency_1.formatAmount)(archive.balance || 0, church.currency)}`).join('\n')}

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
💰 Limite dépenses: ${(0, currency_1.formatAmount)(church.expense_limit || 0, church.currency)}
📁 Dossiers auto: ${church.dossier_auto_create ? '✅ Activé' : '❌ Désactivé'}
📋 Dossier requis personnel: ${church.dossier_required_for_personnel ? '✅ Oui' : '❌ Non'}

═══════════════════════════════════════════════════════════════
    `.trim();
        return report;
    }
    static generateDossierRecommendations(metrics, totalMembers, membersWithDossier) {
        const recommendations = [];
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
    static generateRecommendations(church, reports, expenses, members, dossiers = []) {
        const recommendations = [];
        // Calcul des totaux par devise
        const totalIncome = {
            FC: reports.filter(r => r.currency === 'FC').reduce((sum, r) => sum + Number(r.amount), 0),
            USD: reports.filter(r => r.currency === 'USD').reduce((sum, r) => sum + Number(r.amount), 0),
            EURO: reports.filter(r => r.currency === 'EURO').reduce((sum, r) => sum + Number(r.amount), 0)
        };
        const totalExpenses = {
            FC: expenses.filter(e => e.is_approved && e.currency === 'FC').reduce((sum, e) => sum + Number(e.amount), 0),
            USD: expenses.filter(e => e.is_approved && e.currency === 'USD').reduce((sum, e) => sum + Number(e.amount), 0),
            EURO: expenses.filter(e => e.is_approved && e.currency === 'EURO').reduce((sum, e) => sum + Number(e.amount), 0)
        };
        // Vérifications par devise pour la caisse
        if (church.current_balance_fc < 0) {
            recommendations.push('🚨 Solde caisse FC négatif. Planifiez des activités génératrices de revenus en FC.');
        }
        if (church.current_balance_usd < 0) {
            recommendations.push('💰 Solde caisse USD négatif. Surveillez les dépenses en USD.');
        }
        if (church.current_balance_euro < 0) {
            recommendations.push('💶 Solde caisse EURO négatif. Gestion à surveiller en EURO.');
        }
        // Vérifications par devise pour la banque
        if (church.bank_balance_fc < 0) {
            recommendations.push('🏦 Solde banque FC négatif. Vérifiez les découverts autorisés.');
        }
        if (church.bank_balance_usd < 0) {
            recommendations.push('💳 Solde banque USD négatif. Équilibrez les entrées/sorties USD.');
        }
        if (church.bank_balance_euro < 0) {
            recommendations.push('🏛️ Solde banque EURO négatif. Priorisez les rentrées en EURO.');
        }
        // Dépenses en attente par devise
        const pendingExpensesByCurrency = {
            FC: expenses.filter(e => !e.is_approved && e.currency === 'FC').length,
            USD: expenses.filter(e => !e.is_approved && e.currency === 'USD').length,
            EURO: expenses.filter(e => !e.is_approved && e.currency === 'EURO').length
        };
        const totalPending = pendingExpensesByCurrency.FC + pendingExpensesByCurrency.USD + pendingExpensesByCurrency.EURO;
        if (totalPending > 5) {
            recommendations.push(`📋 ${totalPending} dépenses en attente d\'approbation (FC: ${pendingExpensesByCurrency.FC}, USD: ${pendingExpensesByCurrency.USD}, EURO: ${pendingExpensesByCurrency.EURO}). Vérifiez les demandes.`);
        }
        // Membres
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
        // Recommandations basées sur les ratios revenus/dépenses par devise
        const incomeExpenseRatioFC = totalIncome.FC > 0 ? totalExpenses.FC / totalIncome.FC : 0;
        const incomeExpenseRatioUSD = totalIncome.USD > 0 ? totalExpenses.USD / totalIncome.USD : 0;
        const incomeExpenseRatioEURO = totalIncome.EURO > 0 ? totalExpenses.EURO / totalIncome.EURO : 0;
        if (incomeExpenseRatioFC > 0.8) {
            recommendations.push('⚠️ Ratio dépenses/revenus FC élevé (>80%). Contrôlez les dépenses en FC.');
        }
        if (incomeExpenseRatioUSD > 0.9) {
            recommendations.push('💰 Ratio dépenses/revenus USD très élevé (>90%). Surveillez les dépenses USD.');
        }
        if (incomeExpenseRatioEURO > 0.7) {
            recommendations.push('💶 Ratio dépenses/revenus EURO modéré (>70%). Surveillez EURO.');
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ Excellente gestion multi-devises ! Continuez sur cette voie.');
        }
        return recommendations.join('\n');
    }
    static exportToCSV(data, filename) {
        if (!data || data.length === 0)
            return '';
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                if (value === null || value === undefined)
                    return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                if (typeof value === 'object') {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');
        return csvContent;
    }
    static exportDossierToPDF(dossier, member, church) {
        // Calcul des statistiques financières du dossier
        const financialStats = {
            totalPayments: { FC: 0, USD: 0, EURO: 0 },
            paymentCount: 0
        };
        if (dossier.documents) {
            dossier.documents.forEach(doc => {
                if (doc.amount && doc.currency) {
                    const currency = doc.currency.toUpperCase();
                    if (financialStats.totalPayments.hasOwnProperty(currency)) {
                        financialStats.totalPayments[currency] += Number(doc.amount) || 0;
                        financialStats.paymentCount++;
                    }
                }
            });
        }
        // Calcul du total en devise principale
        const totalPaymentsMainCurrency = (0, currency_1.getTotalInMainCurrency)(financialStats.totalPayments, church.currency);
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
          .financial-summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .currency-amount { margin: 5px 0; padding: 5px; border-left: 3px solid; }
          .fc { border-left-color: #27ae60; background: #e8f6ef; }
          .usd { border-left-color: #2980b9; background: #ebf5fb; }
          .euro { border-left-color: #8e44ad; background: #f4ecf7; }
          .main-currency { border-left-color: #f39c12; background: #fff3cd; border: 2px solid #f39c12; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="church-name">${church.name}</div>
          <div class="report-title">📁 DOSSIER DU MEMBRE</div>
          <div>${member.first_name} ${member.last_name}</div>
          <div style="font-size: 12px; color: #7f8c8d; margin-top: 5px;">
            Devise principale: ${church.currency} ⭐
          </div>
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
        
        ${financialStats.paymentCount > 0 ? `
        <div class="section">
          <div class="section-title">Résumé Financier</div>
          <div class="financial-summary">
            <div style="margin-bottom: 10px;">
              <strong>Total des paiements:</strong> ${financialStats.paymentCount} paiement${financialStats.paymentCount > 1 ? 's' : ''}
            </div>
            ${Object.entries(financialStats.totalPayments)
            .filter(([_, amount]) => amount > 0)
            .map(([currency, amount]) => `
                <div class="currency-amount ${currency.toLowerCase()}">
                  <strong>${currency}:</strong> ${(0, currency_1.formatAmount)(amount, currency)}
                </div>
              `).join('')}
            ${totalPaymentsMainCurrency > 0 ? `
              <div class="currency-amount main-currency" style="margin-top: 10px;">
                <strong>⭐ TOTAL (${church.currency}):</strong> ${(0, currency_1.formatAmount)(totalPaymentsMainCurrency, church.currency)}
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}
        
        ${dossier.documents && dossier.documents.length > 0 ? `
        <div class="section">
          <div class="section-title">Documents (${dossier.documents.length})</div>
          <ul class="document-list">
            ${dossier.documents.map(doc => `
              <li class="document-item">
                <strong>${doc.title}</strong> (${doc.document_type})<br>
                ${doc.amount ? `<small>Montant: ${(0, currency_1.formatAmount)(doc.amount, doc.currency || church.currency)}</small><br>` : ''}
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
          <p>${church.name} • ${church.email}</p>
          <p style="color: #7f8c8d; font-size: 10px; margin-top: 5px;">
            Devises supportées: FC • USD • EURO • Devise principale: ${church.currency}
          </p>
        </div>
      </body>
      </html>
    `;
        return html;
    }
}
exports.ReportGenerator = ReportGenerator;
