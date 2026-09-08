// ============================================================
// Color Analyzer Pro — Background Service Worker
// ============================================================

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[ColorAnalyzerPro] Extension installed/updated (v1.0.0)');

  // Configure side panel to open on action click
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('[ColorAnalyzerPro] sidePanel.setPanelBehavior not supported:', error);
  }

  // Create context menu
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'open-color-analyzer',
      title: 'Analyze Colors on This Page',
      contexts: ['page']
    });
  });
});

// Fallback action click listener if openPanelOnActionClick is not handled by browser
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (error) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (err) {
      console.error('[ColorAnalyzerPro] Error opening sidePanel:', err);
    }
  }
});

// Context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'open-color-analyzer' && tab) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (e) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (err) {
        console.error('[ColorAnalyzerPro] Error opening sidePanel from context menu:', err);
      }
    }
  }
});

// Message broker: relay messages between sidebar and content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ success: true, pong: true });
    return;
  }

  // Handle tab reload request from sidebar
  if (message.type === 'RELOAD_TAB') {
    const tabId = message.tabId || (sender.tab ? sender.tab.id : null);
    if (tabId) {
      chrome.tabs.reload(tabId, { bypassCache: true }, () => {
        sendResponse({ success: true });
      });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
          chrome.tabs.reload(tabs[0].id, { bypassCache: true }, () => {
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      });
    }
    return true; // Keep channel open
  }

  if (message.type === 'SIDEBAR_TO_CONTENT') {
    // Forward from sidebar to the active tab's content script
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      let activeTab = tabs && tabs[0];
      if (!activeTab) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs2) => {
          activeTab = tabs2 && tabs2[0];
          if (!activeTab) {
            sendResponse({ success: false, error: 'No active tab found' });
            return;
          }
          relayToContent(activeTab, message.payload, sendResponse);
        });
      } else {
        relayToContent(activeTab, message.payload, sendResponse);
      }
    });
    return true;
  }

  if (message.type === 'CONTENT_TO_SIDEBAR') {
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ ok: true });
    return;
  }
});

function relayToContent(tab, payload, sendResponse) {
  if (!tab || !tab.id) {
    sendResponse({ success: false, error: 'No active tab found' });
    return;
  }

  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
    sendResponse({ success: false, error: 'RESTRICTED_PAGE' });
    return;
  }

  chrome.tabs.sendMessage(tab.id, payload, (response) => {
    if (chrome.runtime.lastError) {
      const err = chrome.runtime.lastError.message || '';
      // If content script was not yet injected into an existing tab, inject dynamically and retry
      if (err.includes('Could not establish connection') || err.includes('Receiving end does not exist')) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, payload, (retryResponse) => {
              if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                sendResponse(retryResponse || { success: true });
              }
            });
          }, 120);
        }).catch((injectErr) => {
          sendResponse({ success: false, error: injectErr.message || err });
        });
      } else {
        sendResponse({ success: false, error: err });
      }
    } else {
      sendResponse(response);
    }
  });
}
