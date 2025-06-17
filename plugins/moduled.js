
(function () {
  'use strict';

  const style = `
    #moduled-drawer {
      position: fixed;
      top: 0; right: 0;
      width: 720px;
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
    .moduled-tab-buttons {
      margin-bottom: 10px;
    }
    .moduled-tab-button {
      margin-right: 10px;
      padding: 6px 12px;
      background: #eee;
      border: none;
      cursor: pointer;
    }
    .moduled-tab-button.active {
      background: #1e90ff;
      color: white;
    }
    .moduled-tab-content {
      display: none;
    }
    .moduled-tab-content.active {
      display: block;
    }
    .moduled-table {
      width: 100%;
      border-collapse: collapse;
    }
    .moduled-table th, .moduled-table td {
      border: 1px solid #ccc;
      padding: 6px;
      font-size: 13px;
      text-align: left;
    }
  `;

  GM_addStyle(style);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.0 <span id="moduled-close">❌</span></h2>

      <div class="moduled-section">
        <div>当前绑定店铺：<strong>（开发中）</strong></div>
        <div style="margin-top:8px;">
          活动价格设置方式：
          <select id="moduled-price-mode">
            <option value="fixed">活动价格不低于固定值</option>
            <option value="profit">活动利润率不低于固定比例</option>
          </select>
        </div>
        <div style="margin-top:8px;">
          <label id="moduled-price-label">活动价格不低于：</label>
          <input type="number" id="moduled-price-input" />
        </div>
        <div style="margin-top:8px;">
          活动库存数量：
          <input type="number" id="moduled-stock-input" />
        </div>
      </div>

      <div class="moduled-section">
        <strong>长期活动</strong>
        <div id="moduled-long"></div>
      </div>

      <div class="moduled-section">
        <strong>短期活动</strong>
        <div class="moduled-tab-buttons">
          <button class="moduled-tab-button active" data-tab="tab1">大促进阶</button>
          <button class="moduled-tab-button" data-tab="tab2">秒杀进阶</button>
          <button class="moduled-tab-button" data-tab="tab3">清仓进阶</button>
        </div>
        <div id="tab1" class="moduled-tab-content active"></div>
        <div id="tab2" class="moduled-tab-content"></div>
        <div id="tab3" class="moduled-tab-content"></div>
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
        ? '活动利润率不低于：'
        : '活动价格不低于：';
    };

    document.querySelectorAll('.moduled-tab-button').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.moduled-tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.moduled-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      };
    });

    fetchActivityData();
  }

  function fetchActivityData() {
    const longContainer = document.getElementById('moduled-long');
    longContainer.innerHTML = `
      <table class="moduled-table">
        <thead><tr><th>活动类型</th><th>活动说明</th><th>是否报名</th></tr></thead>
        <tbody>
          <tr><td>清仓甩卖</td><td>首页钻石级资源位，专属清仓利器，千万流量加持，一键报名，销量暴涨！</td><td><input type="checkbox"/></td></tr>
          <tr><td>限时秒杀</td><td>首页黄金资源位，多项专属商品权益，千万流量注入，爆款利器抢先得！</td><td><input type="checkbox"/></td></tr>
          <tr><td>官方大促</td><td>平台官方大促，长期流量注入，多重氛围加持，一键报名，销量起飞！</td><td><input type="checkbox"/></td></tr>
        </tbody>
      </table>
    `;

    const containerMap = {
      '大促进阶': document.getElementById('tab1'),
      '秒杀进阶': document.getElementById('tab2'),
      '清仓进阶': document.getElementById('tab3')
    };

    const tabWrapperList = document.querySelectorAll('.TAB_tabContentInnerContainer_5-118-0');
    const tabContainer = tabWrapperList.length >= 2 ? tabWrapperList[1] : null;
    if (!tabContainer) return;

    const tabs = tabContainer.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    async function clickAndExtractTabs() {
      for (const tab of tabs) {
        const label = tab.querySelector('.act-detail_tabLabel__RCnKY')?.innerText?.trim() || '未命名';

        tab.click();
        await delay(600);

        const rows = document.querySelectorAll('tbody tr');
        const contentDiv = containerMap[label] || containerMap['大促进阶'];

        let html = `
          <table class="moduled-table">
            <thead><tr><th>活动主题</th><th>报名时间</th><th>活动时间</th><th>已报名</th></tr></thead>
            <tbody>
        `;
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            const title = cells[0].innerText.trim();
            const applyTime = cells[1].innerText.trim();
            const actTime = cells[2].innerText.trim();
            const joined = cells[3].innerText.trim();
            html += `<tr><td>${title}</td><td>${applyTime}</td><td>${actTime}</td><td>${joined}</td></tr>`;
          }
        });
        html += '</tbody></table>';
        contentDiv.innerHTML = html;
      }
    }

    clickAndExtractTabs();
  }

  window.__moduled_plugin__ = () => {
    createDrawer();
  };
})();
