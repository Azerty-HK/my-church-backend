"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationService = void 0;
class ValidationService {
    static validateEmail(email) {
        if (!email || !email.trim()) {
            return { isValid: false, error: 'L\'email est obligatoire' };
        }
        // Regex plus permissive et robuste pour les emails
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
            return { isValid: false, error: 'Format d\'email invalide' };
        }
        if (trimmedEmail.length > 254) {
            return { isValid: false, error: 'Email trop long' };
        }
        if (trimmedEmail.length < 5) {
            return { isValid: false, error: 'Email trop court' };
        }
        return { isValid: true };
    }
    static validatePassword(password) {
        if (!password) {
            return { isValid: false, error: 'Le mot de passe est obligatoire' };
        }
        if (password.length < 6) {
            return { isValid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' };
        }
        if (password.length > 128) {
            return { isValid: false, error: 'Mot de passe trop long' };
        }
        return { isValid: true };
    }
    static validateChurchName(name) {
        if (!name || !name.trim()) {
            return { isValid: false, error: 'Le nom de l\'église est obligatoire' };
        }
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            return { isValid: false, error: 'Le nom doit contenir au moins 2 caractères' };
        }
        if (trimmedName.length > 100) {
            return { isValid: false, error: 'Le nom est trop long (max 100 caractères)' };
        }
        return { isValid: true };
    }
    static validateAmount(amount) {
        let numAmount;
        if (typeof amount === 'string') {
            // Nettoyer la string et convertir (virgule vers point)
            const cleanAmount = amount.trim().replace(/[^\d.,]/g, '').replace(',', '.');
            if (!cleanAmount) {
                return { isValid: false, error: 'Montant invalide' };
            }
            numAmount = parseFloat(cleanAmount);
        }
        else {
            numAmount = amount;
        }
        if (isNaN(numAmount)) {
            return { isValid: false, error: 'Montant invalide' };
        }
        if (numAmount <= 0) {
            return { isValid: false, error: 'Le montant doit être positif' };
        }
        if (numAmount > 999999999) {
            return { isValid: false, error: 'Montant trop élevé' };
        }
        return { isValid: true };
    }
    static validatePhone(phone) {
        if (!phone || !phone.trim()) {
            return { isValid: true }; // Optionnel
        }
        const trimmedPhone = phone.trim();
        if (trimmedPhone.length > 0 && trimmedPhone.length < 8) {
            return { isValid: false, error: 'Numéro de téléphone trop court' };
        }
        if (trimmedPhone.length > 20) {
            return { isValid: false, error: 'Numéro de téléphone trop long' };
        }
        return { isValid: true };
    }
    static validateUrl(url) {
        if (!url || !url.trim()) {
            return { isValid: false, error: 'L\'URL est obligatoire' };
        }
        try {
            const urlObj = new URL(url.trim());
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return { isValid: false, error: 'L\'URL doit commencer par http:// ou https://' };
            }
            return { isValid: true };
        }
        catch {
            return { isValid: false, error: 'Format d\'URL invalide' };
        }
    }
    static validateMemberName(name) {
        if (!name || !name.trim()) {
            return { isValid: false, error: 'Le nom est obligatoire' };
        }
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
            return { isValid: false, error: 'Le nom doit contenir au moins 2 caractères' };
        }
        if (trimmedName.length > 50) {
            return { isValid: false, error: 'Le nom est trop long (max 50 caractères)' };
        }
        return { isValid: true };
    }
    static validateDescription(description, required = true) {
        if (required && (!description || !description.trim())) {
            return { isValid: false, error: 'La description est obligatoire' };
        }
        if (description && description.trim().length > 500) {
            return { isValid: false, error: 'Description trop longue (max 500 caractères)' };
        }
        return { isValid: true };
    }
    static validateInitialAmount(amount) {
        // Convertir en number si c'est une string
        let numAmount;
        if (typeof amount === 'string') {
            const trimmed = amount.trim();
            if (!trimmed) {
                return { isValid: false, error: 'Le montant de départ est obligatoire' };
            }
            // Nettoyer et convertir
            const cleanAmount = trimmed.replace(/[^\d.,]/g, '').replace(',', '.');
            if (!cleanAmount) {
                return { isValid: false, error: 'Le montant de départ est obligatoire' };
            }
            numAmount = parseFloat(cleanAmount);
        }
        else if (typeof amount === 'number') {
            numAmount = amount;
        }
        else {
            return { isValid: false, error: 'Le montant de départ est obligatoire' };
        }
        if (isNaN(numAmount)) {
            return { isValid: false, error: 'Le montant doit être un nombre valide' };
        }
        if (numAmount < 0) {
            return { isValid: false, error: 'Le montant de départ ne peut pas être négatif' };
        }
        if (numAmount > 999999999) {
            return { isValid: false, error: 'Montant de départ trop élevé' };
        }
        return { isValid: true };
    }
}
exports.ValidationService = ValidationService;
