import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.edisonleague.app',
  appName: 'Edison League',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
