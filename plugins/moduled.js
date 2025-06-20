// ==UserScript==
// @name         活动报名插件 V3.9（支持分页抓取）
// @namespace    https://yourdomain.com
// @version      3.9.0
// @description  支持递归分页抓取所有活动商品
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
    .moduled-tabs { display: flex; margin-bottom: 10px; border-bottom: 1px solid #ccc; }
    .moduled-tab { flex: 1; text-align: center; padding: 8px; cursor: pointer; font-weight: bold; }
    .moduled-tab.active { color: red; border-bottom: 2px solid red; }
    .moduled-tab-panel { display: none; max-height: 300px; overflow-y: auto; }
    .moduled-tab-panel.active { display: block; }
    .moduled-table-header, .moduled-table-row { display: grid; grid-template-columns: 1.5fr 2fr 2fr 1fr 1fr; gap: 10px; padding: 6px 0; align-items: center; }
    .moduled-table-header { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 4px; }
    .moduled-table-row { border-bottom: 1px dashed #ddd; }
  `;
  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.9 <span id="moduled-close">❌</span></h2>
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
          if (actId) {
            console.log(`🚀 开始抓取活动 ${actId} 的所有商品...`);
            fetchProducts(actId); // 初始调用
          } else {
            alert("请输入活动ID");
          }
        };
      }
    }, 300);
  }
function fetchProducts(activityId, scrollContext = "", allProducts = []) {
  const cookie = document.cookie;
  const mallid = '634418223153529';
  const anti = '你的anti-content值';

  const body = {
    activityType: 13,
    activityThematicId: Number(activityId),
    rowCount: 50,
    addSite: true,
    searchScrollContext: scrollContext
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
        const items = json?.data?.resultList || [];
        const nextContext = json?.data?.searchScrollContext || null;

        allProducts.push(...items);
        console.log("当前页商品数：", items.length);

        if (nextContext) {
          console.log("📦 继续抓取下一页...");
          fetchProducts(activityId, nextContext, allProducts);
        } else {
          console.log("✅ 全部抓取完毕，共", allProducts.length, "条");
        }
      } catch (err) {
        console.error("❌ JSON解析失败", err, res.responseText);
      }
    },
    onerror(err) {
      console.error("❌ 请求失败：", err);
    }
  });
}

  

  // 注册插件入口
  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
