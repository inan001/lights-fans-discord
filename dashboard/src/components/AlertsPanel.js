/**
 * Active Alerts Panel Component
 * Displays system alerts (warnings/errors) with severity styles and animations.
 */

import { store } from '../store/state.js';
import { getIcon } from '../utils/helpers.js';

export class AlertsPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    store.subscribe(state => this.render(state));
  }

  render(state) {
    const { alerts } = state;
    
    let alertsHtml = '';

    if (alerts.length > 0) {
      alerts.forEach(alert => {
        const severityClass = alert.severity === 'danger' ? 'danger' : 'warning';
        const iconName = alert.severity === 'danger' ? 'shieldAlert' : 'bell';
        
        alertsHtml += `
          <div class="alert-card ${severityClass}" data-id="${alert.id}">
            <div class="alert-icon-side">
              ${getIcon(iconName, '', 16)}
            </div>
            <div class="alert-content-side">
              <div class="alert-header-row">
                <span class="alert-room-badge">${alert.room}</span>
                <span class="alert-time">${alert.timestamp}</span>
              </div>
              <span class="alert-desc">${alert.description}</span>
              <span class="alert-badge">${alert.severity}</span>
            </div>
          </div>
        `;
      });
    }

    this.container.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">
          ${getIcon('bell', 'title-icon', 18)}
          Active Warnings
        </h2>
        <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 4px;">
          ${alerts.length} Issues
        </span>
      </div>
      
      <div class="panel-content">
        <div class="alerts-list">
          ${alertsHtml || `
            <div class="empty-state" style="padding-top:1.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-check" style="opacity:0.8; filter: drop-shadow(0 0 5px rgba(34, 197, 94, 0.2));"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
              <span class="empty-state-text" style="color:var(--text-muted); font-size:0.8rem; font-weight:500;">All systems normal. No active alerts.</span>
            </div>
          `}
        </div>
      </div>
    `;
  }
}
