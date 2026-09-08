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

// In-memory set of tab IDs where side panel was opened by user
const openTabs = new Set();

// Setup per-tab side panel behavior on installation and startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('[ColorAnalyzerPro] Extension installed/updated (v1.0.0)');

  // Disable side panel globally by default so it never shows across all tabs automatically
  chrome.sidePanel.setOptions({ enabled: false }).catch(() => {});

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
  openTabs.clear();
  chrome.sidePanel.setOptions({ enabled: false }).catch(() => {});
});

// Synchronous action click handler: MUST call sidePanel.open in the immediate tick of user gesture!
chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.id) return;
  const tabId = tab.id;

  if (openTabs.has(tabId)) {
    // Already open on this tab -> Toggle close
    openTabs.delete(tabId);
    chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {});
  } else {
    // Enable and open strictly for this specific tab
    openTabs.add(tabId);
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidebar.html',
      enabled: true
    }).catch(() => {});

    // MUST CALL IMMEDIATELY without awaiting anything so user gesture token remains valid!
    chrome.sidePanel.open({ tabId }).catch((err) => {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch((e) => {
        console.error('[ColorAnalyzerPro] sidePanel.open failed:', e || err);
      });
    });
  }
});

// Context menu click: open exclusively on active tab
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-color-analyzer' && tab && tab.id) {
    const tabId = tab.id;
    openTabs.add(tabId);
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidebar.html',
      enabled: true
    }).catch(() => {});

    chrome.sidePanel.open({ tabId }).catch(() => {
      chrome.sidePanel.open({ windowId: tab.windowId }).catch(console.error);
    });
  }
});

// Dynamic per-tab visibility: hide side panel when switching to tabs where it wasn't opened
chrome.tabs.onActivated.addListener(({ tabId }) => {
  if (!openTabs.has(tabId)) {
    // Disable on this tab so side panel is hidden
    chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {});
  } else {
    // Re-enable on this tab where user opened it
    chrome.sidePanel.setOptions({ tabId, path: 'sidebar.html', enabled: true }).catch(() => {});
  }
});

// Clean up tab state when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  openTabs.delete(tabId);
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
