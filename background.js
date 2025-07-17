// Background script for the extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Color Assistant extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This is handled by the popup, but you can add additional logic here
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Color Assistant installed');
});
