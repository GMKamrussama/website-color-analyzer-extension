// Content script that runs on every webpage
// This can be used for additional webpage analysis if needed

console.log('Color Assistant content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getColors') {
        // Additional color analysis can be done here
        sendResponse({ success: true });
    }
});
// Content script - minimal for now
console.log('Color Assistant loaded');