class NotificationService {
  constructor() {
    this.permission = Notification.permission;
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    if (this.permission === 'granted') return true;

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  notify(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/pwa-192x192.svg',
      badge: '/pwa-192x192.svg',
      silent: false,
    };

    return new Notification(title, { ...defaultOptions, ...options });
  }
}

export default new NotificationService();
