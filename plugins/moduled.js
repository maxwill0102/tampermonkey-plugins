// ==UserScript==
// @name         活动报名插件 V3（UI 分页优化）
// @namespace    https://yourdomain.com
// @version      3.0.1
// @description  长短期活动报名工具，含 UI 分页与滑动支持
// @match        https://*.kuajingmaihuo.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  const style = `
    #moduled-drawer {
      position: fixed;
      top: 0; right: 0;
      width: 680px;
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
    .moduled-table-header {
      display: grid;
      gap: 10px;
      margin-bottom: 8px;
      font-weight: bold;
      background-color: #f5f5f5;
      padding: 8px;
    }
    .moduled-table-row {
      display: grid;
      gap: 10px;
      border-bottom: 1px dashed #ddd;
      padding: 8px;
    }
    .moduled-table-row:nth-child(even) {
      background-color: #f9f9f9;
    }
  `;
  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.0 <span id="moduled-close">❌</span></h2>
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

    fetchActivityData();
  }

  function fetchActivityData() {
    // 长期活动提取
    const longList = document.querySelectorAll('.act-item_actItem__x2Uci');
    const longContainer = document.getElementById('moduled-long');
    longContainer.innerHTML = '<div class="moduled-table-header" style="grid-template-columns: 1fr 2fr 1fr;">' +
      '<div>活动类型</div><div>活动说明</div><div>是否报名</div>' +
      '</div>';
    
    longList.forEach(el => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText?.trim() || '';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText?.trim() || '';
      const joined = el.querySelector('button span')?.innerText?.includes('去报名') ? '☐' : '☑';
      
      const row = document.createElement('div');
      row.className = 'moduled-table-row';
      row.style.gridTemplateColumns = '1fr 2fr 1fr';
      row.innerHTML = `
        <div>${name}</div>
        <div>${desc}</div>
        <div>${joined}</div>
      `;
      longContainer.appendChild(row);
    });

    // 短期活动处理
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
        const label = tab.querySelector('.act-detail_tabLabel__RCnKY')?.innerText?.trim() || '未命名';
        tab.click();
        await delay(800); // 增加延迟确保内容加载
        
        // 获取页面上的表格数据
        const table = document.querySelector('table[data-testid="beast-core-table-container"]');
        if (!table) continue;
        
        // 提取表头
        const headers = [];
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
          headerRow.querySelectorAll('th').forEach(th => {
            headers.push(th.innerText.trim());
          });
        }
        
        // 创建表头容器
        const container = shortPanelRoots[i] || shortPanelRoots[0];
        container.innerHTML = '';
        
        // 添加表头
        if (headers.length > 0) {
          const headerDiv = document.createElement('div');
          headerDiv.className = 'moduled-table-header';
          headerDiv.style.gridTemplateColumns = `repeat(${headers.length}, 1fr)`;
          
          headers.forEach(headerText => {
            const headerCell = document.createElement('div');
            headerCell.textContent = headerText;
            headerDiv.appendChild(headerCell);
          });
          container.appendChild(headerDiv);
        }
        
        // 提取表格内容
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'moduled-table-row';
            rowDiv.style.gridTemplateColumns = `repeat(${cells.length}, 1fr)`;
            
            cells.forEach(cell => {
              const cellDiv = document.createElement('div');
              cellDiv.innerHTML = cell.innerHTML;
              rowDiv.appendChild(cellDiv);
            });
            
            container.appendChild(rowDiv);
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
