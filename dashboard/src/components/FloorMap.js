/**
 * Office Floor Map Component
 * Renders an interactive, beautiful top-view SVG layout of the three rooms.
 * Includes hover tooltips, click drawer actions, fan spin, and light glow animations.
 */

import { store } from '../store/state.js';
import { getIcon } from '../utils/helpers.js';

export class FloorMap {
  constructor(containerId, onDeviceSelect) {
    this.container = document.getElementById(containerId);
    this.onDeviceSelect = onDeviceSelect;
    this.tooltip = document.getElementById('custom-tooltip');
    
    // SVG Dimensions
    this.svgWidth = 920;
    this.svgHeight = 350;

    // Define device positions in coordinate space (Drawing Room: DR, Work Room 1: W1, Work Room 2: W2)
    this.deviceCoordinates = {
      // Drawing Room (x: 20 -> 280)
      drawing_room_fan_1: { x: 95, y: 110 },
      drawing_room_fan_2: { x: 205, y: 210 },
      drawing_room_light_1: { x: 70, y: 60 },
      drawing_room_light_2: { x: 230, y: 60 },
      drawing_room_light_3: { x: 150, y: 260 },

      // Work Room 1 (x: 310 -> 570)
      work_room_1_fan_1: { x: 380, y: 110 },
      work_room_1_fan_2: { x: 500, y: 210 },
      work_room_1_light_1: { x: 340, y: 60 },
      work_room_1_light_2: { x: 540, y: 60 },
      work_room_1_light_3: { x: 440, y: 260 },

      // Work Room 2 (x: 600 -> 860)
      work_room_2_fan_1: { x: 670, y: 110 },
      work_room_2_fan_2: { x: 790, y: 210 },
      work_room_2_light_1: { x: 630, y: 60 },
      work_room_2_light_2: { x: 830, y: 60 },
      work_room_2_light_3: { x: 730, y: 260 }
    };

    store.subscribe(state => this.updateState(state));
  }

  updateState(state) {
    if (!this.rendered) {
      this.renderHTML();
      this.rendered = true;
    }
    
    // Update SVG states dynamically without re-rendering entire structure
    state.devices.forEach(device => {
      const el = this.container.querySelector(`#svg-${device.id}`);
      if (el) {
        if (device.status === 'on') {
          el.classList.add(device.type === 'fan' ? 'fan-running' : 'light-on');
        } else {
          el.classList.remove('fan-running', 'light-on');
        }
      }
    });

    this.attachEvents(state.devices);
  }

  attachEvents(devices) {
    const svgDevices = this.container.querySelectorAll('.svg-device');
    
    svgDevices.forEach(svgEl => {
      const deviceId = svgEl.dataset.id;
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      // Click to open side drawer
      svgEl.onclick = (e) => {
        e.stopPropagation();
        if (this.onDeviceSelect) {
          this.onDeviceSelect(device.id);
        }
      };

      // Hover Tooltip logic
      svgEl.onmouseenter = (e) => {
        this.tooltip.innerHTML = `
          <div class="tooltip-header">
            <span>${device.name}</span>
            <span style="font-size:0.65rem; padding: 0.05rem 0.3rem; border-radius: 4px; background: ${device.status === 'on' ? 'var(--success-glow)' : 'var(--border-color)'}; color: ${device.status === 'on' ? 'var(--success-color)' : 'var(--text-muted)'}; font-weight:700;">
              ${device.status.toUpperCase()}
            </span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Room:</span>
            <span class="tooltip-val">${device.room}</span>
          </div>
          <div class="tooltip-row">
            <span class="tooltip-label">Power:</span>
            <span class="tooltip-val">${device.status === 'on' ? device.power : 0} W</span>
          </div>
          <div class="tooltip-row" style="margin-top: 0.25rem; font-size: 0.65rem; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 0.25rem;">
            <span>Toggled by: ${device.lastToggledBy}</span>
          </div>
        `;
        
        this.tooltip.classList.add('visible');
        this.positionTooltip(e);
      };

      svgEl.onmousemove = (e) => {
        this.positionTooltip(e);
      };

      svgEl.onmouseleave = () => {
        this.tooltip.classList.remove('visible');
      };
    });
  }

  positionTooltip(e) {
    const tooltipWidth = this.tooltip.offsetWidth;
    const tooltipHeight = this.tooltip.offsetHeight;
    let x = e.clientX + 15;
    let y = e.clientY + 15;

    // Check boundary collisions
    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - 15;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = e.clientY - tooltipHeight - 15;
    }

