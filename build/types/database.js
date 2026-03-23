"use strict";
// ==================== INTERFACES PRINCIPALES ====================
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMINDER_OPTIONS = exports.EVENT_TYPE_ICONS = exports.EVENT_TYPE_COLORS = void 0;
exports.formatEventDate = formatEventDate;
exports.getTimeRemaining = getTimeRemaining;
// ==================== CONSTANTES ET UTILITAIRES ====================
exports.EVENT_TYPE_COLORS = {
    'Culte': '#3498db',
    'Réunion': '#f39c12',
    'Séminaire': '#9b59b6',
    'Conférence': '#e74c3c',
    'Autre': '#7f8c8d'
};
exports.EVENT_TYPE_ICONS = {
    'Culte': 'church',
    'Réunion': 'users',
    'Séminaire': 'graduation-cap',
    'Conférence': 'microphone',
    'Autre': 'calendar'
};
exports.REMINDER_OPTIONS = [
    { value: 15, label: '15 minutes avant' },
    { value: 30, label: '30 minutes avant' },
    { value: 60, label: '1 heure avant' },
    { value: 120, label: '2 heures avant' },
    { value: 1440, label: '1 jour avant' },
    { value: 2880, label: '2 jours avant' },
    { value: 10080, label: '1 semaine avant' }
];
function formatEventDate(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    if (end && start.toDateString() === end.toDateString()) {
        return `${start.toLocaleDateString('fr-FR')} • ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    else if (end) {
        return `${start.toLocaleDateString('fr-FR')} → ${end.toLocaleDateString('fr-FR')}`;
    }
    else {
        return `${start.toLocaleDateString('fr-FR')} • ${start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
}
function getTimeRemaining(startDate) {
    const now = new Date();
    const event = new Date(startDate);
    const diffTime = event.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const isToday = event.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === event.toDateString();
    const isPast = diffTime < 0;
    let text = '';
    let color = '#95a5a6';
    if (isPast) {
        text = 'Passé';
        color = '#95a5a6';
    }
    else if (isToday) {
        if (diffHours <= 0) {
            if (diffMinutes <= 0) {
                text = 'En cours';
                color = '#e74c3c';
            }
            else {
                text = `Dans ${diffMinutes}min`;
                color = '#e74c3c';
            }
        }
        else {
            text = "Aujourd'hui";
            color = '#e74c3c';
        }
    }
    else if (isTomorrow) {
        text = 'Demain';
        color = '#e67e22';
    }
    else if (diffDays <= 7) {
        text = `Dans ${diffDays} jours`;
        color = '#f39c12';
    }
    else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7);
        text = weeks === 1 ? 'Dans 1 semaine' : `Dans ${weeks} semaines`;
        color = '#27ae60';
    }
    else {
        const months = Math.floor(diffDays / 30);
        text = months === 1 ? 'Dans 1 mois' : `Dans ${months} mois`;
        color = '#3498db';
    }
    return {
        text,
        color,
        isPast,
        isToday,
        isTomorrow,
        days: diffDays
    };
}
