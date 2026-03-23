import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Download, X } from 'lucide-react-native';
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
  period,
  reportType,
}: ReportExporterProps) {

  const exportReport = () => {
    Alert.alert(
      '⏳ Fonctionnalité en cours',
      "Les exports depuis cette interface seront disponibles dans la prochaine version.\n\nPour le moment, veuillez exporter depuis l’interface des exports.",
      [{ text: 'OK' }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#7f8c8d" />
            </TouchableOpacity>
            <Text style={styles.title}>📤 Exporter le rapport</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Rapport lié à : <Text style={styles.churchName}>{church.name}</Text>
            </Text>

            <View style={styles.reportInfo}>
              <Text style={styles.reportInfoTitle}>📊 Informations :</Text>
              <Text style={styles.reportInfoItem}>📅 Période : {period}</Text>
              <Text style={styles.reportInfoItem}>📋 Type : {reportType}</Text>
              <Text style={styles.reportInfoItem}>⛪ Église : {church.name}</Text>
            </View>

            <TouchableOpacity
              style={styles.exportButton}
              onPress={exportReport}
            >
              <Download size={20} color="white" />
              <Text style={styles.exportButtonText}>
                Exporter
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
  reportInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
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
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
