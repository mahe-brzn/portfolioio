// spreadsheet/agent-utils.js
// Utility functions for extracting and converting agent links with affiliate support.

window.AGENT_AFFILIATES = {
  hipobuy: 'XB5G397OD',
  acbuy: 'KU9MXM',
  allchinabuy: 'KU9MXM',
  cnfans: '17517702',
  superbuy: '',
  wegobuy: '',
  cssbuy: '',
  sugargoo: '',
  oopbuy: '',
  lovegobuy: '',
  mulebuy: '',
  litbuy: '',
  joyabuy: ''
};

// Helper function to append affiliate parameters if they exist
function appendAffiliate(url, agentName, paramName = 'invite_code') {
  const aff = window.AGENT_AFFILIATES[agentName.toLowerCase()];
  if (!aff) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${paramName}=${aff}`;
}

window.extractOriginalLink = (url) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;
    
    const possibleParams = ['url', 'productLink', 'product_url', 'src'];
    for (const param of possibleParams) {
      if (searchParams.has(param)) {
        let innerUrl = searchParams.get(param);
        if (innerUrl.startsWith('http')) {
          return window.extractOriginalLink(innerUrl); // extract recursively
        }
      }
    }
    return url; // Return original if no agent url param found
  } catch (e) {
    return url;
  }
};

window.convertAgentLink = (agent, rawUrl) => {
  // 1. Force extract the original Weidian/Taobao/1688 URL if hidden in an agent link
  let url = window.extractOriginalLink(rawUrl);
  const encoded = encodeURIComponent(url || '');

  // 2. Parse platform and product ID from the raw URL
  let platform = null;
  let id = null;
  if (url.includes('weidian.com')) {
    platform = 'weidian';
    const match = url.match(/itemID=(\d+)/);
    if (match) id = match[1];
  } else if (url.includes('taobao.com') || url.includes('tmall.com')) {
    platform = 'taobao';
    const match = url.match(/id=(\d+)/);
    if (match) id = match[1];
  } else if (url.includes('1688.com')) {
    platform = '1688';
    const match = url.match(/offer\/(\d+)/);
    if (match) id = match[1];
  }

  // Normalize agent name
  const a = agent.toLowerCase().replace(/\s+/g, '');
  let finalUrl = '';

  // 3. Generate agent link — platform+id routes first (optimized), ?url= fallback
  switch(a) {
    case 'hippobuy':
    case 'hipobuy':
      if (platform && id) finalUrl = `https://hipobuy.com/product/${platform}/${id}`;
      else finalUrl = `https://hipobuy.com/product/details?url=${encoded}`;
      return appendAffiliate(finalUrl, 'hipobuy', 'inviteCode');

    case 'acbuy':
    case 'allchinabuy':
      finalUrl = `https://www.allchinabuy.com/en/page/buy/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'acbuy', 'inviteCode');

    case 'cnfans':
      finalUrl = `https://cnfans.com/product/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'cnfans', 'ref');

    case 'superbuy':
      finalUrl = `https://www.superbuy.com/en/page/buy/?nTag=Home-search&url=${encoded}`;
      return appendAffiliate(finalUrl, 'superbuy', 'inviteCode');

    case 'wegobuy':
      finalUrl = `https://www.wegobuy.com/en/page/buy/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'wegobuy', 'inviteCode');

    case 'cssbuy':
      if (platform && id) {
        const cssType = platform === 'weidian' ? 'micro' : platform;
        finalUrl = `https://www.cssbuy.com/item-${cssType}-${id}.html`;
      } else {
        finalUrl = `https://www.cssbuy.com/item.html?url=${encoded}`;
      }
      return appendAffiliate(finalUrl, 'cssbuy', 'inviteCode');

    case 'sugargoo':
      finalUrl = `https://www.sugargoo.com/#/home/productDetail?productLink=${encoded}`;
      return appendAffiliate(finalUrl, 'sugargoo', 'memberId');

    case 'oopbuy':
      if (platform && id) finalUrl = `https://www.oopbuy.com/product/${platform}/${id}`;
      else finalUrl = `https://www.oopbuy.com/product/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'oopbuy', 'inviteCode');

    case 'lovegobuy':
      finalUrl = `https://lovegobuy.com/product/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'lovegobuy', 'inviteCode');

    case 'mulebuy':
      if (platform && id) finalUrl = `https://mulebuy.com/product/?shop_type=${platform}&id=${id}`;
      else finalUrl = `https://mulebuy.com/product/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'mulebuy', 'ref');

    case 'litbuy':
      finalUrl = `https://litbuy.com/product/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'litbuy', 'inviteCode');

    case 'joyabuy':
      if (platform && id) finalUrl = `https://joyabuy.com/product/?shop_type=${platform}&id=${id}`;
      else finalUrl = `https://joyabuy.com/product/?url=${encoded}`;
      return appendAffiliate(finalUrl, 'joyabuy', 'inviteCode');

    default:
      if (platform && id) finalUrl = `https://hipobuy.com/product/${platform}/${id}`;
      else finalUrl = `https://hipobuy.com/product/details?url=${encoded}`;
      return appendAffiliate(finalUrl, 'hipobuy', 'inviteCode');
  }
};
