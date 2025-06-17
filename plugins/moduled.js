
(function () {
  'use strict';

  const style = `
    #moduled-drawer {
      position: fixed;
      top: 0; right: 0;
      width: 600px;
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
      margin-bottom: 12px;
    }
    .moduled-tabs button {
      margin-right: 8px;
      padding: 4px 12px;
      font-size: 14px;
      cursor: pointer;
    }
    .moduled-tabs .active {
      background: #007bff;
      color: white;
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
        <table style="width:100%;margin-top:10px;">
          <thead><tr><th>活动类型</th><th>活动说明</th><th>是否报名</th></tr></thead>
          <tbody id="moduled-long"></tbody>
        </table>
      </div>

      <div class="moduled-section" id="moduled-activities">
        <strong>短期活动</strong>
        <div class="moduled-tabs" style="margin:10px 0;">
          <button class="active" data-tab="大促进阶">大促进阶</button>
          <button data-tab="秒杀进阶">秒杀进阶</button>
          <button data-tab="清仓进阶">清仓进阶</button>
        </div>
        <div id="moduled-short"></div>
      </div>

      <div class="moduled-section" style="text-align:center;">
        <button id="moduled-submit" style="padding:8px 16px;font-size:14px;">立即报名</button>
      </div>
    `;

    document.body.appendChild(drawer);
    document.getElementById('moduled-close').onclick = () => drawer.remove();
    document.getElementById('moduled-price-mode').onchange = function () {
      document.getElementById('moduled-price-label').textContent = this.value === 'profit'
        ? '活动利润率不低于'
        : '活动价格不低于';
    };

    fetchActivityData();
  }

  function fetchActivityData() {
    // 长期活动
    const titles = document.querySelectorAll('.act-item_activityName__Ryh3Y');
    const descs = document.querySelectorAll('.act-item_activityContent__ju2KR');
    const longContainer = document.getElementById('moduled-long');
    longContainer.innerHTML = '';
    titles.forEach((el, i) => {
      const title = el.innerText.trim();
      const desc = descs[i]?.innerText.trim() || '';
      longContainer.innerHTML += `
        <tr>
          <td>${title}</td>
          <td>${desc}</td>
          <td><input type="checkbox" /></td>
        </tr>
      `;
    });

    const shortContainer = document.getElementById('moduled-short');
    const tabWrapperList = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    const tabContainer = tabWrapperList.length >= 2 ? tabWrapperList[1] : null;
    if (!tabContainer) return console.warn('未找到短期活动 tab');

    const tabs = tabContainer.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    const delay = ms => new Promise(r => setTimeout(r, ms));

    async function extractShortTabs() {
      shortContainer.innerHTML = '';
      for (const tab of tabs) {
        const label = tab.querySelector('.act-detail_tabLabel__RCnKY')?.innerText?.trim() || '未命名';
        tab.click();
        await delay(600);

        const rows = document.querySelectorAll('tbody tr');
        shortContainer.innerHTML += `
          <div class="moduled-activity" style="margin-top:10px;">
            <div style="font-weight:bold;margin:6px 0;">【${label}】</div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="text-align:left;padding:4px;">活动主题</th>
                  <th style="text-align:left;padding:4px;">报名时间</th>
                  <th style="text-align:left;padding:4px;">活动时间</th>
                  <th style="text-align:left;padding:4px;">已报名</th>
                </tr>
              </thead>
              <tbody id="moduled-short-body-${label}">
              </tbody>
            </table>
          </div>
        `;
        const tbody = document.getElementById(`moduled-short-body-${label}`);
        if (!tbody) continue;
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const title = cells[0].innerText.trim();
            const applyTime = cells[1].innerText.trim();
            const actTime = cells[2].innerText.trim();
            const joined = cells[3].innerText.trim();
            tbody.innerHTML += `
              <tr>
                <td style="padding:4px;">${title}</td>
                <td style="padding:4px;">${applyTime}</td>
                <td style="padding:4px;">${actTime}</td>
                <td style="padding:4px;">${joined}</td>
              </tr>
            `;
          }
        });
      }
    }

    extractShortTabs();
  }

  window.__moduled_plugin__ = () => createDrawer();
})();
