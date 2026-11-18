import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freshmindvideo.app',
  appName: 'FreshMindVideo',
  webDir: 'dist',
  server: {
    url: 'https://luis98andi.github.io/freshmindvideo/',
    cleartext: true
  }
};

export default config;