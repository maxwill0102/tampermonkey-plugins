// ==UserScript==
// @name         活动报名插件 V3.5（支持活动商品抓取）
// @namespace    https://yourdomain.com
// @version      3.5.0
// @description  长短期活动报名工具 + 活动商品抓取
// @match        https://*.temu.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
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
    .moduled-input-group { margin-bottom: 10px; }
    .moduled-input-group label { display: block; font-size: 14px; margin-bottom: 4px; }
    .moduled-input-group input,
    .moduled-input-group select {
      width: 100%; padding: 6px; font-size: 14px;
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
    .moduled-tab.active { color: red; border-bottom: 2px solid red; }
    .moduled-tab-panel {
      display: none;
      max-height: 300px;
      overflow-y: auto;
    }
    .moduled-tab-panel.active { display: block; }
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
    .moduled-table-row { border-bottom: 1px dashed #ddd; }
  `;
  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.5 <span id="moduled-close">❌</span></h2>
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
        <div style="margin-bottom:10px;">
          <input type="text" id="moduled-activity-id" placeholder="活动 ID 抓取商品测试" style="width:100%;padding:6px;margin-top:10px;" />
          <button id="moduled-fetch-products" style="margin-top:6px;padding:6px 12px;">抓取商品数据</button>
        </div>
        <button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button>
      </div>
    `;
    document.body.appendChild(drawer);
    document.getElementById('moduled-close').onclick = () => drawer.remove();
    document.getElementById('moduled-price-mode').onchange = function () {
      document.getElementById('moduled-price-label').textContent =
        this.value === 'profit' ? '活动利润率不低于' : '活动价格不低于';
    };

    document.querySelectorAll('.moduled-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.moduled-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.moduled-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('moduled-tab-' + tab.dataset.tab).classList.add('active');
      };
    });

    document.getElementById('moduled-fetch-products').onclick = fetchAllProducts;
    fetchActivityData();
  }

  async function fetchAllProducts() {
    const actId = document.getElementById('moduled-activity-id').value.trim();
    if (!actId) return alert('请填写活动ID');

    GM_xmlhttpRequest({
      method: 'POST',
      url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      data: JSON.stringify({
        activityType: 13,
        activityThematicId: actId,
        rowCount: 50,
        addSite: true,
        searchScrollContext: ''
      }),
      onload: function (res) {
        try {
          const json = JSON.parse(res.responseText);
          console.log('🎯 可报名商品数据：', json.matchList);
        } catch (e) {
          console.error('解析失败', e);
        }
      },
      onerror: function (err) {
        console.error('请求失败:', err);
      }
    });
  }

  function fetchAllProducts() {
  const actId = document.getElementById('moduled-activity-id')?.value?.trim();
  if (!actId) return alert('请填写活动 ID');

  console.log('🎯 抓取商品中 活动ID:', actId);

  GM_xmlhttpRequest({
    method: 'POST',
    url: 'https://agentseller.temu.com/api/kiana/gamblers/marketing/enroll/semi/scroll/match',
    headers: {
      'Content-Type': 'application/json',
      'anti-content': '0aqAfaiZriGLy99CsoAbhDLKOundOg-FRwRztvS1v_FvZOzBCmfjNhi3lYFUIkMkwqUl9UhDZblHKCgsxWH9JuMH3IMg3soRHZR7Rv_17qj6X7BefXv88kwyBEZF2f5UxlfKE5nh3tUyVe8aNv9E1kQ15a1sEvfvcm57pfBfhhXc-sCUYgZR6ueu09MgytXhSK4ZzhMeHJVmMNjWY8JiNw2kfOwj1dXPwVL1lVw0sqB7PSwxurDh2aioGLqTxkCNppoK-v_t8uZ4Snt7lUYY4u5c9Tukm2vN4Sfzae_Cwu0PXZ7LEc4zxOEAcpa4th8c7-uM4_C3sB2pNBBL4fIxlg8gr7azN0HCCQjFEH-iY4KRFVq1IsWSI6-Ow86VjbG8tAO6lO0MVsleKLL7x3xuWKvRjKJLSbVKr2R1zO23eY4F0uscrxibU9a-Q7H5Rl3Jd8ihcnqbjTFQrG8bxWApOrawjAcQtLHF-boDRLQJy5Hc4bf0DHhztCH'
    },
    data: JSON.stringify({
      activityType: 13,
      activityThematicId: actId,
      rowCount: 50,
      addSite: true,
      searchScrollContext: ''
    }),
    onload: function (res) {
      try {
        const json = JSON.parse(res.responseText);
        console.log('🎯 可报名商品数据：', json?.data?.matchList || []);
      } catch (e) {
        console.error('❌ 解析失败', e);
      }
    },
    onerror: function (err) {
      console.error('❌ 请求失败', err);
    }
  });
}



    const shortPanelRoots = [
      document.getElementById('moduled-tab-0'),
      document.getElementById('moduled-tab-1'),
      document.getElementById('moduled-tab-2'),
    ];
    const tabWrappers = document.querySelectorAll('.TAB_outerWrapper_5-118-0');
    const tabWrapper = tabWrappers[1];
    const tabContainer = tabWrapper?.querySelector('.TAB_tabContentInnerContainer_5-118-0');
    if (!tabContainer) return console.warn('未找到短期活动 tab');

    const tabs = tabContainer.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function clickAndExtractTabs() {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        tab.click();
        await delay(600);

        const rows = document.querySelectorAll('tbody tr');
        const container = shortPanelRoots[i] || shortPanelRoots[0];

        container.innerHTML = `
          <div class="moduled-table-header">
            <div>活动主题</div>
            <div>报名时间</div>
            <div>活动时间</div>
            <div>已报名</div>
            <div>是否报名</div>
          </div>
        `;

        rows.forEach((row, index) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const title = cells[0].innerText.trim();
            const applyTime = cells[1].innerText.trim();
            const actTime = cells[2].innerText.trim();
            const joined = cells[3].innerText.trim();
            const checkboxId = `short-chk-${i}-${index}`;

            container.innerHTML += `
              <div class="moduled-table-row">
                <div>${title}</div>
                <div>${applyTime}</div>
                <div>${actTime}</div>
                <div>${joined}</div>
                <div><input type="checkbox" id="${checkboxId}" /></div>
              </div>
            `;
          }
        });
      }
    }

    clickAndExtractTabs();
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
