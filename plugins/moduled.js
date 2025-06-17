(function () {
  'use strict';

  const css = `
    #moduled-drawer {
      position: fixed;
      top: 0; right: 0; width: 480px; height: 100%;
      background: #fff; z-index: 999999; overflow-y: auto;
      border-left: 1px solid #ccc; box-shadow: -2px 0 8px rgba(0,0,0,0.2);
      font-family: Arial;
    }
    #moduled-drawer h2 {
      font-size: 18px; padding: 16px; margin: 0;
      border-bottom: 1px solid #eee;
    }
    #moduled-close {
      position: absolute; top: 10px; right: 10px; cursor: pointer;
    }
    .moduled-section { padding: 16px; border-bottom: 1px solid #eee; }
    .moduled-input-group { margin-bottom: 10px; }
    .moduled-input-group label {
      display: block; font-size: 14px; margin-bottom: 4px;
    }
    .moduled-input-group input, .moduled-input-group select {
      width: 100%; padding: 6px; font-size: 14px;
    }
    .moduled-activity { padding: 8px 0; border-bottom: 1px dashed #ddd; }
    .moduled-activity strong { display: block; font-size: 14px; }
  `;
  GM_addStyle(css);

  function createDrawer() {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.innerHTML = `
      <h2>活动报名 3.0 <span id="moduled-close">❌</span></h2>
      <div class="moduled-section" id="moduled-settings">
        <div class="moduled-input-group">
          <label>当前绑定店铺</label>
          <div id="moduled-shop-name">（自动获取中）</div>
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

  function fetchActivityData() {
    const longList = document.querySelectorAll('.act-item_activityName__Ryh3Y');
    const longContainer = document.getElementById('moduled-long');
    longContainer.innerHTML = '';
    longList.forEach(el => {
      longContainer.innerHTML += `<div class="moduled-activity"><strong>${el.innerText.trim()}</strong></div>`;
    });

    const shortList = document.querySelectorAll('.act-detail_tabLabel__RCnKY');
    const tbodyRows = document.querySelectorAll('tbody tr');
    const shortContainer = document.getElementById('moduled-short');
    shortContainer.innerHTML = '';

    shortList.forEach((tab, index) => {
      shortContainer.innerHTML += `<div style="margin:8px 0;font-weight:bold;">【${tab.innerText.trim()}】</div>`;
      for (let i = index * 7; i < Math.min((index + 1) * 7, tbodyRows.length); i++) {
        const row = tbodyRows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          const title = cells[0].innerText.trim();
          const applyTime = cells[3].innerText.trim();
          const actTime = cells[4].innerText.trim();
          shortContainer.innerHTML += `
            <div class="moduled-activity">
              <strong>${title}</strong>
              报名时间：${applyTime}<br>活动时间：${actTime}
            </div>
          `;
        }
      }
    });
  }

  // 标准入口函数注册
  window.__moduled_plugin__ = () => createDrawer();
})();
