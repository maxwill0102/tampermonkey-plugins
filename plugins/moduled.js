// ==UserScript==
// @name         活动报名插件 V3.3（是否报名改为勾选框）
// @namespace    https://yourdomain.com
// @version      3.3.0
// @description  支持是否报名勾选，后续支持提交选中项
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const style = `
    #moduled-drawer {
      position: fixed;
      top: 0; right: 0;
      width: 800px;
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
      <h2>活动报名 3.3 <span id="moduled-close">❌</span></h2>
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

  function fetchActivityData() {
    const shortPanelRoots = [
      document.getElementById('moduled-tab-0'),
      document.getElementById('moduled-tab-1'),
      document.getElementById('moduled-tab-2'),
    ];
    const tabWrapperList = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    const tabContainer = tabWrapperList.length >= 2 ? tabWrapperList[1] : null;
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
            const checkboxId = `chk-${i}-${index}`;

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
