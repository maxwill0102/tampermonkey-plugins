// ==UserScript==
// @name         活动报名插件 V3.5（新版短期活动支持）
// @namespace    https://yourdomain.com
// @version      3.5.0
// @description  支持新版 TEMU 活动页面短期活动数据抓取与展示
// @match        https://agentseller.temu.com/activity/marketing-activity*
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
      grid-template-columns: 2fr 2fr 2fr 1fr 1fr;
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
      <h2>活动报名 3.5 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section">
        <label>活动 ID 抓取商品测试</label>
        <input id="moduled-activity-id" placeholder="请输入活动 ID" style="width:100%; margin-bottom:8px;" />
        <button id="moduled-fetch-products">抓取商品数据</button>
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
    `;
    document.body.appendChild(drawer);
    document.getElementById('moduled-close').onclick = () => drawer.remove();

    document.querySelectorAll('.moduled-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.moduled-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.moduled-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('moduled-tab-' + tab.dataset.tab).classList.add('active');
      };
    });

    extractShortActivities();
  }

  function extractShortActivities() {
    const root = document.querySelector('[data-testid="beast-core-table"]');
    const tbody = root?.querySelector('tbody');
    if (!tbody) return console.warn('短期活动列表未找到');

    const rows = tbody.querySelectorAll('tr');
    const container = document.getElementById('moduled-tab-0');
    container.innerHTML = `<div class="moduled-table-header">
      <div>活动主题</div>
      <div>报名时间</div>
      <div>活动时间</div>
      <div>已报名</div>
      <div>是否报名</div>
    </div>`;

    rows.forEach((row, index) => {
      const tds = row.querySelectorAll('td');
      const title = tds[0]?.innerText.trim() || '';
      const applyTime = tds[1]?.innerText.trim() || '';
      const actTime = tds[2]?.innerText.trim() || '';
      const joined = tds[3]?.innerText.trim() || '';
      const checkboxId = `short-check-${index}`;

      container.innerHTML += `<div class="moduled-table-row">
        <div>${title}</div>
        <div>${applyTime}</div>
        <div>${actTime}</div>
        <div>${joined}</div>
        <div><input type="checkbox" id="${checkboxId}" /></div>
      </div>`;
    });
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
