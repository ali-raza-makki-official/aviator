/**
 * ==========================================================================
 * AVIATOR SIDEBAR COMPONENT
 * Location: public/js/components/SidebarComponent.js
 * 100% Self-Contained Live Bets Sidebar & Stats Manager
 * ==========================================================================
 */

class SidebarComponent {
  constructor() {
    this.activeBetsTab = 'all'; // 'all', 'previous', 'top'
    this.currentRoundBets = [
      { username: 'a***655', avatar: 'assets/static/avatars/v2/av-1.png', amount: '200.00', multiplier: null, winAmount: null },
      { username: 'd***616', avatar: 'assets/static/avatars/v2/av-2.png', amount: '500.00', multiplier: null, winAmount: null },
      { username: 'z***795', avatar: 'assets/static/avatars/v2/av-3.png', amount: '200.00', multiplier: null, winAmount: null },
      { username: 's***617', avatar: 'assets/static/avatars/v2/av-4.png', amount: '100.00', multiplier: null, winAmount: null },
      { username: 'm***844', avatar: 'assets/static/avatars/v2/av-5.png', amount: '500.00', multiplier: null, winAmount: null },
      { username: 'k***420', avatar: 'assets/static/avatars/v2/av-18.png', amount: '50.00', multiplier: null, winAmount: null },
      { username: 'v***912', avatar: 'assets/static/avatars/v2/av-20.png', amount: '1000.00', multiplier: null, winAmount: null },
      { username: 'b***304', avatar: 'assets/static/avatars/v2/av-50.png', amount: '300.00', multiplier: null, winAmount: null }
    ];
    this.availableAvatars = [
      'assets/static/avatars/v2/av-1.png', 'assets/static/avatars/v2/av-2.png',
      'assets/static/avatars/v2/av-3.png', 'assets/static/avatars/v2/av-4.png',
      'assets/static/avatars/v2/av-5.png', 'assets/static/avatars/v2/av-18.png',
      'assets/static/avatars/v2/av-19.png', 'assets/static/avatars/v2/av-20.png',
      'assets/static/avatars/v2/av-21.png', 'assets/static/avatars/v2/av-22.png',
      'assets/static/avatars/v2/av-23.png', 'assets/static/avatars/v2/av-33.png',
      'assets/static/avatars/v2/av-35.png', 'assets/static/avatars/v2/av-41.png',
      'assets/static/avatars/v2/av-47.png', 'assets/static/avatars/v2/av-49.png',
      'assets/static/avatars/v2/av-50.png', 'assets/static/avatars/v2/av-51.png',
      'assets/static/avatars/v2/av-53.png', 'assets/static/avatars/v2/av-63.png',
      'assets/static/avatars/v2/av-65.png', 'assets/static/avatars/v2/av-67.png',
      'assets/static/avatars/v2/av-68.png', 'assets/static/avatars/v2/av-69.png',
      'assets/static/avatars/v2/av-70.png', 'assets/static/avatars/v2/av-71.png',
      'assets/static/avatars/v2/av-72.png'
    ];
    this.currencySymbol = 'PKR';

    this.initTabs();
    this.renderBetsList();
    setTimeout(() => this.renderBetsList(), 100);
    setTimeout(() => this.renderBetsList(), 500);
  }

  getSafeAvatarUrl(rawAvatar, fallbackSeed = 0) {
    if (typeof rawAvatar === 'string' && rawAvatar.trim() !== '') {
      const clean = rawAvatar.trim();
      if (clean.includes('assets/') || clean.includes('/images/') || clean.startsWith('http')) {
        if (!clean.includes('avatar-default')) return clean;
      } else if (clean.startsWith('av-')) {
        return 'assets/static/avatars/v2/' + clean;
      }
    }
    if (typeof rawAvatar === 'number' && !isNaN(rawAvatar)) {
      const idx = Math.abs(Math.floor(rawAvatar)) % this.availableAvatars.length;
      return this.availableAvatars[idx];
    }
    const idx = Math.abs(Math.floor(fallbackSeed)) % this.availableAvatars.length;
    return this.availableAvatars[idx];
  }

