document.addEventListener('DOMContentLoaded', async () => {
  const readerStatus = document.getElementById('reader-status');
  const readerName = document.getElementById('reader-name');
  const cardStatus = document.getElementById('card-status');
  const cardType = document.getElementById('card-type');
  const emissionStatus = document.getElementById('emission-status');
  const emissionIcon = document.getElementById('emission-icon');
  const emissionText = document.getElementById('emission-text');
  const wsPort = document.getElementById('ws-port');
  const clientsCount = document.getElementById('clients-count');

  function updateStatus(status) {
    if (status.readerDetected) {
      readerStatus.className = 'status connected';
      readerStatus.querySelector('.text').textContent = 'Connesso';
      readerName.textContent = status.readerName || 'MiniLector EVO V3';
    } else {
      readerStatus.className = 'status disconnected';
      readerStatus.querySelector('.text').textContent = 'Non rilevato';
      readerName.textContent = '-';
    }

    if (status.cardInserted) {
      cardStatus.className = 'status connected';
      cardStatus.querySelector('.text').textContent = 'Inserita';
      cardType.textContent = status.cardType || 'Smart Card';
    } else {
      cardStatus.className = 'status disconnected';
      cardStatus.querySelector('.text').textContent = 'Non inserita';
      cardType.textContent = '-';
    }

    if (status.canEmitTickets) {
      emissionStatus.className = 'emission-status ready';
      emissionIcon.textContent = '✅';
      emissionText.textContent = 'Pronto per emissione biglietti SIAE';
    } else {
      emissionStatus.className = 'emission-status';
      emissionIcon.textContent = '❌';
      if (!status.readerDetected) {
        emissionText.textContent = 'Collegare il lettore Smart Card';
      } else if (!status.cardInserted) {
        emissionText.textContent = 'Inserire la Smart Card SIAE';
      } else {
        emissionText.textContent = 'Non pronto per emissione';
      }
    }

    if (status.wsPort) {
      wsPort.textContent = status.wsPort;
    }

    if (status.clientsConnected !== undefined) {
      clientsCount.textContent = status.clientsConnected;
    }
  }

  const initialStatus = await window.electronAPI.getStatus();
  updateStatus(initialStatus);

  window.electronAPI.onUpdateStatus((status) => {
    updateStatus(status);
  });
});
