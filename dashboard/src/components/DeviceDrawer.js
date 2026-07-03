/**
 * Device Details Drawer Component
 * Slides out from the right to display rich metadata and toggling controls for the selected device.
 */

import { store } from '../store/state.js';
import { api } from '../services/api.js';
import { getIcon } from '../utils/helpers.js';

export class DeviceDrawer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedDeviceId = null;
    
    // Subscribe to state changes to update the drawer contents if the active device changes status
    store.subscribe(state => {
      if (this.selectedDeviceId) {
        this.render(state);
      }
    });
  }

  open(deviceId) {
    this.selectedDeviceId = deviceId;
    const state = store.getState();
    this.render(state);
    
    // Trigger slide-in animation
    const backdrop = this.container.querySelector('.drawer-backdrop');
    if (backdrop) {
      setTimeout(() => backdrop.classList.add('active'), 10);
    }
  }

  close() {
    const backdrop = this.container.querySelector('.drawer-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      // Remove ID reference after slide out completes
      setTimeout(() => {
        this.selectedDeviceId = null;
        this.container.innerHTML = '';
      }, 300);
    } else {
      this.selectedDeviceId = null;
      this.container.innerHTML = '';
    }
  }

  attachEvents(device) {
    const closeBtn = this.container.querySelector('.drawer-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    const backdrop = this.container.querySelector('.drawer-backdrop');
    if (backdrop) {
      backdrop.onclick = (e) => {
        if (e.target === backdrop) {
          this.close();
        }
      };
    }

    const toggleInput = this.container.querySelector('.drawer-toggle-input');
    if (toggleInput) {
      toggleInput.onchange = (e) => {
        const isChecked = e.target.checked;
        const statusVal = isChecked ? 'on' : 'off';
        
        // Randomly assign to Nafisa or Tanvir for the dashboard demonstration
        const activeOperator = Math.random() > 0.5 ? 'Nafisa Rahman' : 'Tanvir Hossain';
        
        api.toggleDevice(device.id, statusVal, activeOperator);
      };
    }
  }

  render(state) {
    if (!this.selectedDeviceId) return;
    
    const device = state.devices.find(d => d.id === this.selectedDeviceId);
    if (!device) return;

    const isActive = device.status === 'on';
    const isChecked = isActive ? 'checked' : '';
    const statusText = isActive ? 'ACTIVE' : 'INACTIVE';
    const statusClass = isActive ? 'status-on' : 'status-off';
    const powerValue = isActive ? `${device.power} W` : '0 W';

    // SVG icon mapping
    const iconName = device.type === 'fan' ? 'fan' : 'light';

    this.container.innerHTML = `
      <div class="drawer-backdrop">
        <div class="side-drawer" id="side-drawer-container">
          
          <div class="drawer-header">
            <h3 class="drawer-title">Device Configurations</h3>
            <button class="drawer-close-btn" aria-label="Close panel">
              ${getIcon('x', '', 20)}
            </button>
          </div>

          <div class="drawer-body">
            
            <!-- Graphic card header representation -->
            <div class="glass-panel" style="padding: 1.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; background: linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.9) 100%); border-color: rgba(255,255,255,0.04);">
              <div class="device-icon-container" style="width:4.5rem; height:4.5rem; border-radius:1rem; ${isActive ? (device.type === 'fan' ? 'background: var(--primary-glow); border-color:rgba(59,130,246,0.3); color:var(--primary-color);' : 'background: var(--warning-glow); border-color:rgba(245,158,11,0.3); color:var(--warning-color);') : ''}">
                ${getIcon(iconName, isActive && device.type === 'fan' ? 'fan-running' : '', 32)}
              </div>
              <div style="text-align: center;">
                <h4 style="font-size: 1.1rem; font-weight: 700;">${device.name}</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-top: 0.1rem;">${device.room}</p>
              </div>
            </div>

            <!-- Metadata table block -->
            <div class="drawer-meta-section">
              <div class="drawer-meta-row">
                <span class="drawer-meta-label">Identifier</span>
                <span class="drawer-meta-value" style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${device.id}</span>
              </div>
              <div class="drawer-meta-row">
                <span class="drawer-meta-label">Device Type</span>
                <span class="drawer-meta-value" style="text-transform: capitalize;">${device.type}</span>
              </div>
              <div class="drawer-meta-row">
                <span class="drawer-meta-label">Last Modified By</span>
                <span class="drawer-meta-value" style="color: var(--primary-color);">${device.lastToggledBy}</span>
              </div>
              <div class="drawer-meta-row">
                <span class="drawer-meta-label">Change Timestamp</span>
                <span class="drawer-meta-value">${device.lastChanged}</span>
              </div>
            </div>

            <!-- Controller toggle slider section -->
            <div class="drawer-action-card">
              <span class="action-title">
                ${getIcon('bolt', '', 16)}
                Manual Control Override
              </span>
              
              <div class="drawer-toggle-row">
                <div class="drawer-toggle-info">
                  <span class="drawer-toggle-status ${statusClass}">${statusText}</span>
                  <span class="drawer-toggle-power">Consuming ${powerValue}</span>
                </div>
                <label class="switch-control" style="width: 3rem; height: 1.65rem;">
                  <input type="checkbox" class="drawer-toggle-input" ${isChecked} style="width:100%; height:100%;">
                  <span class="switch-slider" style="border-radius: 34px;"></span>
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    // Re-attach visual backdrop activation (so styling state stays consistent)
    const backdrop = this.container.querySelector('.drawer-backdrop');
    if (backdrop) {
      backdrop.classList.add('active');
    }

    this.attachEvents(device);
  }
}
