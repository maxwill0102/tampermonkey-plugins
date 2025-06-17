
(function () {
  'use strict';

  const style = `
    #moduled-drawer {
      position: fixed;
      top: 0; right: 0;
      width: 880px;
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
      gap: 8px;
      margin-bottom: 10px;
    }
    .moduled-tab {
      padding: 6px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f1f1f1;
      cursor: pointer;
    }
    .moduled-tab.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
    .moduled-table-header {
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #ccc;
    }
    .moduled-activity-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dashed #ddd;
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

      <div class="moduled-section">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
      </div>

      <div class="moduled-section">
        <strong>短期活动</strong>
        <div class="moduled-tabs" id="moduled-short-tabs"></div>
        <div id="moduled-short-container"></div>
      </div>

      <div class="moduled-section" style="text-align:center;">
        <button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button>
      </div>
    `;

    document.body.appendChild(drawer);
    document.getElementById('moduled-close').onclick = () => drawer.remove();
    document.getElementById('moduled-price-mode').onchange = function () {
      document.getElementById('moduled-price-label').textContent = this.value === 'profit'
        ? '活动利润率不低于' : '活动价格不低于';
    };

    fetchActivityData();
  }

  function fetchActivityData() {
    // 长期活动提取
    const longContainer = document.getElementById('moduled-long');
    longContainer.innerHTML = `
      <div class="moduled-table-header">
        <div>活动类型</div><div>活动说明</div><div>是否报名</div>
      </div>
    `;
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach(block => {
      const title = block.querySelector('.act-item_activityName__Ryh3Y')?.innerText.trim();
      const desc = block.querySelector('.act-item_activityContent__ju2KR')?.innerText.trim();
      longContainer.innerHTML += `
        <div class="moduled-activity-row">
          <div>${title}</div>
          <div>${desc}</div>
          <div><input type="checkbox"/></div>
        </div>`;
    });

    // 短期活动页签与内容提取
    const shortTabs = document.getElementById('moduled-short-tabs');
    const shortContent = document.getElementById('moduled-short-container');
    const tabWrapperList = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    const tabContainer = tabWrapperList.length >= 2 ? tabWrapperList[1] : null;
    if (!tabContainer) return;

    const tabs = Array.from(tabContainer.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]'));
    const tabLabels = tabs.map(tab => tab.querySelector('.act-detail_tabLabel__RCnKY')?.innerText.trim() || '未命名');

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function loadTabContent(index) {
      tabs[index].click();
      await delay(600);
      const rows = document.querySelectorAll('tbody tr');
      shortContent.innerHTML = `
        <div class="moduled-table-header">
          <div>活动主题</div><div>报名时间</div><div>活动时间</div><div>已报名</div><div>是否报名</div>
        </div>`;
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          shortContent.innerHTML += `
            <div class="moduled-activity-row">
              <div>${cells[0].innerText.trim()}</div>
              <div>${cells[1].innerText.trim()}</div>
              <div>${cells[2].innerText.trim()}</div>
              <div>${cells[3].innerText.trim()}</div>
              <div><input type="checkbox"/></div>
            </div>`;
        }
      });
    }

    tabLabels.forEach((label, idx) => {
      const tabBtn = document.createElement('div');
      tabBtn.className = 'moduled-tab' + (idx === 0 ? ' active' : '');
      tabBtn.innerText = label;
      tabBtn.onclick = async () => {
        document.querySelectorAll('.moduled-tab').forEach(e => e.classList.remove('active'));
        tabBtn.classList.add('active');
        await loadTabContent(idx);
      };
      shortTabs.appendChild(tabBtn);
    });

    loadTabContent(0); // 默认加载第一个页签
  }

  window.__moduled_plugin__ = () => createDrawer();
})();
