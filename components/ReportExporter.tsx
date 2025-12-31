import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { FileText, Download, Share2, X } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ReportGenerator } from '../utils/reportGenerator';
import type { Church, DailyReport, Expense, Member, Archive } from '../types/database';

interface ReportExporterProps {
  visible: boolean;
  onClose: () => void;
  church: Church;
  reports: DailyReport[];
  expenses: Expense[];
  members: Member[];
  archives: Archive[];
  period: string;
  reportType: 'financial' | 'members' | 'comprehensive';
}

export function ReportExporter({
  visible,
  onClose,
  church,
  reports,
  expenses,
  members,
  archives,
  period,
  reportType
}: ReportExporterProps) {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'txt'>('txt');

  const generateReportContent = (): string => {
    switch (reportType) {
      case 'financial':
        return ReportGenerator.generateFinancialReport(church, reports, expenses, period);
      case 'members':
        return ReportGenerator.generateMembersReport(church, members, period);
      case 'comprehensive':
        return ReportGenerator.generateComprehensiveReport(church, members, reports, expenses, archives, period);
      default:
        return 'Rapport non défini';
    }
  };

  const generatePDFContent = (content: string): string => {
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length ${content.length + 200}
>>
stream
BT
/F1 12 Tf
50 750 Td
(RAPPORT MY CHURCH) Tj
0 -20 Td
(${church.name}) Tj
0 -30 Td
${content.split('\n').map(line => `(${line.replace(/[()]/g, '')}) Tj 0 -15 Td`).join('\n')}
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000120 00000 n 
0000000179 00000 n 
0000000400 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
500
%%EOF`;
  };

  const generateDOCXContent = (content: string): string => {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>RAPPORT MY CHURCH</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="16"/>
        </w:rPr>
        <w:t>${church.name}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t xml:space="preserve">${content.replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">')}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:i/>
          <w:sz w:val="12"/>
        </w:rPr>
        <w:t>Généré par My Church - ${new Date().toLocaleDateString('fr-FR')}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
  };

  const exportReport = async () => {
    setExporting(true);
    try {
      console.log('📄 Export rapport My Church...');
      const content = generateReportContent();
      const fileName = `rapport_${reportType}_${church.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      
      let fileContent = content;
      let fileExtension = exportFormat;
      let mimeType = 'text/plain';

      switch (exportFormat) {
        case 'pdf':
          fileContent = generatePDFContent(content);
          mimeType = 'application/pdf';
          break;
        case 'docx':
          fileContent = generateDOCXContent(content);
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        default:
          fileContent = `RAPPORT MY CHURCH - ${reportType.toUpperCase()}\n\n${church.name}\n\n${content}\n\n--- Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} ---\n--- My Church ---`;
          mimeType = 'text/plain';
      }

      if (Platform.OS === 'web') {
        // Export pour le web
        const blob = new Blob([fileContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert(
          '✅ Rapport téléchargé!',
          `Format: ${exportFormat.toUpperCase()}\nFichier: ${fileName}.${fileExtension}`,
          [{ text: 'OK' }]
        );
      } else {
        // Export pour mobile
        const fileUri = `${FileSystem.documentDirectory}${fileName}.${fileExtension}`;
        
        await FileSystem.writeAsStringAsync(fileUri, fileContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType,
            dialogTitle: `Rapport ${reportType} - ${church.name}`,
          });
        } else {
          Alert.alert(
            '✅ Rapport généré!',
            `Format: ${exportFormat.toUpperCase()}\nFichier: ${fileName}.${fileExtension}`,
            [{ text: 'OK' }]
          );
        }
      }

      console.log('✅ Rapport exporté avec succès');
    } catch (error: any) {
      console.error('❌ Erreur export:', error);
      Alert.alert('❌ Erreur', `Impossible d'exporter le rapport: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      default: return '📋';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>📤 Exporter le rapport</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Rapport généré par : <Text style={styles.churchName}>{church.name}</Text>
            </Text>

            <View style={styles.formatSelection}>
              <Text style={styles.formatTitle}>Choisissez le format :</Text>
              
              <View style={styles.formatButtons}>
                {(['txt', 'pdf', 'docx'] as const).map((format) => (
                  <TouchableOpacity
                    key={format}
                    style={[
                      styles.formatButton,
                      exportFormat === format && styles.formatButtonActive
                    ]}
                    onPress={() => setExportFormat(format)}
                  >
                    <Text style={styles.formatIcon}>{getFormatIcon(format)}</Text>
                    <Text style={[
                      styles.formatText,
                      exportFormat === format && styles.formatTextActive
                    ]}>
                      {format.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.reportInfo}>
              <Text style={styles.reportInfoTitle}>📊 Informations :</Text>
              <Text style={styles.reportInfoItem}>📅 Période : {period}</Text>
              <Text style={styles.reportInfoItem}>📋 Type : {reportType}</Text>
              <Text style={styles.reportInfoItem}>⛪ Église : {church.name}</Text>
              <Text style={styles.reportInfoItem}>📧 Contact : {church.email}</Text>
              <Text style={styles.reportInfoItem}>💰 Devise : {church.currency}</Text>
            </View>

            <TouchableOpacity
              style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
              onPress={exportReport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Download size={20} color="white" />
              )}
              <Text style={styles.exportButtonText}>
                {exporting ? 'Export en cours...' : `📤 Exporter en ${exportFormat.toUpperCase()}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  churchName: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  formatSelection: {
    marginBottom: 20,
  },
  formatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    backgroundColor: '#f8f9fa',
  },
  formatButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  formatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  formatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
  },
  formatTextActive: {
    color: 'white',
  },
  reportInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  reportInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  reportInfoItem: {
    fontSize: 12,
    color: '#34495e',
    marginBottom: 4,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  exportButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});