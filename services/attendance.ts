import { databases } from '@/lib/appwrite';
import { AttendanceRecord } from '@/types';

export const markAttendance = async (attendanceData: AttendanceRecord) => {
  try {
    const response = await databases.createDocument(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!,
      'unique()',
      attendanceData
    );
    return response;
  } catch (error) {
    throw new Error('Failed to mark attendance');
  }
};