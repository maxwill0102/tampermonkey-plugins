(function () {
  'use strict';

  const drawerId = 'plugin-drawer-activity-3-0';

  // 1. 插入抽屉 UI
  function createDrawer() {
    if (document.getElementById(drawerId)) return;

    const drawer = document.createElement('div');
    drawer.id = drawerId;
    drawer.style.cssText = `
      position:fixed;
      top:0; right:0;
      width:520px;
      height:100%;
      background:#fff;
      z-index:999999;
      box-shadow:-2px 0 8px rgba(0,0,0,0.3);
      overflow-y:auto;
      padding:20px;
      font-family:Arial;
    `;

    drawer.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:16px;">🛒 活动报名 3.0</div>

      <div>
        <label>当前店铺: <strong style="color:#007bff;">自动获取中...</strong></label>
        <br><br>
        <label>
          价格设置方式：
          <select id="plugin-price-mode">
            <option value="fixed">活动价格不低于固定值</option>
            <option value="rate">活动利润率不低于固定比例</option>
          </select>
        </label>
        <br><br>
        <label id="plugin-price-label">活动价格不低于：</label>
        <input type="number" id="plugin-price-value" placeholder="请输入数值" style="width:200px;">
        <br><br>
        <label>库存数量：</label>
        <input type="number" id="plugin-stock-value" placeholder="请输入库存" style="width:200px;">
      </div>

      <hr style="margin:20px 0;">

      <div>
        <h4>📌 长期活动</h4>
        <ul id="long-activity-list" style="padding-left:20px;"></ul>
      </div>

      <hr style="margin:20px 0;">

      <div>
        <h4>📌 短期活动</h4>
        <div id="short-activity-tabs"></div>
        <div id="short-activity-content" style="margin-top:10px;"></div>
      </div>

      <div style="margin-top:20px;text-align:center;">
        <button style="padding:10px 40px;font-size:16px;background:#007bff;color:#fff;border:none;border-radius:5px;">开始报名</button>
      </div>
    `;

    document.body.appendChild(drawer);

    document.getElementById('plugin-price-mode').addEventListener('change', () => {
      const label = document.getElementById('plugin-price-label');
      label.innerText =
        document.getElementById('plugin-price-mode').value === 'rate'
          ? '活动利润率不低于：'
          : '活动价格不低于：';
    });
  }

  // 2. 抓取长期活动
  function fetchLongActivities() {
    const list = [];
    document.querySelectorAll('.act-item_actItem__x2Uci').forEach((el) => {
      const name = el.querySelector('.act-item_activityName__Ryh3Y')?.innerText || '未知名称';
      const desc = el.querySelector('.act-item_activityContent__ju2KR')?.innerText || '';
      list.push({ name, desc });
    });
    return list;
  }

  // 3. 抓取短期活动（当前选中的 tab 下所有活动）
  function fetchShortActivities() {
    const table = document.querySelector('table');
    if (!table) return [];

    const rows = table.querySelectorAll('tbody tr');
    const list = [];

    rows.forEach((row) => {
      const title = row.querySelector('td:nth-child(1)')?.innerText.trim();
      const signup = row.querySelector('td:nth-child(2)')?.innerText.trim();
      const active = row.querySelector('td:nth-child(3)')?.innerText.trim();
      if (title && signup && active) {
        list.push({ title, signup, active });
      }
    });

    return list;
  }

  // 4. 渲染长期活动
  function renderLongActivities() {
    const data = fetchLongActivities();
    const listEl = document.getElementById('long-activity-list');
    listEl.innerHTML = '';
    data.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.name}</strong><br><small>${item.desc}</small>`;
      listEl.appendChild(li);
    });
  }

  // 5. 渲染短期活动分类 + 表格
  function renderShortActivities() {
    const tabs = document.querySelectorAll('.act-detail_tabLabel__RCnKY');
    const tabsBox = document.getElementById('short-activity-tabs');
    tabsBox.innerHTML = '';

    tabs.forEach((tab, index) => {
      const btn = document.createElement('button');
      btn.textContent = tab.innerText;
      btn.style.cssText = `
        margin: 4px; padding: 6px 12px;
        border: 1px solid #ccc;
        background: white;
        cursor: pointer;
        border-radius: 4px;
      `;
      btn.onclick = () => {
        tab.click(); // 切换 tab
        setTimeout(renderShortActivityTable, 600); // 等待 DOM 更新
      };
      tabsBox.appendChild(btn);
      if (index === 0) tab.click(); // 默认点击第一个
    });
  }

  function renderShortActivityTable() {
    const data = fetchShortActivities();
    const content = document.getElementById('short-activity-content');
    content.innerHTML = '';

    data.forEach((item) => {
      const div = document.createElement('div');
      div.style.cssText = 'border-bottom:1px dashed #ccc;padding:5px 0;';
      div.innerHTML = `
        <strong>${item.title}</strong><br>
        报名时间: ${item.signup}<br>
        活动时间: ${item.active}
      `;
      content.appendChild(div);
    });
  }

  // 主入口函数
  function start() {
    createDrawer();
    renderLongActivities();
    renderShortActivities();
  }

  // 导出启动函数给主插件调用
  window.startModuledPlugin = start;
})();
