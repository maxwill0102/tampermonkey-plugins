// ==UserScript==
// @name         活动报名插件 V3.8（商品抓取增强版）
// @namespace    https://yourdomain.com
// @version      3.8.0
// @description  自动抓取可报名商品，支持分页加载、动态 Cookie、Anti-Content 处理
// @match        https://agentseller.temu.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      agentseller.temu.com
// ==/UserScript==

(function () {
  'use strict';

  const MALL_ID = '634418223153529';

  function getLatestCookie() {
    return document.cookie;
  }

  function getAntiContentPlaceholder() {
    // TODO: 实现动态提取逻辑，目前手动复制有效 Anti-Content
    return '粘贴你抓包得到的 anti-content 值';
  }

  function fetchProducts(activityId, scrollContext = '') {
    const cookie = getLatestCookie();
    const antiContent = getAntiContentPlaceholder();

    const data = {
      activityType: 13,
      activityThematicId: Number(activityId),
      rowCount: 50,
      addSite: true,
      searchScrollContext: scrollContext
    };

    console.log('📦 [请求参数]:', data);

    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'content-type': 'application/json',
        'anti-content': antiContent,
        'cookie': cookie,
        'mallid': MALL_ID,
        'origin': 'https://agentseller.temu.com',
        'referer': `https://agentseller.temu.com/activity/marketing-activity/detail-new?type=13&thematicId=${activityId}`,
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'user-agent': navigator.userAgent
      },
      data: JSON.stringify(data),
      onload: function (res) {
        if (res.status === 200) {
          try {
            const json = JSON.parse(res.responseText);
            const list = json?.data?.matchList || [];
            const nextCtx = json?.data?.searchScrollContext || '';
            const hasMore = json?.data?.hasMore || false;

            console.log('✅ 获取商品数量:', list.length);
            console.table(list.map(i => ({ 商品名: i.productName, SPU: i.spuId })));

            if (hasMore && nextCtx) {
              setTimeout(() => fetchProducts(activityId, nextCtx), 1200);
            }
          } catch (e) {
            console.error('❌ JSON解析错误:', e);
          }
        } else {
          console.error('❌ 请求失败:', res.status, res.responseText);
        }
      },
      onerror: function (err) {
        console.error('❌ 网络错误:', err);
      }
    });
  }

  function insertFetchUI() {
    const container = document.createElement('div');
    container.style = 'padding:10px;background:#f6f6f6;border:1px solid #ccc;margin-top:12px;';
    container.innerHTML = `
      <input id="temu-activity-id" placeholder="输入活动ID" style="padding:4px;width:300px;font-size:14px;">
      <button id="temu-fetch-btn" style="margin-left:10px;padding:4px 12px;">🚀 抓取商品</button>
    `;
    document.body.appendChild(container);

    document.getElementById('temu-fetch-btn').onclick = () => {
      const id = document.getElementById('temu-activity-id').value.trim();
      if (!id) return alert('请输入活动 ID');
      fetchProducts(id);
    };
  }

  window.addEventListener('load', insertFetchUI);
})();
