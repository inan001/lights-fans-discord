/**
 * Smart Office Electricity Monitoring System - Application Entry Point
 * Orchestrates central store data flow, initializes UI components, and manages offline banners.
 */

import { store } from './src/store/state.js';
import { api } from './src/services/api.js';

// Import UI Components
import { Header } from './src/components/Header.js';
import { FloorMap } from './src/components/FloorMap.js';
import { DeviceStatusPanel } from './src/components/DeviceStatusPanel.js';
import { PowerPanel } from './src/components/PowerPanel.js';
import { AlertsPanel } from './src/components/AlertsPanel.js';
import { ActivityTimeline } from './src/components/ActivityTimeline.js';
import { DeviceDrawer } from './src/components/DeviceDrawer.js';

class Application {
  constructor() {
    this.components = {};
    this.init();
  }

  async init() {
    console.log('Initializing Smart Office Electricity Monitoring Dashboard...');

    // 1. Initialize Detail Drawer overlay first (to have close/selection methods ready)
    const drawer = new DeviceDrawer('drawer-root');
    this.components.drawer = drawer;

    // Selection callback to open Drawer when clicking on devices in floor map or list rows
    const onDeviceSelect = (deviceId) => {
      drawer.open(deviceId);
    };

    // 2. Initialize and Mount other components
    this.components.header = new Header('header-root');
    this.components.floorMap = new FloorMap('floor-map-root', onDeviceSelect);
    this.components.statusPanel = new DeviceStatusPanel('device-status-root', onDeviceSelect);
    this.components.powerPanel = new PowerPanel('power-analytics-root');
    this.components.alertsPanel = new AlertsPanel('alerts-root');
    this.components.timeline = new ActivityTimeline('timeline-root');

    // 3. Register a subscriber for the top Offline/Simulation notification banner
    store.subscribe((state) => {
      this.renderBanner(state.connectionStatus);
    });

    // 4. Start REST API and WebSocket connection routine
    await api.init();
  }

  /**
   * Renders high-visibility warnings/alerts when the backend is offline.
   * @param {string} status 
   */
  renderBanner(status) {
    const bannerContainer = document.getElementById('offline-banner-root');
    if (!bannerContainer) return;

    if (status === 'simulating') {
      bannerContainer.innerHTML = `
        <div class="offline-banner-alert">
          <span>⚠️ Running in Demo Simulation Mode. WebSocket connection to <strong>ws://localhost:8000/ws</strong> was unreachable.</span>
          <button id="banner-reconnect-btn">Retry Connection</button>
        </div>
      `;
      
      const btn = bannerContainer.querySelector('#banner-reconnect-btn');
      if (btn) {
        btn.onclick = () => api.init();
      }
    } else if (status === 'disconnected') {
      bannerContainer.innerHTML = `
        <div class="offline-banner-alert" style="background-color: var(--danger-color); color: white;">
          <span>❌ Disconnected from backend monitoring server. Ready to reconnect.</span>
          <button id="banner-reconnect-btn" style="background: white; color: var(--danger-color);">Reconnect Now</button>
        </div>
      `;
      
      const btn = bannerContainer.querySelector('#banner-reconnect-btn');
      if (btn) {
        btn.onclick = () => api.init();
      }
    } else {
      // Clear banner when connected or reconnecting (connection pill shows status instead)
      bannerContainer.innerHTML = '';
    }
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new Application();
});
