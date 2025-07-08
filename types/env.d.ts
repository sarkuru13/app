declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_APPWRITE_ENDPOINT: string;
      EXPO_PUBLIC_APPWRITE_PROJECT_ID: string;
      EXPO_PUBLIC_APPWRITE_DATABASE_ID: string;
      EXPO_PUBLIC_APPWRITE_COLLECTION_ID: string;
    }
  }
}

export {};