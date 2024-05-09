
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getUserInfo") {
    chrome.identity.getProfileUserInfo({accountStatus: "ANY"}, function(userInfo) {
      sendResponse({userInfo: userInfo});
    });
    return true;  // Return true to indicate you wish to send a response asynchronously
  }
});
