/**
 * Live Device Status Panel Component
 * Displays devices grouped by room with power metrics, state badges, timestamps, and interactive controls.
 */

import { store } from '../store/state.js';
import { api } from '../services/api.js';
import { getIcon } from '../utils/helpers.js';

export class DeviceStatusPanel {
  constructor(containerId, onDeviceSelect) {
    this.container = document.getElementById(containerId);
    this.onDeviceSelect = onDeviceSelect;
    
    // Tracks open/close sections (rooms accordions/headers)
    this.expandedRooms = {
      'Drawing Room': true,
      'Work Room 1': true,
      'Work Room 2': true
    };

    store.subscribe(state => this.render(state));
  }

  attachEvents(devices) {
    // Room Header Collapse/Expand toggle
    const roomBars = this.container.querySelectorAll('.room-title-bar');
    roomBars.forEach(bar => {
      bar.onclick = (e) => {
        e.stopPropagation();
        const roomName = bar.dataset.room;
        this.expandedRooms[roomName] = !this.expandedRooms[roomName];
        
        const listEl = this.container.querySelector(`.list-for-${roomName.replace(/\s+/g, '')}`);
        const caretEl = bar.querySelector('.caret-icon');
        
        if (this.expandedRooms[roomName]) {
          listEl.style.display = 'flex';
          if (caretEl) caretEl.style.transform = 'rotate(0deg)';
        } else {
          listEl.style.display = 'none';
          if (caretEl) caretEl.style.transform = 'rotate(-90deg)';
        }
      };
    });

    // Row Click to select device (opens Drawer details)
    const deviceCards = this.container.querySelectorAll('.device-row-card');
    deviceCards.forEach(card => {
      card.onclick = (e) => {
        // Only trigger if click wasn't on the switch input or slider
        if (e.target.closest('.switch-control') || e.target.closest('input')) {
          return;
        }
        
        const deviceId = card.dataset.id;
        if (this.onDeviceSelect) {
          this.onDeviceSelect(deviceId);
        }
      };

      // Switch toggle event handler
      const toggleInput = card.querySelector('.device-toggle-input');
      if (toggleInput) {
        toggleInput.onchange = (e) => {
          const deviceId = card.dataset.id;
          const isChecked = e.target.checked;
          const statusVal = isChecked ? 'on' : 'off';
          
          // Obtain random operator from state (since it's a simulation / demo)
          const activeOperator = Math.random() > 0.5 ? 'Nafisa Rahman' : 'Tanvir Hossain';
          api.toggleDevice(deviceId, statusVal, activeOperator);
        };
      }
    });
  }

  render(state) {
    const { devices } = state;
    
    // Group devices by room
    const rooms = ['Drawing Room', 'Work Room 1', 'Work Room 2'];
    
    let contentHtml = '';

    rooms.forEach(roomName => {
      const roomDevices = devices.filter(d => d.room === roomName);
      
      // Calculate Room's power consumption dynamically
      const roomPower = roomDevices.reduce((sum, d) => sum + (d.status === 'on' ? d.power : 0), 0);
      
      const listDisplay = this.expandedRooms[roomName] ? 'flex' : 'none';
      const caretRotation = this.expandedRooms[roomName] ? 'rotate(0deg)' : 'rotate(-90deg)';

      let devicesListHtml = '';
      
      roomDevices.forEach(device => {
        const isActive = device.status === 'on';
        const activeClass = isActive ? 'active' : '';
        const deviceTypeClass = device.type === 'light' ? 'light-device' : 'fan-device';
        const badgeColor = isActive ? 'var(--success-color)' : 'var(--muted-color)';
        const powerHtml = isActive ? `${device.power}W` : '0W';
        const isChecked = isActive ? 'checked' : '';

        // Determine which icon
        const iconName = device.type === 'fan' ? 'fan' : 'light';

        devicesListHtml += `
          <div class="device-row-card ${activeClass} ${deviceTypeClass}" data-id="${device.id}" id="card-${device.id}">
            <div class="device-info-side">
              <div class="device-icon-container">
                ${getIcon(iconName, isActive && device.type === 'fan' ? 'fan-running' : '', 18)}
              </div>
              <div class="device-details-text">
                <span class="device-row-name">${device.name}</span>
                <span class="device-row-timestamp">Changed: ${device.lastChanged}</span>
              </div>
            </div>

            <div class="device-controls-side">
              <span class="device-power-val">${powerHtml}</span>
              <label class="switch-control" id="switch-label-${device.id}">
                <input type="checkbox" id="input-${device.id}" class="device-toggle-input" ${isChecked}>
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        `;
      });

      contentHtml += `
        <div class="device-room-section">
          <div class="room-title-bar" data-room="${roomName}" style="cursor:pointer;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="caret-icon" style="display:inline-block; transition: transform var(--transition-fast); transform: ${caretRotation};">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
              <span>${roomName}</span>
            </div>
            <span class="room-power-pill">${roomPower} W</span>
          </div>
          
          <div class="device-list list-for-${roomName.replace(/\s+/g, '')}" style="display: ${listDisplay};">
            ${devicesListHtml}
          </div>
        </div>
      `;
    });

    this.container.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">
          ${getIcon('activity', 'title-icon', 18)}
          Live Device Status
        </h2>
        <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 4px;">
          15 Devices Total
        </span>
      </div>
      
      <div class="panel-content">
        ${contentHtml || `
          <div class="empty-state">
            ${getIcon('bolt', '', 40)}
            <span class="empty-state-text">No active devices found.</span>
          </div>
        `}
      </div>
    `;

    this.attachEvents(devices);
  }
}
