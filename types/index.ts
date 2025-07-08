export interface User {
  $id: string;
  email: string;
  name: string;
}

export interface QRCodeData {
  courseId: string;
  semester: string;
  dateTime: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface AttendanceRecord {
  studentId: string;
  courseId: string;
  semester: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
}