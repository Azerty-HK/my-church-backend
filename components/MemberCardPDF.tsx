import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from 'expo-print';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Users,
  Briefcase,
  Shield,
  DollarSign,
  Star,
  QrCode,
  Download,
  FileText,
} from "lucide-react-native";
import { formatAmount } from "../utils/currency";
import type { Member } from "../types/database";

interface MemberCardProps {
  member: Member;
  currency: string;
}

export function MemberCardPDF({ member, currency }: MemberCardProps) {
  const cardRef = useRef<View>(null);
  const pdfRef = useRef<View>(null);

  const handleCall = () => {
    if (member.phone) Linking.openURL(`tel:${member.phone}`);
  };

  // Fonction pour exporter en image (PNG)
  const handleExportImage = async () => {
    try {
      if (!cardRef.current) return;
      
      // Capturer la carte comme image
      const uri = await captureRef(cardRef.current, {
        format: "png",
        quality: 1,
      });
      
      // Créer un nom de fichier unique
      const fileName = `${member.first_name}_${member.last_name}_${Date.now()}.png`;
      
      // Créer le dossier de téléchargement s'il n'existe pas
      const downloadDir = FileSystem.documentDirectory + 'MyChurch/Images/';
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }
      
      // Créer un fichier avec la nouvelle API
      const fileUri = downloadDir + fileName;
      const file = await FileSystem.FileSystem.getFileAsync(fileUri, { create: true });
      
      // Copier l'image capturée vers le nouveau fichier
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });
      
      // Partager l'image
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: `Carte Membre - ${member.first_name} ${member.last_name}`,
          UTI: 'public.png'
        });
      } else {
        Alert.alert(
          'Image générée avec succès',
          `L'image a été générée avec succès !\n\nNom: ${fileName}`,
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } catch (err) {
      console.error('Erreur image:', err);
      Alert.alert("Erreur", "Impossible d'exporter l'image : " + err);
    }
  };

  // Fonction pour exporter en PDF
  const handleExportPDF = async () => {
    try {
      // Générer le contenu HTML pour le PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Carte Membre - ${member.first_name} ${member.last_name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 30px;
              background-color: #003f88;
              color: white;
            }
            .card {
              background-color: #003f88;
              border-radius: 16px;
              padding: 20px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.3);
              max-width: 600px;
              margin: 0 auto;
            }
            .church {
              color: white;
              font-weight: bold;
              font-size: 20px;
              text-align: center;
              margin-bottom: 10px;
            }
            .type-container {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 15px;
              gap: 8px;
            }
            .type {
              color: white;
              font-weight: bold;
              font-size: 14px;
              background-color: rgba(255,255,255,0.2);
              padding: 5px 15px;
              border-radius: 10px;
            }
            .content {
              display: flex;
              gap: 20px;
              margin-bottom: 20px;
            }
            .photo-container {
              width: 100px;
              height: 120px;
              border-radius: 10px;
              overflow: hidden;
              background-color: white;
              position: relative;
            }
            .photo {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              width: 100%;
              height: 100%;
              background-color: #ddd;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .status-indicator {
              position: absolute;
              bottom: 8px;
              right: 8px;
              width: 14px;
              height: 14px;
              border-radius: 50%;
              border: 2px solid white;
            }
            .info {
              flex: 1;
            }
            .info-text {
              color: white;
              font-size: 14px;
              margin-bottom: 8px;
              line-height: 1.4;
            }
            .label {
              font-weight: bold;
            }
            .status {
              font-weight: bold;
              margin-top: 10px;
              font-size: 14px;
            }
            .qr-container {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-top: 20px;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              border-top: 1px solid rgba(255,255,255,0.2);
              padding-top: 15px;
            }
            .date-text {
              color: white;
              font-size: 12px;
              opacity: 0.8;
            }
            .signature {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              margin-top: 15px;
            }
            .signature-text {
              color: white;
              font-size: 12px;
              font-style: italic;
            }
            .active { color: #27ae60; }
            .inactive { color: #e74c3c; }
            .sensitive { color: #e74c3c; }
            .normal { color: #3498db; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="church">${member.church || 'ÉGLISE'}</div>
            
            <div class="type-container">
              ${member.member_type === 'Personnel' ? '👔' : '👥'}
              <span class="type">${member.member_type.toUpperCase()}</span>
            </div>

            <div class="content">
              <div class="photo-container">
                ${member.photo_url ? 
                  `<img src="${member.photo_url}" class="photo" />` : 
                  `<div class="photo-placeholder">👤</div>`
                }
                <div class="status-indicator" style="background-color: ${member.is_active ? '#27ae60' : '#e74c3c'}"></div>
              </div>

              <div class="info">
                <div class="info-text">
                  <span class="label">Nom :</span> ${member.first_name} ${member.last_name}
                </div>
                <div class="info-text">
                  <span class="label">Départements :</span> ${member.departments?.join(', ') || 'Aucun département'}
                </div>
                <div class="info-text">
                  <span class="label">Adresse :</span> ${member.address || 'Non spécifiée'}
                </div>
                <div class="info-text">
                  <span class="label">Email :</span> ${member.email}
                </div>
                ${member.phone ? `
                <div class="info-text">
                  <span class="label">Téléphone :</span> ${member.phone}
                </div>
                ` : ''}
                ${member.member_type === 'Personnel' && member.salary && member.salary > 0 ? `
                <div class="info-text">
                  <span class="label">Salaire :</span> ${formatAmount(member.salary, currency)}
                </div>
                ` : ''}
                ${member.position ? `
                <div class="info-text">
                  <span class="label">Poste :</span> 
                  <span class="${['Pasteur', 'Trésorier', 'Secrétaire', 'Lecteur'].includes(member.position) ? 'sensitive' : 'normal'}">
                    ${member.position}
                    ${['Pasteur', 'Trésorier', 'Secrétaire', 'Lecteur'].includes(member.position) ? '(Rôle sensible)' : ''}
                  </span>
                </div>
                ` : ''}
                
                <div class="status ${member.is_active ? 'active' : 'inactive'}">
                  Statut : ${member.is_active ? 'Actif' : 'Inactif'}
                </div>
              </div>
            </div>

            <div class="qr-container">
              <span style="font-size: 24px;">📱</span>
            </div>

            <div class="footer">
              <div class="date-text">
                Inscrit le ${new Date(member.created_at || "").toLocaleDateString("fr-FR")}
              </div>
            </div>

            <div class="signature">
              ✨
              <span class="signature-text">MyChurch - Created by Henock Aduma</span>
              ✨
            </div>
          </div>
        </body>
        </html>
      `;

      // Générer le PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Créer le dossier de téléchargement s'il n'existe pas
      const downloadDir = FileSystem.documentDirectory + 'MyChurch/PDFs/';
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }

      // Créer un nom de fichier unique
      const fileName = `Carte_Membre_${member.first_name}_${member.last_name}_${Date.now()}.pdf`;
      const fileUri = downloadDir + fileName;
      
      // Copier le PDF vers le dossier de téléchargement
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      // Partager le PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Carte Membre - ${member.first_name} ${member.last_name}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert(
          'PDF généré avec succès',
          `Le PDF a été généré avec succès !\n\nNom: ${fileName}`,
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    } catch (err) {
      console.error('Erreur PDF:', err);
      Alert.alert("Erreur", "Impossible de générer le PDF : " + err);
    }
  };

  const formatDepartments = (departments: string[]) => {
    if (!departments || departments.length === 0) return "Aucun département";
    return departments.join(", ");
  };

  const getStatusColor = () => (member.is_active ? "#27ae60" : "#e74c3c");
  const getStatusText = () => (member.is_active ? "Actif" : "Inactif");
  const getMemberTypeIcon = () =>
    member.member_type === "Personnel" ? <Briefcase size={16} color="#3498db" /> : <Users size={16} color="#27ae60" />;

  const getPositionColor = () => {
    if (!member.position) return "#7f8c8d";
    const restrictedPositions = ["Pasteur", "Trésorier", "Secrétaire"];
    if (restrictedPositions.includes(member.position)) return "#e74c3c";
    return "#3498db";
  };

  const isRestrictedPosition = () => {
    const restrictedPositions = ["Pasteur", "Trésorier", "Secrétaire", "Lecteur"];
    return member.position ? restrictedPositions.includes(member.position) : false;
  };

  return (
    <View>
      <View ref={cardRef} style={styles.card}>
        {/* Nom de l'église */}
        <Text style={styles.church}>{member.church}</Text>

        {/* Type membre/personnel */}
        <View style={styles.typeContainer}>
          {getMemberTypeIcon()}
          <Text style={styles.type}>{member.member_type.toUpperCase()}</Text>
          {isRestrictedPosition() && <Shield size={12} color="#e74c3c" />}
        </View>

        <View style={styles.content}>
          {/* Photo */}
          <View style={styles.photoContainer}>
            {member.photo_url ? (
              <Image source={{ uri: member.photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <User size={32} color="#7f8c8d" />
              </View>
            )}
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          </View>

          {/* Infos */}
          <View style={styles.info}>
            <Text style={styles.infoText}>
              <Text style={styles.label}>Nom :</Text> {member.first_name} {member.last_name}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.label}>Département :</Text> {formatDepartments(member.departments || [])}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.label}>Adresse :</Text> {member.address}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.label}>Email :</Text> {member.email}
            </Text>
            {member.phone && (
              <Text style={styles.infoText}>
                <Text style={styles.label}>Téléphone :</Text>{" "}
                <Text style={styles.link} onPress={handleCall}>{member.phone}</Text>
              </Text>
            )}
            {member.member_type === "Personnel" && member.salary && member.salary > 0 && (
              <Text style={styles.infoText}><DollarSign size={12} color="#27ae60" /> Salaire: {formatAmount(member.salary, currency)}</Text>
            )}
            {member.position && (
              <Text style={[styles.infoText, { color: getPositionColor() }]}>
                💼 {member.position} {isRestrictedPosition() ? "(Rôle sensible)" : ""}
              </Text>
            )}
            <Text style={[styles.status, { color: getStatusColor() }]}>{getStatusText()}</Text>
          </View>

          {/* QR */}
          <View style={styles.qrContainer}>
            <QrCode size={24} color="#3498db" />
          </View>
        </View>

        {/* Footer date */}
        <View style={styles.footer}>
          <Text style={styles.dateText}>Inscrit le {new Date(member.created_at || "").toLocaleDateString("fr-FR")}</Text>
        </View>

        {/* Signature */}
        <View style={styles.signature}>
          <Star size={12} color="#f39c12" />
          <Text style={styles.signatureText}>✨ MyChurch - Created by Henock Aduma</Text>
          <Star size={12} color="#f39c12" />
        </View>
      </View>

      {/* Boutons d'export */}
      <View style={styles.exportButtonsContainer}>
        <TouchableOpacity style={[styles.exportButton, styles.imageButton]} onPress={handleExportImage}>
          <Download size={20} color="white" />
          <Text style={styles.exportButtonText}>Exporter en Image</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.exportButton, styles.pdfButton]} onPress={handleExportPDF}>
          <FileText size={20} color="white" />
          <Text style={styles.exportButtonText}>Exporter en PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#003f88",
    borderRadius: 16,
    padding: 15,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  church: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 6,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    gap: 6,
  },
  type: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  content: {
    flexDirection: "row",
    gap: 10,
  },
  photoContainer: {
    width: 90,
    height: 110,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
    position: "relative",
  },
  photo: { width: "100%", height: "100%", resizeMode: "cover" },
  photoPlaceholder: { flex: 1, backgroundColor: "#ddd", alignItems: "center", justifyContent: "center" },
  statusIndicator: { position: "absolute", bottom: 5, right: 5, width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: "#fff" },
  info: { flex: 1, justifyContent: "space-between" },
  infoText: { color: "white", fontSize: 12, marginBottom: 2 },
  label: { fontWeight: "bold" },
  link: { textDecorationLine: "underline" },
  status: { fontWeight: "bold" },
  qrContainer: { justifyContent: "center", alignItems: "center" },
  footer: { marginTop: 10, alignItems: "center" },
  dateText: { color: "white", fontSize: 10 },
  signature: { marginTop: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4 },
  signatureText: { color: "white", fontSize: 10 },
  exportButtonsContainer: {
    flexDirection: "row",
    margin: 10,
    gap: 10,
  },
  exportButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  imageButton: {
    backgroundColor: "#3498db",
  },
  pdfButton: {
    backgroundColor: "#27ae60",
  },
  exportButtonText: { 
    color: "white", 
    fontWeight: "bold",
    fontSize: 14,
  },
}); 