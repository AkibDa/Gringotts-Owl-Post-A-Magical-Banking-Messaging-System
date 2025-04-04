function showNotification(message, type = 'success', duration = 3000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
      <span class="notification-icon">${type === 'success' ? '✓' : '✗'}</span>
      <span>${message}</span>
  `;
  document.body.appendChild(notification);
  
  void notification.offsetWidth;
  
  notification.classList.add('show');
  
  setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
          document.body.removeChild(notification);
      }, 500);
  }, duration);
}

function getCurrentUser() {
  const usernameElement = document.querySelector('.user-info span');
  const currentUser = usernameElement ? usernameElement.textContent.trim() : null;
  
  if (!currentUser) {
      showNotification("Please login to continue", 'error');
      setTimeout(() => window.location.href = '/login', 2000);
      return null;
  }
  
  return currentUser;
}

async function sendOwl() {
  try {
      const recipient = document.getElementById('recipient').value.trim();
      const galleons = parseInt(document.getElementById('galleons').value) || 0;
      const sickles = parseInt(document.getElementById('sickles').value) || 0;
      const knuts = parseInt(document.getElementById('knuts').value) || 0;
      const message = document.getElementById('owl-message').value.trim();
      const spell = document.getElementById('spell-verify').value.trim().toLowerCase();
      
      if (!recipient) throw new Error("Recipient is required");
      if (galleons < 0 || sickles < 0 || knuts < 0) throw new Error("Amount cannot be negative");
      if (galleons === 0 && sickles === 0 && knuts === 0) throw new Error("Please enter an amount to send");
      if (!spell) throw new Error("Verification spell is required");

      const usernameElement = document.querySelector('.user-info span');
      const currentUser = usernameElement?.textContent.trim();
      if (!currentUser) throw new Error("User not logged in");

      showOwlAnimation();
      
      const sendButton = document.getElementById('send-owl-button');
      sendButton.disabled = true;
      const originalText = sendButton.innerHTML;
      sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

      const response = await fetch('/api/send_owl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              sender: currentUser,
              recipient,
              message,
              amount: { galleons, sickles, knuts },
              spell
          })
      });

      const data = await response.json();
      
      if (!response.ok) {
          throw new Error(data.error || "Failed to send owl");
      }

      showNotification("Owl successfully delivered!", 'success');
      document.getElementById('owl-form').reset();
  } catch (error) {
      showNotification(error.message, 'error');
      console.error("Owl transfer error:", error);
  } finally {
      setTimeout(() => {
          document.getElementById('owl-animation').style.opacity = '0';
          const sendButton = document.getElementById('send-owl-button');
          if (sendButton) {
              sendButton.disabled = false;
              sendButton.innerHTML = originalText;
          }
      }, 2000);
  }
}

function showOwlAnimation() {
  const owlAnimation = document.getElementById('owl-animation');
  owlAnimation.innerHTML = '<div class="owl-flying"></div>';
  owlAnimation.style.opacity = '1';
}

function convertCurrency() {
  const amountInput = document.getElementById('muggle-amount');
  if (!amountInput) {
      showNotification("Currency converter not properly loaded", 'error');
      return;
  }
  
  const amount = amountInput.value;
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      showNotification("Please enter a valid positive amount", 'error');
      return;
  }
  
  const convertBtn = document.getElementById('convert-btn');
  if (convertBtn) {
      convertBtn.disabled = true;
      convertBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Converting...`;
  }
  
  fetch('/api/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          amount: parseFloat(amount),
          from: "INR",
          to: "wizard"
      })
  })
  .then(response => {
      if (!response.ok) {
          if (response.status === 401) {
              showNotification("Session expired. Please login again.", 'error');
              setTimeout(() => window.location.href = '/login', 2000);
              throw new Error('Unauthorized');
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
  })
  .then(data => {
      if (data.error) {
          throw new Error(data.error);
      }
      
      const resultDiv = document.getElementById('wizard-result');
      if (resultDiv) {
          resultDiv.innerHTML = `
              <p>${amount} INR =</p>
              <p>${data.galleons} Galleons</p>
              <p>${data.sickles} Sickles</p>
              <p>${data.knuts} Knuts</p>
          `;
      }
      showNotification("Conversion successful!", 'success');
  })
  .catch(error => {
      showNotification("Conversion failed: " + error.message, 'error');
  })
  .finally(() => {
      if (convertBtn) {
          convertBtn.disabled = false;
          convertBtn.innerHTML = `Convert`;
      }
  });
}

function checkVault() {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const vaultDisplay = document.getElementById('vault-balance');
  if (!vaultDisplay) {
      showNotification("Vault display element not found", 'error');
      return;
  }
  
  const vaultDoor = document.querySelector('.vault-door');
  
  vaultDisplay.innerHTML = `<p>Opening vault... <i class="fas fa-spinner fa-spin"></i></p>`;
  
  if (vaultDoor) {
      vaultDoor.classList.add('opening');
  }

  fetch(`/api/vault?username=${encodeURIComponent(currentUser)}`, {
      headers: {
          'Content-Type': 'application/json'
      }
  })
  .then(response => {
      if (!response.ok) {
          if (response.status === 401) {
              showNotification("Session expired. Please login again.", 'error');
              setTimeout(() => window.location.href = '/login', 2000);
              throw new Error('Unauthorized');
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
  })
  .then(data => {
      if (data.error) {
          throw new Error(data.error);
      }

      vaultDisplay.innerHTML = `
          <div class="vault-contents">
              <h3>Vault Contents</h3>
              <p class="vault-currency">
                  <span class="currency-icon"><i class="fas fa-coins gold"></i></span>
                  <span class="currency-value">${data.galleons || 0}</span> Galleons
              </p>
              <p class="vault-currency">
                  <span class="currency-icon"><i class="fas fa-coins silver"></i></span>
                  <span class="currency-value">${data.sickles || 0}</span> Sickles
              </p>
              <p class="vault-currency">
                  <span class="currency-icon"><i class="fas fa-coins bronze"></i></span>
                  <span class="currency-value">${data.knuts || 0}</span> Knuts
              </p>
          </div>
      `;

      showNotification("Vault accessed successfully!", 'success');

      setTimeout(() => {
          if (vaultDoor) {
              vaultDoor.classList.remove('opening');
              vaultDoor.classList.add('closing');
              setTimeout(() => {
                  vaultDoor.classList.remove('closing');
              }, 1000);
          }
      }, 5000);
  })
  .catch(error => {
      vaultDisplay.innerHTML = `<p class="error">Error: ${error.message}</p>`;
      showNotification("Failed to access vault: " + error.message, 'error');
      
      if (vaultDoor) {
          vaultDoor.classList.remove('opening');
      }
  });
}

function setupEventListeners() {
  const convertBtn = document.getElementById('convert-btn');
  if (convertBtn) {
      convertBtn.addEventListener('click', convertCurrency);
  }

  const vaultBtn = document.getElementById('access-vault-button');
  if (vaultBtn) {
      vaultBtn.addEventListener('click', checkVault);
  }

  const sendOwlBtn = document.getElementById('send-owl-button');
  if (sendOwlBtn) {
      sendOwlBtn.addEventListener('click', sendOwl);
  }
}

window.convertCurrency = convertCurrency;
window.checkVault = checkVault;
window.sendOwl = sendOwl;
window.showNotification = showNotification;

document.addEventListener('DOMContentLoaded', function() {
  const sendOwlButton = document.getElementById('send-owl-button');
  if (sendOwlButton) {
      sendOwlButton.addEventListener('click', sendOwl);
  } else {
      console.error('Could not find send owl button');
  }

  const convertBtn = document.getElementById('convert-btn');
  if (convertBtn) {
      convertBtn.addEventListener('click', convertCurrency);
  }

  const vaultBtn = document.getElementById('access-vault-button');
  if (vaultBtn) {
      vaultBtn.addEventListener('click', checkVault);
  }
});