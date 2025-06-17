(function () {
  'use strict';

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

    document.getElementById('moduled-close').onclick = () => {
      drawer.remove();
    };

    document.getElementById('moduled-price-mode').onchange = function () {
      const label = document.getElementById('moduled-price-label');
      label.textContent = this.value === 'profit'
        ? '活动利润率不低于'
        : '活动价格不低于';
    };

    fetchActivityData();
  }

  function fetchActivityData() {
  // 长期活动
  const longList = document.querySelectorAll('.act-item_activityName__Ryh3Y');
  const longContainer = document.getElementById('moduled-long');
  longContainer.innerHTML = '';
  longList.forEach(el => {
    longContainer.innerHTML += `<div class="moduled-activity"><strong>${el.innerText.trim()}</strong></div>`;
  });

  // 短期活动
  const shortContainer = document.getElementById('moduled-short');
  shortContainer.innerHTML = '';

  const tabLabels = document.querySelectorAll('.act-detail_tabLabel__RCnKY');
  const tabWrappers = document.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');

  async function loadTabActivities(index) {
    if (index >= tabWrappers.length) return;

    // 模拟点击 tab
    tabWrappers[index].click();

    // 等待内容更新（根据实际 DOM 更新速度可以调节）
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 获取 tab 名称
    const tabName = tabLabels[index]?.innerText.trim() || `分类${index + 1}`;
    shortContainer.innerHTML += `<div style="margin:8px 0;font-weight:bold;">【${tabName}】</div>`;

    // 抓取活动行
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 5) {
        const title = cells[0].innerText.trim();
        const signup = cells[3].innerText.trim();
        const active = cells[4].innerText.trim();
        shortContainer.innerHTML += `
          <div class="moduled-activity">
            <strong>${title}</strong>
            报名时间：${signup}<br>
            活动时间：${active}
          </div>
        `;
      }
    });

    await loadTabActivities(index + 1); // 递归处理下一个 tab
  }

  loadTabActivities(0); // 从第一个 tab 开始加载
}

  // 注册触发函数
  window.startModuledPlugin = () => {
    createDrawer();
  };
})();
