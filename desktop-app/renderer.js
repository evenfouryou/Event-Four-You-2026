document.addEventListener('DOMContentLoaded', async () => {
  const readerStatus = document.getElementById('reader-status');
  const readerName = document.getElementById('reader-name');
  const cardStatus = document.getElementById('card-status');
  const cardSerial = document.getElementById('card-serial');
  const bridgeStatus = document.getElementById('bridge-status');
  const emissionStatus = document.getElementById('emission-status');
  const emissionIcon = document.getElementById('emission-icon');
  const emissionText = document.getElementById('emission-text');
  const wsPort = document.getElementById('ws-port');
  const clientsCount = document.getElementById('clients-count');
  const demoBanner = document.getElementById('demo-banner');
  const btnDemo = document.getElementById('btn-demo');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnOpenLog = document.getElementById('btn-open-log');
  const logContent = document.getElementById('log-content');
  const logContainer = document.getElementById('log-container');

  let isDemo = false;

  function updateStatus(status) {
    isDemo = status.simulationMode || status.demoMode;
    if (isDemo) {
      demoBanner.style.display = 'flex';
      btnDemo.textContent = 'Disattiva Demo';
      btnDemo.classList.remove('btn-primary');
      btnDemo.classList.add('btn-warning');
    } else {
      demoBanner.style.display = 'none';
      btnDemo.textContent = 'Attiva Demo';
      btnDemo.classList.remove('btn-warning');
      btnDemo.classList.add('btn-primary');
    }

    if (status.readerDetected || status.readerConnected) {
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
      cardSerial.textContent = status.cardSerial || status.cardATR || '-';
    } else {
      cardStatus.className = 'status disconnected';
      cardStatus.querySelector('.text').textContent = 'Non inserita';
      cardSerial.textContent = '-';
    }

    if (status.bridgeConnected) {
      bridgeStatus.className = 'status connected';
      bridgeStatus.querySelector('.text').textContent = 'Connesso (libSIAE.dll)';
    } else {
      bridgeStatus.className = 'status disconnected';
      bridgeStatus.querySelector('.text').textContent = 'Non connesso';
    }

    const canEmit = (status.readerDetected || status.readerConnected) && status.cardInserted;
    if (canEmit) {
      emissionStatus.className = 'emission-status ready';
      emissionIcon.innerHTML = '&#10004;';
      if (isDemo) {
        emissionText.textContent = 'Pronto per emissione (DEMO)';
      } else if (status.bridgeConnected) {
        emissionText.textContent = 'Pronto - Sigilli fiscali reali attivi';
      } else {
        emissionText.textContent = 'Pronto per emissione biglietti SIAE';
      }
    } else {
      emissionStatus.className = 'emission-status';
      emissionIcon.innerHTML = '&#10060;';
      if (!(status.readerDetected || status.readerConnected)) {
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

  try {
    const initialStatus = await window.electronAPI.getStatus();
    updateStatus(initialStatus);
  } catch (e) {
    console.error('Errore caricamento stato:', e);
  }

  window.electronAPI.onUpdateStatus((status) => {
    updateStatus(status);
  });

  btnDemo.addEventListener('click', async () => {
    btnDemo.disabled = true;
    try {
      if (isDemo) {
        await window.electronAPI.disableDemo();
      } else {
        await window.electronAPI.enableDemo();
      }
    } catch (e) {
      console.error('Errore toggle demo:', e);
    }
    btnDemo.disabled = false;
  });

  btnRefresh.addEventListener('click', async () => {
    btnRefresh.disabled = true;
    btnRefresh.textContent = 'Aggiornamento...';
    try {
      const status = await window.electronAPI.refreshStatus();
      updateStatus(status);
    } catch (e) {
      console.error('Errore refresh:', e);
    }
    btnRefresh.textContent = 'Aggiorna Stato';
    btnRefresh.disabled = false;
  });

  // Gestione log
  async function loadLogs() {
    try {
      const logs = await window.electronAPI.getLogs();
      if (logs && logs.length > 0) {
        const formattedLogs = logs.map(line => {
          if (!line) return '';
          let cssClass = 'log-debug';
          if (line.includes('[INFO]')) cssClass = 'log-info';
          else if (line.includes('[ERROR]')) cssClass = 'log-error';
          else if (line.includes('[WARN]')) cssClass = 'log-warn';
          return `<span class="${cssClass}">${escapeHtml(line)}</span>`;
        }).join('\n');
        logContent.innerHTML = formattedLogs;
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    } catch (e) {
      console.error('Errore caricamento log:', e);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  if (btnOpenLog) {
    btnOpenLog.addEventListener('click', () => {
      window.electronAPI.openLogFile();
    });
  }

  // Carica log iniziali e aggiorna ogni 3 secondi
  loadLogs();
  setInterval(loadLogs, 3000);
});
