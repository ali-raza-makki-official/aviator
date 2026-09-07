/**
 * ==========================================================================
 * AVIATOR BET CONTROLS COMPONENT
 * Location: public/js/components/BetControlsComponent.js
 * 100% Self-Contained Native Bet Controls & Panels Manager
 * ==========================================================================
 */

class BetControlsComponent {
  constructor() {
    this.myBets = {
      bet1: null,
      bet2: null
    };
    this.autoStates = {
      bet1: { autoBet: false, autoCashout: false, autoCashoutMult: 1.10 },
      bet2: { autoBet: false, autoCashout: false, autoCashoutMult: 1.10 }
    };
    this.currentGameState = 'WAITING';
    this.currentMultiplier = 1.00;
    this.currencySymbol = 'PKR';

    this.initPanels();
  }

  initPanels() {
    const betControlEls = document.querySelectorAll('app-bet-control');
    this.updatePanelToggleState();

    betControlEls.forEach((controlEl, index) => {
      const slotKey = index === 0 ? 'bet1' : 'bet2';

      // 1. Inject [ Bet ] [ Auto ] navigation switcher tabs into .navigation-wrapper if missing
      const navWrapper = controlEl.querySelector('.navigation-wrapper');
      if (navWrapper && !navWrapper.querySelector('.navigation-switcher')) {
        navWrapper.innerHTML = `
          <app-navigation-switcher class="navigation ng-untouched ng-valid ng-star-inserted">
            <div class="navigation-switcher">
              <button type="button" tabindex="-1" class="tab ng-star-inserted active"> Bet </button>
              <button type="button" tabindex="-1" class="tab ng-star-inserted"> Auto </button>
            </div>
          </app-navigation-switcher>
        `;
      }

      // 2. Tab Switcher (Bet / Auto)
      const tabs = controlEl.querySelectorAll('.navigation-switcher button, .navigation .tab');
      tabs.forEach(tab => {
        if (!tab.dataset.aviatorHooked) {
          tab.dataset.aviatorHooked = 'true';
          tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const isAuto = tab.textContent.trim().toLowerCase() === 'auto';
            const autoFeature = controlEl.querySelector('.controls-content-bottom, .second-row');
            if (autoFeature) {
              if (isAuto) {
                autoFeature.classList.remove('d-none');
                autoFeature.style.display = 'block';
              } else {
                autoFeature.classList.add('d-none');
                autoFeature.style.display = 'none';
              }
            }
          });
        }
      });

      // 3. Main bet button click handler
      const mainBtn = controlEl.querySelector('.buttons-block > button, .buttons-block .btn.bet');
      if (mainBtn && !mainBtn.dataset.aviatorHooked) {
        mainBtn.dataset.aviatorHooked = 'true';
        mainBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleBetButtonClick(controlEl, slotKey);
        });
      }

      // 4. Spinner input initial value
      const spinnerInput = controlEl.querySelector('.bet-block .spinner input, .spinner input');
      if (spinnerInput && (!spinnerInput.value || spinnerInput.value === '0.1' || spinnerInput.value === '1.00')) {
        spinnerInput.value = '16.00';
      }

      // 5. Spinner Plus / Minus buttons
      const minusBtn = controlEl.querySelector('.bet-block .spinner .minus, .bet-block .minus, .spinner .minus, button.minus');
      const plusBtn = controlEl.querySelector('.bet-block .spinner .plus, .bet-block .plus, .spinner .plus, button.plus');

      if (minusBtn) {
        minusBtn.innerHTML = '−';
        if (!minusBtn.dataset.aviatorHooked) {
          minusBtn.dataset.aviatorHooked = 'true';
          minusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (spinnerInput) {
              let cur = parseFloat(spinnerInput.value) || 16.0;
              cur = Math.max(1.0, cur - 1.0);
              spinnerInput.value = cur.toFixed(2);
              this.updateBetButtonsUI();
            }
          });
        }
      }

      if (plusBtn) {
        plusBtn.innerHTML = '+';
        if (!plusBtn.dataset.aviatorHooked) {
          plusBtn.dataset.aviatorHooked = 'true';
          plusBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (spinnerInput) {
              let cur = parseFloat(spinnerInput.value) || 16.0;
              cur += 1.0;
              spinnerInput.value = cur.toFixed(2);
              this.updateBetButtonsUI();
            }
          });
        }
      }

      // 6. Quick Preset Buttons (64, 160, 320, 1,600)
      const presetValues = ['64', '160', '320', '1,600'];
      const presetBtns = controlEl.querySelectorAll('.bets-opt-list button, .bet-opt');
      presetBtns.forEach((pBtn, pIdx) => {
        if (presetValues[pIdx]) {
          let span = pBtn.querySelector('span');
          if (!span) {
            pBtn.innerHTML = `<span> ${presetValues[pIdx]} </span>`;
          } else {
            span.textContent = ` ${presetValues[pIdx]} `;
          }
        }
        if (!pBtn.dataset.aviatorHooked) {
          pBtn.dataset.aviatorHooked = 'true';
          pBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const valStr = pBtn.textContent.trim().replace(/,/g, '');
            const val = parseFloat(valStr);
            if (!isNaN(val) && spinnerInput) {
              spinnerInput.value = val.toFixed(2);
              this.updateBetButtonsUI();
            }
          });
        }
      });

      // 7. Auto-bet Switcher
      const autoBetSwitcher = controlEl.querySelector('.auto-bet app-ui-switcher, .auto-bet .input-switch');
      if (autoBetSwitcher && !autoBetSwitcher.dataset.aviatorHooked) {
        autoBetSwitcher.dataset.aviatorHooked = 'true';
        autoBetSwitcher.addEventListener('click', (e) => {
          e.preventDefault();
          this.autoStates[slotKey].autoBet = !this.autoStates[slotKey].autoBet;
          const switchEl = autoBetSwitcher.querySelector('.input-switch') || autoBetSwitcher;
          if (this.autoStates[slotKey].autoBet) {
            switchEl.classList.remove('off');
            switchEl.classList.add('on');
            switchEl.style.background = '#28a745';
          } else {
            switchEl.classList.remove('on');
            switchEl.classList.add('off');
            switchEl.style.background = '';
          }
        });
      }

      // 8. Auto-Cashout Switcher & Input
      const autoCashoutSwitcher = controlEl.querySelector('.cashout-block app-ui-switcher, .cashout-block .input-switch');
      const autoCashoutInput = controlEl.querySelector('.cashout-spinner input');

      if (autoCashoutSwitcher && !autoCashoutSwitcher.dataset.aviatorHooked) {
        autoCashoutSwitcher.dataset.aviatorHooked = 'true';
        autoCashoutSwitcher.addEventListener('click', (e) => {
          e.preventDefault();
          this.autoStates[slotKey].autoCashout = !this.autoStates[slotKey].autoCashout;
          const switchEl = autoCashoutSwitcher.querySelector('.input-switch') || autoCashoutSwitcher;
          if (this.autoStates[slotKey].autoCashout) {
            switchEl.classList.remove('off');
            switchEl.classList.add('on');
            switchEl.style.background = '#28a745';
            if (autoCashoutInput) autoCashoutInput.removeAttribute('disabled');
          } else {
            switchEl.classList.remove('on');
            switchEl.classList.add('off');
            switchEl.style.background = '';
            if (autoCashoutInput) autoCashoutInput.setAttribute('disabled', 'disabled');
          }
        });
      }

      if (autoCashoutInput && !autoCashoutInput.dataset.aviatorHooked) {
        autoCashoutInput.dataset.aviatorHooked = 'true';
        autoCashoutInput.addEventListener('input', () => {
          const val = parseFloat(autoCashoutInput.value);
          if (!isNaN(val) && val >= 1.01) {
            this.autoStates[slotKey].autoCashoutMult = val;
          }
        });
      }
    });

    this.updateBetButtonsUI();
  }

  updatePanelToggleState() {
    const betControlEls = document.querySelectorAll('app-bet-control');
    if (!betControlEls.length) return;

    const panel1 = betControlEls[0];
    const panel2 = betControlEls[1];

    if (panel1) {
      let addBtn = panel1.querySelector('.sec-hand-btn.add');
      if (!addBtn) {
        const contentTop = panel1.querySelector('.controls-content-top');
        if (contentTop) {
          addBtn = document.createElement('div');
          addBtn.className = 'sec-hand-btn add ng-star-inserted';
          addBtn.innerHTML = '+';
          contentTop.appendChild(addBtn);
        }
      }

      if (addBtn && !addBtn.dataset.aviatorHooked) {
        addBtn.dataset.aviatorHooked = 'true';
        addBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (panel2) {
            panel2.style.display = 'block';
            this.updatePanelToggleState();
          }
        });
      }

      if (panel2) {
        let removeBtn = panel2.querySelector('.sec-hand-btn.remove');
        if (!removeBtn) {
          const contentTop2 = panel2.querySelector('.controls-content-top');
          if (contentTop2) {
            removeBtn = document.createElement('div');
            removeBtn.className = 'sec-hand-btn remove ng-star-inserted';
            removeBtn.innerHTML = '✕';
            contentTop2.insertBefore(removeBtn, contentTop2.firstChild);
          }
        } else {
          removeBtn.innerHTML = '✕';
        }

        if (removeBtn && !removeBtn.dataset.aviatorHooked) {
          removeBtn.dataset.aviatorHooked = 'true';
          removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            panel2.style.display = 'none';
            this.updatePanelToggleState();
          });
        }

        const isPanel2Visible = window.getComputedStyle(panel2).display !== 'none';
        if (isPanel2Visible) {
          if (addBtn) addBtn.style.display = 'none';
          if (removeBtn) removeBtn.style.display = 'flex';
        } else {
          if (addBtn) addBtn.style.display = 'flex';
          if (removeBtn) removeBtn.style.display = 'none';
        }
      }
    }
  }

  handleBetButtonClick(controlEl, slotKey) {
    const betInput = controlEl.querySelector('.bet-block input, .spinner input');
    const amount = betInput ? parseFloat(betInput.value) || 16.0 : 16.0;
    const currentBet = this.myBets[slotKey];
    const socket = window.aviatorSocket;

    if (this.currentGameState === 'FLYING' && currentBet && currentBet.status === 'ACTIVE') {
      console.log(`[BetControls] Cashing out bet on ${slotKey}...`);
      // Optimistic 0ms instant cashout UI lock
      currentBet.status = 'CASHED_OUT';
      currentBet.multiplier = this.currentMultiplier;
      currentBet.winAmount = parseFloat((currentBet.amount * this.currentMultiplier).toFixed(2));
      this.updateBetButtonsUI();
      if (socket) socket.emit('cashout', { betSlot: slotKey, roundId: this.currentRoundId });
    } else if (!currentBet || currentBet.status !== 'ACTIVE') {
      console.log(`[BetControls] Placing bet of amount ${amount} on ${slotKey}...`);
      // Optimistic 0ms instant bet placement UI lock
      this.myBets[slotKey] = {
        amount: amount,
        status: 'ACTIVE',
        slot: slotKey,
        optimistic: true
      };
      this.updateBetButtonsUI();
      if (socket) socket.emit('place_bet', { betSlot: slotKey, amount, roundId: this.currentRoundId });
    }
  }

  onGameState(state) {
    this.currentGameState = state.status || 'WAITING';
    if (state.roundId) this.currentRoundId = state.roundId;
    if (state.currentMultiplier) this.currentMultiplier = state.currentMultiplier;

    if (this.currentGameState === 'WAITING') {
      this.checkAndTriggerAutoBet('bet1');
      this.checkAndTriggerAutoBet('bet2');
    }

    this.updateBetButtonsUI();
  }

  onMultiplierUpdate(data) {
    this.currentGameState = 'FLYING';
    this.currentMultiplier = data.multiplier;

    this.checkAutoCashout('bet1');
    this.checkAutoCashout('bet2');

    this.updateBetButtonsUI();
  }

  onGameCrash(data) {
    this.currentGameState = 'CRASHED';
    this.myBets.bet1 = null;
    this.myBets.bet2 = null;
    this.updateBetButtonsUI();
  }

  onBetResponse(data) {
    if (data.success) {
      const slotKey = data.betSlot || 'bet1';
      this.myBets[slotKey] = {
        amount: data.amount,
        status: 'ACTIVE',
        slot: slotKey
      };
    }
    this.updateBetButtonsUI();
  }

  onCashoutResponse(data) {
    if (data.success) {
      const slotKey = data.betSlot || 'bet1';
      if (this.myBets[slotKey]) {
        this.myBets[slotKey].status = 'CASHED_OUT';
        this.myBets[slotKey].winAmount = data.winAmount;
        this.myBets[slotKey].multiplier = data.multiplier;
      }
    }
    this.updateBetButtonsUI();
  }

  checkAndTriggerAutoBet(slotKey) {
    if (!this.autoStates[slotKey].autoBet) return;
    if (this.myBets[slotKey] && this.myBets[slotKey].status === 'ACTIVE') return;

    const controlEls = document.querySelectorAll('app-bet-control');
    const controlEl = slotKey === 'bet1' ? controlEls[0] : controlEls[1];
    if (!controlEl) return;

    const betInput = controlEl.querySelector('.bet-block input, .spinner input');
    const amount = betInput ? parseFloat(betInput.value) || 16.0 : 16.0;

    const socket = window.aviatorSocket;
    if (socket) socket.emit('place_bet', { betSlot: slotKey, amount, roundId: this.currentRoundId });
  }

  checkAutoCashout(slotKey) {
    if (!this.autoStates[slotKey].autoCashout) return;
    const bet = this.myBets[slotKey];
    if (bet && bet.status === 'ACTIVE') {
      const targetMult = this.autoStates[slotKey].autoCashoutMult || 1.10;
      if (this.currentMultiplier >= targetMult) {
        const socket = window.aviatorSocket;
        if (socket) socket.emit('cashout', { betSlot: slotKey, roundId: this.currentRoundId });
      }
    }
  }

  updateBetButtonsUI() {
    const betControlEls = document.querySelectorAll('app-bet-control');
    betControlEls.forEach((controlEl, index) => {
      const slotKey = index === 0 ? 'bet1' : 'bet2';
      const mainBtn = controlEl.querySelector('.buttons-block > button, .buttons-block .btn.bet');
      if (!mainBtn) return;

      const currentBet = this.myBets[slotKey];
      const betInput = controlEl.querySelector('.bet-block input, .spinner input');
      const amount = betInput ? parseFloat(betInput.value) || 16.0 : 16.0;

      if (this.currentGameState === 'FLYING' && currentBet && currentBet.status === 'ACTIVE') {
        const winVal = (currentBet.amount * this.currentMultiplier).toFixed(2);
        mainBtn.className = 'btn btn-warning bet w-100 h-100 d-flex flex-column align-items-center justify-content-center';
        mainBtn.style.cssText = 'background: linear-gradient(180deg, #ffb800 0%, #e59407 100%) !important; border: none !important; color: #000 !important; border-radius: 12px !important; cursor: pointer; height: 64px !important; min-height: 64px !important; max-height: 64px !important; width: 100% !important; margin: 0 !important; font-family: "Inter-Bold", Inter, sans-serif;';
        mainBtn.innerHTML = `<span style="font-size: 14px; font-weight: 700; text-transform: uppercase;">Cash Out</span><span style="font-size: 18px; font-weight: 800; margin-top: 1px;">${winVal} ${this.currencySymbol}</span>`;
      } else if (currentBet && currentBet.status === 'ACTIVE') {
        mainBtn.className = 'btn btn-danger bet w-100 h-100 d-flex flex-column align-items-center justify-content-center';
        mainBtn.style.cssText = 'background: #d0021b !important; color: #fff !important; font-weight: bold; border-radius: 12px !important; height: 64px !important; min-height: 64px !important; max-height: 64px !important; width: 100% !important; margin: 0 !important; font-family: "Inter-Bold", Inter, sans-serif;';
        mainBtn.innerHTML = `<span style="font-size: 15px; font-weight: bold; text-transform: uppercase;">WAITING</span><span style="font-size: 10.5px; opacity: 0.9;">WAIT FOR NEXT ROUND</span>`;
      } else {
        mainBtn.className = 'btn btn-success bet ng-star-inserted';
        mainBtn.removeAttribute('style');
        mainBtn.innerHTML = `<span class="d-flex flex-column justify-content-center align-items-center"><label class="label">Bet</label><label class="amount"><span>${amount.toFixed(2)}</span><span class="currency"> ${this.currencySymbol}</span></label></span>`;
      }
    });
  }
}

