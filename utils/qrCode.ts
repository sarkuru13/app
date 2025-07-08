import { QRCodeData } from '@/types';

export const parseQRCode = (data: string): QRCodeData => {
  try {
    const parsed = JSON.parse(data);
    
    if (!parsed.courseId || !parsed.semester || !parsed.dateTime || !parsed.location) {
      throw new Error('Invalid QR code format');
    }

    if (!parsed.location.latitude || !parsed.location.longitude) {
      throw new Error('Invalid location data in QR code');
    }

    return parsed;
  } catch (error) {
    throw new Error('Invalid QR code format');
  }
};

export const validateQRCodeTime = (dateTime: string): boolean => {
  const qrTime = new Date(dateTime);
  const currentTime = new Date();
  const timeDifference = currentTime.getTime() - qrTime.getTime();
  
  // Check if QR code is within 10 seconds
  return timeDifference <= 10000;
};