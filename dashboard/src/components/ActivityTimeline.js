/**
 * Live Activity Timeline Component
 * Renders chronological logs of device status changes and alert creations.
 */

import { store } from '../store/state.js';
import { getIcon } from '../utils/helpers.js';

export class ActivityTimeline {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    store.subscribe(state => this.render(state));
  }

  render(state) {
    const { timeline } = state;
    
    let timelineHtml = '';

    if (timeline.length > 0) {
      timeline.forEach(event => {
        const isAlert = event.type === 'alert_raised';
        const nodeClass = isAlert ? 'alert-node' : 'active-node';
        
        timelineHtml += `
          <div class="timeline-node ${nodeClass}">
            <div class="timeline-node-time">${event.timestamp}</div>
            <div class="timeline-node-desc">${event.description}</div>
          </div>
        `;
      });
    }

    this.container.innerHTML = `
      <div class="panel-header">
        <h2 class="panel-title">
          ${getIcon('clock', 'title-icon', 18)}
          Live Activity Log
        </h2>
        <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 4px;">
          Auto-scroll
        </span>
      </div>
      
      <div class="panel-content">
        <div class="timeline-flow">
          ${timelineHtml || `
            <div class="empty-state" style="padding-top:1.5rem;">
              ${getIcon('clock', '', 28)}
              <span class="empty-state-text" style="font-size:0.8rem;">Waiting for activities...</span>
            </div>
          `}
        </div>
      </div>
    `;
  }
}