  initTabs() {
    const widgetContainer = document.querySelector('.bets-widget-container, app-bets-widget');
    if (!widgetContainer) return;

    const tabs = widgetContainer.querySelectorAll('.navigation-switcher .tab');
    tabs.forEach((tab) => {
      if (!tab.dataset.aviatorWidgetHooked) {
        tab.dataset.aviatorWidgetHooked = 'true';
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const text = tab.textContent.trim().toLowerCase();
          if (text.includes('all')) this.activeBetsTab = 'all';
          else if (text.includes('prev')) this.activeBetsTab = 'previous';
          else if (text.includes('top')) this.activeBetsTab = 'top';
          this.renderBetsList();
        });
      }
    });
  }

  setBotBets(botBets) {
    if (Array.isArray(botBets)) {
      this.currentRoundBets = botBets.map((b, idx) => ({
        username: b.username,
        avatar: this.getSafeAvatarUrl(b.avatar, idx),
        amount: parseFloat(b.amount).toFixed(2),
        multiplier: b.cashedOut ? parseFloat(b.multiplier).toFixed(2) : null,
        winAmount: b.cashedOut ? parseFloat(b.winAmount).toFixed(2) : null
      }));
      this.renderBetsList();
    }
  }

  addPlayerBet(data) {
    this.currentRoundBets.unshift({
      username: data.username,
      avatar: this.getSafeAvatarUrl(data.avatar, Date.now()),
      amount: parseFloat(data.amount).toFixed(2),
      multiplier: null,
      winAmount: null
    });
    this.renderBetsList();
  }

  updatePlayerCashout(username, multiplier, winAmount) {
    const item = this.currentRoundBets.find(b => b.username === username);
    if (item) {
      item.multiplier = parseFloat(multiplier).toFixed(2);
      item.winAmount = parseFloat(winAmount).toFixed(2);
      this.renderBetsList();
    }
  }

  renderBetsList() {
    let listWrapper = document.querySelector('.cdk-virtual-scroll-content-wrapper');
    if (!listWrapper) {
      const viewport = document.querySelector('.bets-list-viewport, cdk-virtual-scroll-viewport');
      if (viewport) {
        listWrapper = viewport.querySelector('.cdk-virtual-scroll-content-wrapper');
        if (!listWrapper) {
          listWrapper = document.createElement('div');
          listWrapper.className = 'cdk-virtual-scroll-content-wrapper';
          viewport.appendChild(listWrapper);
        }
      } else {
        const betsListParent = document.querySelector('app-bets-list .scroll-hide, app-bets-list .bets-list, app-bets-list');
        if (betsListParent) {
          listWrapper = betsListParent;
        }
      }
    }
    if (!listWrapper) return;

    this.initTabs();

    let displayBets = [...this.currentRoundBets];
    if (this.activeBetsTab === 'previous') {
      displayBets = displayBets.filter(b => b.multiplier !== null && b.multiplier !== undefined && b.multiplier !== '');
    } else if (this.activeBetsTab === 'top') {
      displayBets = displayBets.filter(b => b.winAmount !== null && b.winAmount !== undefined && b.winAmount !== '').sort((a, b) => parseFloat(b.winAmount) - parseFloat(a.winAmount));
    }

    const totalBetsCount = this.currentRoundBets.length;
    const cashedOutBets = this.currentRoundBets.filter(b => b.multiplier !== null && b.multiplier !== undefined && b.multiplier !== '');
    const cashedOutCount = cashedOutBets.length;
    const totalWinSum = cashedOutBets.reduce((sum, b) => sum + (parseFloat(b.winAmount) || 0), 0);
    const progressPct = totalBetsCount > 0 ? (cashedOutCount / totalBetsCount) * 100 : 0;

    const cashoutValEl = document.querySelector('.total-win-container .cashout-value');
    if (cashoutValEl) {
      cashoutValEl.textContent = totalWinSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const betsCountEl = document.querySelector('.total-win-container .bets-count');
    if (betsCountEl) {
      betsCountEl.textContent = `${cashedOutCount}/${totalBetsCount}`;
    }

    const totalWinLabelEl = document.querySelector('.total-win-container .total-win');
    if (totalWinLabelEl) {
      totalWinLabelEl.textContent = `Total win ${this.currencySymbol}`;
    }

    const progressBarEl = document.querySelector('.total-win-container .progress-bar');
    if (progressBarEl) {
      progressBarEl.style.width = `${progressPct.toFixed(4)}%`;
    }

    const topAvatarsContainer = document.querySelector('app-top-player-avatars .avatars');
    if (topAvatarsContainer && cashedOutBets.length > 0) {
      const sortedByWin = [...cashedOutBets].sort((a, b) => parseFloat(b.winAmount || 0) - parseFloat(a.winAmount || 0));
      const top3 = sortedByWin.slice(0, 3);
      const avatarsHtml = top3.map((b, i) => {
        const zIdx = 10 - i;
        const avSrc = this.getSafeAvatarUrl(b.avatar, i * 7 + 3);
        return `<img _ngcontent-xlw-c81="" draggable="false" class="avatar ng-star-inserted" src="${avSrc}" alt="${avSrc}" style="z-index: ${zIdx}">`;
      }).join('');
      topAvatarsContainer.innerHTML = avatarsHtml;
    }

    const betHeaderEl = document.querySelector('.bets-list-header-item.bet');
    if (betHeaderEl) betHeaderEl.textContent = ` Bet ${this.currencySymbol} `;
    const winHeaderEl = document.querySelector('.bets-list-header-item.win');
    if (winHeaderEl) winHeaderEl.textContent = ` Win ${this.currencySymbol} `;

    const itemsHtml = displayBets.map((b, idx) => {
      const isCashout = b.multiplier !== null && b.multiplier !== undefined && b.multiplier !== '';
      const multVal = parseFloat(b.multiplier || 0);
      let multColor = 'rgb(52, 180, 255)';
      if (multVal >= 10.0) multColor = 'rgb(192, 23, 180)';
      else if (multVal >= 2.0) multColor = 'rgb(145, 62, 248)';

      const avUrl = this.getSafeAvatarUrl(b.avatar, idx);
      const betAmountStr = parseFloat(b.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const winAmountStr = isCashout ? parseFloat(b.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

      return `
        <app-bets-list-item _ngcontent-xlw-c88="" _nghost-xlw-c87="" class="ng-star-inserted">
          <div _ngcontent-xlw-c87="" class="bet-list-item ${isCashout ? 'cashout' : ''}">
            <div _ngcontent-xlw-c87="" class="bet-list-item-column player">
              <img _ngcontent-xlw-c87="" draggable="false" class="avatar" src="${avUrl}" alt="${avUrl}" />
              <div _ngcontent-xlw-c87="" class="username">${b.username}</div>
            </div>
            <div _ngcontent-xlw-c87="" class="bet-list-item-column bet">
              <app-bet-amount _ngcontent-xlw-c87="" _nghost-xlw-c58="">
                <div _ngcontent-xlw-c58="" class="ng-star-inserted">${betAmountStr}</div>
              </app-bet-amount>
            </div>
            <div _ngcontent-xlw-c87="" class="bet-list-item-column x">
              ${isCashout ? `<div _ngcontent-xlw-c87="" appcoloredmultiplier="" class="ng-star-inserted" style="color: ${multColor}">${parseFloat(b.multiplier).toFixed(2)}x</div>` : ''}
            </div>
            <div _ngcontent-xlw-c87="" class="bet-list-item-column win">
              ${winAmountStr}
            </div>
          </div>
        </app-bets-list-item>
      `;
    }).join('');

    listWrapper.innerHTML = itemsHtml;
  }
}

window.SidebarComponent = SidebarComponent;
