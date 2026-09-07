/**
 * ==========================================================================
 * AVIATOR HEADER COMPONENT
 * Location: public/js/components/HeaderComponent.js
 * Handles top header bar, user balance updates, and currency formatting.
 * ==========================================================================
 */

class HeaderComponent {
  constructor() {
    this.container = document.querySelector('.main-header');
    this.balanceAmountEl = document.querySelector('.balance-amount');
    this.balanceCurrencyEl = document.querySelector('.balance-currency');
  }

  /**
   * Updates balance display in top right header
   * @param {number} amount 
   * @param {string} currency 
   */
  updateBalance(amount, currency = 'PKR') {
    if (this.balanceAmountEl) {
      this.balanceAmountEl.textContent = Number(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    if (this.balanceCurrencyEl) {
      this.balanceCurrencyEl.textContent = ' ' + currency;
    }
  }
}

window.HeaderComponent = HeaderComponent;
