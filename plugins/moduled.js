// ==UserScript==
// @name         活动报名插件 V3.8.2（递归分页）
// @namespace    https://yourdomain.com
// @version      3.8.2
// @description  支持分页抓取所有商品，保留全部功能逻辑
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  const style = `
    #moduled-drawer { position: fixed; top: 0; right: 0; width: 780px; height: 100%; background: #fff; border-left: 1px solid #ccc; z-index: 999999; overflow-y: auto; font-family: Arial; box-shadow: -2px 0 8px rgba(0,0,0,0.2); }
    #moduled-drawer h2 { font-size: 18px; padding: 16px; margin: 0; border-bottom: 1px solid #eee; }
    #moduled-close { position: absolute; top: 10px; right: 10px; cursor: pointer; }
    .moduled-section { padding: 16px; border-bottom: 1px solid #eee; }
    .moduled-input-group { margin-bottom: 10px; }
    .moduled-input-group label { display: block; font-size: 14px; margin-bottom: 4px; }
    .moduled-input-group input, .moduled-input-group select { width: 100%; padding: 6px; font-size: 14px; }
  `;
  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.8.2 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group"><label>当前绑定店铺</label><div id="moduled-shop-name">（开发中）</div></div>
        <div class="moduled-input-group">
          <label>活动价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">活动价格不低于固定值</option>
            <option value="profit">活动利润率不低于固定比例</option>
          </select>
        </div>
        <div class="moduled-input-group"><label id="moduled-price-label">活动价格不低于</label><input type="number" id="moduled-price-input" /></div>
        <div class="moduled-input-group"><label>活动库存数量</label><input type="number" id="moduled-stock-input" /></div>
        <div class="moduled-input-group"><label>输入活动ID测试商品抓取</label><input type="text" id="moduled-activity-id-input" placeholder="输入活动ID" /></div>
        <div><button id="moduled-fetch-products">抓取商品数据</button></div>
      </div>
      <div class="moduled-section" style="text-align:center;">
        <button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button>
      </div>
    `;
    document.body.appendChild(drawer);

    document.getElementById('moduled-close').onclick = () => drawer.remove();
    document.getElementById('moduled-price-mode').onchange = function () {
      document.getElementById('moduled-price-label').textContent =
        this.value === 'profit' ? '活动利润率不低于' : '活动价格不低于';
    };

    setTimeout(() => {
      const btn = document.getElementById('moduled-fetch-products');
      if (btn) {
        btn.onclick = () => {
          const actId = document.getElementById('moduled-activity-id-input').value.trim();
          if (actId) fetchAllProducts(actId);
          else alert("请输入活动ID");
        };
      }
    }, 300);
  }

  function fetchAllProducts(activityId, scrollContext = "", page = 1, totalList = []) {
    const cookie = document.cookie;
    const mallid = '634418223153529';
    const anti = '你的 anti-content 值'; // 请自行更新有效 anti-content

    const body = {
      activityType: 13,
      activityThematicId: Number(activityId),
      rowCount: 50,
      addSite: true,
      searchScrollContext: scrollContext || ""
    };

    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'content-type': 'application/json',
        'cookie': cookie,
        'mallid': mallid,
        'referer': `https://agentseller.temu.com/activity/marketing-activity/detail-new?type=13&thematicId=${activityId}`,
        'anti-content': anti,
        'origin': 'https://agentseller.temu.com',
        'user-agent': navigator.userAgent
      },
      data: JSON.stringify(body),
      onload(res) {
        try {
          const json = JSON.parse(res.responseText);
          const list = json?.data?.matchList || [];
          const nextCtx = json?.data?.searchScrollContext || "";
          const hasMore = json?.data?.hasMore || false;

          console.log(`📦 第 ${page} 页：`, list);
          totalList.push(...list);

          if (hasMore && nextCtx) {
            setTimeout(() => {
              fetchAllProducts(activityId, nextCtx, page + 1, totalList);
            }, 1000); // 建议延迟，防止触发风控
          } else {
            console.log("✅ 所有商品已抓取，总数：", totalList.length);
            console.log("🎯 完整数据列表：", totalList);
          }
        } catch (e) {
          console.error("❌ JSON解析失败", e);
        }
      },
      onerror(err) {
        console.error("❌ 请求错误：", err);
      }
    });
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
