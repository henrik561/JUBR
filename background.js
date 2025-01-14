chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url.includes('https://jifeline.atlassian.net/jira/software')) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['contentScript.js']
        });
    }
});
