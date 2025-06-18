// ==UserScript==
// @name         活动报名插件 V3.4（支持抓取活动商品数据）
// @namespace    https://yourdomain.com
// @version      3.4.0
// @description  支持是否报名勾选、活动详情商品数据自动分页抓取
// @match        https://*.kuajingmaihuo.com/*
// @match        https://agentseller.temu.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const style = `
    #moduled-drawer {
      position: fixed;
      top: 0; right: 0;
      width: 780px;
      height: 100%;
      background: #fff;
      border-left: 1px solid #ccc;
      z-index: 999999;
      overflow-y: auto;
      font-family: Arial;
      box-shadow: -2px 0 8px rgba(0,0,0,0.2);
    }
    #moduled-drawer h2 {
      font-size: 18px; padding: 16px; margin: 0; border-bottom: 1px solid #eee;
    }
    #moduled-close {
      position: absolute; top: 10px; right: 10px; cursor: pointer;
    }
    .moduled-section {
      padding: 16px;
      border-bottom: 1px solid #eee;
    }
    .moduled-input-group {
      margin-bottom: 10px;
    }
    .moduled-input-group label {
      display: block;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .moduled-input-group input,
    .moduled-input-group select {
      width: 100%;
      padding: 6px;
      font-size: 14px;
    }
    .moduled-tabs {
      display: flex;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }
    .moduled-tab {
      flex: 1;
      text-align: center;
      padding: 8px;
      cursor: pointer;
      font-weight: bold;
    }
    .moduled-tab.active {
      color: red;
      border-bottom: 2px solid red;
    }
    .moduled-tab-panel {
      display: none;
      max-height: 300px;
      overflow-y: auto;
    }
    .moduled-tab-panel.active {
      display: block;
    }
    .moduled-table-header,
    .moduled-table-row {
      display: grid;
      grid-template-columns: 1.5fr 2fr 2fr 1fr 1fr;
      gap: 10px;
      padding: 6px 0;
      align-items: center;
    }
    .moduled-table-header {
      font-weight: bold;
      border-bottom: 1px solid #ccc;
      margin-bottom: 4px;
    }
    .moduled-table-row {
      border-bottom: 1px dashed #ddd;
    }
  `;
  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.4 <span id="moduled-close">❌</span></h2>
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
        <div class="moduled-input-group">
          <label>活动 ID 抓取商品测试</label>
          <input type="text" id="moduled-thematic-id" placeholder="请输入 activityThematicId" />
          <button id="fetch-products-btn" style="margin-top:6px;width:100%;">抓取商品数据</button>
        </div>
      </div>
      <div class="moduled-section">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
      </div>
      <div class="moduled-section">
        <strong>短期活动</strong>
        <div class="moduled-tabs">
          <div class="moduled-tab active" data-tab="0">大促进阶</div>
          <div class="moduled-tab" data-tab="1">秒杀进阶</div>
          <div class="moduled-tab" data-tab="2">清仓进阶</div>
        </div>
        <div id="moduled-short-panels">
          <div class="moduled-tab-panel active" id="moduled-tab-0"></div>
          <div class="moduled-tab-panel" id="moduled-tab-1"></div>
          <div class="moduled-tab-panel" id="moduled-tab-2"></div>
        </div>
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

    document.getElementById('fetch-products-btn').onclick = fetchAllProducts;

    document.querySelectorAll('.moduled-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.moduled-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.moduled-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('moduled-tab-' + tab.dataset.tab).classList.add('active');
      };
    });

    fetchActivityData();
  }

  async function fetchAllProducts() {
    const thematicId = document.getElementById('moduled-thematic-id').value.trim();
    if (!thematicId) return alert('请填写活动 ID');

    const API_URL = 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match';
    const allProducts = [];
    let hasMore = true;
    let searchScrollContext = null;
    let page = 1;

    while (hasMore) {
      const payload = {
        activityType: 13,
        activityThematicId: thematicId,
        rowCount: 50,
        addSite: true
      };
      if (searchScrollContext) payload.searchScrollContext = searchScrollContext;

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const list = data?.result?.matchList || [];
      hasMore = data?.result?.hasMore;
      searchScrollContext = data?.result?.searchScrollContext;

      list.forEach(item => {
        const sku = item.activitySiteInfoList?.[0]?.skcList?.[0]?.skuList?.[0] || {};
        allProducts.push({
          productId: item.productId,
          productName: item.productName,
          skuId: sku.skuId,
          suggestPrice: sku.suggestActivityPrice,
          enrollSessionIdList: item.enrollSessionIdList,
          salesStock: item.salesStock
        });
      });

      console.log(`📄 第 ${page++} 页，共抓取 ${list.length} 条`);
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('✅ 所有商品抓取完成，总数：', allProducts.length);
    console.table(allProducts);
  }

  function fetchActivityData() {
    // 可保留原始 fetchActivityData 内容逻辑（略）
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