    this.tooltip.style.left = `${x + window.scrollX}px`;
    this.tooltip.style.top = `${y + window.scrollY}px`;
  }

  renderHTML() {
    this.container.innerHTML = `
      <div class="panel-header" style="margin-bottom: 0.75rem;">
        <h2 class="panel-title">
          ${getIcon('bolt', 'title-icon', 18)}
          Live Office Floor Map
        </h2>
        <div style="display: flex; gap: 1rem; font-size: 0.75rem; color: var(--text-muted);">
          <span style="display: flex; align-items: center; gap: 0.25rem;">
            <span style="width: 8px; height: 8px; border-radius:50%; background:#fbbf24; box-shadow: 0 0 5px #fbbf24;"></span> Light ON
          </span>
          <span style="display: flex; align-items: center; gap: 0.25rem;">
            <span style="width: 8px; height: 8px; border-radius:50%; background:#3b82f6; box-shadow: 0 0 5px #3b82f6;"></span> Fan ON
          </span>
        </div>
      </div>
      
      <div class="floor-map-wrapper">
        <svg viewBox="0 0 ${this.svgWidth} ${this.svgHeight}" class="office-svg">
          <!-- Filters & Gradients -->
          <defs>
            <radialGradient id="light-glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#fbbf24" stop-opacity="1"/>
              <stop offset="25%" stop-color="#fbbf24" stop-opacity="0.6"/>
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
            </radialGradient>
            <linearGradient id="wall-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#1e293b"/>
              <stop offset="100%" stop-color="#0f172a"/>
            </linearGradient>
            <pattern id="grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none"/>
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.015)" stroke-width="1"/>
            </pattern>
          </defs>

          <!-- Backdrop Grid Pattern -->
          <rect width="${this.svgWidth}" height="${this.svgHeight}" fill="url(#grid-pattern)" rx="8" />

          <!-- Outer Office Wall Border -->
          <rect x="10" y="10" width="870" height="300" fill="none" stroke="#334155" stroke-width="4" rx="10" />

          <!-- ROOM 1: Drawing Room (x: 10 -> 290) -->
          <rect x="15" y="15" width="275" height="290" class="room-bg" />
          <text x="150" y="42" text-anchor="middle" class="room-label">Drawing Room</text>

          <!-- ROOM 2: Work Room 1 (x: 290 -> 580) -->
          <rect x="290" y="15" width="290" height="290" class="room-bg" />
          <text x="435" y="42" text-anchor="middle" class="room-label">Work Room 1</text>

          <!-- ROOM 3: Work Room 2 (x: 580 -> 875) -->
          <rect x="580" y="15" width="295" height="290" class="room-bg" />
          <text x="725" y="42" text-anchor="middle" class="room-label">Work Room 2</text>

          <!-- ======================================================= -->
          <!-- FURNITURE LAYOUTS -->
          <!-- ======================================================= -->

          <!-- Drawing Room Furniture: Sofa, Armchair, Coffee Table -->
          <!-- Sofa (Left Wall) -->
          <rect x="30" y="70" width="35" height="150" rx="4" class="furniture" />
          <rect x="35" y="75" width="25" height="140" rx="2" fill="#334155" stroke="#475569" />
          <!-- Coffee Table (Center) -->
          <rect x="95" y="145" width="70" height="40" rx="6" class="furniture" />
          <!-- Armchair (Bottom Left) -->
          <rect x="35" y="240" width="40" height="40" rx="4" class="furniture" />
          <circle cx="260" cy="265" r="12" fill="#0d5a2b" stroke="#166534" opacity="0.6" /> <!-- Indoor Plant -->
          <circle cx="260" cy="265" r="5" fill="#14532d" />

          <!-- Work Room 1 Furniture: 4 Desks & Chairs -->
          <!-- Desk Group 1 (Left Upper) -->
          <rect x="305" y="70" width="65" height="40" rx="2" class="furniture" />
          <rect x="320" y="55" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->
          <!-- Desk Group 2 (Left Lower) -->
          <rect x="305" y="190" width="65" height="40" rx="2" class="furniture" />
          <rect x="320" y="230" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->
          <!-- Desk Group 3 (Right Upper) -->
          <rect x="500" y="70" width="65" height="40" rx="2" class="furniture" />
          <rect x="515" y="55" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->
          <!-- Desk Group 4 (Right Lower) -->
          <rect x="500" y="190" width="65" height="40" rx="2" class="furniture" />
          <rect x="515" y="230" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->

          <!-- Work Room 2 Furniture: 4 Desks & Chairs -->
          <!-- Desk Group 1 (Left Upper) -->
          <rect x="595" y="70" width="65" height="40" rx="2" class="furniture" />
          <rect x="610" y="55" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->
          <!-- Desk Group 2 (Left Lower) -->
          <rect x="595" y="190" width="65" height="40" rx="2" class="furniture" />
          <rect x="610" y="230" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->
          <!-- Desk Group 3 (Right Upper) -->
          <rect x="790" y="70" width="65" height="40" rx="2" class="furniture" />
          <rect x="805" y="55" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->
          <!-- Desk Group 4 (Right Lower) -->
          <rect x="790" y="190" width="65" height="40" rx="2" class="furniture" />
          <rect x="805" y="230" width="35" height="15" rx="3" class="furniture" /> <!-- Chair -->

          <!-- Office Doors & Window markings -->
          <line x1="100" y1="305" x2="140" y2="305" stroke="#0f172a" stroke-width="4" /> <!-- Entry cut -->
          <path d="M 100 305 A 40 40 0 0 1 140 265" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="3,3" /> <!-- Door Swing -->

          <!-- Internal doors -->
          <line x1="290" y1="230" x2="290" y2="270" stroke="#0f172a" stroke-width="4" />
          <path d="M 290 230 A 40 40 0 0 1 330 270" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="3,3" />
          <line x1="580" y1="230" x2="580" y2="270" stroke="#0f172a" stroke-width="4" />
          <path d="M 580 230 A 40 40 0 0 1 620 270" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="3,3" />

          <!-- ======================================================= -->
          <!-- DEVICE SVG GRAPHICS (LIGHTS AND FANS) -->
          <!-- ======================================================= -->
          ${this.renderSvgDevices()}
        </svg>
      </div>
    `;
  }

  // Loop coordinates and generate interactive device nodes in SVG
  renderSvgDevices() {
    let devicesMarkup = '';

    for (const [id, coord] of Object.entries(this.deviceCoordinates)) {
      const type = id.includes('fan') ? 'fan' : 'light';
      
      if (type === 'light') {
        devicesMarkup += `
          <!-- Light bulb interactive SVG group -->
          <g id="svg-${id}" class="svg-device" data-id="${id}">
            <!-- Glow background circle -->
            <circle cx="${coord.x}" cy="${coord.y}" r="35" fill="url(#light-glow-grad)" class="light-glow" />
            <!-- Soft glow hover assist -->
            <circle cx="${coord.x}" cy="${coord.y}" r="15" fill="rgba(245, 158, 11, 0.05)" stroke="rgba(245, 158, 11, 0.1)" stroke-width="1"/>
            
            <!-- Light bulb body -->
            <path d="M ${coord.x - 6} ${coord.y + 4} A 9 9 0 1 1 ${coord.x + 6} ${coord.y + 4} L ${coord.x + 4} ${coord.y + 9} L ${coord.x - 4} ${coord.y + 9} Z" class="light-bulb-element" />
            <!-- Filament -->
            <path d="M ${coord.x - 3} ${coord.y} Q ${coord.x} ${coord.y - 4} ${coord.x + 3} ${coord.y}" fill="none" stroke="#475569" stroke-width="1" />
            <!-- Base fitting -->
            <rect x="${coord.x - 3.5}" y="${coord.y + 9}" width="7" height="3" fill="#64748b" rx="0.5" />
            <circle cx="${coord.x}" cy="${coord.y + 13}" r="1" fill="#475569" />
          </g>
        `;
      } else {
        devicesMarkup += `
          <!-- Fan interactive SVG group -->
          <g id="svg-${id}" class="svg-device" data-id="${id}">
            <!-- Outer protection shroud rings -->
            <circle cx="${coord.x}" cy="${coord.y}" r="22" fill="rgba(30, 41, 59, 0.5)" stroke="rgba(100, 116, 139, 0.2)" stroke-width="1.5" />
            <circle cx="${coord.x}" cy="${coord.y}" r="16" fill="none" stroke="rgba(100, 116, 139, 0.15)" stroke-width="1" />
            
            <!-- Rotating blades sub-group -->
            <g class="svg-fan-blade" style="transform-origin: ${coord.x}px ${coord.y}px;">
              <!-- 3 Blades -->
              <path d="M ${coord.x} ${coord.y - 3} C ${coord.x - 5} ${coord.y - 12} ${coord.x - 3} ${coord.y - 20} ${coord.x} ${coord.y - 20} C ${coord.x + 3} ${coord.y - 20} ${coord.x + 5} ${coord.y - 12} ${coord.x} ${coord.y - 3} Z" fill="#475569" stroke="#334155" stroke-width="0.5" />
              <path d="M ${coord.x - 2.6} ${coord.y + 1.5} C ${coord.x - 12.9} ${coord.y + 1.5} ${coord.x - 18.9} ${coord.y - 6.6} ${coord.x - 17.3} ${coord.y - 10} C ${coord.x - 15.7} ${coord.y - 12.8} ${coord.x - 6.9} ${coord.y - 8.9} ${coord.x - 2.6} ${coord.y + 1.5} Z" fill="#475569" stroke="#334155" stroke-width="0.5" />
              <path d="M ${coord.x + 2.6} ${coord.y + 1.5} C ${coord.x + 12.9} ${coord.y + 1.5} ${coord.x + 18.9} ${coord.y - 6.6} ${coord.x + 17.3} ${coord.y - 10} C ${coord.x + 15.7} ${coord.y - 12.8} ${coord.x + 6.9} ${coord.y - 8.9} ${coord.x + 2.6} ${coord.y + 1.5} Z" fill="#475569" stroke="#334155" stroke-width="0.5" />
            </g>

            <!-- Centered motor hub -->
            <circle cx="${coord.x}" cy="${coord.y}" r="4.5" fill="#64748b" stroke="#1e293b" stroke-width="1.5" />
            <circle cx="${coord.x}" cy="${coord.y}" r="1.5" fill="#f8fafc" />
          </g>
        `;
      }
    }

    return devicesMarkup;
  }
}
