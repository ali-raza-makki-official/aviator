/**
 * ==========================================================================
 * AVIATOR MAIN APPLICATION COORDINATOR
 * Location: public/js/components/AviatorApp.js
 * Coordinates modular React-like components with backend engine events.
 * ==========================================================================
 */

class AviatorApp {
  constructor() {
    this.header = new HeaderComponent();
    this.sidebar = new SidebarComponent();
    this.stageBoard = new StageBoardComponent();
    this.betControls = new BetControlsComponent();

    window.aviatorApp = this;
    window.aviatorSidebar = this.sidebar;
    window.aviatorBetControls = this.betControls;

    this.initSocketListeners();
  }

  initSocketListeners() {
    const checkSocket = () => {
      const socket = window.aviatorSocket || (typeof io !== 'undefined' ? io() : null);
      if (!socket) {
        setTimeout(checkSocket, 200);
        return;
      }

      socket.on('init_sync', (data) => {
        if (data.user && data.user.balance) {
          this.header.updateBalance(data.user.balance, data.user.currency || 'PKR');
        }
        if (data.botBets) {
          this.sidebar.setBotBets(data.botBets);
        }
      });

      socket.on('game_state', (state) => {
        if (state.botBets) {
          this.sidebar.setBotBets(state.botBets);
        }
        this.betControls.onGameState(state);
      });

      socket.on('multiplier_update', (data) => {
        this.betControls.onMultiplierUpdate(data);
      });

      socket.on('game_crash', (data) => {
        this.betControls.onGameCrash(data);
      });

      socket.on('bot_cashout', (bot) => {
        this.sidebar.updatePlayerCashout(bot.username, bot.multiplier, bot.winAmount);
      });

      socket.on('player_bet_event', (data) => {
        this.sidebar.addPlayerBet(data);
      });

      socket.on('player_cashout_event', (data) => {
        this.sidebar.updatePlayerCashout(data.username, data.multiplier, data.winAmount);
      });

      socket.on('bet_response', (data) => {
        this.betControls.onBetResponse(data);
        if (data.balance !== undefined) {
          this.header.updateBalance(data.balance, 'PKR');
        }
      });

      socket.on('cashout_response', (data) => {
        this.betControls.onCashoutResponse(data);
        if (data.balance !== undefined) {
          this.header.updateBalance(data.balance, 'PKR');
        }
      });
    };

    checkSocket();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.aviatorApp = new AviatorApp();
  console.log('[Aviator App] All modular components initialized cleanly.');
});