window.changeAmount = function(panelId, change) {
  const betControlEls = document.querySelectorAll('app-bet-control, .betting-panel, .bet-control');
  let index = (panelId === 'panel2' || panelId === 1 || panelId === 'bet2') ? 1 : 0;
  const controlEl = betControlEls[index] || betControlEls[0];
  if (!controlEl) return;
  const inputField = controlEl.querySelector('.bet-block input, input[type="number"], .spinner input, #input-' + panelId);
  if (inputField) {
    let currentVal = parseFloat(inputField.value) || 16.00;
    let newVal = currentVal + change;
    if (newVal < 0) newVal = 0;
    inputField.value = newVal.toFixed(2);
    if (window.aviatorBetControls) window.aviatorBetControls.updateBetButtonsUI();
  }
};

window.setAmount = function(panelId, amount) {
  const betControlEls = document.querySelectorAll('app-bet-control, .betting-panel, .bet-control');
  let index = (panelId === 'panel2' || panelId === 1 || panelId === 'bet2') ? 1 : 0;
  const controlEl = betControlEls[index] || betControlEls[0];
  if (!controlEl) return;
  const inputField = controlEl.querySelector('.bet-block input, input[type="number"], .spinner input, #input-' + panelId);
  if (inputField) {
    inputField.value = parseFloat(amount).toFixed(2);
    if (window.aviatorBetControls) window.aviatorBetControls.updateBetButtonsUI();
  }
};

window.BetControlsComponent = BetControlsComponent;
