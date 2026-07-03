/**
 * Header Component
 * Handles title, active clock, connection status indicator, and active system operators.
 */

import { store } from '../store/state.js';
import { api } from '../services/api.js';
import { getIcon, formatDate } from '../utils/helpers.js';
import { OPERATORS } from '../services/simulator.js';

export class Header {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.clockInterval = null;
    this.init();
  }

  init() {
    // Start ticking clock
    this.clockInterval = setInterval(() => {
      this.updateClock();
    }, 1000);

    // Subscribe to central state changes
    store.subscribe(state => this.render(state));
  }

  updateClock() {
    const clockEl = document.getElementById('header-live-clock');
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  attachEvents() {
    const retryBtn = this.container.querySelector('.offline-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        api.init(); // Restart API connection routine
      });
    }

    // Attach tooltip listener for operators
    const avatars = this.container.querySelectorAll('.operator-avatar-pill');
    const tooltip = document.getElementById('custom-tooltip');
    
    avatars.forEach(avatar => {
      avatar.addEventListener('mouseenter', (e) => {
        const index = avatar.dataset.index;
        const op = OPERATORS[index];
        tooltip.innerHTML = `
          <div class="tooltip-header">
            <span>${op.name}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Email:</span>
            <span class="tooltip-val">${op.email}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Phone:</span>
            <span class="tooltip-val">${op.phone}</span>
          </div>
        `;
        tooltip.classList.add('visible');
        
        const rect = avatar.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX - 40}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
      });

      avatar.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
    });
  }

  render(state) {
    const { connectionStatus, lastSync } = state;
    
    let statusText = 'Disconnected';
    let statusClass = 'status-disconnected';
    let showRetry = true;

    if (connectionStatus === 'connected') {
      statusText = 'Connected';
      statusClass = 'status-connected';
      showRetry = false;
    } else if (connectionStatus === 'reconnecting') {
      statusText = 'Reconnecting';
      statusClass = 'status-reconnecting';
      showRetry = false;
    } else if (connectionStatus === 'simulating') {
      statusText = 'Demo Simulator';
      statusClass = 'status-simulating';
      showRetry = true;
    }

    const operatorsHtml = OPERATORS.map((op, index) => {
      const initials = op.name.split(' ').map(n => n[0]).join('');
      return `<div class="operator-avatar-pill" data-index="${index}">${initials}</div>`;
    }).join('');

    this.container.innerHTML = `
      <div class="brand-section">
        <div class="brand-logo-glow">
          ${getIcon('bolt', 'logo-svg', 20)}
        </div>
        <div class="brand-text">
          <h1 class="brand-title">OFFICE WATCH</h1>
          <span class="brand-subtitle">Smart Monitoring SaaS</span>
        </div>
      </div>

      <div class="header-status-panel">
        <div class="meta-data-group">
          <div class="header-meta-item">
            <span class="meta-label">Current Date</span>
            <span class="meta-value">${formatDate(new Date())}</span>
          </div>
          <div class="header-meta-item">
            <span class="meta-label">Live Clock</span>
            <span id="header-live-clock" class="meta-value">
              ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div class="header-meta-item">
            <span class="meta-label">Last Sync</span>
            <span class="meta-value">${lastSync}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="header-meta-item" style="align-items: flex-end; margin-right: 0.25rem;">
            <span class="meta-label" style="margin-bottom: 0.15rem;">Active Operators</span>
            <div class="operators-indicator">
              ${operatorsHtml}
            </div>
          </div>

          <div class="connection-status-container">
            <span class="status-indicator-dot ${statusClass}"></span>
            <span>${statusText}</span>
            ${showRetry ? `<button class="offline-retry-btn">Reconnect</button>` : ''}
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }
}
