/**
 * ==========================================================================
 * AVIATOR STAGE BOARD & CANVAS COMPONENT
 * Location: public/js/components/StageBoardComponent.js
 * Handles canvas stage board, multiplier rendering, and history strip badges.
 * ==========================================================================
 */

class StageBoardComponent {
  constructor() {
    this.container = document.querySelector('.stage-board');
    this.canvas = document.querySelector('.stage-board canvas');
    this.historyStrip = document.querySelector('.result-history');
  }

  renderHistory(historyList = []) {
    if (!this.historyStrip) return;
    let html = '';
    historyList.slice(-20).forEach(h => {
      const mult = Number(h.multiplier || h || 1).toFixed(2) + 'x';
      let colorClass = 'blue';
      const val = Number(h.multiplier || h || 1);
      if (val >= 10) colorClass = 'purple';
      else if (val >= 2) colorClass = 'blue';
      else colorClass = 'dark-blue';

      html += `<div class="payout ${colorClass}">${mult}</div>`;
    });
    this.historyStrip.innerHTML = html;
  }
}

window.StageBoardComponent = StageBoardComponent;
