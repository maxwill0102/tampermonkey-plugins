// ==UserScript==
// @name         活动报名3.0插件（moduled）
// @namespace    https://yourdomain.com
// @version      1.0.3
// @description  抽屉面板展示长期活动和短期活动，支持价格/库存设置
// ==/UserScript==

(function () {
  'use strict';

  // 样式注入
  const style = `
  #moduled-drawer {
    position: fixed;
    top: 0; right: 0;
    width: 480px;
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
  .moduled-activity {
    padding: 8px 0;
    border-bottom: 1px dashed #ddd;
  }
  .moduled-activity strong {
    display: block;
    font-size: 14px;
  }
  `;

  GM_addStyle(style);

  // 创建抽屉面板
  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.0 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>当前绑定店铺</label>
          <div id="moduled-shop-name">（开发中）</div>
        </div>
        <div class="moduled-input-group">
          <label>活动价格设置方式</label>
          <select id="moduled-price-mode">
            <option value="fixed">活动价格不低于固定值</option>
            <option value="profit">活动利润率不低于固定比例</option>
          </select>
        </div>
        <div class="moduled-input-group">
          <label id="moduled-price-label">活动价格不低于</label>
          <input type="number" id="moduled-price-input" />
        </div>
        <div class="moduled-input-group">
          <label>活动库存数量</label>
          <input type="number" id="moduled-stock-input" />
        </div>
      </div>

      <div class="moduled-section" id="moduled-activities">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
        <strong style="margin-top:10px;display:block;">短期活动</strong>
        <div id="moduled-short"></div>
      </div>

      <div class="moduled-section" style="text-align:center;">
        <button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button>
      </div>
    `;

    document.body.appendChild(drawer);

    document.getElementById('moduled-close').onclick = () => drawer.remove();

    document.getElementById('moduled-price-mode').onchange = function () {
      const label = document.getElementById('moduled-price-label');
      label.textContent = this.value === 'profit'
        ? '活动利润率不低于'
        : '活动价格不低于';
    };

    fetchActivityData();
  }

  // 抓取活动数据（长期 + 短期）
  function fetchActivityData() {
    // 1. 长期活动
    const longList = document.querySelectorAll('.act-item_activityName__Ryh3Y');
    const longContainer = document.getElementById('moduled-long');
    longContainer.innerHTML = '';
    longList.forEach(el => {
      const name = el?.innerText?.trim();
      if (name) longContainer.innerHTML += `<div class="moduled-activity"><strong>${name}</strong></div>`;
    });

    // 2. 短期活动
    const tabTitles = [...document.querySelectorAll('.act-detail_tabLabel__RCnKY')].map(el => el.innerText.trim());
    const shortContainer = document.getElementById('moduled-short');
    shortContainer.innerHTML = '';

    // 如果 tab 与 tbody 行数不匹配，优先模拟点击
    const tabWrappers = document.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    const totalTabs = tabWrappers.length;

    function wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function loadTabDataSequentially() {
      for (let tabIndex = 0; tabIndex < totalTabs; tabIndex++) {
        const tabWrapper = tabWrappers[tabIndex];
        const label = tabWrapper.innerText.trim();
        shortContainer.innerHTML += `<div style="margin:8px 0;font-weight:bold;">【${label}】</div>`;

        tabWrapper.click();
        await wait(500); // 等待内容切换完成

        const tbodyRows = document.querySelectorAll('tbody tr');
        tbodyRows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const title = cells[0]?.innerText?.trim() || '';
            const signup = cells[1]?.innerText?.trim() || '';
            const active = cells[2]?.innerText?.trim() || '';
            shortContainer.innerHTML += `
              <div class="moduled-activity">
                <strong>${title}</strong>
                报名时间：${signup}<br>
                活动时间：${active}
              </div>
            `;
          }
        });
      }
    }

    loadTabDataSequentially();
  }

  // 注册入口函数（标准）
  window.__moduled_plugin__ = () => {
    createDrawer();
  };

  // 兼容新版 main.js 的方式（热更新时自动执行）
  window.startModuledPlugin = () => {
    createDrawer();
  };
})();
