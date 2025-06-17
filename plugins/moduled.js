
(function () {
  'use strict';

  const style = `
    #moduled-short-tabs {
      display: flex;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #ccc;
    }
    .moduled-tab-btn {
      cursor: pointer;
      font-weight: normal;
    }
    .moduled-tab-btn.active {
      font-weight: bold;
      text-decoration: underline;
    }
    #moduled-short-content {
      max-height: 300px;
      overflow-y: auto;
      margin-top: 10px;
      padding-right: 10px;
    }
    .moduled-activity {
      padding: 8px 0;
      border-bottom: 1px dashed #ddd;
    }
  `;

  GM_addStyle(style);

  window.startModuledPlugin = () => {
    if (document.getElementById('moduled-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'moduled-drawer';
    drawer.style.cssText = `
      position:fixed;top:0;right:0;width:480px;height:100%;
      background:white;z-index:999999;padding:20px;
      overflow-y:auto;box-shadow:-2px 0 6px rgba(0,0,0,0.2);
      font-family:Arial;
    `;

    drawer.innerHTML = `
      <div><strong>活动报名 3.0</strong> <span id="moduled-close" style="float:right;cursor:pointer;">❌</span></div>

      <div class="moduled-section">
        <div><strong>短期活动</strong></div>
        <div id="moduled-short-tabs"></div>
        <div id="moduled-short-content"></div>
      </div>
    `;

    document.body.appendChild(drawer);
    document.getElementById('moduled-close').onclick = () => drawer.remove();

    loadShortActivities();
  };

  function loadShortActivities() {
    const tabEls = document.querySelectorAll('[data-testid="beast-core-tab-itemLabel-wrapper"]');
    const tbodyRows = document.querySelectorAll('tbody tr');

    const tabsContainer = document.getElementById('moduled-short-tabs');
    const contentContainer = document.getElementById('moduled-short-content');

    const categories = Array.from(tabEls).map(el => el.innerText.trim());
    const grouped = {};

    categories.forEach((cat, index) => {
      grouped[cat] = [];
      for (let i = index * 7; i < Math.min((index + 1) * 7, tbodyRows.length); i++) {
        const row = tbodyRows[i];
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          grouped[cat].push(`
            <div class="moduled-activity">
              <strong>${cells[0].innerText.trim()}</strong><br>
              报名时间：${cells[1].innerText.trim()}<br>
              活动时间：${cells[2].innerText.trim()}<br>
              已报名：${cells[3].innerText.trim()}
            </div>
          `);
        }
      }
    });

    tabsContainer.innerHTML = categories.map((cat, i) =>
      `<div class="moduled-tab-btn${i === 0 ? ' active' : ''}" data-cat="${cat}">${cat}</div>`
    ).join('');

    function renderContent(cat) {
      contentContainer.innerHTML = grouped[cat].join('') || '暂无数据';
    }

    renderContent(categories[0]);

    tabsContainer.querySelectorAll('.moduled-tab-btn').forEach(btn => {
      btn.onclick = () => {
        tabsContainer.querySelectorAll('.moduled-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderContent(btn.dataset.cat);
      };
    });
  }
})();
