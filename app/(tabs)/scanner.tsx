import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { parseQRCode, validateQRCodeTime } from '@/utils/qrCode';
import { getCurrentLocation, calculateDistance } from '@/utils/location';
import { markAttendance } from '@/services/attendance';
import { X, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Camera } from 'lucide-react-native';

// Conditionally import BarCodeScanner only for native platforms
let BarCodeScanner: any = null;
if (Platform.OS !== 'web') {
  try {
    const BarcodeModule = require('expo-barcode-scanner');
    BarCodeScanner = BarcodeModule.BarCodeScanner;
  } catch (error) {
    console.warn('BarCodeScanner not available:', error);
  }
}

export default function Scanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [result, setResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      if (Platform.OS === 'web') {
        // On web, we'll use manual input instead of camera
        setHasPermission(true);
        return;
      }

      if (BarCodeScanner) {
        try {
          const { status } = await BarCodeScanner.requestPermissionsAsync();
          setHasPermission(status === 'granted');
        } catch (error) {
          console.error('Permission request failed:', error);
          setHasPermission(false);
        }
      } else {
        setHasPermission(false);
      }
    };

    getBarCodeScannerPermissions();
  }, []);

  const processQRCode = async (data: string) => {
    setIsProcessing(true);
    setResult(null);

    try {
      // Parse QR code data
      const qrData = parseQRCode(data);

      // Validate time (within 10 seconds)
      if (!validateQRCodeTime(qrData.dateTime)) {
        throw new Error('QR code has expired. Please scan a new one.');
      }

      // Get current location
      const currentLocation = await getCurrentLocation();
      
      // Calculate distance
      const distance = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        qrData.location.latitude,
        qrData.location.longitude
      );

      // Validate location (within 100 meters)
      if (distance > 100) {
        throw new Error('You are too far from the classroom. Please move closer.');
      }

      // Mark attendance
      await markAttendance({
        studentId: user!.$id,
        courseId: qrData.courseId,
        semester: qrData.semester,
        timestamp: new Date().toISOString(),
        location: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
      });

      setResult({
        type: 'success',
        message: 'Attendance marked successfully!',
      });

    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to mark attendance',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    await processQRCode(data);
  };

  const handleManualSubmit = async () => {
    if (!manualInput.trim()) {
      setResult({
        type: 'error',
        message: 'Please enter QR code data',
      });
      return;
    }
    
    setScanned(true);
    await processQRCode(manualInput.trim());
  };

  const resetScanner = () => {
    setScanned(false);
    setResult(null);
    setIsProcessing(false);
    setManualInput('');
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.message}>Initializing scanner...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false && Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Camera Permission Required</Text>
          <Text style={styles.errorMessage}>
            Please enable camera access to scan QR codes for attendance marking.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Web version with manual input
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Enter QR Code Data</Text>
          <Text style={styles.headerSubtitle}>
            Paste or type the QR code data to mark attendance
          </Text>
        </View>

        <View style={styles.webInputContainer}>
          <View style={styles.inputCard}>
            <Camera size={48} color="#007AFF" style={styles.cameraIcon} />
            <Text style={styles.webNotice}>
              Camera scanning is not available on web. Please enter the QR code data manually.
            </Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="Enter QR code data here..."
              value={manualInput}
              onChangeText={setManualInput}
              multiline
              numberOfLines={4}
              editable={!isProcessing}
            />

            <TouchableOpacity 
              style={[styles.submitButton, isProcessing && styles.disabledButton]} 
              onPress={handleManualSubmit}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Mark Attendance</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {result && (
          <View style={styles.resultContainer}>
            <View style={[
              styles.resultCard,
              result.type === 'success' ? styles.successCard : styles.errorCard
            ]}>
              {result.type === 'success' ? (
                <CheckCircle size={24} color="#10B981" />
              ) : (
                <X size={24} color="#EF4444" />
              )}
              <Text style={[
                styles.resultMessage,
                result.type === 'success' ? styles.successMessage : styles.errorMessage
              ]}>
                {result.message}
              </Text>
            </View>
          </View>
        )}

        {scanned && (
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Native version with camera scanner
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <Text style={styles.headerSubtitle}>
          Point your camera at the QR code to mark attendance
        </Text>
      </View>

      <View style={styles.scannerContainer}>
        {BarCodeScanner ? (
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
          />
        ) : (
          <View style={styles.scannerFallback}>
            <AlertCircle size={48} color="#EF4444" />
            <Text style={styles.fallbackText}>Camera scanner not available</Text>
          </View>
        )}
        
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </View>

      {result && (
        <View style={styles.resultContainer}>
          <View style={[
            styles.resultCard,
            result.type === 'success' ? styles.successCard : styles.errorCard
          ]}>
            {result.type === 'success' ? (
              <CheckCircle size={24} color="#10B981" />
            ) : (
              <X size={24} color="#EF4444" />
            )}
            <Text style={[
              styles.resultMessage,
              result.type === 'success' ? styles.successMessage : styles.errorMessage
            ]}>
              {result.message}
            </Text>
          </View>
        </View>
      )}

      {scanned && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
            <Text style={styles.resetButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F8FAFC' : '#000000',
  },
  header: {
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  scannerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  fallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  webInputContainer: {
    flex: 1,
    padding: 24,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraIcon: {
    marginBottom: 16,
  },
  webNotice: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
    marginBottom: 24,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  resultContainer: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  successCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  resultMessage: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  successMessage: {
    color: '#065F46',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
  },
  resetButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});