const blockDomain = [
  "doubleclick.net",
  "googlesyndication.com",
  "adsystem.com",
  "adservice.google.com"
];

function shouldBlock(url) {
  return blockDomain.some(domain => url.includes(domain));
}

browser.webRequest, onBeforeRequest.addListener(
  (details) => {
    if (shouldBlock(details.url)) {
      return { cancel: true }
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
)
