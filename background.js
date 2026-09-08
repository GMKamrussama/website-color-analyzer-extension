// ============================================================
// Color Analyzer Pro — Background Service Worker
// ============================================================

// Helper: Extract colors from raw HTML string inside service worker
function extractColorsFromHtml(html) {
  const set = new Set();
  const colorRegex = /#[0-9a-fA-F]{3,8}|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi;
  let m;
  while ((m = colorRegex.exec(html)) !== null) {
    const c = m[0];
    if (c.startsWith('#')) {
      let hex = c.toLowerCase();
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      if (hex.length === 7) set.add(hex);
    } else {
      const rgb = c.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const hex = '#' + [rgb[0], rgb[1], rgb[2]].map(v => parseInt(v, 10).toString(16).padStart(2, '0')).join('');
        set.add(hex.toLowerCase());
      }
    }
    if (set.size > 50) break;
  }
  return Array.from(set);
}

// Enable side panel on a per-tab basis (prevents global persistence across all tabs)
function configureTabSidePanel(tabId, url) {
  if (!tabId) return;
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
    chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {});
  } else {
    chrome.sidePanel.setOptions({ tabId, path: 'sidebar.html', enabled: true }).catch(() => {});
  }
}

// On install & startup:
// 1. Enable openPanelOnActionClick so Chrome natively opens the side panel on toolbar click
// 2. Set per-tab options so the side panel is scoped only to individual tabs
chrome.runtime.onInstalled.addListener(() => {
  console.log('[ColorAnalyzerPro] Extension installed/updated (v1.0.0)');

  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

  // Initialize side panel options on all existing tabs
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        configureTabSidePanel(tab.id, tab.url);
      }
    }
  });

  // Create context menu
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'open-color-analyzer',
      title: 'Analyze Colors on This Page',
      contexts: ['page']
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        configureTabSidePanel(tab.id, tab.url);
      }
    }
  });
});

// Update per-tab side panel configuration when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url) {
    configureTabSidePanel(tabId, tab.url);
  }
});

// Update per-tab side panel configuration when switching active tabs
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    configureTabSidePanel(tab.id, tab.url);
  });
});

// Context menu click: open side panel for active tab
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-color-analyzer' && tab && tab.id) {
    chrome.sidePanel.setOptions({ tabId: tab.id, path: 'sidebar.html', enabled: true }).then(() => {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {
        chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
      });
    });
  }
});

// Message broker: relay messages between sidebar and content.js, and background audit fetches
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ success: true, pong: true });
    return;
  }

  // Handle multi-page audit fetch in background service worker (prevents any window link-preload warnings)
  if (message.type === 'AUDIT_FETCH_PAGE') {
    fetch(message.url, {
      headers: { 'Accept': 'text/html' },
      cache: 'no-store'
    })
      .then(res => res.text())
      .then(html => {
        const colors = extractColorsFromHtml(html);
        sendResponse({ success: true, colors });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message, colors: [] });
      });
    return true; // Keep message channel open for async response
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
